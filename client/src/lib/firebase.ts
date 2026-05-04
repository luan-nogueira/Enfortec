import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAcLEUhYrt5tWQIpLkb-pWnk5Ffqw1JBUM",
  authDomain: "enfortec-c9b78.firebaseapp.com",
  projectId: "enfortec-c9b78",
  storageBucket: "enfortec-c9b78.firebasestorage.app",
  messagingSenderId: "1018976453846",
  appId: "1:1018976453846:web:dedabdd4483624a525b577",
  measurementId: "G-C8TZX9JDWT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;
