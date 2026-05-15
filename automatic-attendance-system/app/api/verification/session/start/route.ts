// API Route: Start Verification Session
import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a teacher or admin
    const role = user.publicMetadata?.role as string;
    if (role !== 'Teacher' && role !== 'teacher' && role !== 'Admin' && role !== 'admin') {
      return NextResponse.json({ error: 'Only teachers and admins can start verification sessions' }, { status: 403 });
    }

    const body = await request.json();
    const { classId, className, duration, location, studentsMarked } = body;

    // Validate required fields
    if (!classId || !className || !duration || !location || !studentsMarked) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate duration (5-10 minutes)
    if (duration < 5 || duration > 10) {
      return NextResponse.json({ error: 'Duration must be between 5 and 10 minutes' }, { status: 400 });
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Check if user already has an active session
    const existingSession = await db.collection('verification_sessions').findOne({
      teacherId: userId,
      status: 'active'
    });

    if (existingSession) {
      return NextResponse.json({ 
        error: 'You already have an active verification session. Please complete or cancel the existing session first.',
        existingSession: {
          sessionId: existingSession.sessionId,
          startTime: existingSession.startTime,
          endTime: existingSession.endTime,
          className: existingSession.className
        }
      }, { status: 409 });
    }

    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate total images (1 image every 30 seconds)
    const totalImages = Math.floor((duration * 60) / 30);

    // Create session document
    const session = {
      sessionId,
      teacherId: userId,
      teacherName: `${user.firstName} ${user.lastName}`,
      classId,
      className,
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(Date.now() + duration * 60 * 1000),
      duration,
      status: 'active',
      totalImages,
      capturedImages: 0,
      processedImages: 0,
      studentsMarked,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('verification_sessions').insertOne(session);

    console.log(`✅ Verification session started: ${sessionId}`);

    return NextResponse.json({
      success: true,
      session: {
        sessionId,
        duration,
        totalImages,
        startTime: session.startTime,
        endTime: session.endTime,
      },
    });
  } catch (error) {
    console.error('Error starting verification session:', error);
    return NextResponse.json(
      { error: 'Failed to start verification session' },
      { status: 500 }
    );
  }
}

// GET - Get session details
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const session = await db.collection('verification_sessions').findOne({ sessionId });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}
