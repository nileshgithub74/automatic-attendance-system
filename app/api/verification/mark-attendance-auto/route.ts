import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, presentStudents, absentStudents, totalImages, threshold, date } = body;

    console.log('📝 Marking attendance automatically...');
    console.log(`Session: ${sessionId}`);
    console.log(`Date: ${date}`);
    console.log(`Present: ${presentStudents.length}, Absent: ${absentStudents.length}`);

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const attendanceCollection = db.collection('attendance');
    const today = date || new Date().toISOString().split('T')[0];

    // Mark present students
    for (const student of presentStudents) {
      await attendanceCollection.updateOne(
        {
          studentId: student.studentId,
          date: today
        },
        {
          $set: {
            studentId: student.studentId,
            studentName: student.name,
            date: today,
            status: 'present',
            method: 'ai_face_recognition',
            aiVerified: true,
            sessionId: sessionId,
            detectionCount: student.detectionCount,
            detectionPercentage: student.percentage,
            totalImages: totalImages,
            threshold: threshold,
            timestamp: new Date(),
            markedAt: new Date()
          }
        },
        { upsert: true }
      );
      console.log(`✅ Marked ${student.name} as PRESENT (${student.detectionCount}/${totalImages} photos)`);
    }

    // Mark absent students
    for (const student of absentStudents) {
      await attendanceCollection.updateOne(
        {
          studentId: student.studentId,
          date: today
        },
        {
          $set: {
            studentId: student.studentId,
            studentName: student.name,
            date: today,
            status: 'absent',
            method: 'ai_face_recognition',
            aiVerified: true,
            sessionId: sessionId,
            detectionCount: student.detectionCount,
            detectionPercentage: Math.round((student.detectionCount / totalImages) * 100),
            totalImages: totalImages,
            threshold: threshold,
            reason: `Not detected in enough photos (${student.detectionCount}/${totalImages})`,
            timestamp: new Date(),
            markedAt: new Date()
          }
        },
        { upsert: true }
      );
      console.log(`❌ Marked ${student.name} as ABSENT (${student.detectionCount}/${totalImages} photos)`);
    }

    console.log('✅ Attendance marking completed');

    return NextResponse.json({
      success: true,
      message: 'Attendance marked successfully',
      summary: {
        totalStudents: presentStudents.length + absentStudents.length,
        present: presentStudents.length,
        absent: absentStudents.length,
        threshold: `${threshold}/${totalImages} photos`,
        date: today
      },
      presentStudents: presentStudents.map(s => ({
        name: s.name,
        detectionCount: s.detectionCount,
        percentage: s.percentage
      })),
      absentStudents: absentStudents.map(s => ({
        name: s.name,
        detectionCount: s.detectionCount
      }))
    });
  } catch (error: any) {
    console.error('❌ Error marking attendance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark attendance' },
      { status: 500 }
    );
  }
}
