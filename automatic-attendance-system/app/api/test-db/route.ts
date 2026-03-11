import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    console.log('Testing MongoDB connection...');
    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed - MongoDB not available',
      }, { status: 500 });
    }
    
    // Test connection by listing collections
    const collections = await db.listCollections().toArray();
    
    // Count documents in each collection
    const counts = {
      students: await db.collection('students').countDocuments(),
      teachers: await db.collection('teachers').countDocuments(),
      classes: await db.collection('classes').countDocuments(),
      notifications: await db.collection('notifications').countDocuments(),
    };
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB connected successfully',
      collections: collections.map(c => c.name),
      counts,
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
