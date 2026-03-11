const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Read .env file manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
let uri = '';

for (const line of envLines) {
  if (line.startsWith('MONGODB_URI=')) {
    uri = line.substring('MONGODB_URI='.length).trim();
    break;
  }
}

const options = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

async function verifyOperations() {
  console.log('🔄 Verifying MongoDB operations...\n');
  
  let client;
  try {
    client = new MongoClient(uri, options);
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('attendance_system');
    
    // Check collections
    const collections = await db.listCollections().toArray();
    console.log('📊 Existing Collections:');
    collections.forEach(col => console.log(`   - ${col.name}`));
    console.log('');
    
    // Test read operation on students
    const studentsCount = await db.collection('students').countDocuments();
    console.log(`👥 Students in database: ${studentsCount}`);
    
    // Test read operation on teachers
    const teachersCount = await db.collection('teachers').countDocuments();
    console.log(`👨‍🏫 Teachers in database: ${teachersCount}`);
    
    // Test read operation on attendance
    const attendanceCount = await db.collection('attendance').countDocuments();
    console.log(`📝 Attendance records: ${attendanceCount}`);
    
    console.log('\n✅ All database operations working correctly!');
    
    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database operation failed:');
    console.error('Error:', error.message);
    if (client) await client.close();
    process.exit(1);
  }
}

verifyOperations();
