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
      phoneNumber,
      subjects,
    } = body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, first name, and last name are required' },
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
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Check if email already exists in teachers collection
    const existingTeacher = await db.collection('teachers').findOne({ email: email });
    if (existingTeacher) {
      return NextResponse.json(
        { error: 'A teacher with this email already exists' },
        { status: 409 }
      );
    }

    // Save to teachers collection (no Clerk authentication needed)
    const lastTeacher = await db
      .collection('teachers')
      .find({})
      .sort({ id: -1 })
      .limit(1)
      .toArray();
    const nextId = lastTeacher.length > 0 ? lastTeacher[0].id + 1 : 1;

    const newTeacher = {
      id: nextId,
      name: `${firstName} ${lastName}`.trim(),
      firstName: firstName,
      lastName: lastName,
      email: email,
      classes: subjects || [],
      phoneNumber: phoneNumber || '',
      lastAttendanceMarked: 'Never',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('teachers').insertOne(newTeacher);

    return NextResponse.json({
      success: true,
      message: 'Teacher created successfully',
      teacher: {
        id: nextId,
        email: email,
        name: `${firstName} ${lastName}`.trim(),
        subjects: subjects || [],
      },
    });
  } catch (error: any) {
    console.error('Error creating teacher:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create teacher' },
      { status: 500 }
    );
  }
}
