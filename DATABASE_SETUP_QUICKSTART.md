# Firebase Database Setup - Quick Guide

Since you've already configured anonymous authentication on Firebase, you're halfway there! Follow these steps to complete the database setup.

## Prerequisites ✓

- [x] Firebase project created
- [x] Anonymous authentication enabled
- [ ] Firestore Database enabled
- [ ] Firebase configuration obtained

## Step 1: Enable Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **"Firestore Database"** in the left sidebar
4. Click **"Create database"**
5. Choose **"Start in production mode"** (we'll deploy custom rules)
6. Select a database location (choose closest to you, **cannot be changed later**)
7. Click **"Enable"**

## Step 2: Run the Setup Script

We've created an interactive setup script to make this easy:

```bash
npm run setup-database
```

This script will:
- Guide you through entering your Firebase configuration
- Create the `.env` file with your credentials
- Update `.firebaserc` with your project ID
- Optionally deploy Firestore rules and indexes

### What You'll Need

The script will ask for your Firebase configuration. Get these values:

1. Go to Firebase Console → Your Project
2. Click gear icon ⚙️ → "Project settings"
3. Scroll to "Your apps" section
4. If you haven't added a web app yet, click the web icon (`</>`)
5. Copy these values:
   - **API Key**
   - **Auth Domain**
   - **Project ID**
   - **Storage Bucket**
   - **Messaging Sender ID**
   - **App ID**
   - **Measurement ID** (optional)

## Step 3: Deploy Firestore Configuration

If you didn't deploy during the setup script, deploy now:

```bash
# Login to Firebase CLI (if not already logged in)
firebase login

# Deploy Firestore security rules and indexes
firebase deploy --only firestore
```

This deploys:
- **Security rules** (`firestore.rules`) - Ensures each user can only access their own data
- **Indexes** (`firestore.indexes.json`) - Optimizes database queries

## Step 4: Test Your Database Connection

Verify everything is working:

```bash
npm run test-database
```

This test will:
- ✓ Check your configuration
- ✓ Initialize Firebase
- ✓ Test anonymous authentication
- ✓ Test database write operations
- ✓ Test database read operations
- ✓ Test database delete operations
- ✓ Verify security rules are working

## Step 5: Start Using the App

```bash
# Start the development server
npm run dev
```

Open your browser to `http://localhost:5173` and:
1. Create a new shift
2. Add a baby
3. Check Firebase Console → Firestore Database to see your data

## Troubleshooting

### "Permission denied" error

**Cause**: Firestore rules haven't been deployed or anonymous auth isn't enabled.

**Solution**:
```bash
firebase deploy --only firestore:rules
```

Verify in Firebase Console → Authentication → Sign-in method → Anonymous is **Enabled**.

### "API key not valid" error

**Cause**: Incorrect Firebase configuration in `.env` file.

**Solution**:
1. Delete `.env` file
2. Run `npm run setup-database` again
3. Double-check you copied the correct values from Firebase Console

### "Firebase CLI not installed" error

**Solution**:
```bash
npm install -g firebase-tools
```

### Database not showing data

**Checklist**:
1. Check browser console for errors (F12)
2. Verify user is authenticated (should see "Firebase: User signed in" in console)
3. Check Firestore rules are deployed
4. Verify Firestore is enabled in Firebase Console
5. Check your internet connection

## Database Structure

Your data will be organized like this:

```
Firestore Database
└── artifacts
    └── default-nicu-app
        └── users
            └── {your-anonymous-user-id}
                └── nicu_shifts
                    └── {shift-id}
                        ├── shiftDate
                        ├── shiftStartTime
                        ├── assignmentType
                        └── babies
                            └── {baby-id}
                                ├── babyName
                                ├── daysOld
                                ├── gestationalAge
                                ├── reportSheet
                                ├── touchTimeLogs
                                └── eventLogs
```

## Security & Privacy

The database is configured with these security features:

✓ **User Isolation**: Each user can only access their own data
✓ **Anonymous Auth**: No personal information in authentication
✓ **Path-Based Security**: Rules verify userId matches authenticated user
✓ **Encrypted**: Data encrypted in transit (HTTPS) and at rest

**Remember**: Use only de-identified patient information!
- ❌ No patient names
- ❌ No exact dates of birth
- ❌ No medical record numbers
- ✅ Use room/bed numbers or nicknames only

## What's Next?

Once your database is set up:

1. **Start building**: Create shifts, add babies, log touch times
2. **Learn more**: Read `DATABASE_SCHEMA.md` for complete data structure
3. **Deploy**: When ready, see `FIREBASE_SETUP.md` for deployment options
4. **Backup**: Consider exporting data from Firebase Console regularly

## Verification Commands

```bash
# Check setup status
npm run verify-firebase

# Test database connection
npm run test-database

# Run interactive setup
npm run setup-database

# Start development server
npm run dev

# Build for production
npm run build
```

## Need More Help?

- **Detailed Setup**: See `FIREBASE_SETUP.md`
- **Database Info**: See `DATABASE_SCHEMA.md`
- **Firebase Docs**: https://firebase.google.com/docs/firestore

---

## Quick Reference

| Task | Command |
|------|---------|
| Interactive setup | `npm run setup-database` |
| Test connection | `npm run test-database` |
| Verify setup | `npm run verify-firebase` |
| Deploy rules | `firebase deploy --only firestore` |
| Start dev server | `npm run dev` |
| Build for prod | `npm run build` |

🎉 **You're ready to go!** Your Firebase database is set up and ready to track NICU shifts.
