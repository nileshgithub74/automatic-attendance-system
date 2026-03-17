import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user.publicMetadata?.role as string;
    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Teachers can only see their own sessions, admins can see all
    const query = role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'principal'
      ? {}
      : { teacherId: userId };

    const sessions = await db
      .collection('verification_sessions')
      .find(query)
      .sort({ startTime: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      sessions: sessions.map(session => ({
        sessionId: session.sessionId,
        className: session.className,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        status: session.status,
        totalImages: session.totalImages,
        capturedImages: session.capturedImages,
        processedImages: session.processedImages,
        studentsMarked: session.studentsMarked,
        summary: session.summary
      }))
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
