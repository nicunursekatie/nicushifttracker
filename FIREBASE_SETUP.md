# Firebase Database Setup Guide

This guide will walk you through setting up Firebase for the NICU Shift Tracker application.

## Overview

The NICU Shift Tracker uses Firebase for:
- **Authentication**: Anonymous authentication for user sessions
- **Firestore Database**: NoSQL database for storing shift data, baby information, touch time logs, and event logs
- **Cloud Storage**: (Optional) For future features like photo attachments
- **Hosting**: (Optional) For deploying the application

## Prerequisites

1. **Node.js** (v18 or higher) installed
2. **npm** installed
3. A **Google account** to access Firebase Console

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter a project name (e.g., "nicu-shift-tracker")
4. Choose whether to enable Google Analytics (optional, recommended)
5. Click **"Create project"** and wait for it to initialize

## Step 2: Enable Firestore Database

1. In Firebase Console, click on **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll deploy custom security rules)
4. Select a **Cloud Firestore location** (choose closest to your location)
   - ⚠️ **Important**: This location cannot be changed later
   - Recommended: `us-central1` (United States) or your regional equivalent
5. Click **"Enable"**

### Deploy Firestore Security Rules

The security rules ensure each user can only access their own data:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy the security rules
firebase deploy --only firestore:rules

# Deploy the indexes (for optimized queries)
firebase deploy --only firestore:indexes
```

Alternatively, you can manually copy the rules from `firestore.rules` into the Firebase Console:
1. Go to **Firestore Database** → **Rules** tab
2. Replace the default rules with the contents of `firestore.rules`
3. Click **"Publish"**

## Step 3: Enable Authentication

1. In Firebase Console, click on **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Go to the **"Sign-in method"** tab
4. Click on **"Anonymous"**
5. Toggle **"Enable"**
6. Click **"Save"**

### Why Anonymous Authentication?

The app uses anonymous authentication to:
- Provide each user with a unique ID without requiring login credentials
- Keep shift data private and isolated per device/browser
- Comply with HIPAA de-identification requirements
- Simplify the user experience (no passwords or accounts needed)

## Step 4: Enable Cloud Storage (Optional - Future Feature)

If you plan to add photo attachments in the future:

1. In Firebase Console, click on **"Storage"** in the left sidebar
2. Click **"Get started"**
3. Choose **"Start in production mode"**
4. Select the same location as your Firestore database
5. Click **"Done"**

### Deploy Storage Security Rules

```bash
firebase deploy --only storage
```

Or manually copy from `storage.rules` in the Firebase Console.

## Step 5: Get Firebase Configuration

1. In Firebase Console, click the **gear icon** ⚙️ next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **web icon** (`</>`) to add a web app
5. Enter an app nickname (e.g., "NICU Shift Tracker Web")
6. **Do NOT** check "Set up Firebase Hosting" (we'll do this separately if needed)
7. Click **"Register app"**
8. Copy the `firebaseConfig` object

It will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## Step 6: Configure Environment Variables

### For Local Development:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

3. **Never commit** the `.env` file to version control (it's already in `.gitignore`)

### For Firebase Hosting Deployment:

When deploying to Firebase Hosting, you can use environment variables or embed the config directly. See [Deployment](#deployment) section below.

### For Other Hosting Services (Vercel, Netlify, etc.):

Add the environment variables in your hosting provider's dashboard:
- Go to your project settings
- Find "Environment Variables" section
- Add each `VITE_FIREBASE_*` variable with its value

## Step 7: Update Firebase Project ID

1. Open `.firebaserc` file
2. Replace `"your-project-id"` with your actual Firebase project ID:
   ```json
   {
     "projects": {
       "default": "your-actual-project-id"
     }
   }
   ```

## Step 8: Install Dependencies and Test

```bash
# Install all dependencies
npm install

# Start the development server
npm run dev
```

Open your browser to `http://localhost:5173` (or the URL shown in terminal).

### Verify the Setup:

1. Open browser console (F12)
2. You should see: `"Firebase: User signed in: [user-id]"`
3. Try adding a shift and baby - data should save to Firestore
4. Check Firebase Console → Firestore Database to see your data structure:
   ```
   artifacts/
     └── default-nicu-app/
         └── users/
             └── [anonymous-user-id]/
                 └── nicu_shifts/
                     └── [shift-id]/
                         ├── shiftDate
                         ├── shiftStartTime
                         └── babies/
   ```

## Deployment

### Option 1: Firebase Hosting

Firebase Hosting is the recommended option for easy integration.

```bash
# Build the app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Or deploy everything (hosting + rules)
firebase deploy
```

Your app will be live at: `https://your-project-id.web.app`

### Option 2: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Build and deploy
npm run build
vercel --prod
```

Add environment variables in Vercel dashboard:
1. Go to your project → Settings → Environment Variables
2. Add all `VITE_FIREBASE_*` variables

### Option 3: Netlify

```bash
# Build the app
npm run build

# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

Add environment variables in Netlify dashboard:
1. Go to Site settings → Environment variables
2. Add all `VITE_FIREBASE_*` variables

## Database Schema

### Data Structure in Firestore

