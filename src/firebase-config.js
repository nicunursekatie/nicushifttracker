/**
 * Firebase Configuration and Initialization
 * 
 * This file provides a centralized configuration for Firebase services.
 * It can be imported and used across the application for consistent Firebase access.
 * 
 * Usage:
 *   import { db, auth, firebaseApp } from './firebase-config';
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Firebase configuration object
 * These values come from environment variables (Vite automatically loads VITE_* vars)
 * 
 * In development: values are loaded from .env file
 * In production: values should be set in your hosting platform's environment variables
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, // Optional
};

/**
 * Check if Firebase configuration is complete
 * Logs a warning if any required configuration is missing
 */
const isConfigComplete = () => {
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
  
  if (missingKeys.length > 0) {
    console.warn('Firebase configuration incomplete. Missing:', missingKeys);
    console.warn('Please check your .env file or environment variables.');
    return false;
  }
  return true;
};

/**
 * Initialize Firebase only if configuration is complete
 */
let firebaseApp = null;
let db = null;
let auth = null;
let storage = null;

if (isConfigComplete()) {
  try {
    // Initialize Firebase
    firebaseApp = initializeApp(firebaseConfig);
    
    // Initialize Firestore
    db = getFirestore(firebaseApp);
    
    // Initialize Auth
    auth = getAuth(firebaseApp);
    
    // Initialize Storage (optional - for future features)
    storage = getStorage(firebaseApp);
    
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
  }
} else {
  console.error('❌ Firebase configuration is incomplete. Please set up your environment variables.');
}

/**
 * Export Firebase instances
 * These can be imported and used throughout the application
 */
export { firebaseApp, db, auth, storage };

/**
 * App ID for Firestore collections
 * This allows multiple apps to share the same Firebase project if needed
 */
export const appId = 'default-nicu-app';

/**
 * Helper function to get user collection path
 * Used for constructing Firestore document paths
 * 
 * @param {string} userId - The authenticated user's ID
 * @returns {string} Path to user's collection
 */
export const getUserCollectionPath = (userId) => {
  return `artifacts/${appId}/users/${userId}`;
};
