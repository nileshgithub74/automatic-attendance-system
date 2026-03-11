import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication (Clerk or custom)
    const { userId } = await auth();
    const headerStudentId = request.headers.get('x-student-id');
    
    if (!userId && !headerStudentId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { studentId, studentName, class: studentClass, rollNo, faceImage } = body;

    if (!studentId || !studentName || !faceImage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the student is marking their own attendance
    const authenticatedStudentId = userId || headerStudentId;
    if (studentId.toString() !== authenticatedStudentId) {
      return NextResponse.json(
        { error: 'You can only mark your own attendance' },
        { status: 403 }
      );
    }

    const client = await clientPromise;
    const db = client.db('attendance_system');
    const attendanceCollection = db.collection('attendance');
    const studentsCollection = db.collection('students');

    // Check if attendance already marked today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await attendanceCollection.findOne({
      studentId: studentId.toString(),
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: 'Attendance already marked for today' },
        { status: 400 }
      );
    }

    // Get the student's registered face from database
    // Try multiple collections and ID formats
    let student = await studentsCollection.findOne({
      $or: [
        { _id: studentId.toString() },
        { id: studentId.toString() },
        { clerkId: studentId.toString() }
      ]
    });

    // Also check users collection
    if (!student) {
      const usersCollection = db.collection('users');
      student = await usersCollection.findOne({
        $or: [
          { _id: studentId.toString() },
          { id: studentId.toString() },
          { clerkId: studentId.toString() }
        ]
      });
    }

    // Also check face_registrations collection
    if (!student) {
      const faceRegistrationsCollection = db.collection('face_registrations');
      const faceReg = await faceRegistrationsCollection.findOne({
        $or: [
          { studentId: studentId.toString() },
          { clerkId: studentId.toString() }
        ]
      });
      
      if (faceReg) {
        // Create a student object from face registration
        student = {
          _id: faceReg.studentId,
          name: faceReg.studentName,
          email: faceReg.studentEmail,
          registeredFace: faceReg.images?.[0] // Use first image
        };
      }
    }

    if (!student) {
      console.error('❌ Student not found:', { studentId, studentName });
      return NextResponse.json(
        { error: 'Student not found in database. Please contact admin to register your face.' },
        { status: 404 }
      );
    }

    console.log('✅ Student found:', student.name || student.email);

    // Check if student has a registered face in face_registrations collection
    const faceRegistrationsCollection = db.collection('face_registrations');
    const faceRegistration = await faceRegistrationsCollection.findOne({
      $or: [
        { studentId: studentId.toString() },
        { clerkId: studentId.toString() },
        { studentId: student._id?.toString() }
      ]
    });

    if (!faceRegistration || !faceRegistration.images || faceRegistration.images.length === 0) {
      console.error('❌ No face registration found for student:', studentId);
      return NextResponse.json(
        { 
          error: 'No registered face found. Please register your face first.',
          needsRegistration: true 
        },
        { status: 400 }
      );
    }

    console.log('✅ Face registration found with', faceRegistration.images.length, 'images');

    // Use the registered face for verification
    const registeredFace = faceRegistration.images[0]; // Use first image for verification

    // FACE VERIFICATION: Compare captured face with registered face
    // This prevents someone else from marking attendance using another person's account
    try {
      // Import face recognition library
      const faceapi = require('@/lib/faceRecognition');
      
      // Verify the captured face matches the registered face
      const isMatch = await faceapi.verifyFace(faceImage, registeredFace);
      
      if (!isMatch) {
        return NextResponse.json(
          { 
            error: 'Face verification failed. The face does not match the registered face for this account.',
            verificationFailed: true
          },
          { status: 403 }
        );
      }
      
      console.log('✅ Face verification successful for student:', studentName);
    } catch (error) {
      console.error('Face verification error:', error);
      // If face verification service fails, we should not allow attendance
      return NextResponse.json(
        { error: 'Face verification service unavailable. Please try again later.' },
        { status: 503 }
      );
    }
    
    // Face verification passed - mark attendance
    const attendanceRecord = {
      studentId: studentId.toString(),
      studentName,
      class: studentClass,
      rollNo,
      date: new Date(),
      status: 'present',
      markedAt: new Date(),
      markedBy: 'Self (Face Recognition)',
      method: 'face_recognition',
      teacherName: 'Self (Face Recognition)', // Add this for compatibility
      faceImageStored: true, // In production, store in cloud storage
      createdAt: new Date()
    };

    console.log('📝 Inserting attendance record:', attendanceRecord);
    const result = await attendanceCollection.insertOne(attendanceRecord);
    console.log('✅ Attendance record inserted with ID:', result.insertedId);

    return NextResponse.json({
      success: true,
      message: 'Attendance marked successfully using face recognition!',
      record: {
        date: attendanceRecord.date,
        status: attendanceRecord.status,
        id: result.insertedId
      }
    });

  } catch (error) {
    console.error('Error marking attendance:', error);
    return NextResponse.json(
      { error: 'Failed to mark attendance' },
      { status: 500 }
    );
  }
}
