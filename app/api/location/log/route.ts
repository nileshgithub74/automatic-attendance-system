import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { calculateDistance } from '@/lib/locationUtils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      userId,
      userRole,
      location
    } = body;

    if (!sessionId || !userId || !location) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Get session to get classroom location
    const session = await db.collection('verificationSessions').findOne({
      sessionId
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    let distanceFromClassroom = 0;
    let withinAllowedRadius = true;

    if (session.classroomLocation) {
      // Calculate distance from classroom
      distanceFromClassroom = calculateDistance(
        location.latitude,
        location.longitude,
        session.classroomLocation.latitude,
        session.classroomLocation.longitude
      );

      // Check if within allowed radius
      const allowedRadius = session.config.allowedRadius || 30;
      withinAllowedRadius = distanceFromClassroom <= allowedRadius;
    }

    // Get device info from headers
    const userAgent = request.headers.get('user-agent') || '';
    const deviceInfo = {
      userAgent,
      platform: userAgent.includes('Mobile') ? 'mobile' : 'desktop',
      isMobile: userAgent.includes('Mobile')
    };

    // Create location log
    const locationLog = {
      sessionId,
      userId: new ObjectId(userId),
      userRole: userRole || 'student',
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || 0,
        altitude: location.altitude || 0,
        heading: location.heading || 0,
        speed: location.speed || 0
      },
      distanceFromClassroom,
      withinAllowedRadius,
      deviceInfo,
      timestamp: new Date(),
      createdAt: new Date()
    };

    await db.collection('locationLogs').insertOne(locationLog);

    // If student is outside radius, flag their verification result
    if (!withinAllowedRadius && userRole === 'student') {
      await db.collection('verificationResults').updateOne(
        { sessionId, studentId: new ObjectId(userId) },
        {
          $push: {
            flags: {
              type: 'location',
              severity: 'high',
              message: `Student is ${Math.round(distanceFromClassroom)}m away from classroom (allowed: ${session.config.allowedRadius}m)`,
              timestamp: new Date()
            }
          }
        },
        { upsert: true }
      );
    }

    return NextResponse.json({
      success: true,
      distanceFromClassroom: Math.round(distanceFromClassroom * 100) / 100,
      withinRadius: withinAllowedRadius,
      flagged: !withinAllowedRadius
    });

  } catch (error: any) {
    console.error('Location log error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const query: any = { sessionId };
    if (userId) {
      query.userId = new ObjectId(userId);
    }

    const logs = await db.collection('locationLogs')
      .find(query)
      .sort({ timestamp: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      logs
    });

  } catch (error: any) {
    console.error('Get location logs error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
