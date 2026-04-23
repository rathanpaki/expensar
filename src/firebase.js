import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBrip-Ck_ZhqdtW_wE7hWNR3iJjc2sfvak",
  authDomain: "personal-expense-manager-89ea7.firebaseapp.com",
  projectId: "personal-expense-manager-89ea7",
  storageBucket: "personal-expense-manager-89ea7.firebasestorage.app",
  messagingSenderId: "837793254173",
  appId: "1:837793254173:web:dee2315a6e9e6256c7eff4"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const firebaseConfigReady = Object.values(firebaseConfig).every(Boolean);
