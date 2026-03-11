import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentName, parentNumber, status } = body;

    // Simulate SMS notification
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const message = `✅ Your child ${studentName} attended school on ${date}.`;
    
    console.log(`Notification → Parent: ${parentNumber}, Message: ${message}`);

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { success: false, message: 'Error sending notification' },
      { status: 500 }
    );
  }
}

