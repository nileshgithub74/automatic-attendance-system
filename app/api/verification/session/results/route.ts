// API Route: Get Verification Session Results
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

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

    // Get session info
    const session = await db.collection('verification_sessions').findOne({ sessionId });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get verification results
    const verifications = await db
      .collection('attendance_verifications')
      .find({ sessionId })
      .toArray();

    // Format results for the frontend
    const results = verifications.map((v: any) => ({
      studentId: v.studentId,
      studentName: v.studentName,
      detectionCount: v.detectionCount,
      totalImages: v.totalImages,
      detectionPercentage: Math.round(v.detectionPercentage),
      status: v.status,
      averageSimilarity: v.averageSimilarity,
      flags: v.flags || [],
    }));

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        className: session.className,
        date: session.startTime,
        status: session.status,
        duration: session.duration,
        totalImages: session.totalImages,
      },
      results,
      summary: {
        total: results.length,
        present: results.filter((r: any) => r.status === 'present').length,
        absent: results.filter((r: any) => r.status === 'absent').length,
        flagged: results.filter((r: any) => r.status === 'flagged').length,
      },
    });
  } catch (error) {
    console.error('Error fetching verification results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification results' },
      { status: 500 }
    );
  }
}
