// Run this script to initialize the database with sample data
// Usage: npx tsx scripts/init-db.ts

import { getDatabase } from '../lib/mongodb';
import { Student, Teacher } from '../lib/models';

async function initializeDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    const db = await getDatabase();
    
    if (!db) {
      console.error('Failed to connect to database');
      process.exit(1);
    }

    // Check if data already exists
    const existingStudents = await db.collection('students').countDocuments();
    if (existingStudents > 0) {
      console.log('Database already has data. Skipping initialization.');
      process.exit(0);
    }

    console.log('Initializing database with sample data...');

    // Insert sample students
    const students: Student[] = [
      { id: 1, name: 'Ravi Kumar', parentNumber: '+919876543210', class: 'Class 5' },
      { id: 2, name: 'Sita Sharma', parentNumber: '+919123456789', class: 'Class 5' },
      { id: 3, name: 'Karan Singh', parentNumber: '+919998887776', class: 'Class 6' },
      { id: 4, name: 'Priya Patel', parentNumber: '+919876543211', class: 'Class 6' },
      { id: 5, name: 'Amit Verma', parentNumber: '+919876543212', class: 'Class 7' },
      { id: 6, name: 'Neha Gupta', parentNumber: '+919876543213', class: 'Class 7' },
      { id: 7, name: 'Rahul Joshi', parentNumber: '+919876543214', class: 'Class 8' },
      { id: 8, name: 'Anjali Reddy', parentNumber: '+919876543215', class: 'Class 8' },
    ];

    await db.collection('students').insertMany(students);
    console.log(`✓ Inserted ${students.length} students`);

    // Insert sample teachers
    const teachers: Teacher[] = [
      {
        id: 1,
        name: 'John Teacher',
        email: 'john.teacher@school.com',
        classes: ['Class 5', 'Class 6'],
        lastAttendanceMarked: new Date().toLocaleString(),
      },
      {
        id: 2,
        name: 'Sarah Teacher',
        email: 'sarah.teacher@school.com',
        classes: ['Class 7', 'Class 8'],
        lastAttendanceMarked: new Date().toLocaleString(),
      },
    ];

    await db.collection('teachers').insertMany(teachers);
    console.log(`✓ Inserted ${teachers.length} teachers`);

    console.log('\n✅ Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
