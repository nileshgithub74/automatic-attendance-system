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

    // Get location and network logs collections
    const locationLogsCollection = db.collection('location_logs');
    const networkLogsCollection = db.collection('network_logs');
    const verificationImagesCollection = db.collection('verification_images');

    // Transform records for response with location and network data
    const formattedRecords = await Promise.all(records.map(async (record) => {
      const baseRecord = {
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
      };

      // For face recognition records, fetch additional data
      if (record.method === 'face_recognition') {
        // Get location data
        const locationLog = await locationLogsCollection.findOne({
          studentId: record.studentId,
          timestamp: { 
            $gte: new Date(new Date(record.markedAt).getTime() - 5 * 60000), // 5 minutes before
            $lte: new Date(new Date(record.markedAt).getTime() + 5 * 60000)  // 5 minutes after
          }
        }, { sort: { timestamp: -1 } });

        // Get network data
        const networkLog = await networkLogsCollection.findOne({
          studentId: record.studentId,
          timestamp: { 
            $gte: new Date(new Date(record.markedAt).getTime() - 5 * 60000),
            $lte: new Date(new Date(record.markedAt).getTime() + 5 * 60000)
          }
        }, { sort: { timestamp: -1 } });

        // Get captured face image
        const capturedImage = await verificationImagesCollection.findOne({
          studentId: record.studentId,
          capturedAt: { 
            $gte: new Date(new Date(record.markedAt).getTime() - 5 * 60000),
            $lte: new Date(new Date(record.markedAt).getTime() + 5 * 60000)
          }
        }, { sort: { capturedAt: -1 } });

        // Build security flags
        const flags: string[] = [];
        if (locationLog && !locationLog.isInClassroom) {
          flags.push('Outside Classroom');
        }
        if (networkLog?.isVPN) {
          flags.push('VPN Detected');
        }
        if (networkLog?.isProxy) {
          flags.push('Proxy Detected');
        }
        if (networkLog && networkLog.riskScore >= 70) {
          flags.push('High Risk Network');
        }
        if (locationLog && locationLog.accuracy > 50) {
          flags.push('Low GPS Accuracy');
        }

        return {
          ...baseRecord,
          location: locationLog ? {
            latitude: locationLog.latitude,
            longitude: locationLog.longitude,
            accuracy: locationLog.accuracy,
            distanceFromClassroom: locationLog.distanceFromClassroom,
            isInClassroom: locationLog.isInClassroom,
            timestamp: locationLog.timestamp
          } : null,
          networkSecurity: networkLog ? {
            ipAddress: networkLog.ipAddress,
            city: networkLog.city || 'Unknown',
            country: networkLog.country || 'Unknown',
            isVPN: networkLog.isVPN || false,
            isProxy: networkLog.isProxy || false,
            latency: networkLog.latency || 0,
            jitter: networkLog.jitter || 0,
            riskScore: networkLog.riskScore || 0,
            timestamp: networkLog.timestamp
          } : null,
          capturedFaceImageUrl: capturedImage?.imageUrl || null,
          flags: flags.length > 0 ? flags : null
        };
      }

      return baseRecord;
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
