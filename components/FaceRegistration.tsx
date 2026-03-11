'use client';

import { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';

interface FaceRegistrationProps {
  studentId: string;
  onComplete?: () => void;
}

export default function FaceRegistration({ studentId, onComplete }: FaceRegistrationProps) {
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const requiredImages = 5;

  // Capture image from webcam
  const captureImage = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    
    if (imageSrc) {
      setCapturedImages([...capturedImages, imageSrc]);
      toast.success(`Image ${capturedImages.length + 1}/${requiredImages} captured`);
    } else {
      toast.error('Failed to capture image');
    }
  };

  // Remove captured image
  const removeImage = (index: number) => {
    setCapturedImages(capturedImages.filter((_, i) => i !== index));
  };

  // Upload images and register face
  const registerFace = async () => {
    if (capturedImages.length < 3) {
      toast.error('Please capture at least 3 images');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('studentId', studentId);

      // Convert base64 images to blobs
      for (let i = 0; i < capturedImages.length; i++) {
        const blob = await fetch(capturedImages[i]).then(r => r.blob());
        formData.append('images', blob, `face_${i + 1}.jpg`);
      }

      const response = await fetch('/api/face/register', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Face registered successfully!');
        setCapturedImages([]);
        onComplete?.();
      } else {
        toast.error(data.error || 'Failed to register face');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register face');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="face-registration max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Register Your Face</h2>
        
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
            <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
              <li>Capture {requiredImages} clear photos of your face</li>
              <li>Ensure good lighting and face the camera directly</li>
              <li>Remove glasses or masks if possible</li>
              <li>Try different angles (front, slight left, slight right)</li>
              <li>Keep a neutral expression</li>
            </ul>
          </div>
        </div>

        {/* Camera Section */}
        <div className="mb-6">
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
            
            {/* Face guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-80 border-4 border-white rounded-full opacity-50" />
            </div>
          </div>

          <button
            onClick={captureImage}
            disabled={capturedImages.length >= requiredImages}
            className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {capturedImages.length >= requiredImages 
              ? 'Maximum images captured' 
              : `Capture Image (${capturedImages.length}/${requiredImages})`
            }
          </button>
        </div>

        {/* Captured Images Grid */}
        {capturedImages.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Captured Images:</h3>
            <div className="grid grid-cols-3 gap-4">
              {capturedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Captured ${index + 1}`}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                    Image {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setCapturedImages([])}
            disabled={capturedImages.length === 0 || uploading}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
          
          <button
            onClick={registerFace}
            disabled={capturedImages.length < 3 || uploading}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Registering...
              </span>
            ) : (
              `Register Face (${capturedImages.length} images)`
            )}
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>{capturedImages.length}/{requiredImages} images</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(capturedImages.length / requiredImages) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
