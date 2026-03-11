/**
 * AI Service Client
 * Communicates with Python FastAPI microservice for face recognition
 */

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_APP_URL || '';

export interface FaceDetectionResult {
  faces: Array<{
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    confidence: number;
  }>;
  count: number;
}

export interface FaceMatch {
  studentId: string;
  confidence: number;
  distance: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface FaceRecognitionResult {
  matches: FaceMatch[];
}

export interface EmbeddingResult {
  embedding: number[];
  quality: number;
  faceDetected: boolean;
}

export interface EmbeddingData {
  studentId: string;
  embedding: number[];
}

/**
 * Detect faces in an image
 */
export async function detectFaces(imageBase64: string): Promise<FaceDetectionResult> {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/ai/face/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageBase64 }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Face detection error:', error);
    throw error;
  }
}

/**
 * Extract face embedding from an image
 */
export async function extractEmbedding(imageBase64: string): Promise<EmbeddingResult> {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/ai/face/extract-embedding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageBase64 }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Embedding extraction error:', error);
    throw error;
  }
}

/**
 * Recognize faces in an image against stored embeddings
 */
export async function recognizeFaces(
  imageBase64: string,
  embeddings: EmbeddingData[],
  threshold: number = 0.6
): Promise<FaceRecognitionResult> {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/ai/face/recognize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64,
        embeddings,
        threshold,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Face recognition error:', error);
    throw error;
  }
}

/**
 * Compare two face images
 */
export async function compareFaces(image1Base64: string, image2Base64: string) {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/ai/face/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image1: image1Base64,
        image2: image2Base64,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Face comparison error:', error);
    throw error;
  }
}

/**
 * Batch recognize faces in multiple images
 */
export async function batchRecognizeFaces(
  images: string[],
  embeddings: EmbeddingData[],
  threshold: number = 0.6
) {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/ai/face/batch-recognize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images,
        embeddings,
        threshold,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Batch recognition error:', error);
    throw error;
  }
}

/**
 * Check if AI service is healthy
 */
export async function checkAIServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/ai/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('AI service health check failed:', error);
    return false;
  }
}
