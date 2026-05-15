import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch real location logs from MongoDB
    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ logs: [] });
    }
    
    const logs = await db.collection('location_logs').find({}).sort({ timestamp: -1 }).limit(100).toArray();

    return NextResponse.json({
      success: true,
      logs: logs || []
    });
  } catch (error: any) {
    console.error('Error fetching location logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch location logs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId: targetUserId, userName, location, timestamp, deviceInfo } = body;

    if (!targetUserId || !location || !location.latitude || !location.longitude) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, location (latitude, longitude)' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Calculate distance from classroom (example: LPU coordinates)
    const classroomLat = 31.2520; // LPU latitude
    const classroomLng = 75.7050; // LPU longitude
    const distanceFromClassroom = calculateDistance(
      location.latitude,
      location.longitude,
      classroomLat,
      classroomLng
    );

    // Check if within classroom radius (50 meters)
    const isInClassroom = distanceFromClassroom <= 50;

    // Create location log entry
    const locationLog = {
      userId: targetUserId,
      userName: userName || 'Unknown',
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy || 10,
      distanceFromClassroom: Math.round(distanceFromClassroom),
      isInClassroom,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      deviceInfo: deviceInfo || {},
      createdAt: new Date(),
    };

    // Insert into database
    await db.collection('location_logs').insertOne(locationLog);

    console.log('✅ Location log saved:', {
      userId: targetUserId,
      distance: distanceFromClassroom,
      isInClassroom,
    });

    return NextResponse.json({
      success: true,
      message: 'Location log saved successfully',
      data: {
        distanceFromClassroom: Math.round(distanceFromClassroom),
        isInClassroom,
      },
    });
  } catch (error: any) {
    console.error('Error saving location log:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save location log' },
      { status: 500 }
    );
  }
}

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
