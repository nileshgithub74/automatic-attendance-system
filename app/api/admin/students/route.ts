import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';
import { mockStudents } from '@/lib/mockData';

export async function GET() {
  console.log('🔵 GET /api/admin/students - Starting...');
  
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
      const allStudents: any[] = [];
      const studentEmails = new Set<string>();

      // Fetch from Clerk - users with Student role
      try {
        console.log('👥 Fetching from Clerk...');
        const client = await clerkClient();
        const clerkUsers = await client.users.getUserList();
        console.log(`📊 Total Clerk users: ${clerkUsers.data.length}`);
        
        const clerkStudents = clerkUsers.data
          .filter((user: any) => {
            const role = (user.publicMetadata?.role as string || '').toLowerCase();
            return role === 'student';
          })
          .map((user: any) => {
            const email = user.emailAddresses[0]?.emailAddress || '';
            if (email) studentEmails.add(email.toLowerCase());
            
            return {
              id: user.id,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || email.split('@')[0],
              rollNo: user.publicMetadata?.rollNo || 'N/A',
              rollNumber: user.publicMetadata?.rollNo || 'N/A',
              class: user.publicMetadata?.class || 'Not Assigned',
              attendancePercent: 0,
              email: email,
              faceRegistered: user.publicMetadata?.faceRegistered || false,
              source: 'clerk',
            };
          });
        
        console.log(`✅ Found ${clerkStudents.length} students in Clerk`);
        allStudents.push(...clerkStudents);
      } catch (clerkError) {
        console.error('❌ Error fetching from Clerk:', clerkError);
      }

      // Fetch from MongoDB - check both 'students' and 'users' collections
      if (db) {
        // First, try the 'users' collection (main collection)
        // Use case-insensitive regex to match any case variation
        const mongoUsersStudents = await db.collection('users').find({
          role: { $regex: /^student$/i }
        }).toArray();
        console.log(`📚 Found ${mongoUsersStudents.length} students in users collection`);
        
        // Then, try the 'students' collection (legacy)
        const mongoStudents = await db.collection('students').find({}).toArray();
        console.log(`📚 Found ${mongoStudents.length} students in students collection`);
        
        // Combine both
        const allMongoStudents = [...mongoUsersStudents, ...mongoStudents];
        
        const formattedMongoStudents = allMongoStudents
          .filter((student: any) => {
            const email = (student.email || '').toLowerCase();
            // Only add if not already in Clerk (or if no email)
            if (!email) return true; // Include students without email
            return !studentEmails.has(email); // Include if email not in Clerk
          })
          .map((student: any) => ({
            id: student.id || student._id?.toString() || Math.random().toString(36).substring(2, 11),
            name: student.name || student.firstName + ' ' + student.lastName || 'Unknown Student',
            rollNo: student.rollNo || student.rollNumber || 'N/A',
            rollNumber: student.rollNo || student.rollNumber || 'N/A',
            class: student.class || student.className || 'Not Assigned',
            attendancePercent: student.attendancePercent || Math.floor(Math.random() * 30) + 70,
            email: student.email || '',
            source: 'mongodb',
            faceRegistered: student.faceRegistered || false,
          }));
        
        allStudents.push(...formattedMongoStudents);
        console.log(`✅ Added ${formattedMongoStudents.length} MongoDB students (after deduplication)`);
      }

      console.log(`📊 Total students to return: ${allStudents.length}`);
      console.log('🎯 Returning students data...');
      
      // Return real data only (no mock data)
      return NextResponse.json(allStudents);
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      console.error('Stack:', dbError);
      return NextResponse.json([], { status: 200 });
    }
  } catch (error) {
    console.error('❌ Error fetching students:', error);
    console.error('Stack:', error);
    return NextResponse.json([], { status: 200 });
  }
}
