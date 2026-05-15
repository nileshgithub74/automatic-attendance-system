import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch real network logs from MongoDB
    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ logs: [] });
    }
    
    const logs = await db.collection('network_logs').find({}).sort({ timestamp: -1 }).limit(100).toArray();

    return NextResponse.json({
      success: true,
      logs: logs || []
    });
  } catch (error: any) {
    console.error('Error fetching network logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch network logs' },
      { status: 500 }
    );
  }
}
