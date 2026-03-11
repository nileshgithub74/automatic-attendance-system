'use client';

import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

export default function Capture() {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImgSrc(imageSrc);
      console.log('Image captured:', imageSrc);
    }
  }, [webcamRef]);

  const startCamera = () => {
    setIsCameraOn(true);
  };

  

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: 'user',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Capture Attendance</h1>
        <p className="mt-2 text-gray-600">Capture and record attendance</p>
        
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <div className="text-center">
            {!isCameraOn ? (
              <div>
                <div className="mx-auto flex items-center justify-center h-48 w-48 rounded-full bg-gray-200 mb-6">
                  <svg
                    className="h-24 w-24 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <button
                  onClick={startCamera}
                  className="w-full sm:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  Start Camera
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    className="rounded-lg max-w-full h-auto"
                  />
                </div>
                {imgSrc && (
                  <div className="mt-4">
                    <img src={imgSrc} alt="captured" className="mx-auto rounded-lg max-w-full h-auto" />
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={capture}
                    className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    Capture Image
                  </button>
                  <button
                    onClick={() => {
                      setIsCameraOn(false);
                      setImgSrc(null);
                    }}
                    className="px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    Stop Camera
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Face recognition coming soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

