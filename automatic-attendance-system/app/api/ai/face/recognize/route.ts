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
    const { image, embeddings, threshold = 0.6 } = await request.json();
    
    if (!image || !embeddings) {
      return NextResponse.json(
        { error: 'Image and embeddings are required' },
        { status: 400 }
      );
    }

    // Generate embedding for the input image
    const imageEmbedding = generateMockEmbedding(image);
    
    const matches: any[] = [];

    // Compare with stored embeddings
    for (const stored of embeddings) {
      const distance = euclideanDistance(imageEmbedding, stored.embedding);
      
      if (distance < threshold) {
        const confidence = Math.max(0, 1 - (distance / threshold));
        
        matches.push({
          studentId: stored.studentId,
          confidence: Math.round(confidence * 100) / 100,
          distance: Math.round(distance * 10000) / 10000,
          boundingBox: {
            x: 100,
            y: 100,
            width: 200,
            height: 200,
          },
        });
      }
    }

    return NextResponse.json({ matches });
  } catch (error: any) {
    console.error('Face recognition error:', error);
    return NextResponse.json(
      { error: error.message || 'Face recognition failed' },
      { status: 500 }
    );
  }
}
