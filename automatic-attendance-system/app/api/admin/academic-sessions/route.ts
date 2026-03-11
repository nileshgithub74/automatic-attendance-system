import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

// GET - Fetch all academic sessions
export async function GET() {
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

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    // Get all academic sessions
    const sessions = await db
      .collection('academic_sessions')
      .find({})
      .sort({ startDate: -1 })
      .toArray();

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching academic sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch academic sessions' }, { status: 500 });
  }
}

// POST - Create new academic session
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
    const { name, startDate, endDate, isActive } = body;

    // Validate required fields
    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Name, start date, and end date are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // If setting as active, deactivate all other sessions
    if (isActive) {
      await db.collection('academic_sessions').updateMany(
        {},
        { $set: { isActive: false } }
      );
    }

    // Get next ID
    const lastSession = await db
      .collection('academic_sessions')
      .find({})
      .sort({ id: -1 })
      .limit(1)
      .toArray();
    const nextId = lastSession.length > 0 ? lastSession[0].id + 1 : 1;

    // Create new session
    const newSession = {
      id: nextId,
      name: name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('academic_sessions').insertOne(newSession);

    return NextResponse.json({
      success: true,
      message: 'Academic session created successfully',
      session: newSession,
    });
  } catch (error: any) {
    console.error('Error creating academic session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create academic session' },
      { status: 500 }
    );
  }
}

// PATCH - Update academic session (set active)
export async function PATCH(request: NextRequest) {
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
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Deactivate all sessions
    await db.collection('academic_sessions').updateMany(
      {},
      { $set: { isActive: false } }
    );

    // Activate the selected session
    await db.collection('academic_sessions').updateOne(
      { id: sessionId },
      { 
        $set: { 
          isActive: true,
          updatedAt: new Date(),
        } 
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Active session updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating academic session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update academic session' },
      { status: 500 }
    );
  }
}
