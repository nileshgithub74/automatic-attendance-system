import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const role = user?.publicMetadata?.role;

    if (role !== 'Principal') {
      return NextResponse.json({ error: 'Forbidden - Principal access only' }, { status: 403 });
    }

    const body = await request.json();
    const {
      email,
      firstName,
      lastName,
      className,
      rollNo,
      parentNumber,
    } = body;

    // Validate required fields
    if (!email || !firstName || !lastName || !className || !rollNo || !parentNumber) {
      return NextResponse.json(
        { error: 'All fields are required for student creation' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const db = await getDatabase();

    if (!db) {
      console.error('❌ Database connection failed');
      return NextResponse.json({ 
        error: 'Database connection failed. Please check MongoDB connection.' 
      }, { status: 500 });
    }

    console.log('✅ Database connected');

    // Check if email already exists in users collection (case-insensitive)
    const existingInUsers = await db.collection('users').findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });
    if (existingInUsers) {
      return NextResponse.json(
        { error: `A user with email ${email} already exists in the system` },
        { status: 409 }
      );
    }

    // Also check students collection for legacy data
    const existingStudent = await db.collection('students').findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });
    if (existingStudent) {
      return NextResponse.json(
        { error: `A student with email ${email} already exists in the database` },
        { status: 409 }
      );
    }

    // Check if email exists in Clerk
    try {
      const { clerkClient } = await import('@clerk/nextjs/server');
      const client = await clerkClient();
      const clerkUsers = await client.users.getUserList({ emailAddress: [email] });
      
      if (clerkUsers.data.length > 0) {
        return NextResponse.json(
          { error: `A user with email ${email} already exists in Clerk. Please use a different email.` },
          { status: 409 }
        );
      }
    } catch (clerkError) {
      console.log('Clerk check skipped:', clerkError);
      // Continue if Clerk check fails
    }

    // Get next ID from users collection
    const lastUser = await db
      .collection('users')
      .find({})
      .sort({ id: -1 })
      .limit(1)
      .toArray();
    const nextId = lastUser.length > 0 && lastUser[0].id ? lastUser[0].id + 1 : 1;

    const newStudent = {
      id: nextId,
      name: `${firstName} ${lastName}`.trim(),
      firstName: firstName,
      lastName: lastName,
      parentNumber: parentNumber,
      class: className,
      rollNo: rollNo,
      email: email.toLowerCase(), // Store email in lowercase
      role: 'student', // Important: set role for filtering
      faceRegistered: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('💾 Saving student to users collection:', newStudent.email);

    // Save to users collection (main collection)
    const result = await db.collection('users').insertOne(newStudent);

    console.log('✅ Student created successfully:', result.insertedId);

    return NextResponse.json({
      success: true,
      message: 'Student created successfully',
      student: {
        id: nextId,
        email: email,
        name: `${firstName} ${lastName}`.trim(),
        class: className,
        rollNo: rollNo,
      },
    });
  } catch (error: any) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create student' },
      { status: 500 }
    );
  }
}
