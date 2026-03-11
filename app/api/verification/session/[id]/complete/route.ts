import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Get session
    const session = await db.collection('verificationSessions').findOne({
      sessionId
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get all verification results for this session
    const results = await db.collection('verificationResults').find({
      sessionId
    }).toArray();

    // Apply 50% rule and determine final status
    const minAppearancePercentage = session.config.minAppearancePercentage || 50;
    
    let presentCount = 0;
    let absentCount = 0;
    let flaggedCount = 0;

    for (const result of results) {
      const isPresent = result.appearancePercentage >= minAppearancePercentage;
      const finalStatus = isPresent ? 'verified_present' : 'verified_absent';

      // Update result
      await db.collection('verificationResults').updateOne(
        { _id: result._id },
        {
          $set: {
            markedPresent: isPresent,
            status: isPresent ? 'present' : 'absent',
            finalStatus,
            updatedAt: new Date()
          }
        }
      );

      if (isPresent) {
        presentCount++;
      } else {
        absentCount++;
      }

      if (result.flags && result.flags.length > 0) {
        flaggedCount++;
      }
    }

    // Get all students in class to mark absent those who didn't appear
    const allStudents = await db.collection('users').find({
      classId: session.classId,
      role: 'student'
    }).toArray();

    const detectedStudentIds = results.map(r => r.studentId.toString());

    for (const student of allStudents) {
      if (!detectedStudentIds.includes(student._id.toString())) {
        // Student didn't appear in any image - mark absent
        await db.collection('verificationResults').insertOne({
          sessionId,
          studentId: student._id,
          studentName: student.name,
          studentRollNumber: student.rollNumber || student.email,
          totalImages: session.totalImages,
          appearanceCount: 0,
          appearancePercentage: 0,
          status: 'absent',
          markedPresent: false,
          appearances: [],
          flags: [{
            type: 'not_detected',
            severity: 'high',
            message: 'Student not detected in any image',
            timestamp: new Date()
          }],
          finalStatus: 'verified_absent',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        absentCount++;
        flaggedCount++;
      }
    }

    // Update session with final results
    await db.collection('verificationSessions').updateOne(
      { sessionId },
      {
        $set: {
          status: 'completed',
          endTime: new Date(),
          'results.totalStudents': allStudents.length,
          'results.presentCount': presentCount,
          'results.absentCount': absentCount,
          'results.flaggedCount': flaggedCount,
          updatedAt: new Date()
        }
      }
    );

    // Create audit log
    await db.collection('auditLogs').insertOne({
      sessionId,
      userId: session.teacherId,
      userRole: 'teacher',
      action: 'session_completed',
      details: {
        totalStudents: allStudents.length,
        presentCount,
        absentCount,
        flaggedCount
      },
      timestamp: new Date(),
      createdAt: new Date()
    });

    return NextResponse.json({
      success: true,
      results: {
        totalStudents: allStudents.length,
        presentCount,
        absentCount,
        flaggedCount,
        attendanceRate: Math.round((presentCount / allStudents.length) * 100)
      }
    });

  } catch (error: any) {
    console.error('Complete session error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
