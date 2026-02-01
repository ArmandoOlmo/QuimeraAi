/**
 * Firebase Configuration
 * 
 * This module initializes Firebase with performance optimizations:
 * - Core services (auth, db, storage) are initialized synchronously for immediate use
 * - Analytics is lazy-loaded to reduce initial bundle impact
 * - Functions are lazy-loaded as they're rarely needed on startup
 */

import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";
import type { User } from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll
} from "firebase/storage";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  writeBatch,
  where,
  onSnapshot,
  startAfter,
  CACHE_SIZE_UNLIMITED,
  Timestamp,
  increment
} from "firebase/firestore";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate that required configuration is present
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn('⚠️ Firebase configuration is incomplete. Check your environment variables.');
}

// Initialize Firebase App (lightweight, always needed)
export const app: FirebaseApp = initializeApp(firebaseConfig);

// Core services - initialized synchronously as they're needed immediately
export const auth = getAuth(app);

// Storage is only available in browser environment (not in SSR/Node.js)
// Use getStorageInstance() for safe access in components that might run on server
let _storage: ReturnType<typeof getStorage> | null = null;
export const storage = typeof window !== 'undefined' ? getStorage(app) : (null as any);

/**
 * Get Firebase Storage instance safely (works in both client and server)
 * Returns null on server-side rendering
 */
export const getStorageInstance = () => {
    if (typeof window === 'undefined') return null;
    if (!_storage) {
        _storage = getStorage(app);
    }
    return _storage;
};

// Initialize Firestore with persistence built-in (modern approach)
// This replaces the deprecated enableMultiTabIndexedDbPersistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  })
});

// Lazy-loaded services cache
let _functions: ReturnType<typeof import("firebase/functions").getFunctions> | null = null;
let _analytics: ReturnType<typeof import("firebase/analytics").getAnalytics> | null = null;

/**
 * Get Firebase Functions instance (lazy-loaded)
 * Use this instead of direct import when functions are only occasionally needed
 */
export const getFunctionsInstance = async () => {
  if (!_functions) {
    const { getFunctions } = await import("firebase/functions");
    _functions = getFunctions(app);
  }
  return _functions;
};

/**
 * Get Firebase Analytics instance (lazy-loaded)
 * Analytics is not critical for app functionality, so we defer its initialization
 */
export const getAnalyticsInstance = async () => {
  if (!_analytics) {
    const { getAnalytics } = await import("firebase/analytics");
    _analytics = getAnalytics(app);
  }
  return _analytics;
};

// Backward compatibility: synchronous functions export (will be loaded on first use)
// For new code, prefer getFunctionsInstance() for better performance
export const functions = new Proxy({} as ReturnType<typeof import("firebase/functions").getFunctions>, {
  get: (_, prop) => {
    // Lazy initialize on first property access
    if (!_functions) {
      import("firebase/functions").then(({ getFunctions }) => {
        _functions = getFunctions(app);
      });
    }
    return _functions ? (_functions as any)[prop] : undefined;
  }
});

// Initialize Analytics after page load (non-blocking)
if (typeof window !== 'undefined') {
  // Use requestIdleCallback or setTimeout to defer analytics
  const initAnalytics = () => {
    getAnalyticsInstance().catch(console.warn);
  };
  
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(initAnalytics, { timeout: 5000 });
  } else {
    setTimeout(initAnalytics, 2000);
  }
}

// NOTE: Persistence is now configured in initializeFirestore above
// The deprecated enableMultiTabIndexedDbPersistence has been removed

// Re-export Auth methods
export {
  GoogleAuthProvider,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  onAuthStateChanged,
  // Storage
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  // Firestore
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  startAfter,
  writeBatch,
  Timestamp,
  increment
};

// Re-export Functions methods
export { httpsCallable } from 'firebase/functions';

export type { User };
