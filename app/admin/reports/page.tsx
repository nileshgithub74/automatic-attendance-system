'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AcademicSession {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface TeacherReport {
  id: number;
  name: string;
  email: string;
  classes: string[];
  totalSubmissions: number;
  totalAttendanceMarked: number;
  lastActivity: string;
}

interface StudentReport {
  id: number;
  name: string;
  email: string;
  class: string;
  rollNo: string;
  attendancePercentage: number;
  totalSubmissions: number;
  totalDays: number;
  presentDays: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [reportType, setReportType] = useState<'teacher' | 'student'>('student');
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [activeSession, setActiveSession] = useState<AcademicSession | null>(null);
  const [teacherReports, setTeacherReports] = useState<TeacherReport[]>([]);
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [newSession, setNewSession] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchSessions();
    fetchReports();
  }, [reportType]);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/admin/academic-sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        const active = data.find((s: AcademicSession) => s.isActive);
        setActiveSession(active || null);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const endpoint = reportType === 'teacher' 
        ? '/api/admin/reports/teachers'
        : '/api/admin/reports/students';
      
      console.log(`📊 Fetching ${reportType} reports from ${endpoint}...`);
      
      const response = await fetch(endpoint);
      console.log(`Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Received ${data.length} ${reportType} reports:`, data);
        
        if (reportType === 'teacher') {
          setTeacherReports(data);
        } else {
          setStudentReports(data);
        }
      } else {
        const errorData = await response.json();
        console.error(`❌ Error fetching reports:`, errorData);
        alert(`Error: ${errorData.error || 'Failed to fetch reports'}`);
      }
    } catch (error) {
      console.error('❌ Error fetching reports:', error);
      alert(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/academic-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSession,
          isActive: sessions.length === 0, // First session is active by default
        }),
      });

      if (response.ok) {
        alert('Academic session created successfully!');
        setShowSessionForm(false);
        setNewSession({ name: '', startDate: '', endDate: '' });
        fetchSessions();
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session');
    }
  };

  const handleSetActiveSession = async (sessionId: number) => {
    try {
      const response = await fetch('/api/admin/academic-sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        alert('Active session updated successfully!');
        fetchSessions();
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating session:', error);
      alert('Failed to update session');
    }
  };

  const viewDetailedReport = (id: number) => {
    const type = reportType === 'teacher' ? 'teacher' : 'student';
    router.push(`/admin/reports/detail?type=${type}&id=${id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">View comprehensive reports and manage academic sessions</p>
        </div>

        {/* Active Session Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Active Academic Session</h2>
              {activeSession ? (
                <div className="mt-2">
                  <p className="text-2xl font-semibold text-blue-600">{activeSession.name}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(activeSession.startDate).toLocaleDateString()} - {new Date(activeSession.endDate).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 mt-2">No active session set</p>
              )}
            </div>
            <button
              onClick={() => setShowSessionForm(!showSessionForm)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              {showSessionForm ? 'Cancel' : 'Create New Session'}
            </button>
          </div>

          {/* Create Session Form */}
          {showSessionForm && (
            <form onSubmit={handleCreateSession} className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Name</label>
                  <input
                    type="text"
                    value={newSession.name}
                    onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                    placeholder="e.g., 2024-2025"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={newSession.startDate}
                    onChange={(e) => setNewSession({ ...newSession, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={newSession.endDate}
                    onChange={(e) => setNewSession({ ...newSession, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                Create Session
              </button>
            </form>
          )}

          {/* All Sessions List */}
          {sessions.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">All Sessions:</h3>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`flex justify-between items-center p-3 rounded-lg ${
                      session.isActive ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{session.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(session.startDate).toLocaleDateString()} - {new Date(session.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    {!session.isActive && (
                      <button
                        onClick={() => handleSetActiveSession(session.id)}
                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                      >
                        Set Active
                      </button>
                    )}
                    {session.isActive && (
                      <span className="px-3 py-1 text-sm bg-green-600 text-white rounded">Active</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Report Type Selector */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">View Reports</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setReportType('student')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                reportType === 'student'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Student Reports
            </button>
            <button
              onClick={() => setReportType('teacher')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                reportType === 'teacher'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Teacher Reports
            </button>
          </div>
        </div>

        {/* Reports Table */}
        {reportType === 'teacher' ? (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Teacher Reports</h2>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mb-4"></div>
                <p className="text-gray-500">Loading reports...</p>
              </div>
            ) : teacherReports.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-xl text-gray-600 font-medium mb-2">No Teacher Reports Available</p>
                <p className="text-sm text-gray-500 mb-4">There are no teachers in the system yet.</p>
                <a href="/admin/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
                  Go to Dashboard to Add Teachers →
                </a>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submissions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance Marked</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teacherReports.map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {teacher.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {teacher.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {teacher.classes.join(', ') || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {teacher.totalSubmissions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {teacher.totalAttendanceMarked}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => viewDetailedReport(teacher.id)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Details →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Student Reports - By Class</h2>
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
                  <p className="text-gray-500">Loading reports...</p>
                </div>
              ) : studentReports.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-xl text-gray-600 font-medium mb-2">No Student Reports Available</p>
                  <p className="text-sm text-gray-500 mb-4">There are no students in the system yet.</p>
                  <a href="/admin/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
                    Go to Dashboard to Add Students →
                  </a>
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    // Group students by class
                    const studentsByClass = studentReports.reduce((acc, student) => {
                      if (!acc[student.class]) {
                        acc[student.class] = [];
                      }
                      acc[student.class].push(student);
                      return acc;
                    }, {} as Record<string, StudentReport[]>);

                    const classes = Object.keys(studentsByClass).sort();

                    return classes.map((className) => {
                      const classStudents = studentsByClass[className];
                      const avgAttendance = Math.round(
                        classStudents.reduce((sum, s) => sum + s.attendancePercentage, 0) / classStudents.length
                      );
                      const totalPresent = classStudents.reduce((sum, s) => sum + s.presentDays, 0);
                      const totalDays = classStudents.reduce((sum, s) => sum + s.totalDays, 0);

                      return (
                        <div key={className} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                          {/* Class Header */}
                          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <h3 className="text-xl font-bold text-white">{className}</h3>
                                <p className="text-indigo-100 text-sm">
                                  {classStudents.length} students
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-indigo-100 text-sm">Average Attendance</p>
                                <p className="text-3xl font-bold text-white">{avgAttendance}%</p>
                              </div>
                            </div>
                          </div>

                          {/* Students Table */}
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Roll No</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Attendance %</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Present/Total</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {classStudents
                                  .sort((a, b) => {
                                    const rollA = parseInt(a.rollNo) || 0;
                                    const rollB = parseInt(b.rollNo) || 0;
                                    return rollA - rollB;
                                  })
                                  .map((student) => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {student.rollNo}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {student.name}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                          student.attendancePercentage >= 75
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                          {student.attendancePercentage}%
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {student.presentDays}/{student.totalDays}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button
                                          onClick={() => viewDetailedReport(student.id)}
                                          className="text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                          View Details →
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
