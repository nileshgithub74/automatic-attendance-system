import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

/**
 * PATCH - Update user role
 * Only Admin/Principal can change user roles
 * Supports both Clerk users and MongoDB users
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin authentication
    const { userId: adminId } = await auth();
    
    if (!adminId) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const admin = await currentUser();
    const adminRole = admin?.publicMetadata?.role;

    if (adminRole !== 'Principal') {
      return NextResponse.json(
        { error: 'Forbidden - Only Principal can change roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetUserId, newRole, userSource } = body;

    // Validate input
    if (!targetUserId || !newRole) {
      return NextResponse.json(
        { error: 'Target user ID and new role are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['student', 'teacher', 'parent', 'Student', 'Teacher', 'Parent', 'Principal'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be student, teacher, parent, or Principal' },
        { status: 400 }
      );
    }

    // Prevent changing own role
    if (userSource === 'clerk' && targetUserId === adminId) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 403 }
      );
    }

    const db = await getDatabase();

    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Handle Clerk users (Admins/Principals)
    if (userSource === 'clerk') {
      const clerk = await clerkClient();
      
      // Update role in Clerk
      await clerk.users.updateUserMetadata(targetUserId, {
        publicMetadata: {
          role: newRole,
        },
      });

      // Update in MongoDB users collection if exists
      await db.collection('users').updateOne(
        { clerkId: targetUserId },
        {
          $set: {
            role: newRole,
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Role updated successfully',
        newRole: newRole,
      });
    }

    // Handle MongoDB users (Students/Teachers/Parents)
    // First, find the user in their current collection
    const oldRole = newRole.toLowerCase();
    let user = null;
    let oldCollection = '';

    // Try to find user in all collections
    for (const collection of ['students', 'teachers', 'parents']) {
      user = await db.collection(collection).findOne({ id: parseInt(targetUserId) });
      if (user) {
        oldCollection = collection;
        break;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Determine new collection based on new role
    const newCollection = oldRole === 'student' ? 'students'
      : oldRole === 'teacher' ? 'teachers'
      : 'parents';

    // If role changed, move user to new collection
    if (oldCollection !== newCollection) {
      // Create user in new collection
      const newUserData: any = {
        ...user,
        updatedAt: new Date(),
      };

      // Remove old collection-specific fields and add new ones
      if (newCollection === 'students') {
        delete newUserData.childrenIds;
        newUserData.class = newUserData.class || 'Not Assigned';
        newUserData.rollNo = newUserData.rollNo || 'TBD';
      } else if (newCollection === 'teachers') {
        delete newUserData.childrenIds;
        delete newUserData.rollNo;
        newUserData.classes = newUserData.classes || [];
      } else if (newCollection === 'parents') {
        delete newUserData.rollNo;
        delete newUserData.classes;
        newUserData.childrenIds = newUserData.childrenIds || [];
      }

      await db.collection(newCollection).insertOne(newUserData);

      // Delete from old collection
      await db.collection(oldCollection).deleteOne({ id: parseInt(targetUserId) });

      // Update any active sessions
      await db.collection('sessions').updateMany(
        { userId: targetUserId.toString() },
        {
          $set: {
            userType: newRole.charAt(0).toUpperCase() + newRole.slice(1),
            userRole: oldRole,
            updatedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
      newRole: newRole,
      movedCollection: oldCollection !== newCollection,
    });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user role' },
      { status: 500 }
    );
  }
}
