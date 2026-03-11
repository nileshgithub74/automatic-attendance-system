'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function DetailedReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (type && id) {
      fetchDetailedReport();
    }
  }, [type, id]);

  const fetchDetailedReport = async () => {
    setLoading(true);
    try {
      const endpoint = type === 'teacher'
        ? `/api/admin/reports/teachers?teacherId=${id}`
        : `/api/admin/reports/students?studentId=${id}`;

      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error('Error fetching detailed report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading report...</p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Report not found</p>
      </div>
    );
  }

  const isTeacher = type === 'teacher';
  const profile = isTeacher ? reportData.teacher : reportData.student;
  const stats = reportData.statistics;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Reports
        </button>

        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{profile.name}</h1>
              <p className="text-gray-600 mt-1">{profile.email}</p>
              {isTeacher ? (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">Classes: {profile.classes.join(', ') || 'N/A'}</p>
                  <p className="text-sm text-gray-500">Phone: {profile.phoneNumber || 'N/A'}</p>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">Class: {profile.class} | Roll No: {profile.rollNo}</p>
                  <p className="text-sm text-gray-500">Parent: {profile.parentNumber}</p>
                </div>
              )}
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              isTeacher ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {isTeacher ? 'Teacher' : 'Student'}
            </span>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {isTeacher ? (
            <>
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-sm text-gray-600 mb-2">Total Submissions</h3>
                <p className="text-3xl font-bold text-blue-600">{stats.totalSubmissions}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-sm text-gray-600 mb-2">Pending</h3>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendingSubmissions}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-sm text-gray-600 mb-2">Approved</h3>
                <p className="text-3xl font-bold text-green-600">{stats.approvedSubmissions}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-sm text-gray-600 mb-2">Attendance Marked</h3>
                <p className="text-3xl font-bold text-purple-600">{stats.totalAttendanceMarked}</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-sm text-gray-600 mb-2">Attendance %</h3>
                <p className={`text-3xl font-bold ${
                  stats.attendancePercentage >= 75 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.attendancePercentage}%
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-sm text-gray-600 mb-2">Present Days</h3>
                <p className="text-3xl font-bold text-green-600">{stats.presentDays}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-sm text-gray-600 mb-2">Absent Days</h3>
                <p className="text-3xl font-bold text-red-600">{stats.absentDays}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-sm text-gray-600 mb-2">Total Submissions</h3>
                <p className="text-3xl font-bold text-blue-600">{stats.totalSubmissions}</p>
              </div>
            </>
          )}
        </div>

        {/* Recent Submissions */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Submissions</h2>
          {reportData.recentSubmissions && reportData.recentSubmissions.length > 0 ? (
            <div className="space-y-4">
              {reportData.recentSubmissions.map((submission: any) => (
                <div key={submission.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{submission.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{submission.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(submission.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      submission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {submission.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No submissions yet</p>
          )}
        </div>

        {/* Attendance History (Students only) */}
        {!isTeacher && reportData.attendanceHistory && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance History</h2>
            {reportData.attendanceHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Marked By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.attendanceHistory.map((record: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {record.markedAt ? new Date(record.markedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {record.teacherName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            record.status === 'present' || record.status === 'Present'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No attendance records yet</p>
            )}
          </div>
        )}

        {/* Recent Attendance Marked (Teachers only) */}
        {isTeacher && reportData.recentAttendance && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Attendance Marked</h2>
            {reportData.recentAttendance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Student ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.recentAttendance.map((record: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.studentId || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.studentName || record.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {record.markedAt ? new Date(record.markedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            record.status === 'present' || record.status === 'Present'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No attendance records yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DetailedReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading report...</p>
      </div>
    }>
      <DetailedReportContent />
    </Suspense>
  );
}
