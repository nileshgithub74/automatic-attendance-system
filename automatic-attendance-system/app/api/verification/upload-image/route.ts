import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, imageData, sequenceNumber, location, timestamp } = await request.json();

    if (!sessionId || !imageData || !sequenceNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upload image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(imageData, {
      folder: `verification-sessions/${sessionId}`,
      public_id: `image_${sequenceNumber}_${Date.now()}`,
      resource_type: 'image',
      format: 'jpg',
      quality: 'auto:good',
    });

    // Store image metadata in database (optional)
    // You can add database storage here if needed

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      sequenceNumber,
      uploadedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}