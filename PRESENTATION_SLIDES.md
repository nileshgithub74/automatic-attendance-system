# AI-Based Automatic Attendance System - Presentation Slides

## SLIDE 1 — TITLE SLIDE
**AI-Based Automatic Attendance System Using Face Recognition, GPS Validation, and Network Security Analysis**

Submitted by:
- Nilesh Kumar (12218065)
- Ankit Kumar (12314367)
- Raj Kumar Sharma (12222255)
- Krunal (12213978)
- Agam Singh (12314581)

Under the Guidance of: Dr. Puneet Thapar
School of Computer Science and Engineering
Lovely Professional University, Punjab

---

## SLIDE 2 — PROBLEM STATEMENT
**Challenges with Existing Attendance Systems**

- Manual roll calls waste 8-12 minutes per class session
- Single-layer biometric systems prone to spoofing attacks
- No location verification - students can mark remotely via VPN
- Proxy attendance cannot be detected or prevented
- No independent verification of physical classroom presence
- Parents lack real-time visibility of attendance status
- No audit trail for dispute resolution
- Existing systems fail to prevent advanced fraud mechanisms

**Gap:** Current systems solve identification but not fraud prevention

---

## SLIDE 3 — PROPOSED SOLUTION
**Multi-Layer Verification System**

**Layer 1: Face Recognition**
- Real-time browser-based identification using face-api.js
- BlazeFace model with 128-dimensional embeddings
- 96.3% accuracy, completes in 2.1 seconds

**Layer 2: GPS Validation**
- Haversine formula calculates distance to classroom
- 100-meter radius boundary verification
- 98.2% success rate for on-campus students

**Layer 3: Network Security Analysis**
- IPQualityScore API detects VPN/Proxy/Tor usage
- Risk scoring with 89.3% detection accuracy
- Prevents location spoofing attempts

**Layer 4: AI Teacher Verification**
- Independent classroom verification using external camera
- TensorFlow.js processes images every 10 seconds
- 93.7% agreement with actual presence

---

## SLIDE 4 — SYSTEM ARCHITECTURE
**Three-Tier Serverless Architecture**

**Presentation Layer:**
- Next.js 15 + React + TypeScript + Tailwind CSS
- Role-based dashboards: Student, Teacher, Admin, Parent
- Real-time data synchronization

**Application Layer:**
- Next.js API Routes (Serverless Functions)
- Clerk.js Authentication (JWT + RBAC)
- Face Recognition, GPS Validation, Network Security, AI Verification Services
- Multi-Layer Comparator for final decision

**Data Layer:**
- MongoDB Atlas: Structured data (users, attendance, logs)
- Cloudinary: Biometric images with CDN distribution
- Complete audit trail with 99.9% integrity

---

## SLIDE 5 — TECHNOLOGY STACK

**Frontend:** Next.js 15, React, TypeScript, Tailwind CSS
**Authentication:** Clerk.js (JWT + Role-Based Access Control)
**Database:** MongoDB Atlas (Cloud NoSQL)
**Image Storage:** Cloudinary (CDN + Auto-optimization)
**AI/ML:** face-api.js, TensorFlow.js, BlazeFace Model
**APIs:** IPQualityScore (Network Security), Geolocation API
**Deployment:** Vercel (Serverless + Edge Functions)

**Four User Roles:**
Student | Teacher | Admin | Parent

---

## SLIDE 6 — STUDENT ATTENDANCE FLOW
**10-Step Verification Process**

1. Student logs in via Clerk.js authentication
2. Camera permission granted, face detection starts
3. GPS coordinates captured via Geolocation API
4. Face recognized in 2.1 seconds (average)
5. Green banner displays: Name, Roll Number, Class (5 seconds)
6. GPS validation: Distance calculated using Haversine formula
7. Network security: VPN/Proxy/Tor detection via IPQualityScore
8. Multi-layer comparator validates all results
9. Face image uploaded to Cloudinary, metadata to MongoDB
10. Real-time notification sent to parent dashboard

**Fraud Prevention:** If any layer fails, attendance is flagged for manual review

---

## SLIDE 7 — AI TEACHER VERIFICATION
**Independent Classroom Verification**

**Session Setup:**
- Teacher selects class and session duration
- External camera captures images every 10 seconds
- Images uploaded to Cloudinary session folder

**AI Processing Pipeline:**
1. Fetch all session images from Cloudinary
2. Detect faces using TensorFlow.js + BlazeFace
3. Extract 128-dimensional face embeddings
4. Match against registered student profiles
5. Calculate confidence scores per student

**Decision Logic:**
- Detected in ≥30% images + ≥70% confidence = PRESENT
- Otherwise = ABSENT

**Result:** 93.7% agreement with actual classroom presence

---

## SLIDE 8 — DATABASE DESIGN
**MongoDB Atlas Schema**

**Collections:**
- **USERS:** Authentication, roles, face descriptors, Cloudinary URLs
- **ATTENDANCE:** Records with verification method, GPS, network data, AI status
- **CLASSES:** Class info, teacher assignments, student enrollment
- **LOCATION_LOGS:** GPS coordinates, distance, radius validation
- **NETWORK_LOGS:** IP address, VPN/Proxy detection, risk scores
- **VERIFICATION_SESSIONS:** AI session data, detected students, confidence scores

**Relationships:**
- 1:N (USER → ATTENDANCE)
- N:1 (ATTENDANCE → CLASS)
- 1:1 (ATTENDANCE → LOCATION_LOG, NETWORK_LOG)

---

## SLIDE 9 — RESULTS & PERFORMANCE

**System Performance Metrics:**
- Overall verification accuracy: 96.3%
- Fraud detection rate: 94.6% improvement over single-layer systems
- Average attendance marking time: 2.1 seconds
- AI teacher verification accuracy: 93.7%
- GPS validation success rate: 98.2%
- VPN/Proxy detection accuracy: 89.3%
- Audit trail integrity: 99.9%

**User Satisfaction (150 surveys):**
- Students: 4.2/5
- Teachers: 4.5/5
- Administrators: 4.6/5
- Parents: 4.3/5

**Time Savings:** 8-12 minutes per class (manual) → 2.1 seconds (automated)

---

## SLIDE 10 — CONCLUSION & FUTURE SCOPE

**Conclusion:**
- First production-ready multi-layer attendance verification system
- 94.6% fraud detection improvement over existing systems
- Complete audit trail with biometric evidence
- Real-time stakeholder visibility
- Cloud-based deployment with $12/year operational cost

**Future Enhancements:**

**Short-Term (0-6 months):**
- SMS/WhatsApp notifications via Twilio API
- Bluetooth beacon indoor positioning
- Progressive Web App for offline capability

**Long-Term (6-24 months):**
- Blockchain integration for immutable records
- Government portal integration (UDISE+, Shala Darpan)
- Multi-modal biometrics with voice recognition
- Federated learning for privacy-preserving model training
- Deepfake detection with pulse monitoring

---

## SLIDE 11 — THANK YOU



**Team Members:**
Nilesh Kumar (12218065), Ankit Kumar (12314367), Raj Kumar Sharma (12222255), Krunal (12213978), Agam Singh (12314581)

**Supervisor:**
Dr. Arshiya Pathania
Associate Professor
School of Computer Science and Engineering
Lovely Professional University, Punjab

**Questions?**

---

*This presentation covers the complete AI-Based Automatic Attendance System with multi-layer verification, comprehensive technical implementation, and future enhancement roadmap.*