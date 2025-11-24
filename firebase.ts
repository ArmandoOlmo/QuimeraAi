
import { initializeApp } from "firebase/app";
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
import { getAnalytics } from "firebase/analytics";
import { 
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll
} from "firebase/storage";
import { 
  getFirestore,
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
  enableMultiTabIndexedDbPersistence
} from "firebase/firestore";

// Firebase configuration from environment variables
// Fallback values are provided for development only - use .env.local in production
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBs_MbMSN6BCD1yrZ8SpCoa07DcZm2rmsM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "quimeraai.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "quimeraai",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "quimeraai.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "575386543550",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:575386543550:web:395114b8f43e810a7985ef",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-KQ26WWK4MD"
};

// Validate that required configuration is present
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn('⚠️ Firebase configuration is incomplete. Check your environment variables.');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);

// Enable Offline Persistence
try {
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Persistence failed: Multiple tabs open.');
        } else if (err.code === 'unimplemented') {
            console.warn('Persistence failed: Browser not supported.');
        }
    });
} catch (e) {
    console.warn("Persistence initialization error:", e);
}

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
  onSnapshot
};

export type { User };
