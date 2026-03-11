import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    console.log(`🔍 Student login attempt for email: ${email}`);

    // Validate email
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const db = await getDatabase();
    let student = null;

    // First check MongoDB for student
    if (db) {
      student = await db.collection('students').findOne({ email: email });
      console.log(`📚 MongoDB student search result:`, student ? 'Found' : 'Not found');
      
      // If found in students collection, that's good
      if (student) {
        // But also check if this email exists in other role collections
        const teacherExists = await db.collection('teachers').findOne({ email: email });
        const parentExists = await db.collection('parents').findOne({ email: email });
        
        if (teacherExists) {
          return NextResponse.json(
            { error: 'This email is registered as teacher. Please select Teacher role to login.' },
            { status: 401 }
          );
        }
        
        if (parentExists) {
          return NextResponse.json(
            { error: 'This email is registered as parent. Please select Parent role to login.' },
            { status: 401 }
          );
        }
      } else {
        // If not found in students, check if it exists in other collections
        const teacherExists = await db.collection('teachers').findOne({ email: email });
        const parentExists = await db.collection('parents').findOne({ email: email });
        
        if (teacherExists) {
          return NextResponse.json(
            { error: 'This email is registered as teacher. Please select Teacher role to login.' },
            { status: 401 }
          );
        }
        
        if (parentExists) {
          return NextResponse.json(
            { error: 'This email is registered as parent. Please select Parent role to login.' },
            { status: 401 }
          );
        }
      }
    }

    // If not found in MongoDB, check Clerk for users with Student role ONLY
    if (!student) {
      console.log(`🔍 Student not found in MongoDB, checking Clerk...`);
      try {
        const client = await clerkClient();
        const clerkUsers = await client.users.getUserList();
        console.log(`📊 Found ${clerkUsers.data.length} users in Clerk`);
        
        // Find user with this email
        const userWithEmail = clerkUsers.data.find((user: any) => {
          const userEmail = user.emailAddresses[0]?.emailAddress || '';
          return userEmail.toLowerCase() === email.toLowerCase();
        });

        if (userWithEmail) {
          const role = (userWithEmail.publicMetadata?.role as string || '').toLowerCase();
          console.log(`👤 Found user in Clerk: ${email} with role: ${role}`);
          
          // STRICT CHECK: Email must have EXACTLY student role
          if (role === 'student') {
            console.log(`✅ User has student role, creating student object`);
            // Create student object from Clerk data
            student = {
              id: userWithEmail.id,
              email: userWithEmail.emailAddresses[0]?.emailAddress || '',
              name: `${userWithEmail.firstName || ''} ${userWithEmail.lastName || ''}`.trim() || email.split('@')[0],
              class: userWithEmail.publicMetadata?.class || 'Not Assigned',
              rollNo: userWithEmail.publicMetadata?.rollNo || 'Not Assigned',
              parentNumber: userWithEmail.publicMetadata?.parentNumber || 'Not Provided',
            };
          } else if (role === 'teacher') {
            return NextResponse.json(
              { error: 'This email is registered as teacher. Please select Teacher role to login.' },
              { status: 401 }
            );
          } else if (role === 'parent') {
            return NextResponse.json(
              { error: 'This email is registered as parent. Please select Parent role to login.' },
              { status: 401 }
            );
          } else if (role === 'principal' || role === 'admin') {
            return NextResponse.json(
              { error: 'This email is registered as admin/principal. Please use Admin Sign In.' },
              { status: 401 }
            );
          } else {
            // Email exists but with different role - reject login
            return NextResponse.json(
              { error: `This email is registered as ${role || 'another role'}. Please select the correct role or use the correct email.` },
              { status: 401 }
            );
          }
        } else {
          console.log(`❌ Email ${email} not found in Clerk`);
        }
      } catch (clerkError) {
        console.error('❌ Error checking Clerk:', clerkError);
      }
    }

    if (!student) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please check your email and selected role.' },
        { status: 401 }
      );
    }

    // Create session in MongoDB (only if db is available)
    if (db) {
      const sessionData = {
        userId: student.id.toString(),
        userType: 'Student',
        userData: {
          id: student.id,
          email: student.email,
          name: student.name,
          class: student.class,
          rollNo: student.rollNo,
          parentNumber: student.parentNumber,
        },
        loginTime: new Date(),
        lastActivity: new Date(),
        isActive: true,
      };

      try {
        // Check if session already exists
        const existingSession = await db.collection('sessions').findOne({
          userId: student.id.toString(),
          userType: 'Student',
          isActive: true,
        });

        if (existingSession) {
          // Update existing session
          await db.collection('sessions').updateOne(
            { _id: existingSession._id },
            {
              $set: {
                lastActivity: new Date(),
                userData: sessionData.userData,
              },
            }
          );
        } else {
          // Create new session
          await db.collection('sessions').insertOne(sessionData);
        }
      } catch (sessionError) {
        console.error('Error managing session:', sessionError);
        // Continue with login even if session creation fails
      }
    }

    // Student exists, return success with student data
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      student: {
        id: student.id,
        email: student.email,
        name: student.name,
        class: student.class,
        rollNo: student.rollNo,
        parentNumber: student.parentNumber,
      },
    });
  } catch (error: any) {
    console.error('Error during student login:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to login' },
      { status: 500 }
    );
  }
}
