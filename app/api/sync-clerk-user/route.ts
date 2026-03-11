import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

// This API syncs Clerk users to MongoDB with numeric IDs
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { className, rollNo, parentNumber, subjects } = body;

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const role = (user.publicMetadata?.role as string)?.toLowerCase() || 'student';
    const email = user.emailAddresses[0]?.emailAddress || '';

    // Check if user already exists in MongoDB
    const existingUser = await db.collection('users').findOne({
      $or: [
        { clerkId: userId },
        { email: email }
      ]
    });

    if (existingUser) {
      // Update existing user
      const updateData: any = {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: email,
        role: role,
        updatedAt: new Date(),
      };

      if (role === 'student') {
        if (className) updateData.class = className;
        if (rollNo) updateData.rollNo = rollNo;
        if (parentNumber) updateData.parentNumber = parentNumber;
      } else if (role === 'teacher') {
        if (subjects) updateData.subjects = Array.isArray(subjects) ? subjects : subjects.split(',').map((s: string) => s.trim());
      }

      await db.collection('users').updateOne(
        { _id: existingUser._id },
        { $set: updateData }
      );

      return NextResponse.json({
        success: true,
        message: 'User updated successfully',
        user: {
          id: existingUser.id,
          clerkId: userId,
          ...updateData
        }
      });
    } else {
      // Create new user with numeric ID
      const lastUser = await db
        .collection('users')
        .find({})
        .sort({ id: -1 })
        .limit(1)
        .toArray();
      const nextId = lastUser.length > 0 && lastUser[0].id ? lastUser[0].id + 1 : 1;

      const newUser: any = {
        id: nextId,
        clerkId: userId,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: email,
        role: role,
        faceRegistered: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (role === 'student') {
        newUser.class = className || 'Not Assigned';
        newUser.rollNo = rollNo || 'N/A';
        newUser.parentNumber = parentNumber || '';
      } else if (role === 'teacher') {
        newUser.subjects = subjects ? (Array.isArray(subjects) ? subjects : subjects.split(',').map((s: string) => s.trim())) : [];
        newUser.classes = [];
      }

      await db.collection('users').insertOne(newUser);

      return NextResponse.json({
        success: true,
        message: 'User synced successfully',
        user: {
          id: nextId,
          clerkId: userId,
          ...newUser
        }
      });
    }
  } catch (error: any) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync user' },
      { status: 500 }
    );
  }
}

// GET - Get current user's MongoDB data
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const user = await db.collection('users').findOne({ clerkId: userId });

    if (!user) {
      return NextResponse.json({
        success: false,
        synced: false,
        message: 'User not synced to MongoDB yet'
      });
    }

    return NextResponse.json({
      success: true,
      synced: true,
      user: {
        id: user.id,
        clerkId: user.clerkId,
        name: user.name,
        email: user.email,
        role: user.role,
        class: user.class,
        rollNo: user.rollNo,
        parentNumber: user.parentNumber,
        subjects: user.subjects,
        faceRegistered: user.faceRegistered
      }
    });
  } catch (error: any) {
    console.error('Error getting user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get user' },
      { status: 500 }
    );
  }
}
