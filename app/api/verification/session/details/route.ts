import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get session
    const session = await db.collection('verification_sessions').findOne({ sessionId });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get today's date
    const todayDate = new Date().toISOString().split('T')[0];

    // Get all students who marked attendance today
    const attendanceRecords = await db
      .collection('attendance')
      .find({ date: todayDate })
      .toArray();

    // Get all students from the class
    const allStudents = await db
      .collection('users')
      .find({ 
        role: { $regex: /^student$/i },
        class: session.className
      })
      .toArray();

    // Get location logs for today
    const locationLogs = await db
      .collection('location_logs')
      .find({
        timestamp: {
          $gte: new Date(todayDate),
          $lt: new Date(new Date(todayDate).getTime() + 24 * 60 * 60 * 1000)
        }
      })
      .toArray();

    // Get network logs for today
    const networkLogs = await db
      .collection('network_logs')
      .find({
        timestamp: {
          $gte: new Date(todayDate),
          $lt: new Date(new Date(todayDate).getTime() + 24 * 60 * 60 * 1000)
        }
      })
      .toArray();

    // Get verification sessions logs
    const verificationLogs = await db
      .collection('verification_images')
      .find({ sessionId })
      .toArray();

    // Combine data with detailed logging
    const students = allStudents.map(student => {
      const studentId = student.id || student._id?.toString();
      
      const attendance = attendanceRecords.find(
        a => a.studentId === studentId || a.studentId === student.id
      );

      // Find student's location log
      const locationLog = locationLogs.find(
        log => log.userId === studentId || log.userId === student.id
      );

      // Find student's network log
      const networkLog = networkLogs.find(
        log => log.userId === studentId || log.userId === student.id
      );

      // Find verification images where student was detected
      const detectedImages = verificationLogs.filter(
        img => img.studentsIdentified?.includes(studentId)
      );

      // Calculate detailed metrics
      const totalVerificationImages = verificationLogs.length;
      const detectionCount = detectedImages.length;
      const detectionRate = totalVerificationImages > 0 
        ? detectionCount / totalVerificationImages 
        : 0;

      // Build activity log
      const activityLog = [];
      
      if (attendance) {
        activityLog.push({
          timestamp: attendance.markedAt || attendance.createdAt,
          action: 'Attendance Marked',
          details: `Status: ${attendance.status}`,
          type: 'attendance',
          icon: 'check'
        });
      }

      if (locationLog) {
        activityLog.push({
          timestamp: locationLog.timestamp,
          action: 'Location Captured',
          details: `Distance: ${locationLog.distanceFromClassroom}m, In Classroom: ${locationLog.isInClassroom ? 'Yes' : 'No'}`,
          type: 'location',
          icon: 'map'
        });
      }

      if (networkLog) {
        activityLog.push({
          timestamp: networkLog.timestamp,
          action: 'Network Verified',
          details: `Risk Score: ${networkLog.riskScore}, Threat: ${networkLog.threatLevel}`,
          type: 'network',
          icon: 'shield'
        });
      }

      detectedImages.forEach((img, idx) => {
        activityLog.push({
          timestamp: img.captureTime,
          action: `Detected in Image ${img.sequenceNumber}`,
          details: `Confidence: ${img.confidence || 'N/A'}`,
          type: 'detection',
          icon: 'camera',
          imageUrl: img.imageUrl
        });
      });

      // Sort activity log by timestamp
      activityLog.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        id: studentId,
        name: student.name,
        rollNo: student.rollNo || student.rollNumber || 'N/A',
        class: student.class,
        email: student.email || '',
        attendanceStatus: attendance?.status || 'absent',
        selfMarked: !!attendance && attendance.method === 'self_marked',
        aiVerified: !!attendance && attendance.method === 'ai_verified',
        detectionRate: detectionRate,
        detectionCount: detectionCount,
        totalImages: totalVerificationImages,
        capturedImage: attendance?.capturedFaceImageUrl || null,
        location: locationLog ? {
          latitude: locationLog.location.latitude,
          longitude: locationLog.location.longitude,
          accuracy: locationLog.location.accuracy,
          distanceFromClassroom: locationLog.distanceFromClassroom,
          isInClassroom: locationLog.isInClassroom,
          timestamp: locationLog.timestamp,
          deviceInfo: locationLog.deviceInfo
        } : null,
        network: networkLog ? {
          ipAddress: networkLog.ipAddress,
          isVPN: networkLog.isVPN,
          isProxy: networkLog.isProxy,
          isTor: networkLog.isTor,
          country: networkLog.country,
          city: networkLog.city,
          isp: networkLog.isp,
          latency: networkLog.latency,
          jitter: networkLog.jitter,
          riskScore: networkLog.riskScore,
          threatLevel: networkLog.threatLevel,
          flags: networkLog.flags || [],
          timestamp: networkLog.timestamp
        } : null,
        flags: [
          ...(attendance?.flags || []),
          ...(networkLog?.flags || []),
          ...(locationLog && !locationLog.isInClassroom ? ['OUTSIDE_CLASSROOM'] : [])
        ],
        activityLog: activityLog,
        detectedInImages: detectedImages.map(img => ({
          sequenceNumber: img.sequenceNumber,
          imageUrl: img.imageUrl,
          captureTime: img.captureTime,
          confidence: img.confidence
        }))
      };
    });

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        className: session.className,
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        totalImages: session.totalImages,
        capturedImages: session.capturedImages
      },
      students
    });
  } catch (error) {
    console.error('Error fetching session details:', error);
    return NextResponse.json({ error: 'Failed to fetch session details' }, { status: 500 });
  }
}
