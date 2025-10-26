#!/usr/bin/env node

/**
 * Firebase Setup Verification Script
 * 
 * This script checks if Firebase is properly configured for the NICU Shift Tracker.
 * Run with: node verify-firebase-setup.js
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

const checkmark = '✓';
const crossmark = '✗';
const warning = '⚠';

let errorCount = 0;
let warningCount = 0;

function success(message) {
  console.log(`${colors.green}${checkmark} ${message}${colors.reset}`);
}

function error(message) {
  console.log(`${colors.red}${crossmark} ${message}${colors.reset}`);
  errorCount++;
}

function warn(message) {
  console.log(`${colors.yellow}${warning} ${message}${colors.reset}`);
  warningCount++;
}

function info(message) {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

function header(message) {
  console.log(`\n${colors.bold}${colors.blue}${message}${colors.reset}`);
}

console.log(`\n${colors.bold}Firebase Setup Verification${colors.reset}`);
console.log('='.repeat(50));

// Check 1: Firebase configuration files
header('1. Checking Firebase Configuration Files');

const requiredFiles = [
  { path: 'firebase.json', name: 'Firebase config' },
  { path: '.firebaserc', name: 'Firebase project config' },
  { path: 'firestore.rules', name: 'Firestore security rules' },
  { path: 'firestore.indexes.json', name: 'Firestore indexes' },
  { path: 'storage.rules', name: 'Storage security rules' },
  { path: 'src/firebase-config.js', name: 'Firebase initialization file' }
];

for (const file of requiredFiles) {
  const filePath = join(__dirname, file.path);
  if (existsSync(filePath)) {
    success(`${file.name} exists (${file.path})`);
  } else {
    error(`${file.name} is missing (${file.path})`);
  }
}

// Check 2: Environment variables
header('2. Checking Environment Variables');

const envPath = join(__dirname, '.env');
const envExamplePath = join(__dirname, '.env.example');

if (existsSync(envPath)) {
  success('.env file exists');
  
  try {
    const envContent = readFileSync(envPath, 'utf8');
    const requiredVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID'
    ];
    
    for (const varName of requiredVars) {
      if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your-`)) {
        success(`${varName} is set`);
      } else if (envContent.includes(`${varName}=your-`)) {
        warn(`${varName} still has placeholder value`);
      } else {
        error(`${varName} is missing from .env`);
      }
    }
  } catch (err) {
    error(`Could not read .env file: ${err.message}`);
  }
} else {
  error('.env file does not exist');
  if (existsSync(envExamplePath)) {
    info('Run: cp .env.example .env');
    info('Then edit .env with your Firebase configuration');
  }
}

// Check 3: .firebaserc project ID
header('3. Checking Firebase Project Configuration');

const firebasercPath = join(__dirname, '.firebaserc');
if (existsSync(firebasercPath)) {
  try {
    const firebaserc = JSON.parse(readFileSync(firebasercPath, 'utf8'));
    if (firebaserc.projects && firebaserc.projects.default) {
      if (firebaserc.projects.default === 'your-project-id') {
        warn('.firebaserc still has placeholder project ID');
        info('Edit .firebaserc and replace "your-project-id" with your actual Firebase project ID');
      } else {
        success(`Firebase project ID set to: ${firebaserc.projects.default}`);
      }
    } else {
      error('.firebaserc is missing project configuration');
    }
  } catch (err) {
    error(`Could not parse .firebaserc: ${err.message}`);
  }
}

// Check 4: Dependencies
header('4. Checking Dependencies');

const packageJsonPath = join(__dirname, 'package.json');
if (existsSync(packageJsonPath)) {
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.dependencies && packageJson.dependencies.firebase) {
      success(`Firebase SDK installed (v${packageJson.dependencies.firebase})`);
    } else {
      error('Firebase SDK not found in dependencies');
    }
  } catch (err) {
    error(`Could not read package.json: ${err.message}`);
  }
}

const nodeModulesPath = join(__dirname, 'node_modules');
if (existsSync(nodeModulesPath)) {
  success('node_modules directory exists');
} else {
  error('node_modules not found');
  info('Run: npm install');
}

// Check 5: Documentation
header('5. Checking Documentation');

const docFiles = [
  { path: 'FIREBASE_SETUP.md', name: 'Firebase setup guide' },
  { path: 'DATABASE_SCHEMA.md', name: 'Database schema documentation' },
  { path: 'QUICKSTART.md', name: 'Quick start guide' }
];

for (const doc of docFiles) {
  const docPath = join(__dirname, doc.path);
  if (existsSync(docPath)) {
    success(`${doc.name} exists`);
  } else {
    warn(`${doc.name} is missing (${doc.path})`);
  }
}

// Summary
header('Verification Summary');

if (errorCount === 0 && warningCount === 0) {
  console.log(`\n${colors.green}${colors.bold}✓ All checks passed!${colors.reset}`);
  console.log('\nNext steps:');
  console.log('1. Create a Firebase project at https://console.firebase.google.com/');
  console.log('2. Enable Firestore Database and Anonymous Authentication');
  console.log('3. Copy your Firebase config to .env file');
  console.log('4. Update .firebaserc with your project ID');
  console.log('5. Deploy security rules: firebase deploy --only firestore');
  console.log('6. Start dev server: npm run dev');
  console.log('\nSee QUICKSTART.md or FIREBASE_SETUP.md for detailed instructions.');
} else {
  console.log(`\n${colors.yellow}Found ${errorCount} error(s) and ${warningCount} warning(s)${colors.reset}`);
  
  if (errorCount > 0) {
    console.log(`\n${colors.red}${colors.bold}Please fix the errors above before proceeding.${colors.reset}`);
  }
  
  if (warningCount > 0) {
    console.log(`\n${colors.yellow}Warnings indicate incomplete setup. Follow the instructions above.${colors.reset}`);
  }
  
  console.log('\nFor help, see:');
  console.log('- QUICKSTART.md for quick setup');
  console.log('- FIREBASE_SETUP.md for detailed setup guide');
  console.log('- DATABASE_SCHEMA.md for database structure');
}

console.log('');
process.exit(errorCount > 0 ? 1 : 0);
