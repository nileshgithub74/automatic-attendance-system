import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;
    const userRole = request.cookies.get('userRole')?.value;

    if (userId && userRole) {
      // Mark session as inactive in database
      const db = await getDatabase();
      
      if (db) {
        await db.collection('sessions').updateMany(
          { userId: userId, userRole: userRole },
          {
            $set: {
              isActive: false,
              logoutTime: new Date(),
            },
          }
        );
      }
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear cookies
    response.cookies.delete('userId');
    response.cookies.delete('userRole');

    return response;
  } catch (error: any) {
    console.error('Error during logout:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to logout' },
      { status: 500 }
    );
  }
}
