import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';
import { mockTeachers } from '@/lib/mockData';

export async function GET() {
  console.log('🔵 GET /api/admin/teachers - Starting...');
  
  try {
    const { userId } = await auth();
    console.log('🔐 Auth userId:', userId);

    if (!userId) {
      console.log('❌ No userId - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      console.log('📦 Getting database connection...');
      const db = await getDatabase();
      const allTeachers: any[] = [];
      const teacherEmails = new Set<string>();

      // Fetch from Clerk - users with Teacher role
      try {
        console.log('👥 Fetching from Clerk...');
        const client = await clerkClient();
        const clerkUsers = await client.users.getUserList();
        console.log(`📊 Total Clerk users: ${clerkUsers.data.length}`);
        
        const clerkTeachersData = clerkUsers.data
          .filter((user: any) => {
            const role = (user.publicMetadata?.role as string || '').toLowerCase();
            return role === 'teacher';
          })
          .map((user: any) => {
            const email = user.emailAddresses[0]?.emailAddress || '';
            if (email) teacherEmails.add(email.toLowerCase());
            
            return {
              id: user.id,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || email.split('@')[0],
              email: email,
              classes: user.publicMetadata?.classes || [],
              lastAttendanceMarked: 'Never',
              source: 'clerk',
            };
          });
        
        // Get last attendance marked date for each Clerk teacher
        if (db) {
          for (const teacher of clerkTeachersData) {
            const lastAttendance = await db
              .collection('attendance')
              .findOne(
                { teacherId: teacher.id },
                { sort: { markedAt: -1 } }
              );
            
            if (lastAttendance && lastAttendance.markedAt) {
              teacher.lastAttendanceMarked = new Date(lastAttendance.markedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
            }
          }
        }
        
        console.log(`✅ Found ${clerkTeachersData.length} teachers in Clerk`);
        allTeachers.push(...clerkTeachersData);
      } catch (clerkError) {
        console.error('❌ Error fetching from Clerk:', clerkError);
      }

      // Fetch from MongoDB - check both 'teachers' and 'users' collections
      if (db) {
        // First, try the 'users' collection (main collection)
        // Use case-insensitive regex to match any case variation
        const mongoUsersTeachers = await db.collection('users').find({
          role: { $regex: /^teacher$/i }
        }).toArray();
        console.log(`👨‍🏫 Found ${mongoUsersTeachers.length} teachers in users collection`);
        
        // Then, try the 'teachers' collection (legacy)
        const mongoTeachers = await db.collection('teachers').find({}).toArray();
        console.log(`👨‍🏫 Found ${mongoTeachers.length} teachers in teachers collection`);
        
        // Combine both
        const allMongoTeachers = [...mongoUsersTeachers, ...mongoTeachers];
        
        const formattedMongoTeachers = await Promise.all(
          allMongoTeachers
            .filter((teacher: any) => {
              const email = (teacher.email || '').toLowerCase();
              // Only add if not already in Clerk (or if no email)
              if (!email) return true; // Include teachers without email
              return !teacherEmails.has(email); // Include if email not in Clerk
            })
            .map(async (teacher: any) => {
              let lastAttendanceMarked = teacher.lastAttendanceMarked || 'Never';
              
              // Get last attendance marked date from attendance collection
              const lastAttendance = await db
                .collection('attendance')
                .findOne(
                  { 
                    $or: [
                      { teacherId: teacher.id?.toString() },
                      { teacherId: teacher.clerkId },
                      { teacherId: teacher._id?.toString() }
                    ]
                  },
                  { sort: { markedAt: -1 } }
                );
              
              if (lastAttendance && lastAttendance.markedAt) {
                lastAttendanceMarked = new Date(lastAttendance.markedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
              }
              
              return {
                id: teacher.id || teacher._id?.toString() || Math.random().toString(36).substring(2, 11),
                name: teacher.name || teacher.firstName + ' ' + teacher.lastName || 'Unknown Teacher',
                email: teacher.email || '',
                classes: Array.isArray(teacher.classes) ? teacher.classes : 
                        Array.isArray(teacher.subjects) ? teacher.subjects :
                        (teacher.classes ? [teacher.classes] : []),
                lastAttendanceMarked: lastAttendanceMarked,
                source: 'mongodb',
              };
            })
        );
        
        allTeachers.push(...formattedMongoTeachers);
        console.log(`✅ Added ${formattedMongoTeachers.length} MongoDB teachers (after deduplication)`);
      }

      console.log(`📊 Total teachers to return: ${allTeachers.length}`);
      console.log('🎯 Returning teachers data...');
      
      // Return real data only (no mock data)
      return NextResponse.json(allTeachers);
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      console.error('Stack:', dbError);
      return NextResponse.json([], { status: 200 });
    }
  } catch (error) {
    console.error('❌ Error fetching teachers:', error);
    console.error('Stack:', error);
    return NextResponse.json([], { status: 200 });
  }
}
