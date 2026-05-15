import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { extractEmbedding } from '@/lib/aiService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const studentId = formData.get('studentId') as string;
    const images = formData.getAll('images') as File[];

    if (!studentId || images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing studentId or images' },
        { status: 400 }
      );
    }

    if (images.length < 3) {
      return NextResponse.json(
        { success: false, error: 'At least 3 images required' },
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

    // Get student info
    const student = await db.collection('users').findOne({
      _id: new ObjectId(studentId)
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    // Process each image and extract embeddings
    const embeddings = [];
    let totalQuality = 0;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      // Convert image to base64
      const buffer = await image.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const imageBase64 = `data:${image.type};base64,${base64}`;

      try {
        // Extract embedding using AI service
        const result = await extractEmbedding(imageBase64);

        if (result.faceDetected && result.embedding.length > 0) {
          embeddings.push({
            embedding: result.embedding,
            imageUrl: null, // Store in cloud storage if needed
            captureDate: new Date(),
            quality: result.quality,
            model: 'FaceNet'
          });
          totalQuality += result.quality;
        } else {
          console.warn(`No face detected in image ${i + 1}`);
        }
      } catch (error) {
        console.error(`Error processing image ${i + 1}:`, error);
      }
    }

    if (embeddings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No faces detected in any image' },
        { status: 400 }
      );
    }

    // Calculate average embedding
    const embeddingLength = embeddings[0].embedding.length;
    const averageEmbedding = new Array(embeddingLength).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < embeddingLength; i++) {
        averageEmbedding[i] += emb.embedding[i];
      }
    }

    for (let i = 0; i < embeddingLength; i++) {
      averageEmbedding[i] /= embeddings.length;
    }

    const averageQuality = totalQuality / embeddings.length;

    // Store in database
    const faceEmbeddingDoc = {
      studentId: new ObjectId(studentId),
      studentName: student.name,
      studentRollNumber: student.rollNumber || student.email,
      embeddings,
      averageEmbedding,
      totalImages: embeddings.length,
      lastUpdated: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Upsert (update if exists, insert if not)
    await db.collection('faceEmbeddings').updateOne(
      { studentId: new ObjectId(studentId) },
      { $set: faceEmbeddingDoc },
      { upsert: true }
    );

    // Update user record
    await db.collection('users').updateOne(
      { _id: new ObjectId(studentId) },
      { 
        $set: { 
          faceRegistered: true,
          faceRegisteredAt: new Date()
        } 
      }
    );

    return NextResponse.json({
      success: true,
      embeddingsCreated: embeddings.length,
      averageQuality: Math.round(averageQuality * 100) / 100,
      message: 'Face registered successfully'
    });

  } catch (error: any) {
    console.error('Face registration error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Missing studentId' },
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

    const faceData = await db.collection('faceEmbeddings').findOne({
      studentId: new ObjectId(studentId)
    });

    if (!faceData) {
      return NextResponse.json(
        { success: false, error: 'Face not registered' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      studentId: faceData.studentId,
      totalEmbeddings: faceData.totalImages,
      isActive: faceData.isActive,
      lastUpdated: faceData.lastUpdated
    });

  } catch (error: any) {
    console.error('Get face embeddings error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Missing studentId' },
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

    await db.collection('faceEmbeddings').deleteOne({
      studentId: new ObjectId(studentId)
    });

    await db.collection('users').updateOne(
      { _id: new ObjectId(studentId) },
      { 
        $set: { 
          faceRegistered: false,
          faceRegisteredAt: null
        } 
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Face embeddings deleted'
    });

  } catch (error: any) {
    console.error('Delete face embeddings error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
