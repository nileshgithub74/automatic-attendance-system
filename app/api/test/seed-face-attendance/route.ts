import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const role = user?.publicMetadata?.role as string;

    // Only admins can seed test data
    if (role !== 'Principal' && role !== 'Admin' && role !== 'admin' && role !== 'principal') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get today's date in YYYY-MM-DD format
    const todayDate = new Date().toISOString().split('T')[0];

    // Create test face recognition attendance records
    const testRecords = [
      {
        studentId: 'test_student_1',
        studentName: 'Test Student 1',
        class: 'Class 10A',
        rollNo: '001',
        date: todayDate,
        status: 'present',
        markedAt: new Date(),
        markedBy: 'Self (Student)',
        method: 'self_marked',
        capturedFaceImageUrl: 'https://via.placeholder.com/150',
        location: {
          latitude: 31.2520,
          longitude: 75.7050,
          accuracy: 10,
          distanceFromClassroom: 5,
          isInClassroom: true,
        },
        networkSecurity: {
          ipAddress: '192.168.1.100',
          city: 'Jalandhar',
          country: 'India',
          isVPN: false,
          isProxy: false,
          latency: 50,
          jitter: 5,
          riskScore: 10,
        },
        createdAt: new Date(),
      },
      {
        studentId: 'test_student_2',
        studentName: 'Test Student 2',
        class: 'Class 10A',
        rollNo: '002',
        date: todayDate,
        status: 'present',
        markedAt: new Date(),
        markedBy: 'AI Face Recognition System',
        method: 'ai_face_recognition',
        aiVerified: true,
        aiConfidence: 0.95,
        capturedFaceImageUrl: 'https://via.placeholder.com/150',
        location: {
          latitude: 31.2525,
          longitude: 75.7055,
          accuracy: 15,
          distanceFromClassroom: 10,
          isInClassroom: true,
        },
        networkSecurity: {
          ipAddress: '192.168.1.101',
          city: 'Jalandhar',
          country: 'India',
          isVPN: false,
          isProxy: false,
          latency: 45,
          jitter: 3,
          riskScore: 5,
        },
        createdAt: new Date(),
      },
      {
        studentId: 'test_student_3',
        studentName: 'Test Student 3',
        class: 'Class 10B',
        rollNo: '003',
        date: todayDate,
        status: 'present',
        markedAt: new Date(),
        markedBy: 'Self (Student)',
        method: 'self_marked',
        capturedFaceImageUrl: 'https://via.placeholder.com/150',
        location: {
          latitude: 31.2530,
          longitude: 75.7060,
          accuracy: 20,
          distanceFromClassroom: 80,
          isInClassroom: false,
        },
        networkSecurity: {
          ipAddress: '10.0.0.50',
          city: 'Unknown',
          country: 'Unknown',
          isVPN: true,
          isProxy: false,
          latency: 150,
          jitter: 25,
          riskScore: 75,
        },
        flags: ['Outside Classroom', 'VPN Detected', 'High Risk Network'],
        createdAt: new Date(),
      },
    ];

    // Insert test records
    const result = await db.collection('attendance').insertMany(testRecords);

    console.log(`✅ Created ${result.insertedCount} test face recognition attendance records`);

    return NextResponse.json({
      success: true,
      message: `Created ${result.insertedCount} test face recognition attendance records for today`,
      insertedCount: result.insertedCount,
      date: todayDate,
    });

  } catch (error) {
    console.error('Error seeding test data:', error);
    return NextResponse.json(
      { error: 'Failed to seed test data' },
      { status: 500 }
    );
  }
}
