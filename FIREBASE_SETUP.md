# 🔥 Firebase Configuration Guide

## Complete Guide to Connect Your Next.js Project to Firebase

This guide covers both **client-side** (browser) and **server-side** (Node.js) Firebase configurations.

---

## 📋 Prerequisites

You need the following from your Firebase Console:

1. **Firebase Web App Configuration** (for client-side)
   - API Key, Auth Domain, Project ID, etc.

2. **Service Account Key** (for server-side)
   - JSON file downloaded from Firebase Console

---

## 🎯 Part 1: Get Your Firebase Credentials

### **Step 1: Client-Side Credentials (Web App)**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the **Gear icon** ⚙️ → **Project Settings**
4. Scroll down to **Your apps** section
5. Click on **Web app** icon `</>` (or add a new web app)
6. Copy the `firebaseConfig` object values:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
  measurementId: "G-XXXXXXXXXX"
};
```

### **Step 2: Server-Side Credentials (Service Account)**

1. In Firebase Console, go to **Project Settings** ⚙️
2. Navigate to **Service Accounts** tab
3. Click **Generate New Private Key**
4. Download the JSON file (e.g., `serviceAccountKey.json`)
5. **IMPORTANT:** This file contains sensitive credentials!

---

## 🔧 Part 2: Configure Your Project

### **Method A: Using Client-Side Only (Current Setup)**

This is what your project currently uses. Good for:
- Client-side operations
- Basic CRUD operations
- File uploads from browser

#### **Step 1: Create `.env.local` file**

In your project root, create `.env.local`:

```bash
# Copy from .env.example
cp .env.example .env.local
```

#### **Step 2: Fill in your Firebase credentials**

Edit `.env.local`:

```env
# Firebase Client Configuration (from Step 1 above)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Admin Panel Credentials
NEXT_PUBLIC_ADMIN_USERNAME=mswasth
NEXT_PUBLIC_ADMIN_PASSWORD=mswasth

# Inventory Admin Credentials
NEXT_PUBLIC_INVENTORY_ADMIN_USERNAME=tracker321
NEXT_PUBLIC_INVENTORY_ADMIN_PASSWORD=321tracker
```

#### **Step 3: Restart your dev server**

```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

**That's it! Your client-side Firebase is connected.** ✅

---

### **Method B: Using Server-Side Admin SDK (Advanced)**

Use this if you need:
- Server-side operations
- Admin privileges
- Secure server actions
- Email notifications
- Advanced security rules

#### **Step 1: Place your Service Account Key**

**Option 1: Store as JSON file (Not recommended for production)**

```bash
# Create a secure directory
mkdir -p config

# Move your service account key there
mv ~/Downloads/serviceAccountKey.json config/serviceAccountKey.json

# Add to .gitignore
echo "config/serviceAccountKey.json" >> .gitignore
```

**Option 2: Store as environment variables (Recommended)**

Open your `serviceAccountKey.json` and copy its contents.

Add to `.env.local`:

```env
# Firebase Admin SDK (Server-side)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANB...your-private-key...\n-----END PRIVATE KEY-----\n"
```

**Important:** The private key must:
- Be wrapped in quotes
- Keep the `\n` characters (newlines)
- Include `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

#### **Step 2: Create Firebase Admin configuration**

The file `src/lib/firebase-admin.ts` will be created (see next section).

#### **Step 3: Update your environment variables**

Your complete `.env.local` should look like:

```env
# ========================================
# CLIENT-SIDE FIREBASE (Browser)
# ========================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# ========================================
# SERVER-SIDE FIREBASE ADMIN (Node.js)
# ========================================
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANB...your-full-private-key-here...\n-----END PRIVATE KEY-----\n"

# OR if using JSON file method:
FIREBASE_SERVICE_ACCOUNT_PATH=./config/serviceAccountKey.json

# ========================================
# APPLICATION CREDENTIALS
# ========================================
NEXT_PUBLIC_ADMIN_USERNAME=mswasth
NEXT_PUBLIC_ADMIN_PASSWORD=mswasth
NEXT_PUBLIC_INVENTORY_ADMIN_USERNAME=tracker321
NEXT_PUBLIC_INVENTORY_ADMIN_PASSWORD=321tracker
```

---

## 🔐 Security Best Practices

### **What to NEVER commit to Git:**

```bash
# Add to .gitignore
.env.local
.env
config/serviceAccountKey.json
firebase-debug.log
firestore-debug.log
```

### **For Production Deployment:**

#### **Vercel:**
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add all `NEXT_PUBLIC_*` variables
4. Add server-side variables (without `NEXT_PUBLIC_` prefix)

#### **Firebase Hosting:**
Use Firebase Functions environment config:
```bash
firebase functions:config:set firebase.project_id="your-project-id"
```

---

## ✅ Verification Steps

### **Test Client-Side Connection:**

Create a test file `src/app/test-firebase/page.tsx`:

```typescript
"use client";
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export default function TestFirebase() {
  const [status, setStatus] = useState('Testing...');

  useEffect(() => {
    async function testConnection() {
      try {
        const testCollection = collection(db, 'test');
        await getDocs(testCollection);
        setStatus('✅ Firebase Connected Successfully!');
      } catch (error) {
        setStatus(`❌ Error: ${error.message}`);
      }
    }
    testConnection();
  }, []);

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">Firebase Connection Test</h1>
      <p className="mt-4 text-lg">{status}</p>
    </div>
  );
}
```

Visit: `http://localhost:9002/test-firebase`

### **Test Server-Side Connection:**

If using Admin SDK, test with a server action.

---

## 🎯 Which Method Should You Use?

### **Use Client-Side Only (Method A) if:**
- ✅ Your current setup works fine
- ✅ You only need basic CRUD operations
- ✅ Users authenticate with Firebase Auth
- ✅ You use Firestore Security Rules

### **Add Server-Side Admin (Method B) if:**
- ✅ You need admin privileges
- ✅ You want to send emails/notifications
- ✅ You need to bypass security rules
- ✅ You want server-side data validation

---

## 📝 Current Project Status

Your project is **already configured for Client-Side Firebase** (Method A).

To get it working:
1. Create `.env.local` from `.env.example`
2. Fill in your Firebase credentials
3. Restart dev server
4. Test the connection

---

## 🆘 Troubleshooting

### **Error: "Firebase: Error (auth/invalid-api-key)"**
- Check your `NEXT_PUBLIC_FIREBASE_API_KEY` in `.env.local`
- Make sure it's the correct API key from Firebase Console

### **Error: "Firebase: Firebase App named '[DEFAULT]' already exists"**
- This is normal, the app is already initialized
- The code handles this with `getApps().length` check

### **Error: "Missing or insufficient permissions"**
- Check your Firestore Security Rules
- Make sure your rules allow read/write access

### **Private key error with Admin SDK:**
- Make sure the private key includes `\n` characters
- Wrap the entire key in double quotes
- Include BEGIN and END markers

---

## 📚 Next Steps

After connecting Firebase:
1. ✅ Visit `/seed-data` page to populate test data
2. ✅ Test all dashboards with dummy data
3. ✅ Configure Firestore Security Rules (see separate guide)
4. ✅ Set up Firebase Authentication (if needed)

---

Last Updated: November 2025
