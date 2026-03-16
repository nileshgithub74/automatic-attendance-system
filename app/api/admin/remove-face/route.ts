import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Remove face registration request received');

    // Check authentication
    const { userId: clerkUserId } = await auth();
    const customUserId = request.cookies.get('userId')?.value;
    const userRole = request.cookies.get('userRole')?.value;

    console.log('🔐 Auth:', { clerkUserId, customUserId, userRole });

    // Parse request body
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        { success: false, message: 'Student ID is required' },
        { status: 400 }
      );
    }

    console.log('Removing face registration for student:', studentId);

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json(
        { success: false, message: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Check if student exists
    let student;
    try {
      student = await db.collection('users').findOne({
        $or: [
          { _id: new ObjectId(studentId) },
          { _id: studentId }
        ]
      });
    } catch (e) {
      student = await db.collection('users').findOne({ _id: studentId });
    }

    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    console.log('✅ Student found:', student.name);

    // Delete face registration
    const deleteResult = await db.collection('face_registrations').deleteOne({
      studentId: student._id.toString()
    });

    console.log('🗑️ Face registration delete result:', deleteResult);

    // Update student document
    const updateResult = await db.collection('users').updateOne(
      { _id: student._id },
      {
        $set: {
          faceRegistered: false
        },
        $unset: {
          faceRegisteredAt: ''
        }
      }
    );

    console.log('✅ Student document updated:', updateResult);

    return NextResponse.json({
      success: true,
      message: `Face registration removed for ${student.name}`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error: any) {
    console.error('❌ Error removing face registration:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to remove face registration',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      },
      { status: 500 }
    );
  }
}

// Also support POST for compatibility
export async function POST(request: NextRequest) {
  return DELETE(request);
}
