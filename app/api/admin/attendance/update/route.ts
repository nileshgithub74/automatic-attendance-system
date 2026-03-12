import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const role = user?.publicMetadata?.role as string;

    // Only admins/principals can update attendance
    if (role !== 'Principal' && role !== 'Admin' && role !== 'admin' && role !== 'principal') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { recordId, status } = body;

    if (!recordId || !status) {
      return NextResponse.json({ error: 'Missing recordId or status' }, { status: 400 });
    }

    if (status !== 'present' && status !== 'absent') {
      return NextResponse.json({ error: 'Invalid status. Must be "present" or "absent"' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('attendance_system');

    // Convert recordId to ObjectId if it's a valid MongoDB ObjectId
    let query: any = { _id: recordId };
    try {
      if (ObjectId.isValid(recordId)) {
        query = { _id: new ObjectId(recordId) };
      }
    } catch (e) {
      // If conversion fails, use recordId as is
      console.log('Could not convert to ObjectId, using as string');
    }

    console.log('Updating attendance with query:', query);

    // Update the attendance record
    const result = await db.collection('attendance').updateOne(
      query,
      { 
        $set: { 
          status,
          updatedAt: new Date(),
          updatedBy: user?.emailAddresses[0]?.emailAddress || 'Admin'
        } 
      }
    );

    console.log('Update result:', result);

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Attendance updated to ${status}`,
    });

  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json(
      { error: 'Failed to update attendance' },
      { status: 500 }
    );
  }
}
