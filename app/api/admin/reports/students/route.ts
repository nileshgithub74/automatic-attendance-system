import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

// GET - Fetch all student reports
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
    const studentId = searchParams.get('studentId');

    // If studentId is provided, get detailed report for that student
    if (studentId) {
      const student = await db.collection('students').findOne({ 
        $or: [
          { id: parseInt(studentId) },
          { id: studentId }
        ]
      });
      
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      // Get student submissions
      const submissions = await db
        .collection('student_submissions')
        .find({ 
          $or: [
            { userId: parseInt(studentId) },
            { userId: studentId }
          ]
        })
        .sort({ submittedAt: -1 })
        .toArray();

      // Get attendance records for this student
      const attendanceRecords = await db
        .collection('attendance')
        .find({ 
          $or: [
            { studentId: parseInt(studentId) },
            { studentId: studentId }
          ]
        })
        .sort({ date: -1 })
        .toArray();

      // Calculate attendance statistics
      const totalDays = attendanceRecords.length;
      const presentDays = attendanceRecords.filter(r => 
        r.status === 'Present' || r.status === 'present'
      ).length;
      const absentDays = attendanceRecords.filter(r => 
        r.status === 'Absent' || r.status === 'absent'
      ).length;
      const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

      return NextResponse.json({
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          class: student.class,
          rollNo: student.rollNo,
          parentNumber: student.parentNumber,
          createdAt: student.createdAt,
        },
        statistics: {
          totalDays,
          presentDays,
          absentDays,
          attendancePercentage,
          totalSubmissions: submissions.length,
          pendingSubmissions: submissions.filter(s => s.status === 'pending').length,
          approvedSubmissions: submissions.filter(s => s.status === 'approved').length,
        },
        recentSubmissions: submissions.slice(0, 10),
        attendanceHistory: attendanceRecords.slice(0, 30),
      });
    }

    // Get all students with basic statistics
    const students = await db.collection('students').find({}).toArray();
    
    console.log(`📊 Found ${students.length} students in database`);

    const studentReports = await Promise.all(
      students.map(async (student) => {
        const studentIdStr = student.id?.toString() || student._id?.toString();
        const studentIdNum = parseInt(studentIdStr);
        
        const submissionCount = await db
          .collection('student_submissions')
          .countDocuments({ 
            $or: [
              { userId: studentIdNum },
              { userId: studentIdStr }
            ]
          });

        // Query attendance with multiple ID formats
        const attendanceRecords = await db
          .collection('attendance')
          .find({ 
            $or: [
              { studentId: studentIdNum },
              { studentId: studentIdStr },
              { studentId: student.id },
              { studentId: student._id }
            ]
          })
          .toArray();

        const totalDays = attendanceRecords.length;
        const presentDays = attendanceRecords.filter(r => 
          r.status === 'Present' || r.status === 'present'
        ).length;
        const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

        console.log(`Student ${student.name}: ${presentDays}/${totalDays} days (${attendancePercentage}%)`);

        return {
          id: studentIdNum || studentIdStr,
          name: student.name,
          email: student.email,
          class: student.class || 'N/A',
          rollNo: student.rollNo || 'N/A',
          attendancePercentage,
          totalSubmissions: submissionCount,
          totalDays,
          presentDays,
        };
      })
    );

    console.log(`✅ Returning ${studentReports.length} student reports`);
    return NextResponse.json(studentReports);
  } catch (error) {
    console.error('Error fetching student reports:', error);
    return NextResponse.json({ error: 'Failed to fetch student reports' }, { status: 500 });
  }
}
