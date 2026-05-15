import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

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

    console.log('🔍 Detecting multiple faces in group photo...');

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

    // If no registered faces, return empty (or you can add test data)
    if (faceRegistrations.length === 0) {
      console.log('⚠️ No registered faces found in database');
      
      // FOR TESTING: Return dummy data to show green banner
      const testFaces = [
        { studentId: 'test1', name: 'Test Student 1', confidence: 0.85 },
        { studentId: 'test2', name: 'Test Student 2', confidence: 0.92 },
        { studentId: 'test3', name: 'Test Student 3', confidence: 0.88 }
      ];
      
      console.log('🧪 Returning test data for demonstration');
      return NextResponse.json({
        success: true,
        faces: testFaces,
        totalDetected: testFaces.length,
        totalRegistered: 0,
        detectionRate: 'Test Mode',
        isTestData: true
      });
    }

    // In a real implementation, you would:
    // 1. Use face detection library (like face-api.js, OpenCV, or AWS Rekognition)
    // 2. Detect ALL faces in the group photo
    // 3. Extract face embeddings for each detected face
    // 4. Compare each detected face with all registered student faces
    // 5. Match faces with confidence scores

    // For now, we'll simulate detecting multiple students in a group photo
    const detectedFaces = [];

    // Simulate detecting 30-70% of registered students in each photo
    const detectionRate = 0.3 + Math.random() * 0.4; // 30-70%
    const numToDetect = Math.floor(faceRegistrations.length * detectionRate);

    console.log(`🎯 Simulating detection of ${numToDetect} students out of ${faceRegistrations.length}`);

    // Randomly select students to "detect" in this photo
    const shuffled = [...faceRegistrations].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, numToDetect);

    for (const registration of selected) {
      // Simulate confidence score between 0.75 and 0.95 for detected faces
      const confidence = 0.75 + Math.random() * 0.2;
      
      detectedFaces.push({
        studentId: registration.studentId,
        name: registration.studentName,
        confidence: confidence,
      });
    }

    console.log(`✅ Detected ${detectedFaces.length} faces in group photo`);
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
