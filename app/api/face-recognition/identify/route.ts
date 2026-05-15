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

    console.log('🔍 [Face Recognition] Starting face identification...');

    // Step 1: Extract embedding from the captured face image
    let capturedEmbedding: number[];
    try {
      const result = await extractEmbedding(faceImage);
      console.log('📊 [Face Recognition] Embedding extraction result:', {
        faceDetected: result.faceDetected,
        embeddingLength: result.embedding.length,
        quality: result.quality
      });
      
      if (!result.faceDetected || result.embedding.length === 0) {
        console.log('❌ [Face Recognition] No face detected in image');
        return NextResponse.json({
          success: true,
          recognized: false,
          message: 'Looking for your face...',
        });
      }
      capturedEmbedding = result.embedding;
    } catch (err) {
      console.error('❌ [Face Recognition] Embedding extraction failed:', err);
      return NextResponse.json({
        success: true,
        recognized: false,
        message: 'Looking for your face...',
      });
    }

    // Step 2: Get all registered face embeddings from database
    const faceEmbeddings = await db.collection('faceEmbeddings')
      .find({ isActive: true })
      .toArray();

    console.log(`📚 [Face Recognition] Found ${faceEmbeddings.length} registered faces in database`);

    if (faceEmbeddings.length === 0) {
      console.log('⚠️ [Face Recognition] No registered faces in system');
      return NextResponse.json({
        success: true,
        recognized: false,
        message: 'No registered faces found. Please register your face first.',
      });
    }

    // Step 3: Compare captured embedding against all stored embeddings
    const THRESHOLD = 0.6; // Distance threshold — lower means stricter matching
    let bestMatch: any = null;
    let bestDistance = Infinity;

    console.log('🔄 [Face Recognition] Comparing against registered faces...');

    for (const record of faceEmbeddings) {
      if (!record.averageEmbedding || record.averageEmbedding.length === 0) continue;

      const distance = euclideanDistance(capturedEmbedding, record.averageEmbedding);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = record;
      }
    }

    console.log('📏 [Face Recognition] Best match distance:', bestDistance, 'Threshold:', THRESHOLD);

    // Step 4: Check if best match is within threshold
    if (bestMatch && bestDistance <= THRESHOLD) {
      const confidence = distanceToConfidence(bestDistance);

      // Get full student details from users collection
      const student = await db.collection('users').findOne({
        _id: bestMatch.studentId
      });

      if (!student) {
        console.log('❌ [Face Recognition] Student record not found for match');
        return NextResponse.json({
          success: true,
          recognized: false,
          message: 'Looking for your face...',
        });
      }

      console.log('✅ [Face Recognition] Face matched!', {
        studentName: student.name,
        confidence: confidence,
        distance: bestDistance
      });

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
    console.log('❌ [Face Recognition] No match found within threshold');
    return NextResponse.json({
      success: true,
      recognized: false,
      message: 'Looking for your face...',
    });

  } catch (error) {
    console.error('Error in face recognition:', error);
    return NextResponse.json(
      { error: 'Face recognition failed' },
      { status: 500 }
    );
  }
}