```
artifacts/
  └── {appId}/                          # App identifier (default: "default-nicu-app")
      └── users/
          └── {userId}/                  # Anonymous user ID from Firebase Auth
              └── nicu_shifts/
                  └── {shiftId}/         # Unique shift ID (auto-generated)
                      ├── shiftDate      # Date string (YYYY-MM-DD)
                      ├── shiftStartTime # Time string (HH:MM)
                      ├── assignmentType # "ICU" or "Intermediate"
                      └── babies/
                          └── {babyId}/  # Unique baby ID (auto-generated)
                              ├── babyName        # De-identified name/ID
                              ├── q3StartTime     # Touch time start (HH:MM)
                              ├── daysOld         # Post-natal age
                              ├── gestationalAge  # GA in weeks
                              ├── correctedAge    # CGA in weeks
                              ├── apgar1          # Apgar at 1 min
                              ├── apgar5          # Apgar at 5 min
                              ├── weight          # Current weight in grams
                              ├── length          # Length in cm
                              ├── headCirc        # Head circumference in cm
                              ├── abdGirth        # Abdominal girth in cm
                              │
                              ├── reportSheet/
                              │   └── main        # All report sheet data
                              │       ├── maternalHistory
                              │       ├── currentProblems
                              │       ├── respiratory
                              │       ├── feeds
                              │       ├── ivFluidsLines
                              │       ├── medications
                              │       ├── labs
                              │       ├── treatmentPlan
                              │       └── notes
                              │
                              ├── touchTimeLogs/
                              │   └── {logId}/    # Unique log ID
                              │       ├── timestamp      # Date/time of log
                              │       ├── scheduledTime  # Scheduled q3 time
                              │       ├── temp           # Temperature
                              │       ├── heartRate      # Heart rate
                              │       ├── respRate       # Respiratory rate
                              │       ├── spO2           # Oxygen saturation
                              │       ├── feedVolume     # Feed amount
                              │       ├── feedRoute      # Feed route
                              │       ├── feedTolerance  # Tolerance notes
                              │       ├── residual       # Residual amount
                              │       ├── diaper         # Diaper output
                              │       ├── positioning    # Baby positioning
                              │       ├── lineCheck      # IV line check
                              │       └── comments       # Additional notes
                              │
                              └── eventLogs/
                                  └── {eventId}/  # Unique event ID
                                      ├── timestamp    # When event occurred
                                      ├── eventType    # Type of event
                                      └── details      # Event description
```

### Security Rules Summary

The security rules ensure:
- ✅ Users can only read/write their own data
- ✅ All operations require authentication (anonymous or custom)
- ✅ No cross-user data access
- ✅ Proper data isolation per user ID

## Troubleshooting

### Issue: "Firebase Auth is not initialized"

**Solution**: Check that your `.env` file has all required variables and restart the dev server.

```bash
# Stop the server (Ctrl+C)
# Restart
npm run dev
```

### Issue: "Missing or insufficient permissions"

**Solution**: Ensure Firestore security rules are deployed correctly.

```bash
firebase deploy --only firestore:rules
```

Or check rules in Firebase Console → Firestore Database → Rules tab.

### Issue: Anonymous authentication fails

**Solution**: Verify anonymous authentication is enabled:
1. Firebase Console → Authentication → Sign-in method
2. Ensure "Anonymous" is **Enabled**

### Issue: Data not saving to Firestore

**Checklist**:
1. Check browser console for errors
2. Verify user is authenticated (should see "Firebase: User signed in" in console)
3. Check Firestore rules allow write access
4. Ensure internet connection is stable
5. Check Firebase project quotas (free tier limits)

### Issue: "Cannot read property 'uid' of null"

**Solution**: This means the user isn't authenticated yet. The app should handle this automatically, but if you see this:
1. Clear browser cache and cookies
2. Reload the app
3. Check that Firebase Auth is properly initialized

## Data Privacy & HIPAA Compliance

### Important Reminders:

1. **Use only de-identified data**:
   - ❌ No patient names
   - ❌ No exact dates of birth
   - ❌ No medical record numbers
   - ✅ Use room/bed numbers or nicknames
   - ✅ Calculate ages without storing DOB

2. **Firebase Security**:
   - Anonymous auth isolates data per device/browser
   - Security rules prevent cross-user data access
   - Data is encrypted in transit (HTTPS)
   - Data is encrypted at rest in Firestore

3. **Best Practices**:
   - Don't share your Firebase config publicly
   - Don't commit `.env` file to public repositories
   - Regularly review Firebase Console access logs
   - Use this app as a workflow tool only
   - Always transfer data to official hospital systems
   - Delete shifts after end of shift summary

## Cost Considerations

Firebase offers a generous free tier:

### Firestore Free Tier:
- **50,000** document reads per day
- **20,000** document writes per day
- **20,000** document deletes per day
- **1 GB** stored data

### Typical Usage:
- **One shift**: ~50-100 document writes
- **10 shifts**: ~500-1000 writes (well within free tier)
- **Storage**: Minimal (mostly text data)

For personal/individual use, you should stay well within the free tier limits.

### Monitoring Usage:
1. Firebase Console → Usage and billing
2. Check daily read/write operations
3. Set up budget alerts if needed

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/data-model)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Pricing](https://firebase.google.com/pricing)

## Support

If you encounter issues:
1. Check this guide's Troubleshooting section
2. Review Firebase Console for errors
3. Check browser console for error messages
4. Review the main README.md for app-specific help

---

**Setup Complete!** 🎉

Once configured, your NICU Shift Tracker will:
- Save all data securely to Firestore
- Work across devices with the same browser/auth
- Maintain data isolation per user
- Comply with de-identification requirements
