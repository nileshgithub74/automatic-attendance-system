'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

export default function MarkAttendancePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [userData, setUserData] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showAlreadyMarkedModal, setShowAlreadyMarkedModal] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationData, setLocationData] = useState<any>(null);
  const [recognitionResult, setRecognitionResult] = useState<any>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [detailsTimer, setDetailsTimer] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    // Check for custom login (localStorage)
    const role = localStorage.getItem('userRole');
    const studentData = localStorage.getItem('studentData');

    if (studentData && role?.toLowerCase() === 'student') {
      const student = JSON.parse(studentData);
      setUserData(student);
      return;
    }

    // Check for Clerk authentication
    if (user) {
      const userRole = (user.publicMetadata?.role as string)?.toLowerCase();
      
      if (userRole === 'student') {
        const student = {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Student',
          class: user.publicMetadata?.class || 'Not Assigned',
          rollNo: user.publicMetadata?.rollNo || 'Not Assigned',
          parentNumber: user.publicMetadata?.parentNumber || 'Not Provided',
        };
        setUserData(student);
        return;
      } else {
        router.push('/unauthorized');
        return;
      }
    }

    // No authentication found - don't redirect, let page show message
  }, [router, user, isLoaded]);

  const requestLocation = async () => {
    try {
      setMessage({ type: 'info', text: 'Requesting location access...' });
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        platform: navigator.platform
      };
      
      setLocationData(location);
      setLocationGranted(true);
      setMessage({ type: 'success', text: 'Location access granted! Now you can start the camera.' });
    } catch (error) {
      console.error('Location error:', error);
      setMessage({ type: 'error', text: 'Location access is required to mark attendance. Please allow location permissions.' });
    }
  };

  const startCamera = async () => {
    if (!locationGranted) {
      setMessage({ type: 'error', text: 'Please grant location access first.' });
      return;
    }

    try {
      setMessage({ type: 'info', text: 'Starting camera...' });
      setIsCapturing(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setMessage({ type: 'success', text: 'Camera started! Position your face in the frame.' });
            // Start real-time face recognition
            startRealTimeFaceRecognition();
          }).catch(err => {
            console.error('Play error:', err);
            setMessage({ type: 'error', text: 'Failed to play video stream.' });
          });
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setMessage({ type: 'error', text: 'Failed to access camera. Please allow camera permissions.' });
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setRecognitionResult(null);
    setShowStudentDetails(false);
    setDetailsTimer(0);
  };

  const startRealTimeFaceRecognition = () => {
    // Start continuous face recognition every 2 seconds
    const recognitionInterval = setInterval(() => {
      if (videoRef.current && !isRecognizing && !capturedImage) {
        performFaceRecognition();
      }
    }, 2000);

    // Store interval reference to clear it later
    (window as any).recognitionInterval = recognitionInterval;
  };

  const performFaceRecognition = async () => {
    if (!videoRef.current || isRecognizing) return;

    setIsRecognizing(true);
    
    try {
      // Capture current frame for recognition
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        // Send to face recognition API
        const response = await fetch('/api/face-recognition/identify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ faceImage: imageData }),
        });

        if (response.ok) {
          const result = await response.json();
          setRecognitionResult(result);
          
          if (result.recognized) {
            // Show student details for 10 seconds
            setShowStudentDetails(true);
            setMessage({ 
              type: 'success', 
              text: `Face recognized! Hello ${result.student.name}!` 
            });
            
            // Start 10-second countdown
            let countdown = 10;
            setDetailsTimer(countdown);
            
            const timerInterval = setInterval(() => {
              countdown--;
              setDetailsTimer(countdown);
              
              if (countdown <= 0) {
                clearInterval(timerInterval);
                setShowStudentDetails(false);
                // Automatically mark attendance after 10 seconds
                autoMarkAttendance(result.student);
              }
            }, 1000);
            
          } else {
            setMessage({ 
              type: 'error', 
              text: 'Face not found - Please position your face properly in the frame' 
            });
            
            // Show error for 3 seconds then continue recognition
            setTimeout(() => {
              setRecognitionResult(null);
            }, 3000);
          }
        }
      }
    } catch (error) {
      console.error('Face recognition error:', error);
      setMessage({ 
        type: 'error', 
        text: 'Face recognition failed. Please try again.' 
      });
    } finally {
      setIsRecognizing(false);
    }
  };

  const autoMarkAttendance = async (student: any) => {
    try {
      // Stop camera and recognition
      stopCamera();
      if ((window as any).recognitionInterval) {
        clearInterval((window as any).recognitionInterval);
      }

      // Show processing message
      setMessage({ 
        type: 'info', 
        text: `Marking attendance for ${student.name}...` 
      });

      // Get network information
      const networkInfo: any = {};
      
      // Get connection type
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        networkInfo.connectionType = connection.effectiveType || connection.type || 'Unknown';
        networkInfo.downlink = connection.downlink;
        networkInfo.rtt = connection.rtt;
      }

      // Measure latency
      const startTime = performance.now();
      try {
        await fetch('/api/hello', { method: 'HEAD' });
        const endTime = performance.now();
        networkInfo.latency = Math.round(endTime - startTime);
      } catch (error) {
        networkInfo.latency = 0;
      }

      // Submit attendance automatically
      const response = await fetch('/api/student/mark-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
          class: student.class,
          rollNo: student.rollNo,
          faceImage: null, // No need to store image for auto-recognition
          location: locationData,
          networkInfo,
          method: 'auto_face_recognition'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `✅ Attendance marked successfully! Welcome ${student.name}!`
        });
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/dashboard/student');
        }, 3000);
      } else {
        // Check if attendance already marked
        if (data.error && data.error.includes('already marked')) {
          setMessage({ 
            type: 'info', 
            text: `${student.name}, your attendance is already marked for today!`
          });
          
          // Still redirect to dashboard
          setTimeout(() => {
            router.push('/dashboard/student');
          }, 3000);
        } else {
          setMessage({ 
            type: 'error', 
            text: data.error || 'Failed to mark attendance. Please try again.' 
          });
        }
      }
    } catch (error) {
      console.error('Error in auto mark attendance:', error);
      setMessage({ 
        type: 'error', 
        text: 'Network error. Please check your connection and try again.' 
      });
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        stopCamera();
        setMessage({ type: 'success', text: 'Image captured! Click "Submit Attendance" to mark your attendance.' });
      }
    }
  };

  const retakeImage = () => {
    setCapturedImage(null);
    setMessage(null);
    startCamera();
  };

  const submitAttendance = async () => {
    if (!capturedImage || !userData) return;

    setIsProcessing(true);
    setMessage({ type: 'info', text: 'Processing your attendance...' });

    try {
      // Use the location data we already have
      const location = locationData;

      // Get network information
      const networkInfo: any = {};
      
      // Get connection type
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        networkInfo.connectionType = connection.effectiveType || connection.type || 'Unknown';
        networkInfo.downlink = connection.downlink;
        networkInfo.rtt = connection.rtt; // Round-trip time (latency)
      }

      // Measure latency
      const startTime = performance.now();
      try {
        await fetch('/api/hello', { method: 'HEAD' });
        const endTime = performance.now();
        networkInfo.latency = Math.round(endTime - startTime);
      } catch (error) {
        networkInfo.latency = 0;
      }

      // Calculate jitter (variation in latency)
      const latencies = [];
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        try {
          await fetch('/api/hello', { method: 'HEAD' });
          latencies.push(performance.now() - start);
        } catch (error) {
          // Ignore errors
        }
      }
      if (latencies.length > 1) {
        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const variance = latencies.reduce((sum, lat) => sum + Math.pow(lat - avgLatency, 2), 0) / latencies.length;
        networkInfo.jitter = Math.round(Math.sqrt(variance));
      }

      const response = await fetch('/api/student/mark-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: userData.id,
          studentName: userData.name,
          class: userData.class,
          rollNo: userData.rollNo,
          faceImage: capturedImage,
          location,
          networkInfo
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: data.message || 'Attendance marked as PRESENT! Your teacher will verify your actual presence using AI camera verification.'
        });
        setCapturedImage(null);
        setTimeout(() => {
          router.push('/dashboard/student');
        }, 3000);
      } else {
        // Check if attendance already marked
        if (data.error && data.error.includes('already marked')) {
          setShowAlreadyMarkedModal(true);
          setCapturedImage(null);
          stopCamera();
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to mark attendance. Please try again.' });
        }
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      setMessage({ type: 'error', text: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    stopCamera();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('studentData');
      localStorage.removeItem('teacherData');
      localStorage.removeItem('userRole');
      document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'userId=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
      // Clear recognition interval
      if ((window as any).recognitionInterval) {
        clearInterval((window as any).recognitionInterval);
      }
      // Clear any countdown timers
      setShowStudentDetails(false);
      setDetailsTimer(0);
    };
  }, []);

  // Show loading or sign-in prompt
  if (!isLoaded) {
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
          <p className="text-gray-600 mb-6">Please sign in to mark attendance.</p>
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mark Attendance</h1>
              <p className="text-gray-600 mt-1">Capture your photo to mark attendance</p>
              <p className="text-sm text-gray-500">Student: {userData.name} | Class: {userData.class} | Roll No: {userData.rollNo}</p>
            </div>
            <div>
              <Link
                href="/dashboard/student"
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium inline-block"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-sm font-medium ${
              message.type === 'success' ? 'text-green-800' :
              message.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
              <div className="flex flex-col items-center justify-center">
                {!isCapturing && !capturedImage && (
                  <div className="text-center">
                    {!locationGranted ? (
                      <>
                        <svg className="w-24 h-24 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Step 1: Grant Location Access</h3>
                        <p className="text-sm text-gray-500 mb-4">We need your location to verify attendance</p>
                        <button
                          onClick={requestLocation}
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                        >
                          Allow Location Access
                        </button>
                      </>
                    ) : (
                      <>
                        <svg className="w-24 h-24 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Step 2: Start Camera</h3>
                        <p className="text-sm text-gray-500 mb-4">Click the button below to start your camera</p>
                        <button
                          onClick={startCamera}
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                        >
                          Start Camera
                        </button>
                      </>
                    )}
                  </div>
                )}

                {isCapturing && (
                  <div className="w-full">
                    <div className="mb-4 text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Camera Preview</h3>
                      <p className="text-sm text-gray-600">Position your face in the center of the frame</p>
                    </div>
                    <div className="bg-black rounded-xl overflow-hidden mx-auto border-4 border-blue-500 shadow-2xl relative" style={{ width: '640px', height: '480px', maxWidth: '100%' }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          backgroundColor: '#000'
                        }}
                      />
                      
                      {/* Face Recognition Overlay */}
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Recognition Status Overlay - Positioned at top center */}
                        {recognitionResult && (
                          <div className="absolute top-6 left-6 right-6 z-10">
                            {recognitionResult.recognized ? (
                              // Green banner with student info exactly like the image
                              <div className="bg-green-500 text-white p-4 rounded-xl shadow-2xl border-2 border-green-400">
                                <div className="flex items-center gap-4">
                                  {/* Checkmark icon */}
                                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  
                                  {/* Student details */}
                                  <div className="flex-1">
                                    <div className="text-2xl font-bold mb-1">{recognitionResult.student.name}</div>
                                    <div className="text-lg opacity-95">
                                      Roll: {recognitionResult.student.rollNo} | Class: {recognitionResult.student.class}
                                    </div>
                                  </div>
                                </div>
                                
                                {showStudentDetails && (
                                  <div className="mt-3 text-center text-lg font-medium bg-white bg-opacity-20 rounded-lg py-2">
                                    Marking attendance automatically...
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Red banner for unrecognized face
                              <div className="bg-red-500 text-white p-4 rounded-xl shadow-2xl border-2 border-red-400">
                                <div className="flex items-center gap-4">
                                  {/* X icon */}
                                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </div>
                                  
                                  {/* Error message */}
                                  <div className="flex-1">
                                    <div className="text-2xl font-bold mb-1">Face not found</div>
                                    <div className="text-lg opacity-95">
                                      Please position your face properly in the frame
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Simple border overlay for recognition feedback */}
                        {recognitionResult?.recognized && (
                          <div className="absolute inset-4">
                            <div className="w-full h-full border-4 border-green-400 rounded-lg shadow-lg shadow-green-400/30"></div>
                          </div>
                        )}
                        
                        {recognitionResult?.recognized === false && (
                          <div className="absolute inset-4">
                            <div className="w-full h-full border-4 border-red-400 rounded-lg shadow-lg shadow-red-400/30"></div>
                          </div>
                        )}
                        
                        {/* Center recognition status */}
                        {isRecognizing && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg text-sm font-medium">
                              Recognizing Face...
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3 justify-center">
                      <button
                        onClick={captureImage}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                      >
                        📸 Capture Photo
                      </button>
                      <button
                        onClick={stopCamera}
                        className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {capturedImage && (
                  <div className="w-full">
                    <img
                      src={capturedImage}
                      alt="Captured"
                      className="w-full rounded-lg shadow-lg"
                    />
                    <div className="mt-4 flex gap-3 justify-center">
                      <button
                        onClick={submitAttendance}
                        disabled={isProcessing}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Processing...' : '✓ Submit Attendance'}
                      </button>
                      <button
                        onClick={retakeImage}
                        disabled={isProcessing}
                        className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        🔄 Retake Photo
                      </button>
                    </div>
                  </div>
                )}

                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Already Marked Modal */}
      {showAlreadyMarkedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-bounce-in">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                <svg className="h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Already Marked!</h3>
              <p className="text-gray-600 mb-6">
                Your attendance has already been marked for today. You can only mark attendance once per day.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => router.push('/dashboard/student')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => setShowAlreadyMarkedModal(false)}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
