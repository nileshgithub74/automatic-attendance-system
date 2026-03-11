import { NextRequest, NextResponse } from 'next/server';

function generateMockEmbedding(imageData: string): number[] {
  // Generate a deterministic embedding based on image data
  // This ensures same image produces same embedding
  const hash = imageData.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  
  const embedding: number[] = [];
  for (let i = 0; i < 128; i++) {
    embedding.push(Math.sin(hash + i) * 0.5 + 0.5);
  }
  
  return embedding;
}

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();
    
    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Generate mock embedding
    const embedding = generateMockEmbedding(image);
    const quality = 0.85;

    return NextResponse.json({
      embedding,
      quality,
      faceDetected: true,
    });
  } catch (error: any) {
    console.error('Embedding extraction error:', error);
    return NextResponse.json(
      { error: error.message || 'Embedding extraction failed' },
      { status: 500 }
    );
  }
}
