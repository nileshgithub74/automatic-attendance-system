import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const client = await clerkClient();
      const clerkUsers = await client.users.getUserList();
      
      const users = clerkUsers.data.map((user: any) => ({
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No Name',
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No Name',
        role: user.publicMetadata?.role || 'No Role',
        class: user.publicMetadata?.class || '',
        rollNo: user.publicMetadata?.rollNo || '',
        parentNumber: user.publicMetadata?.parentNumber || '',
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
      }));

      return NextResponse.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json([], { status: 200 });
    }
  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetUserId, newRole } = await request.json();

    if (!targetUserId || !newRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await clerkClient();
    await client.users.updateUserMetadata(targetUserId, {
      publicMetadata: { role: newRole }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const client = await clerkClient();
    await client.users.deleteUser(targetUserId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}