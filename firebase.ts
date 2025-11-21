
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
  onSnapshot,
  enableMultiTabIndexedDbPersistence
} from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBs_MbMSN6BCD1yrZ8SpCoa07DcZm2rmsM",
  authDomain: "quimeraai.firebaseapp.com",
  projectId: "quimeraai",
  storageBucket: "quimeraai.firebasestorage.app",
  messagingSenderId: "575386543550",
  appId: "1:575386543550:web:395114b8f43e810a7985ef",
  measurementId: "G-KQ26WWK4MD"
};

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
  onSnapshot
};

export type { User };
