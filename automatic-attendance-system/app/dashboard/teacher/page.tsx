'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import toast, { Toaster } from 'react-hot-toast';

interface Student {
  _id: string;
  id: number;
  name: string;
  rollNo?: string;
  class: string;
  parentNumber?: string;
}

interface AttendanceRecord {
  studentId: number;
  status: 'present' | 'absent';
}

interface AttendanceHistory {
  _id: string;
  studentId: number;
  status: 'present' | 'absent';
  date: string;
  teacherId: string;
  teacherName: string;
  markedAt: string;
  method?: string;
  markedBy?: string;
  studentName?: string;
  class?: string;
  rollNo?: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Map<number, 'present' | 'absent'>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [activeTab, setActiveTab] = useState<'mark' | 'reports' | 'faceRecognition' | 'monitor'>('mark');
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [faceRecognitionRecords, setFaceRecognitionRecords] = useState<any[]>([]);
  const [loadingFaceRecords, setLoadingFaceRecords] = useState(false);
  const [showLast7Days, setShowLast7Days] = useState(false);
  const [hasMarkedToday, setHasMarkedToday] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date().toDateString());
  const [selectedReportClass, setSelectedReportClass] = useState<string | null>(null);

  // Auto-refresh when day changes
  useEffect(() => {
    const checkDayChange = setInterval(() => {
      const newDate = new Date().toDateString();
      if (newDate !== currentDate) {
        console.log('📅 Day changed! Refreshing teacher dashboard...');
        setCurrentDate(newDate);
        setHasMarkedToday(false); // Reset marked status for new day
        setReportDate(new Date().toISOString().split('T')[0]); // Update report date
        checkTodayAttendance(); // Check if already marked today
        if (activeTab === 'reports') {
          fetchAttendanceHistory();
        } else if (activeTab === 'faceRecognition') {
          fetchFaceRecognitionRecords();
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkDayChange);
  }, [currentDate, activeTab]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    const role = user?.publicMetadata?.role as string;
    if (role !== 'Teacher' && role !== 'teacher') {
      router.push('/unauthorized');
      return;
    }

    fetchStudents();
    checkTodayAttendance();
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchAttendanceHistory();
    } else if (activeTab === 'faceRecognition') {
      fetchFaceRecognitionRecords();
      
      // Auto-refresh face recognition records every 30 seconds
      const interval = setInterval(() => {
        fetchFaceRecognitionRecords();
      }, 30000); // 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [activeTab, reportDate, showLast7Days]);

  const checkTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/attendance?date=${today}`);
      
      if (response.ok) {
        const data = await response.json();
        // Check if teacher has already marked attendance today
        const teacherMarkedRecords = data.filter((record: any) => 
          record.teacherId === user?.id && 
          record.teacherName && 
          !record.method?.includes('face')
        );
        
        if (teacherMarkedRecords.length > 0) {
          setHasMarkedToday(true);
          toast.success('You have already marked attendance for today');
        }
      }
    } catch (error) {
      console.error('Error checking today attendance:', error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      console.log('📚 Fetching students from /api/students/get...');
      
      const response = await fetch('/api/students/get');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched students:', data);
        
        if (data.success && data.students) {
          // Convert the students to the format expected by the component
          const formattedStudents = data.students.map((s: any) => ({
            _id: s.id,
            id: parseInt(s.id) || Math.random(),
            name: s.name,
            rollNo: s.rollNo,
            class: s.class,
            parentNumber: s.parentNumber
          }));
          setStudents(formattedStudents);
          toast.success(`Loaded ${formattedStudents.length} students`);
        } else {
          console.error('Invalid response format:', data);
          toast.error('Invalid response from server');
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch students:', errorData);
        toast.error(errorData.message || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('❌ Error fetching students:', error);
      toast.error('Error loading students');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/attendance?date=${reportDate}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Attendance history data:', data);
        setAttendanceHistory(data);
      } else {
        toast.error('Failed to fetch attendance history');
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      toast.error('Error loading attendance history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchFaceRecognitionRecords = async () => {
    setLoadingFaceRecords(true);
    try {
      let allFaceRecords: any[] = [];
      
      if (showLast7Days) {
        // Fetch records for the last 7 days
        const promises = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateString = date.toISOString().split('T')[0];
          promises.push(fetch(`/api/attendance?date=${dateString}`));
        }
        
        const responses = await Promise.all(promises);
        const dataPromises = responses.map(response => response.ok ? response.json() : []);
        const allData = await Promise.all(dataPromises);
        
        // Combine all records
        const combinedRecords = allData.flat();
        console.log('All attendance records (7 days):', combinedRecords);
        
        // Filter only face recognition records
        allFaceRecords = combinedRecords.filter((record: any) => {
          const isFaceRecognition = 
            record.method === 'face_recognition' || 
            record.method === 'Face Recognition' ||
            record.method === 'ai_face_recognition' ||
            record.method === 'real_ai_face_recognition' ||
            (record.markedBy && (
              record.markedBy.toLowerCase().includes('face') ||
              record.markedBy.toLowerCase().includes('self') ||
              record.markedBy.toLowerCase().includes('ai') ||
              record.markedBy === 'Self (Face Recognition)' ||
              record.markedBy === 'AI Face Recognition System'
            )) ||
            (record.teacherName && (
              record.teacherName.toLowerCase().includes('face') ||
              record.teacherName.toLowerCase().includes('self') ||
              record.teacherName.toLowerCase().includes('ai')
            )) ||
            record.aiVerified === true;
          
          return isFaceRecognition;
        });
        
        // Sort by date (newest first)
        allFaceRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
      } else {
        // Fetch records for single date
        const response = await fetch(`/api/attendance?date=${reportDate}`);
        if (response.ok) {
          const data = await response.json();
          console.log('All attendance records:', data);
          
          // Filter only face recognition records
          allFaceRecords = data.filter((record: any) => {
            const isFaceRecognition = 
              record.method === 'face_recognition' || 
              record.method === 'Face Recognition' ||
              record.method === 'ai_face_recognition' ||
              record.method === 'real_ai_face_recognition' ||
              (record.markedBy && (
                record.markedBy.toLowerCase().includes('face') ||
                record.markedBy.toLowerCase().includes('self') ||
                record.markedBy.toLowerCase().includes('ai') ||
                record.markedBy === 'Self (Face Recognition)' ||
                record.markedBy === 'AI Face Recognition System'
              )) ||
              (record.teacherName && (
                record.teacherName.toLowerCase().includes('face') ||
                record.teacherName.toLowerCase().includes('self') ||
                record.teacherName.toLowerCase().includes('ai')
              )) ||
              record.aiVerified === true;
            
            console.log('Record:', record.studentName, 'markedBy:', record.markedBy, 'method:', record.method, 'teacherName:', record.teacherName, 'isFace:', isFaceRecognition);
            return isFaceRecognition;
          });
        } else {
          toast.error('Failed to fetch face recognition records');
        }
      }
      
      console.log('Filtered face recognition records:', allFaceRecords);
      setFaceRecognitionRecords(allFaceRecords);
      
    } catch (error) {
      console.error('Error fetching face recognition records:', error);
      toast.error('Error loading face recognition records');
    } finally {
      setLoadingFaceRecords(false);
    }
  };

  const handleSubmitAttendance = async () => {
    if (attendance.size === 0) {
      toast.error('Please mark attendance for at least one student');
      return;
    }

    setSubmitting(true);
    try {
      const attendanceRecords: AttendanceRecord[] = Array.from(attendance.entries()).map(
        ([studentId, status]) => ({
          studentId,
          status,
        })
      );

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          records: attendanceRecords,
          teacherId: user?.id,
        }),
      });

      if (response.ok) {
        toast.success('Attendance submitted successfully!');
        setAttendance(new Map());
        setHasMarkedToday(true);
        // Switch to reports tab to show the submitted attendance
        setActiveTab('reports');
        setReportDate(selectedDate);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to submit attendance');
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      toast.error('Failed to submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Student ID', 'Name', 'Roll No', 'Class', 'Status'].join(','),
      ...Array.from(attendance.entries()).map(([studentId, status]) => {
        const student = students.find(s => s.id === studentId);
        return [
          studentId,
          student?.name || '',
          student?.rollNo || '',
          student?.class || '',
          status,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedDate}.csv`;
    a.click();
    toast.success('Attendance exported successfully!');
  };

  const markClassPresent = (className: string) => {
    const newAttendance = new Map(attendance);
    const classStudents = students.filter(s => s.class === className);
    classStudents.forEach(student => {
      newAttendance.set(student.id, 'present');
    });
    setAttendance(newAttendance);
    toast.success(`All students in ${className} marked present`);
  };

  const markClassAbsent = (className: string) => {
    const newAttendance = new Map(attendance);
    const classStudents = students.filter(s => s.class === className);
    classStudents.forEach(student => {
      newAttendance.set(student.id, 'absent');
    });
    setAttendance(newAttendance);
    toast.success(`All students in ${className} marked absent`);
  };

  const clearAttendance = () => {
    setAttendance(new Map());
    toast.success('Attendance cleared');
  };

  const uniqueClasses = [...new Set(students.map(s => s.class))].sort();
  
  // Group students by class
  const studentsByClass = uniqueClasses.reduce((acc, className) => {
    acc[className] = students.filter(s => s.class === className).sort((a, b) => {
      const rollA = parseInt(a.rollNo || '0');
      const rollB = parseInt(b.rollNo || '0');
      return rollA - rollB;
    });
    return acc;
  }, {} as Record<string, Student[]>);

  const filteredClasses = selectedClass ? [selectedClass] : uniqueClasses;

  const presentCount = Array.from(attendance.values()).filter(s => s === 'present').length;
  const absentCount = Array.from(attendance.values()).filter(s => s === 'absent').length;
  const totalStudents = selectedClass ? studentsByClass[selectedClass]?.length || 0 : students.length;

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Teacher Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">Hello, {user?.firstName}!</h1>
                <p className="text-gray-600 mb-4">Ready to mark today's attendance?</p>
                <div className="flex gap-4 text-sm">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <span className="font-semibold text-gray-700">Date:</span> <span className="text-gray-600">{new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <span className="font-semibold text-gray-700">Classes:</span> <span className="text-gray-600">{uniqueClasses.length}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push('/dashboard/teacher/verification')}
                  className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium shadow-sm hover:shadow transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Start AI Verification
                </button>
                <p className="text-xs text-gray-500 text-center">Check if students are in class</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Total Students</p>
                <p className="text-2xl font-bold text-blue-600">{totalStudents}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Present</p>
                <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Absent</p>
                <p className="text-2xl font-bold text-red-600">{absentCount}</p>
              </div>
              <div className="bg-red-100 rounded-full p-3">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Not Marked</p>
                <p className="text-2xl font-bold text-gray-600">
                  {totalStudents - presentCount - absentCount}
                </p>
              </div>
              <div className="bg-gray-100 rounded-full p-3">
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {!hasMarkedToday && (
                <button
                  onClick={() => setActiveTab('mark')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'mark'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Mark Attendance
                </button>
              )}
              {hasMarkedToday && (
                <div className="px-6 py-4 text-sm font-medium border-b-2 border-transparent text-gray-400 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Attendance Already Marked Today
                </div>
              )}
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'reports'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                View Reports
              </button>
              <button
                onClick={() => setActiveTab('faceRecognition')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'faceRecognition'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Face Recognition Attendance
              </button>
              <button
                onClick={() => setActiveTab('monitor')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'monitor'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Verification Monitor
              </button>
            </nav>
          </div>
        </div>

        {/* Mark Attendance Tab */}
        {activeTab === 'mark' && !hasMarkedToday && (
          <>
            {/* Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-700"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-700"
                >
                  <option value="">All Classes</option>
                  {uniqueClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={clearAttendance}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium text-sm"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Students List - Grouped by Class */}
        <div className="space-y-6 mb-6">
          {students.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <p className="text-xl text-gray-600 font-medium">No students available to mark attendance</p>
                <p className="text-sm text-gray-500 mt-2">Please add students to the system first</p>
              </div>
            </div>
          ) : !selectedClass ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-16 w-16 text-blue-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <p className="text-xl text-gray-600 font-medium">Please select a class to view students</p>
                <p className="text-sm text-gray-500 mt-2">Use the dropdown above to choose a class</p>
              </div>
            </div>
          ) : (
            filteredClasses.map((className) => {
              const classStudents = studentsByClass[className] || [];
              const classPresent = classStudents.filter(s => attendance.get(s.id) === 'present').length;
              const classAbsent = classStudents.filter(s => attendance.get(s.id) === 'absent').length;
              
              return (
                <div key={className} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Class Header */}
                  <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{className}</h3>
                        <p className="text-gray-600 text-sm">
                          {classStudents.length} students • Present: {classPresent} • Absent: {classAbsent}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => markClassPresent(className)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors"
                        >
                          All Present
                        </button>
                        <button
                          onClick={() => markClassAbsent(className)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors"
                        >
                          All Absent
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Students Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Roll No
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Student Name
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Attendance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {classStudents.map((student) => {
                          const status = attendance.get(student.id);
                          return (
                            <tr key={student.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {student.rollNo || student.id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{student.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      const newAttendance = new Map(attendance);
                                      newAttendance.set(student.id, 'present');
                                      setAttendance(newAttendance);
                                    }}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                      status === 'present'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-green-100'
                                    }`}
                                  >
                                    Present
                                  </button>
                                  <button
                                    onClick={() => {
                                      const newAttendance = new Map(attendance);
                                      newAttendance.set(student.id, 'absent');
                                      setAttendance(newAttendance);
                                    }}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                      status === 'absent'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-red-100'
                                    }`}
                                  >
                                    Absent
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Submit Button */}
        {students.length > 0 && (
          <div className="flex gap-4 justify-end">
            <button
              onClick={handleExportCSV}
              disabled={attendance.size === 0}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export as CSV
            </button>
            <button
              onClick={handleSubmitAttendance}
              disabled={submitting || attendance.size === 0}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Attendance'}
            </button>
          </div>
        )}

        {/* Smart AI Verification Session Button */}
        {hasMarkedToday && students.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-600 rounded-full p-3">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Smart AI Verification</h3>
                    <p className="text-sm text-gray-600">Verify attendance using AI face recognition</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2">How it works:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">1.</span>
                      <span>Start a 5-10 minute verification session</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">2.</span>
                      <span>System captures 10 classroom images automatically</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">3.</span>
                      <span>AI detects and matches student faces</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">4.</span>
                      <span>Students present in 50%+ images marked as verified</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">5.</span>
                      <span>Location and network security checks included</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="ml-6">
                <button
                  onClick={() => router.push('/dashboard/teacher/verification')}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm hover:shadow transition-all flex items-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Verification Session
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">Click to begin AI verification</p>
              </div>
            </div>
          </div>
        )}
          </>
        )}

        {/* View Reports Tab */}
        {activeTab === 'reports' && (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900">Attendance Reports</h2>
                <div className="flex gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-700"
                    />
                  </div>
                </div>
              </div>

              {loadingHistory ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mb-4"></div>
                  <p className="text-gray-600">Loading attendance history...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-16 w-16 text-gray-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <p className="text-xl text-gray-600 font-medium">No students found</p>
                  <p className="text-sm text-gray-500 mt-2">There are no students in the system</p>
                </div>
              ) : (
                <>
                  {/* Summary Info */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Students</p>
                        <p className="text-lg font-semibold text-gray-900">{students.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Present</p>
                        <p className="text-lg font-semibold text-green-600">
                          {attendanceHistory.filter(r => r.status === 'present').length}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Absent</p>
                        <p className="text-lg font-semibold text-red-600">
                          {attendanceHistory.filter(r => r.status === 'absent').length}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Not Marked</p>
                        <p className="text-lg font-semibold text-gray-600">
                          {students.length - attendanceHistory.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Face Recognition</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {attendanceHistory.filter(r => 
                            r.method === 'face_recognition' || 
                            r.method === 'Face Recognition' ||
                            r.method === 'ai_face_recognition' ||
                            r.method === 'real_ai_face_recognition' ||
                            r.markedBy?.toLowerCase().includes('face') ||
                            r.markedBy?.toLowerCase().includes('ai') ||
                            r.markedBy === 'AI Face Recognition System' ||
                            (r as any).aiVerified === true
                          ).length}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Class-wise Reports */}
            {!loadingHistory && students.length > 0 && (
              <>
                {/* Class Selection Dropdown */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Class to View Report
                  </label>
                  <select
                    value={selectedReportClass || ''}
                    onChange={(e) => setSelectedReportClass(e.target.value || null)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-700"
                  >
                    <option value="">-- Select a class --</option>
                    {uniqueClasses.map((className) => {
                      const classStudents = students.filter(s => s.class === className);
                      return (
                        <option key={className} value={className}>
                          {className} ({classStudents.length} students)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedReportClass ? (
                  /* Show Selected Class Students */
                  <div className="space-y-6">
                    {(() => {
                      const className = selectedReportClass;
                      const classStudents = students.filter(s => s.class === className);
                      
                      // Create attendance map for quick lookup
                      const attendanceMap = new Map();
                      attendanceHistory.forEach(record => {
                        attendanceMap.set(record.studentId, record);
                      });

                      // Count present/absent/not marked
                      let classPresent = 0;
                      let classAbsent = 0;
                      let classNotMarked = 0;
                      
                      classStudents.forEach(student => {
                        const record = attendanceMap.get(student.id);
                        if (record) {
                          if (record.status === 'present') classPresent++;
                          else classAbsent++;
                        } else {
                          classNotMarked++;
                        }
                      });

                      return (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                          {/* Class Header */}
                          <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900">{className}</h3>
                                <p className="text-gray-600 text-sm">
                                  {classStudents.length} students • Present: {classPresent} • Absent: {classAbsent} • Not Marked: {classNotMarked}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-gray-600 text-sm">Attendance Rate</p>
                                <p className="text-2xl font-bold text-gray-900">
                                  {classStudents.length > 0 ? Math.round((classPresent / classStudents.length) * 100) : 0}%
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Students Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Roll No
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Student Name
                                  </th>
                                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Marked By
                                  </th>
                                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Time
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {classStudents
                                  .sort((a, b) => {
                                    const rollA = parseInt(a.rollNo || '0');
                                    const rollB = parseInt(b.rollNo || '0');
                                    return rollA - rollB;
                                  })
                                  .map((student) => {
                                  const record = attendanceMap.get(student.id);
                                  const isFaceRecognition = record && (
                                    record.method === 'face_recognition' || 
                                    record.method === 'Face Recognition' ||
                                    record.method === 'ai_face_recognition' ||
                                    record.method === 'real_ai_face_recognition' ||
                                    record.markedBy?.toLowerCase().includes('face') ||
                                    record.markedBy?.toLowerCase().includes('ai') ||
                                    record.markedBy === 'AI Face Recognition System' ||
                                    (record as any).aiVerified === true
                                  );
                                  
                                  return (
                                    <tr key={student.id} className={`hover:bg-gray-50 ${!record ? 'bg-yellow-50' : ''}`}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {student.rollNo || student.id}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                          {student.name}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {record ? (
                                          <span
                                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                              record.status === 'present'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}
                                          >
                                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                          </span>
                                        ) : (
                                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-600">
                                            Not Marked
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {record ? (
                                          isFaceRecognition ? (
                                            <span className="px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                              </svg>
                                              Face Recognition
                                            </span>
                                          ) : (
                                            <span className="text-sm text-gray-700">{record.teacherName || record.markedBy || 'Teacher'}</span>
                                          )
                                        ) : (
                                          <span className="text-sm text-gray-400">-</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {record ? (
                                          new Date(record.markedAt).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })
                                        ) : (
                                          <span className="text-gray-400">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <svg
                      className="mx-auto h-16 w-16 text-gray-400 mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    <p className="text-lg text-gray-600 font-medium">Please select a class to view attendance report</p>
                    <p className="text-sm text-gray-500 mt-2">Use the dropdown above to choose a class</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Face Recognition Attendance Tab */}
        {activeTab === 'faceRecognition' && (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                      Face Recognition Attendance
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Students who marked attendance using face recognition • Auto-refreshes every 30 seconds
                    </p>
                  </div>
                  <button
                    onClick={() => fetchFaceRecognitionRecords()}
                    disabled={loadingFaceRecords}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {loadingFaceRecords ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                {/* Date Range Filters */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setReportDate(today);
                      setShowLast7Days(false);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      !showLast7Days && reportDate === new Date().toISOString().split('T')[0]
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      setReportDate(yesterday.toISOString().split('T')[0]);
                      setShowLast7Days(false);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      !showLast7Days && reportDate === new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                    }`}
                  >
                    Yesterday
                  </button>
                  <button
                    onClick={() => {
                      setShowLast7Days(true);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      showLast7Days
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <div className="flex items-center gap-2 ml-auto">
                    <label className="text-sm font-medium text-gray-700">Custom Date:</label>
                    <input
                      type="date"
                      value={reportDate}
                      onChange={(e) => {
                        setReportDate(e.target.value);
                        setShowLast7Days(false);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-700 text-sm"
                    />
                  </div>
                </div>
              </div>

              {loadingFaceRecords ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mb-4"></div>
                  <p className="text-gray-600">Loading face recognition records...</p>
                </div>
              ) : faceRecognitionRecords.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
                    <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                  </div>
                  <p className="text-xl text-gray-600 font-medium">No face recognition records found</p>
                  <p className="text-sm text-gray-500 mt-2">No students have marked attendance using face recognition for this date</p>
                </div>
              ) : (
                <>
                  {/* Stats Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Total Face Recognition</p>
                      <p className="text-3xl font-bold text-blue-600">{faceRecognitionRecords.length}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Present</p>
                      <p className="text-3xl font-bold text-green-600">
                        {faceRecognitionRecords.filter(r => r.status === 'present').length}
                      </p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600">
                        {showLast7Days ? 'Date Range' : 'Date'}
                      </p>
                      <p className="text-lg font-bold text-purple-600">
                        {showLast7Days 
                          ? 'Last 7 Days' 
                          : new Date(reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        }
                      </p>
                    </div>
                  </div>

                  {/* Records Table - Simple List Format */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Student
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Class & Roll
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date & Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Network
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {faceRecognitionRecords.map((record, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {record.capturedFaceImageUrl ? (
                                  <img
                                    src={record.capturedFaceImageUrl}
                                    alt={record.studentName}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {record.studentName?.charAt(0) || 'S'}
                                  </div>
                                )}
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">{record.studentName}</div>
                                  <div className="text-sm text-gray-500">ID: {record.studentId}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{record.class || 'N/A'}</div>
                              <div className="text-sm text-gray-500">Roll: {record.rollNo || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Date(record.date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(record.markedAt || record.date).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {record.location ? (
                                <div>
                                  <div className={`text-sm font-medium ${
                                    record.location.isInClassroom ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {record.location.isInClassroom ? '✓ In Classroom' : '✗ Outside'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {record.location.distanceFromClassroom}m away
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">No location data</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {record.networkSecurity ? (
                                <div>
                                  <div className="flex items-center gap-1">
                                    {record.networkSecurity.isVPN && (
                                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">VPN</span>
                                    )}
                                    {record.networkSecurity.isProxy && (
                                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">Proxy</span>
                                    )}
                                    {!record.networkSecurity.isVPN && !record.networkSecurity.isProxy && (
                                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">Clean</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Risk: {record.networkSecurity.riskScore}/100
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">No network data</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                                  Present
                                </span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                                  Face Recognition
                                </span>
                                {record.flags && record.flags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {record.flags.slice(0, 2).map((flag: string, idx: number) => (
                                      <span key={idx} className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded">
                                        {flag}
                                      </span>
                                    ))}
                                    {record.flags.length > 2 && (
                                      <span className="text-xs text-gray-500">+{record.flags.length - 2} more</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Verification Monitor Tab */}
        {activeTab === 'monitor' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Monitoring Dashboard</h2>
              <p className="text-gray-600">Monitor student locations, sessions, and network security</p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Real-Time Monitoring Dashboard</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    View comprehensive security and location data for all students:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <strong>GPS Location Tracking:</strong> See exact student locations and distance from classroom
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <strong>VPN/Proxy Detection:</strong> Identify students using VPN or proxy networks
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <strong>Network Security:</strong> Monitor IP addresses, latency, jitter, and risk scores
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <strong>Attendance Sessions:</strong> Track all verification sessions with detailed logs
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <strong>Security Flags:</strong> Automatic alerts for suspicious activity
                    </li>
                  </ul>
                </div>
                <div className="ml-6">
                  <button
                    onClick={() => router.push('/admin/verification-monitor')}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-3 transform hover:scale-105"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Open Full Dashboard
                  </button>
                  <p className="text-xs text-gray-600 mt-2 text-center">Access complete monitoring tools</p>
                </div>
              </div>
            </div>

            {/* Quick Preview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-700">Students Monitored</h4>
                  <div className="bg-blue-100 rounded-lg p-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-black text-blue-600">{totalStudents}</p>
                <p className="text-xs text-gray-500 mt-1">Total students tracked</p>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-700">Location Logs</h4>
                  <div className="bg-green-100 rounded-lg p-2">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-black text-green-600">Live</p>
                <p className="text-xs text-gray-500 mt-1">GPS tracking active</p>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-700">VPN Detected</h4>
                  <div className="bg-red-100 rounded-lg p-2">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-black text-red-600">0</p>
                <p className="text-xs text-gray-500 mt-1">Suspicious networks</p>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-700">Network Latency</h4>
                  <div className="bg-purple-100 rounded-lg p-2">
                    <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-black text-purple-600">~50ms</p>
                <p className="text-xs text-gray-500 mt-1">Average response time</p>
              </div>
            </div>

            {/* Info Banner */}
            <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-bold text-blue-900 mb-1">How to Use Monitoring</h4>
                  <p className="text-sm text-blue-800">
                    Click "Open Full Dashboard" to access the complete monitoring interface. You can view individual student details, 
                    check their GPS locations, detect VPN usage, monitor network security, and identify students who may not be 
                    physically present in class. Use this data to verify attendance accuracy and maintain classroom integrity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
