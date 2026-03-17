'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import toast, { Toaster } from 'react-hot-toast';

interface StudentData {
  userId: string;
  userName: string;
  email: string;
  rollNo: string;
  class: string;
  attendanceStatus?: 'present' | 'absent';
  attendanceTime?: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
    deviceInfo?: {
      userAgent: string;
      platform: string;
      deviceId: string;
    };
  };
  network?: {
    ipAddress: string;
    latency: number;
    jitter: number;
    isVPN: boolean;
    isProxy: boolean;
    country: string;
    city: string;
    isp: string;
    riskScore: number;
    timestamp: Date;
  };
  session?: {
    sessionId: string;
    status: string;
    startTime: Date;
    lastActivity: Date;
  };
}

interface AttendanceSession {
  _id: string;
  date: string;
  className: string;
  teacherName: string;
  createdAt: Date;
  studentsPresent: string[];
  studentsAbsent: string[];
}

export default function VerificationMonitorPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [viewMode, setViewMode] = useState<'students' | 'sessions'>('students');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    const role = user?.publicMetadata?.role as string;
    if (!role || (role.toLowerCase() !== 'admin' && role.toLowerCase() !== 'principal' && role.toLowerCase() !== 'teacher')) {
      toast.error('Access denied. Admin, Principal, or Teacher access required.');
      router.push('/unauthorized');
      return;
    }

    fetchStudentData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStudentData, 30000);
    return () => clearInterval(interval);
  }, [isLoaded, user, router]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // Fetch students
      const studentsRes = await fetch('/api/admin/students');
      if (!studentsRes.ok) throw new Error('Failed to fetch students');
      
      const studentsData = await studentsRes.json();
      
      // Fetch attendance sessions
      const attendanceRes = await fetch('/api/admin/attendance');
      const attendanceData = attendanceRes.ok ? await attendanceRes.json() : { records: [] };
      
      // Fetch location logs
      const locationRes = await fetch('/api/admin/verification/location-logs');
      const locationData = locationRes.ok ? await locationRes.json() : { logs: [] };
      
      // Fetch network logs
      const networkRes = await fetch('/api/admin/verification/network-logs');
      const networkData = networkRes.ok ? await networkRes.json() : { logs: [] };

      // Group attendance by date and class to create sessions
      const sessionsMap = new Map<string, AttendanceSession>();
      
      if (attendanceData.records) {
        attendanceData.records.forEach((record: any) => {
          const dateKey = new Date(record.date).toDateString();
          const className = record.class || record.className || 'Unknown';
          const sessionKey = `${dateKey}-${className}`;
          
          if (!sessionsMap.has(sessionKey)) {
            sessionsMap.set(sessionKey, {
              _id: sessionKey,
              date: dateKey,
              className: className,
              teacherName: record.markedBy || 'System',
              createdAt: new Date(record.date),
              studentsPresent: [],
              studentsAbsent: []
            });
          }
          
          const session = sessionsMap.get(sessionKey)!;
          if (record.status === 'present') {
            session.studentsPresent.push(record.studentId);
          } else {
            session.studentsAbsent.push(record.studentId);
          }
        });
      }
      
      setSessions(Array.from(sessionsMap.values()).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));

      // Combine data
      const combinedData: StudentData[] = studentsData.map((student: any) => {
        const locationLog = locationData.logs?.find((log: any) => log.userId === student.id);
        const networkLog = networkData.logs?.find((log: any) => log.userId === student.id);
        
        // Find today's attendance
        const todayAttendance = attendanceData.records?.find((record: any) => 
          record.studentId === student.id && 
          new Date(record.date).toDateString() === new Date().toDateString()
        );

        return {
          userId: student.id,
          userName: student.name,
          email: student.email || '',
          rollNo: student.rollNo || student.rollNumber || 'N/A',
          class: student.class || 'Not Assigned',
          attendanceStatus: todayAttendance?.status,
          attendanceTime: todayAttendance?.timestamp ? new Date(todayAttendance.timestamp) : undefined,
          location: locationLog ? {
            latitude: locationLog.location.latitude,
            longitude: locationLog.location.longitude,
            accuracy: locationLog.location.accuracy,
            timestamp: locationLog.timestamp,
            deviceInfo: locationLog.deviceInfo
          } : undefined,
          network: networkLog ? {
            ipAddress: networkLog.ipAddress,
            latency: networkLog.latency,
            jitter: networkLog.jitter,
            isVPN: networkLog.isVPN,
            isProxy: networkLog.isProxy,
            country: networkLog.country,
            city: networkLog.city,
            isp: networkLog.isp,
            riskScore: networkLog.riskScore,
            timestamp: networkLog.timestamp
          } : undefined,
          session: undefined
        };
      });

      setStudents(combinedData);
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = viewMode === 'students' 
    ? students.filter(student =>
        student.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.class.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : selectedSession
    ? students.filter(student => 
        selectedSession.studentsPresent.includes(student.userId) ||
        selectedSession.studentsAbsent.includes(student.userId)
      ).filter(student =>
        student.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.rollNo.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const getSessionStudents = (session: AttendanceSession) => {
    return students.filter(s => 
      session.studentsPresent.includes(s.userId) || 
      session.studentsAbsent.includes(s.userId)
    );
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-gray-900 mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Monitoring Dashboard...</p>
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
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">Verification Monitoring Dashboard</h1>
                <p className="text-gray-600">Monitor student locations, sessions, and network security</p>
              </div>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-600">Total Students: <span className="font-semibold text-gray-900">{students.length}</span></span>
              <span className="text-gray-600">With Location: <span className="font-semibold text-gray-900">{students.filter(s => s.location).length}</span></span>
              <span className="text-gray-600">VPN Detected: <span className="font-semibold text-red-600">{students.filter(s => s.network?.isVPN).length}</span></span>
              <span className="text-gray-600">High Risk: <span className="font-semibold text-orange-600">{students.filter(s => s.network && s.network.riskScore >= 70).length}</span></span>
              <span className="text-gray-600">Sessions: <span className="font-semibold text-gray-900">{sessions.length}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    setViewMode('students');
                    setSelectedSession(null);
                    setSearchTerm('');
                  }}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'students'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All Students
                </button>
                <button
                  onClick={() => {
                    setViewMode('sessions');
                    setSelectedStudent(null);
                    setSearchTerm('');
                  }}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'sessions'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sessions
                </button>
              </div>
              <button
                onClick={fetchStudentData}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Students or Sessions List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  {viewMode === 'students' ? 'Students' : selectedSession ? `${selectedSession.className} - ${selectedSession.date}` : 'Attendance Sessions'}
                </h2>
                <input
                  type="text"
                  placeholder={viewMode === 'students' ? 'Search students...' : 'Search...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                />
              </div>

              <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {viewMode === 'students' ? (
                  // Students List
                  filteredStudents.length === 0 ? (
                    <p className="text-center text-gray-500 py-8 text-sm">No students found</p>
                  ) : (
                    filteredStudents.map((student) => (
                      <button
                        key={student.userId}
                        onClick={() => setSelectedStudent(student)}
                        className={`w-full text-left p-4 transition-colors ${
                          selectedStudent?.userId === student.userId
                            ? 'bg-gray-100'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{student.userName}</p>
                            <p className="text-sm text-gray-600">{student.rollNo} • {student.class}</p>
                          </div>
                          <div className="flex flex-col gap-1 ml-2">
                            {student.attendanceStatus === 'present' && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded whitespace-nowrap">Present</span>
                            )}
                            {student.location && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded whitespace-nowrap">Location</span>
                            )}
                            {student.network?.isVPN && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded whitespace-nowrap">VPN</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )
                ) : selectedSession ? (
                  // Students in Selected Session
                  filteredStudents.length === 0 ? (
                    <p className="text-center text-gray-500 py-8 text-sm">No students in this session</p>
                  ) : (
                    <>
                      <div className="p-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Present: <span className="font-semibold text-green-600">{selectedSession.studentsPresent.length}</span></span>
                          <span className="text-gray-600">Absent: <span className="font-semibold text-red-600">{selectedSession.studentsAbsent.length}</span></span>
                        </div>
                      </div>
                      {filteredStudents.map((student) => {
                        const isPresent = selectedSession.studentsPresent.includes(student.userId);
                        return (
                          <button
                            key={student.userId}
                            onClick={() => setSelectedStudent(student)}
                            className={`w-full text-left p-4 transition-colors ${
                              selectedStudent?.userId === student.userId
                                ? 'bg-gray-100'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{student.userName}</p>
                                <p className="text-sm text-gray-600">{student.rollNo} • {student.class}</p>
                              </div>
                              <span className={`px-2 py-0.5 text-xs rounded whitespace-nowrap ${
                                isPresent 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {isPresent ? 'Present' : 'Absent'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )
                ) : (
                  // Sessions List
                  sessions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8 text-sm">No sessions found</p>
                  ) : (
                    sessions.map((session) => (
                      <button
                        key={session._id}
                        onClick={() => {
                          setSelectedSession(session);
                          setSelectedStudent(null);
                        }}
                        className="w-full text-left p-4 hover:bg-gray-50 transition-colors border-b border-gray-200 last:border-b-0"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{session.className}</p>
                            <p className="text-sm text-gray-600">{session.date}</p>
                            <p className="text-xs text-gray-500 mt-1">By {session.teacherName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-green-600">{session.studentsPresent.length} Present</p>
                            <p className="text-sm font-semibold text-red-600">{session.studentsAbsent.length} Absent</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )
                )}
              </div>
            </div>
          </div>

          {/* Student Details */}
          <div className="lg:col-span-2">
            {!selectedStudent ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-xl text-gray-600">Select a student to view details</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Student Info */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium text-gray-900">{selectedStudent.userName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Roll Number</p>
                      <p className="font-medium text-gray-900">{selectedStudent.rollNo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Class</p>
                      <p className="font-medium text-gray-900">{selectedStudent.class}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900 text-sm">{selectedStudent.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Location Data */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Tracking</h3>
                  {selectedStudent.location ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Latitude</p>
                          <p className="font-mono text-sm text-gray-900">{selectedStudent.location.latitude.toFixed(6)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Longitude</p>
                          <p className="font-mono text-sm text-gray-900">{selectedStudent.location.longitude.toFixed(6)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Accuracy</p>
                          <p className="font-medium text-gray-900">±{Math.round(selectedStudent.location.accuracy)}m</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Last Updated</p>
                          <p className="font-medium text-gray-900 text-sm">
                            {new Date(selectedStudent.location.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {selectedStudent.location.deviceInfo && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-600 mb-2">Device Information</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Platform</p>
                              <p className="text-sm font-medium text-gray-900">{selectedStudent.location.deviceInfo.platform}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Device ID</p>
                              <p className="text-sm font-mono text-gray-900">{selectedStudent.location.deviceInfo.deviceId?.slice(0, 16)}...</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No location data available</p>
                  )}
                </div>

                {/* Network Data */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Security</h3>
                  {selectedStudent.network ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">IP Address</p>
                          <p className="font-mono text-sm text-gray-900">{selectedStudent.network.ipAddress}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Location</p>
                          <p className="font-medium text-gray-900">{selectedStudent.network.city}, {selectedStudent.network.country}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ISP</p>
                          <p className="font-medium text-gray-900">{selectedStudent.network.isp}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Latency</p>
                          <p className="font-medium text-gray-900">{selectedStudent.network.latency}ms</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Jitter</p>
                          <p className="font-medium text-gray-900">{selectedStudent.network.jitter}ms</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Risk Score</p>
                          <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                            selectedStudent.network.riskScore >= 70 ? 'bg-red-100 text-red-800' :
                            selectedStudent.network.riskScore >= 40 ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {selectedStudent.network.riskScore}/100
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600 mb-2">Security Flags</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedStudent.network.isVPN && (
                            <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded">VPN Detected</span>
                          )}
                          {selectedStudent.network.isProxy && (
                            <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded">Proxy Detected</span>
                          )}
                          {!selectedStudent.network.isVPN && !selectedStudent.network.isProxy && selectedStudent.network.riskScore < 40 && (
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded">Secure Connection</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">Last checked: {new Date(selectedStudent.network.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No network data available</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
