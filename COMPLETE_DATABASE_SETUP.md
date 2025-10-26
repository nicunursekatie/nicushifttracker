# 🎯 Complete Your Firebase Database Setup

Great! You've already configured anonymous authentication. Now let's finish setting up your Firebase database for the NICU Shift Tracker.

## What's Already Done ✓

- Firebase project created
- Anonymous authentication enabled
- Firebase SDK configured (v10.7.1)
- Security rules defined
- Database schema designed

## What You Need to Do

### Quick Setup (5 minutes)

#### 1. Enable Firestore Database

In [Firebase Console](https://console.firebase.google.com/):
1. Select your project
2. Click "Firestore Database" → "Create database"
3. Choose "Start in production mode"
4. Select location (closest to you)
5. Click "Enable"

#### 2. Run Setup Script

```bash
npm run setup-database
```

Follow the prompts to:
- Enter your Firebase configuration from Firebase Console
- Create `.env` file
- Update `.firebaserc` with your project ID
- Deploy Firestore rules and indexes

#### 3. Test Connection

```bash
npm run test-database
```

This verifies:
- Authentication works
- Database reads/writes succeed
- Security rules are active

#### 4. Start Developing

```bash
npm run dev
```

## Alternative: Manual Setup

If you prefer manual configuration:

### 1. Create `.env` file

```bash
cp .env.example .env
```

Edit `.env` with your Firebase config from:
Firebase Console → Project Settings → Your apps → Config

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 2. Update `.firebaserc`

Replace `"your-project-id"` with your actual project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

### 3. Deploy Firestore

```bash
firebase login
firebase deploy --only firestore
```

## Verification

Run the verification script to check everything:

```bash
npm run verify-firebase
```

Should show all green checkmarks!

## Database Structure

Once set up, your data will be organized as:

```
firestore
  └── artifacts/default-nicu-app/users/{userId}/
      └── nicu_shifts/{shiftId}/
          ├── shiftDate
          ├── shiftStartTime
          ├── assignmentType
          └── babies/{babyId}/
              ├── baby data
              ├── reportSheet/main
              ├── touchTimeLogs/{logId}
              └── eventLogs/{eventId}
```

## Security

Your database is secured with:
- ✅ User isolation (each user only sees their data)
- ✅ Path-based access control
- ✅ Anonymous authentication required
- ✅ HIPAA de-identification compliant

## Next Steps

1. **Read the quick guide**: `DATABASE_SETUP_QUICKSTART.md`
2. **Review database schema**: `DATABASE_SCHEMA.md`
3. **See detailed setup**: `FIREBASE_SETUP.md`

## Available Commands

```bash
npm run setup-database    # Interactive setup wizard
npm run test-database     # Test database connection
npm run verify-firebase   # Check configuration
npm run dev               # Start development server
npm run build             # Build for production
```

## Need Help?

See troubleshooting in:
- `DATABASE_SETUP_QUICKSTART.md` - Common issues
- `FIREBASE_SETUP.md` - Detailed troubleshooting
- Firebase Console → Firestore Database → Rules (check rules are active)

---

**Time estimate**: 5-10 minutes to complete setup

**Result**: Fully functional Firebase database with secure, HIPAA-compliant data storage

🚀 Let's finish this setup!
