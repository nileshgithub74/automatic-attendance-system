// MongoDB Schema Models for Smart AI Verification System

export interface VerificationSession {
  _id?: string;
  sessionId: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes (5-10)
  status: 'active' | 'completed' | 'cancelled';
  totalImages: number;
  capturedImages: number;
  processedImages: number;
  studentsMarked: string[]; // student IDs
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassroomImage {
  _id?: string;
  sessionId: string;
  imageUrl: string;
  imageData?: string; // base64
  captureTime: Date;
  sequenceNumber: number; // 1, 2, 3... up to 10
  detectedFaces: number;
  processedFaces: DetectedFace[];
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingTime?: number; // milliseconds
  error?: string;
  createdAt: Date;
}

export interface DetectedFace {
  faceId: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  descriptor: number[]; // 128-dimensional face descriptor
  confidence: number;
  matchedStudentId?: string;
  matchedStudentName?: string;
  similarityScore?: number;
  landmarks?: any;
}

export interface FaceDescriptor {
  _id?: string;
  studentId: string;
  studentName: string;
  descriptors: number[][]; // Multiple descriptors (3-5 images)
  imageUrls: string[];
  registrationDate: Date;
  quality: {
    averageConfidence: number;
    allFacesDetected: boolean;
    validDescriptors: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceVerification {
  _id?: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  date: Date;
  
  // Face Recognition Results
  totalImages: number;
  detectedInImages: number[]; // array of image sequence numbers
  detectionCount: number;
  detectionPercentage: number;
  averageSimilarity: number;
  
  // Verification Status
  status: 'present' | 'absent' | 'flagged';
  verificationMethod: 'ai_face_recognition';
  
  // Location Data
  studentLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
  };
  distanceFromClassroom?: number; // meters
  locationVerified: boolean;
  
  // Network Security
  networkData?: {
    ipAddress: string;
    isVPN: boolean;
    isProxy: boolean;
    isTor: boolean;
    isHosting: boolean;
    country: string;
    city: string;
    isp: string;
    latency: number;
    jitter: number;
  };
  networkVerified: boolean;
  
  // Flags
  flags: string[];
  flagReason?: string;
  
  // Timestamps
  firstDetection?: Date;
  lastDetection?: Date;
  verifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationLog {
  _id?: string;
  userId: string;
  userRole: 'teacher' | 'student';
  sessionId?: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    heading?: number;
    speed?: number;
  };
  timestamp: Date;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    isMobile: boolean;
  };
  createdAt: Date;
}

export interface NetworkLog {
  _id?: string;
  userId: string;
  sessionId?: string;
  ipAddress: string;
  
  // VPN/Proxy Detection
  isVPN: boolean;
  isProxy: boolean;
  isTor: boolean;
  isHosting: boolean;
  isRelay: boolean;
  
  // IP Intelligence
  country: string;
  region: string;
  city: string;
  isp: string;
  organization: string;
  asn: string;
  
  // Network Metrics
  latency: number; // ms
  jitter: number; // ms
  packetLoss?: number;
  
  // Risk Assessment
  riskScore: number; // 0-100
  threatLevel: 'low' | 'medium' | 'high';
  
  // Detection Details
  detectionMethod: string;
  detectionConfidence: number;
  
  timestamp: Date;
  createdAt: Date;
}

export interface FlaggedRecord {
  _id?: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  flagType: 'location' | 'network' | 'face_not_detected' | 'low_confidence' | 'multiple_devices';
  severity: 'low' | 'medium' | 'high';
  description: string;
  details: any;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  notes?: string;
  createdAt: Date;
}

export interface SessionStatistics {
  sessionId: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  flaggedCount: number;
  
  // Face Recognition Stats
  totalFacesDetected: number;
  averageDetectionConfidence: number;
  uniqueFacesMatched: number;
  
  // Location Stats
  studentsInRange: number;
  studentsOutOfRange: number;
  averageDistance: number;
  
  // Network Stats
  vpnDetected: number;
  proxyDetected: number;
  suspiciousNetworks: number;
  
  // Processing Stats
  totalImagesProcessed: number;
  averageProcessingTime: number;
  processingErrors: number;
  
  completionRate: number;
  accuracy: number;
}

// Helper Types
export interface FaceMatchResult {
  studentId: string;
  studentName: string;
  similarity: number;
  matched: boolean;
  descriptor: number[];
}

export interface LocationDistance {
  distance: number; // meters
  withinRange: boolean;
  studentLocation: { latitude: number; longitude: number };
  classroomLocation: { latitude: number; longitude: number };
}

export interface NetworkCheckResult {
  isVPN: boolean;
  isProxy: boolean;
  isSuspicious: boolean;
  riskScore: number;
  details: any;
}
