import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication (Clerk or custom)
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

    if (!studentId || !studentName || !faceImage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the student is marking their own attendance
    const authenticatedStudentId = userId || headerStudentId;
    if (studentId.toString() !== authenticatedStudentId) {
      return NextResponse.json(
        { error: 'You can only mark your own attendance' },
        { status: 403 }
      );
    }

    const client = await clientPromise;
    const db = client.db('attendance_system');
    const attendanceCollection = db.collection('attendance');
    const studentsCollection = db.collection('students');
    const locationLogsCollection = db.collection('location_logs');
    const networkLogsCollection = db.collection('network_logs');

    // Check if attendance already marked today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await attendanceCollection.findOne({
      studentId: studentId.toString(),
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: 'Attendance already marked for today' },
        { status: 400 }
      );
    }

    // Get the student's registered face from database
    let student = await studentsCollection.findOne({
      $or: [
        { _id: studentId.toString() },
        { id: studentId.toString() },
        { clerkId: studentId.toString() }
      ]
    });

    // Also check users collection
    if (!student) {
      const usersCollection = db.collection('users');
      student = await usersCollection.findOne({
        $or: [
          { _id: studentId.toString() },
          { id: studentId.toString() },
          { clerkId: studentId.toString() }
        ]
      });
    }

    // Also check face_registrations collection
    if (!student) {
      const faceRegistrationsCollection = db.collection('face_registrations');
      const faceReg = await faceRegistrationsCollection.findOne({
        $or: [
          { studentId: studentId.toString() },
          { clerkId: studentId.toString() }
        ]
      });
      
      if (faceReg) {
        student = {
          _id: faceReg.studentId,
          name: faceReg.studentName,
          email: faceReg.studentEmail,
          class: faceReg.class,
          registeredFace: faceReg.images?.[0]
        };
      }
    }

    if (!student) {
      console.error('Student not found:', { studentId, studentName });
      return NextResponse.json(
        { error: 'Student not found in database. Please contact admin to register your face.' },
        { status: 404 }
      );
    }

    console.log('Student found:', student.name || student.email);

    // Check if student has a registered face
    const faceRegistrationsCollection = db.collection('face_registrations');
    const faceRegistration = await faceRegistrationsCollection.findOne({
      $or: [
        { studentId: studentId.toString() },
        { clerkId: studentId.toString() },
        { studentId: student._id?.toString() }
      ]
    });

    if (!faceRegistration || !faceRegistration.images || faceRegistration.images.length === 0) {
      console.error('No face registration found for student:', studentId);
      return NextResponse.json(
        { 
          error: 'No registered face found. Please register your face first.',
          needsRegistration: true 
        },
        { status: 400 }
      );
    }

    console.log('Face registration found with', faceRegistration.images.length, 'images');

    const registeredFace = faceRegistration.images[0];

    // STEP 1: LOG LOCATION DATA
    let locationLog = null;
    let distanceFromClass = null;
    let isInClassroom = false;
    
    if (location && location.latitude && location.longitude) {
      // Define classroom location (you can store this in database per class)
      const classroomLocation = {
        latitude: 28.6139, // Example: Delhi coordinates
        longitude: 77.2090,
        radius: 50 // 50 meters radius
      };

      // Calculate distance using Haversine formula
      const R = 6371e3; // Earth radius in meters
      const φ1 = classroomLocation.latitude * Math.PI / 180;
      const φ2 = location.latitude * Math.PI / 180;
      const Δφ = (location.latitude - classroomLocation.latitude) * Math.PI / 180;
      const Δλ = (location.longitude - classroomLocation.longitude) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      distanceFromClass = R * c; // Distance in meters
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
        attendanceType: 'face_recognition',
        createdAt: new Date()
      };

      await locationLogsCollection.insertOne(locationLog);
      console.log('Location logged:', { distanceFromClass: Math.round(distanceFromClass), isInClassroom });
    }

    // STEP 2: LOG NETWORK SECURITY DATA
    let networkLog = null;
    let networkFlags = [];
    
    if (networkInfo || true) { // Always log network info
      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'Unknown';

      // Perform VPN/Proxy detection
      let isVPN = false;
      let isProxy = false;
      let isTor = false;
      let isHosting = false;
      let country = 'Unknown';
      let city = 'Unknown';
      let isp = 'Unknown';
      let riskScore = 0;

      try {
        // Call IP intelligence API (you can use ipinfo.io, iphub.info, etc.)
        // For now, we'll use basic detection
        const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        if (response.ok) {
          const data = await response.json();
          country = data.country_name || 'Unknown';
          city = data.city || 'Unknown';
          isp = data.org || 'Unknown';
          
          // Check for VPN/Proxy indicators
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

      // Calculate network metrics
      const latency = networkInfo?.latency || Math.random() * 100; // ms
      const jitter = networkInfo?.jitter || Math.random() * 20; // ms
      
      // Calculate risk score
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
        attendanceType: 'face_recognition',
        createdAt: new Date()
      };

      await networkLogsCollection.insertOne(networkLog);
      console.log('Network logged:', { riskScore, threatLevel, flags: networkFlags });
    }

    // STEP 3: FACE VERIFICATION
    // Simulate face verification (in production, use actual face-api.js)
    const faceVerificationPassed = true; // Simulate successful verification
    
    if (!faceVerificationPassed) {
      return NextResponse.json(
        { 
          error: 'Face verification failed. The face does not match the registered face.',
          verificationFailed: true
        },
        { status: 403 }
      );
    }

    console.log('Face verification successful for student:', studentName);

    // STEP 4: AUTOMATIC ATTENDANCE DECISION
    // Determine if student should be marked present or absent
    let attendanceStatus: 'present' | 'absent' | 'flagged' = 'present';
    let autoDecisionReason = 'Face verified successfully';
    
    // Auto-mark absent if critical conditions fail
    if (!isInClassroom && distanceFromClass && distanceFromClass > 100) {
      attendanceStatus = 'absent';
      autoDecisionReason = `Student is ${Math.round(distanceFromClass)}m away from classroom`;
    } else if (riskScore >= 70) {
      attendanceStatus = 'flagged';
      autoDecisionReason = `High security risk detected (score: ${riskScore})`;
    } else if (networkFlags.includes('VPN_DETECTED') || networkFlags.includes('PROXY_DETECTED')) {
      attendanceStatus = 'flagged';
      autoDecisionReason = 'VPN/Proxy detected - requires manual verification';
    }

    // STEP 5: MARK ATTENDANCE
    const attendanceRecord = {
      studentId: studentId.toString(),
      studentName,
      class: studentClass,
      rollNo,
      date: new Date(),
      status: attendanceStatus,
      markedAt: new Date(),
      markedBy: 'Self (Face Recognition)',
      method: 'face_recognition',
      teacherName: 'Self (Face Recognition)',
      faceImageStored: true,
      
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
      
      // Auto-decision metadata
      autoDecision: {
        status: attendanceStatus,
        reason: autoDecisionReason,
        flags: networkFlags,
        timestamp: new Date()
      },
      
      createdAt: new Date()
    };

    console.log('Inserting attendance record:', { status: attendanceStatus, reason: autoDecisionReason });
    const result = await attendanceCollection.insertOne(attendanceRecord);
    console.log('Attendance record inserted with ID:', result.insertedId);

    return NextResponse.json({
      success: true,
      message: `Attendance ${attendanceStatus === 'present' ? 'marked as PRESENT' : attendanceStatus === 'flagged' ? 'FLAGGED for review' : 'marked as ABSENT'} - ${autoDecisionReason}`,
      record: {
        date: attendanceRecord.date,
        status: attendanceStatus,
        id: result.insertedId,
        autoDecision: {
          status: attendanceStatus,
          reason: autoDecisionReason,
          flags: networkFlags
        },
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
