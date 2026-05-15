import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string;
    const sequenceNumber = parseInt(formData.get('sequenceNumber') as string);
    const timestamp = formData.get('timestamp') as string;
    const image = formData.get('image') as File;

    if (!sessionId || !sequenceNumber || !image) {
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

    // Verify session exists and is active
    const session = await db.collection('verificationSessions').findOne({
      sessionId,
      status: 'active'
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found or inactive' },
        { status: 404 }
      );
    }

    // Convert image to base64 for storage (or upload to cloud storage)
    const buffer = await image.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const imageData = `data:${image.type};base64,${base64}`;

    // Upload to Cloudinary
    const { uploadToCloudinary } = await import('@/lib/cloudinary');
    const uploadResult = await uploadToCloudinary(
      imageData,
      `verification-sessions/${sessionId}`,
      `capture_${sequenceNumber}_${Date.now()}`
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to upload image to cloud storage' },
        { status: 500 }
      );
    }

    // Get image dimensions
    const imageSize = buffer.byteLength;

    // Create captured image document
    const capturedImage = {
      sessionId,
      imageUrl: uploadResult.secureUrl, // Cloudinary URL
      imageData: null, // Don't store base64 in MongoDB anymore
      cloudinaryPublicId: uploadResult.publicId,
      captureTime: new Date(timestamp),
      sequenceNumber,
      processed: false,
      processingTime: null,
      facesDetected: 0,
      detectedStudents: [],
      imageSize,
      resolution: {
        width: 1280, // Get from actual image if needed
        height: 720
      },
      cloudStorage: 'cloudinary',
      createdAt: new Date()
    };

    // Insert image
    const result = await db.collection('capturedImages').insertOne(capturedImage);
    const imageId = result.insertedId.toString();

    // Trigger async processing (fetch image from Cloudinary URL)
    processImageAsync(imageId, sessionId, uploadResult.secureUrl!);

    return NextResponse.json({
      success: true,
      imageId,
      imageUrl: uploadResult.secureUrl,
      uploaded: true,
      processing: true
    });

  } catch (error: any) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Async function to process image with AI
async function processImageAsync(imageId: string, sessionId: string, imageData: string) {
  try {
    // Call the process endpoint
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/verification/image/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageId,
        sessionId
      })
    });
  } catch (error) {
    console.error('Async processing error:', error);
  }
}
