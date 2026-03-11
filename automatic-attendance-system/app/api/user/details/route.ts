import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

/**
 * GET - Fetch current user details
 * Returns user information including role from both Clerk and MongoDB
 */
export async function GET(request: NextRequest) {
  try {
    // Check for Clerk authentication (Admin/Principal)
    const { userId } = await auth();
    
    if (userId) {
      // Clerk authenticated user
      const user = await currentUser();
      
      return NextResponse.json({
        id: userId,
        name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Admin User',
        email: user?.emailAddresses[0]?.emailAddress || '',
        role: user?.publicMetadata?.role || 'Admin',
        source: 'clerk',
        clerkId: userId,
      });
    }

    // Check for session-based authentication (Student/Teacher/Parent)
    const sessionUserId = request.cookies.get('userId')?.value;
    const sessionUserRole = request.cookies.get('userRole')?.value;

    if (sessionUserId && sessionUserRole) {
      const db = await getDatabase();
      
      if (!db) {
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
      }
      
      // Determine collection based on role
      const collectionName = sessionUserRole === 'student' ? 'students' 
        : sessionUserRole === 'teacher' ? 'teachers' 
        : 'parents';

      const user = await db.collection(collectionName).findOne({ 
        id: parseInt(sessionUserId) 
      });

      if (user) {
        return NextResponse.json({
          id: user.id,
          name: user.name || `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: sessionUserRole,
          source: 'mongodb',
          ...( sessionUserRole === 'student' && { 
            class: user.class, 
            rollNo: user.rollNo 
          }),
          ...( sessionUserRole === 'teacher' && { 
            classes: user.classes,
            phoneNumber: user.phoneNumber 
          }),
          ...( sessionUserRole === 'parent' && { 
            childrenIds: user.childrenIds,
            phoneNumber: user.phoneNumber 
          }),
        });
      }
    }

    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}
