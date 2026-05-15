# System Architecture Diagram - AI-Based Automatic Attendance System

## Main System Architecture Flow

```
┌──────────────┐
│              │
│   STUDENT    │◄──────────────────────────────────────────────────────────┐
│              │                                                            │
└──────┬───────┘                                                            │
       │                                                                    │
       │ Face Image + GPS + Network Data                                   │
       │                                                                    │
       ▼                                                                    │
┌──────────────────┐         ┌─────────────────────┐                      │
│                  │         │                     │                      │
│  Next.js         │◄───────►│  Face Recognition   │                      │
│  Frontend        │         │  Service            │                      │
│  (React + TS)    │         │  (face-api.js)      │                      │
│                  │         │                     │                      │
└────────┬─────────┘         └─────────────────────┘                      │
         │                                                                 │
         │ Attendance Request                                             │
         │                                                                 │
         ▼                                                                 │
┌──────────────────┐         ┌─────────────────────┐                      │
│                  │         │                     │                      │
│  Next.js API     │◄───────►│  GPS Validation     │                      │
│  Routes          │         │  Service            │                      │
│  (Backend)       │         │  (Haversine)        │                      │
│                  │         │                     │                      │
└────────┬─────────┘         └─────────────────────┘                      │
         │                                                                 │
         │ Verification Data                                              │
         │                                                                 │
         ▼                                                                 │
┌──────────────────┐         ┌─────────────────────┐                      │
│                  │         │                     │                      │
│  Multi-Layer     │◄───────►│  Network Security   │                      │
│  Verification    │         │  Analysis Service   │                      │
│  Comparator      │         │  (IP Intelligence)  │                      │
│                  │         │                     │                      │
└────────┬─────────┘         └─────────────────────┘                      │
         │                                                                 │
         │ Store Evidence                                                 │
         │                                                                 │
         ▼                                                                 │
┌──────────────────┐         ┌─────────────────────┐                      │
│                  │         │                     │                      │
│  Cloudinary      │         │  MongoDB Atlas      │                      │
│  Image Storage   │         │  Database           │                      │
│                  │         │                     │                      │
└──────────────────┘         └──────────┬──────────┘                      │
                                        │                                 │
                                        │ Attendance Confirmation         │
                                        │                                 │
                                        └─────────────────────────────────┘


┌──────────────┐
│              │
│   TEACHER    │
│              │
└──────┬───────┘
       │
       │ Start AI Verification
       │
       ▼
┌──────────────────┐         ┌─────────────────────┐
│                  │         │                     │
│  Teacher         │◄───────►│  External Camera    │
│  Dashboard       │         │  Hardware           │
│                  │         │                     │
└────────┬─────────┘         └─────────────────────┘
         │                            │
         │                            │ Capture Images
         │                            │
         ▼                            ▼
┌──────────────────┐         ┌─────────────────────┐
│                  │         │                     │
│  AI Verification │◄───────►│  Cloudinary         │
│  Pipeline        │         │  Session Storage    │
│  (TensorFlow.js) │         │                     │
│                  │         │                     │
└────────┬─────────┘         └─────────────────────┘
         │
         │ Update Attendance
         │
         ▼
┌──────────────────┐
│                  │
│  MongoDB Atlas   │
│  Database        │
│                  │
└──────────────────┘
```

