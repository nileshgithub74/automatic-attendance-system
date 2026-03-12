import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Dummy data for testing
    const dummySessions = [
      {
        sessionId: 'sess_001_2026_03_12',
        teacherName: 'Mr. John Smith',
        className: 'Class 10-A',
        date: new Date('2026-03-12'),
        status: 'completed',
        capturedImages: 5,
        totalImages: 5,
        studentsMarked: ['STU001', 'STU002', 'STU003', 'STU004', 'STU005']
      },
      {
        sessionId: 'sess_002_2026_03_12',
        teacherName: 'Ms. Sarah Johnson',
        className: 'Class 10-B',
        date: new Date('2026-03-12'),
        status: 'completed',
        capturedImages: 4,
        totalImages: 4,
        studentsMarked: ['STU006', 'STU007', 'STU008']
      },
      {
        sessionId: 'sess_003_2026_03_12',
        teacherName: 'Mr. David Wilson',
        className: 'Class 9-A',
        date: new Date('2026-03-12'),
        status: 'active',
        capturedImages: 2,
        totalImages: 5,
        studentsMarked: ['STU009', 'STU010']
      },
      {
        sessionId: 'sess_004_2026_03_11',
        teacherName: 'Ms. Emily Brown',
        className: 'Class 11-A',
        date: new Date('2026-03-11'),
        status: 'completed',
        capturedImages: 6,
        totalImages: 6,
        studentsMarked: ['STU011', 'STU012', 'STU013', 'STU014', 'STU015', 'STU016']
      }
    ];

    return NextResponse.json({
      success: true,
      sessions: dummySessions
    });
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
