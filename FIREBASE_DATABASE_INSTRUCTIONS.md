# 🎯 Firebase Database Setup - Final Instructions

Since you've already configured anonymous authentication on Firebase, here's exactly what you need to do to complete the database setup.

## What You've Already Done ✅

- ✅ Created a Firebase project
- ✅ Enabled anonymous authentication

Great! You're almost there. Now we just need to set up the Firestore database.

## Step-by-Step Instructions

### Step 1: Enable Firestore Database (3 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. In the left sidebar, click **"Firestore Database"**
4. Click **"Create database"**
5. When asked about security rules, choose **"Start in production mode"**
   - (Don't worry, we'll deploy better rules in Step 3)
6. Choose a database location
   - Select the region closest to you (e.g., `us-central1` for USA)
   - ⚠️ **Important**: This cannot be changed later!
7. Click **"Enable"**

Wait for Firestore to initialize (usually takes 30-60 seconds).

### Step 2: Get Your Firebase Configuration (2 minutes)

You need to copy your Firebase configuration to connect the app to your project.

1. In Firebase Console, click the **gear icon** ⚙️ next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. If you see a web app listed:
   - Click on it to view the config
5. If you don't see a web app:
   - Click the web icon **`</>`** to add one
   - Give it a nickname (e.g., "NICU Shift Tracker")
   - Don't check "Firebase Hosting" (we can add this later)
   - Click "Register app"
6. You'll see a `firebaseConfig` object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
  measurementId: "G-XXXXXXXXXX" // optional
};
```

Keep this window open - you'll need these values in the next step.

### Step 3: Run the Setup Script (2 minutes)

We've created an interactive script that will guide you through the rest:

```bash
npm run setup-database
```

The script will:
1. Ask for your Firebase configuration values (from Step 2)
2. Create a `.env` file with your credentials
3. Update `.firebaserc` with your project ID
4. Deploy Firestore security rules and indexes
5. Verify everything is working

Just follow the prompts and paste in the values when asked!

### Step 4: Test Your Database (1 minute)

After setup completes, test that everything is working:

```bash
npm run test-database
```

This will:
- ✓ Check your configuration
- ✓ Test authentication
- ✓ Test database writes
- ✓ Test database reads
- ✓ Verify security rules

You should see all green checkmarks!

### Step 5: Start Using the App! 🎉

```bash
npm run dev
```

Open your browser to `http://localhost:5173` and:
1. Create a new shift
2. Add a baby
3. Log some touch times

Then check Firebase Console → Firestore Database to see your data!

## Alternative: Manual Setup

If you prefer to do things manually:

### 1. Create `.env` file

```bash
cp .env.example .env
```

Edit `.env` and add your Firebase config:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 2. Update `.firebaserc`

Edit `.firebaserc` and replace `"your-project-id"`:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

### 3. Deploy Firestore

```bash
# Install Firebase CLI if you haven't already
npm install -g firebase-tools

# Login
firebase login

# Deploy
firebase deploy --only firestore
```

This deploys the security rules and database indexes.

### 4. Verify

```bash
npm run verify-firebase
npm run test-database
```

## What Gets Created

After setup, your Firestore database will have this structure:

```
Firestore Database
└── artifacts
    └── default-nicu-app
        └── users
            └── {your-anonymous-user-id}
                └── nicu_shifts
                    └── {shift-id}
                        ├── shiftDate: "2024-01-15"
                        ├── shiftStartTime: "07:00"
                        ├── assignmentType: "ICU"
                        └── babies
                            └── {baby-id}
                                ├── babyName: "R3B1"
                                ├── daysOld: 5
                                ├── gestationalAge: "32w 4d"
                                ├── reportSheet/
                                ├── touchTimeLogs/
                                └── eventLogs/
```

## Security Features ✅

Your database is automatically configured with:

- **User Isolation**: Each user can only see their own data
- **Anonymous Auth**: No personal info stored in authentication
- **Encrypted**: Data encrypted in transit and at rest
- **HIPAA Compliant**: Designed for de-identified data only

## Troubleshooting

### "Permission denied" error

**Problem**: Firestore rules haven't been deployed yet.

**Solution**:
```bash
firebase deploy --only firestore:rules
```

### "API key not valid" error

**Problem**: Wrong Firebase config in `.env`

**Solution**:
1. Delete `.env`
2. Run `npm run setup-database` again
3. Double-check you copied the right values

### "Firebase CLI not installed"

**Solution**:
```bash
npm install -g firebase-tools
```

### Can't see data in Firebase Console

**Check**:
1. Did you create a shift in the app?
2. Check browser console for errors (F12)
3. Verify you're looking at the right project in Firebase Console
4. Look under: Firestore Database → artifacts → default-nicu-app → users

## Verification Commands

```bash
# Check everything is configured
npm run verify-firebase

# Test database connection
npm run test-database

# Start development server
npm run dev

# Build for production
npm run build
```

## What's Next?

Once your database is set up:

1. **Start using the app**: Create shifts, track patients
2. **Learn the structure**: Read `DATABASE_SCHEMA.md`
3. **Deploy to production**: See `FIREBASE_SETUP.md` for hosting options
4. **Backup your data**: Export from Firebase Console regularly

## Quick Reference

| What | Command |
|------|---------|
| Interactive setup | `npm run setup-database` |
| Test connection | `npm run test-database` |
| Check status | `npm run verify-firebase` |
| Start dev server | `npm run dev` |
| Deploy rules | `firebase deploy --only firestore` |

## Need More Help?

📖 **Detailed Documentation**:
- `DATABASE_SETUP_QUICKSTART.md` - Quick reference
- `FIREBASE_SETUP.md` - Complete setup guide with troubleshooting
- `DATABASE_SCHEMA.md` - Full database structure reference

🔗 **Online Resources**:
- [Firebase Console](https://console.firebase.google.com/)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

---

## Summary

Since you already have authentication set up, you just need to:

1. ✅ Enable Firestore Database in Firebase Console (3 min)
2. ✅ Get your Firebase config (2 min)
3. ✅ Run `npm run setup-database` (2 min)
4. ✅ Run `npm run test-database` (1 min)
5. ✅ Run `npm run dev` and start using the app! 🎉

**Total time**: About 10 minutes

**Result**: Fully functional NICU shift tracker with secure database storage

🚀 **You're ready to go!**
