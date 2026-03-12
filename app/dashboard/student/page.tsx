'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useClerk } from '@clerk/nextjs';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent';
  markedAt: string;
  teacherName: string;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  attendancePercentage: number;
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [userData, setUserData] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    attendancePercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date().toDateString());

  // Auto-refresh when day changes
  useEffect(() => {
    const checkDayChange = setInterval(() => {
      const newDate = new Date().toDateString();
      if (newDate !== currentDate) {
        console.log('📅 Day changed! Refreshing attendance data...');
        setCurrentDate(newDate);
        // Refresh attendance data
        if (userData?.id) {
          fetchAttendance(userData.id);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkDayChange);
  }, [currentDate, userData]);

  useEffect(() => {
    if (!isLoaded) {
      return; // Wait for Clerk to load
    }

    console.log('Student Dashboard - Checking authentication...');
    console.log('Clerk user:', user?.id);
    console.log('Clerk role:', user?.publicMetadata?.role);

    // Check for custom login (localStorage)
    const role = localStorage.getItem('userRole');
    const studentData = localStorage.getItem('studentData');

    if (studentData && role?.toLowerCase() === 'student') {
      // Custom login system
      console.log('Using custom login (localStorage)');
      const student = JSON.parse(studentData);
      setUserData(student);
      setAuthChecking(false);
      fetchAttendance(student.id);
      return;
    }

    // Check for Clerk authentication
    if (user) {
      const userRole = (user.publicMetadata?.role as string)?.toLowerCase();
      console.log('🔐 Clerk user detected, role:', userRole);
      
      if (userRole === 'student') {
        // User is authenticated with Clerk as a student
        console.log('Valid student role, creating user object');
        const student = {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Student',
          class: user.publicMetadata?.class || 'Not Assigned',
          rollNo: user.publicMetadata?.rollNo || 'Not Assigned',
          parentNumber: user.publicMetadata?.parentNumber || 'Not Provided',
        };
        console.log('📝 Setting user data:', student);
        setUserData(student);
        console.log('Setting authChecking to false');
        setAuthChecking(false);
        console.log('📊 Fetching attendance...');
        fetchAttendance(student.id);
        return;
      } else {
        // User is authenticated but not as a student
        console.log('❌ User role is not student:', userRole);
        router.push('/unauthorized');
        return;
      }
    }

    // No authentication found
    console.log('❌ No authentication found');
    setAuthChecking(false);
    setUserData(null);
  }, [router, user, isLoaded]);

  const fetchAttendance = async (studentId: string) => {
    try {
      setLoading(true);
      console.log('Fetching attendance for student:', studentId);
      
      const headers = {
        'x-student-id': studentId.toString(),
        'x-user-type': 'Student'
      };
      console.log('📤 Sending headers:', headers);
      
      const response = await fetch('/api/student/attendance', { headers });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Attendance data received:', data);
        setAttendanceRecords(data.records || []);
        setAttendanceStats(data.statistics || {
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          attendancePercentage: 0
        });
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch attendance:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleLogout = async () => {
    try {
      // Clear custom login data
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('studentData');
      localStorage.removeItem('teacherData');
      localStorage.removeItem('userRole');
      document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'userId=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // Sign out from Clerk if user is logged in with Clerk
      if (user) {
        await signOut();
      }
      
      // Redirect to homepage
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, try to redirect
      router.push('/');
    }
  };

  // Show loading state while checking authentication
  if (!isLoaded || authChecking) {
    console.log('🔄 Rendering loading state:', { isLoaded, authChecking });
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-700 text-lg">Loading your dashboard...</p>
          <p className="text-gray-500 text-sm mt-2">
            {!isLoaded ? 'Initializing...' : 'Checking authentication...'}
          </p>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if no user data
  if (!userData) {
    console.log('❌ Rendering sign-in prompt - no userData');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to access the student dashboard.</p>
          <div className="space-y-3">
            <a
              href="/sign-in"
              className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Sign In with Clerk
            </a>
            <a
              href="/debug-student"
              className="block w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Debug Authentication
            </a>
          </div>
        </div>
      </div>
    );
  }

  console.log('Rendering dashboard content for:', userData.name);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold mb-2 text-gray-900">Hello, {userData.name}! </h1>
                <p className="text-gray-600 text-lg mb-4">Ready to track your academic journey?</p>
                <div className="flex gap-4 text-sm">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <span className="font-semibold text-gray-700">Class:</span> <span className="text-gray-900">{userData.class}</span>
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <span className="font-semibold text-gray-700">Roll No:</span> <span className="text-gray-900">{userData.rollNo}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Attendance Overview & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Days</p>
                <p className="text-4xl font-bold text-gray-900">{attendanceStats.totalDays}</p>
              </div>
              <div className="bg-blue-100 rounded-lg p-3">
                <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Present Days</p>
                <p className="text-4xl font-bold text-gray-900">{attendanceStats.presentDays}</p>
              </div>
              <div className="bg-green-100 rounded-lg p-3">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Absent Days</p>
                <p className="text-4xl font-bold text-gray-900">{attendanceStats.absentDays}</p>
              </div>
              <div className="bg-red-100 rounded-lg p-3">
                <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Attendance Rate</p>
                <p className={`text-4xl font-bold ${
                  attendanceStats.attendancePercentage >= 75 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {attendanceStats.attendancePercentage}%
                </p>
              </div>
              <div className={`${
                attendanceStats.attendancePercentage >= 75 ? 'bg-green-100' : 'bg-red-100'
              } rounded-lg p-3`}>
                <svg className={`w-7 h-7 ${
                  attendanceStats.attendancePercentage >= 75 ? 'text-green-600' : 'text-red-600'
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Action Cards in Same Row */}
          <Link
            href="/student/mark-attendance"
            className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md hover:border-green-500 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Quick Action</p>
                <p className="text-lg font-bold text-gray-900">Mark Attendance</p>
              </div>
              <div className="bg-green-100 rounded-lg p-3 group-hover:bg-green-200 transition-colors">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </div>
            </div>
          </Link>

          <Link
            href="/attendance-history"
            className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md hover:border-blue-500 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Quick Action</p>
                <p className="text-lg font-bold text-gray-900">View History</p>
              </div>
              <div className="bg-blue-100 rounded-lg p-3 group-hover:bg-blue-200 transition-colors">
                <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Attendance Records */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-2 mr-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Recent Attendance</h2>
            </div>
            <Link
              href="/attendance-history"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
            >
              View All
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
              <p className="text-gray-500 text-lg">Loading your attendance data...</p>
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg font-medium mb-2">No attendance records yet</p>
              <p className="text-gray-500 text-sm">Your attendance will appear here once marked by teachers or via face recognition</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Marked By
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {attendanceRecords.slice(0, 5).map((record, index) => (
                    <tr key={record.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-blue-100 rounded-lg p-2 mr-3">
                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(record.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(record.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                              })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-4 py-2 inline-flex items-center text-xs font-bold rounded-full ${
                          record.status === 'present'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {record.status === 'present' ? (
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                        {record.teacherName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(record.markedAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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
