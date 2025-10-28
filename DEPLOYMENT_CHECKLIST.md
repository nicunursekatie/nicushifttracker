# 🚀 Deployment Checklist - NICU Shift Tracker V2

## Pre-Deployment

### ✅ 1. Verify Firebase Project Setup

- [x] Firebase project created
- [x] Firestore database enabled
- [x] Authentication enabled (Anonymous or Custom Token)
- [x] Firebase CLI installed: `npm install -g firebase-tools`
- [x] Logged into Firebase: `firebase login`
- [x] Project selected: `firebase use <project-id>`

**Verify with:**
```bash
firebase projects:list
firebase use
```

### ✅ 2. Environment Variables

- [x] `.env` file created (copy from `.env.example`)
- [x] All Firebase config values filled in:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`

**Verify with:**
```bash
cat .env | grep VITE_FIREBASE
```

### ✅ 3. Dependencies Installed

- [x] Main app dependencies installed
- [x] Cloud Functions dependencies installed

**Install:**
```bash
# Main app
npm install

# Cloud Functions
cd functions
npm install
cd ..
```

---

## Deployment Steps

### 🔒 Step 1: Deploy Security Rules

**What:** Firestore security rules that protect user data

**Deploy:**
```bash
firebase deploy --only firestore:rules
```

**Verify:**
1. Go to Firebase Console > Firestore > Rules
2. Should see updated rules with timestamps
3. Rules should include:
   - `isOwner()` function
   - `hasNoPhiFlag()` function
   - `isValidBaby()` function
   - User-scoped access patterns

**Status:**
- [x] Rules deployed successfully
- [x] Rules verified in Firebase Console
- [x] Test that users can't access other users' data

---

### ⚙️ Step 2: Deploy Cloud Functions

**What:** Three Cloud Functions for PHI validation and summary generation

**Deploy:**
```bash
firebase deploy --only functions
```

**Expected output:**
```
✔  functions: Finished running predeploy script.
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
i  functions: ensuring required API cloudbuild.googleapis.com is enabled...
✔  functions: required API cloudfunctions.googleapis.com is enabled
✔  functions: required API cloudbuild.googleapis.com is enabled
i  functions: preparing functions directory for uploading...
i  functions: packaged functions (X KB) for uploading
✔  functions: functions folder uploaded successfully
i  functions: creating Node.js 18 function validateBabyData...
i  functions: creating Node.js 18 function validateBabyDataUpdate...
i  functions: creating Node.js 18 function generateShiftSummary...
✔  functions[validateBabyData]: Successful create operation.
✔  functions[validateBabyDataUpdate]: Successful create operation.
✔  functions[generateShiftSummary]: Successful create operation.

✔  Deploy complete!
```

**Verify:**
1. Go to Firebase Console > Functions
2. Should see 3 functions:
   - `validateBabyData` (Firestore trigger)
   - `validateBabyDataUpdate` (Firestore trigger)
   - `generateShiftSummary` (HTTPS callable)
3. All should show "Healthy" status

**Status:**
- [ ] Functions deployed successfully
- [ ] All 3 functions visible in console
- [ ] All functions show "Healthy" status

**Troubleshooting:**
If deployment fails:
```bash
# Check logs
firebase functions:log

# Try deploying one at a time
firebase deploy --only functions:validateBabyData
firebase deploy --only functions:validateBabyDataUpdate
firebase deploy --only functions:generateShiftSummary
```

---

### 📊 Step 3: Deploy Firestore Indexes (Optional)

**What:** Optimize queries for better performance

**Deploy:**
```bash
firebase deploy --only firestore:indexes
```

**Status:**
- [ ] Indexes deployed (or none needed)

---

### 🌐 Step 4: Deploy Web App (If hosting on Firebase)

**What:** Host the React app on Firebase Hosting

**Build app:**
```bash
npm run build
```

**Deploy:**
```bash
firebase deploy --only hosting
```

**Verify:**
1. Open hosting URL (shown in deploy output)
2. App should load and work correctly
3. Check browser console for errors

**Status:**
- [ ] App built successfully
- [ ] App deployed to Firebase Hosting
- [ ] App loads without errors
- [ ] Authentication works
- [ ] Can create shifts and babies

---

## Post-Deployment Testing

### ✅ Test 1: PHI Validation

**Goal:** Verify Cloud Functions block PHI

**Steps:**
1. Create a new shift
2. Add a baby with the following data:

```javascript
Internal ID: Test PHI Detection
Maternal History: Mother: Jane Smith, DOB: 01/15/1990
```

3. Click "Save Baby"
4. Wait 2-3 seconds
5. Refresh the page

**Expected Result:**
- Baby should NOT appear in the list
- Check Firebase Console > Firestore > `phi_violations` collection
- Should see a violation logged

**Status:**
- [ ] PHI validation working
- [ ] Violation logged correctly

---

### ✅ Test 2: Valid Data Entry

**Goal:** Verify valid data saves correctly

**Steps:**
1. Create a new shift
2. Add a baby with valid, de-identified data:

```javascript
Internal ID: Baby Star
GA: 32 weeks, 4 days
CGA: 34 weeks, 2 days
PNA: 15 days
Maternal History: G2P2, GDM, c/s (no names)
```

3. Click "Save Baby"
4. Baby should appear immediately

**Expected Result:**
- Baby saves successfully
- Appears in baby list
- Can edit baby without issues
- No violations logged

**Status:**
- [ ] Valid data saves correctly
- [ ] Baby appears in list
- [ ] Can edit baby

---

### ✅ Test 3: Offline Persistence

**Goal:** Verify app works offline

**Steps:**
1. Open app in Chrome
2. Add a baby (goes online)
3. Open DevTools > Network tab
4. Check "Offline" checkbox
5. Try to add another baby
6. Should work without errors
7. Uncheck "Offline"
8. Verify both babies synced to Firestore

**Expected Result:**
- Can add babies while offline
- Data syncs when back online
- No data loss

**Status:**
- [ ] Offline mode works
- [ ] Data syncs correctly
- [ ] No errors in console

---

### ✅ Test 4: Server-Side Summary

**Goal:** Verify Cloud Function generates summaries

**Steps:**
1. Create a shift with 2-3 babies
2. Add report sheet data for each baby
3. Add touch time logs
4. Click "End Shift"
5. Summary should generate

**Expected Result:**
- Summary generates in < 2 seconds
- Formatted correctly
- Includes all babies
- Can copy to clipboard

**Status:**
- [ ] Summary generates successfully
- [ ] All data included
- [ ] Formatting looks good

**Troubleshooting:**
```bash
# If summary doesn't generate, check logs:
firebase functions:log --only generateShiftSummary

