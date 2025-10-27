# Firestore Database Schema

This document describes the complete database schema for the NICU Shift Tracker application.

## Overview

The application uses Google Cloud Firestore, a NoSQL document database. Data is organized hierarchically with collections and documents.

## Collection Structure

```
artifacts/{appId}/users/{userId}/nicu_shifts/{shiftId}
```

### Root Level: artifacts/{appId}

- `appId`: Application identifier (default: `"default-nicu-app"`)
- Purpose: Allows multiple applications to share the same Firebase project

### User Level: users/{userId}

- `userId`: Unique user identifier from Firebase Authentication (anonymous auth)
- Purpose: Isolates data per user/device for privacy and security

### Shifts Collection: nicu_shifts/{shiftId}

Each shift document contains:

```typescript
{
  shiftId: string,           // Auto-generated document ID
  shiftDate: string,         // ISO date format: "YYYY-MM-DD"
  shiftStartTime: string,    // 24-hour format: "07:00" or "19:00"
  assignmentType: string,    // "ICU" or "Intermediate"
  createdAt: timestamp,      // When shift was created
  updatedAt: timestamp       // Last modification time
}
```

### Babies Subcollection: nicu_shifts/{shiftId}/babies/{babyId}

Each baby document contains:

```typescript
{
  babyId: string,                 // Auto-generated document ID
  babyName: string,               // De-identified ID (e.g., "R3B1", "Baby Star")
  q3StartTime: string,            // Touch time start: "07:00", "08:00", or "09:00"
  
  // Age Information
  daysOld: number,                // Post-natal age (PNA) in days
  gestationalAge: string,         // GA in format: "32w 4d"
  correctedAge: string,           // CGA in format: "36w 2d"
  
  // Apgar Scores
  apgar1: number,                 // Apgar at 1 minute (0-10)
  apgar5: number,                 // Apgar at 5 minutes (0-10)
  
  // Growth Data
  weight: number,                 // Weight in grams
  length: number,                 // Length in cm
  headCirc: number,               // Head circumference in cm
  abdGirth: number,               // Abdominal girth in cm
  
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Report Sheet: babies/{babyId}/reportSheet/main

Single document containing all report sheet data:

```typescript
{
  // Maternal History
  maternalHistory: string,        // Free text: mother's background, complications
  
  // Current Problems
  currentProblems: string,        // Free text: diagnoses, current issues
  
  // Respiratory Support
  respiratory: {
    mode: string,                 // "Room Air", "Nasal Cannula", "CPAP", "Ventilator", etc.
    flow: string,                 // Flow rate (e.g., "2L")
    fiO2: string,                 // Oxygen percentage (e.g., "21%", "30%")
    bloodGasSchedule: string,     // When gases are due
    additionalNotes: string
  },
  
  // Feeds
  feeds: {
    route: string,                // "PO", "NG", "OG", "NPO"
    feedType: string,             // "Breast milk", "Formula", "Fortified BM"
    calories: string,             // Cal/oz (e.g., "20", "24", "30")
    volume: string,               // Amount per feed (e.g., "45ml")
    nippleType: string,           // For bottle feeds
    specialInstructions: string   // Feeding notes
  },
  
  // IV Fluids and Lines
  ivFluidsLines: {
    hasPeripheralIV: boolean,
    peripheralIVDetails: string,
    
    hasPICC: boolean,
    piccDetails: {
      circumference: string,      // Insertion site circumference
      lineOut: string,            // How much line is visible
      additionalNotes: string
    },
    
    hasUVC: boolean,
    uvcDetails: {
      lengthVisible: string,      // How much line is visible
      proximalLumen: string,      // What's running in proximal lumen
      distalLumen: string,        // What's running in distal lumen
      additionalNotes: string
    },
    
    hasUAC: boolean,
    uacDetails: {
      lengthVisible: string,
      fluids: string,             // What's running
      additionalNotes: string
    }
  },
  
  // Medications
  medications: [
    {
      name: string,               // Medication name
      dose: string,               // Dose and frequency
      route: string,              // Administration route
      times: string,              // When to give
      notes: string               // Additional notes
    }
  ],
  
  // Labs
  labs: string,                   // Free text: ordered labs and results
  
  // Treatment Plan
  treatmentPlan: string,          // Free text: care plan and goals
  
  // Additional Notes
  notes: string,                  // Free text: any other important info
  
  // Intermediate Assignment Specific Fields
  feedingProgression: string,     // Feeding goals and progress (Intermediate only)
  dischargePlanning: string,      // Discharge criteria and goals (Intermediate only)
  parentTeaching: string,         // Parent involvement notes (Intermediate only)
  growthGoals: string,            // Weight gain goals (Intermediate only)
  
  updatedAt: timestamp
}
```

### Touch Time Logs: babies/{babyId}/touchTimeLogs/{logId}

Each log entry for q3 care:

```typescript
{
  logId: string,                  // Auto-generated document ID
  timestamp: timestamp,           // When log was created
  scheduledTime: string,          // The scheduled q3 time: "07:00", "10:00", etc.
  
  // Vital Signs
  temp: string,                   // Temperature (e.g., "36.8", "98.2F")
  heartRate: string,              // Heart rate (e.g., "145")
  respRate: string,               // Respiratory rate (e.g., "45")
  spO2: string,                   // Oxygen saturation (e.g., "98%")
  
  // Feeding
  feedVolume: string,             // Amount fed (e.g., "45ml", "All")
  feedRoute: string,              // How fed: "PO", "NG", "OG"
  feedTolerance: string,          // How baby tolerated feed
  residual: string,               // Gastric residual (e.g., "0ml", "2ml")
  
  // Diaper
  diaper: string,                 // Output: "U", "B", "M", "UB", "UM", "BM", "UBM"
  
  // Positioning and Care
  positioning: string,            // Baby position: "Supine", "Prone", "Side-lying"
  lineCheck: string,              // IV line status: "Patent", "Infiltrated", etc.
  
  // Additional Notes
  comments: string,               // Any additional observations
  
  createdAt: timestamp
}
```

### Event Logs: babies/{babyId}/eventLogs/{eventId}

Timestamped events throughout the shift:

```typescript
{
  eventId: string,                // Auto-generated document ID
  timestamp: timestamp,           // When event occurred (or was logged)
  
  eventType: string,              // Type of event:
                                  // - "Desat/Brady"
                                  // - "Medication"
                                  // - "Lab Draw"
                                  // - "Procedure"
                                  // - "Parent Visit"
                                  // - "MD/NP Contact"
                                  // - "General Note"
  
  details: string,                // Event description and details
  
  // Optional fields based on event type
  medicationName?: string,        // For medication events
  labType?: string,               // For lab events
  procedureType?: string,         // For procedure events
  
  createdAt: timestamp
}
```

## Indexes

### Required Indexes

Firestore indexes are defined in `firestore.indexes.json`:

1. **Shifts by date and time** (for sorting):
   - Collection: `nicu_shifts`
   - Fields: `shiftDate` (DESC), `shiftStartTime` (DESC)

2. **Touch time logs by timestamp** (for chronological display):
   - Collection: `touchTimeLogs`
   - Field: `timestamp` (ASC)

3. **Event logs by timestamp** (for recent-first display):
   - Collection: `eventLogs`
   - Field: `timestamp` (DESC)

### Deploying Indexes

```bash
firebase deploy --only firestore:indexes
```

## Security Rules

Security rules are defined in `firestore.rules` to ensure:

1. **User Isolation**: Each user can only access their own data
2. **Authentication Required**: All operations require an authenticated user
3. **Path-based Access Control**: Rules verify userId in path matches authenticated user

Key rules:
- Users can read/write: `/artifacts/{appId}/users/{userId}/**` where `userId == request.auth.uid`
- Anonymous authentication is required for all operations
- No cross-user data access is possible

### Deploying Rules

```bash
firebase deploy --only firestore:rules
```

## Data Access Patterns

### Reading Data

1. **Get all shifts for a user**:
   ```javascript
   const shiftsRef = collection(db, `artifacts/${appId}/users/${userId}/nicu_shifts`);
   const shiftsSnapshot = await getDocs(shiftsRef);
   ```

2. **Get a specific shift**:
   ```javascript
   const shiftRef = doc(db, `artifacts/${appId}/users/${userId}/nicu_shifts/${shiftId}`);
   const shiftDoc = await getDoc(shiftRef);
   ```

3. **Get all babies in a shift**:
   ```javascript
   const babiesRef = collection(db, `artifacts/${appId}/users/${userId}/nicu_shifts/${shiftId}/babies`);
   const babiesSnapshot = await getDocs(babiesRef);
   ```

4. **Get touch time logs for a baby**:
   ```javascript
   const logsRef = collection(db, `artifacts/${appId}/users/${userId}/nicu_shifts/${shiftId}/babies/${babyId}/touchTimeLogs`);
   const q = query(logsRef, orderBy('timestamp', 'asc'));
   const logsSnapshot = await getDocs(q);
   ```

### Writing Data

1. **Create a new shift**:
   ```javascript
   const shiftsRef = collection(db, `artifacts/${appId}/users/${userId}/nicu_shifts`);
   const newShiftRef = await addDoc(shiftsRef, {
     shiftDate: '2024-01-15',
     shiftStartTime: '07:00',
     assignmentType: 'ICU',
     createdAt: serverTimestamp()
   });
   ```

2. **Update a shift**:
   ```javascript
   const shiftRef = doc(db, `artifacts/${appId}/users/${userId}/nicu_shifts/${shiftId}`);
   await updateDoc(shiftRef, {
     updatedAt: serverTimestamp()
   });
   ```

3. **Add a baby to a shift**:
   ```javascript
   const babiesRef = collection(db, `artifacts/${appId}/users/${userId}/nicu_shifts/${shiftId}/babies`);
   await addDoc(babiesRef, {
     babyName: 'R3B1',
     q3StartTime: '07:00',
     // ... other fields
     createdAt: serverTimestamp()
   });
   ```

4. **Add a touch time log**:
   ```javascript
   const logsRef = collection(db, `artifacts/${appId}/users/${userId}/nicu_shifts/${shiftId}/babies/${babyId}/touchTimeLogs`);
   await addDoc(logsRef, {
     scheduledTime: '10:00',
     timestamp: serverTimestamp(),
     temp: '36.8',
     // ... other fields
   });
   ```

### Deleting Data

1. **Delete entire shift with all subcollections**:
   ```javascript
   // Must delete subcollections first (Firestore doesn't cascade delete)
   // Use a batch write for efficiency
   const batch = writeBatch(db);
   
   // Delete all babies and their subcollections
   const babiesRef = collection(db, `artifacts/${appId}/users/${userId}/nicu_shifts/${shiftId}/babies`);
   const babiesSnapshot = await getDocs(babiesRef);
   
   for (const babyDoc of babiesSnapshot.docs) {
     // Delete touch time logs
     const logsRef = collection(babyDoc.ref, 'touchTimeLogs');
     const logsSnapshot = await getDocs(logsRef);
     logsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
     
     // Delete event logs
     const eventsRef = collection(babyDoc.ref, 'eventLogs');
     const eventsSnapshot = await getDocs(eventsRef);
     eventsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
     
     // Delete report sheet
     const reportRef = doc(babyDoc.ref, 'reportSheet/main');
     batch.delete(reportRef);
     
     // Delete baby
     batch.delete(babyDoc.ref);
   }
   
   // Delete shift
   const shiftRef = doc(db, `artifacts/${appId}/users/${userId}/nicu_shifts/${shiftId}`);
   batch.delete(shiftRef);
   
   await batch.commit();
   ```

## Data Size Considerations

### Document Size Limits

- Maximum document size: 1 MB
- Maximum field name length: 1,500 bytes
- Maximum field value size: 1 MB

### Best Practices

1. **Keep report sheet documents under 100 KB** for optimal performance
2. **Use subcollections** for data that grows unbounded (touch time logs, event logs)
3. **Avoid deeply nested objects** (max 20 levels, but stay under 5 for readability)
4. **Use arrays sparingly** (medications array is fine as it's small and bounded)

## Queries and Performance

### Optimized Queries

1. **Always order subcollections** when displaying:
   - Touch time logs: `orderBy('timestamp', 'asc')`
   - Event logs: `orderBy('timestamp', 'desc')`

2. **Limit results** when appropriate:
   - Recent shifts: `limit(10)`
   - Latest events: `orderBy('timestamp', 'desc').limit(20)`

3. **Use real-time listeners** for active shift data:
   ```javascript
   onSnapshot(shiftRef, (snapshot) => {
     // Update UI with latest data
   });
   ```

## Migration and Versioning

### Schema Version

Current schema version: `1.0`

If schema changes are needed in the future:
1. Add a `schemaVersion` field to documents
2. Implement migration logic to update old documents
3. Support backward compatibility where possible

## Backup and Export

### Manual Backup

Export data from Firebase Console:
1. Go to Firestore Database
2. Click "Export data"
3. Select collections to export
4. Choose Cloud Storage bucket

### Programmatic Backup

Use Firebase Admin SDK to export collections programmatically for backup purposes.

## Privacy and Compliance

### De-identification

All stored data should be de-identified:
- ❌ No patient names
- ❌ No exact dates of birth
- ❌ No medical record numbers
- ✅ Use room/bed numbers or nicknames
- ✅ Store ages (calculated), not birthdates

### Data Retention

Recommended practice:
1. Delete shifts after copying to hospital system
2. Don't store historical shifts beyond current shift
3. Use "End Shift / Delete" feature at shift completion

### Encryption

- Data encrypted in transit (HTTPS)
- Data encrypted at rest (Google Cloud infrastructure)
- User isolation via security rules
- Anonymous authentication (no PII in auth)

---

## Summary

The NICU Shift Tracker uses a hierarchical Firestore structure that:
- ✅ Isolates data per user for privacy
- ✅ Organizes data logically (shifts → babies → logs)
- ✅ Scales efficiently with subcollections
- ✅ Supports real-time updates
- ✅ Enforces security via rules
- ✅ Maintains HIPAA de-identification requirements

For implementation details, see:
- `FIREBASE_SETUP.md` - Setup instructions
- `firestore.rules` - Security rules
- `firestore.indexes.json` - Database indexes
- `src/App.jsx` - Data access implementation
