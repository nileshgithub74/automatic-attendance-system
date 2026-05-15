'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function CleanupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const checkOldImages = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/cleanup/old-images');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        toast.success(`Found ${data.count} images older than 7 days`);
      } else {
        toast.error('Failed to check images');
      }
    } catch (error) {
      console.error('Error checking images:', error);
      toast.error('Error checking images');
    } finally {
      setChecking(false);
    }
  };

  const runCleanup = async () => {
    if (!confirm('Are you sure you want to delete all images older than 7 days? This cannot be undone.')) {
      return;
    }

    setCleaning(true);
    const loadingToast = toast.loading('Deleting old images...');

    try {
      const response = await fetch('/api/cleanup/old-images', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast.dismiss(loadingToast);
        toast.success(`Cleanup completed! Deleted ${data.summary.deleted} images`);
        setStats(null);
      } else {
        toast.dismiss(loadingToast);
        toast.error('Cleanup failed');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error during cleanup:', error);
      toast.error('Error during cleanup');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Image Cleanup</h1>
            <p className="text-gray-600">Manage verification images stored in Cloudinary</p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Automatic Cleanup</h3>
              <p className="text-sm text-blue-800">
                Images older than 7 days are automatically deleted daily at 2:00 AM.
                You can also manually trigger cleanup using the button below.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
          
          <div className="space-y-4">
            <button
              onClick={checkOldImages}
              disabled={checking}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {checking ? 'Checking...' : 'Check Old Images'}
            </button>

            {stats && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">{stats.count}</span> images are older than 7 days
                </p>
                <p className="text-xs text-gray-500">
                  Cutoff date: {new Date(stats.cutoffDate).toLocaleString()}
                </p>
              </div>
            )}

            <button
              onClick={runCleanup}
              disabled={cleaning}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {cleaning ? 'Deleting...' : 'Delete Old Images Now'}
            </button>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Warning</h3>
              <p className="text-sm text-yellow-800">
                Deleted images cannot be recovered. Make sure you have backed up any important data before running cleanup.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
