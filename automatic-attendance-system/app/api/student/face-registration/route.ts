import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { extractEmbedding } from '@/lib/aiService';
import mongoose from 'mongoose';

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
      console.error('Invalid image format detected');
      return NextResponse.json(
        { message: 'Invalid image format. Images must be base64 encoded.' },
        { status: 400 }
      );
    }

    // Connect to database
    const db = await getDatabase();
    
    if (!db) {
      console.error('Database connection failed');
      return NextResponse.json(
        { message: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    console.log('💾 Uploading images to Cloudinary...');
    
    // Upload images to Cloudinary
    const uploadedImages = [];
    const todayDate = new Date().toISOString().split('T')[0];
    
    for (let i = 0; i < images.length; i++) {
      console.log(`📤 Uploading image ${i + 1}/${images.length}...`);
      
      const uploadResult = await uploadToCloudinary(
        images[i],
        `face-registrations/${todayDate}`,
        `${studentId}_${i + 1}_${Date.now()}`
      );
      
      if (uploadResult.success) {
        uploadedImages.push({
          url: uploadResult.secureUrl,
          publicId: uploadResult.publicId,
          uploadedAt: new Date()
        });
        console.log(`✅ Image ${i + 1} uploaded successfully`);
      } else {
        console.error(`❌ Failed to upload image ${i + 1}:`, uploadResult.error);
        // Continue with other images even if one fails
      }
    }
    
    if (uploadedImages.length === 0) {
      return NextResponse.json(
        { message: 'Failed to upload any images to Cloudinary' },
        { status: 500 }
      );
    }
    
    console.log(`✅ Successfully uploaded ${uploadedImages.length}/${images.length} images to Cloudinary`);
    
    console.log('🧠 Extracting face embeddings from images...');
    
    // Extract embeddings from each image for face recognition
    const embeddings = [];
    let totalQuality = 0;

    for (let i = 0; i < images.length; i++) {
      try {
        console.log(`🔍 Processing embedding ${i + 1}/${images.length}...`);
        const result = await extractEmbedding(images[i]);

        if (result.faceDetected && result.embedding.length > 0) {
          embeddings.push({
            embedding: result.embedding,
            imageUrl: uploadedImages[i]?.url || null,
            captureDate: new Date(),
            quality: result.quality,
            model: 'FaceNet'
          });
          totalQuality += result.quality;
          console.log(`✅ Embedding ${i + 1} extracted successfully (quality: ${result.quality})`);
        } else {
          console.warn(`⚠️ No face detected in image ${i + 1}`);
        }
      } catch (error) {
        console.error(`❌ Error processing embedding ${i + 1}:`, error);
      }
    }

    if (embeddings.length === 0) {
      console.error('❌ No faces detected in any image');
      return NextResponse.json(
        { message: 'No faces detected in the images. Please ensure your face is clearly visible.' },
        { status: 400 }
      );
    }

    console.log(`✅ Successfully extracted ${embeddings.length} embeddings`);

    // Calculate average embedding for better recognition accuracy
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
    console.log(`📊 Average embedding quality: ${averageQuality}`);
    
    console.log('💾 Saving face registration to database...');
    
    // Check if registration already exists
    const existingReg = await db.collection('face_registrations').findOne({
      studentId: studentId.toString()
    });
    
    const registrationData = {
      studentId: studentId.toString(),
      studentName,
      images: uploadedImages, // Store Cloudinary URLs instead of base64
      imageCount: uploadedImages.length,
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      } : null,
      status: 'active',
      registeredAt: new Date(),
      updatedAt: new Date()
    };
    
    if (existingReg) {
      // Update existing registration
      await db.collection('face_registrations').updateOne(
        { studentId: studentId.toString() },
        { $set: registrationData }
      );
      console.log('✅ Updated existing face registration');
    } else {
      // Create new registration
      await db.collection('face_registrations').insertOne(registrationData);
      console.log('✅ Created new face registration');
    }
    
    // Store face embeddings for recognition
    console.log('💾 Saving face embeddings for recognition...');
    
    let studentObjectId;
    try {
      studentObjectId = new mongoose.Types.ObjectId(studentId);
    } catch (error) {
      // If studentId is not a valid ObjectId, use it as string
      console.log('⚠️ StudentId is not a valid ObjectId, using as string');
      studentObjectId = studentId;
    }
    
    const faceEmbeddingDoc = {
      studentId: studentObjectId,
      studentName,
      studentRollNumber: studentId, // Will be updated if we find the user
      embeddings,
      averageEmbedding,
      totalImages: embeddings.length,
      averageQuality,
      lastUpdated: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Upsert face embeddings (update if exists, insert if not)
    await db.collection('faceEmbeddings').updateOne(
      { studentId: studentObjectId },
      { $set: faceEmbeddingDoc },
      { upsert: true }
    );
    
    console.log('✅ Face embeddings saved successfully');
    
    // Update student record to mark face as registered
    console.log('🔄 Updating user record for studentId:', studentId, 'Type:', typeof studentId);
    
    let userUpdated = false;
    
    try {
      // Try multiple approaches to update the user record in MongoDB
      let updateResult;
      
      // Approach 1: Try with ObjectId
      try {
        const objectId = new mongoose.Types.ObjectId(studentId);
        updateResult = await db.collection('users').updateOne(
          { _id: objectId },
          { 
            $set: { 
              faceRegistered: true,
              faceRegisteredAt: new Date()
            } 
          }
        );
        console.log('✅ Updated users collection with ObjectId:', {
          matched: updateResult.matchedCount,
          modified: updateResult.modifiedCount
        });
        if (updateResult.matchedCount > 0) userUpdated = true;
      } catch (oidError) {
        console.log('⚠️ ObjectId approach failed, trying string ID');
      }
      
      // Approach 2: Try with string ID if ObjectId failed
      if (!updateResult || updateResult.matchedCount === 0) {
        updateResult = await db.collection('users').updateOne(
          { _id: studentId },
          { 
            $set: { 
              faceRegistered: true,
              faceRegisteredAt: new Date()
            } 
          }
        );
        console.log('✅ Updated users collection with string ID:', {
          matched: updateResult.matchedCount,
          modified: updateResult.modifiedCount
        });
        if (updateResult.matchedCount > 0) userUpdated = true;
      }
      
      // Approach 3: Try with clerkId field
      if (!updateResult || updateResult.matchedCount === 0) {
        updateResult = await db.collection('users').updateOne(
          { clerkId: studentId },
          { 
            $set: { 
              faceRegistered: true,
              faceRegisteredAt: new Date()
            } 
          }
        );
        console.log('✅ Updated users collection with clerkId:', {
          matched: updateResult.matchedCount,
          modified: updateResult.modifiedCount
        });
        if (updateResult.matchedCount > 0) userUpdated = true;
      }
      
      // Also update in students collection if exists
      try {
        const objectId = new mongoose.Types.ObjectId(studentId);
        const studentsResult = await db.collection('students').updateOne(
          { _id: objectId },
          { 
            $set: { 
              faceRegistered: true,
              faceRegisteredAt: new Date()
            } 
          }
        );
        if (studentsResult.matchedCount > 0) userUpdated = true;
      } catch (studentsError) {
        // Try with string ID
        const studentsResult = await db.collection('students').updateOne(
          { _id: studentId },
          { 
            $set: { 
              faceRegistered: true,
              faceRegisteredAt: new Date()
            } 
          }
        );
        if (studentsResult.matchedCount > 0) userUpdated = true;
      }
      
      console.log('✅ MongoDB update completed, userUpdated:', userUpdated);
    } catch (updateError: any) {
      console.error('❌ Error updating MongoDB user record:', updateError.message);
    }
    
    // If MongoDB update failed, try updating Clerk
    if (!userUpdated) {
      try {
        console.log('🔄 Attempting to update Clerk user metadata...');
        const { clerkClient } = await import('@clerk/nextjs/server');
        const client = await clerkClient();
        
        await client.users.updateUserMetadata(studentId, {
          publicMetadata: {
            faceRegistered: true,
            faceRegisteredAt: new Date().toISOString()
          }
        });
        
        console.log('✅ Successfully updated Clerk user metadata');
        userUpdated = true;
      } catch (clerkError: any) {
        console.error('❌ Error updating Clerk user:', clerkError.message);
      }
    }
    
    // Log location if provided
    if (location) {
      console.log('📍 Student location captured:', location);
    }
    
    console.log('✅ Face registration completed successfully');
    return NextResponse.json({
      success: true,
      message: 'Face registration completed successfully',
      isUpdate: !!existingReg,
      locationCaptured: !!location,
      imagesUploaded: uploadedImages.length,
      embeddingsCreated: embeddings.length,
      averageQuality: Math.round(averageQuality * 100) / 100
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