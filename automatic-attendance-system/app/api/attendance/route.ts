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

    // Get location and network logs collections
    const locationLogsCollection = db.collection('location_logs');
    const networkLogsCollection = db.collection('network_logs');
    const verificationImagesCollection = db.collection('verification_images');

    // Enrich records with student information, location, and network data
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
        
        const baseRecord = {
          ...record,
          studentName: record.studentName || student?.name || 'Unknown Student',
          class: record.class || student?.class || 'N/A',
          rollNo: record.rollNo || student?.rollNo || 'N/A',
          markedBy: record.markedBy || record.teacherName || record.method || 'Unknown'
        };

        // For face recognition records, fetch additional data
        if (record.method === 'face_recognition') {
          // Get location data
          const locationLog = await locationLogsCollection.findOne({
            studentId: record.studentId,
            timestamp: { 
              $gte: new Date(new Date(record.markedAt).getTime() - 5 * 60000), // 5 minutes before
              $lte: new Date(new Date(record.markedAt).getTime() + 5 * 60000)  // 5 minutes after
            }
          }, { sort: { timestamp: -1 } });

          // Get network data
          const networkLog = await networkLogsCollection.findOne({
            studentId: record.studentId,
            timestamp: { 
              $gte: new Date(new Date(record.markedAt).getTime() - 5 * 60000),
              $lte: new Date(new Date(record.markedAt).getTime() + 5 * 60000)
            }
          }, { sort: { timestamp: -1 } });

          // Get captured face image
          const capturedImage = await verificationImagesCollection.findOne({
            studentId: record.studentId,
            capturedAt: { 
              $gte: new Date(new Date(record.markedAt).getTime() - 5 * 60000),
              $lte: new Date(new Date(record.markedAt).getTime() + 5 * 60000)
            }
          }, { sort: { capturedAt: -1 } });

          // Build security flags
          const flags: string[] = [];
          if (locationLog && !locationLog.isInClassroom) {
            flags.push('Outside Classroom');
          }
          if (networkLog?.isVPN) {
            flags.push('VPN Detected');
          }
          if (networkLog?.isProxy) {
            flags.push('Proxy Detected');
          }
          if (networkLog && networkLog.riskScore >= 70) {
            flags.push('High Risk Network');
          }
          if (locationLog && locationLog.accuracy > 50) {
            flags.push('Low GPS Accuracy');
          }

          return {
            ...baseRecord,
            location: locationLog ? {
              latitude: locationLog.latitude,
              longitude: locationLog.longitude,
              accuracy: locationLog.accuracy,
              distanceFromClassroom: locationLog.distanceFromClassroom,
              isInClassroom: locationLog.isInClassroom,
              timestamp: locationLog.timestamp
            } : null,
            networkSecurity: networkLog ? {
              ipAddress: networkLog.ipAddress,
              city: networkLog.city || 'Unknown',
              country: networkLog.country || 'Unknown',
              isVPN: networkLog.isVPN || false,
              isProxy: networkLog.isProxy || false,
              latency: networkLog.latency || 0,
              jitter: networkLog.jitter || 0,
              riskScore: networkLog.riskScore || 0,
              timestamp: networkLog.timestamp
            } : null,
            capturedFaceImageUrl: capturedImage?.imageUrl || null,
            flags: flags.length > 0 ? flags : null
          };
        }

        return baseRecord;
      })
    );

    console.log('✅ Enriched records sample:', enrichedRecords[0]);

    return NextResponse.json(enrichedRecords);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}
