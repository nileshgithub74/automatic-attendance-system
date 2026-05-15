import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { extractEmbedding } from '@/lib/aiService';

// Calculate Euclidean distance between two embeddings
function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

// Convert distance to confidence score (0 to 1)
function distanceToConfidence(distance: number): number {
  return Math.max(0, 1 - distance / 1.5);
}

export async function POST(request: NextRequest) {
  try {
    const { faceImage } = await request.json();

    if (!faceImage) {
      return NextResponse.json({ error: 'Face image required' }, { status: 400 });
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Step 1: Extract embedding from the captured face image
    let capturedEmbedding: number[];
    try {
      const result = await extractEmbedding(faceImage);
      if (!result.faceDetected || result.embedding.length === 0) {
        return NextResponse.json({
          success: true,
          recognized: false,
          message: 'No face detected in the image. Please position your face properly.',
        });
      }
      capturedEmbedding = result.embedding;
    } catch (err) {
      console.error('Embedding extraction failed:', err);
      return NextResponse.json({
        success: true,
        recognized: false,
        message: 'Face detection failed. Please try again.',
      });
    }

    // Step 2: Get all registered face embeddings from database
    const faceEmbeddings = await db.collection('faceEmbeddings')
      .find({ isActive: true })
      .toArray();

    if (faceEmbeddings.length === 0) {
      return NextResponse.json({
        success: true,
        recognized: false,
        message: 'No registered faces found in the system.',
      });
    }

    // Step 3: Compare captured embedding against all stored embeddings
    const THRESHOLD = 0.6; // Distance threshold — lower means stricter matching
    let bestMatch: any = null;
    let bestDistance = Infinity;

    for (const record of faceEmbeddings) {
      if (!record.averageEmbedding || record.averageEmbedding.length === 0) continue;

      const distance = euclideanDistance(capturedEmbedding, record.averageEmbedding);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = record;
      }
    }

    // Step 4: Check if best match is within threshold
    if (bestMatch && bestDistance <= THRESHOLD) {
      const confidence = distanceToConfidence(bestDistance);

      // Get full student details from users collection
      const student = await db.collection('users').findOne({
        _id: bestMatch.studentId
      });

      if (!student) {
        return NextResponse.json({
          success: true,
          recognized: false,
          message: 'Student record not found.',
        });
      }

      return NextResponse.json({
        success: true,
        recognized: true,
        student: {
          id: student._id.toString(),
          name: student.name,
          rollNo: student.rollNo || student.rollNumber || 'N/A',
          class: student.class,
          email: student.email,
        },
        confidence: Math.round(confidence * 100) / 100,
        distance: Math.round(bestDistance * 1000) / 1000,
        message: `Welcome ${student.name}!`,
      });
    }

    // No match found within threshold
    return NextResponse.json({
      success: true,
      recognized: false,
      message: 'Face not recognized. Please register your face or try again.',
      suggestion: 'Contact your teacher or admin to register your face in the system.',
    });

  } catch (error) {
    console.error('Error in face recognition:', error);
    return NextResponse.json(
      { error: 'Face recognition failed' },
      { status: 500 }
    );
  }
}
