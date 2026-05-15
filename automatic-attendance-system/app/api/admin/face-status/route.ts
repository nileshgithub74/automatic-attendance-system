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

    // Fetch all students from 'users' collection
    const usersStudents = await db
      .collection('users')
      .find({ 
        role: { $regex: /^student$/i }
      })
      .project({
        _id: 1,
        name: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        rollNo: 1,
        rollNumber: 1,
        class: 1,
        className: 1,
        faceRegistered: 1,
        faceRegisteredAt: 1,
        createdAt: 1
      })
      .sort({ name: 1 })
      .toArray();

    console.log(`✅ Found ${usersStudents.length} students in users collection`);

    // Also check legacy 'students' collection
    const legacyStudents = await db
      .collection('students')
      .find({})
      .project({
        _id: 1,
        name: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        rollNo: 1,
        rollNumber: 1,
        class: 1,
        className: 1,
        faceRegistered: 1,
        faceRegisteredAt: 1,
        createdAt: 1
      })
      .sort({ name: 1 })
      .toArray();

    console.log(`✅ Found ${legacyStudents.length} students in students collection`);

    // Combine and deduplicate by email
    const mongoEmailSet = new Set();
    const students = [...usersStudents, ...legacyStudents].filter(student => {
      const email = student.email?.toLowerCase();
      if (!email) return true;
      if (mongoEmailSet.has(email)) return false;
      mongoEmailSet.add(email);
      return true;
    });

    console.log(`✅ Total unique students from MongoDB: ${students.length}`);

    // Also fetch students from Clerk
    let clerkStudents: any[] = [];
    try {
      console.log('Fetching students from Clerk...');
      const { clerkClient } = await import('@clerk/nextjs/server');
      const client = await clerkClient();
      const clerkUsers = await client.users.getUserList();
      
      clerkStudents = clerkUsers.data
        .filter((user: any) => {
          const role = (user.publicMetadata?.role as string || '').toLowerCase();
          return role === 'student';
        })
        .map((user: any) => {
          const email = user.emailAddresses[0]?.emailAddress || '';
          return {
            _id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || email.split('@')[0],
            firstName: user.firstName,
            lastName: user.lastName,
            email: email,
            rollNo: user.publicMetadata?.rollNo || 'N/A',
            class: user.publicMetadata?.class || 'Not Assigned',
            faceRegistered: user.publicMetadata?.faceRegistered || false,
            faceRegisteredAt: user.publicMetadata?.faceRegisteredAt || null,
            source: 'clerk'
          };
        });
      
      console.log(`✅ Found ${clerkStudents.length} students in Clerk`);
    } catch (clerkError) {
      console.error('Error fetching from Clerk:', clerkError);
    }

    // Combine MongoDB and Clerk students, deduplicate by email
    const allStudents = [...students, ...clerkStudents];
    const emailSet = new Set();
    const uniqueStudents = allStudents.filter(student => {
      const email = student.email?.toLowerCase();
      if (!email) return true;
      if (emailSet.has(email)) return false;
      emailSet.add(email);
      return true;
    });

    console.log(`✅ Total unique students (MongoDB + Clerk): ${uniqueStudents.length}`);

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
    const studentsWithFaceStatus = uniqueStudents.map((student) => {
      const studentId = student._id?.toString() || student.id;
      const faceReg = faceRegMap.get(studentId);
      
      return {
        id: studentId,
        name: student.name || (student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : null) || 'Unknown',
        email: student.email || '',
        rollNumber: student.rollNo || student.rollNumber || 'N/A',
        class: student.class || student.className || 'Not Assigned',
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
