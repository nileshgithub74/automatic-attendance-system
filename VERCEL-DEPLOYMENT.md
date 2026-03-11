# Vercel Deployment Guide

## Environment Variables for Vercel

Add these environment variables in your Vercel project settings:

### 1. Clerk Authentication
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZW5nYWdpbmctdmlwZXItMjMuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_Gs2yIIqIjnXH3YarXf06fT7RAaMkXOMoHZvN4REilc
```

### 2. MongoDB Database
```
MONGODB_URI=mongodb+srv://kumarnilesh843127_db_user:SfLofZWAKvvZnjNT@cluster0.prxuqin.mongodb.net/attendance_system?retryWrites=true&w=majority&appName=Cluster0
```

### 3. Principal Email
```
NEXT_PUBLIC_PRINCIPAL_EMAIL=kumarnilesh843127@gmail.com
```

### 4. App URL (Add after first deployment)
```
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
```

## Deployment Steps

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: `automatic-attendance-system` (if repo contains this folder) OR `./` (if repo root is the project)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### Step 3: Add Environment Variables

In Vercel project settings → Environment Variables, add all the variables listed above.

### Step 4: Deploy

Click "Deploy" and wait for the build to complete.

### Step 5: Update App URL

After deployment, copy your Vercel URL (e.g., `https://your-app.vercel.app`) and:
1. Add it as `NEXT_PUBLIC_APP_URL` environment variable in Vercel
2. Redeploy the project

### Step 6: Configure Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Add your Vercel URL to allowed domains:
   - Settings → Domains
   - Add: `https://your-app.vercel.app`

## Important Notes

- MongoDB connection errors during build are normal (database not needed for static build)
- The AI service is integrated into the app - no separate deployment needed
- All API routes will be available at `https://your-app.vercel.app/api/*`
- AI endpoints: `https://your-app.vercel.app/api/ai/*`

## Testing After Deployment

Test the AI service:
```bash
curl https://your-app.vercel.app/api/ai/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "AI Face Recognition",
  "version": "1.0.0"
}
```

## Troubleshooting

### Build Fails
- Check environment variables are set correctly
- Ensure MongoDB URI is properly formatted
- Check build logs for specific errors

### MongoDB Connection Issues
- Whitelist Vercel IPs in MongoDB Atlas (or allow all: 0.0.0.0/0)
- Verify connection string is correct
- Check MongoDB Atlas cluster is running

### Clerk Authentication Issues
- Verify Clerk keys are correct
- Add Vercel domain to Clerk allowed domains
- Check Clerk dashboard for any errors

## Security Recommendations

For production:
1. Use production Clerk keys (not test keys)
2. Restrict MongoDB IP whitelist
3. Enable MongoDB authentication
4. Use strong passwords
5. Enable HTTPS only
6. Set up proper CORS policies
