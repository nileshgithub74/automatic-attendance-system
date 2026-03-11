import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

// GET - Fetch all teacher reports
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const role = (user?.publicMetadata?.role as string)?.toLowerCase();

    console.log('🔐 User role:', role);

    // Allow Principal, Admin, or admin roles
    if (!role || !['principal', 'admin'].includes(role)) {
      return NextResponse.json({ 
        error: 'Forbidden - Admin/Principal access only',
        yourRole: role 
      }, { status: 403 });
    }

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    // If teacherId is provided, get detailed report for that teacher
    if (teacherId) {
      const teacher = await db.collection('teachers').findOne({ 
        $or: [
          { id: parseInt(teacherId) },
          { id: teacherId }
        ]
      });
      
      if (!teacher) {
        return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
      }

      // Get teacher submissions
      const submissions = await db
        .collection('teacher_submissions')
        .find({ 
          $or: [
            { userId: parseInt(teacherId) },
            { userId: teacherId }
          ]
        })
        .sort({ submittedAt: -1 })
        .toArray();

      // Get attendance records marked by this teacher (check both markedBy and teacherId)
      const attendanceRecords = await db
        .collection('attendance')
        .find({ 
          $or: [
            { markedBy: parseInt(teacherId) },
            { markedBy: teacherId },
            { teacherId: teacherId },
            { teacherId: parseInt(teacherId) }
          ]
        })
        .sort({ date: -1 })
        .limit(50)
        .toArray();

      // Get all students for name lookup
      const students = await db.collection('students').find({}).toArray();
      const studentMap = new Map();
      students.forEach(s => {
        studentMap.set(s.id, s.name);
        studentMap.set(s.id?.toString(), s.name);
        studentMap.set(parseInt(s.id), s.name);
      });

      // Add student names to attendance records
      const attendanceWithNames = attendanceRecords.map(record => ({
        ...record,
        studentName: record.studentName || studentMap.get(record.studentId) || studentMap.get(parseInt(record.studentId)) || 'Unknown Student'
      }));

      // Calculate statistics
      const totalSubmissions = submissions.length;
      const totalAttendanceMarked = attendanceRecords.length;

      return NextResponse.json({
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          classes: teacher.classes || [],
          phoneNumber: teacher.phoneNumber,
          createdAt: teacher.createdAt,
        },
        statistics: {
          totalSubmissions,
          totalAttendanceMarked,
          pendingSubmissions: submissions.filter(s => s.status === 'pending').length,
          approvedSubmissions: submissions.filter(s => s.status === 'approved').length,
        },
        recentSubmissions: submissions.slice(0, 10),
        recentAttendance: attendanceWithNames.slice(0, 10),
      });
    }

    // Get all teachers with basic statistics
    const teachers = await db.collection('teachers').find({}).toArray();
    
    console.log(`📊 Found ${teachers.length} teachers in database`);

    const teacherReports = await Promise.all(
      teachers.map(async (teacher) => {
        const teacherIdStr = teacher.id?.toString() || teacher._id?.toString();
        const teacherIdNum = parseInt(teacherIdStr);
        
        const submissionCount = await db
          .collection('teacher_submissions')
          .countDocuments({ 
            $or: [
              { userId: teacherIdNum },
              { userId: teacherIdStr }
            ]
          });

        // Query attendance marked by this teacher with multiple ID formats
        const attendanceCount = await db
          .collection('attendance')
          .countDocuments({ 
            $or: [
              { markedBy: teacherIdNum },
              { markedBy: teacherIdStr },
              { teacherId: teacherIdStr },
              { teacherId: teacher.id },
              { teacherId: teacher._id }
            ]
          });

        console.log(`Teacher ${teacher.name}: ${attendanceCount} attendance records marked`);

        return {
          id: teacherIdNum || teacherIdStr,
          name: teacher.name,
          email: teacher.email,
          classes: teacher.classes || [],
          totalSubmissions: submissionCount,
          totalAttendanceMarked: attendanceCount,
          lastActivity: teacher.updatedAt || teacher.createdAt,
        };
      })
    );

    console.log(`✅ Returning ${teacherReports.length} teacher reports`);
    return NextResponse.json(teacherReports);
  } catch (error) {
    console.error('Error fetching teacher reports:', error);
    return NextResponse.json({ error: 'Failed to fetch teacher reports' }, { status: 500 });
  }
}
