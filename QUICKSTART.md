# Firebase Quick Start Guide

This is a condensed guide to get Firebase set up quickly. For detailed information, see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md).

## Prerequisites

- Node.js v18+ installed
- A Google account
- Firebase CLI installed: `npm install -g firebase-tools`

## Quick Setup (5 Steps)

### 1. Create Firebase Project

1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" → Enter name → Create
3. Wait for initialization

### 2. Enable Services

**Enable Firestore:**
1. Click "Firestore Database" → "Create database"
2. Choose "Start in production mode"
3. Select location (e.g., `us-central1`)
4. Click "Enable"

**Enable Authentication:**
1. Click "Authentication" → "Get started"
2. Go to "Sign-in method" tab
3. Enable "Anonymous" → Save

### 3. Get Firebase Config

1. Click ⚙️ (gear icon) → "Project settings"
2. Scroll to "Your apps" → Click web icon `</>`
3. Register app with nickname → Copy the config object

### 4. Configure Environment

**Create `.env` file:**
```bash
cp .env.example .env
```

**Edit `.env` with your config:**
```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

**Update `.firebaserc`:**
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### 5. Deploy Security Rules

```bash
# Login to Firebase
firebase login

# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy Storage rules (optional)
firebase deploy --only storage
```

## Test Your Setup

```bash
# Install dependencies (if not done)
npm install

# Start dev server
npm run dev
```

Visit `http://localhost:5173` and check browser console for:
```
✅ Firebase initialized successfully
Firebase: User signed in: [user-id]
```

## Next Steps

- Read [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed setup
- Review [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for data structure
- See [README.md](./README.md) for app usage guide

## Deploy to Firebase Hosting (Optional)

```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

Your app will be live at: `https://your-project-id.web.app`

## Troubleshooting

**Issue:** Firebase not initializing
- Check all environment variables are set in `.env`
- Restart dev server after editing `.env`

**Issue:** Permission denied errors
- Verify security rules are deployed: `firebase deploy --only firestore:rules`
- Check anonymous auth is enabled in Firebase Console

**Issue:** Data not saving
- Open browser console and look for error messages
- Verify you see "User signed in" message
- Check internet connection

## Support

For detailed help, see:
- [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) - Complete setup guide
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database structure
- [Firebase Documentation](https://firebase.google.com/docs)

---

**Ready to use!** 🚀 Your NICU Shift Tracker is now configured with Firebase.
