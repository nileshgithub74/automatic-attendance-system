import { NextRequest, NextResponse } from 'next/server';

function euclideanDistance(arr1: number[], arr2: number[]): number {
  return Math.sqrt(
    arr1.reduce((sum, val, i) => sum + Math.pow(val - arr2[i], 2), 0)
  );
}

function generateMockEmbedding(imageData: string): number[] {
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
    const { image1, image2 } = await request.json();
    
    if (!image1 || !image2) {
      return NextResponse.json(
        { error: 'Both images are required' },
        { status: 400 }
      );
    }

    const embedding1 = generateMockEmbedding(image1);
    const embedding2 = generateMockEmbedding(image2);
    
    const distance = euclideanDistance(embedding1, embedding2);
    const similarity = Math.max(0, 1 - distance);

    return NextResponse.json({
      similar: distance < 0.6,
      similarity: Math.round(similarity * 100) / 100,
      distance: Math.round(distance * 10000) / 10000,
    });
  } catch (error: any) {
    console.error('Face comparison error:', error);
    return NextResponse.json(
      { error: error.message || 'Face comparison failed' },
      { status: 500 }
    );
  }
}
