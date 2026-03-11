import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      teacherId,
      classId,
      courseId,
      duration = 5,
      totalImages = 10,
      config = {},
      classroomLocation
    } = body;

    // Validate required fields
    if (!teacherId || !classId) {
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

    // Generate unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate capture interval (duration in minutes / totalImages)
    const captureInterval = Math.floor((duration * 60) / totalImages);

    // Create session document
    const session = {
      sessionId,
      teacherId: new ObjectId(teacherId),
      classId: new ObjectId(classId),
      courseId: courseId ? new ObjectId(courseId) : null,
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(Date.now() + duration * 60 * 1000),
      duration,
      totalImages,
      captureInterval,
      status: 'active',
      classroomLocation: classroomLocation || null,
      config: {
        minAppearancePercentage: config.minAppearancePercentage || 50,
        allowedRadius: config.allowedRadius || 30,
        requireLocation: config.requireLocation !== false,
        requireNetworkCheck: config.requireNetworkCheck !== false
      },
      results: {
        totalStudents: 0,
        presentCount: 0,
        absentCount: 0,
        flaggedCount: 0,
        processedImages: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert session
    const result = await db.collection('verificationSessions').insertOne(session);

    // Create audit log
    await db.collection('auditLogs').insertOne({
      sessionId,
      userId: new ObjectId(teacherId),
      userRole: 'teacher',
      action: 'session_started',
      details: { duration, totalImages },
      timestamp: new Date(),
      createdAt: new Date()
    });

    return NextResponse.json({
      success: true,
      sessionId,
      captureInterval,
      message: 'Verification session created successfully'
    });

  } catch (error: any) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
