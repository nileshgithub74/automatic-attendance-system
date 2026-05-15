import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { detectVPNFree, calculateRiskScore } from '@/lib/networkSecurity';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      studentId,
      ipAddress,
      latency,
      jitter
    } = body;

    if (!sessionId || !studentId || !ipAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Detect VPN/Proxy
    const vpnDetection = await detectVPNFree(ipAddress);

    // Calculate risk score
    const riskScore = calculateRiskScore(
      vpnDetection.vpnDetected,
      latency || 0,
      jitter || 0
    );

    // Determine if suspicious
    const suspicionReasons: string[] = [];
    if (vpnDetection.vpnDetected) {
      suspicionReasons.push('VPN or proxy detected');
    }
    if (vpnDetection.proxyDetected) {
      suspicionReasons.push('Proxy detected');
    }
    if (latency && latency > 500) {
      suspicionReasons.push('High latency detected');
    }
    if (jitter && jitter > 100) {
      suspicionReasons.push('High network jitter detected');
    }

    const isSuspicious = suspicionReasons.length > 0;

    // Get connection type from headers
    const userAgent = request.headers.get('user-agent') || '';
    const connectionType = userAgent.includes('Mobile') ? 'mobile' : 'wifi';

    // Create network log
    const networkLog = {
      sessionId,
      studentId: new ObjectId(studentId),
      ipAddress,
      ipInfo: vpnDetection.details,
      vpnDetected: vpnDetection.vpnDetected,
      proxyDetected: vpnDetection.proxyDetected,
      torDetected: vpnDetection.torDetected,
      vpnProvider: vpnDetection.provider || null,
      latency: latency || 0,
      jitter: jitter || 0,
      packetLoss: 0,
      connectionType,
      isSuspicious,
      suspicionReasons,
      riskScore,
      timestamp: new Date(),
      createdAt: new Date()
    };

    await db.collection('networkLogs').insertOne(networkLog);

    // If suspicious, flag the verification result
    if (isSuspicious) {
      await db.collection('verificationResults').updateOne(
        { sessionId, studentId: new ObjectId(studentId) },
        {
          $push: {
            flags: {
              type: vpnDetection.vpnDetected ? 'vpn' : 'network',
              severity: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
              message: suspicionReasons.join(', '),
              timestamp: new Date()
            }
          }
        },
        { upsert: true }
      );
    }

    return NextResponse.json({
      success: true,
      vpnDetected: vpnDetection.vpnDetected,
      proxyDetected: vpnDetection.proxyDetected,
      isSuspicious,
      riskScore,
      details: vpnDetection.details
    });

  } catch (error: any) {
    console.error('Network check error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const studentId = searchParams.get('studentId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const query: any = { sessionId };
    if (studentId) {
      query.studentId = new ObjectId(studentId);
    }

    const logs = await db.collection('networkLogs')
      .find(query)
      .sort({ timestamp: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      logs
    });

  } catch (error: any) {
    console.error('Get network logs error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
