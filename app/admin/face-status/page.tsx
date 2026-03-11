'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import toast, { Toaster } from 'react-hot-toast';

interface StudentFaceStatus {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  class: string;
  faceRegistered: boolean;
  faceRegisteredAt: string | null;
  faceImages: number;
  registrationStatus: string;
}

export default function AdminFaceStatusPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [students, setStudents] = useState<StudentFaceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'registered' | 'not_registered'>('all');
  const [stats, setStats] = useState({
    totalStudents: 0,
    registeredCount: 0,
    notRegisteredCount: 0
  });

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

    fetchFaceStatus();
  }, [isLoaded, user, router]);

  const fetchFaceStatus = async () => {
    setLoading(true);
    try {
      console.log('📊 Fetching face registration status...');
      
      const response = await fetch('/api/admin/face-status');
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Face status data:', data);
        
        if (data.success) {
          setStudents(data.students);
          setStats({
            totalStudents: data.totalStudents,
            registeredCount: data.registeredCount,
            notRegisteredCount: data.notRegisteredCount
          });
          toast.success(`Loaded ${data.totalStudents} students`);
        } else {
          toast.error(data.message || 'Failed to fetch face status');
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch face status:', errorData);
        toast.error(errorData.message || 'Failed to fetch face status');
      }
    } catch (error) {
      console.error('❌ Error fetching face status:', error);
      toast.error('Error loading face registration status');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFaceStatus();
    setRefreshing(false);
  };

  const handleRemoveFaceRegistration = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove face registration for ${studentName}?`)) {
      return;
    }

    setRemovingId(studentId);
    try {
      console.log('🗑️ Removing face registration for:', studentId);
      
      const response = await fetch('/api/admin/remove-face', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || 'Face registration removed successfully');
        // Refresh the list
        await fetchFaceStatus();
      } else {
        toast.error(data.message || 'Failed to remove face registration');
      }
    } catch (error) {
      console.error('❌ Error removing face registration:', error);
      toast.error('Error removing face registration');
    } finally {
      setRemovingId(null);
    }
  };

  // Filter students based on search and status
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'registered' && student.faceRegistered) ||
      (filterStatus === 'not_registered' && !student.faceRegistered);
    
    return matchesSearch && matchesFilter;
  });

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Face Registration Status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-2xl shadow-xl p-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold mb-2">Face Registration Status 📸</h1>
                <p className="text-purple-100 text-lg">Manage student face registrations</p>
              </div>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Students</p>
                <p className="text-4xl font-bold text-blue-600">{stats.totalStudents}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Registered</p>
                <p className="text-4xl font-bold text-green-600">{stats.registeredCount}</p>
              </div>
              <div className="bg-green-100 rounded-full p-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Not Registered</p>
                <p className="text-4xl font-bold text-red-600">{stats.notRegisteredCount}</p>
              </div>
              <div className="bg-red-100 rounded-full p-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Students</label>
              <input
                type="text"
                placeholder="Search by name, email, or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-700"
              >
                <option value="all">All Students</option>
                <option value="registered">Registered Only</option>
                <option value="not_registered">Not Registered Only</option>
              </select>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Roll Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Face Registered
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-lg font-medium">No students found</p>
                        <p className="text-sm mt-1">Try adjusting your search or filter</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-purple-600 font-semibold">
                              {student.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {student.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {student.rollNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {student.class}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {student.faceRegistered ? (
                          <div className="flex flex-col items-center">
                            <span className="px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Yes
                            </span>
                            {student.faceImages > 0 && (
                              <span className="text-xs text-gray-500 mt-1">
                                {student.faceImages} images
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {student.faceRegistered ? (
                          <button
                            onClick={() => handleRemoveFaceRegistration(student.id, student.name)}
                            disabled={removingId === student.id}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {removingId === student.id ? 'Removing...' : 'Remove Registration'}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">No action needed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Count */}
        {filteredStudents.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-600">
            Showing {filteredStudents.length} of {students.length} students
          </div>
        )}
      </div>
    </div>
  );
}
