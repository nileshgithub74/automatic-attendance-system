import { NextResponse } from 'next/server';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const role = user?.publicMetadata?.role as string;

    // Only admins/principals can view face registrations
    if (role !== 'Principal' && role !== 'Admin' && role !== 'admin' && role !== 'principal') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    const studentsCollection = db.collection('students');

    // Get all Clerk users with student role
    const clerk = await clerkClient();
    const clerkUsers = await clerk.users.getUserList({ limit: 500 });

    // Filter students
    const students = clerkUsers.data.filter(u => {
      const userRole = (u.publicMetadata?.role as string)?.toLowerCase();
      return userRole === 'student';
    });

    // Get face registration status for each student
    const registrations = await Promise.all(
      students.map(async (student) => {
        const faceData = await studentsCollection.findOne({
          _id: student.id as any
        });

        return {
          id: student.id,
          name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown',
          email: student.emailAddresses[0]?.emailAddress || 'No email',
          class: student.publicMetadata?.class || 'Not Assigned',
          rollNo: student.publicMetadata?.rollNo || 'Not Assigned',
          isRegistered: !!faceData?.registeredFace,
          registeredAt: faceData?.faceRegisteredAt || null,
        };
      })
    );

    // Sort: unregistered first, then by name
    registrations.sort((a, b) => {
      if (a.isRegistered === b.isRegistered) {
        return a.name.localeCompare(b.name);
      }
      return a.isRegistered ? 1 : -1;
    });

    return NextResponse.json({
      success: true,
      registrations,
      stats: {
        total: registrations.length,
        registered: registrations.filter(r => r.isRegistered).length,
        notRegistered: registrations.filter(r => !r.isRegistered).length,
      }
    });

  } catch (error) {
    console.error('Error fetching face registrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch face registrations' },
      { status: 500 }
    );
  }
}
