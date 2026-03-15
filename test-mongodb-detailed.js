// Detailed MongoDB connection test
const { MongoClient } = require('mongodb');
const dns = require('dns');
const { promisify } = require('util');
require('dotenv').config();

const resolveSrv = promisify(dns.resolveSrv);

async function testMongoDBDetailed() {
  console.log('🔍 Detailed MongoDB Connection Diagnosis');
  console.log('=====================================');
  
  const uri = process.env.MONGODB_URI;
  console.log('1. Connection URI:', uri ? 'Set' : 'Not set');
  
  if (!uri) {
    console.log('❌ MONGODB_URI not found in environment variables');
    return;
  }
  
  // Parse the URI to extract hostname
  const uriMatch = uri.match(/mongodb\+srv:\/\/[^@]+@([^\/]+)/);
  if (uriMatch) {
    const hostname = uriMatch[1];
    console.log('2. Extracted hostname:', hostname);
    
    // Test DNS resolution
    console.log('3. Testing DNS resolution...');
    try {
      const srvRecords = await resolveSrv(`_mongodb._tcp.${hostname}`);
      console.log('✅ SRV records found:', srvRecords.length);
      srvRecords.forEach((record, i) => {
        console.log(`   Record ${i + 1}: ${record.name}:${record.port} (priority: ${record.priority})`);
      });
    } catch (dnsError) {
      console.log('❌ DNS SRV lookup failed:', dnsError.message);
      console.log('   This suggests the MongoDB Atlas cluster might not exist or be accessible');
    }
  }
  
  // Test MongoDB connection
  console.log('4. Testing MongoDB connection...');
  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    
    console.log('   Attempting to connect...');
    await client.connect();
    console.log('✅ Connected successfully');
    
    const db = client.db('attendance_system');
    await db.command({ ping: 1 });
    console.log('✅ Database ping successful');
    
    await client.close();
    console.log('✅ Connection closed');
    
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    console.log('   Error code:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   → This usually means the cluster is not accessible');
    } else if (error.message.includes('querySrv')) {
      console.log('   → This is a DNS resolution issue');
    } else if (error.message.includes('authentication')) {
      console.log('   → This is an authentication issue (wrong username/password)');
    }
  }
  
  console.log('\n🔧 Troubleshooting suggestions:');
  console.log('1. Check if MongoDB Atlas cluster is running (not paused)');
  console.log('2. Verify the cluster name in MongoDB Atlas dashboard');
  console.log('3. Check IP whitelist settings (add 0.0.0.0/0 for testing)');
  console.log('4. Verify username and password are correct');
  console.log('5. Try using a standard connection string instead of SRV');
}

testMongoDBDetailed();