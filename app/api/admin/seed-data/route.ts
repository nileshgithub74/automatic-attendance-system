import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();

    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Clear existing data
    await db.collection('students').deleteMany({});
    await db.collection('teachers').deleteMany({});
    await db.collection('classes').deleteMany({});
    await db.collection('notifications').deleteMany({});

    // Insert sample students
    const students = [
      { id: 1, name: 'John Doe', class: 'Class 10A', className: 'Class 10A', attendancePercent: 95 },
      { id: 2, name: 'Jane Smith', class: 'Class 10A', className: 'Class 10A', attendancePercent: 88 },
      { id: 3, name: 'Mike Johnson', class: 'Class 10B', className: 'Class 10B', attendancePercent: 92 },
      { id: 4, name: 'Sarah Williams', class: 'Class 10B', className: 'Class 10B', attendancePercent: 97 },
      { id: 5, name: 'Tom Brown', class: 'Class 9A', className: 'Class 9A', attendancePercent: 85 },
      { id: 6, name: 'Emma Davis', class: 'Class 9A', className: 'Class 9A', attendancePercent: 91 },
      { id: 7, name: 'Oliver Wilson', class: 'Class 9B', className: 'Class 9B', attendancePercent: 89 },
      { id: 8, name: 'Sophia Martinez', class: 'Class 9B', className: 'Class 9B', attendancePercent: 94 },
    ];
    await db.collection('students').insertMany(students);

    // Insert sample teachers
    const teachers = [
      {
        id: 1,
        name: 'Prof. Robert Anderson',
        email: 'robert@school.edu',
        classes: ['Class 10A', 'Class 10B'],
        lastAttendanceMarked: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Dr. Emily Davis',
        email: 'emily@school.edu',
        classes: ['Class 9A', 'Class 9B'],
        lastAttendanceMarked: new Date().toISOString(),
      },
      {
        id: 3,
        name: 'Mr. James Wilson',
        email: 'james@school.edu',
        classes: ['Class 8A'],
        lastAttendanceMarked: 'Never',
      },
    ];
    await db.collection('teachers').insertMany(teachers);

    // Insert sample classes
    const classes = [
      {
        id: 1,
        name: 'Class 10A',
        totalStudents: 30,
        presentToday: 28,
        absentToday: 2,
        teacher: 'Prof. Robert Anderson',
      },
      {
        id: 2,
        name: 'Class 10B',
        totalStudents: 32,
        presentToday: 30,
        absentToday: 2,
        teacher: 'Prof. Robert Anderson',
      },
      {
        id: 3,
        name: 'Class 9A',
        totalStudents: 28,
        presentToday: 25,
        absentToday: 3,
        teacher: 'Dr. Emily Davis',
      },
      {
        id: 4,
        name: 'Class 9B',
        totalStudents: 29,
        presentToday: 29,
        absentToday: 0,
        teacher: 'Dr. Emily Davis',
      },
      {
        id: 5,
        name: 'Class 8A',
        totalStudents: 25,
        presentToday: 23,
        absentToday: 2,
        teacher: 'Mr. James Wilson',
      },
    ];
    await db.collection('classes').insertMany(classes);

    // Insert sample notifications
    const notifications = [
      {
        id: 1,
        message: 'Student John Doe marked absent',
        createdAt: new Date(),
        type: 'absence',
      },
      {
        id: 2,
        message: 'New assignment posted for Class 10A',
        createdAt: new Date(),
        type: 'assignment',
      },
      {
        id: 3,
        message: 'Parent meeting scheduled for tomorrow',
        createdAt: new Date(),
        type: 'meeting',
      },
    ];
    await db.collection('notifications').insertMany(notifications);

    return NextResponse.json({
      success: true,
      message: 'Sample data seeded successfully',
      counts: {
        students: students.length,
        teachers: teachers.length,
        classes: classes.length,
        notifications: notifications.length,
      },
    });
  } catch (error) {
    console.error('Error seeding data:', error);
    return NextResponse.json(
      { error: 'Failed to seed data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
