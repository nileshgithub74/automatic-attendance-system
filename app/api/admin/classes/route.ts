import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const db = await getDatabase();
      
      if (!db) {
        console.log('Database not available');
        return NextResponse.json([]);
      }

      // Get all students from users collection
      const students = await db.collection('users').find({
        role: { $regex: /^student$/i }
      }).toArray();

      // Also check Clerk for students
      let clerkStudents: any[] = [];
      try {
        const { clerkClient } = await import('@clerk/nextjs/server');
        const client = await clerkClient();
        const clerkUsers = await client.users.getUserList();
        
        clerkStudents = clerkUsers.data
          .filter((user: any) => {
            const role = (user.publicMetadata?.role as string || '').toLowerCase();
            return role === 'student';
          })
          .map((user: any) => ({
            class: user.publicMetadata?.class || 'Not Assigned',
            id: user.id
          }));
      } catch (clerkError) {
        console.error('Error fetching from Clerk:', clerkError);
      }

      // Combine students from both sources
      const allStudents = [
        ...students.map(s => ({ class: s.class || 'Not Assigned', id: s._id?.toString() || s.id })),
        ...clerkStudents
      ];

      // Get today's attendance
      const today = new Date().toISOString().split('T')[0];
      const attendanceRecords = await db.collection('attendance').find({
        date: today
      }).toArray();

      // Group students by class
      const classMap = new Map<string, any>();
      
      allStudents.forEach(student => {
        const className = student.class || 'Not Assigned';
        if (!classMap.has(className)) {
          classMap.set(className, {
            name: className,
            totalStudents: 0,
            presentToday: 0,
            absentToday: 0,
            teacher: 'Not assigned'
          });
        }
        const classData = classMap.get(className);
        classData.totalStudents++;
        
        // Check if student is present today
        const attendance = attendanceRecords.find(a => 
          a.studentId === student.id && a.status === 'present'
        );
        if (attendance) {
          classData.presentToday++;
        } else {
          classData.absentToday++;
        }
      });

      // Get teachers assigned to classes
      const teachers = await db.collection('users').find({
        role: { $regex: /^teacher$/i }
      }).toArray();

      // Also check Clerk for teachers
      try {
        const { clerkClient } = await import('@clerk/nextjs/server');
        const client = await clerkClient();
        const clerkUsers = await client.users.getUserList();
        
        const clerkTeachers = clerkUsers.data
          .filter((user: any) => {
            const role = (user.publicMetadata?.role as string || '').toLowerCase();
            return role === 'teacher';
          })
          .map((user: any) => ({
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            classes: user.publicMetadata?.classes || []
          }));
        
        teachers.push(...clerkTeachers);
      } catch (clerkError) {
        console.error('Error fetching teachers from Clerk:', clerkError);
      }

      // Assign teachers to classes
      teachers.forEach(teacher => {
        const teacherClasses = teacher.classes || [];
        teacherClasses.forEach((className: string) => {
          if (classMap.has(className)) {
            const classData = classMap.get(className);
            classData.teacher = teacher.name || 'Unknown Teacher';
          }
        });
      });

      // Convert map to array
      const formattedClasses = Array.from(classMap.values()).map((cls, index) => ({
        id: index + 1,
        name: cls.name,
        totalStudents: cls.totalStudents,
        presentToday: cls.presentToday,
        absentToday: cls.absentToday,
        teacher: cls.teacher
      }));

      return NextResponse.json(formattedClasses);
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json([], { status: 200 });
  }
}
