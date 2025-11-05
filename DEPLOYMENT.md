# 🚀 Deployment Guide - Purchase Tracker

This guide explains how to deploy the Purchase Tracker application to a separate URL while using the same Firebase database.

## ⚠️ Important Notice

This Next.js application uses **Server Actions** which require a Node.js server runtime. This means:
- ❌ **Static Export to Firebase Hosting alone will NOT work**
- ✅ **Vercel deployment** (recommended - built by Next.js creators)
- ✅ **Firebase Hosting + Cloud Functions** (requires code modifications)
- ✅ **Other platforms**: Railway, Render, Fly.io, etc.

---

## 🎯 Recommended Approach: Deploy to Vercel

Vercel natively supports Next.js Server Actions and is the easiest option.

### Step 1: Prepare Your Project

Your project is already configured to use the same Firebase database. The Firebase credentials are in your environment variables.

### Step 2: Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Follow the prompts:
# - Set up and deploy: Yes
# - Which scope: Select your account
# - Link to existing project: No
# - Project name: purchase-tracker-dc (or any name)
# - Directory: ./ (current directory)
# - Override settings: No
```

#### Option B: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your Git repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Add Environment Variables (copy from your local `.env.local`):
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   NEXT_PUBLIC_ADMIN_USERNAME=mswasth
   NEXT_PUBLIC_ADMIN_PASSWORD=mswasth
   NEXT_PUBLIC_INVENTORY_ADMIN_USERNAME=tracker321
   NEXT_PUBLIC_INVENTORY_ADMIN_PASSWORD=321tracker
   ```
6. Click "Deploy"

**Your app will be live at**: `https://your-project-name.vercel.app`

### Step 3: Custom Domain (Optional)

In Vercel Dashboard:
1. Go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

---

## 🔧 Alternative: Firebase Hosting with Static Export

⚠️ **This requires removing Server Actions and converting to client-side Firebase SDK**

### Prerequisites

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login
```

### Step 1: Update Next.js Config

Update `next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Enable static export
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  trailingSlash: true, // Better compatibility with Firebase Hosting
};

export default nextConfig;
```

### Step 2: Remove Server Actions

You'll need to modify the codebase:

1. **Remove `src/lib/actions.ts`** (Server Actions)
2. **Update `src/components/purchase-form.tsx`** to use client-side Firebase:

```typescript
// Instead of:
import { submitPurchase } from '@/lib/actions';

// Use direct Firebase calls:
import { addDoc, collection } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const onSubmit = async (data: PurchaseFormValues) => {
  // Upload files directly
  const uploadedFileMetas = [];
  for (const file of data.uploadedFiles) {
    const fileRef = ref(storage, `purchase_documents/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    uploadedFileMetas.push({ name: file.name, url, type: file.type, size: file.size });
  }

  // Save to Firestore
  await addDoc(collection(db, 'purchases'), {
    ...data,
    uploadedFiles: uploadedFileMetas,
    createdAt: new Date(),
  });
};
```

3. Apply similar changes to all admin components

### Step 3: Configure Firebase Project

```bash
# Initialize Firebase (if not done)
firebase init hosting

# Select your Firebase project
# Choose 'out' as public directory
# Configure as single-page app: Yes
# Don't overwrite index.html
```

Update `.firebaserc`:

```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

Update `firebase.json`:

```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Step 4: Build and Deploy

```bash
# Build the static export
npm run build
npx next export

# Deploy to Firebase
firebase deploy --only hosting

# Or create a new hosting site
firebase hosting:sites:create your-site-name
firebase target:apply hosting production your-site-name
firebase deploy --only hosting:production
```

**Your app will be live at**: `https://your-site-name.web.app`

---

## 🌐 Multiple Hosting Sites on Same Firebase Project

To have multiple URLs using the same database:

```bash
# Create additional hosting sites
firebase hosting:sites:create dc-portal
firebase hosting:sites:create admin-portal

# Update firebase.json for multiple sites
```

**firebase.json** with multiple sites:

```json
{
  "hosting": [
    {
      "target": "main",
      "public": "out",
      "rewrites": [{"source": "**", "destination": "/index.html"}]
    },
    {
      "target": "dc-portal",
      "public": "out",
      "rewrites": [{"source": "**", "destination": "/index.html"}]
    }
  ]
}
```

Deploy specific site:

```bash
firebase deploy --only hosting:dc-portal
```

---

## 📝 Environment Variables

Create `.env.local` (if not exists):

```env
# Firebase Configuration (Same database)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Admin Credentials
NEXT_PUBLIC_ADMIN_USERNAME=mswasth
NEXT_PUBLIC_ADMIN_PASSWORD=mswasth
NEXT_PUBLIC_INVENTORY_ADMIN_USERNAME=tracker321
NEXT_PUBLIC_INVENTORY_ADMIN_PASSWORD=321tracker
```

---

## ✅ Quick Commands Reference

### Vercel Deployment
```bash
vercel                    # Deploy to preview
vercel --prod            # Deploy to production
vercel env add           # Add environment variables
```

### Firebase Hosting (Static)
```bash
npm run build            # Build Next.js
npx next export          # Export to static files
firebase deploy          # Deploy to Firebase
```

### Local Testing
```bash
npm run dev              # Development server (port 9002)
npm run build            # Production build
npm run start            # Start production server
```

---

## 🎯 Recommendation

For your use case (DC portal with same database):

**Best Option**: Deploy to **Vercel**
- ✅ No code changes needed
- ✅ Server Actions work out of the box
- ✅ Automatic deployments from Git
- ✅ Free for personal projects
- ✅ Custom domains supported
- ✅ Environment variables management

The app will use the same Firebase database (via environment variables), but be accessible from a different URL.

---

## 🆘 Need Help?

- **Vercel Issues**: [vercel.com/docs](https://vercel.com/docs)
- **Firebase Issues**: [firebase.google.com/docs](https://firebase.google.com/docs/hosting)
- **Next.js Issues**: [nextjs.org/docs](https://nextjs.org/docs)

---

**Last Updated**: November 2025