## Detailed Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                                │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Student    │  │   Teacher    │  │    Admin     │  │   Parent   │ │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │  │  Dashboard │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                          │
│  Next.js 15 + React + TypeScript + Tailwind CSS                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS/TLS 1.3
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                                 │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Clerk.js Auth Middleware                       │  │
│  │              (JWT Tokens + Role-Based Access Control)            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │     Face     │  │     GPS      │  │   Network    │  │     AI     │ │
│  │ Recognition  │  │  Validation  │  │   Security   │  │Verification│ │
│  │   Service    │  │   Service    │  │   Service    │  │  Pipeline  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Multi-Layer Verification Comparator                  │  │
│  │         (Validates Face + GPS + Network + AI Results)            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Next.js API Routes (Serverless Functions)                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Secure Connections
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                     │
│                                                                          │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐   │
│  │      MongoDB Atlas           │  │       Cloudinary             │   │
│  │                              │  │                              │   │
│  │  • users                     │  │  • face-registrations/       │   │
│  │  • attendance                │  │  • attendance-captures/      │   │
│  │  • location_logs             │  │  • verification-sessions/    │   │
│  │  • network_logs              │  │                              │   │
│  │  • verification_sessions     │  │  (Biometric Evidence)        │   │
│  │                              │  │                              │   │
│  │  (Structured Data)           │  │  (Image Storage)             │   │
│  └──────────────────────────────┘  └──────────────────────────────┘   │
│                                                                          │
│  Cloud-Based Storage with Encryption & Backup                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Student Attendance Flow Diagram

```
     ┌──────────┐
     │ STUDENT  │
     └────┬─────┘
          │
          │ 1. Login (Clerk.js)
          │
          ▼
     ┌──────────────────┐
     │ Authentication   │
     │ Verification     │
     └────┬─────────────┘
          │
          │ 2. Request Camera
          │
          ▼
     ┌──────────────────┐         ┌─────────────────┐
     │ Browser Camera   │────────►│  face-api.js    │
     │ Activation       │         │  Face Detection │
     └────┬─────────────┘         └────┬────────────┘
          │                            │
          │ 3. Capture Frame           │ 4. Identify Student
          │                            │
          ▼                            ▼
     ┌──────────────────┐         ┌─────────────────┐
     │ GPS Geolocation  │         │ Face Match      │
     │ API Call         │         │ Confirmation    │
     └────┬─────────────┘         └────┬────────────┘
          │                            │
          │ 5. Calculate Distance      │ 6. Display Info
          │                            │
          ▼                            ▼
     ┌──────────────────┐         ┌─────────────────┐
     │ Haversine        │         │ Green Banner    │
     │ Formula Check    │         │ (5 seconds)     │
     └────┬─────────────┘         └────┬────────────┘
          │                            │
          │ 7. Network Security        │
          │                            │
          ▼                            ▼
     ┌──────────────────┐         ┌─────────────────┐
     │ IP Threat        │────────►│ Multi-Layer     │
     │ Intelligence     │         │ Verification    │
     └────┬─────────────┘         └────┬────────────┘
          │                            │
          │ 8. Upload Evidence         │ 9. All Checks Pass
          │                            │
          ▼                            ▼
     ┌──────────────────┐         ┌─────────────────┐
     │ Cloudinary       │         │ MongoDB Atlas   │
     │ Image Upload     │         │ Save Record     │
     └────┬─────────────┘         └────┬────────────┘
          │                            │
          │                            │ 10. Confirmation
          │                            │
          └────────────┬───────────────┘
                       │
                       ▼
                  ┌──────────┐
                  │ STUDENT  │
                  │Dashboard │
                  │ Updated  │
                  └──────────┘
```

## Teacher AI Verification Flow Diagram

