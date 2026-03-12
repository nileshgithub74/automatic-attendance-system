// API Route: Complete Verification Session and Update Attendance
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

    // Check if user is a teacher
    const role = user.publicMetadata?.role as string;
    if (role !== 'Teacher' && role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can complete verification sessions' }, { status: 403 });
    }

    const body = await request.json();
    const { sessionId, verificationResults } = body;

    if (!sessionId || !verificationResults) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Update session status to completed
    await db.collection('verification_sessions').updateOne(
      { sessionId },
      {
        $set: {
          status: 'completed',
          endTime: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    // Process verification results and update attendance
    const attendanceUpdates = [];
    const today = new Date().toISOString().split('T')[0];

    for (const result of verificationResults) {
      const { studentId, studentName, detectionCount, totalImages, status, averageSimilarity, flags } = result;

      // Calculate detection percentage
      const detectionPercentage = (detectionCount / totalImages) * 100;

      // Determine final status
      let finalStatus: 'present' | 'absent' | 'flagged' = 'absent';
      if (detectionPercentage >= 50) {
        finalStatus = flags.length > 0 ? 'flagged' : 'present';
      }

      // Create attendance verification record
      const verificationRecord = {
        sessionId,
        studentId,
        studentName,
        date: new Date(),
        totalImages,
        detectedInImages: result.detectedInImages || [],
        detectionCount,
        detectionPercentage,
        averageSimilarity,
        status: finalStatus,
        verificationMethod: 'ai_face_recognition',
        flags: flags || [],
        verifiedAt: new Date(),
        createdAt: new Date(),
      };

      // Store verification record
      await db.collection('attendance_verifications').insertOne(verificationRecord);

      // Check if student has pending attendance for today
      const existingAttendance = await db.collection('attendance').findOne({
        studentId: studentId.toString(),
        date: today,
      });

      if (existingAttendance) {
        // Update existing attendance (including pending ones)
        await db.collection('attendance').updateOne(
          { studentId: studentId.toString(), date: today },
          {
            $set: {
              status: finalStatus === 'flagged' ? 'present' : finalStatus,
              method: 'ai_verification',
              verificationSessionId: sessionId,
              detectionPercentage,
              averageSimilarity,
              flags: flags || [],
              teacherId: userId,
              teacherName: `${user.firstName} ${user.lastName}`,
              verifiedAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );
      } else {
        // Insert new attendance record for students not marked yet
        const attendanceRecord = {
          studentId: studentId.toString(),
          studentName,
          status: finalStatus === 'flagged' ? 'present' : finalStatus,
          date: today,
          teacherId: userId,
          teacherName: `${user.firstName} ${user.lastName}`,
          markedAt: new Date(),
          method: 'ai_verification',
          verificationSessionId: sessionId,
          detectionPercentage,
          averageSimilarity,
          flags: flags || [],
          createdAt: new Date(),
        };
        await db.collection('attendance').insertOne(attendanceRecord);
      }

      attendanceUpdates.push({
        studentId,
        studentName,
        status: finalStatus,
        detectionPercentage,
        wasPending: existingAttendance?.status === 'pending',
      });
    }

    console.log(`✅ Verification session ${sessionId} completed. Updated ${attendanceUpdates.length} attendance records.`);

    return NextResponse.json({
      success: true,
      message: 'Verification session completed and attendance updated',
      sessionId,
      attendanceUpdates,
      summary: {
        total: attendanceUpdates.length,
        present: attendanceUpdates.filter(a => a.status === 'present').length,
        absent: attendanceUpdates.filter(a => a.status === 'absent').length,
        flagged: attendanceUpdates.filter(a => a.status === 'flagged').length,
      },
    });
  } catch (error) {
    console.error('Error completing verification session:', error);
    return NextResponse.json(
      { error: 'Failed to complete verification session' },
      { status: 500 }
    );
  }
}

// GET - Get completion status
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

    return NextResponse.json({
      success: true,
      session,
      verifications,
      summary: {
        total: verifications.length,
        present: verifications.filter((v: any) => v.status === 'present').length,
        absent: verifications.filter((v: any) => v.status === 'absent').length,
        flagged: verifications.filter((v: any) => v.status === 'flagged').length,
      },
    });
  } catch (error) {
    console.error('Error fetching completion status:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
