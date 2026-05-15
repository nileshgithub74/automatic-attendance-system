import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('GET /api/students/get - Starting...');
  
  try {
    console.log('Fetching students list...');

    // Check authentication
    const { userId: clerkUserId } = await auth();
    const customUserId = request.cookies.get('userId')?.value;
    const userRole = request.cookies.get('userRole')?.value;

    console.log('Auth:', { clerkUserId, customUserId, userRole });

    console.log('Connecting to MongoDB...');
    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({
        success: false,
        message: 'Database connection failed',
        students: []
      }, { status: 500 });
    }
    
    console.log('MongoDB connected');

    // Fetch all students from 'users' collection
    // Use case-insensitive regex to match any case variation
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
        parentNumber: 1,
        parentPhone: 1,
        faceRegistered: 1,
        createdAt: 1
      })
      .sort({ name: 1 })
      .toArray();

    console.log(`Found ${usersStudents.length} students in users collection`);

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
        parentNumber: 1,
        parentPhone: 1,
        faceRegistered: 1,
        createdAt: 1
      })
      .sort({ name: 1 })
      .toArray();

    console.log(`Found ${legacyStudents.length} students in students collection`);

    // Combine and deduplicate by email
    const mongoEmailSet = new Set();
    const students = [...usersStudents, ...legacyStudents].filter(student => {
      const email = student.email?.toLowerCase();
      if (!email) return true; // Include students without email
      if (mongoEmailSet.has(email)) return false; // Skip duplicates
      mongoEmailSet.add(email);
      return true;
    });

    console.log(`Total unique students from MongoDB: ${students.length}`);

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
            id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || email.split('@')[0],
            firstName: user.firstName,
            lastName: user.lastName,
            email: email,
            rollNo: user.publicMetadata?.rollNo || 'N/A',
            class: user.publicMetadata?.class || 'Not Assigned',
            parentNumber: user.publicMetadata?.parentNumber || 'N/A',
            faceRegistered: user.publicMetadata?.faceRegistered || false,
            source: 'clerk'
          };
        });
      
      console.log(`Found ${clerkStudents.length} students in Clerk`);
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

    console.log(`Total unique students (MongoDB + Clerk): ${uniqueStudents.length}`);

    // Format the response
    const formattedStudents = uniqueStudents.map((student) => ({
      id: student._id?.toString() || student.id,
      name: student.name || (student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : null) || 'Unknown',
      email: student.email || '',
      rollNo: student.rollNo || student.rollNumber || 'N/A',
      class: student.class || student.className || 'Not Assigned',
      parentNumber: student.parentNumber || student.parentPhone || 'N/A',
      faceRegistered: student.faceRegistered || false,
      createdAt: student.createdAt,
      source: student.source || 'mongodb'
    }));

    console.log(`Returning ${formattedStudents.length} students`);
    
    return NextResponse.json({
      success: true,
      students: formattedStudents,
      count: formattedStudents.length
    });
  } catch (error: any) {
    console.error('Error fetching students:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch students',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error',
        students: []
      },
      { status: 500 }
    );
  }
}
