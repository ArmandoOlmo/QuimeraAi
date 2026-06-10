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
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
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
  memoryLocalCache,
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
import { isDevelopmentHostname } from "./utils/subdomainUtils";

const configuredFirebaseProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const configuredAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const firebaseHostedAuthDomain = configuredFirebaseProjectId
  ? `${configuredFirebaseProjectId}.firebaseapp.com`
  : configuredAuthDomain;

// Custom app domains serve the SPA, so Firebase Auth's hidden iframe would load
// a second copy of Quimera inside mobile Safari/Chrome. Use Firebase Hosting's
// auth handler domain for SDK internals instead.
const authDomain = configuredAuthDomain === 'quimera.ai' || configuredAuthDomain === 'www.quimera.ai'
  ? firebaseHostedAuthDomain
  : configuredAuthDomain;

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain,
  projectId: configuredFirebaseProjectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const shouldEnableFirebaseAnalytics = (): boolean => {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname.toLowerCase().replace(/^www\./, '');
  if (isDevelopmentHostname(hostname)) return false;

  // Analytics/Installations are only valid on platform-owned app domains.
  // Custom client domains are served by the SPA but are not allowed Firebase
  // referrers, so initializing analytics there creates noisy 403s.
  return (
    hostname === 'quimera.ai' ||
    hostname.endsWith('.quimera.ai') ||
    hostname === 'quimera-ai.vercel.app' ||
    hostname.endsWith('.quimera-ai.vercel.app')
  );
};

// Validate that required configuration is present
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn('⚠️ Firebase configuration is incomplete. Check your environment variables.');
}

// Initialize Firebase App (lightweight, always needed)
export const app: FirebaseApp = initializeApp(firebaseConfig);

// Core services - initialized synchronously as they're needed immediately
export const auth = getAuth(app);
// Set persistence to localStorage so Playwright can properly capture the auth state
setPersistence(auth, browserLocalPersistence).catch(console.error);

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
// Wrapped in try/catch to handle the known b815/90f9 assertion error
// that occurs when IndexedDB state is corrupted or conflicting.
let db: ReturnType<typeof initializeFirestore>;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
      cacheSizeBytes: CACHE_SIZE_UNLIMITED
    })
  });
} catch (err: any) {
  console.warn(
    '⚠️ Firestore persistent cache failed, falling back to memory cache.',
    err?.message || err
  );
  // Fallback: use memory cache (no persistence)
  db = initializeFirestore(app, {
    localCache: memoryLocalCache()
  });

  // Attempt to clear corrupted IndexedDB so next reload gets persistence back
  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      const projectId = firebaseConfig.projectId || '';
      window.indexedDB.deleteDatabase(`firestore/[DEFAULT]/${projectId}/main`);
      console.info('🔄 Cleared Firestore IndexedDB cache. Persistence will resume on next load.');
    } catch (idbErr) {
      console.warn('Could not clear IndexedDB:', idbErr);
    }
  }
}
export { db };

// =============================================================================
// FIRESTORE ASSERTION ERROR RECOVERY (b815/90f9)
// The Firestore SDK v12.x has a known issue where corrupted IndexedDB state
// causes async "INTERNAL ASSERTION FAILED: Unexpected state" errors.
// This handler detects those, clears the corrupted cache, and reloads.
// =============================================================================
if (typeof window !== 'undefined') {
  let _firestoreRecoveryAttempted = false;

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const msg = String(event?.reason?.message || event?.reason || '');
    
    if (
      !_firestoreRecoveryAttempted &&
      msg.includes('INTERNAL ASSERTION FAILED') &&
      (msg.includes('b815') || msg.includes('90f9') || msg.includes('Unexpected state'))
    ) {
      _firestoreRecoveryAttempted = true;
      event.preventDefault(); // Suppress the unhandled rejection noise

      console.warn('🔧 Firestore IndexedDB corruption detected. Clearing cache and reloading…');

      // Clear the corrupted IndexedDB
      try {
        const projectId = firebaseConfig.projectId || '';
        window.indexedDB.deleteDatabase(`firestore/[DEFAULT]/${projectId}/main`);
      } catch (_) { /* best-effort */ }

      // Show a brief user-friendly message before reloading
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.95)';
      overlay.innerHTML = `
        <div style="text-align:center;color:#e2e8f0;font-family:system-ui,sans-serif">
          <div style="font-size:2rem;margin-bottom:0.5rem">🔄</div>
          <div style="font-size:1.1rem;font-weight:600;margin-bottom:0.25rem">Optimizing your experience…</div>
          <div style="font-size:0.85rem;opacity:0.7">The page will reload in a moment.</div>
        </div>
      `;
      document.body.appendChild(overlay);

      // Reload after a brief delay so the user sees the message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  });
}

// Lazy-loaded services cache
let _analytics: ReturnType<typeof import("firebase/analytics").getAnalytics> | null = null;

/**
 * Get Firebase Analytics instance (lazy-loaded)
 * Analytics is not critical for app functionality, so we defer its initialization
 */
export const getAnalyticsInstance = async () => {
  if (!_analytics && typeof window !== 'undefined') {
    try {
      if (!shouldEnableFirebaseAnalytics()) {
        return null;
      }

      const { getAnalytics, isSupported } = await import("firebase/analytics");
      const supported = await isSupported();
      if (supported && firebaseConfig.measurementId) {
        _analytics = getAnalytics(app);
      } else {
        console.warn("Firebase Analytics is not supported or measurementId is missing.");
      }
    } catch (e) {
      console.warn("Analytics initialization failed", e);
    }
  }
  return _analytics;
};



// Initialize Analytics after page load (non-blocking)
if (typeof window !== 'undefined' && shouldEnableFirebaseAnalytics()) {
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



export type { User };
