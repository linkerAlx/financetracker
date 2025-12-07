import { auth } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { setupRealtimeListener, unsubscribeListener } from './db.js';

// Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const userEmailDisplay = document.getElementById('user-email-display');

// Error Handling Helper
const showAuthError = (error) => {
    console.error('Auth Error:', error);

    // Show user-friendly error messages
    let message = error.message;
    if (error.code === 'auth/quota-exceeded') {
        message = 'Too many login attempts. Please try again later or use Google Sign-In.';
    } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password. Please try again.';
    } else if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
    } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
    } else if (error.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized for authentication.\n\n' +
            'To fix this:\n' +
            '1. Go to Firebase Console (console.firebase.google.com)\n' +
            '2. Select your project\n' +
            '3. Go to Authentication > Settings > Authorized domains\n' +
            '4. Add "localhost" to the list\n\n' +
            'Or restart the server on port 5000: python -m http.server 5000';
    }

    alert(message);
};

// Signup
export const handleSignup = async (email, password) => {
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        // Auth state listener will handle UI switch
    } catch (error) {
        showAuthError(error);
    }
};

// Login
export const handleLogin = async (email, password) => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Auth state listener will handle UI switch
    } catch (error) {
        showAuthError(error);
    }
};

// Google Sign-In
export const handleGoogleSignIn = async () => {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        // Auth state listener will handle UI switch
    } catch (error) {
        showAuthError(error);
    }
};

// Logout
export const handleLogout = async () => {
    try {
        await signOut(auth);
        unsubscribeListener(); // Stop listening to DB
    } catch (error) {
        console.error("Logout failed", error);
    }
};

// Auth State Monitor
export const initAuth = () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            console.log("User signed in:", user.email);

            // Safely update user email display if element exists
            if (userEmailDisplay) {
                userEmailDisplay.textContent = user.email;
            }

            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');

            // Initialize User Data Listener
            setupRealtimeListener(user.uid);

        } else {
            // User is signed out
            console.log("User signed out");
            authContainer.classList.remove('hidden');
            appContainer.classList.add('hidden');

            // Reset Forms
            loginForm.reset();
            signupForm.reset();
        }
    });
};
