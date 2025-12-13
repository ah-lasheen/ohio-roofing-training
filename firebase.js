// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDRnZbfbeR1nUFY_rKhmC_jxUxKOum3PII",
  authDomain: "all-ohio-roofing.firebaseapp.com",
  projectId: "all-ohio-roofing",
  storageBucket: "all-ohio-roofing.firebasestorage.app",
  messagingSenderId: "523016785104",
  appId: "1:523016785104:web:53595e2e01a8843632a2d5",
  measurementId: "G-VBEPX4BEZ3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
