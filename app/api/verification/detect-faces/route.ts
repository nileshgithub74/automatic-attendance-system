import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { detectAllFaces, findBestMatch, arrayToDescriptor } from '@/lib/faceRecognition';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData } = body;

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Detecting multiple faces in group photo using face-api.js...');

    // Get all registered students with face data
    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ faces: [] });
    }

    const faceRegistrations = await db
      .collection('face_registrations')
      .find({ status: 'active' })
      .toArray();

    console.log(`📊 Total registered students: ${faceRegistrations.length}`);

    if (faceRegistrations.length === 0) {
      console.log('⚠️ No registered faces found in database');
      return NextResponse.json({
        success: true,
        faces: [],
        totalDetected: 0,
        totalRegistered: 0,
        detectionRate: '0%'
      });
    }

    // Use face-api.js to detect ALL faces in the image
    console.log('🔍 Detecting all faces in image...');
    const detectedFaceDescriptors = await detectAllFaces(imageData);
    
    console.log(`✅ Detected ${detectedFaceDescriptors.length} faces in the image`);

    if (detectedFaceDescriptors.length === 0) {
      console.log('⚠️ No faces detected in this image');
      return NextResponse.json({
        success: true,
        faces: [],
        totalDetected: 0,
        totalRegistered: faceRegistrations.length,
        detectionRate: '0%'
      });
    }

    // Match each detected face with registered students
    const detectedFaces = [];
    const matchedStudentIds = new Set();

    for (let i = 0; i < detectedFaceDescriptors.length; i++) {
      const detectedDescriptor = detectedFaceDescriptors[i];
      
      console.log(`🔍 Matching face ${i + 1}/${detectedFaceDescriptors.length}...`);
      
      // Compare with all registered students
      let bestMatch = null;
      let bestDistance = Infinity;
      
      for (const registration of faceRegistrations) {
        if (!registration.faceEmbedding || matchedStudentIds.has(registration.studentId)) {
          continue; // Skip if already matched or no embedding
        }
        
        try {
          const registeredDescriptor = arrayToDescriptor(registration.faceEmbedding);
          const distance = findBestMatch(detectedDescriptor, [registeredDescriptor]);
          
          if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = registration;
          }
        } catch (error) {
          console.error(`Error comparing with ${registration.studentName}:`, error);
        }
      }
      
      // If match found with confidence > 40% (distance < 0.6)
      if (bestMatch && bestDistance < 0.6) {
        const confidence = 1 - bestDistance; // Convert distance to confidence
        console.log(`✅ Face ${i + 1} matched: ${bestMatch.studentName} (confidence: ${(confidence * 100).toFixed(1)}%)`);
        
        detectedFaces.push({
          studentId: bestMatch.studentId,
          name: bestMatch.studentName,
          confidence: confidence,
        });
        
        matchedStudentIds.add(bestMatch.studentId);
      } else {
        console.log(`❌ Face ${i + 1} not matched (best distance: ${bestDistance.toFixed(3)})`);
      }
    }

    console.log(`✅ Matched ${detectedFaces.length} faces out of ${detectedFaceDescriptors.length} detected`);
    console.log('Detected students:', detectedFaces.map(f => f.name).join(', '));

    return NextResponse.json({
      success: true,
      faces: detectedFaces,
      totalDetected: detectedFaces.length,
      totalRegistered: faceRegistrations.length,
      detectionRate: `${Math.round((detectedFaces.length / faceRegistrations.length) * 100)}%`
    });
  } catch (error: any) {
    console.error('❌ Error detecting faces:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to detect faces', faces: [] },
      { status: 500 }
    );
  }
}
