import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Store single image at a time to avoid SSL timeout
export async function POST(request: NextRequest) {
  try {
    console.log('Single image upload');
    
    const body = await request.json();
    const { studentId, studentName, studentEmail, image, imageIndex, totalImages } = body;

    if (!studentId || !image) {
      return NextResponse.json(
        { success: false, message: 'Student ID and image are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json(
        { success: false, message: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Find or create temp registration
    let tempReg = await db.collection('face_registrations_temp').findOne({
      studentId: studentId
    });

    if (!tempReg) {
      // Create new temp registration
      const newTempReg = {
        studentId,
        studentName,
        studentEmail,
        images: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('face_registrations_temp').insertOne(newTempReg);
    }

    // Add image to array
    await db.collection('face_registrations_temp').updateOne(
      { studentId: studentId },
      {
        $push: { images: image },
        $set: { updatedAt: new Date() }
      }
    );

    // Get updated count
    const updated = await db.collection('face_registrations_temp').findOne({
      studentId: studentId
    });

    if (!updated) {
      throw new Error('Failed to retrieve updated registration');
    }

    const currentCount = (updated.images as any[])?.length || 0;

    // If all images uploaded, move to permanent collection
    if (currentCount >= totalImages) {
      console.log('✅ All images uploaded, moving to permanent collection');
      
      const finalData = {
        studentId,
        studentName,
        studentEmail,
        images: updated.images as any[],
        imageCount: (updated.images as any[]).length,
        registeredAt: new Date(),
        updatedAt: new Date(),
        status: 'active'
      };

      // Save to permanent collection
      await db.collection('face_registrations').updateOne(
        { studentId: studentId },
        { $set: finalData },
        { upsert: true }
      );

      // Update user
      await db.collection('users').updateOne(
        { $or: [{ clerkId: studentId }, { _id: studentId }, { email: studentEmail }] },
        { $set: { faceRegistered: true, faceRegisteredAt: new Date() } }
      );

      // Delete temp
      await db.collection('face_registrations_temp').deleteOne({ studentId: studentId });

      return NextResponse.json({
        success: true,
        message: 'Face registration completed successfully',
        completed: true,
        imageCount: currentCount
      });
    }

    return NextResponse.json({
      success: true,
      message: `Image ${currentCount}/${totalImages} uploaded`,
      completed: false,
      imageCount: currentCount
    });

  } catch (error: any) {
    console.error('❌ Error uploading image:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
