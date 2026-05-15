import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { uploadToCloudinary } from '@/lib/cloudinary';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, imageData, sequenceNumber, location, timestamp } = body;

    console.log('📸 Upload request received:', {
      sessionId: sessionId ? 'present' : 'missing',
      imageData: imageData ? `${imageData.substring(0, 50)}...` : 'missing',
      sequenceNumber,
      hasLocation: !!location
    });

    if (!sessionId || !imageData) {
      console.error('❌ Missing required fields:', { sessionId: !!sessionId, imageData: !!imageData });
      return NextResponse.json(
        { error: 'Session ID and image data are required' },
        { status: 400 }
      );
    }

    console.log(`📸 Uploading image ${sequenceNumber} for session ${sessionId}...`);

    // Upload to Cloudinary
    const todayDate = new Date().toISOString().split('T')[0];
    const uploadResult = await uploadToCloudinary(
      imageData,
      `verification-sessions/${todayDate}`,
      `${sessionId}_img_${sequenceNumber}_${Date.now()}`
    );

    if (!uploadResult.success) {
      console.error('❌ Cloudinary upload failed:', uploadResult.error);
      return NextResponse.json(
        { error: 'Failed to upload image to Cloudinary' },
        { status: 500 }
      );
    }

    console.log('✅ Image uploaded to Cloudinary:', uploadResult.secureUrl);

    // Save image metadata to database
    const db = await getDatabase();
    if (db) {
      await db.collection('verification_images').insertOne({
        sessionId,
        sequenceNumber,
        imageUrl: uploadResult.secureUrl,
        publicId: uploadResult.publicId,
        location,
        timestamp: new Date(timestamp),
        uploadedAt: new Date(),
      });
      console.log('✅ Image metadata saved to database');
    }

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
      sequenceNumber,
    });
  } catch (error: any) {
    console.error('❌ Error uploading image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
