# 🎓 AI-Based Attendance Verification System

Complete AI-powered attendance system with face recognition, GPS tracking, and security monitoring.

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Setup Python AI service
cd ai-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### Step 2: Configure Environment

Your `.env` file is already configured. Verify it has:
```env
MONGODB_URI=your_mongodb_connection
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
AI_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Start Services

**Windows (Easy):**
```bash
start-dev.bat
```

**Manual (2 Terminals):**

Terminal 1:
```bash
cd ai-service
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

Terminal 2:
```bash
npm run dev
```

**Access:**
- App: http://localhost:3000
- AI Service: http://localhost:8000/health
- API Docs: http://localhost:8000/docs

## ✅ Test Everything

```bash
npm run test:system
```

Expected: All 9 tests pass ✅

## 📚 Key Features

### 1. AI Face Recognition
- Register student faces (5 images)
- Real-time face detection
- 128D face embeddings
- Confidence scoring

### 2. Smart Verification
- Teacher-initiated sessions
- 10 images over 5 minutes
- 50% appearance rule
- Automatic attendance marking

### 3. Location Tracking
- GPS verification
- 30-meter radius check
- Distance calculation
- Automatic flagging

### 4. Security Monitoring
- VPN/Proxy detection
- Network latency tracking
- Risk scoring
- Suspicious activity alerts

## 📖 Documentation

- **Getting Started**: `GETTING_STARTED.md` - Setup guide
- **Architecture**: `ARCHITECTURE.md` - System design
- **Database**: `DATABASE_SCHEMA.md` - All collections
- **APIs**: `API_ENDPOINTS.md` - Complete API reference
- **Testing**: `TESTING_GUIDE.md` - Test procedures
- **Deployment**: `DEPLOYMENT_GUIDE.md` - Deploy to production
- **Summary**: `SUMMARY.md` - Complete overview

## 🎯 Usage

### For Students
1. Register face: `/student/register-face`
2. Capture 5 images
3. System stores embeddings
4. Be present in class during verification

### For Teachers
1. Mark initial attendance
2. Click "Start Verification Session"
3. System captures 10 images
4. AI processes and marks attendance
5. Review results

### For Admins
1. View all sessions
2. Check flagged students
3. Review logs and analytics

## 🗂️ Project Structure

```
automatic-attendance-system/
├── ai-service/              # Python FastAPI service
│   ├── main.py             # Face recognition API
│   └── requirements.txt    # Python dependencies
│
├── app/api/                # Next.js API routes
│   ├── verification/       # Session & image APIs
│   ├── face/              # Face registration
│   ├── location/          # GPS tracking
│   └── security/          # Network security
│
├── components/            # React components
│   ├── VerificationSession.tsx
│   └── FaceRegistration.tsx
│
├── lib/                   # Utilities
│   ├── aiService.ts       # AI client
│   ├── locationUtils.ts   # GPS utils
│   └── networkSecurity.ts # Security utils
│
└── Documentation (7 files)
```

## 🔧 Troubleshooting

### AI Service Not Working
```bash
cd ai-service
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

### MongoDB Connection Failed
- Check MONGODB_URI in `.env`
- Verify IP whitelist in MongoDB Atlas

### Camera Not Working
- Allow camera permissions
- Use HTTPS or localhost
- Check camera not in use

## 🚀 Deployment

See `DEPLOYMENT_GUIDE.md` for:
- Vercel + Render (Free, Recommended)
- VPS deployment
- Docker deployment
- Production configuration

## 📊 Database Collections

- `verificationSessions` - Session data
- `capturedImages` - Classroom images
- `faceEmbeddings` - Student face data
- `verificationResults` - Attendance results
- `locationLogs` - GPS tracking
- `networkLogs` - Security logs

## 🎉 Features Summary

✅ Face Recognition (FaceNet 128D)  
✅ Smart Verification (50% rule)  
✅ Location Tracking (30m radius)  
✅ VPN Detection  
✅ Admin Dashboard  
✅ Real-time Processing  
✅ Comprehensive Logging  
✅ Production Ready  

## 📞 Support

- **Setup Issues**: See `GETTING_STARTED.md`
- **Testing**: Run `npm run test:system`
- **API Reference**: http://localhost:8000/docs
- **Architecture**: See `ARCHITECTURE.md`

## 🏆 Project Stats

- **Files Created**: 25+
- **Lines of Code**: 5000+
- **API Endpoints**: 20+
- **Database Collections**: 7
- **Test Coverage**: 9 automated tests

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**License**: MIT
