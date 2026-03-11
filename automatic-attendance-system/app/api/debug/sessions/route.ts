import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

// Debug endpoint to check sessions (remove in production)
export async function GET() {
  try {
    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    // Get all sessions (active and inactive)
    const allSessions = await db
      .collection('sessions')
      .find({})
      .sort({ loginTime: -1 })
      .toArray();

    const activeSessions = allSessions.filter(s => s.isActive);

    return NextResponse.json({
      total: allSessions.length,
      active: activeSessions.length,
      inactive: allSessions.length - activeSessions.length,
      sessions: allSessions.map(s => ({
        userId: s.userId,
        userType: s.userType,
        userRole: s.userRole,
        isActive: s.isActive,
        loginTime: s.loginTime,
        name: s.userData?.name,
        email: s.userData?.email,
      })),
    });
  } catch (error) {
    console.error('Error fetching debug sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
