'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterFacePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const studentData = localStorage.getItem('studentData');

    if (!role || !studentData) {
      router.push('/login');
      return;
    }

    if (role.toLowerCase() !== 'student') {
      router.push('/login');
      return;
    }

    const student = JSON.parse(studentData);
    setUserData(student);
    checkRegistrationStatus(student.id);
  }, [router]);

  const checkRegistrationStatus = async (studentId: string) => {
    try {
      const response = await fetch(`/api/student/register-face?studentId=${studentId}`);
      if (response.ok) {
        const data = await response.json();
        setIsRegistered(data.isRegistered);
        if (data.isRegistered) {
          setMessage({ type: 'info', text: 'Your face is already registered. You can re-register to update your face data.' });
        }
      }
    } catch (error) {
      console.error('Error checking registration status:', error);
    }
  };

  const startCamera = async () => {
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
        setMessage({ type: 'success', text: 'Image captured! Click "Register Face" to save your face data.' });
      }
    }
  };

  const retakeImage = () => {
    setCapturedImage(null);
    setMessage(null);
    startCamera();
  };

  const registerFace = async () => {
    if (!capturedImage || !userData) return;

    setIsProcessing(true);
    setMessage({ type: 'info', text: 'Processing your face data...' });

    try {
      const response = await fetch('/api/student/register-face', {
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
        setMessage({ type: 'success', text: data.message || 'Face registered successfully!' });
        setCapturedImage(null);
        setIsRegistered(true);
        setTimeout(() => {
          router.push('/dashboard/student');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to register face. Please try again.' });
      }
    } catch (error) {
      console.error('Error registering face:', error);
      setMessage({ type: 'error', text: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!userData) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Register Face</h1>
              <p className="text-gray-600 mt-1">Register your face for attendance marking</p>
              <p className="text-sm text-gray-500">Student: {userData.name} | Class: {userData.class} | Roll No: {userData.rollNo}</p>
            </div>
            <div>
              <Link
                href="/student/attendance"
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium inline-block"
              >
                ← Back
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {isRegistered ? 'Update Your Face Registration' : 'Register Your Face'}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {isRegistered 
                        ? 'Click below to update your registered face data'
                        : 'Click below to start the face registration process'
                      }
                    </p>
                    <button
                      onClick={startCamera}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                    >
                      Start Camera
                    </button>
                  </div>
                )}

                {isCapturing && (
                  <div className="w-full">
                    <div className="mb-4 text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Camera Preview</h3>
                      <p className="text-sm text-gray-600">Position your face in the center of the frame</p>
                    </div>
                    <div className="bg-black rounded-xl overflow-hidden mx-auto border-4 border-green-500 shadow-2xl" style={{ width: '640px', height: '480px', maxWidth: '100%' }}>
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
                        onClick={registerFace}
                        disabled={isProcessing}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Processing...' : '✓ Register Face'}
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

            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <div className="flex">
                <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-green-800 mb-1">Tips for best face registration:</h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Ensure good lighting on your face</li>
                    <li>• Look directly at the camera</li>
                    <li>• Remove glasses or masks</li>
                    <li>• Keep your face centered in the frame</li>
                    <li>• Use a neutral expression</li>
                    <li>• Register in the same lighting conditions you'll use for attendance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
