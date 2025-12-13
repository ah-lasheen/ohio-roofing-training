import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDRnZbfbeR1nUFY_rKhmC_jxUxKOum3PII",
  authDomain: "all-ohio-roofing.firebaseapp.com",
  projectId: "all-ohio-roofing",
  storageBucket: "all-ohio-roofing.firebasestorage.app",
  messagingSenderId: "523016785104",
  appId: "1:523016785104:web:53595e2e01a8843632a2d5"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
