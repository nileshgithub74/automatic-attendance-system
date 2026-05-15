import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { clerkClient } from '@clerk/nextjs/server';

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {}
  };

  try {
    // Check 1: Environment Variables
    diagnostics.checks.envVars = {
      MONGODB_URL: !!process.env.MONGODB_URL,
      CLERK_SECRET_KEY: !!process.env.CLERK_SECRET_KEY,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
    };

    // Check 2: MongoDB Connection
    try {
      const db = await getDatabase();
      if (db) {
        diagnostics.checks.mongodb = {
          connected: true,
          collections: await db.listCollections().toArray().then(cols => cols.map(c => c.name))
        };

        // Check 3: Students in MongoDB
        const usersStudents = await db.collection('users').find({ role: { $regex: /^student$/i } }).toArray();
        const legacyStudents = await db.collection('students').find({}).toArray();
        
        diagnostics.checks.mongodbStudents = {
          usersCollection: usersStudents.length,
          studentsCollection: legacyStudents.length,
          total: usersStudents.length + legacyStudents.length,
          sampleFromUsers: usersStudents.slice(0, 2).map(s => ({
            id: s.id || s._id?.toString(),
            name: s.name,
            email: s.email,
            role: s.role
          })),
          sampleFromStudents: legacyStudents.slice(0, 2).map(s => ({
            id: s.id || s._id?.toString(),
            name: s.name,
            email: s.email,
            class: s.class
          }))
        };
      } else {
        diagnostics.checks.mongodb = {
          connected: false,
          error: 'Database connection returned null'
        };
      }
    } catch (mongoError: any) {
      diagnostics.checks.mongodb = {
        connected: false,
        error: mongoError.message,
        stack: mongoError.stack
      };
    }

    // Check 4: Clerk Users
    try {
      const client = await clerkClient();
      const clerkUsers = await client.users.getUserList({ limit: 100 });
      const students = clerkUsers.data.filter((user: any) => {
        const role = (user.publicMetadata?.role as string || '').toLowerCase();
        return role === 'student';
      });

      diagnostics.checks.clerk = {
        totalUsers: clerkUsers.data.length,
        students: students.length,
        sampleStudents: students.slice(0, 2).map((user: any) => ({
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          role: user.publicMetadata?.role,
          class: user.publicMetadata?.class
        }))
      };
    } catch (clerkError: any) {
      diagnostics.checks.clerk = {
        error: clerkError.message,
        stack: clerkError.stack
      };
    }

    // Summary
    const mongoTotal = (diagnostics.checks.mongodbStudents?.total || 0);
    const clerkTotal = (diagnostics.checks.clerk?.students || 0);
    
    diagnostics.summary = {
      totalStudents: mongoTotal + clerkTotal,
      mongodbStudents: mongoTotal,
      clerkStudents: clerkTotal,
      status: (mongoTotal + clerkTotal) > 0 ? 'OK' : 'NO_STUDENTS_FOUND'
    };

    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error: any) {
    diagnostics.error = {
      message: error.message,
      stack: error.stack
    };
    return NextResponse.json(diagnostics, { status: 500 });
  }
}
