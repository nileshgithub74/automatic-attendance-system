import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();
    
    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Mock face detection - returns a simulated face
    // In production, integrate with a real AI service or use client-side detection
    const faces = [{
      boundingBox: {
        x: 100,
        y: 100,
        width: 200,
        height: 200,
      },
      confidence: 0.95,
    }];

    return NextResponse.json({
      faces,
      count: faces.length,
    });
  } catch (error: any) {
    console.error('Face detection error:', error);
    return NextResponse.json(
      { error: error.message || 'Face detection failed' },
      { status: 500 }
    );
  }
}
