import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Dummy location data for testing
    const dummyLocationLogs = [
      {
        _id: 'loc_001',
        userId: 'STU001',
        userName: 'Raj Kumar',
        userRole: 'student',
        location: {
          latitude: 28.6139,
          longitude: 77.2090,
          accuracy: 8
        },
        timestamp: new Date('2026-03-12T09:15:00'),
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
          platform: 'iOS',
          isMobile: true
        }
      },
      {
        _id: 'loc_002',
        userId: 'STU002',
        userName: 'Priya Singh',
        userRole: 'student',
        location: {
          latitude: 28.6145,
          longitude: 77.2095,
          accuracy: 12
        },
        timestamp: new Date('2026-03-12T09:16:00'),
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (Linux; Android 11)',
          platform: 'Android',
          isMobile: true
        }
      },
      {
        _id: 'loc_003',
        userId: 'STU003',
        userName: 'Amit Patel',
        userRole: 'student',
        location: {
          latitude: 28.6135,
          longitude: 77.2085,
          accuracy: 10
        },
        timestamp: new Date('2026-03-12T09:17:00'),
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          platform: 'Windows',
          isMobile: false
        }
      },
      {
        _id: 'loc_004',
        userId: 'STU004',
        userName: 'Neha Sharma',
        userRole: 'student',
        location: {
          latitude: 28.6150,
          longitude: 77.2100,
          accuracy: 15
        },
        timestamp: new Date('2026-03-12T09:18:00'),
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
          platform: 'iOS',
          isMobile: true
        }
      },
      {
        _id: 'loc_005',
        userId: 'STU005',
        userName: 'Vikram Gupta',
        userRole: 'student',
        location: {
          latitude: 28.6140,
          longitude: 77.2092,
          accuracy: 9
        },
        timestamp: new Date('2026-03-12T09:19:00'),
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (Linux; Android 12)',
          platform: 'Android',
          isMobile: true
        }
      },
      {
        _id: 'loc_006',
        userId: 'TEA001',
        userName: 'Mr. John Smith',
        userRole: 'teacher',
        location: {
          latitude: 28.6138,
          longitude: 77.2088,
          accuracy: 7
        },
        timestamp: new Date('2026-03-12T09:00:00'),
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          platform: 'macOS',
          isMobile: false
        }
      }
    ];

    return NextResponse.json({
      success: true,
      logs: dummyLocationLogs
    });
  } catch (error: any) {
    console.error('Error fetching location logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch location logs' },
      { status: 500 }
    );
  }
}
