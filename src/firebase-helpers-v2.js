/**
 * Firebase Firestore Helper Functions - Version 2 (Flattened Structure)
 *
 * This refactored version uses a flattened data structure with embedded arrays
 * to reduce Firestore reads and improve performance.
 *
 * Key Changes from V1:
 * - touchTimeLogs and eventLogs are now arrays within the baby document
 * - reportSheet data is now directly within the baby document
 * - Eliminates N+1 query pattern (was 4N reads, now N reads)
 * - Better suited for bounded data (8 touch times per shift)
 *
 * New Baby Document Structure:
 * {
 *   // Demographics
 *   internalID_Nickname: string,
 *   gestationalAge_Weeks: number,
 *   ...
 *
 *   // Report Sheet (inline, not subcollection)
 *   reportSheet: {
 *     maternalHistory: string,
 *     currentProblems: string,
 *     respiratoryMode: string,
 *     ...
 *   },
 *
 *   // Touch Time Logs (array, not subcollection)
 *   touchTimeLogs: [
 *     {
 *       timestamp: ISO string,
 *       scheduledTime: string,
 *       vitals: { temp, hr, rr, spo2 },
 *       completed: boolean
 *     }
 *   ],
 *
 *   // Event Logs (array, not subcollection)
 *   eventLogs: [
 *     {
 *       timestamp: ISO string,
 *       eventType: string,
 *       eventDetails: string
 *     }
 *   ]
 * }
 */

import {
  doc,
  collection,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';

/**
 * Collection path helper for user-scoped data
 */
export const getUserCollectionPath = (db, appId, userId) => {
  return doc(collection(db, 'artifacts', appId, 'users'), userId);
};

// ==========================================
// SHIFT OPERATIONS
// ==========================================

/**
 * Fetches all shifts for the current user
 * @param {Firestore} db - Firestore instance
 * @param {string} appId - Application ID
 * @param {string} userId - User ID
 * @param {Function} callback - Callback function to receive shifts array
 * @returns {Function} Unsubscribe function
 */
export const getShifts = (db, appId, userId, callback) => {
  if (!db || !userId) return () => {};

  const shiftsRef = collection(getUserCollectionPath(db, appId, userId), 'nicu_shifts');
  const q = query(shiftsRef);

  return onSnapshot(q, (snapshot) => {
    const shifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort by date and time (newest first)
    shifts.sort((a, b) => {
      const dateA = new Date(a.shiftDate + 'T' + a.shiftStartTime);
      const dateB = new Date(b.shiftDate + 'T' + b.shiftStartTime);
      return dateB - dateA;
    });

    callback(shifts);
  });
};

/**
 * Adds a new shift
 * @param {Firestore} db
 * @param {string} appId
 * @param {string} userId
 * @param {Object} shiftData - Shift information (date, startTime, assignmentType)
 * @returns {Promise<DocumentReference>}
 */
export const addShift = async (db, appId, userId, shiftData) => {
  if (!db || !userId) throw new Error('Missing db or userId');

  const shiftsRef = collection(getUserCollectionPath(db, appId, userId), 'nicu_shifts');

  const shiftWithMetadata = {
    ...shiftData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  return await addDoc(shiftsRef, shiftWithMetadata);
};

/**
 * Updates an existing shift
 */
export const updateShift = async (db, appId, userId, shiftId, shiftData) => {
  if (!db || !userId || !shiftId) throw new Error('Missing required parameters');

  const shiftRef = doc(
    collection(getUserCollectionPath(db, appId, userId), 'nicu_shifts'),
    shiftId
  );

  return await updateDoc(shiftRef, {
    ...shiftData,
    updatedAt: serverTimestamp()
  });
};

/**
 * Deletes a shift and all its babies (simplified with flattened structure)
 * @param {Firestore} db
 * @param {string} appId
 * @param {string} userId
 * @param {string} shiftId
 * @returns {Promise<void>}
 */
export const deleteShift = async (db, appId, userId, shiftId) => {
  if (!db || !userId || !shiftId) throw new Error('Missing required parameters');

  const shiftRef = doc(
    collection(getUserCollectionPath(db, appId, userId), 'nicu_shifts'),
    shiftId
  );

  // Fetch all babies in the shift
  const babiesQuery = query(collection(shiftRef, 'babies'));
  const babiesSnapshot = await getDocs(babiesQuery);

  // Use a write batch for atomic deletion
  const batch = writeBatch(db);

  // Delete all baby documents (no subcollections to worry about!)
  babiesSnapshot.docs.forEach(babyDoc => {
    batch.delete(babyDoc.ref);
  });

  // Delete the shift document
  batch.delete(shiftRef);

  // Commit the batch
  await batch.commit();
  console.log(`Shift ${shiftId} and ${babiesSnapshot.docs.length} babies deleted.`);
};

// ==========================================
// BABY OPERATIONS
// ==========================================

/**
 * Fetches babies for a specific shift
 * NOW INCLUDES: demographics, reportSheet, touchTimeLogs, and eventLogs (all in one read!)
 */
export const getBabies = (db, appId, userId, shiftId, callback) => {
  if (!db || !userId || !shiftId) return () => {};

  const babiesRef = collection(
    getUserCollectionPath(db, appId, userId),
    'nicu_shifts',
    shiftId,
    'babies'
  );

  const q = query(babiesRef, orderBy('internalID_Nickname'));

  return onSnapshot(q, (snapshot) => {
    const babies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(babies);
  });
};

/**
 * Adds a new baby to a shift
 */
export const addBaby = async (db, appId, userId, shiftId, babyData) => {
  if (!db || !userId || !shiftId) throw new Error('Missing required parameters');

  const babiesRef = collection(
    getUserCollectionPath(db, appId, userId),
    'nicu_shifts',
    shiftId,
    'babies'
  );

  // Initialize baby with empty arrays and reportSheet object
  const babyWithDefaults = {
    ...babyData,
    reportSheet: babyData.reportSheet || {},
    touchTimeLogs: babyData.touchTimeLogs || [],
    eventLogs: babyData.eventLogs || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  return await addDoc(babiesRef, babyWithDefaults);
};

/**
 * Updates baby demographics or basic info
 */
export const updateBaby = async (db, appId, userId, shiftId, babyId, babyData) => {
  if (!db || !userId || !shiftId || !babyId) throw new Error('Missing required parameters');

  const babyRef = doc(
    collection(getUserCollectionPath(db, appId, userId), 'nicu_shifts', shiftId, 'babies'),
    babyId
  );

  return await updateDoc(babyRef, {
    ...babyData,
    updatedAt: serverTimestamp()
  });
};

/**
 * Deletes a baby
 */
export const deleteBaby = async (db, appId, userId, shiftId, babyId) => {
  if (!db || !userId || !shiftId || !babyId) throw new Error('Missing required parameters');

  const babyRef = doc(
    collection(getUserCollectionPath(db, appId, userId), 'nicu_shifts', shiftId, 'babies'),
    babyId
  );

  await deleteDoc(babyRef);
};

// ==========================================
// REPORT SHEET OPERATIONS (Now embedded in baby doc)
// ==========================================

/**
 * Fetches a baby's report sheet
 * NOTE: In V2, reportSheet is embedded in the baby document
 * This function subscribes to the baby doc and extracts reportSheet
 */
export const getReportSheet = (db, appId, userId, shiftId, babyId, callback) => {
  if (!db || !userId || !shiftId || !babyId) return () => {};

  const babyRef = doc(
    collection(getUserCollectionPath(db, appId, userId), 'nicu_shifts', shiftId, 'babies'),
    babyId
  );

  return onSnapshot(babyRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().reportSheet || {});
    } else {
      callback({});
    }
  });
};

