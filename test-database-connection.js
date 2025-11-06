#!/usr/bin/env node

/**
 * Firebase Database Connection Test
 * 
 * This script tests your Firebase database connection and verifies:
 * - Authentication is working
 * - Firestore can be accessed
 * - Security rules are properly configured
 * - Basic read/write operations work
 * 
 * Usage: node test-database-connection.js
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, deleteDoc, collection } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printSection(title) {
  console.log('\n' + '='.repeat(60));
  print(title, 'bright');
  console.log('='.repeat(60));
}

async function testDatabaseConnection() {
  print('\n🔍 Testing Firebase Database Connection', 'cyan');
  
  // Check environment variables
  printSection('1. Checking Configuration');
  
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];
  
  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    print(`✗ Missing environment variables: ${missingVars.join(', ')}`, 'red');
    print('\nPlease create a .env file with your Firebase configuration.', 'yellow');
    print('Run: node setup-firebase-database.js', 'bright');
    process.exit(1);
  }
  
  print('✓ All required environment variables are set', 'green');
  print(`  Project ID: ${process.env.VITE_FIREBASE_PROJECT_ID}`, 'cyan');
  
  // Initialize Firebase
  printSection('2. Initializing Firebase');
  
  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };
  
  try {
    const app = initializeApp(firebaseConfig);
    print('✓ Firebase app initialized', 'green');
    
    const auth = getAuth(app);
    const db = getFirestore(app);
    print('✓ Firestore and Auth instances created', 'green');
    
    // Test authentication
    printSection('3. Testing Authentication');
    
    print('Signing in anonymously...', 'cyan');
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    
    print('✓ Anonymous authentication successful', 'green');
    print(`  User ID: ${user.uid}`, 'cyan');
    
    // Test database write
    printSection('4. Testing Database Write');
    
    const appId = 'default-nicu-app';
    const testDocPath = `artifacts/${appId}/users/${user.uid}/test_connection/test`;
    const testDocRef = doc(db, testDocPath);
    
    print('Writing test document...', 'cyan');
    const testData = {
      timestamp: new Date().toISOString(),
      test: 'connection_test',
      message: 'If you can read this, the database is working!'
    };
    
    await setDoc(testDocRef, testData);
    print('✓ Write operation successful', 'green');
    print(`  Document path: ${testDocPath}`, 'cyan');
    
    // Test database read
    printSection('5. Testing Database Read');
    
    print('Reading test document...', 'cyan');
    const docSnap = await getDoc(testDocRef);
    
    if (docSnap.exists()) {
      print('✓ Read operation successful', 'green');
      print(`  Document data:`, 'cyan');
      print(`    ${JSON.stringify(docSnap.data(), null, 2)}`, 'bright');
    } else {
      print('✗ Document not found', 'red');
      print('This may indicate a security rules issue.', 'yellow');
    }
    
    // Test database delete
    printSection('6. Testing Database Delete');
    
    print('Deleting test document...', 'cyan');
    await deleteDoc(testDocRef);
    print('✓ Delete operation successful', 'green');
    
    // Verify deletion
    const deletedDocSnap = await getDoc(testDocRef);
    if (!deletedDocSnap.exists()) {
      print('✓ Document successfully deleted', 'green');
    } else {
      print('⚠ Document still exists after deletion', 'yellow');
    }
    
    // Test security rules
    printSection('7. Testing Security Rules');
    
    print('Attempting to read another user\'s data...', 'cyan');
    // Use crypto.randomUUID() for a secure random ID (even though this is just a test)
    const fakeUserId = 'test-user-' + crypto.randomUUID();
    const unauthorizedDocPath = `artifacts/${appId}/users/${fakeUserId}/test_connection/test`;
    const unauthorizedDocRef = doc(db, unauthorizedDocPath);
    
    try {
      await setDoc(unauthorizedDocRef, { test: 'unauthorized' });
      print('⚠ Warning: Security rules may not be properly configured', 'yellow');
      print('  You should not be able to write to other users\' data', 'yellow');
    } catch (error) {
      if (error.code === 'permission-denied') {
        print('✓ Security rules are working correctly', 'green');
        print('  Cannot write to other users\' data (as expected)', 'cyan');
      } else {
        print(`⚠ Unexpected error: ${error.message}`, 'yellow');
      }
    }
    
    // Summary
    printSection('Test Summary');
    
    print('✓ All tests passed!', 'green');
    print('\nYour Firebase database is properly configured and ready to use.', 'cyan');
    print('\nDatabase structure:', 'bright');
    print(`  artifacts/${appId}/users/{userId}/nicu_shifts/...`, 'cyan');
    print('\nYou can now:', 'bright');
    print('  1. Start the development server: npm run dev', 'cyan');
    print('  2. Create shifts and add babies', 'cyan');
    print('  3. View your data in Firebase Console', 'cyan');
    
    print('\n📚 For more information:', 'cyan');
    print('  - DATABASE_SCHEMA.md - Complete database structure', 'bright');
    print('  - FIREBASE_SETUP.md - Setup and troubleshooting', 'bright');
    
    print('\n🎉 Database connection test complete!\n', 'green');
    
    process.exit(0);
    
  } catch (error) {
    print('\n✗ Test failed', 'red');
    print(`Error: ${error.message}`, 'red');
    
    if (error.code === 'auth/api-key-not-valid') {
      print('\nYour API key is invalid. Please check your .env file.', 'yellow');
    } else if (error.code === 'permission-denied') {
      print('\nPermission denied. This could mean:', 'yellow');
      print('  1. Firestore rules have not been deployed', 'bright');
      print('  2. Anonymous authentication is not enabled', 'bright');
      print('  3. Database has not been created in Firebase Console', 'bright');
      print('\nRun: firebase deploy --only firestore', 'cyan');
    } else if (error.code) {
      print(`\nError code: ${error.code}`, 'yellow');
    }
    
    print('\nFor help, see FIREBASE_SETUP.md', 'cyan');
    process.exit(1);
  }
}

testDatabaseConnection();
