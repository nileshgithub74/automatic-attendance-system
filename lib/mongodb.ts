import mongoose from "mongoose";
import dns from 'dns';

// Use Cloudflare DNS servers for better MongoDB Atlas connectivity
// This fixes DNS resolution issues with some ISPs
dns.setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4']);

const ConnectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL!, {
      family: 4,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("MongoDb connected..!!");
  } catch (error) {
    console.log("database connection failed", error);
    // Don't exit process in development, just log the error
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export default ConnectDb;

// For compatibility with existing code, export a function to get database
export async function getDatabase() {
  try {
    if (mongoose.connection.readyState === 0) {
      await ConnectDb();
    }
    return mongoose.connection.db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return null;
  }
}

// Export mongoose connection for direct use
export { mongoose };