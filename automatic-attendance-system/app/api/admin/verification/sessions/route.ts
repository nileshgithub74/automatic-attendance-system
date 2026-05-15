import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch real data from MongoDB
    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ sessions: [] });
    }
    
    const allSessions = await db.collection('verification_sessions').find({}).sort({ startTime: -1 }).toArray();

    // Remove duplicates - keep only the newest session per teacher/class combination
    const sessionMap = new Map();
    const uniqueSessions = [];
    
    for (const session of allSessions) {
      const key = `${session.teacherId}_${session.classId}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, true);
        uniqueSessions.push(session);
      }
    }

    return NextResponse.json({
      success: true,
      sessions: uniqueSessions || []
    });
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
