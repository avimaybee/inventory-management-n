// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCPJ3MZV2XNDT6k7IYYKuR01L-2FgmtCPc",
  authDomain: "neelamfeeds-inv.firebaseapp.com",
  projectId: "neelamfeeds-inv",
  storageBucket: "neelamfeeds-inv.firebasestorage.app",
  messagingSenderId: "752517322012",
  appId: "1:752517322012:web:dda800b60d5032fa37d6d9",
  measurementId: "G-2WLV87H98Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export default app;
