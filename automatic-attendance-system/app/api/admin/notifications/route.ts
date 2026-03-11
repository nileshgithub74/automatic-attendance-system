import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';
import { mockNotifications } from '@/lib/mockData';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const db = await getDatabase();
      
      if (!db) {
        console.log('Database not available');
        return NextResponse.json({ totalToday: 0 });
      }

      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Count notifications from today
      const count = await db.collection('notifications').countDocuments({
        createdAt: { $gte: today }
      });

      return NextResponse.json({ totalToday: count });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ totalToday: 0 });
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ totalToday: 0 }, { status: 200 });
  }
}
