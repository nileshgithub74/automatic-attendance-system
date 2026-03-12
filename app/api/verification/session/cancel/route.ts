// API Route: Cancel Active Verification Session
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
      return NextResponse.json({ error: 'Only teachers and admins can cancel verification sessions' }, { status: 403 });
    }

    const body = await request.json();
    const { sessionId } = body;

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Find the session
    const session = await db.collection('verification_sessions').findOne({ sessionId });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user owns the session or is admin
    if (session.teacherId !== userId && role !== 'Admin' && role !== 'admin') {
      return NextResponse.json({ error: 'You can only cancel your own sessions' }, { status: 403 });
    }

    // Update session status to cancelled
    await db.collection('verification_sessions').updateOne(
      { sessionId },
      {
        $set: {
          status: 'cancelled',
          endTime: new Date(),
          cancelledBy: userId,
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    console.log(`✅ Verification session cancelled: ${sessionId} by ${user.firstName} ${user.lastName}`);

    return NextResponse.json({
      success: true,
      message: 'Verification session cancelled successfully',
      sessionId,
    });
  } catch (error) {
    console.error('Error cancelling verification session:', error);
    return NextResponse.json(
      { error: 'Failed to cancel verification session' },
      { status: 500 }
    );
  }
}

// GET - Get user's active session
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

    // Find user's active session
    const activeSession = await db.collection('verification_sessions').findOne({
      teacherId: userId,
      status: 'active'
    });

    return NextResponse.json({ 
      success: true, 
      hasActiveSession: !!activeSession,
      activeSession: activeSession || null
    });
  } catch (error) {
    console.error('Error fetching active session:', error);
    return NextResponse.json({ error: 'Failed to fetch active session' }, { status: 500 });
  }
}