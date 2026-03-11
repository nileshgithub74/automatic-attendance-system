// Face Registration API - Updated
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import { getStudentIds } from '@/lib/idConverter';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('📸 Face registration API called');

    // Get authentication
    const { userId: clerkUserId } = await auth();
    const customUserId = request.cookies.get('userId')?.value;
    const userRole = request.cookies.get('userRole')?.value;

    console.log('🔐 Auth check:', { clerkUserId, customUserId, userRole });

    // Parse the JSON body (not FormData, we're using base64)
    const body = await request.json();
    const { studentId, numericId, clerkId, studentName, studentEmail, images } = body;

    // Get both ID formats
    const ids = getStudentIds(studentId);

    console.log('📝 Request data:', {
      studentId,
      numericId: numericId || ids.numericId,
      clerkId,
      studentName,
      studentEmail,
      imageCount: images?.length,
    });

    // Validation
    if (!studentId) {
      return NextResponse.json(
        { success: false, message: 'Student ID is required' },
        { status: 400 }
      );
    }

    if (!images || !Array.isArray(images) || images.length !== 5) {
      return NextResponse.json(
        { success: false, message: 'Exactly 5 images are required' },
        { status: 400 }
      );
    }

    // Validate image format
    for (let i = 0; i < images.length; i++) {
      if (!images[i].startsWith('data:image/')) {
        return NextResponse.json(
          { success: false, message: `Image ${i + 1} has invalid format` },
          { status: 400 }
        );
      }
    }

    console.log('✅ Validation passed, connecting to database...');

    // Add timeout for MongoDB connection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('MongoDB connection timeout')), 8000)
    );
    
    const dbPromise = clientPromise.then(client => client.db('attendance_system'));
    const db = await Promise.race([dbPromise, timeoutPromise]) as any;

    // Check if student exists - simplified query for better performance
    let student = null;
    
    // Try queries in order of likelihood
    if (clerkId) {
      student = await db.collection('users').findOne({ clerkId: clerkId });
    }
    
    if (!student && studentEmail) {
      student = await db.collection('users').findOne({ email: studentEmail });
    }
    
    if (!student && numericId) {
      student = await db.collection('users').findOne({ id: numericId });
    }
    
    if (!student) {
      student = await db.collection('users').findOne({ clerkId: studentId });
    }

    // If not found, create a basic student record
    if (!student) {
      console.log('⚠️ Student not found in users collection, creating basic record...');
      const newStudent = {
        clerkId: clerkId || studentId,
        id: numericId || ids.numericId,
        name: studentName,
        email: studentEmail,
        role: 'student',
        faceRegistered: false,
        createdAt: new Date(),
      };
      
      const insertResult = await db.collection('users').insertOne(newStudent);
      student = { ...newStudent, _id: insertResult.insertedId };
      console.log('✅ Student record created:', student.name);
    } else {
      console.log('✅ Student found:', student.name || student.email);
    }

    // Check if face registration already exists
    const existingRegistration = await db.collection('face_registrations').findOne({
      studentId: student._id.toString()
    });

    const registrationData = {
      studentId: student._id.toString(),
      numericId: numericId || ids.numericId || student.id,
      clerkId: clerkId || student.clerkId || studentId,
      studentName: student.name || studentName,
      studentEmail: student.email || studentEmail,
      images: images,
      imageCount: images.length,
      registeredAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };

    if (existingRegistration) {
      console.log('🔄 Updating existing registration...');
      
      await db.collection('face_registrations').updateOne(
        { studentId: student._id.toString() },
        {
          $set: {
            ...registrationData,
            previousRegistrationDate: existingRegistration.registeredAt
          }
        }
      );

      // Update student document
      await db.collection('users').updateOne(
        { _id: student._id },
        { $set: { faceRegistered: true, faceRegisteredAt: new Date() } }
      );

      console.log('✅ Registration updated successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Face registration updated successfully',
        isUpdate: true
      });
    } else {
      console.log('➕ Creating new registration...');
      
      await db.collection('face_registrations').insertOne(registrationData);

      // Update student document
      await db.collection('users').updateOne(
        { _id: student._id },
        { $set: { faceRegistered: true, faceRegisteredAt: new Date() } }
      );

      console.log('✅ Registration created successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Face registration completed successfully',
        isUpdate: false
      });
    }
  } catch (error: any) {
    console.error('❌ Error in face registration:', error);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to register face data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// GET - Check registration status
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/face/register - Check registration status');
    
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    
    console.log('📝 Student ID:', studentId);

    if (!studentId) {
      console.log('❌ No student ID provided');
      return NextResponse.json(
        { success: false, message: 'Student ID is required' },
        { status: 400 }
      );
    }

    console.log('🔌 Connecting to MongoDB...');
    
    // Add timeout for MongoDB connection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('MongoDB connection timeout')), 8000)
    );
    
    const dbPromise = clientPromise.then(client => client.db('attendance_system'));
    
    const db = await Promise.race([dbPromise, timeoutPromise]) as any;
    console.log('✅ MongoDB connected');

    console.log('🔍 Searching for registration...');
    
    // Try multiple query formats for better compatibility
    const registration = await db.collection('face_registrations').findOne({
      $or: [
        { studentId: studentId },
        { clerkId: studentId },
        { numericId: parseInt(studentId) || studentId }
      ]
    });
    
    console.log('📊 Registration found:', !!registration);

    return NextResponse.json({
      success: true,
      hasRegistration: !!registration,
      registrationDate: registration?.registeredAt || null
    });
  } catch (error: any) {
    console.error('❌ Error checking registration:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Return success: false but with 200 status to prevent frontend errors
    return NextResponse.json(
      { 
        success: false, 
        hasRegistration: false,
        message: 'Could not check registration status', 
        error: error.message 
      },
      { status: 200 } // Changed from 500 to 200
    );
  }
}
