import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      studentId, 
      studentName, 
      class: studentClass,
      rollNo,
      faceImage,
      location,
      networkInfo,
      reason // Why face didn't match
    } = body;

    if (!studentId || !studentName || !faceImage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('attendance_system');

    // Upload image to Cloudinary
    const todayDate = new Date().toISOString().split('T')[0];
    const uploadResult = await uploadToCloudinary(
      faceImage,
      `manual-verification/${todayDate}`,
      `${studentId}_${Date.now()}`
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Create manual verification record
    const verificationRecord = {
      studentId: studentId.toString(),
      studentName,
      class: studentClass,
      rollNo,
      faceImageUrl: uploadResult.secureUrl,
      cloudinaryPublicId: uploadResult.publicId,
      reason: reason || 'Face recognition failed',
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      } : null,
      networkSecurity: networkInfo ? {
        connectionType: networkInfo.connectionType,
        latency: networkInfo.latency,
        jitter: networkInfo.jitter
      } : null,
      status: 'pending', // pending, approved, rejected
      submittedAt: new Date(),
      submittedBy: userId,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date()
    };

    const result = await db.collection('manual_verifications').insertOne(verificationRecord);

    return NextResponse.json({
      success: true,
      message: 'Your image has been submitted for manual verification. Teachers and admins will review it.',
      recordId: result.insertedId
    });

  } catch (error: any) {
    console.error('Error submitting manual verification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit verification' },
      { status: 500 }
    );
  }
}

// GET - Get pending manual verifications for teacher/admin
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('attendance_system');

    // Get pending verifications
    const pendingVerifications = await db.collection('manual_verifications')
      .find({ status: 'pending' })
      .sort({ submittedAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      verifications: pendingVerifications
    });

  } catch (error: any) {
    console.error('Error fetching verifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch verifications' },
      { status: 500 }
    );
  }
}

// PATCH - Approve or reject manual verification
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { verificationId, status, notes } = body;

    if (!verificationId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('attendance_system');

    // Update verification record
    const result = await db.collection('manual_verifications').updateOne(
      { _id: verificationId },
      {
        $set: {
          status,
          reviewedBy: userId,
          reviewedAt: new Date(),
          notes: notes || ''
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Verification record not found' },
        { status: 404 }
      );
    }

    // If approved, mark attendance as present
    if (status === 'approved') {
      const verification = await db.collection('manual_verifications').findOne(
        { _id: verificationId }
      );

      if (verification) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Create or update attendance record
        await db.collection('attendance').updateOne(
          {
            studentId: verification.studentId,
            date: { $gte: today, $lt: tomorrow }
          },
          {
            $set: {
              status: 'present',
              method: 'manual_verification',
              markedBy: 'Manual Verification (Teacher/Admin)',
              markedAt: new Date(),
              verificationId: verificationId,
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Verification ${status} successfully`
    });

  } catch (error: any) {
    console.error('Error updating verification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update verification' },
      { status: 500 }
    );
  }
}
