'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import { getStudentIds } from '@/lib/idConverter';

export default function FaceRegistrationPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const webcamRef = useRef<Webcam>(null);
  
  const [userData, setUserData] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingRegistration, setHasExistingRegistration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const REQUIRED_IMAGES = 5;

  // Get location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          console.log('📍 Location obtained:', position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn('⚠️ Location error:', error);
          // Don't block registration if location fails
        }
      );
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    console.log('Face Registration - Checking authentication...');

    // Check for custom login
    const role = localStorage.getItem('userRole');
    const studentData = localStorage.getItem('studentData');

    if (studentData && role?.toLowerCase() === 'student') {
      console.log('Custom login detected');
      const student = JSON.parse(studentData);
      const ids = getStudentIds(student.id);
      console.log('📝 Student data:', { 
        originalId: ids.originalId, 
        stringId: ids.stringId, 
        numericId: ids.numericId, 
        name: student.name 
      });
      
      // Store both IDs
      const studentWithIds = {
        ...student,
        id: ids.stringId,
        numericId: ids.numericId
      };
      setUserData(studentWithIds);
      checkExistingRegistration(ids.stringId);
      return;
    }

    // Check for Clerk authentication
    if (user) {
      const userRole = (user.publicMetadata?.role as string)?.toLowerCase();
      console.log('Clerk user detected, role:', userRole);
      
      if (userRole === 'student') {
        const ids = getStudentIds(user.id);
        const student = {
          id: ids.stringId,
          numericId: ids.numericId,
          clerkId: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Student',
          class: user.publicMetadata?.class || 'Not Assigned',
          rollNo: user.publicMetadata?.rollNo || 'Not Assigned',
        };
        console.log('📝 Student data:', { 
          clerkId: user.id,
          stringId: ids.stringId, 
          numericId: ids.numericId, 
          name: student.name 
        });
        setUserData(student);
        checkExistingRegistration(ids.stringId);
        return;
      } else {
        console.log('❌ User is not a student');
        router.push('/unauthorized');
        return;
      }
    }

    console.log('⚠️ No authentication found');
    setLoading(false);
  }, [router, user, isLoaded]);

  const checkExistingRegistration = async (studentId: string) => {
    try {
      console.log('Checking face registration for student:', studentId);
      const url = `/api/student/face-registration?studentId=${encodeURIComponent(studentId)}`;
      console.log('📤 Fetching:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);
      
      const data = await response.json();
      console.log('Registration check data:', data);
      
      // Accept both success and failure responses
      if (data.success !== false) {
        setHasExistingRegistration(data.hasRegistration || false);
        setApiStatus('ok');
      } else {
        // API returned error but we can still proceed
        console.warn('⚠️ API check failed, but allowing user to proceed');
        setHasExistingRegistration(false);
        setApiStatus('ok'); // Set to ok so user can proceed
      }
    } catch (error: any) {
      console.error('❌ Network Error checking registration:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      
      // Don't block the user - allow them to proceed
      if (error.name === 'AbortError') {
        console.warn('⚠️ Request timeout, allowing user to proceed anyway');
        toast.error('Connection slow, but you can still register');
      }
      
      setHasExistingRegistration(false);
      setApiStatus('ok'); // Changed to 'ok' to allow user to proceed
    } finally {
      setLoading(false);
    }
  };

  const captureImage = () => {
    if (webcamRef.current && capturedImages.length < REQUIRED_IMAGES) {
      const imageSrc = webcamRef.current.getScreenshot({
        width: 320,
        height: 240,
      });
      if (imageSrc) {
        setCapturedImages([...capturedImages, imageSrc]);
        toast.success(`Image ${capturedImages.length + 1} captured!`);
      }
    }
  };

  const removeImage = (index: number) => {
    setCapturedImages(capturedImages.filter((_, i) => i !== index));
    toast.success('Image removed');
  };

  const handleSubmit = async () => {
    if (capturedImages.length < REQUIRED_IMAGES) {
      toast.error(`Please capture exactly ${REQUIRED_IMAGES} images`);
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Submitting face registration...');
    
    try {
      console.log('📤 Submitting registration for:', userData.name);
      console.log('📊 Images count:', capturedImages.length);
      
      // Calculate total size
      const totalSize = capturedImages.reduce((acc, img) => acc + img.length, 0);
      const totalSizeKB = Math.round(totalSize / 1024);
      console.log('📦 Total payload size:', totalSizeKB, 'KB');
      
      // If payload is too large (>500KB), use single-image upload method
      if (totalSizeKB > 500) {
        console.log('⚠️ Payload too large, using single-image upload method');
        toast.dismiss(loadingToast);
        return await handleSubmitSingleImages();
      }
      
      const payload = {
        studentId: userData.id,
        numericId: userData.numericId,
        clerkId: userData.clerkId || userData.id,
        studentName: userData.name,
        studentEmail: userData.email,
        images: capturedImages,
        location: location || undefined, // Include location if available
      };
      
      const response = await fetch('/api/student/face-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
      });

      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        
        // If SSL error, try single-image method
        if (errorText.includes('SSL') || errorText.includes('TLS')) {
          console.log('🔄 SSL error, retrying with single-image method');
          toast.dismiss(loadingToast);
          return await handleSubmitSingleImages();
        }
        
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('📥 Response data:', data);

      if (data.success) {
        toast.dismiss(loadingToast);
        toast.success('✓ Registered successfully!');
        setTimeout(() => {
          router.push('/dashboard/student');
        }, 2000);
      } else {
        toast.dismiss(loadingToast);
        console.error('❌ Registration failed:', data);
        toast.error(data.message || 'Registration failed');
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('❌ Error submitting registration:', error);
      
      // Try single-image method as fallback
      if (error.message.includes('SSL') || error.message.includes('TLS') || 
          error.message.includes('timeout') || error.message.includes('Failed to fetch')) {
        console.log('🔄 Error detected, trying single-image upload method');
        return await handleSubmitSingleImages();
      }
      
      toast.error(error.message || 'Failed to register face. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitSingleImages = async () => {
    setIsSubmitting(true);
    const progressToast = toast.loading('Uploading images (0/5)...');
    
    try {
      console.log('📤 Using single-image upload method');
      
      for (let i = 0; i < capturedImages.length; i++) {
        toast.loading(`Uploading images (${i + 1}/${capturedImages.length})...`, {
          id: progressToast
        });
        
        const response = await fetch('/api/student/face-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentId: userData.id,
            studentName: userData.name,
            images: [capturedImages[i]], // Send one image at a time
            location: location || undefined, // Include location
          }),
        });

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || `Failed to upload image ${i + 1}`);
        }
        
        console.log(`Image ${i + 1}/${capturedImages.length} uploaded`);
      }
      
      toast.dismiss(progressToast);
      toast.success('✓ Registered successfully!');
      setTimeout(() => {
        router.push('/dashboard/student');
      }, 2000);
      
    } catch (error: any) {
      toast.dismiss(progressToast);
      console.error('❌ Error in single-image upload:', error);
      toast.error(error.message || 'Failed to upload images. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-700 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to register your face.</p>
          <a
            href="/sign-in"
            className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/student')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Face Registration</h1>
            <p className="text-gray-600">
              Register your face for automatic attendance marking. Capture {REQUIRED_IMAGES} clear photos of your face from different angles.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                apiStatus === 'ok' ? 'bg-green-100 text-green-800' :
                apiStatus === 'error' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                API Status: {apiStatus === 'ok' ? '✓ Connected' : apiStatus === 'error' ? '✗ Error' : '⋯ Checking'}
              </div>
              {apiStatus === 'error' && userData && (
                <button
                  onClick={() => checkExistingRegistration(userData.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-medium hover:bg-blue-700"
                >
                  Retry
                </button>
              )}
            </div>
            {apiStatus === 'error' && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm font-semibold mb-2">⚠️ API Connection Error</p>
                <p className="text-red-700 text-xs mb-2">
                  The face registration API is not responding. This could be because:
                </p>
                <ul className="text-red-700 text-xs space-y-1 ml-4">
                  <li>• The development server needs to be restarted</li>
                  <li>• MongoDB is not connected</li>
                  <li>• The API route file is missing</li>
                </ul>
                <p className="text-red-700 text-xs mt-2 font-semibold">
                  Check the browser console (F12) for detailed error messages.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setApiStatus('ok');
                      toast.success('Proceeding anyway - you can still capture and submit photos');
                    }}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-xs font-medium"
                  >
                    Proceed Anyway
                  </button>
                  <a
                    href="/test-face-api"
                    target="_blank"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
                  >
                    Test API
                  </a>
                </div>
              </div>
            )}
            {hasExistingRegistration && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  ⚠️ You already have a face registration. Submitting new images will update your existing registration.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Camera Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Camera</h2>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.5}
                className="w-full"
                videoConstraints={{
                  width: 320,
                  height: 240,
                  facingMode: 'user',
                }}
              />
            </div>
            
            <div className="space-y-4">
              <button
                onClick={captureImage}
                disabled={capturedImages.length >= REQUIRED_IMAGES || isSubmitting}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Capture Image ({capturedImages.length}/{REQUIRED_IMAGES})
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Tips for best results:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Ensure good lighting on your face</li>
                  <li>• Look directly at the camera</li>
                  <li>• Remove glasses if possible</li>
                  <li>• Capture from slightly different angles</li>
                  <li>• Keep a neutral expression</li>
                </ul>
              </div>

              {capturedImages.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600">
                    Image size: ~{Math.round(capturedImages[0].length / 1024)}KB each
                  </p>
                  <p className="text-xs text-gray-600">
                    Total: ~{Math.round((capturedImages.reduce((acc, img) => acc + img.length, 0)) / 1024)}KB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Captured Images Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Captured Images ({capturedImages.length}/{REQUIRED_IMAGES})
            </h2>
            
            {capturedImages.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500">No images captured yet</p>
                <p className="text-gray-400 text-sm mt-2">Start capturing images using the camera</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {capturedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Captured ${index + 1}`}
                        className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                        Image {index + 1}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={capturedImages.length < REQUIRED_IMAGES || isSubmitting}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Submit Registration
                    </>
                  )}
                </button>

                {capturedImages.length < REQUIRED_IMAGES && (
                  <p className="text-center text-sm text-gray-500 mt-2">
                    Capture {REQUIRED_IMAGES - capturedImages.length} more image(s) to submit
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
