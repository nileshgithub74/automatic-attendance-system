import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

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
    let teacher = null;

    // First check MongoDB for teacher
    if (db) {
      teacher = await db.collection('teachers').findOne({ email: email });
      
      // If found in teachers collection, that's good
      if (teacher) {
        // But also check if this email exists in other role collections
        const studentExists = await db.collection('students').findOne({ email: email });
        const parentExists = await db.collection('parents').findOne({ email: email });
        
        if (studentExists) {
          return NextResponse.json(
            { error: 'This email is registered as student. Please select Student role to login.' },
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
        // If not found in teachers, check if it exists in other collections
        const studentExists = await db.collection('students').findOne({ email: email });
        const parentExists = await db.collection('parents').findOne({ email: email });
        
        if (studentExists) {
          return NextResponse.json(
            { error: 'This email is registered as student. Please select Student role to login.' },
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

    // If not found in MongoDB, check Clerk for users with Teacher role ONLY
    if (!teacher) {
      try {
        const client = await clerkClient();
        const clerkUsers = await client.users.getUserList();
        
        // Find user with this email
        const userWithEmail = clerkUsers.data.find((user: any) => {
          const userEmail = user.emailAddresses[0]?.emailAddress || '';
          return userEmail.toLowerCase() === email.toLowerCase();
        });

        if (userWithEmail) {
          const role = (userWithEmail.publicMetadata?.role as string || '').toLowerCase();
          
          // STRICT CHECK: Email must have EXACTLY teacher role
          if (role === 'teacher') {
            // Create teacher object from Clerk data
            teacher = {
              id: userWithEmail.id,
              email: userWithEmail.emailAddresses[0]?.emailAddress || '',
              name: `${userWithEmail.firstName || ''} ${userWithEmail.lastName || ''}`.trim() || email.split('@')[0],
              classes: userWithEmail.publicMetadata?.classes || [],
              phoneNumber: userWithEmail.publicMetadata?.phoneNumber || 'Not Provided',
            };
          } else if (role === 'student') {
            return NextResponse.json(
              { error: 'This email is registered as student. Please select Student role to login.' },
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
        }
      } catch (clerkError) {
        console.error('Error checking Clerk:', clerkError);
      }
    }

    if (!teacher) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please check your email and selected role.' },
        { status: 401 }
      );
    }

    // Create session in MongoDB (only if db is available)
    if (db) {
      const sessionData = {
        userId: teacher.id.toString(),
        userType: 'Teacher',
        userData: {
          id: teacher.id,
          email: teacher.email,
          name: teacher.name,
          classes: teacher.classes,
          phoneNumber: teacher.phoneNumber,
        },
        loginTime: new Date(),
        lastActivity: new Date(),
        isActive: true,
      };

      try {
        // Check if session already exists
        const existingSession = await db.collection('sessions').findOne({
          userId: teacher.id.toString(),
          userType: 'Teacher',
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

    // Teacher exists, return success with teacher data
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      teacher: {
        id: teacher.id,
        email: teacher.email,
        name: teacher.name,
        classes: teacher.classes,
        phoneNumber: teacher.phoneNumber,
      },
    });
  } catch (error: any) {
    console.error('Error during teacher login:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to login' },
      { status: 500 }
    );
  }
}
