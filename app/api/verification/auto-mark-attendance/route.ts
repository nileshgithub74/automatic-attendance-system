import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';
import { v2 as cloudinary } from 'cloudinary';
import { extractEmbedding } from '@/lib/aiService';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Euclidean distance between two embeddings
function euclideanDistance(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

// Download image from Cloudinary URL and convert to base64
async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (err) {
    console.error('Failed to fetch image:', imageUrl, err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, className, totalImages } = await request.json();

    if (!sessionId || !className || !totalImages) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Step 1: Fetch all uploaded images from Cloudinary for this session
    const folderPath = `verification-sessions/${sessionId}`;
    let cloudinaryImages: any[] = [];

    try {
      const result = await cloudinary.search
        .expression(`folder:${folderPath}`)
        .sort_by('created_at', 'asc')
        .max_results(totalImages + 5)
        .execute();
      cloudinaryImages = result.resources || [];
    } catch (err) {
      console.error('Cloudinary search error:', err);
      cloudinaryImages = [];
    }

    console.log(`Found ${cloudinaryImages.length} images in Cloudinary for session ${sessionId}`);

    if (cloudinaryImages.length === 0) {
      return NextResponse.json({ error: 'No images found in Cloudinary for this session' }, { status: 400 });
    }

    // Step 2: Get all registered face embeddings from database
    const faceEmbeddings = await db.collection('faceEmbeddings')
      .find({ isActive: true })
      .toArray();

    console.log(`Found ${faceEmbeddings.length} registered face embeddings`);

    if (faceEmbeddings.length === 0) {
      return NextResponse.json({ error: 'No registered face embeddings found' }, { status: 400 });
    }

    // Step 3: For each Cloudinary image, extract embeddings of all detected faces
    // and match against registered students
    const DISTANCE_THRESHOLD = 0.6;
    const MIN_DETECTION_RATIO = 0.3; // Student must appear in 30% of images

    // Track detection count per student
    const detectionCounts: Record<string, { count: number; totalConfidence: number }> = {};

    for (const imgResource of cloudinaryImages) {
      const imageUrl = imgResource.secure_url;
      console.log(`Processing image: ${imageUrl}`);

      // Download image and convert to base64
      const base64Image = await fetchImageAsBase64(imageUrl);
      if (!base64Image) {
        console.warn(`Skipping image ${imageUrl} — could not fetch`);
        continue;
      }

      // Extract face embedding from this classroom image
      let capturedEmbedding: number[];
      try {
        const result = await extractEmbedding(base64Image);
        if (!result.faceDetected || result.embedding.length === 0) {
          console.warn(`No face detected in image ${imageUrl}`);
          continue;
        }
        capturedEmbedding = result.embedding;
      } catch (err) {
        console.warn(`Embedding extraction failed for ${imageUrl}:`, err);
        continue;
      }

      // Compare this face against all registered student embeddings
      let bestDistance = Infinity;
      let bestStudentId: string | null = null;

      for (const record of faceEmbeddings) {
        if (!record.averageEmbedding || record.averageEmbedding.length === 0) continue;
        const distance = euclideanDistance(capturedEmbedding, record.averageEmbedding);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestStudentId = record.studentId.toString();
        }
      }

      // If best match is within threshold, count this detection
      if (bestStudentId && bestDistance <= DISTANCE_THRESHOLD) {
        const confidence = Math.max(0, 1 - bestDistance / 1.5);
        if (!detectionCounts[bestStudentId]) {
          detectionCounts[bestStudentId] = { count: 0, totalConfidence: 0 };
        }
        detectionCounts[bestStudentId].count += 1;
        detectionCounts[bestStudentId].totalConfidence += confidence;
        console.log(`Matched student ${bestStudentId} with distance ${bestDistance.toFixed(3)}`);
      }
    }

    // Step 4: Get all students in the class
    const allStudents = await db.collection('users')
      .find({ role: { $regex: /^student$/i }, class: className })
      .toArray();

    console.log(`Total students in class ${className}: ${allStudents.length}`);

    // Step 5: Determine present/absent for each student
    const presentStudents: any[] = [];
    const absentStudents: any[] = [];
    const detectionResults: any[] = [];

    for (const student of allStudents) {
      const studentId = student._id.toString();
      const detection = detectionCounts[studentId];
      const detectionCount = detection?.count || 0;
      const avgConfidence = detection ? detection.totalConfidence / detection.count : 0;
      const minRequired = Math.floor(cloudinaryImages.length * MIN_DETECTION_RATIO);
      const isPresent = detectionCount >= minRequired && avgConfidence >= 0.70;

      const result = {
        studentId,
        studentName: student.name,
        rollNo: student.rollNo || student.rollNumber || 'N/A',
        class: student.class,
        email: student.email,
        detectionCount,
        totalImages: cloudinaryImages.length,
        averageConfidence: Math.round(avgConfidence * 100) / 100,
        isPresent,
        status: isPresent ? 'present' : 'absent',
        method: 'ai_face_recognition',
      };

      detectionResults.push(result);
      if (isPresent) presentStudents.push(result);
      else absentStudents.push(result);
    }

    // Step 6: Save attendance records to MongoDB
    const attendanceCollection = db.collection('attendance');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Remove existing AI-marked attendance for today for this class
    await attendanceCollection.deleteMany({
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      class: className,
      method: 'ai_face_recognition',
    });

    const attendanceRecords = detectionResults.map(student => ({
      studentId: student.studentId,
      studentName: student.studentName,
      rollNo: student.rollNo,
      class: student.class,
      status: student.status,
      date: today,
      markedAt: new Date(),
      markedBy: 'AI Face Recognition System',
      teacherId: userId,
      method: 'ai_face_recognition',
      aiVerified: true,
      aiConfidence: student.averageConfidence,
      aiDetectionCount: student.detectionCount,
      aiTotalImages: student.totalImages,
      verificationSessionId: sessionId,
    }));

    const insertResult = await attendanceCollection.insertMany(attendanceRecords);

    // Step 7: Save session summary
    await db.collection('verification_sessions').insertOne({
      sessionId,
      teacherId: userId,
      className,
      processedAt: new Date(),
      totalStudents: allStudents.length,
      presentCount: presentStudents.length,
      absentCount: absentStudents.length,
      totalImages: cloudinaryImages.length,
      method: 'real_ai_face_recognition',
      detectionResults,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      summary: {
        totalStudents: allStudents.length,
        presentCount: presentStudents.length,
        absentCount: absentStudents.length,
        attendanceMarked: insertResult.insertedCount,
        imagesProcessed: cloudinaryImages.length,
      },
      presentStudents: presentStudents.map(s => ({
        name: s.studentName,
        rollNo: s.rollNo,
        confidence: s.averageConfidence,
        detectedIn: `${s.detectionCount}/${s.totalImages} images`,
      })),
      absentStudents: absentStudents.map(s => ({
        name: s.studentName,
        rollNo: s.rollNo,
        reason: s.detectionCount === 0
          ? 'Not detected in any image'
          : 'Insufficient detection confidence',
      })),
      processedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in auto-mark attendance:', error);
    return NextResponse.json(
      { error: 'Failed to process automatic attendance marking' },
      { status: 500 }
    );
  }
}
