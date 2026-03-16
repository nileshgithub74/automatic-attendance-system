import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    const attendanceCollection = db.collection('attendance');

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const method = searchParams.get('method'); // 'face_recognition' or 'teacher'
    const date = searchParams.get('date');
    const studentId = searchParams.get('studentId');

    // Build query
    const query: any = {};
    
    if (method) {
      query.method = method;
    }
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    if (studentId) {
      query.studentId = studentId;
    }

    // Fetch attendance records
    const records = await attendanceCollection
      .find(query)
      .sort({ date: -1, markedAt: -1 })
      .limit(500)
      .toArray();

    // Transform records for response
    const formattedRecords = records.map(record => ({
      id: record._id.toString(),
      studentId: record.studentId,
      studentName: record.studentName,
      class: record.class,
      rollNo: record.rollNo,
      date: record.date,
      status: record.status,
      markedAt: record.markedAt,
      markedBy: record.markedBy || record.teacherName || 'Unknown',
      method: record.method || 'teacher',
      faceImageStored: record.faceImageStored || false
    }));

    // Get statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStats = await attendanceCollection.aggregate([
      {
        $match: {
          date: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const stats = {
      totalToday: todayStats.reduce((sum, stat) => sum + stat.count, 0),
      faceRecognitionToday: todayStats.find(s => s._id === 'face_recognition')?.count || 0,
      teacherMarkedToday: todayStats.find(s => s._id === 'teacher' || !s._id)?.count || 0,
      totalRecords: records.length
    };

    return NextResponse.json({
      records: formattedRecords,
      statistics: stats
    });

  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance records' },
      { status: 500 }
    );
  }
}
