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

    if (role !== 'Principal' && role !== 'Admin' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin/Principal access only' }, { status: 403 });
    }

    const body = await request.json();
    const {
      email,
      firstName,
      lastName,
      phoneNumber,
      childrenIds,
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

    // Check if email already exists in parents collection
    const existingParent = await db.collection('parents').findOne({ email: email });
    if (existingParent) {
      return NextResponse.json(
        { error: 'A parent with this email already exists' },
        { status: 409 }
      );
    }

    // Save to parents collection
    const lastParent = await db
      .collection('parents')
      .find({})
      .sort({ id: -1 })
      .limit(1)
      .toArray();
    const nextId = lastParent.length > 0 ? lastParent[0].id + 1 : 1;

    const newParent = {
      id: nextId,
      name: `${firstName} ${lastName}`.trim(),
      firstName: firstName,
      lastName: lastName,
      email: email,
      phoneNumber: phoneNumber || '',
      childrenIds: childrenIds || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('parents').insertOne(newParent);

    return NextResponse.json({
      success: true,
      message: 'Parent created successfully',
      parent: {
        id: nextId,
        email: email,
        name: `${firstName} ${lastName}`.trim(),
        childrenIds: childrenIds || [],
      },
    });
  } catch (error: any) {
    console.error('Error creating parent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create parent' },
      { status: 500 }
    );
  }
}
