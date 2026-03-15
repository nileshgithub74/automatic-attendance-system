// Test Mongoose connection
require('dotenv').config();
const ConnectDb = require('./lib/mongodb.ts').default;

async function testMongoose() {
  console.log('Testing Mongoose connection...');
  console.log('MONGODB_URL:', process.env.MONGODB_URL ? 'Set' : 'Not set');
  
  try {
    await ConnectDb();
    console.log('✅ Mongoose connection test successful');
  } catch (error) {
    console.error('❌ Mongoose connection test failed:', error.message);
  }
}

testMongoose();