import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

// GET - Fetch parent submissions (only for logged-in parent)
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;
    const userRole = request.cookies.get('userRole')?.value;

    // Check authentication and authorization
    if (!userId || userRole !== 'parent') {
      return NextResponse.json(
        { error: 'Unauthorized - Parent access only' },
        { status: 401 }
      );
    }

    const db = await getDatabase();

    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Fetch only this parent's submissions
    const submissions = await db
      .collection('parent_submissions')
      .find({ userId: parseInt(userId), userRole: 'parent' })
      .sort({ submittedAt: -1 })
      .toArray();

    return NextResponse.json(submissions);
  } catch (error: any) {
    console.error('Error fetching parent submissions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

// POST - Create parent submission
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;
    const userRole = request.cookies.get('userRole')?.value;

    // Check authentication and authorization
    if (!userId || userRole !== 'parent') {
      return NextResponse.json(
        { error: 'Unauthorized - Parent access only' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description } = body;

    // Validate input
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get next ID
    const lastSubmission = await db
      .collection('parent_submissions')
      .find({})
      .sort({ id: -1 })
      .limit(1)
      .toArray();
    const nextId = lastSubmission.length > 0 ? lastSubmission[0].id + 1 : 1;

    // Create submission
    const submission = {
      id: nextId,
      userId: parseInt(userId),
      userRole: 'parent',
      title: title,
      description: description,
      submittedAt: new Date(),
      status: 'pending',
    };

    await db.collection('parent_submissions').insertOne(submission);

    return NextResponse.json({
      success: true,
      message: 'Submission created successfully',
      submission: submission,
    });
  } catch (error: any) {
    console.error('Error creating parent submission:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create submission' },
      { status: 500 }
    );
  }
}
