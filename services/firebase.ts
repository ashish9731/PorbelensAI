import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Use environment variables for Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB1-pdmfM3Pk2zSIvayI5x0b34LhSQU1MY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "resumeace-fa6d2.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "resumeace-fa6d2",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "resumeace-fa6d2.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "737330398575",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:737330398575:web:2facfc444fdc03479e549a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-PLMRRE62R3"
};

// Initialize Firebase (Modular SDK)
const app = initializeApp(firebaseConfig);

// Export Auth and Providers
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();