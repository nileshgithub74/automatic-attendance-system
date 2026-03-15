import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

// Configure route to handle large payloads
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout
export const dynamic = 'force-dynamic';

// GET - Check if student has existing face registration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    const registration = await db.collection('face_registrations').findOne({
      studentId: studentId
    });

    return NextResponse.json({
      hasRegistration: !!registration,
      registrationDate: registration?.registeredAt || null
    });
  } catch (error) {
    console.error('Error checking face registration:', error);
    return NextResponse.json(
      { error: 'Failed to check registration status' },
      { status: 500 }
    );
  }
}

// POST - Register or update student face data
export async function POST(request: NextRequest) {
  try {
    console.log('📸 Face registration POST request received');
    
    const body = await request.json();
    const { studentId, studentName, images, location } = body;

    console.log('📝 Request data:', {
      studentId,
      studentName,
      imageCount: images?.length,
      firstImageSize: images?.[0]?.length,
      hasLocation: !!location
    });

    // Validation
    if (!studentId || !studentName) {
      console.error('❌ Missing studentId or studentName');
      return NextResponse.json(
        { message: 'Student ID and name are required' },
        { status: 400 }
      );
    }

    if (!images || !Array.isArray(images) || images.length < 5) {
      console.error('❌ Invalid images:', { 
        hasImages: !!images, 
        isArray: Array.isArray(images), 
        length: images?.length 
      });
      return NextResponse.json(
        { message: 'At least 5 images are required for registration' },
        { status: 400 }
      );
    }

    // Validate image format
    const invalidImages = images.filter(img => !img.startsWith('data:image/'));
    if (invalidImages.length > 0) {
      console.error('❌ Invalid image format detected');
      return NextResponse.json(
        { message: 'Invalid image format. Images must be base64 encoded.' },
        { status: 400 }
      );
    }

    // FOR TESTING: Skip database operations
    console.log('📤 Using dummy data for testing (Database disabled)...');
    
    // Log location if provided
    if (location) {
      console.log('📍 Student location:', location);
      // TODO: Store location in database when DB is connected
      // This will be sent to teacher/admin dashboard
    }
    
    console.log('✅ Registration test successful');
    return NextResponse.json({
      success: true,
      message: 'Face registration completed successfully (TEST MODE)',
      isUpdate: false,
      testMode: true,
      locationCaptured: !!location
    });
  } catch (error: any) {
    console.error('❌ Error registering face:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { 
        message: error.message || 'Failed to register face data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove face registration
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    const result = await db.collection('face_registrations').deleteOne({
      studentId: studentId
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'No registration found for this student' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Face registration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting face registration:', error);
    return NextResponse.json(
      { error: 'Failed to delete registration' },
      { status: 500 }
    );
  }
}