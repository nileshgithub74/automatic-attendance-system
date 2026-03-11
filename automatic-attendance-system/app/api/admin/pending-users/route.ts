import { NextResponse } from 'next/server';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const role = user?.publicMetadata?.role as string;

    // Only admins/principals can view pending users
    if (role !== 'Principal' && role !== 'Admin' && role !== 'admin' && role !== 'principal') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Get all Clerk users
    const clerk = await clerkClient();
    const clerkUsers = await clerk.users.getUserList({ limit: 500 });

    // Filter users without roles (pending approval)
    const pendingUsers = clerkUsers.data
      .filter(u => !u.publicMetadata?.role || u.publicMetadata.role === 'No role')
      .map(u => ({
        id: u.id,
        email: u.emailAddresses[0]?.emailAddress || 'No email',
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.emailAddresses[0]?.emailAddress?.split('@')[0] || 'Unknown',
        createdAt: u.createdAt,
        lastSignInAt: u.lastSignInAt,
      }));

    return NextResponse.json({
      success: true,
      pendingUsers,
      count: pendingUsers.length
    });

  } catch (error) {
    console.error('Error fetching pending users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending users' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const role = user?.publicMetadata?.role as string;

    // Only admins/principals can approve users
    if (role !== 'Principal' && role !== 'Admin' && role !== 'admin' && role !== 'principal') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId: targetUserId, role: newRole } = body;

    if (!targetUserId || !newRole) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 });
    }

    // Update user role in Clerk
    const clerk = await clerkClient();
    await clerk.users.updateUser(targetUserId, {
      publicMetadata: {
        role: newRole.charAt(0).toUpperCase() + newRole.slice(1).toLowerCase()
      }
    });

    return NextResponse.json({
      success: true,
      message: `User approved as ${newRole}`
    });

  } catch (error) {
    console.error('Error approving user:', error);
    return NextResponse.json(
      { error: 'Failed to approve user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const role = user?.publicMetadata?.role as string;

    // Only admins/principals can reject users
    if (role !== 'Principal' && role !== 'Admin' && role !== 'admin' && role !== 'principal') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId: targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Delete user from Clerk
    const clerk = await clerkClient();
    await clerk.users.deleteUser(targetUserId);

    return NextResponse.json({
      success: true,
      message: 'User rejected and deleted'
    });

  } catch (error) {
    console.error('Error rejecting user:', error);
    return NextResponse.json(
      { error: 'Failed to reject user' },
      { status: 500 }
    );
  }
}