/**
 * Updates a baby's report sheet
 * Uses merge to update only changed fields
 */
export const setReportSheet = async (db, appId, userId, shiftId, babyId, reportData) => {
  if (!db || !userId || !shiftId || !babyId) throw new Error('Missing required parameters');

  const babyRef = doc(
    collection(getUserCollectionPath(db, appId, userId), 'nicu_shifts', shiftId, 'babies'),
    babyId
  );

  // Update the reportSheet field within the baby document
  return await updateDoc(babyRef, {
    reportSheet: reportData,
    updatedAt: serverTimestamp()
  });
};

// ==========================================
// TOUCH TIME LOG OPERATIONS (Now embedded array)
// ==========================================

/**
 * Fetches touch time logs for a baby
 * In V2, these are stored as an array in the baby document
 */
export const getTouchTimeLogs = (db, appId, userId, shiftId, babyId, callback) => {
  if (!db || !userId || !shiftId || !babyId) return () => {};

  const babyRef = doc(
    collection(getUserCollectionPath(db, appId, userId), 'nicu_shifts', shiftId, 'babies'),
    babyId
  );

  return onSnapshot(babyRef, (docSnap) => {
    if (docSnap.exists()) {
      const logs = docSnap.data().touchTimeLogs || [];
      // Sort by timestamp (ascending)
      logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      // Add synthetic IDs based on index for compatibility
      const logsWithIds = logs.map((log, index) => ({ ...log, id: index.toString() }));
      callback(logsWithIds);
    } else {
      callback([]);
    }
  });
};

