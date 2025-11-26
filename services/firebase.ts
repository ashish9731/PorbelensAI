import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB1-pdmfM3Pk2zSIvayI5x0b34LhSQU1MY",
  authDomain: "resumeace-fa6d2.firebaseapp.com",
  projectId: "resumeace-fa6d2",
  storageBucket: "resumeace-fa6d2.firebasestorage.app",
  messagingSenderId: "737330398575",
  appId: "1:737330398575:web:2facfc444fdc03479e549a",
  measurementId: "G-PLMRRE62R3"
};

// Initialize Firebase (Modular SDK)
const app = initializeApp(firebaseConfig);

// Export Auth and Providers
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();