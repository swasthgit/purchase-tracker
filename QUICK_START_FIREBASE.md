# 🚀 Quick Start: Connect to Firebase

## If You Already Have a Service Account Key

Follow these steps to connect your project to Firebase in under 5 minutes.

---

## 📦 What You Need

1. ✅ Firebase Service Account Key JSON file (you mentioned you have this)
2. ✅ Firebase Web App credentials (from Firebase Console)

---

## 🎯 Quick Setup (2 Methods)

### **Method 1: Simple File-Based (Fastest for Testing)**

#### **Step 1: Place Your Service Account Key**

```bash
# Create config directory
mkdir -p config

# Move your service account key file there
# (Replace with your actual file path)
cp ~/Downloads/your-project-firebase-adminsdk-xxxxx.json config/serviceAccountKey.json
```

#### **Step 2: Create `.env.local` file**

```bash
# Copy the example
cp .env.example .env.local
```

#### **Step 3: Edit `.env.local` and fill in these values**

Open `.env.local` in your editor and add:

```env
# ========================================
# CLIENT-SIDE (Get from Firebase Console)
# ========================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# ========================================
# SERVER-SIDE (Using JSON file)
# ========================================
FIREBASE_SERVICE_ACCOUNT_PATH=./config/serviceAccountKey.json
```

#### **Step 4: Get Client-Side Credentials**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click ⚙️ **Settings** → **Project Settings**
4. Scroll to **Your apps** section
5. Click **Web app** `</>` (or create one)
6. Copy the config values into `.env.local`

#### **Step 5: Restart Server**

```bash
npm run dev
```

**Done! ✅** Your app is now connected to Firebase.

---

### **Method 2: Environment Variables (Production-Ready)**

Use this for Vercel, Docker, or production deployments.

#### **Step 1: Extract Values from Service Account Key**

Open your `serviceAccountKey.json` and find these values:

```json
{
  "project_id": "your-project-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
}
```

#### **Step 2: Create `.env.local`**

```bash
cp .env.example .env.local
```

#### **Step 3: Fill in `.env.local`**

```env
# ========================================
# CLIENT-SIDE CONFIGURATION
# ========================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# ========================================
# SERVER-SIDE CONFIGURATION
# ========================================
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIB...FULL-KEY-HERE...\n-----END PRIVATE KEY-----\n"
```

**⚠️ Important for Private Key:**
- Must be wrapped in double quotes `""`
- Keep all `\n` characters (they represent newlines)
- Include `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Copy the ENTIRE key including newlines

#### **Step 4: Restart Server**

```bash
npm run dev
```

---

## 🧪 Test Your Connection

### **Quick Test Page:**

Visit: http://localhost:9002/test-firebase

Or create this test file:

```typescript
// src/app/test-firebase/page.tsx
"use client";
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export default function TestFirebase() {
  const [status, setStatus] = useState('Testing connection...');

  useEffect(() => {
    async function test() {
      try {
        await getDocs(collection(db, 'dc_requests'));
        setStatus('✅ Firebase Connected!');
      } catch (error: any) {
        setStatus(`❌ Error: ${error.message}`);
      }
    }
    test();
  }, []);

  return <div className="p-10 text-2xl">{status}</div>;
}
```

---

## 📊 Seed Test Data

Once connected, populate your database:

1. **Visit:** http://localhost:9002/seed-data
2. **Click:** "Seed Test Data" button
3. **Wait:** A few seconds for 25 requests to be created
4. **Test:** All dashboards now have realistic data!

---

## 🔐 Security Checklist

Make sure these files are in `.gitignore`:

```bash
# Check your .gitignore includes:
.env.local
.env
config/serviceAccountKey.json
serviceAccountKey*.json
*-firebase-adminsdk-*.json
```

**Never commit:**
- ❌ `.env.local` file
- ❌ Service account JSON files
- ❌ API keys or secrets

---

## 🆘 Troubleshooting

### **"Missing or insufficient permissions"**

**Solution:**
1. Go to Firebase Console
2. **Firestore Database** → **Rules**
3. For testing, use these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write for testing
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ Warning:** These rules allow anyone to read/write. For production, use proper security rules.

### **"Firebase: Error (auth/invalid-api-key)"**

**Solution:**
- Double-check your `NEXT_PUBLIC_FIREBASE_API_KEY` in `.env.local`
- Make sure you copied the correct API key from Firebase Console
- Restart your dev server

### **"Cannot find module './config/serviceAccountKey.json'"**

**Solution:**
- Make sure the file exists at `config/serviceAccountKey.json`
- Check the path in `.env.local` matches: `FIREBASE_SERVICE_ACCOUNT_PATH=./config/serviceAccountKey.json`
- Try absolute path: `FIREBASE_SERVICE_ACCOUNT_PATH=/workspaces/purchase-tracker/config/serviceAccountKey.json`

### **"Error parsing private key"**

**Solution:**
- Make sure the entire private key is wrapped in double quotes
- Keep all `\n` characters in the key
- Don't add extra spaces or newlines
- The key should look like: `"-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n"`

---

## 🎯 Next Steps

After successful connection:

1. ✅ **Seed Data:** http://localhost:9002/seed-data
2. ✅ **Test DC Dashboard:** http://localhost:9002/requests
3. ✅ **Test QA Dashboard:** http://localhost:9002/qa-dashboard
4. ✅ **Test Finance:** http://localhost:9002/finance-dashboard
5. ✅ **Test Procurement:** http://localhost:9002/procurement-dashboard
6. ✅ **Test Admin:** http://localhost:9002/manager-dashboard

---

## 📚 Full Documentation

For more details, see: **FIREBASE_SETUP.md**

---

**Need help? Check the troubleshooting section or see the full Firebase setup guide.**
