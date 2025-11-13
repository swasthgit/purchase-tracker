// src/lib/firebase-admin.ts
// Firebase Admin SDK for server-side operations
// This runs only on the server (Node.js), never in the browser

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

let adminApp: App;
let adminDb: Firestore;
let adminStorage: Storage;

/**
 * Initialize Firebase Admin SDK
 * This should only be called on the server side
 */
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    // Method 1: Using environment variables (RECOMMENDED for production)
    if (
      process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ) {
      console.log('🔥 Initializing Firebase Admin with environment variables...');

      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          // Replace literal \n with actual newlines
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        storageBucket: `${process.env.FIREBASE_ADMIN_PROJECT_ID}.appspot.com`,
      });

      console.log('✅ Firebase Admin initialized successfully');
    }
    // Method 2: Using service account JSON file
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      console.log('🔥 Initializing Firebase Admin with service account file...');

      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

      adminApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.appspot.com`,
      });

      console.log('✅ Firebase Admin initialized successfully');
    }
    // Method 3: Development fallback (uses Application Default Credentials)
    else {
      console.warn('⚠️ Firebase Admin credentials not found in environment variables.');
      console.warn('⚠️ Attempting to use Application Default Credentials...');

      // This will work if:
      // 1. Running on Google Cloud (uses service account automatically)
      // 2. GOOGLE_APPLICATION_CREDENTIALS env var is set
      // 3. gcloud CLI is configured
      try {
        adminApp = initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
        console.log('✅ Firebase Admin initialized with default credentials');
      } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin:', error);
        throw new Error(
          'Firebase Admin initialization failed. Please set up environment variables. See FIREBASE_SETUP.md for details.'
        );
      }
    }
  } else {
    adminApp = getApps()[0];
  }

  // Initialize Firestore and Storage
  adminDb = getFirestore(adminApp);
  adminStorage = getStorage(adminApp);

  // Configure Firestore settings
  adminDb.settings({
    ignoreUndefinedProperties: true,
  });

  return { adminApp, adminDb, adminStorage };
}

// Initialize on module load
try {
  const initialized = initializeFirebaseAdmin();
  adminApp = initialized.adminApp;
  adminDb = initialized.adminDb;
  adminStorage = initialized.adminStorage;
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

// Export instances
export { adminApp, adminDb, adminStorage };

// Export helper functions

/**
 * Get a Firestore document by ID
 */
export async function getDocumentById(collectionName: string, docId: string) {
  try {
    const docRef = adminDb.collection(collectionName).doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    };
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get all documents from a collection
 */
export async function getAllDocuments(collectionName: string) {
  try {
    const snapshot = await adminDb.collection(collectionName).get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Create a document
 */
export async function createDocument(collectionName: string, data: any) {
  try {
    const docRef = await adminDb.collection(collectionName).add({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      id: docRef.id,
      ...data,
    };
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Update a document
 */
export async function updateDocument(
  collectionName: string,
  docId: string,
  data: any
) {
  try {
    await adminDb
      .collection(collectionName)
      .doc(docId)
      .update({
        ...data,
        updatedAt: new Date(),
      });

    return {
      id: docId,
      ...data,
    };
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(collectionName: string, docId: string) {
  try {
    await adminDb.collection(collectionName).doc(docId).delete();
    return { success: true, id: docId };
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Batch write operations
 */
export function getBatch() {
  return adminDb.batch();
}

/**
 * Get Firebase Admin Storage bucket
 */
export function getStorageBucket() {
  return adminStorage.bucket();
}

/**
 * Check if Firebase Admin is initialized
 */
export function isAdminInitialized(): boolean {
  return getApps().length > 0;
}
