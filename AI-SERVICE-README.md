# AI Face Recognition Service

The AI face recognition service is now integrated directly into the Next.js application as API routes. No separate deployment needed!

## API Endpoints

All endpoints are available at `/api/ai/*`

### 1. Health Check
```
GET /api/ai/health
```
Returns service status.

### 2. Face Detection
```
POST /api/ai/face/detect
Body: { "image": "base64_encoded_image" }
```
Detects faces in an image and returns bounding boxes.

### 3. Extract Face Embedding
```
POST /api/ai/face/extract-embedding
Body: { "image": "base64_encoded_image" }
```
Extracts a 128-dimensional face embedding for recognition.

### 4. Face Recognition
```
POST /api/ai/face/recognize
Body: {
  "image": "base64_encoded_image",
  "embeddings": [
    { "studentId": "123", "embedding": [0.1, 0.2, ...] }
  ],
  "threshold": 0.6
}
```
Recognizes faces by comparing against stored embeddings.

### 5. Face Comparison
```
POST /api/ai/face/compare
Body: {
  "image1": "base64_encoded_image",
  "image2": "base64_encoded_image"
}
```
Compares two face images for similarity.

## Current Implementation

The current implementation uses a **mock/deterministic algorithm** that:
- Generates consistent embeddings based on image data
- Performs euclidean distance calculations for matching
- Returns realistic-looking results for testing

## Upgrading to Real AI

To upgrade to real face recognition, you have several options:

### Option 1: Use a Cloud AI Service (Recommended for Production)
- **AWS Rekognition**: Face detection and recognition
- **Azure Face API**: Microsoft's face recognition service
- **Google Cloud Vision**: Face detection and matching
- **Face++**: Dedicated face recognition API

### Option 2: Self-Hosted AI Model
- Deploy a Python service with face_recognition or DeepFace
- Use TensorFlow.js with face-api.js models
- Deploy on a separate server (Render, Railway, etc.)

### Option 3: Client-Side Processing
- Use face-api.js in the browser
- Process images on the client before sending to server
- Good for privacy but requires more client resources

## Testing

Run the test suite:
```bash
npm run dev
node test-ai-service.js
```

All tests should pass:
- ✅ Health Check
- ✅ Face Detection
- ✅ Embedding Extraction
- ✅ Face Recognition
- ✅ Face Comparison

## Deployment

Since the AI service is part of the Next.js app, it deploys automatically with Vercel:

1. Push to GitHub
2. Vercel automatically deploys
3. AI endpoints are available at `https://your-app.vercel.app/api/ai/*`

No separate AI service deployment needed!

## Notes

- The mock implementation is sufficient for development and testing
- For production, integrate a real AI service before going live
- Face embeddings are 128-dimensional arrays
- Distance threshold of 0.6 is recommended for matching
