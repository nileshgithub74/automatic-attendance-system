import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, verificationResults } = await request.json();

    if (!sessionId || !verificationResults) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const attendanceCollection = db.collection('attendance');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let verifiedCount = 0;
    let updatedCount = 0;

    // Process each verification result
    for (const result of verificationResults.results) {
      try {
        // Find the student's attendance record for today
        const attendanceRecord = await attendanceCollection.findOne({
          studentId: result.studentId,
          date: { $gte: today, $lt: tomorrow },
          method: 'face_recognition'
        });

        if (attendanceRecord) {
          // Update the attendance record with AI verification results
          const updateData: any = {
            aiVerified: true,
            aiVerificationStatus: result.status,
            aiConfidence: result.averageConfidence,
            aiDetectionCount: result.detectionCount,
            aiTotalImages: result.totalImages,
            aiFlags: result.flags,
            aiProcessedAt: new Date(),
            verificationSessionId: sessionId,
            markedAt: new Date(), // Update the marked time to current verification time
          };

          // If AI says student is NOT present, update status to absent
          if (!result.isPresent) {
            updateData.status = 'absent';
            updateData.aiReason = 'Not detected in classroom images';
          }

          await attendanceCollection.updateOne(
            { _id: attendanceRecord._id },
            { $set: updateData }
          );

          updatedCount++;
          if (result.isPresent) {
            verifiedCount++;
          }

          console.log(`Updated attendance for student ${result.studentId}: ${result.isPresent ? 'verified present' : 'marked absent'}`);
        } else {
          console.log(`No attendance record found for student ${result.studentId}`);
        }
      } catch (error) {
        console.error(`Error updating attendance for student ${result.studentId}:`, error);
      }
    }

    // Store verification session summary
    const verificationSessionsCollection = db.collection('verification_sessions');
    await verificationSessionsCollection.insertOne({
      sessionId,
      teacherId: userId,
      processedAt: new Date(),
      totalStudents: verificationResults.results.length,
      verifiedPresent: verifiedCount,
      markedAbsent: verificationResults.results.length - verifiedCount,
      averageConfidence: verificationResults.summary.averageConfidence,
      totalImages: verificationResults.totalImages,
      results: verificationResults.results,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      verified: verifiedCount,
      updated: updatedCount,
      total: verificationResults.results.length,
      summary: {
        verifiedPresent: verifiedCount,
        markedAbsent: verificationResults.results.length - verifiedCount,
        averageConfidence: verificationResults.summary.averageConfidence,
      },
    });

  } catch (error) {
    console.error('Error updating attendance with AI results:', error);
    return NextResponse.json(
      { error: 'Failed to update attendance' },
      { status: 500 }
    );
  }
}