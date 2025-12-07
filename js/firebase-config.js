// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// TODO: Replace the following with your app's Firebase project configuration
// You can obtain these from the Firebase Console -> Project Settings
 const firebaseConfig = {
    apiKey: "AIzaSyDOJHm14lKCTqsFYMPzYvreUh33PE-FWWI",
    authDomain: "financeproject-a8998.firebaseapp.com",
    projectId: "financeproject-a8998",
    storageBucket: "financeproject-a8998.firebasestorage.app",
    messagingSenderId: "931971793522",
    appId: "1:931971793522:web:5d1b91af9b01a89496f8eb"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
