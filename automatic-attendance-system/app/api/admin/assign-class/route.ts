import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

// Assign class and roll number to a Clerk user
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { targetUserId, className, rollNo, parentNumber } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    console.log('📝 Assigning class to user:', { targetUserId, className, rollNo });

    // Update Clerk user metadata
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(targetUserId, {
        publicMetadata: {
          class: className || 'Not Assigned',
          rollNo: rollNo || 'N/A',
          parentNumber: parentNumber || '',
        },
      });
      console.log('✅ Updated Clerk metadata');
    } catch (clerkError) {
      console.error('❌ Error updating Clerk:', clerkError);
      return NextResponse.json(
        { error: 'Failed to update Clerk user' },
        { status: 500 }
      );
    }

    // Also update MongoDB if user exists there
    try {
      const db = await getDatabase();
      if (db) {
        const result = await db.collection('users').updateOne(
          { clerkId: targetUserId },
          {
            $set: {
              class: className || 'Not Assigned',
              rollNo: rollNo || 'N/A',
              parentNumber: parentNumber || '',
              updatedAt: new Date(),
            },
          }
        );
        
        if (result.matchedCount > 0) {
          console.log('✅ Updated MongoDB record');
        } else {
          console.log('ℹ️ No MongoDB record found (Clerk-only user)');
        }
      }
    } catch (dbError) {
      console.error('⚠️ MongoDB update failed (non-critical):', dbError);
      // Don't fail the request if MongoDB update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Class and roll number assigned successfully',
    });
  } catch (error: any) {
    console.error('❌ Error assigning class:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign class' },
      { status: 500 }
    );
  }
}
