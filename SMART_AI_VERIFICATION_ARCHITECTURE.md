# Smart AI-Based Classroom Attendance Verification System

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  Teacher Dashboard          Student Dashboard       Admin Panel  │
│  - Manual Attendance        - View Status          - All Sessions│
│  - Start Session            - Face Registration    - Flagged     │
│  - Camera Capture           - Location View        - Analytics   │
│  - Real-time Timer          - Attendance History   - Logs        │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                    API LAYER (Next.js API Routes)                │
├─────────────────────────────────────────────────────────────────┤
│  /api/session/*            /api/face/*         /api/location/*   │
│  /api/network/*            /api/admin/*        /api/student/*    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                      AI PROCESSING LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  face-api.js              TensorFlow.js         Canvas Processing│
│  - Face Detection         - Model Loading       - Image Processing│
│  - Face Recognition       - Embeddings          - Preprocessing   │
│  - Descriptor Matching    - Similarity Score    - Optimization    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY & VERIFICATION                       │
├─────────────────────────────────────────────────────────────────┤
│  Location Service         Network Detection     Image Validation │
│  - GPS Tracking           - VPN Detection       - Quality Check  │
│  - Haversine Distance     - Proxy Detection     - Face Count     │
│  - Geofencing             - IP Intelligence     - Timestamp      │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (MongoDB)                          │
├─────────────────────────────────────────────────────────────────┤
│  Users                    Sessions              AttendanceRecords │
│  FaceDescriptors          LocationLogs          NetworkLogs       │
│  ClassroomImages          VerificationResults   FlaggedRecords    │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Session Start Flow
```
Teacher → Start Session → Create Session Record → Start Timer
                                ↓
                        Enable Camera Capture
                                ↓
                    Capture Images (Every 30s)
                                ↓
                        Upload to Backend
                                ↓
                        AI Face Detection
                                ↓
                        Match with Students
                                ↓
                        Store Results
```

### 2. Face Registration Flow
```
Student → Upload Images → Validate Quality → Extract Faces
                                ↓
                        Generate Descriptors
                                ↓
                        Store in MongoDB
                                ↓
                        Link to Student Profile
```

### 3. Verification Flow
```
Classroom Image → Face Detection → Extract Descriptors
                                ↓
                    Compare with All Students
                                ↓
                    Calculate Similarity Scores
                                ↓
                    Match if Score > 0.6
                                ↓
                    Record Presence
```

## Technology Stack

### Frontend
- Next.js 15
- React 18
- face-api.js (browser)
- WebRTC (getUserMedia)
- Geolocation API
- Canvas API

### Backend
- Next.js API Routes
- face-api.js (Node.js)
- @tensorflow/tfjs-node
- canvas (Node.js)
- MongoDB Driver

### AI/ML
- face-api.js models:
  - ssd_mobilenetv1 (face detection)
  - faceLandmark68Net (landmarks)
  - faceRecognitionNet (descriptors)
- TensorFlow.js

### Security
- IP Intelligence APIs
- Haversine Formula
- Network Analysis
- Image Validation

## Key Features

### 1. Smart Session Management
- 5-10 minute sessions
- Automatic image capture
- Real-time countdown
- Session status tracking

### 2. AI Face Recognition
- Multi-face detection
- Face descriptor generation
- Similarity matching (threshold: 0.6)
- Batch processing

### 3. Location Verification
- GPS tracking
- Distance calculation
- 30-meter geofence
- Location logging

### 4. Network Security
- VPN detection
- Proxy detection
- IP intelligence
- Network latency check

### 5. Attendance Rules
- 50% presence threshold
- Automatic calculation
- Flagging system
- Manual override option

## Performance Considerations

1. **Image Processing**: Process images asynchronously
2. **Model Loading**: Cache models in memory
3. **Database Queries**: Index on studentId, sessionId
4. **Image Storage**: Compress before upload
5. **Real-time Updates**: Use polling or WebSockets
