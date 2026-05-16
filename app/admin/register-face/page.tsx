'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Webcam from 'react-webcam';
import toast, { Toaster } from 'react-hot-toast';
import { getStudentIds } from '@/lib/idConverter';

interface Student {
  id: string;
  name: string;
  email: string;
  rollNo: string;
  class: string;
  faceRegistered: boolean;
}

export default function AdminRegisterFacePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const webcamRef = useRef<Webcam>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const REQUIRED_IMAGES = 5;

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    const role = user?.publicMetadata?.role as string;
    if (role !== 'admin' && role !== 'Admin' && role !== 'principal' && role !== 'Principal') {
      router.push('/unauthorized');
      return;
    }

    fetchStudents();
  }, [isLoaded, user, router]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/students/get');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.students) {
          setStudents(data.students);
          toast.success(`Loaded ${data.students.length} students`);
        }
      } else {
        toast.error('Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Error loading students');
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
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }

    if (capturedImages.length < REQUIRED_IMAGES) {
      toast.error(`Please capture exactly ${REQUIRED_IMAGES} images`);
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Registering face...');

    try {
      const ids = getStudentIds(selectedStudent.id);
      
      const response = await fetch('/api/student/face-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: ids.stringId,
          studentName: selectedStudent.name,
          images: capturedImages,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.dismiss(loadingToast);
        toast.success(`Face ${data.isUpdate ? 'updated' : 'registered'} successfully for ${selectedStudent.name}!`);
        
        // Clear form
        setCapturedImages([]);
        setSelectedStudent(null);
        
        // Force refresh students list with a small delay to ensure DB update is complete
        setTimeout(async () => {
          await fetchStudents();
          toast.success('Student list refreshed!');
        }, 1000);
      } else {
        toast.dismiss(loadingToast);
        toast.error(data.message || 'Registration failed');
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Error:', error);
      toast.error('Failed to register face. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">Register Student Face</h1>
                <p className="text-gray-600">Capture and register student faces for attendance</p>
              </div>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Student Selection */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Select Student</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose Student
              </label>
              <select
                value={selectedStudent?.id || ''}
                onChange={(e) => {
                  const student = students.find(s => s.id === e.target.value);
                  setSelectedStudent(student || null);
                  setCapturedImages([]);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
              >
                <option value="" className="text-gray-500">-- Select a student --</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} - {student.rollNo} ({student.class})
                    {student.faceRegistered ? ' (Registered)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedStudent && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Selected Student:</h3>
                <p className="text-sm text-blue-800"><strong>Name:</strong> {selectedStudent.name}</p>
                <p className="text-sm text-blue-800"><strong>Roll:</strong> {selectedStudent.rollNo}</p>
                <p className="text-sm text-blue-800"><strong>Class:</strong> {selectedStudent.class}</p>
                <p className="text-sm text-blue-800">
                  <strong>Status:</strong> {selectedStudent.faceRegistered ? 'Already Registered' : 'Not Registered'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Camera and Capture Section */}
        {selectedStudent && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Camera */}
            <div className="bg-white rounded-xl shadow-md p-6">
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

              <button
                onClick={captureImage}
                disabled={capturedImages.length >= REQUIRED_IMAGES || isSubmitting}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                Capture Image ({capturedImages.length}/{REQUIRED_IMAGES})
              </button>

              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Tips:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Ensure good lighting</li>
                  <li>• Student should look at camera</li>
                  <li>• Capture from different angles</li>
                  <li>• Remove glasses if possible</li>
                  <li>• Keep neutral expression</li>
                </ul>
              </div>
            </div>

            {/* Captured Images */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Captured Images ({capturedImages.length}/{REQUIRED_IMAGES})
              </h2>

              {capturedImages.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500">No images captured yet</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {capturedImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`Captured ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
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
                        Register Face for {selectedStudent?.name}
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
        )}

        {/* Students List */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">All Students</h2>
            <button
              onClick={fetchStudents}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Refresh
            </button>
          </div>

          {students.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No students found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Roll No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Class</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Face Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.id} className={`hover:bg-gray-50 ${selectedStudent?.id === student.id ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4 text-sm text-gray-900">{student.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{student.rollNo}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{student.class}</td>
                      <td className="px-6 py-4 text-center">
                        {student.faceRegistered ? (
                          <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Registered
                          </span>
                        ) : (
                          <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Not Registered
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setCapturedImages([]);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                        >
                          {student.faceRegistered ? 'Re-register' : 'Register'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