/**
 * Adds a touch time log for a baby
 * Uses arrayUnion to append to the touchTimeLogs array
 */
export const addTouchTimeLog = async (db, appId, userId, shiftId, babyId, logData) => {
  if (!db || !userId || !shiftId || !babyId) throw new Error('Missing required parameters');

  const babyRef = doc(
    collection(getUserCollectionPath(db, appId, userId), 'nicu_shifts', shiftId, 'babies'),
    babyId
  );

  // Add the log to the touchTimeLogs array
  return await updateDoc(babyRef, {
    touchTimeLogs: arrayUnion(logData),
    updatedAt: serverTimestamp()
  });
};

/**
 * Updates a touch time log
 * NOTE: Arrays don't support direct index updates in Firestore
 * We need to read the array, modify it, and write it back
 */
export const updateTouchTimeLog = async (db, appId, userId, shiftId, babyId, logIndex, logData) => {
  if (!db || !userId || !shiftId || !babyId) throw new Error('Missing required parameters');

  const babyRef = doc(
    collection(getUserCollectionPath(db, appId, userId), 'nicu_shifts', shiftId, 'babies'),
    babyId
  );

  // Read current data
  const babySnap = await getDocs(query(collection(babyRef.parent), where('__name__', '==', babyId)));
  const baby = babySnap.docs[0]?.data();

  if (!baby || !baby.touchTimeLogs) {
    throw new Error('Baby or touchTimeLogs not found');
  }

  // Update the specific log
  const updatedLogs = [...baby.touchTimeLogs];
  updatedLogs[logIndex] = { ...updatedLogs[logIndex], ...logData };

  // Write back
  return await updateDoc(babyRef, {
    touchTimeLogs: updatedLogs,
    updatedAt: serverTimestamp()
  });
};

// ==========================================
// EVENT LOG OPERATIONS (Now embedded array)
// ==========================================

/**
 * Fetches event logs for a baby
 */
export const getEventLogs = (db, appId, userId, shiftId, babyId, callback) => {
  if (!db || !userId || !shiftId || !babyId) return () => {};

  const babyRef = doc(
    collection(getUserCollectionPath(db, appId, userId), 'nicu_shifts', shiftId, 'babies'),
    babyId
  );

  return onSnapshot(babyRef, (docSnap) => {
    if (docSnap.exists()) {
      const events = docSnap.data().eventLogs || [];
      // Sort by timestamp (ascending)
      events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      // Add synthetic IDs for compatibility
      const eventsWithIds = events.map((event, index) => ({ ...event, id: index.toString() }));
      callback(eventsWithIds);
    } else {
      callback([]);
    }
  });
};

/**
 * Adds an event log for a baby
 */
export const addEventLog = async (db, appId, userId, shiftId, babyId, eventData) => {
  if (!db || !userId || !shiftId || !babyId) throw new Error('Missing required parameters');

  const babyRef = doc(
    collection(getUserCollectionPath(db, appId, userId), 'nicu_shifts', shiftId, 'babies'),
    babyId
  );

  return await updateDoc(babyRef, {
    eventLogs: arrayUnion(eventData),
    updatedAt: serverTimestamp()
  });
};

/**
 * Deletes an event log
 */
export const deleteEventLog = async (db, appId, userId, shiftId, babyId, eventData) => {
  if (!db || !userId || !shiftId || !babyId) throw new Error('Missing required parameters');

  const babyRef = doc(
    collection(getUserCollectionPath(db, appId, userId), 'nicu_shifts', shiftId, 'babies'),
    babyId
  );

  return await updateDoc(babyRef, {
    eventLogs: arrayRemove(eventData),
    updatedAt: serverTimestamp()
  });
};

// ==========================================
// SUMMARY GENERATION HELPER
// ==========================================

/**
 * Fetches all data for shift summary generation
 * In V2, this is MUCH more efficient - just fetch all babies (1 query!)
 *
 * @returns {Promise<Object>} { shift, babies }
 */
export const fetchShiftSummaryData = async (db, appId, userId, shiftId) => {
  if (!db || !userId || !shiftId) throw new Error('Missing required parameters');

  const shiftRef = doc(
    collection(getUserCollectionPath(db, appId, userId), 'nicu_shifts'),
    shiftId
  );

  const babiesRef = collection(shiftRef, 'babies');

  // Fetch shift and babies in parallel
  const [shiftSnap, babiesSnap] = await Promise.all([
    getDocs(query(collection(shiftRef.parent), where('__name__', '==', shiftId))),
    getDocs(babiesRef)
  ]);

  const shift = shiftSnap.docs[0]?.data();
  const babies = babiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return { shift, babies };
};
