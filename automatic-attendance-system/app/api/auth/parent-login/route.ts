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
    let parent = null;

    // First check MongoDB for parent
    if (db) {
      parent = await db.collection('parents').findOne({ email: email });
      
      // If found in parents collection, that's good
      if (parent) {
        // But also check if this email exists in other role collections
        const studentExists = await db.collection('students').findOne({ email: email });
        const teacherExists = await db.collection('teachers').findOne({ email: email });
        
        if (studentExists) {
          return NextResponse.json(
            { error: 'This email is registered as student. Please select Student role to login.' },
            { status: 401 }
          );
        }
        
        if (teacherExists) {
          return NextResponse.json(
            { error: 'This email is registered as teacher. Please select Teacher role to login.' },
            { status: 401 }
          );
        }
      } else {
        // If not found in parents, check if it exists in other collections
        const studentExists = await db.collection('students').findOne({ email: email });
        const teacherExists = await db.collection('teachers').findOne({ email: email });
        
        if (studentExists) {
          return NextResponse.json(
            { error: 'This email is registered as student. Please select Student role to login.' },
            { status: 401 }
          );
        }
        
        if (teacherExists) {
          return NextResponse.json(
            { error: 'This email is registered as teacher. Please select Teacher role to login.' },
            { status: 401 }
          );
        }
      }
    }

    // If not found in MongoDB, check Clerk for users with Parent role ONLY
    if (!parent) {
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
          
          // STRICT CHECK: Email must have EXACTLY parent role
          if (role === 'parent') {
            // Create parent object from Clerk data
            parent = {
              id: userWithEmail.id,
              email: userWithEmail.emailAddresses[0]?.emailAddress || '',
              name: `${userWithEmail.firstName || ''} ${userWithEmail.lastName || ''}`.trim() || email.split('@')[0],
              phoneNumber: userWithEmail.publicMetadata?.phoneNumber || 'Not Provided',
              childName: userWithEmail.publicMetadata?.childName || 'Not Provided',
            };
          } else if (role === 'student') {
            return NextResponse.json(
              { error: 'This email is registered as student. Please select Student role to login.' },
              { status: 401 }
            );
          } else if (role === 'teacher') {
            return NextResponse.json(
              { error: 'This email is registered as teacher. Please select Teacher role to login.' },
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

    if (!parent) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please check your email and selected role.' },
        { status: 401 }
      );
    }

    // Create session in MongoDB (only if db is available)
    if (db) {
      const sessionData = {
        userId: parent.id.toString(),
        userType: 'Parent',
        userData: {
          id: parent.id,
          email: parent.email,
          name: parent.name,
          phoneNumber: parent.phoneNumber,
          childName: parent.childName,
        },
        loginTime: new Date(),
        lastActivity: new Date(),
        isActive: true,
      };

      try {
        // Check if session already exists
        const existingSession = await db.collection('sessions').findOne({
          userId: parent.id.toString(),
          userType: 'Parent',
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

    // Parent exists, return success with parent data
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      parent: {
        id: parent.id,
        email: parent.email,
        name: parent.name,
        phoneNumber: parent.phoneNumber,
        childName: parent.childName,
      },
    });
  } catch (error: any) {
    console.error('Error during parent login:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to login' },
      { status: 500 }
    );
  }
}