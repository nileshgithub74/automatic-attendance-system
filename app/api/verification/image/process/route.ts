import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { recognizeFaces } from '@/lib/aiService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageId, sessionId } = body;

    if (!imageId || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing imageId or sessionId' },
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

    // Get the captured image
    const capturedImage = await db.collection('capturedImages').findOne({
      _id: new ObjectId(imageId)
    });

    if (!capturedImage) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    // Get session details
    const session = await db.collection('verificationSessions').findOne({
      sessionId
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get all students in the class with face embeddings
    const students = await db.collection('users').find({
      classId: session.classId,
      role: 'student',
      faceRegistered: true
    }).toArray();

    if (students.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No students with registered faces found' },
        { status: 404 }
      );
    }

    // Get face embeddings for all students
    const studentIds = students.map(s => s._id);
    const faceEmbeddings = await db.collection('faceEmbeddings').find({
      studentId: { $in: studentIds },
      isActive: true
    }).toArray();

    // Prepare embeddings for AI service
    const embeddingsData = faceEmbeddings.map(fe => ({
      studentId: fe.studentId.toString(),
      embedding: fe.averageEmbedding
    }));

    // Call AI service to recognize faces
    const startTime = Date.now();
    const recognitionResult = await recognizeFaces(
      capturedImage.imageData,
      embeddingsData,
      0.6 // threshold
    );
    const processingTime = Date.now() - startTime;

    // Update captured image with results
    await db.collection('capturedImages').updateOne(
      { _id: new ObjectId(imageId) },
      {
        $set: {
          processed: true,
          processingTime: new Date(),
          facesDetected: recognitionResult.matches.length,
          detectedStudents: recognitionResult.matches.map(match => ({
            studentId: new ObjectId(match.studentId),
            confidence: match.confidence,
            boundingBox: match.boundingBox
          }))
        }
      }
    );

    // Update or create verification results for each detected student
    for (const match of recognitionResult.matches) {
      const studentId = new ObjectId(match.studentId);
      const student = students.find(s => s._id.toString() === match.studentId);

      // Check if result already exists
      const existingResult = await db.collection('verificationResults').findOne({
        sessionId,
        studentId
      });

      if (existingResult) {
        // Update existing result
        const newAppearanceCount = existingResult.appearanceCount + 1;
        const newAppearancePercentage = (newAppearanceCount / session.totalImages) * 100;

        await db.collection('verificationResults').updateOne(
          { sessionId, studentId },
          {
            $set: {
              appearanceCount: newAppearanceCount,
              appearancePercentage: newAppearancePercentage,
              updatedAt: new Date()
            },
            $push: {
              appearances: {
                imageId: new ObjectId(imageId),
                sequenceNumber: capturedImage.sequenceNumber,
                confidence: match.confidence,
                timestamp: new Date()
              }
            }
          }
        );
      } else {
        // Create new result
        await db.collection('verificationResults').insertOne({
          sessionId,
          studentId,
          studentName: student?.name || 'Unknown',
          studentRollNumber: student?.rollNumber || student?.email,
          totalImages: session.totalImages,
          appearanceCount: 1,
          appearancePercentage: (1 / session.totalImages) * 100,
          status: 'pending',
          markedPresent: false,
          appearances: [{
            imageId: new ObjectId(imageId),
            sequenceNumber: capturedImage.sequenceNumber,
            confidence: match.confidence,
            timestamp: new Date()
          }],
          flags: [],
          finalStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    // Update session processed images count
    await db.collection('verificationSessions').updateOne(
      { sessionId },
      {
        $inc: { 'results.processedImages': 1 }
      }
    );

    return NextResponse.json({
      success: true,
      facesDetected: recognitionResult.matches.length,
      students: recognitionResult.matches.map(m => ({
        studentId: m.studentId,
        confidence: m.confidence,
        boundingBox: m.boundingBox
      })),
      processingTime: processingTime / 1000 // seconds
    });

  } catch (error: any) {
    console.error('Image processing error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
