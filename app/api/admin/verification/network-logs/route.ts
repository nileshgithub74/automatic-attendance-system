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

    // Dummy network security data for testing
    const dummyNetworkLogs = [
      {
        _id: 'net_001',
        userId: 'STU001',
        userName: 'Raj Kumar',
        ipAddress: '203.0.113.45',
        isVPN: false,
        isProxy: false,
        isTor: false,
        isHosting: false,
        country: 'India',
        city: 'New Delhi',
        isp: 'Airtel India',
        latency: 28,
        jitter: 3,
        riskScore: 15,
        threatLevel: 'low',
        timestamp: new Date('2026-03-12T09:15:00')
      },
      {
        _id: 'net_002',
        userId: 'STU002',
        userName: 'Priya Singh',
        ipAddress: '203.0.113.46',
        isVPN: false,
        isProxy: false,
        isTor: false,
        isHosting: false,
        country: 'India',
        city: 'New Delhi',
        isp: 'Jio India',
        latency: 32,
        jitter: 5,
        riskScore: 18,
        threatLevel: 'low',
        timestamp: new Date('2026-03-12T09:16:00')
      },
      {
        _id: 'net_003',
        userId: 'STU003',
        userName: 'Amit Patel',
        ipAddress: '198.51.100.50',
        isVPN: true,
        isProxy: false,
        isTor: false,
        isHosting: false,
        country: 'United States',
        city: 'New York',
        isp: 'NordVPN',
        latency: 145,
        jitter: 25,
        riskScore: 65,
        threatLevel: 'high',
        timestamp: new Date('2026-03-12T09:17:00')
      },
      {
        _id: 'net_004',
        userId: 'STU004',
        userName: 'Neha Sharma',
        ipAddress: '203.0.113.47',
        isVPN: false,
        isProxy: false,
        isTor: false,
        isHosting: false,
        country: 'India',
        city: 'New Delhi',
        isp: 'BSNL India',
        latency: 35,
        jitter: 4,
        riskScore: 20,
        threatLevel: 'low',
        timestamp: new Date('2026-03-12T09:18:00')
      },
      {
        _id: 'net_005',
        userId: 'STU005',
        userName: 'Vikram Gupta',
        ipAddress: '192.0.2.100',
        isVPN: false,
        isProxy: true,
        isTor: false,
        isHosting: false,
        country: 'India',
        city: 'Mumbai',
        isp: 'Proxy Server',
        latency: 85,
        jitter: 15,
        riskScore: 55,
        threatLevel: 'medium',
        timestamp: new Date('2026-03-12T09:19:00')
      },
      {
        _id: 'net_006',
        userId: 'STU006',
        userName: 'Ananya Verma',
        ipAddress: '203.0.113.48',
        isVPN: false,
        isProxy: false,
        isTor: false,
        isHosting: true,
        country: 'India',
        city: 'Bangalore',
        isp: 'AWS Datacenter',
        latency: 42,
        jitter: 6,
        riskScore: 45,
        threatLevel: 'medium',
        timestamp: new Date('2026-03-12T09:20:00')
      },
      {
        _id: 'net_007',
        userId: 'TEA001',
        userName: 'Mr. John Smith',
        ipAddress: '203.0.113.49',
        isVPN: false,
        isProxy: false,
        isTor: false,
        isHosting: false,
        country: 'India',
        city: 'New Delhi',
        isp: 'Airtel India',
        latency: 25,
        jitter: 2,
        riskScore: 10,
        threatLevel: 'low',
        timestamp: new Date('2026-03-12T09:00:00')
      }
    ];

    return NextResponse.json({
      success: true,
      logs: dummyNetworkLogs
    });
  } catch (error: any) {
    console.error('Error fetching network logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch network logs' },
      { status: 500 }
    );
  }
}
