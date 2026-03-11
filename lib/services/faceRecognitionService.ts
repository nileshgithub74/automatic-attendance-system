// Face Recognition Service using face-api.js
// This service handles face detection, descriptor generation, and matching

import * as faceapi from 'face-api.js';

// Configuration
const FACE_DETECTION_OPTIONS = new faceapi.SsdMobilenetv1Options({
  minConfidence: 0.5,
  maxResults: 50 // Maximum faces to detect in classroom
});

const SIMILARITY_THRESHOLD = 0.6; // Faces with similarity > 0.6 are considered matches
const MODEL_PATH = '/models'; // Path to face-api.js models

export class FaceRecognitionService {
  private modelsLoaded = false;

  /**
   * Load face-api.js models (browser)
   */
  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;

    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_PATH),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
      ]);
      
      this.modelsLoaded = true;
      console.log('✅ Face-api.js models loaded successfully');
    } catch (error) {
      console.error('❌ Error loading face-api.js models:', error);
      throw new Error('Failed to load face recognition models');
    }
  }

  /**
   * Detect faces in an image and generate descriptors
   */
  async detectFacesWithDescriptors(
    imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
  ): Promise<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<faceapi.WithFaceDetection<{}>>>[]> {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }

    try {
      const detections = await faceapi
        .detectAllFaces(imageElement, FACE_DETECTION_OPTIONS)
        .withFaceLandmarks()
        .withFaceDescriptors();

      return detections;
    } catch (error) {
      console.error('Error detecting faces:', error);
      throw error;
    }
  }

  /**
   * Extract face descriptor from image (for registration)
   */
  async extractFaceDescriptor(
    imageElement: HTMLImageElement | HTMLCanvasElement
  ): Promise<Float32Array | null> {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }

    try {
      const detection = await faceapi
        .detectSingleFace(imageElement, FACE_DETECTION_OPTIONS)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        console.warn('No face detected in image');
        return null;
      }

      return detection.descriptor;
    } catch (error) {
      console.error('Error extracting face descriptor:', error);
      return null;
    }
  }

  /**
   * Compare two face descriptors and return similarity score
   */
  compareFaces(descriptor1: Float32Array | number[], descriptor2: Float32Array | number[]): number {
    const desc1 = Array.isArray(descriptor1) ? new Float32Array(descriptor1) : descriptor1;
    const desc2 = Array.isArray(descriptor2) ? new Float32Array(descriptor2) : descriptor2;
    
    const distance = faceapi.euclideanDistance(desc1, desc2);
    
    // Convert distance to similarity (0-1 scale, higher is more similar)
    const similarity = 1 - distance;
    
    return similarity;
  }

  /**
   * Match detected face with stored student descriptors
   */
  matchFaceWithStudents(
    detectedDescriptor: Float32Array | number[],
    studentDescriptors: { studentId: string; studentName: string; descriptors: number[][] }[]
  ): { studentId: string; studentName: string; similarity: number; matched: boolean } | null {
    let bestMatch: { studentId: string; studentName: string; similarity: number } | null = null;

    for (const student of studentDescriptors) {
      for (const storedDescriptor of student.descriptors) {
        const similarity = this.compareFaces(detectedDescriptor, storedDescriptor);

        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = {
            studentId: student.studentId,
            studentName: student.studentName,
            similarity,
          };
        }
      }
    }

    if (bestMatch && bestMatch.similarity >= SIMILARITY_THRESHOLD) {
      return {
        ...bestMatch,
        matched: true,
      };
    }

    return null;
  }

  /**
   * Process classroom image and match all detected faces
   */
  async processClassroomImage(
    imageElement: HTMLImageElement | HTMLCanvasElement,
    studentDescriptors: { studentId: string; studentName: string; descriptors: number[][] }[]
  ): Promise<{
    totalFaces: number;
    matchedFaces: Array<{
      studentId: string;
      studentName: string;
      similarity: number;
      boundingBox: { x: number; y: number; width: number; height: number };
    }>;
    unmatchedFaces: number;
  }> {
    const detections = await this.detectFacesWithDescriptors(imageElement);

    const matchedFaces: Array<{
      studentId: string;
      studentName: string;
      similarity: number;
      boundingBox: { x: number; y: number; width: number; height: number };
    }> = [];

    for (const detection of detections) {
      const match = this.matchFaceWithStudents(detection.descriptor, studentDescriptors);

      if (match) {
        matchedFaces.push({
          studentId: match.studentId,
          studentName: match.studentName,
          similarity: match.similarity,
          boundingBox: {
            x: detection.detection.box.x,
            y: detection.detection.box.y,
            width: detection.detection.box.width,
            height: detection.detection.box.height,
          },
        });
      }
    }

    return {
      totalFaces: detections.length,
      matchedFaces,
      unmatchedFaces: detections.length - matchedFaces.length,
    };
  }

  /**
   * Validate image quality for face registration
   */
  async validateImageQuality(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<{
    valid: boolean;
    reason?: string;
    confidence?: number;
  }> {
    try {
      const detection = await faceapi
        .detectSingleFace(imageElement, FACE_DETECTION_OPTIONS)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        return { valid: false, reason: 'No face detected in image' };
      }

      const confidence = detection.detection.score;

      if (confidence < 0.7) {
        return {
          valid: false,
          reason: 'Face detection confidence too low. Please use a clearer image.',
          confidence,
        };
      }

      // Check face size (should be at least 100x100 pixels)
      const faceBox = detection.detection.box;
      if (faceBox.width < 100 || faceBox.height < 100) {
        return {
          valid: false,
          reason: 'Face too small. Please move closer to the camera.',
          confidence,
        };
      }

      return { valid: true, confidence };
    } catch (error) {
      return { valid: false, reason: 'Error processing image' };
    }
  }

  /**
   * Convert descriptor to array for storage
   */
  descriptorToArray(descriptor: Float32Array): number[] {
    return Array.from(descriptor);
  }

  /**
   * Convert array back to Float32Array
   */
  arrayToDescriptor(array: number[]): Float32Array {
    return new Float32Array(array);
  }
}

// Singleton instance
export const faceRecognitionService = new FaceRecognitionService();
