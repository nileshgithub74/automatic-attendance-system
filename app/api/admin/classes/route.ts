import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';
import { mockClasses } from '@/lib/mockData';

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
        return NextResponse.json([]);
      }

      const classes = await db.collection('classes').find({}).toArray();

      // Transform data to match the expected format
      const formattedClasses = classes.map((cls: any) => ({
        id: cls.id || cls._id?.toString() || Math.random().toString(36).substr(2, 9),
        name: cls.name || 'Unknown Class',
        totalStudents: cls.totalStudents || 0,
        presentToday: cls.presentToday || 0,
        absentToday: cls.absentToday || (cls.totalStudents - cls.presentToday) || 0,
        teacher: cls.teacher || 'Not assigned',
      }));

      return NextResponse.json(formattedClasses);
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json([], { status: 200 });
  }
}