# Look for errors
```

---

### ✅ Test 5: Security Rules

**Goal:** Verify users can't access other users' data

**Steps:**
1. Sign in as User A
2. Create a shift
3. Note the shift ID from URL
4. Sign out and sign in as User B
5. Try to navigate to User A's shift URL

**Expected Result:**
- User B should NOT see User A's data
- Should show "Permission denied" or empty screen

**Status:**
- [ ] Security rules working
- [ ] Users can't see other users' data

---

## Monitoring Setup

### 📊 Set Up Alerts

1. **PHI Violations Alert**

Go to Firebase Console > Firestore > Create Alert:
- Collection: `phi_violations`
- Condition: Any new document
- Action: Email to admin

2. **Cloud Functions Errors**

Go to Firebase Console > Functions > Select function > Logs:
- Enable error reporting
- Set up email alerts for errors

**Status:**
- [ ] PHI violations alert configured
- [ ] Functions error alerts configured

---

### 📈 Monitor Usage

**Weekly checks:**
- [ ] Firestore read/write counts
- [ ] Cloud Functions invocation counts
- [ ] Storage usage
- [ ] PHI violations (should be zero!)

**Where to check:**
- Firestore: Firebase Console > Firestore > Usage
- Functions: Firebase Console > Functions > Usage
- Overall: Firebase Console > Project Overview

---

## Documentation

### ✅ User Documentation

- [ ] Share `NEW_FEATURES_README.md` with nurses
- [ ] Print PHI guidelines (from README)
- [ ] Create quick reference cards

### ✅ Admin Documentation

- [ ] Save `FIREBASE_V2_IMPLEMENTATION_GUIDE.md`
- [ ] Save `IMPLEMENTATION_SUMMARY.md`
- [ ] Document Firebase project credentials (securely!)

---

## Rollback Plan

If something goes wrong:

### Rollback Security Rules

```bash
# Save current rules first
firebase firestore:rules:get > firestore.rules.backup

# Restore previous version
firebase firestore:rules:release --message="Rollback"
```

### Rollback Cloud Functions

```bash
# View function history
firebase functions:log

# Delete problematic function
firebase functions:delete validateBabyData
firebase functions:delete validateBabyDataUpdate
firebase functions:delete generateShiftSummary
```

### Rollback to V1

If you need to go back to V1:

1. Keep V1 helper functions in `App.jsx`
2. Don't update to use V2 helpers
3. Disable offline persistence in `firebase-config.js`
4. Delete Cloud Functions

---

## Success Criteria

All items below should be checked:

**Security:**
- [ ] PHI validation working
- [ ] Security rules enforced
- [ ] User data isolated
- [ ] Audit trail logging

**Performance:**
- [ ] Shift summary < 2 seconds
- [ ] Offline mode working
- [ ] No slow queries
- [ ] Read counts reduced

**Functionality:**
- [ ] Can create shifts
- [ ] Can add babies
- [ ] Can edit report sheets
- [ ] Can generate summaries
- [ ] New features working (imaging, meds, feeds)

**Monitoring:**
- [ ] Alerts configured
- [ ] Usage tracking enabled
- [ ] Error logging working

---

## Go Live!

Once all checks pass:

1. [ ] Notify users of new features
2. [ ] Provide training (share NEW_FEATURES_README.md)
3. [ ] Monitor closely for first week
4. [ ] Collect user feedback
5. [ ] Iterate and improve

---

## Support Contacts

**Technical Issues:**
- Firebase Console: https://console.firebase.google.com
- Firebase Support: https://firebase.google.com/support

**Application Issues:**
- Check documentation first
- Review browser console errors
- Check Cloud Functions logs

---

## Deployment Log

**Date:** ______________
**Deployed by:** ______________
**Firebase Project ID:** ______________
**Version:** 2.0.0

**Deployment Notes:**
```
(Record any issues, special configurations, or deviations from this checklist)
```

**Sign-off:**
- [ ] Technical lead approval
- [ ] Security review complete
- [ ] User acceptance testing complete
- [ ] Ready for production use

---

**Last Updated:** October 26, 2025
**Checklist Version:** 1.0
