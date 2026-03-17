import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    // Try to get student ID from headers (custom login)
    let studentId = request.headers.get('x-student-id');
    let userType = request.headers.get('x-user-type');

    console.log('🔍 Student attendance API called with headers:', { studentId, userType });

    // If no headers, check Clerk authentication
    if (!studentId) {
      const { userId } = await auth();
      
      if (userId) {
        console.log('🔐 Clerk user detected:', userId);
        // Use Clerk user ID as student ID
        studentId = userId;
        userType = 'Student';
        console.log('✅ Using Clerk authentication for student:', studentId);
      }
    }

    if (!studentId) {
      console.log('❌ Access denied: No authentication found');
      return NextResponse.json({ 
        error: 'Unauthorized - Student access required',
        debug: { receivedStudentId: !!studentId, receivedUserType: userType, expectedUserType: 'Student' }
      }, { status: 401 });
    }

    console.log('✅ Access granted for student:', studentId);

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get attendance records for this student - sorted by most recent first
    const attendanceRecords = await db
      .collection('attendance')
      .find({ 
        $or: [
          { studentId: parseInt(studentId) },
          { studentId: studentId }
        ]
      })
      .sort({ 
        date: -1,      // Most recent date first
        markedAt: -1   // Most recent time first (for same date)
      })
      .limit(50) // Last 50 records
      .toArray();

    // Format the records for display
    const formattedRecords = attendanceRecords.map(record => ({
      id: record._id,
      date: record.date,
      status: record.status,
      markedAt: record.markedAt,
      teacherName: record.teacherName || 'Unknown Teacher'
    }));

    // Calculate attendance statistics
    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    const attendancePercentage = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

    return NextResponse.json({
      records: formattedRecords,
      statistics: {
        totalDays: totalRecords,
        presentDays: presentCount,
        absentDays: totalRecords - presentCount,
        attendancePercentage: attendancePercentage
      }
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}