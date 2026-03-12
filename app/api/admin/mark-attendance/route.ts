import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { studentId, status, date } = body;

    if (!studentId || !status || !['present', 'absent', 'flagged'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid request. Required: studentId, status (present/absent/flagged), date' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('attendance_system');

    // Check if user is admin or principal
    const adminUser = await db.collection('users').findOne({
      clerkId: userId
    });

    if (!adminUser || !['admin', 'principal'].includes(adminUser.role?.toLowerCase())) {
      return NextResponse.json(
        { error: 'Only admins and principals can mark attendance' },
        { status: 403 }
      );
    }

    // Parse date
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Check if attendance already exists for this date
    const existingAttendance = await db.collection('attendance').findOne({
      studentId: studentId,
      date: {
        $gte: attendanceDate,
        $lt: nextDay
      }
    });

    if (existingAttendance) {
      // Update existing attendance
      await db.collection('attendance').updateOne(
        { _id: existingAttendance._id },
        {
          $set: {
            status: status,
            markedBy: `Admin: ${adminUser.name || adminUser.email}`,
            markedAt: new Date(),
            method: 'manual_admin',
            updatedAt: new Date()
          }
        }
      );

      return NextResponse.json({
        success: true,
        message: `Attendance updated to ${status}`,
        recordId: existingAttendance._id
      });
    } else {
      // Create new attendance record
      const newRecord = {
        studentId: studentId,
        date: attendanceDate,
        status: status,
        markedBy: `Admin: ${adminUser.name || adminUser.email}`,
        markedAt: new Date(),
        method: 'manual_admin',
        teacherName: adminUser.name || adminUser.email,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('attendance').insertOne(newRecord);

      return NextResponse.json({
        success: true,
        message: `Attendance marked as ${status}`,
        recordId: result.insertedId
      });
    }
  } catch (error: any) {
    console.error('Error marking attendance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark attendance' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const date = searchParams.get('date');

    if (!studentId || !date) {
      return NextResponse.json(
        { error: 'Missing studentId or date' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('attendance_system');

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const attendance = await db.collection('attendance').findOne({
      studentId: studentId,
      date: {
        $gte: attendanceDate,
        $lt: nextDay
      }
    });

    return NextResponse.json({
      success: true,
      attendance: attendance || null
    });
  } catch (error: any) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}
