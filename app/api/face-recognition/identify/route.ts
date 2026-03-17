import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { faceImage } = await request.json();

    if (!faceImage) {
      return NextResponse.json({ error: 'Face image required' }, { status: 400 });
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get all registered students with face data
    const studentsCollection = db.collection('users');
    const registeredStudents = await studentsCollection
      .find({ 
        role: { $regex: /^student$/i },
        faceRegistered: true
      })
      .toArray();

    // Simulate face recognition processing
    // In real implementation, this would:
    // 1. Extract face encoding from the provided image
    // 2. Compare with stored face encodings of all registered students
    // 3. Find the best match above confidence threshold
    // 4. Return student details if match found

    // Mock face recognition result
    const isRecognized = Math.random() > 0.3; // 70% chance of recognition for demo
    
    if (isRecognized && registeredStudents.length > 0) {
      // Simulate successful recognition
      const randomStudent = registeredStudents[Math.floor(Math.random() * registeredStudents.length)];
      const confidence = 0.75 + Math.random() * 0.20; // 75-95% confidence
      
      return NextResponse.json({
        success: true,
        recognized: true,
        student: {
          id: randomStudent.id || randomStudent._id.toString(),
          name: randomStudent.name,
          rollNo: randomStudent.rollNo || randomStudent.rollNumber || 'N/A',
          class: randomStudent.class,
          email: randomStudent.email,
        },
        confidence: Math.round(confidence * 100) / 100,
        message: `Welcome ${randomStudent.name}!`
      });
    } else {
      // Face not recognized
      return NextResponse.json({
        success: true,
        recognized: false,
        message: 'Face not recognized. Please register your face first.',
        suggestion: 'Contact your teacher or admin to register your face in the system.'
      });
    }

  } catch (error) {
    console.error('Error in face recognition:', error);
    return NextResponse.json(
      { error: 'Face recognition failed' },
      { status: 500 }
    );
  }
}