```
     ┌──────────┐
     │ TEACHER  │
     └────┬─────┘
          │
          │ 1. Start Session
          │
          ▼
     ┌──────────────────┐
     │ Session Setup    │
     │ (Class, Duration)│
     └────┬─────────────┘
          │
          │ 2. Connect Camera
          │
          ▼
     ┌──────────────────┐         ┌─────────────────┐
     │ External Camera  │────────►│ Capture Image   │
     │ Hardware         │         │ Every 10 sec    │
     └──────────────────┘         └────┬────────────┘
                                       │
                                       │ 3. Upload to Cloud
                                       │
                                       ▼
                                  ┌─────────────────┐
                                  │ Cloudinary      │
                                  │ Session Folder  │
                                  └────┬────────────┘
                                       │
                                       │ 4. Session Complete
                                       │
                                       ▼
                                  ┌─────────────────┐
                                  │ AI Processing   │
                                  │ Pipeline Start  │
                                  └────┬────────────┘
                                       │
                                       │ 5. Retrieve Images
                                       │
                                       ▼
     ┌──────────────────┐         ┌─────────────────┐
     │ TensorFlow.js    │────────►│ Face Detection  │
     │ BlazeFace Model  │         │ in Each Image   │
     └──────────────────┘         └────┬────────────┘
                                       │
                                       │ 6. Match Faces
                                       │
                                       ▼
     ┌──────────────────┐         ┌─────────────────┐
     │ Student Face     │────────►│ Calculate       │
     │ Embeddings DB    │         │ Confidence      │
     └──────────────────┘         └────┬────────────┘
                                       │
                                       │ 7. Decision Logic
                                       │
                                       ▼
                                  ┌─────────────────┐
                                  │ ≥30% images +   │
                                  │ ≥70% confidence │
                                  │ = PRESENT       │
                                  └────┬────────────┘
                                       │
                                       │ 8. Update Records
                                       │
                                       ▼
                                  ┌─────────────────┐
                                  │ MongoDB Atlas   │
                                  │ Update with AI  │
                                  │ Verification    │
                                  └────┬────────────┘
                                       │
                                       │ 9. Show Results
                                       │
                                       ▼
                                  ┌──────────┐
                                  │ TEACHER  │
                                  │Dashboard │
                                  │ Results  │
                                  └──────────┘
```

## References Format

Here are your references formatted properly:

**REFERENCES**

[1] Daugman, J. (1993). High confidence visual recognition of persons by a test of statistical independence. *IEEE Transactions on Pattern Analysis and Machine Intelligence*, 15(11), 1148–1161.

[2] Harle, R. (2013). A survey of indoor inertial positioning systems for pedestrians. *IEEE Communications Surveys & Tutorials*, 15(3), 1281–1293.

[3] Jain, A. K., Ross, A. A., & Nandakumar, K. (2011). *Introduction to Biometrics*. Springer Science & Business Media.

[4] Schroff, F., Kalenichenko, D., & Philbin, J. (2015). FaceNet: A unified embedding for face recognition and clustering. In *Proceedings of CVPR 2015*, 815–823.

[5] Bazarevsky, V., Kartynnik, Y., Vakunov, A., Raveendran, K., & Grundmann, M. (2019). BlazeFace: Sub-millisecond neural face detection on mobile GPUs. *arXiv preprint arXiv:1907.05047*.

[6] OWASP Foundation. (2023). *OWASP Top Ten Web Application Security Risks*. Retrieved from https://owasp.org/Top10/

[7] IPQualityScore. (2024). *IP Address Reputation & Proxy Detection API Documentation*. Retrieved from https://www.ipqualityscore.com/documentation

[8] MongoDB, Inc. (2024). *MongoDB Atlas Documentation*. Retrieved from https://www.mongodb.com/docs/atlas/

[9] Cloudinary Ltd. (2024). *Cloudinary Developer Documentation*. Retrieved from https://cloudinary.com/documentation

[10] Vercel Inc. (2024). *Deploying Next.js on Vercel*. Retrieved from https://vercel.com/docs/frameworks/nextjs

[11] Clerk, Inc. (2024). *Clerk Authentication and User Management Documentation*. Retrieved from https://clerk.com/docs

[12] Vinayak, A. S., & Bharadi, V. A. (2020). A review of face recognition systems for attendance management. *International Journal of Advanced Computer Science and Applications*, 11(3), 122–131.

---

**Note:** These diagrams show the complete system architecture similar to the healthcare example you provided, adapted for your AI-Based Automatic Attendance System with all the multi-layer verification components clearly illustrated.