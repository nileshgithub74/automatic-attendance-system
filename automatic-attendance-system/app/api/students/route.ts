import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';
import { Student } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    // Check for Clerk authentication first
    const { userId } = await auth();
    let role = null;

    if (userId) {
      // Clerk authenticated user (Admin/Principal)
      const user = await currentUser();
      role = user?.publicMetadata?.role as string;
    } else {
      // Check for session-based authentication (Student/Teacher)
      const sessionUserId = request.headers.get('x-user-id');
      const sessionUserType = request.headers.get('x-user-type');

      if (sessionUserId && sessionUserType) {
        // Verify session exists in database
        const db = await getDatabase();
        
        if (db) {
          const session = await db.collection('sessions').findOne({
            userId: sessionUserId,
            userType: sessionUserType,
            isActive: true,
          });

          if (session) {
            role = sessionUserType;
          }
        }
      }
    }

    // Check if user has permission (case-insensitive)
    const normalizedRole = role?.toLowerCase();
    if (!normalizedRole || (normalizedRole !== 'teacher' && normalizedRole !== 'principal')) {
      return NextResponse.json({ error: 'Unauthorized - Teacher or Principal access required' }, { status: 401 });
    }

    const db = await getDatabase();
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    const allStudents: any[] = [];
    const studentEmails = new Set<string>();

    // Fetch from Clerk - users with Student role
    try {
      const client = await (await import('@clerk/nextjs/server')).clerkClient();
      const clerkUsers = await client.users.getUserList();
      
      const clerkStudents = clerkUsers.data
        .filter((user: any) => {
          const userRole = (user.publicMetadata?.role as string || '').toLowerCase();
          return userRole === 'student';
        })
        .map((user: any) => {
          const email = user.emailAddresses[0]?.emailAddress || '';
          if (email) studentEmails.add(email.toLowerCase());
          
          return {
            _id: user.id,
            id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || email.split('@')[0],
            rollNo: user.publicMetadata?.rollNo || '',
            class: user.publicMetadata?.class || 'Not Assigned',
            parentNumber: user.publicMetadata?.parentNumber || '',
          };
        });
      
      allStudents.push(...clerkStudents);
    } catch (clerkError) {
      console.error('Error fetching students from Clerk:', clerkError);
    }

    // Fetch from MongoDB
    const mongoStudents = await db.collection<Student>('students').find({}).toArray();
    
    const filteredMongoStudents = mongoStudents.filter((student: any) => {
      const email = (student.email || '').toLowerCase();
      // Only add if not already in Clerk
      return !email || !studentEmails.has(email);
    });
    
    allStudents.push(...filteredMongoStudents);

    // If no students exist, create some sample data
    if (allStudents.length === 0) {
      const sampleStudents: Student[] = [
        { id: 1, name: 'Ravi Kumar', rollNo: '501', parentNumber: '+919876543210', class: 'Class 5' },
        { id: 2, name: 'Sita Sharma', rollNo: '502', parentNumber: '+919123456789', class: 'Class 5' },
        { id: 3, name: 'Karan Singh', rollNo: '601', parentNumber: '+919998887776', class: 'Class 6' },
        { id: 4, name: 'Priya Patel', rollNo: '602', parentNumber: '+919876543211', class: 'Class 6' },
        { id: 5, name: 'Amit Verma', rollNo: '701', parentNumber: '+919876543212', class: 'Class 7' },
      ];
      await db.collection('students').insertMany(sampleStudents);
      return NextResponse.json(sampleStudents);
    }

    return NextResponse.json(allStudents);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

