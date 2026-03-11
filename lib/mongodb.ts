import { MongoClient, Db } from 'mongodb';

// Skip MongoDB connection during build time
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                    process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI;

if (!process.env.MONGODB_URI && !isBuildTime) {
  throw new Error('Please add your MongoDB URI to .env file');
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

// Set TLS minimum version for MongoDB Atlas compatibility
if (typeof process !== 'undefined' && process.env.NODE_ENV) {
  const tls = require('tls');
  if (tls.DEFAULT_MIN_VERSION !== 'TLSv1.2') {
    tls.DEFAULT_MIN_VERSION = 'TLSv1.2';
  }
}

// MongoDB connection options optimized for Vercel
const options = {
  serverSelectionTimeoutMS: 10000, // Reduced for Vercel
  socketTimeoutMS: 45000, // Vercel function timeout is 60s
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
  minPoolSize: 1, // Reduced for serverless
  retryWrites: true,
  retryReads: true,
  // SSL/TLS settings
  tls: true,
  // Additional options
  maxIdleTimeMS: 60000,
  waitQueueTimeoutMS: 10000,
  // DNS resolution settings
  family: 4, // Force IPv4
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// Skip connection during build time
if (isBuildTime) {
  // Create a mock promise that never resolves during build
  clientPromise = new Promise(() => {});
} else if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the connection
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, create a new client for each connection
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function getDatabase(): Promise<Db | null> {
  // Return null during build time
  if (isBuildTime) {
    return null;
  }
  
  try {
    const client = await clientPromise;
    const db = client.db('attendance_system');
    // Test the connection
    await db.command({ ping: 1 });
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.error('Please check:');
    console.error('1. MongoDB URI is correct in .env file');
    console.error('2. Network connection is stable');
    console.error('3. MongoDB Atlas IP whitelist includes your IP');
    return null;
  }
}

