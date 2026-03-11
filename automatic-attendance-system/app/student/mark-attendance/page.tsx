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

  const startCamera = async () => {
    try {
      setMessage({ type: 'info', text: 'Starting camera...' });
      setIsCapturing(true); // Show the video container immediately
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Ensure video plays
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setMessage({ type: 'success', text: 'Camera started! Position your face in the frame.' });
          }).catch(err => {
            console.error('Play error:', err);
            setMessage({ type: 'error', text: 'Failed to play video stream.' });
          });
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setMessage({ type: 'error', text: 'Failed to access camera. Please allow camera permissions.' });
      setIsCapturing(false); // Hide video container on error
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
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Attendance marked successfully!' });
        setCapturedImage(null);
        setTimeout(() => {
          router.push('/dashboard/student');
        }, 2000);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mark Attendance</h1>
              <p className="text-gray-600 mt-1">Use face recognition to mark your attendance</p>
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

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
              <div className="flex flex-col items-center justify-center">
                {!isCapturing && !capturedImage && (
                  <div className="text-center">
                    <svg className="w-24 h-24 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to mark attendance?</h3>
                    <p className="text-sm text-gray-500 mb-4">Click the button below to start your camera</p>
                    <button
                      onClick={startCamera}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                    >
                      Start Camera
                    </button>
                  </div>
                )}

                {isCapturing && (
                  <div className="w-full">
                    <div className="mb-4 text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">📹 Camera Preview</h3>
                      <p className="text-sm text-gray-600">Position your face in the center of the frame</p>
                    </div>
                    <div className="bg-black rounded-xl overflow-hidden mx-auto border-4 border-blue-500 shadow-2xl" style={{ width: '640px', height: '480px', maxWidth: '100%' }}>
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
                    </div>
                    <div className="mt-4 text-center">
                      <div className="inline-flex items-center bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        <span className="w-3 h-3 bg-red-600 rounded-full mr-2 animate-pulse"></span>
                        CAMERA IS LIVE
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

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <div className="flex">
                <svg className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Tips for best results:</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Ensure good lighting on your face</li>
                    <li>• Look directly at the camera</li>
                    <li>• Remove glasses or masks if possible</li>
                    <li>• Keep your face centered in the frame</li>
                  </ul>
                </div>
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
