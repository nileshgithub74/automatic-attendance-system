import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch real location logs from MongoDB
    const client = await clientPromise;
    const db = client.db('attendance_system');
    
    const logs = await db.collection('location_logs').find({}).sort({ timestamp: -1 }).limit(100).toArray();

    return NextResponse.json({
      success: true,
      logs: logs || []
    });
  } catch (error: any) {
    console.error('Error fetching location logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch location logs' },
      { status: 500 }
    );
  }
}
