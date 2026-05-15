import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching face registration status for all students...');

    // Check authentication
    const { userId: clerkUserId } = await auth();
    const customUserId = request.cookies.get('userId')?.value;
    const userRole = request.cookies.get('userRole')?.value;

    console.log('🔐 Auth:', { clerkUserId, customUserId, userRole });

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Fetch all students
    const students = await db
      .collection('users')
      .find({
        $or: [
          { role: 'student' },
          { role: 'Student' }
        ]
      })
      .project({
        _id: 1,
        name: 1,
        email: 1,
        rollNo: 1,
        rollNumber: 1,
        class: 1,
        faceRegistered: 1,
        faceRegisteredAt: 1,
        createdAt: 1
      })
      .sort({ name: 1 })
      .toArray();

    console.log(`✅ Found ${students.length} students`);

    // Get all face registrations
    const faceRegistrations = await db
      .collection('face_registrations')
      .find({})
      .toArray();

    console.log(`✅ Found ${faceRegistrations.length} face registrations`);

    // Create a map of face registrations by studentId
    const faceRegMap = new Map();
    faceRegistrations.forEach(reg => {
      faceRegMap.set(reg.studentId, reg);
    });

    // Format the response
    const studentsWithFaceStatus = students.map((student) => {
      const studentId = student._id.toString();
      const faceReg = faceRegMap.get(studentId);
      
      return {
        id: studentId,
        name: student.name || 'Unknown',
        email: student.email || '',
        rollNumber: student.rollNo || student.rollNumber || 'N/A',
        class: student.class || 'Not Assigned',
        faceRegistered: student.faceRegistered || false,
        faceRegisteredAt: student.faceRegisteredAt || faceReg?.registeredAt || null,
        faceImages: faceReg ? faceReg.imageCount : 0,
        registrationStatus: faceReg?.status || 'not_registered'
      };
    });

    return NextResponse.json({
      success: true,
      students: studentsWithFaceStatus,
      totalStudents: studentsWithFaceStatus.length,
      registeredCount: studentsWithFaceStatus.filter(s => s.faceRegistered).length,
      notRegisteredCount: studentsWithFaceStatus.filter(s => !s.faceRegistered).length
    });
  } catch (error: any) {
    console.error('❌ Error fetching face status:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch face registration status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      },
      { status: 500 }
    );
  }
}
