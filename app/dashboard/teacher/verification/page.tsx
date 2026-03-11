'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import toast, { Toaster } from 'react-hot-toast';

export default function VerificationSessionPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [duration, setDuration] = useState(5); // minutes
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [capturedImages, setCapturedImages] = useState(0);
  const [totalImages, setTotalImages] = useState(10);
  const [cameraReady, setCameraReady] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    const role = user?.publicMetadata?.role as string;
    if (role !== 'Teacher' && role !== 'teacher') {
      router.push('/unauthorized');
      return;
    }

    // Get location
    getLocation();
  }, [isLoaded, user, router]);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          toast.success('Location obtained');
        },
        (error) => {
          toast.error('Failed to get location. Please enable location services.');
        }
      );
    }
  };

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
        toast.success('Camera initialized');
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Failed to access camera. Please grant camera permissions.');
    }
  };

  const startSession = async () => {
    if (!location) {
      toast.error('Location required. Please enable location services.');
      return;
    }

    if (!cameraReady) {
      toast.error('Camera not ready. Please initialize camera first.');
      return;
    }

    try {
      const response = await fetch('/api/verification/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: 'class_1', // You can make this dynamic
          className: 'Class 10A',
          duration,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: 10,
          },
          studentsMarked: [], // Add student IDs from attendance
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.session.sessionId);
        setTotalImages(data.session.totalImages);
        setTimeRemaining(duration * 60);
        setSessionActive(true);
        toast.success('Verification session started!');
        
        // Start countdown timer
        startTimer();
        
        // Start automatic image capture
        startImageCapture();
      } else {
        toast.error('Failed to start session');
      }
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Error starting verification session');
    }
  };

  const startTimer = () => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          endSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startImageCapture = () => {
    const captureInterval = 30; // seconds
    let count = 0;

    const interval = setInterval(() => {
      if (count >= totalImages) {
        clearInterval(interval);
        return;
      }

      captureImage();
      count++;
      setCapturedImages(count);
    }, captureInterval * 1000);
  };

  const captureImage = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      
      // Upload image to backend
      uploadImage(imageData);
      
      toast.success(`Image ${capturedImages + 1}/${totalImages} captured`);
    }
  };

  const uploadImage = async (imageData: string) => {
    try {
      // This endpoint needs to be created
      await fetch('/api/verification/session/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          imageData,
          sequenceNumber: capturedImages + 1,
        }),
      });
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const endSession = async () => {
    setSessionActive(false);
    toast.success('Verification session completed! Processing results...');
    
    // Stop camera
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    
    // Complete session and update attendance
    try {
      // Mock verification results - in real implementation, this would come from AI processing
      const mockResults = [
        {
          studentId: '1',
          studentName: 'Student 1',
          detectionCount: 8,
          totalImages: 10,
          status: 'present',
          averageSimilarity: 0.85,
          flags: [],
          detectedInImages: [1, 2, 3, 4, 5, 6, 7, 8],
        },
        // Add more mock results as needed
      ];

      const response = await fetch('/api/verification/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          verificationResults: mockResults,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Attendance updated! ${data.summary.present} present, ${data.summary.absent} absent`);
      }
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Session completed but failed to update attendance');
    }
    
    // Redirect to results
    setTimeout(() => {
      router.push(`/dashboard/teacher/verification/results?sessionId=${sessionId}`);
    }, 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">🤖 Smart AI Verification Session</h1>
            <p className="text-purple-100 text-lg">Automated classroom attendance verification using AI face recognition</p>
          </div>
        </div>

        {/* Session Status */}
        {sessionActive && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <p className="text-sm text-gray-600 mb-1">Time Remaining</p>
              <p className="text-3xl font-bold text-purple-600">{formatTime(timeRemaining)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1">Images Captured</p>
              <p className="text-3xl font-bold text-blue-600">{capturedImages}/{totalImages}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-1">Progress</p>
              <p className="text-3xl font-bold text-green-600">{Math.round((capturedImages / totalImages) * 100)}%</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <p className="text-xl font-bold text-orange-600 flex items-center gap-2">
                <span className="animate-pulse">●</span> Active
              </p>
            </div>
          </div>
        )}

        {/* Camera Preview */}
        <div className="bg-white rounded-xl shadow-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📹 Camera Preview</h2>
          
          <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
                <div className="text-center text-white">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg">Camera not initialized</p>
                </div>
              </div>
            )}
            
            {sessionActive && (
              <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-pulse">
                <span className="w-3 h-3 bg-white rounded-full"></span>
                RECORDING
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        {!sessionActive && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Session Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Duration (minutes)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-700"
                >
                  <option value={5}>5 minutes</option>
                  <option value={7}>7 minutes</option>
                  <option value={10}>10 minutes</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Status
                </label>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                  {location ? (
                    <>
                      <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-green-700 font-medium">Location obtained</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-orange-700 font-medium">Location required</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              {!cameraReady && (
                <button
                  onClick={initializeCamera}
                  className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Initialize Camera
                </button>
              )}
              
              <button
                onClick={startSession}
                disabled={!cameraReady || !location}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Verification Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
