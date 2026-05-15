'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import toast, { Toaster } from 'react-hot-toast';

interface ClerkUser {
  id: string;
  email: string;
  name: string;
  role: string;
  class?: string;
  rollNo?: string;
  parentNumber?: string;
}

export default function AssignClassPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<ClerkUser | null>(null);
  const [formData, setFormData] = useState({
    className: '',
    rollNo: '',
    parentNumber: '',
  });
  const [submitting, setSubmitting] = useState(false);

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

    fetchClerkUsers();
  }, [isLoaded, user, router]);

  const fetchClerkUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        // Filter only students
        const students = data.filter((u: any) => 
          (u.role || '').toLowerCase() === 'student'
        );
        setUsers(students);
        toast.success(`Loaded ${students.length} students`);
      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: ClerkUser) => {
    setSelectedUser(user);
    setFormData({
      className: user.class || '',
      rollNo: user.rollNo || '',
      parentNumber: user.parentNumber || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/assign-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Class and roll number assigned successfully!');
        fetchClerkUsers();
        setSelectedUser(null);
        setFormData({ className: '', rollNo: '', parentNumber: '' });
      } else {
        toast.error(data.error || 'Failed to assign class');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to assign class');
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">Assign Class & Roll Number</h1>
                <p className="text-gray-600">Assign class and roll number to Clerk students</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Student List */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Clerk Students</h2>
              <button
                onClick={fetchClerkUsers}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Refresh
              </button>
            </div>

            {users.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No Clerk students found</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {users.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedUser?.id === u.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{u.name}</p>
                        <p className="text-sm text-gray-600">{u.email}</p>
                        <div className="mt-2 flex gap-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            Class: {u.class || 'Not Assigned'}
                          </span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            Roll: {u.rollNo || 'N/A'}
                          </span>
                        </div>
                      </div>
                      {selectedUser?.id === u.id && (
                        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignment Form */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Assign Details</h2>

            {!selectedUser ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <p>Select a student from the list to assign class and roll number</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Selected Student:</p>
                  <p className="text-blue-800">{selectedUser.name}</p>
                  <p className="text-sm text-blue-700">{selectedUser.email}</p>
                </div>

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
                    Parent Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.parentNumber}
                    onChange={(e) => setFormData({ ...formData, parentNumber: e.target.value })}
                    placeholder="e.g., 1234567890"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Assign Class & Roll Number
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
