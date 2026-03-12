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
    const { studentId, studentName, images } = body;

    console.log('📝 Request data:', {
      studentId,
      studentName,
      imageCount: images?.length,
      firstImageSize: images?.[0]?.length
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

    console.log('✅ Validation passed, connecting to database...');
    const db = await getDatabase();
    
    if (!db) {
      console.error('❌ Database connection failed');
      return NextResponse.json(
        { message: 'Database connection failed. Please try again.' },
        { status: 500 }
      );
    }

    // Upload images to Cloudinary
    console.log('📤 Uploading images to Cloudinary...');
    const { uploadMultipleToCloudinary } = await import('@/lib/cloudinary');
    
    let uploadResults;
    try {
      uploadResults = await uploadMultipleToCloudinary(
        images,
        `face-registrations/${studentId}`
      );
      console.log('📤 Upload results:', uploadResults.map(r => ({ success: r.success, error: r.error })));
    } catch (uploadError) {
      console.error('❌ Cloudinary upload error:', uploadError);
      return NextResponse.json(
        { message: 'Failed to upload images to cloud storage: ' + uploadError.message },
        { status: 500 }
      );
    }

    // Check if all uploads succeeded
    const failedUploads = uploadResults.filter(r => !r.success);
    if (failedUploads.length > 0) {
      console.error('❌ Some images failed to upload:', failedUploads);
      return NextResponse.json(
        { message: `Failed to upload ${failedUploads.length} out of ${images.length} images to cloud storage` },
        { status: 500 }
      );
    }

    // Get image URLs
    const imageUrls = uploadResults.map(r => r.secureUrl).filter(Boolean) as string[];
    console.log('✅ Images uploaded successfully:', imageUrls.length);

    // Check if registration already exists
    const existingRegistration = await db.collection('face_registrations').findOne({
      studentId: studentId
    });

    console.log('🔍 Existing registration:', existingRegistration ? 'Found' : 'Not found');

    const registrationData = {
      studentId,
      studentName,
      images, // Keep base64 as backup
      imageUrls, // Store Cloudinary URLs
      imageCount: images.length,
      registeredAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      cloudStorage: 'cloudinary'
    };

    if (existingRegistration) {
      // Update existing registration
      console.log('🔄 Updating existing registration...');
      try {
        await db.collection('face_registrations').updateOne(
          { studentId: studentId },
          {
            $set: {
              ...registrationData,
              previousRegistrationDate: existingRegistration.registeredAt
            }
          }
        );

        // Update user record to mark face as registered
        const userUpdateResult = await db.collection('users').updateOne(
          { id: parseInt(studentId) },
          { $set: { faceRegistered: true, faceRegisteredAt: new Date() } }
        );
        console.log('👤 User update result:', userUpdateResult.modifiedCount > 0 ? 'Success' : 'No changes');

        console.log('✅ Registration updated successfully');
        return NextResponse.json({
          success: true,
          message: 'Face registration updated successfully',
          isUpdate: true
        });
      } catch (dbError) {
        console.error('❌ Database update error:', dbError);
        return NextResponse.json(
          { message: 'Failed to update registration in database: ' + dbError.message },
          { status: 500 }
        );
      }
    } else {
      // Create new registration
      console.log('➕ Creating new registration...');
      try {
        await db.collection('face_registrations').insertOne(registrationData);

        // Update user record to mark face as registered
        const userUpdateResult = await db.collection('users').updateOne(
          { id: parseInt(studentId) },
          { $set: { faceRegistered: true, faceRegisteredAt: new Date() } }
        );
        console.log('👤 User update result:', userUpdateResult.modifiedCount > 0 ? 'Success' : 'No changes');

        console.log('✅ Registration created successfully');
        return NextResponse.json({
          success: true,
          message: 'Face registration completed successfully',
          isUpdate: false
        });
      } catch (dbError) {
        console.error('❌ Database insert error:', dbError);
        return NextResponse.json(
          { message: 'Failed to save registration in database: ' + dbError.message },
          { status: 500 }
        );
      }
    }
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