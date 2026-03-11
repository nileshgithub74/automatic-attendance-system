'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import toast, { Toaster } from 'react-hot-toast';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [synced, setSynced] = useState(false);
  const [formData, setFormData] = useState({
    className: '',
    rollNo: '',
    parentNumber: '',
    subjects: '',
  });

  const role = (user?.publicMetadata?.role as string)?.toLowerCase() || 'student';

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    checkSyncStatus();
  }, [isLoaded, user, router]);

  const checkSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync-clerk-user');
      const data = await response.json();

      if (data.synced) {
        setSynced(true);
        toast.success('Profile already complete!');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking sync status:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/sync-clerk-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Profile completed successfully!');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        toast.error(data.error || 'Failed to complete profile');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to complete profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (synced) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-gray-700">Profile Complete!</p>
          <p className="text-gray-600 mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <Toaster position="top-right" />
      
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
            <p className="text-gray-600">
              Welcome, {user?.firstName}! Please provide additional information to complete your profile.
            </p>
            <div className="mt-4 inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Role: {role.charAt(0).toUpperCase() + role.slice(1)}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {role === 'student' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    placeholder="e.g., 10A, 12B"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Roll Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.rollNo}
                    onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                    placeholder="e.g., 101, 202"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parent Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.parentNumber}
                    onChange={(e) => setFormData({ ...formData, parentNumber: e.target.value })}
                    placeholder="e.g., 1234567890"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            {role === 'teacher' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subjects (comma-separated) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.subjects}
                  onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                  placeholder="e.g., Math, Science, English"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter subjects separated by commas
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-lg flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                  Completing Profile...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete Profile
                </>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This information is required to use the attendance system. 
              You'll be assigned a numeric ID automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
