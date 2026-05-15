import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

export async function DELETE() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const role = user?.publicMetadata?.role as string;

    // Only admins/principals can reset attendance
    if (role !== 'Principal' && role !== 'Admin' && role !== 'admin' && role !== 'principal') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get today's date in YYYY-MM-DD format (matching how attendance is stored)
    const todayDate = new Date().toISOString().split('T')[0];

    console.log('🗑️ Deleting attendance for date:', todayDate);

    // Delete all attendance records for today (date is stored as string)
    const result = await db.collection('attendance').deleteMany({
      date: todayDate
    });

    console.log(`✅ Deleted ${result.deletedCount} attendance records for today`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} attendance records for today`,
      deletedCount: result.deletedCount,
    });

  } catch (error) {
    console.error('Error resetting today\'s attendance:', error);
    return NextResponse.json(
      { error: 'Failed to reset attendance' },
      { status: 500 }
    );
  }
}
