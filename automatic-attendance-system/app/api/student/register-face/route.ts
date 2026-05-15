import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    const headerStudentId = request.headers.get('x-student-id');
    
    if (!userId && !headerStudentId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { studentId, faceImage } = body;

    if (!studentId || !faceImage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the student is registering their own face
    const authenticatedStudentId = userId || headerStudentId;
    if (studentId.toString() !== authenticatedStudentId) {
      return NextResponse.json(
        { error: 'You can only register your own face' },
        { status: 403 }
      );
    }

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    const studentsCollection = db.collection('students');

    // Check if student exists
    const student = await studentsCollection.findOne({
      _id: studentId.toString()
    });

    if (!student) {
      // Create student record if doesn't exist
      await studentsCollection.insertOne({
        _id: studentId.toString(),
        registeredFace: faceImage,
        faceRegisteredAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      // Update existing student with new face
      await studentsCollection.updateOne(
        { _id: studentId.toString() },
        { 
          $set: { 
            registeredFace: faceImage,
            faceRegisteredAt: new Date(),
            updatedAt: new Date()
          } 
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Face registered successfully! You can now mark attendance using face recognition.',
    });

  } catch (error) {
    console.error('Error registering face:', error);
    return NextResponse.json(
      { error: 'Failed to register face' },
      { status: 500 }
    );
  }
}

// Get face registration status
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const headerStudentId = request.headers.get('x-student-id');
    
    if (!userId && !headerStudentId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const studentId = (userId || headerStudentId) as string;
    
    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    const studentsCollection = db.collection('students');

    const student = await studentsCollection.findOne({
      _id: studentId as any
    });

    return NextResponse.json({
      isRegistered: !!student?.registeredFace,
      registeredAt: student?.faceRegisteredAt || null,
    });

  } catch (error) {
    console.error('Error checking face registration:', error);
    return NextResponse.json(
      { error: 'Failed to check registration status' },
      { status: 500 }
    );
  }
}
