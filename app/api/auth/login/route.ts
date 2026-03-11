import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role } = body;

    // Validate input
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['student', 'teacher', 'parent'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const db = await getDatabase();

    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Find user by email and role
    const collectionName = role === 'student' ? 'students' : role === 'teacher' ? 'teachers' : 'parents';
    console.log(`🔍 Looking for ${role} with email: ${email} in collection: ${collectionName}`);
    
    let user: any = await db.collection(collectionName).findOne({ email: email });
    console.log('User found in MongoDB:', user ? `Yes (ID: ${user.id})` : 'No');

    if (!user) {
      // Check if email exists in other collections
      const studentExists = await db.collection('students').findOne({ email: email });
      const teacherExists = await db.collection('teachers').findOne({ email: email });
      const parentExists = await db.collection('parents').findOne({ email: email });
      
      if (studentExists && role !== 'student') {
        return NextResponse.json(
          { error: 'This email is registered as a Student. Please select Student role.' },
          { status: 401 }
        );
      }
      if (teacherExists && role !== 'teacher') {
        return NextResponse.json(
          { error: 'This email is registered as a Teacher. Please select Teacher role.' },
          { status: 401 }
        );
      }
      if (parentExists && role !== 'parent') {
        return NextResponse.json(
          { error: 'This email is registered as a Parent. Please select Parent role.' },
          { status: 401 }
        );
      }
      
      // If not found in MongoDB, check Clerk
      console.log(`🔍 User not found in MongoDB, checking Clerk...`);
      try {
        const clerk = await clerkClient();
        const clerkUsers = await clerk.users.getUserList();
        console.log(`📊 Found ${clerkUsers.data.length} users in Clerk`);
        
        // Find user with this email
        const clerkUser = clerkUsers.data.find((u: any) => {
          const userEmail = u.emailAddresses[0]?.emailAddress || '';
          return userEmail.toLowerCase() === email.toLowerCase();
        });

        if (clerkUser) {
          const clerkRole = (clerkUser.publicMetadata?.role as string || '').toLowerCase();
          console.log(`👤 Found user in Clerk: ${email} with role: ${clerkRole}`);
          
          // Check if Clerk role matches requested role
          if (clerkRole !== role) {
            if (clerkRole === 'student') {
              return NextResponse.json(
                { error: 'This email is registered as a Student. Please select Student role.' },
                { status: 401 }
              );
            } else if (clerkRole === 'teacher') {
              return NextResponse.json(
                { error: 'This email is registered as a Teacher. Please select Teacher role.' },
                { status: 401 }
              );
            } else if (clerkRole === 'parent') {
              return NextResponse.json(
                { error: 'This email is registered as a Parent. Please select Parent role.' },
                { status: 401 }
              );
            } else if (clerkRole === 'principal' || clerkRole === 'admin') {
              return NextResponse.json(
                { error: 'This email is registered as admin/principal. Please use Admin Sign In.' },
                { status: 401 }
              );
            } else {
              return NextResponse.json(
                { error: `This email is registered as ${clerkRole}. Please select the correct role.` },
                { status: 401 }
              );
            }
          }
          
          // Role matches, create user object from Clerk data
          console.log(`✅ User has matching ${role} role, creating user object from Clerk`);
          user = {
            id: clerkUser.id,
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email.split('@')[0],
            firstName: clerkUser.firstName || '',
            lastName: clerkUser.lastName || '',
            ...(role === 'student' && {
              class: clerkUser.publicMetadata?.class || 'Not Assigned',
              section: clerkUser.publicMetadata?.section || 'A',
              rollNo: clerkUser.publicMetadata?.rollNo || 'Not Assigned',
              parentNumber: clerkUser.publicMetadata?.parentNumber || 'Not Provided',
            }),
            ...(role === 'teacher' && {
              subjects: clerkUser.publicMetadata?.subjects || [],
              classes: clerkUser.publicMetadata?.classes || [],
            }),
            ...(role === 'parent' && {
              childrenIds: clerkUser.publicMetadata?.childrenIds || [],
            }),
          };
          
          // Optionally sync to MongoDB for future logins
          try {
            const existingDoc = await db.collection(collectionName).findOne({ id: clerkUser.id });
            if (!existingDoc) {
              console.log(`💾 Syncing ${role} to MongoDB...`);
              await db.collection(collectionName).insertOne({
                ...user,
                createdAt: new Date(),
                updatedAt: new Date(),
                syncedFromClerk: true,
              });
              console.log(`✅ ${role} synced to MongoDB`);
            }
          } catch (syncError) {
            console.error('Error syncing to MongoDB:', syncError);
            // Continue with login even if sync fails
          }
        } else {
          console.log(`❌ Email ${email} not found in Clerk`);
        }
      } catch (clerkError) {
        console.error('❌ Error checking Clerk:', clerkError);
      }
      
      // If still no user found
      if (!user) {
        return NextResponse.json(
          { error: `No ${role} found with this email address. Please contact your administrator.` },
          { status: 404 }
        );
      }
    }

    // Create session in MongoDB
    const sessionData = {
      userId: user.id.toString(),
      userType: role.charAt(0).toUpperCase() + role.slice(1), // Capitalize: Student, Teacher, Parent
      userRole: role, // Keep lowercase for compatibility
      userData: {
        id: user.id,
        email: user.email,
        name: user.name || `${user.firstName} ${user.lastName}`,
        ...( role === 'student' && { class: user.class, rollNo: user.rollNo }),
        ...( role === 'teacher' && { subjects: user.classes || user.subjects }),
        ...( role === 'parent' && { childrenIds: user.childrenIds }),
      },
      loginTime: new Date(),
      lastActivity: new Date(),
      isActive: true,
    };

    // Check if session already exists
    const existingSession = await db.collection('sessions').findOne({
      userId: user.id.toString(),
      isActive: true,
    });

    if (existingSession) {
      // Update existing session
      console.log('Updating existing session for user:', user.id);
      await db.collection('sessions').updateOne(
        { _id: existingSession._id },
        {
          $set: {
            lastActivity: new Date(),
            userData: sessionData.userData,
            userType: sessionData.userType,
          },
        }
      );
    } else {
      // Create new session
      console.log('Creating new session for user:', user.id, 'Type:', sessionData.userType);
      const result = await db.collection('sessions').insertOne(sessionData);
      console.log('Session created with ID:', result.insertedId);
    }

    // Verify session was created
    const verifySession = await db.collection('sessions').findOne({
      userId: user.id.toString(),
      isActive: true,
    });
    console.log('Session verification:', verifySession ? 'Found' : 'Not found');

    // Create response with cookies
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: sessionData.userData,
      role: role,
    });

    // Set cookies for middleware
    response.cookies.set('userId', user.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    response.cookies.set('userRole', role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to login' },
      { status: 500 }
    );
  }
}
