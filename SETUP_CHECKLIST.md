# Firebase Setup Checklist

Use this checklist to track your Firebase setup progress. Check off each item as you complete it.

## Initial Setup

- [ ] Node.js v18+ installed
- [ ] Git repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] Verified setup with `npm run verify-firebase`

## Firebase Console Setup

### Create Project
- [ ] Visited [Firebase Console](https://console.firebase.google.com/)
- [ ] Created new Firebase project
- [ ] Project successfully initialized

### Enable Firestore Database
- [ ] Navigated to "Firestore Database"
- [ ] Clicked "Create database"
- [ ] Selected "Start in production mode"
- [ ] Chose database location
- [ ] Database created successfully

### Enable Authentication
- [ ] Navigated to "Authentication"
- [ ] Clicked "Get started"
- [ ] Went to "Sign-in method" tab
- [ ] Enabled "Anonymous" authentication
- [ ] Saved changes

### Get Web App Configuration
- [ ] Clicked gear icon ⚙️ → "Project settings"
- [ ] Scrolled to "Your apps" section
- [ ] Clicked web icon `</>`
- [ ] Registered app with a nickname
- [ ] Copied Firebase configuration object

## Local Configuration

### Environment Variables
- [ ] Created `.env` file from `.env.example`
- [ ] Added `VITE_FIREBASE_API_KEY`
- [ ] Added `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] Added `VITE_FIREBASE_PROJECT_ID`
- [ ] Added `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] Added `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] Added `VITE_FIREBASE_APP_ID`
- [ ] Verified no placeholder values remain

### Firebase Project Config
- [ ] Opened `.firebaserc` file
- [ ] Replaced `"your-project-id"` with actual project ID
- [ ] Saved file

## Deploy Firebase Configuration

### Install Firebase CLI
- [ ] Installed Firebase CLI: `npm install -g firebase-tools`
- [ ] Verified installation: `firebase --version`

### Login and Deploy
- [ ] Logged in: `firebase login`
- [ ] Deployed Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Deployed Firestore indexes: `firebase deploy --only firestore:indexes`
- [ ] (Optional) Deployed Storage rules: `firebase deploy --only storage`

## Verification

### Local Verification
- [ ] Ran verification script: `npm run verify-firebase`
- [ ] All checks passed (green checkmarks)
- [ ] No errors reported

### Test Application
- [ ] Started dev server: `npm run dev`
- [ ] Opened browser to localhost
- [ ] Checked browser console for "Firebase initialized successfully"
- [ ] Checked for "User signed in: [user-id]" message
- [ ] Tested creating a shift
- [ ] Tested adding a baby
- [ ] Verified data appears in Firebase Console → Firestore Database

## Firebase Console Verification

### Check Data Structure
- [ ] Opened Firebase Console → Firestore Database
- [ ] Verified `artifacts` collection exists
- [ ] Verified user data structure: `artifacts/{appId}/users/{userId}/`
- [ ] Checked security rules are active (Rules tab)

### Monitor Usage
- [ ] Checked "Usage and billing" tab
- [ ] Verified within free tier limits
- [ ] (Optional) Set up budget alerts

## Deployment (Optional)

### Firebase Hosting
- [ ] Ran build: `npm run build`
- [ ] Deployed: `firebase deploy --only hosting`
- [ ] Tested live URL: `https://[project-id].web.app`

### Alternative Hosting (Vercel/Netlify)
- [ ] Built app: `npm run build`
- [ ] Deployed to hosting provider
- [ ] Added environment variables to hosting dashboard
- [ ] Tested live URL

## Documentation Review

- [ ] Read [QUICKSTART.md](./QUICKSTART.md)
- [ ] Read [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
- [ ] Reviewed [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- [ ] Understood security rules in `firestore.rules`
- [ ] Reviewed privacy/HIPAA guidelines in README.md

## Final Checks

- [ ] Application loads without errors
- [ ] Can create and save shifts
- [ ] Can add and edit babies
- [ ] Can log touch times
- [ ] Can add events
- [ ] Data persists after page refresh
- [ ] Can delete shifts
- [ ] No console errors in browser

## Troubleshooting Resources

If you encounter issues, check:
- [ ] [FIREBASE_SETUP.md - Troubleshooting section](./FIREBASE_SETUP.md#troubleshooting)
- [ ] Browser console for error messages
- [ ] Firebase Console → Firestore Database → Rules for rule errors
- [ ] Firebase Console → Authentication for auth issues

## Security & Privacy

- [ ] Understood de-identification requirements
- [ ] Never entering patient names
- [ ] Never entering exact dates of birth
- [ ] Never entering medical record numbers
- [ ] Using room/bed numbers or nicknames only
- [ ] Understand this is a workflow tool, not official record
- [ ] Will transfer data to hospital charting system
- [ ] Will delete shifts after use

---

## ✅ Setup Complete!

Once all items are checked, your NICU Shift Tracker is ready to use!

**Quick Reference:**
- Start dev server: `npm run dev`
- Build for production: `npm run build`
- Verify setup: `npm run verify-firebase`
- Deploy Firebase: `firebase deploy`

**Support:**
- Issues? Check [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
- Questions? Review [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- Need help? See README.md for support info

Happy tracking! 🏥
