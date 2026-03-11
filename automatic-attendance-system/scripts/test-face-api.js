// Test script to verify MongoDB connection and face registration API
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testMongoDB() {
  console.log('🧪 Testing MongoDB Connection...\n');
  
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
  }
  
  console.log('📝 MongoDB URI:', uri.substring(0, 30) + '...');
  
  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      tls: true,
      tlsInsecure: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
    });
    
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ MongoDB connected successfully!\n');
    
    const db = client.db('attendance_system');
    
    // Test ping
    console.log('📡 Testing database ping...');
    await db.command({ ping: 1 });
    console.log('✅ Database ping successful!\n');
    
    // Check collections
    console.log('📚 Checking collections...');
    const collections = await db.listCollections().toArray();
    console.log('Collections found:', collections.map(c => c.name).join(', '));
    console.log('');
    
    // Check users collection
    console.log('👥 Checking users collection...');
    const usersCount = await db.collection('users').countDocuments();
    console.log(`Found ${usersCount} users`);
    
    // Check face_registrations collection
    console.log('📸 Checking face_registrations collection...');
    const faceRegCount = await db.collection('face_registrations').countDocuments();
    console.log(`Found ${faceRegCount} face registrations\n`);
    
    // Test face registration query
    console.log('🔍 Testing face registration query...');
    const testReg = await db.collection('face_registrations').findOne({});
    if (testReg) {
      console.log('✅ Sample registration found:', {
        studentId: testReg.studentId,
        studentName: testReg.studentName,
        imageCount: testReg.imageCount
      });
    } else {
      console.log('ℹ️  No face registrations yet');
    }
    
    await client.close();
    console.log('\n✅ All tests passed! MongoDB is working correctly.');
    console.log('\n📌 Next steps:');
    console.log('1. Make sure your dev server is running: npm run dev');
    console.log('2. Restart the server if it was already running');
    console.log('3. Try the face registration page again');
    
  } catch (error) {
    console.error('\n❌ MongoDB connection failed!');
    console.error('Error:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check MONGODB_URI in .env.local');
    console.error('2. Verify MongoDB Atlas IP whitelist');
    console.error('3. Check network connection');
    console.error('4. Verify MongoDB Atlas cluster is running');
    process.exit(1);
  }
}

testMongoDB();
