import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const role = user?.publicMetadata?.role as string;

    // Only admins/principals can delete users
    if (role !== 'Principal' && role !== 'Admin' && role !== 'admin' && role !== 'principal') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userIdToDelete, source, deleteAttendance } = body;

    if (!userIdToDelete || !source) {
      return NextResponse.json({ error: 'User ID and source are required' }, { status: 400 });
    }

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    let deletedCount = 0;
    let attendanceDeleted = 0;

    // Delete from MongoDB collections based on source
    if (source === 'mongodb') {
      // Try to delete from all possible collections
      const collections = ['students', 'teachers', 'parents', 'users'];
      
      for (const collectionName of collections) {
        const result = await db.collection(collectionName).deleteOne({ 
          $or: [
            { id: parseInt(userIdToDelete) },
            { _id: userIdToDelete }
          ]
        });
        deletedCount += result.deletedCount || 0;
      }

      // Delete attendance records if requested
      if (deleteAttendance) {
        const attendanceResult = await db.collection('attendance').deleteMany({
          $or: [
            { studentId: parseInt(userIdToDelete) },
            { studentId: userIdToDelete.toString() },
            { teacherId: userIdToDelete.toString() }
          ]
        });
        attendanceDeleted = attendanceResult.deletedCount || 0;
      }
    } else if (source === 'clerk') {
      // Delete from Clerk
      try {
        const clerk = await clerkClient();
        await clerk.users.deleteUser(userIdToDelete);
        deletedCount = 1;
      } catch (clerkError) {
        console.error('Error deleting from Clerk:', clerkError);
        return NextResponse.json({ 
          error: 'Failed to delete user from Clerk' 
        }, { status: 500 });
      }

      // Also delete attendance records if requested
      if (deleteAttendance) {
        const attendanceResult = await db.collection('attendance').deleteMany({
          $or: [
            { studentId: userIdToDelete },
            { teacherId: userIdToDelete }
          ]
        });
        attendanceDeleted = attendanceResult.deletedCount || 0;
      }
    }

    if (deletedCount === 0) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `User deleted successfully${deleteAttendance ? ` along with ${attendanceDeleted} attendance records` : ''}`,
      deletedCount,
      attendanceDeleted
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
