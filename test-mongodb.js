// Test MongoDB connection
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testMongoDB() {
  console.log('Testing MongoDB connection...');
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
  
  if (!process.env.MONGODB_URI) {
    console.log('❌ MONGODB_URI environment variable is not set');
    return;
  }

  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    
    console.log('Attempting to connect...');
    await client.connect();
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Test database operations
    const db = client.db('attendance_system');
    const collections = await db.listCollections().toArray();
    
    console.log('📊 Available collections:', collections.map(c => c.name));
    
    // Test a simple query
    const usersCount = await db.collection('users').countDocuments();
    console.log('👥 Users count:', usersCount);
    
    await client.close();
    console.log('✅ MongoDB test completed successfully');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Full error:', error);
  }
}

testMongoDB();