// Script to add sample data to MongoDB for testing
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kumarnilesh843127_db_user:y7R6Sl6qRJmf1smL@cluster0.sbjxmny.mongodb.net/attendance_system?retryWrites=true&w=majority&tls=true&tlsAllowInvalidCertificates=true';

async function seedData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('attendance_system');

    // Clear existing data (optional)
    console.log('\n🗑️  Clearing existing data...');
    await db.collection('students').deleteMany({});
    await db.collection('teachers').deleteMany({});
    await db.collection('classes').deleteMany({});
    await db.collection('notifications').deleteMany({});

    // Insert sample students
    console.log('\n👨‍🎓 Adding sample students...');
    const students = [
      { id: 1, name: 'John Doe', class: 'Class 10A', className: 'Class 10A', attendancePercent: 95 },
      { id: 2, name: 'Jane Smith', class: 'Class 10A', className: 'Class 10A', attendancePercent: 88 },
      { id: 3, name: 'Mike Johnson', class: 'Class 10B', className: 'Class 10B', attendancePercent: 92 },
      { id: 4, name: 'Sarah Williams', class: 'Class 10B', className: 'Class 10B', attendancePercent: 97 },
      { id: 5, name: 'Tom Brown', class: 'Class 9A', className: 'Class 9A', attendancePercent: 85 },
    ];
    await db.collection('students').insertMany(students);
    console.log(`✅ Added ${students.length} students`);

    // Insert sample teachers
    console.log('\n👨‍🏫 Adding sample teachers...');
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
    console.log(`✅ Added ${teachers.length} teachers`);

    // Insert sample classes
    console.log('\n🏫 Adding sample classes...');
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
    console.log(`✅ Added ${classes.length} classes`);

    // Insert sample notifications
    console.log('\n🔔 Adding sample notifications...');
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
    console.log(`✅ Added ${notifications.length} notifications`);

    console.log('\n✨ Sample data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Students: ${students.length}`);
    console.log(`   - Teachers: ${teachers.length}`);
    console.log(`   - Classes: ${classes.length}`);
    console.log(`   - Notifications: ${notifications.length}`);
    console.log('\n🎉 You can now view the data in your admin dashboard!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the seed function
seedData();
