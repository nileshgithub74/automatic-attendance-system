'use client';

import { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';

interface VerificationSessionProps {
  classId: string;
  teacherId: string;
  courseId?: string;
  onComplete: (results: any) => void;
}

export default function VerificationSession({
  classId,
  teacherId,
  courseId,
  onComplete
}: VerificationSessionProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [capturedCount, setCapture dCount] = useState(0);
  const [totalImages, setTotalImages] = useState(10);
  const [duration, setDuration] = useState(5); // minutes
  const [remainingTime, setRemainingTime] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [classroomLocation, setClassroomLocation] = useState<any>(null);

  const webcamRef = useRef<Webcam>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get classroom location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setClassroomLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.error('Location error:', error);
          toast.error('Could not get classroom location');
        }
      );
    }
  }, []);

  // Start verification session
  const startSession = async () => {
    try {
      if (!classroomLocation) {
        toast.error('Waiting for classroom location...');
        return;
      }

      const response = await fetch('/api/verification/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          classId,
          courseId,
          duration,
          totalImages,
          classroomLocation,
          config: {
            minAppearancePercentage: 50,
            allowedRadius: 30,
            requireLocation: true,
            requireNetworkCheck: true
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.sessionId);
        setIsActive(true);
        setRemainingTime(duration * 60);
        toast.success('Verification session started!');

        // Start capturing images
        startCapturing(data.sessionId, data.captureInterval);
        
        // Start countdown timer
        startTimer();
      } else {
        toast.error(data.error || 'Failed to start session');
      }
    } catch (error) {
      console.error('Start session error:', error);
      toast.error('Failed to start verification session');
    }
  };

  // Start capturing images at intervals
  const startCapturing = (sessionId: string, interval: number) => {
    let count = 0;

    captureIntervalRef.current = setInterval(async () => {
      if (count >= totalImages) {
        stopSession();
        return;
      }

      await captureImage(sessionId, count + 1);
      count++;
      setCapturedCount(count);
    }, interval * 1000);
  };

  // Capture single image
  const captureImage = async (sessionId: string, sequenceNumber: number) => {
    try {
      const imageSrc = webcamRef.current?.getScreenshot();
      
      if (!imageSrc) {
        console.error('Failed to capture image');
        return;
      }

      // Upload image
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('sequenceNumber', sequenceNumber.toString());
      formData.append('timestamp', new Date().toISOString());
      
      // Convert base64 to blob
      const blob = await fetch(imageSrc).then(r => r.blob());
      formData.append('image', blob, `capture_${sequenceNumber}.jpg`);

      const response = await fetch('/api/verification/image/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        console.log(`Image ${sequenceNumber} captured and uploaded`);
        toast.success(`Captured image ${sequenceNumber}/${totalImages}`);
      }
    } catch (error) {
      console.error('Capture error:', error);
    }
  };

  // Start countdown timer
  const startTimer = () => {
    timerIntervalRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          stopSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Stop session and process results
  const stopSession = async () => {
    // Clear intervals
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    setIsActive(false);
    setProcessing(true);

    try {
      // Complete session and get results
      const response = await fetch(`/api/verification/session/${sessionId}/complete`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Verification complete!');
        onComplete(data.results);
      } else {
        toast.error('Failed to complete verification');
      }
    } catch (error) {
      console.error('Complete session error:', error);
      toast.error('Failed to process results');
    } finally {
      setProcessing(false);
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="verification-session">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">AI Verification Session</h2>

        {!isActive && !processing && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min="1"
                max="15"
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Number of Images
              </label>
              <input
                type="number"
                value={totalImages}
                onChange={(e) => setTotalImages(Number(e.target.value))}
                min="5"
                max="20"
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <button
              onClick={startSession}
              disabled={!classroomLocation}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {classroomLocation ? 'Start Verification Session' : 'Getting location...'}
            </button>
          </div>
        )}

        {isActive && (
          <div className="space-y-4">
            {/* Camera feed */}
            <div className="relative">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full rounded-lg"
                videoConstraints={{
                  width: 1280,
                  height: 720,
                  facingMode: 'user'
                }}
              />
              <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full">
                ● RECORDING
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress: {capturedCount}/{totalImages} images</span>
                <span>Time remaining: {formatTime(remainingTime)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(capturedCount / totalImages) * 100}%` }}
                />
              </div>
            </div>

            <button
              onClick={stopSession}
              className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700"
            >
              Stop Session
            </button>
          </div>
        )}

        {processing && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-lg">Processing verification results...</p>
          </div>
        )}
      </div>
    </div>
  );
}
