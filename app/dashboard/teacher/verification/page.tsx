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
  const [totalImages, setTotalImages] = useState(5); // Fixed to 5 images
  const [cameraReady, setCameraReady] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<Array<{ name: string; confidence: number }>>([]);
  const [faceDetectionLog, setFaceDetectionLog] = useState<Map<string, number>>(new Map());

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
    
    // Initialize camera automatically
    initializeCamera();
  }, [isLoaded, user, router]);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(locationData);
          
          // Send location to monitoring system
          sendLocationToMonitoring(locationData, position.coords.accuracy);
          
          toast.success('Location found');
        },
        (error) => {
          toast.error('Please enable location');
        }
      );
    }
  };

  const sendLocationToMonitoring = async (locationData: { latitude: number; longitude: number }, accuracy: number) => {
    try {
      const response = await fetch('/api/admin/verification/location-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          userName: `${user?.firstName} ${user?.lastName}`,
          location: {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: accuracy,
          },
          timestamp: new Date().toISOString(),
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            deviceId: `teacher_${user?.id}`,
          },
        }),
      });

      if (response.ok) {
        console.log('Location sent to monitoring system');
      } else {
        console.error('Failed to send location to monitoring');
      }
    } catch (error) {
      console.error('Error sending location:', error);
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
        toast.success('Camera ready');
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Camera access denied');
    }
  };

  const startSession = async () => {
    if (!location) {
      toast.error('Location needed');
      return;
    }

    if (!cameraReady) {
      toast.error('Camera not ready');
      return;
    }

    try {
      // Generate a unique session ID
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      
      // Calculate images and interval based on duration
      let imagesToCapture = 5;
      let captureIntervalSeconds = 60; // 1 minute default
      
      if (duration === 5) {
        imagesToCapture = 5;
        captureIntervalSeconds = 60; // Every 1 minute (5 min / 5 images)
      } else if (duration === 7) {
        imagesToCapture = 7;
        captureIntervalSeconds = 60; // Every 1 minute (7 min / 7 images)
      } else if (duration === 10) {
        imagesToCapture = 10;
        captureIntervalSeconds = 60; // Every 1 minute (10 min / 10 images)
      } else if (duration === 30) {
        imagesToCapture = 20;
        captureIntervalSeconds = 90; // Every 1.5 minutes (30 min / 20 images)
      } else if (duration === 60) {
        imagesToCapture = 20;
        captureIntervalSeconds = 180; // Every 3 minutes (60 min / 20 images)
      } else if (duration === 120) {
        imagesToCapture = 20;
        captureIntervalSeconds = 360; // Every 6 minutes (120 min / 20 images)
      }
      
      setTotalImages(imagesToCapture);
      setTimeRemaining(duration * 60);
      setSessionActive(true);
      
      console.log(`📸 Session config: ${imagesToCapture} images, every ${captureIntervalSeconds} seconds`);
      toast.success(`Session started! Taking ${imagesToCapture} photos.`);
      
      // Start countdown timer
      startTimer();
      
      // Start automatic image capture with calculated interval
      startImageCapture(captureIntervalSeconds, newSessionId);
      
      // Start continuous location tracking (every 30 seconds)
      startLocationTracking();
      
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Error starting session');
    }
  };

  const startLocationTracking = () => {
    // Send location immediately
    if (location) {
      sendLocationToMonitoring(location, 10);
    }
    
    // Then send every 30 seconds during the session
    const locationInterval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const locationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setLocation(locationData);
            sendLocationToMonitoring(locationData, position.coords.accuracy);
          },
          (error) => {
            console.error('Location tracking error:', error);
          }
        );
      }
    }, 30000); // Every 30 seconds

    // Store interval ID to clear it later
    (window as any).locationTrackingInterval = locationInterval;
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

  const startImageCapture = (captureIntervalSeconds: number, currentSessionId: string) => {
    let count = 0;

    const interval = setInterval(() => {
      if (count >= totalImages) {
        clearInterval(interval);
        toast.success('All photos taken! Marking attendance...');
        // Mark attendance automatically based on face detection
        setTimeout(() => {
          markAttendanceAutomatically();
        }, 1000);
        return;
      }

      count++;
      setCapturedImages(count);
      captureImage(count, currentSessionId);
    }, captureIntervalSeconds * 1000);
  };

  const captureImage = async (sequenceNumber: number, currentSessionId: string) => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      
      // Detect faces in the image
      await detectFacesInImage(imageData);
      
      // Upload image to Cloudinary
      const uploaded = await uploadImageToCloudinary(imageData, sequenceNumber, currentSessionId);
      
      if (uploaded) {
        toast.success(`Photo ${sequenceNumber}/${totalImages} saved`);
      }
    }
  };

  const detectFacesInImage = async (imageData: string) => {
    try {
      console.log('🔍 Calling face detection API...');
      
      const response = await fetch('/api/verification/detect-faces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData }),
      });

      console.log('Face detection response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Face detection data:', data);
        
        if (data.faces && data.faces.length > 0) {
          console.log(`✅ Detected ${data.faces.length} faces:`, data.faces.map((f: any) => f.name));
          setDetectedFaces(data.faces);
          
          // Log detected faces for attendance calculation
          const updatedLog = new Map(faceDetectionLog);
          data.faces.forEach((face: any) => {
            const currentCount = updatedLog.get(face.studentId) || 0;
            updatedLog.set(face.studentId, currentCount + 1);
          });
          setFaceDetectionLog(updatedLog);
          
          console.log('Face detection log updated:', Object.fromEntries(updatedLog));
          
          // Clear detected faces after 3 seconds
          setTimeout(() => {
            setDetectedFaces([]);
          }, 3000);
        } else {
          console.log('⚠️ No faces detected in this image');
        }
      } else {
        console.error('❌ Face detection API error:', response.status);
      }
    } catch (error) {
      console.error('❌ Error detecting faces:', error);
    }
  };

  const uploadImageToCloudinary = async (imageData: string, sequenceNumber: number, currentSessionId: string) => {
    try {
      console.log(`📤 Uploading photo ${sequenceNumber} to Cloudinary...`);
      console.log('Session ID:', currentSessionId);
      
      const response = await fetch('/api/verification/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          imageData,
          sequenceNumber,
          location,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Image uploaded to Cloudinary:', data.imageUrl);
        return true;
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to upload image:', errorData);
        return false;
      }
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      return false;
    }
  };

  const markAttendanceAutomatically = async () => {
    try {
      console.log('📊 ========== MARKING ATTENDANCE AUTOMATICALLY ==========');
      console.log('📊 Calculating attendance from face detection log...');
      console.log('Face detection log:', Object.fromEntries(faceDetectionLog));
      console.log('Total images captured:', totalImages);

      // Calculate which students should be marked present
      // Rule: Student must appear in at least 60% of photos (3 out of 5)
      const threshold = Math.ceil(totalImages * 0.6); // 60% threshold
      console.log(`Threshold: Student must appear in ${threshold}/${totalImages} photos`);

      const presentStudents: Array<{ studentId: string; name: string; detectionCount: number; percentage: number }> = [];
      const absentStudents: Array<{ studentId: string; name: string; detectionCount: number }> = [];

      // Get all registered students
      console.log('Fetching all students...');
      const studentsResponse = await fetch('/api/admin/students');
      const allStudents = studentsResponse.ok ? await studentsResponse.json() : [];
      console.log(`Total students in system: ${allStudents.length}`);

      // Check each student's detection count
      for (const student of allStudents) {
        const detectionCount = faceDetectionLog.get(student.id) || 0;
        const percentage = Math.round((detectionCount / totalImages) * 100);

        console.log(`Student: ${student.name}, Detected: ${detectionCount}/${totalImages} (${percentage}%)`);

        if (detectionCount >= threshold) {
          presentStudents.push({
            studentId: student.id,
            name: student.name,
            detectionCount,
            percentage
          });
          console.log(`✅ ${student.name} - PRESENT`);
        } else {
          absentStudents.push({
            studentId: student.id,
            name: student.name,
            detectionCount
          });
          console.log(`❌ ${student.name} - ABSENT`);
        }
      }

      console.log(`✅ Present: ${presentStudents.length} students`);
      console.log(`❌ Absent: ${absentStudents.length} students`);

      // Mark attendance in database
      console.log('Calling mark-attendance-auto API...');
      const response = await fetch('/api/verification/mark-attendance-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          presentStudents,
          absentStudents,
          totalImages,
          threshold,
          date: new Date().toISOString().split('T')[0]
        }),
      });

      console.log('API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Attendance marked successfully:', data);
        toast.success(`Attendance marked! ${presentStudents.length} present, ${absentStudents.length} absent`);
        
        // Show detailed results
        console.log('Attendance marking results:', data);
        
        // End session after marking attendance
        setTimeout(() => {
          endSession();
        }, 2000);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to mark attendance:', errorData);
        toast.error('Failed to mark attendance');
      }
    } catch (error) {
      console.error('❌ Error marking attendance:', error);
      toast.error('Error marking attendance');
    }
  };

  const processImagesWithAI = async () => {
    toast.loading('Checking attendance... Please wait.');
    
    try {
      // Option 1: Auto-mark attendance for all students in class
      const autoMarkResponse = await fetch('/api/verification/auto-mark-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          className: 'Class 10A', // You can make this dynamic
          totalImages: capturedImages,
        }),
      });

      if (autoMarkResponse.ok) {
        const autoMarkResults = await autoMarkResponse.json();
        toast.success(`Attendance marked! ${autoMarkResults.summary.presentCount} present, ${autoMarkResults.summary.absentCount} absent`);
        
        // Show detailed results
        console.log('Auto-marked attendance results:', autoMarkResults);
        
        // Display results to teacher
        displayAttendanceResults(autoMarkResults);
        
      } else {
        // Fallback to manual verification if auto-marking fails
        await processManualVerification();
      }
    } catch (error) {
      console.error('Error processing images with AI:', error);
      toast.error('Error during AI verification');
      await processManualVerification();
    }
  };

  const processManualVerification = async () => {
    try {
      // Get today's attendance records to know which students to verify
      const today = new Date().toISOString().split('T')[0];
      const attendanceResponse = await fetch(`/api/attendance?date=${today}`);
      const attendanceData = attendanceResponse.ok ? await attendanceResponse.json() : [];
      
      // Filter students who marked attendance today
      const studentsToVerify = attendanceData.filter((record: any) => 
        record.status === 'present' && record.method === 'face_recognition'
      );

      // Call AI verification API
      const verificationResponse = await fetch('/api/verification/process-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          studentsToVerify: studentsToVerify.map((s: any) => ({
            studentId: s.studentId,
            studentName: s.studentName,
            class: s.class
          })),
          totalImages: capturedImages,
        }),
      });

      if (verificationResponse.ok) {
        const verificationResults = await verificationResponse.json();
        toast.success('Verification completed!');
        
        // Update attendance based on results
        await updateAttendanceWithAIResults(verificationResults);
      } else {
        toast.error('AI verification failed');
      }
    } catch (error) {
      console.error('Error in manual verification:', error);
      toast.error('Manual verification failed');
    }
  };

  const displayAttendanceResults = (results: any) => {
    // Create a detailed summary for the teacher
    const summary = `
📊 Attendance Summary:
👥 Total Students: ${results.summary.totalStudents}
✅ Present: ${results.summary.presentCount}
❌ Absent: ${results.summary.absentCount}

Present Students:
${results.presentStudents.map((s: any) => 
  `• ${s.name} (${s.rollNo}) - ${s.confidence * 100}% confidence`
).join('\n')}

Absent Students:
${results.absentStudents.map((s: any) => 
  `• ${s.name} (${s.rollNo}) - ${s.reason}`
).join('\n')}
    `;
    
    console.log(summary);
    toast.success('Attendance marked using face recognition!');
  };

  const updateAttendanceWithAIResults = async (results: any) => {
    try {
      const response = await fetch('/api/verification/update-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          verificationResults: results,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Attendance updated! ${data.verified} students verified as present.`);
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Failed to update attendance');
    }
  };

  const endSession = async () => {
    setSessionActive(false);
    toast.success('Session completed! Checking results...');
    
    // Stop location tracking
    if ((window as any).locationTrackingInterval) {
      clearInterval((window as any).locationTrackingInterval);
    }
    
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
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Attendance Verification</h1>
            <p className="text-gray-600">Take photos to verify student attendance</p>
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
              <p className="text-sm text-gray-600 mb-1">Photos Taken</p>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Camera Preview</h2>
          
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
              <>
                <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-pulse">
                  <span className="w-3 h-3 bg-white rounded-full"></span>
                  RECORDING
                </div>
                
                <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="text-xs font-medium">Face Detection Active</span>
                </div>
              </>
            )}

            {/* Detected Faces Banner */}
            {detectedFaces.length > 0 && (
              <div className="absolute bottom-4 left-4 right-4 space-y-2">
                {detectedFaces.map((face, index) => (
                  <div
                    key={index}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-sm">{face.name}</span>
                    <span className="text-xs bg-green-600 px-2 py-1 rounded">
                      {Math.round(face.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        {!sessionActive && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Setup</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-700"
                >
                  <option value={5}>5 minutes</option>
                  <option value={7}>7 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                  {location ? (
                    <>
                      <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-green-700 font-medium">Ready</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-orange-700 font-medium">Required</span>
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
                Start Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
