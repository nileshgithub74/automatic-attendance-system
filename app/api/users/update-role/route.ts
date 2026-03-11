import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

/**
 * PATCH /api/users/update-role
 * Update user role in Clerk metadata
 * Only admin users can perform this action
 */
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate the requesting user
    const { userId: requestingUserId } = await auth();
    
    if (!requestingUserId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Get requesting user details
    const requestingUser = await currentUser();
    const requestingUserRole = requestingUser?.publicMetadata?.role as string;

    // Verify requesting user is admin
    if (requestingUserRole !== 'admin' && requestingUserRole !== 'Principal') {
      return NextResponse.json(
        { error: 'Forbidden - Only admins can change user roles' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { userId, newRole } = body;

    // Validate input
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!newRole) {
      return NextResponse.json(
        { error: 'New role is required' },
        { status: 400 }
      );
    }

    // Validate role value
    const validRoles = ['student', 'teacher', 'parent', 'admin', 'Principal'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Prevent users from changing their own role
    if (userId === requestingUserId) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 403 }
      );
    }

    // Update role in Clerk
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: newRole,
      },
    });

    // Also update in MongoDB users collection if exists
    const db = await getDatabase();
    
    if (db) {
      await db.collection('users').updateOne(
        { clerkId: userId },
        {
          $set: {
            role: newRole,
            updatedAt: new Date(),
          },
        },
        { upsert: true } // Create if doesn't exist
      );

      // Log the role change
      await db.collection('role_changes').insertOne({
      userId: userId,
      changedBy: requestingUserId,
        changedByEmail: requestingUser?.emailAddresses[0]?.emailAddress,
        oldRole: requestingUserRole,
        newRole: newRole,
        timestamp: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
      userId: userId,
      newRole: newRole,
    });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    
    // Handle Clerk-specific errors
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update user role' },
      { status: 500 }
    );
  }
}
