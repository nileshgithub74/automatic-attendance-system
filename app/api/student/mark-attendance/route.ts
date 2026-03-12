import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const headerStudentId = request.headers.get('x-student-id');
    
    if (!userId && !headerStudentId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      studentId, 
      studentName, 
      class: studentClass, 
      rollNo, 
      faceImage,
      location,
      networkInfo 
    } = body;

    if (!studentId || !studentName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    const attendanceCollection = db.collection('attendance');
    const locationLogsCollection = db.collection('location_logs');
    const networkLogsCollection = db.collection('network_logs');

    // Check if attendance already marked today
    const todayDate = new Date().toISOString().split('T')[0];
    const existingAttendance = await attendanceCollection.findOne({
      studentId: studentId.toString(),
      date: todayDate
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: 'Attendance already marked for today' },
        { status: 400 }
      );
    }

    // STEP 1: LOG LOCATION DATA
    let locationLog = null;
    let distanceFromClass = null;
    let isInClassroom = false;
    
    if (location && location.latitude && location.longitude) {
      const classroomLocation = {
        latitude: 28.6139,
        longitude: 77.2090,
        radius: 100 // 100 meters radius
      };

      // Calculate distance using Haversine formula
      const R = 6371e3;
      const φ1 = classroomLocation.latitude * Math.PI / 180;
      const φ2 = location.latitude * Math.PI / 180;
      const Δφ = (location.latitude - classroomLocation.latitude) * Math.PI / 180;
      const Δλ = (location.longitude - classroomLocation.longitude) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      distanceFromClass = R * c;
      isInClassroom = distanceFromClass <= classroomLocation.radius;

      locationLog = {
        userId: studentId.toString(),
        userName: studentName,
        userRole: 'student',
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || 0
        },
        classroomLocation,
        distanceFromClassroom: Math.round(distanceFromClass),
        isInClassroom,
        timestamp: new Date(),
        deviceInfo: {
          userAgent: request.headers.get('user-agent') || 'Unknown',
          platform: location.platform || 'Unknown',
          isMobile: /mobile/i.test(request.headers.get('user-agent') || '')
        },
        attendanceType: 'self_marked',
        createdAt: new Date()
      };

      await locationLogsCollection.insertOne(locationLog);
      console.log('Location logged:', { distanceFromClass: Math.round(distanceFromClass), isInClassroom });
    }

    // STEP 2: LOG NETWORK SECURITY DATA
    let networkLog = null;
    let networkFlags = [];
    
    if (networkInfo || true) {
      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'Unknown';

      let isVPN = false;
      let isProxy = false;
      let isTor = false;
      let isHosting = false;
      let country = 'Unknown';
      let city = 'Unknown';
      let isp = 'Unknown';
      let riskScore = 0;

      try {
        const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        if (response.ok) {
          const data = await response.json();
          country = data.country_name || 'Unknown';
          city = data.city || 'Unknown';
          isp = data.org || 'Unknown';
          
          if (data.threat && data.threat.is_proxy) isProxy = true;
          if (data.threat && data.threat.is_tor) isTor = true;
          if (isp.toLowerCase().includes('vpn') || isp.toLowerCase().includes('proxy')) {
            isVPN = true;
          }
          if (data.asn && data.asn.type === 'hosting') isHosting = true;
        }
      } catch (error) {
        console.error('IP detection error:', error);
      }

      const latency = networkInfo?.latency || Math.random() * 100;
      const jitter = networkInfo?.jitter || Math.random() * 20;
      
      if (isVPN) riskScore += 40;
      if (isProxy) riskScore += 40;
      if (isTor) riskScore += 60;
      if (isHosting) riskScore += 30;
      if (!isInClassroom) riskScore += 20;
      if (latency > 200) riskScore += 10;
      if (jitter > 50) riskScore += 10;

      const threatLevel = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';

      if (isVPN) networkFlags.push('VPN_DETECTED');
      if (isProxy) networkFlags.push('PROXY_DETECTED');
      if (isTor) networkFlags.push('TOR_DETECTED');
      if (isHosting) networkFlags.push('DATACENTER_IP');
      if (!isInClassroom) networkFlags.push('OUTSIDE_CLASSROOM');
      if (latency > 200) networkFlags.push('HIGH_LATENCY');

      networkLog = {
        userId: studentId.toString(),
        userName: studentName,
        userRole: 'student',
        ipAddress,
        isVPN,
        isProxy,
        isTor,
        isHosting,
        country,
        city,
        isp,
        latency: Math.round(latency),
        jitter: Math.round(jitter),
        riskScore,
        threatLevel,
        flags: networkFlags,
        connectionType: networkInfo?.connectionType || 'Unknown',
        wifiSSID: networkInfo?.wifiSSID || 'Unknown',
        timestamp: new Date(),
        attendanceType: 'self_marked',
        createdAt: new Date()
      };

      await networkLogsCollection.insertOne(networkLog);
      console.log('Network logged:', { riskScore, threatLevel, flags: networkFlags });
    }

    // STEP 3: UPLOAD FACE IMAGE TO CLOUDINARY (if provided)
    let faceImageUrl = null;
    if (faceImage) {
      const todayDate = new Date().toISOString().split('T')[0];
      const uploadResult = await uploadToCloudinary(
        faceImage,
        `attendance-captures/${todayDate}`,
        `${studentId}_${Date.now()}`
      );
      if (uploadResult.success) {
        faceImageUrl = uploadResult.secureUrl;
      }
    }

    // STEP 4: MARK ATTENDANCE AS PRESENT (teacher AI verification will later confirm/override)
    const attendanceRecord = {
      studentId: studentId.toString(),
      studentName,
      class: studentClass,
      rollNo,
      date: todayDate,
      status: 'present', // Mark as present initially, AI verification will confirm/override
      markedAt: new Date(),
      markedBy: 'Self (Student)',
      method: 'self_marked',
      teacherName: 'Self Marked - Awaiting AI Verification',
      
      // Face image if provided
      capturedFaceImageUrl: faceImageUrl,
      
      // Location data
      location: locationLog ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        distanceFromClassroom: Math.round(distanceFromClass || 0),
        isInClassroom
      } : null,
      
      // Network security data
      networkSecurity: networkLog ? {
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
        wifiSSID: networkLog.wifiSSID,
        connectionType: networkLog.connectionType
      } : null,
      
      createdAt: new Date()
    };

    const result = await attendanceCollection.insertOne(attendanceRecord);

    return NextResponse.json({
      success: true,
      message: 'Attendance marked as PRESENT! Teacher AI verification will confirm your presence in class.',
      record: {
        date: attendanceRecord.date,
        status: 'present',
        id: result.insertedId,
        location: locationLog ? {
          distanceFromClassroom: Math.round(distanceFromClass || 0),
          isInClassroom
        } : null,
        networkSecurity: networkLog ? {
          riskScore: networkLog.riskScore,
          threatLevel: networkLog.threatLevel,
          flags: networkFlags
        } : null
      }
    });

  } catch (error) {
    console.error('Error marking attendance:', error);
    return NextResponse.json(
      { error: 'Failed to mark attendance' },
      { status: 500 }
    );
  }
}
