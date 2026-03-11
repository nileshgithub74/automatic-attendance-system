import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

interface AttendanceRecord {
  studentId: number;
  status: 'present' | 'absent';
}

interface AttendanceSubmission {
  date: string;
  records: AttendanceRecord[];
  teacherId: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check for Clerk authentication
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const user = await currentUser();
    const role = user?.publicMetadata?.role as string;

    // Check if user has permission
    if (role !== 'Teacher' && role !== 'teacher' && role !== 'Principal') {
      return NextResponse.json({ error: 'Unauthorized - Teacher access required' }, { status: 403 });
    }

    const body: AttendanceSubmission = await request.json();
    const { date, records, teacherId } = body;

    if (!date || !records || records.length === 0) {
      return NextResponse.json({ error: 'Invalid request - date and records are required' }, { status: 400 });
    }

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Create attendance records
    const attendanceRecords = records.map(record => ({
      studentId: record.studentId,
      status: record.status,
      date: new Date(date),
      teacherId: teacherId || userId,
      teacherName: `${user?.firstName} ${user?.lastName}`,
      markedAt: new Date(),
    }));

    // Check if attendance already exists for this date
    const existingAttendance = await db.collection('attendance').findOne({
      date: new Date(date),
      teacherId: teacherId || userId,
    });

    if (existingAttendance) {
      // Update existing attendance
      await db.collection('attendance').deleteMany({
        date: new Date(date),
        teacherId: teacherId || userId,
      });
    }

    // Insert new attendance records
    const result = await db.collection('attendance').insertMany(attendanceRecords);

    return NextResponse.json({
      success: true,
      message: 'Attendance submitted successfully',
      recordsCount: result.insertedCount,
    });
  } catch (error) {
    console.error('Error submitting attendance:', error);
    return NextResponse.json({ error: 'Failed to submit attendance' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check for Clerk authentication
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const user = await currentUser();
    const role = user?.publicMetadata?.role as string;

    // Check if user has permission
    if (!role || (role !== 'Teacher' && role !== 'teacher' && role !== 'Principal')) {
      return NextResponse.json({ error: 'Unauthorized - Teacher or Principal access required' }, { status: 403 });
    }

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const studentId = searchParams.get('studentId');

    let query: any = {};

    if (date) {
      // Query for the entire day (from 00:00:00 to 23:59:59)
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    if (studentId) {
      // Support both string and number studentId
      query.$or = [
        { studentId: parseInt(studentId) },
        { studentId: studentId.toString() }
      ];
    }

    console.log('📊 Fetching attendance with query:', JSON.stringify(query));

    // Teachers can see all attendance records (including face recognition)
    // No need to filter by teacherId - show all attendance for the date

    const attendanceRecords = await db
      .collection('attendance')
      .find(query)
      .sort({ date: -1, markedAt: -1 })
      .toArray();

    console.log(`✅ Found ${attendanceRecords.length} attendance records`);

    // Enrich records with student information
    const studentsCollection = db.collection('students');
    const enrichedRecords = await Promise.all(
      attendanceRecords.map(async (record: any) => {
        // Try to find student by multiple ID formats
        const student = await studentsCollection.findOne({
          $or: [
            { id: record.studentId },
            { id: String(record.studentId) },
            { id: parseInt(record.studentId) },
            { _id: record.studentId },
            { clerkId: record.studentId }
          ]
        });
        
        // Use existing record data if student not found in students collection
        return {
          ...record,
          studentName: record.studentName || student?.name || 'Unknown Student',
          class: record.class || student?.class || 'N/A',
          rollNo: record.rollNo || student?.rollNo || 'N/A',
          markedBy: record.markedBy || record.teacherName || record.method || 'Unknown'
        };
      })
    );

    console.log('✅ Enriched records sample:', enrichedRecords[0]);

    return NextResponse.json(enrichedRecords);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}
