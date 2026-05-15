'use client';

import { useUser } from '@clerk/nextjs';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetAdminRolePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const setAdminRole = async () => {
    if (!user) return;
    
    setLoading(true);
    setMessage('Setting admin role...');

    try {
      // Call API to update user metadata
      const response = await fetch('/api/user/update-role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          newRole: 'Principal'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Admin role set successfully! Redirecting...');
        
        // Wait a moment for Clerk to sync
        setTimeout(() => {
          window.location.href = '/admin/dashboard';
        }, 2000);
      } else {
        setMessage('❌ Failed to set admin role. Error: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error setting role:', error);
      setMessage('❌ Failed to set admin role. Error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Please sign in first</p>
          <a href="/sign-in" className="px-6 py-3 bg-blue-600 text-white rounded-lg">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const currentRole = user.publicMetadata?.role as string;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Set Admin Role</h1>
        
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700 mb-2"><strong>Email:</strong> {user.emailAddresses[0]?.emailAddress}</p>
          <p className="text-sm text-gray-700"><strong>Current Role:</strong> {currentRole || 'Not set'}</p>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.includes('successfully') ? 'bg-green-50 text-green-800' : 
            message.includes('failed') ? 'bg-red-50 text-red-800' : 
            'bg-blue-50 text-blue-800'
          }`}>
            {message}
          </div>
        )}

        <button
          onClick={setAdminRole}
          disabled={loading || currentRole === 'Principal'}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Setting Role...' : currentRole === 'Principal' ? 'Already Admin' : 'Set as Admin (Principal)'}
        </button>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This will set your role to "Principal" which gives you full admin access to the system.
          </p>
        </div>

        <div className="mt-4 text-center">
          <a href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm">
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
