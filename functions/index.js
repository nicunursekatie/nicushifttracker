/**
 * Cloud Functions for NICU Shift Tracker
 *
 * Functions:
 * 1. validateBabyData - Validates baby documents for PHI on creation
 * 2. validateBabyDataUpdate - Validates baby documents for PHI on updates
 * 3. generateShiftSummary - Generates formatted shift summary (server-side)
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// ==========================================
// PHI DETECTION PATTERNS
// ==========================================

/**
 * Regular expression patterns to detect potential PHI
 * These patterns attempt to identify common PHI elements
 */
const PHI_PATTERNS = {
  // Patient names (basic pattern - catches "First Last" format)
  fullName: /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g,

  // Medical Record Numbers
  mrn: /\b(MRN|mrn|#|medical\s*record)\s*:?\s*\d{6,}/gi,

  // Dates of Birth (various formats)
  dob: /\b(DOB|dob|born|birth|birthday)\s*:?\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/gi,

  // Social Security Numbers
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,

  // Phone Numbers (10-digit patterns)
  phone: /\b\d{3}[-\.\s]?\d{3}[-\.\s]?\d{4}\b/g,

  // Email addresses (non-hospital domains)
  // Allow @hospital.org, @healthsystem.com, etc.
  personalEmail: /\b[a-zA-Z0-9._%+-]+@(?!(hospital|healthsystem|medical|nicu))[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi,

  // Specific calendar dates (beyond DOL/PNA references)
  exactDate: /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,

  // Full addresses
  address: /\b\d+\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way)\b/gi
};

/**
 * Detect PHI in a text string
 * @param {string} text - Text to scan
 * @returns {Array|null} Array of violations or null if none found
 */
function detectPHI(text) {
  if (!text || typeof text !== 'string') return null;

  const violations = [];

  for (const [type, pattern] of Object.entries(PHI_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches) {
      // Filter false positives for certain types
      if (type === 'fullName') {
        // Filter out medical terms that look like names
        const filtered = matches.filter(match => {
          const lower = match.toLowerCase();
          return !lower.includes('room') &&
                 !lower.includes('blood') &&
                 !lower.includes('heart') &&
                 !lower.startsWith('baby ');
        });

        if (filtered.length > 0) {
          violations.push({
            type,
            count: filtered.length,
            sample: filtered[0].substring(0, 15) + '...'
          });
        }
      } else {
        violations.push({
          type,
          count: matches.length,
          sample: matches[0].substring(0, 20) + '...'
        });
      }
    }
  }

  return violations.length > 0 ? violations : null;
}

/**
 * Recursively scan a document object for PHI
 * @param {Object} data - Document data
 * @param {string} path - Current path in document (for reporting)
 * @returns {Array} Array of findings
 */
function scanForPHI(data, path = '') {
  const findings = [];

  if (!data || typeof data !== 'object') return findings;

  for (const [key, value] of Object.entries(data)) {
    const currentPath = path ? `${path}.${key}` : key;

    // Skip certain fields that are allowed to have complex data
    if (key === 'createdAt' || key === 'updatedAt' || key === '_') continue;

    if (typeof value === 'string') {
      const phi = detectPHI(value);
      if (phi) {
        findings.push({
          field: currentPath,
          violations: phi
        });
      }
    } else if (Array.isArray(value)) {
      // Scan array elements
      value.forEach((item, index) => {
        if (typeof item === 'object') {
          findings.push(...scanForPHI(item, `${currentPath}[${index}]`));
        } else if (typeof item === 'string') {
          const phi = detectPHI(item);
          if (phi) {
            findings.push({
              field: `${currentPath}[${index}]`,
              violations: phi
            });
          }
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      findings.push(...scanForPHI(value, currentPath));
    }
  }

  return findings;
}

// ==========================================
// CLOUD FUNCTION: Validate Baby Data (onCreate)
// ==========================================

/**
 * Validates baby documents for PHI when created
 * Deletes the document if PHI is detected
 */
exports.validateBabyData = functions.firestore
  .document('artifacts/{appId}/users/{userId}/nicu_shifts/{shiftId}/babies/{babyId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const { appId, userId, shiftId, babyId } = context.params;

    console.log(`Validating new baby: ${babyId} in shift ${shiftId}`);

    // Scan for PHI
    const phiFindings = scanForPHI(data);

    if (phiFindings.length > 0) {
      console.warn(`PHI detected in baby ${babyId}:`, phiFindings);

      // Log violation for audit trail
      await admin.firestore()
        .collection('phi_violations')
        .add({
          appId,
          userId,
          shiftId,
          babyId,
          documentType: 'baby',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          findings: phiFindings,
          action: 'deleted',
          severity: 'high'
        });

      // Delete the document (block the write)
      await snap.ref.delete();

      console.log(`Baby document ${babyId} deleted due to PHI detection`);

      return {
        status: 'blocked',
        reason: 'PHI detected',
        findings: phiFindings.map(f => f.field)
      };
    }

    console.log(`Baby ${babyId} validated successfully - no PHI detected`);
    return { status: 'approved' };
  });

// ==========================================
// CLOUD FUNCTION: Validate Baby Data (onUpdate)
// ==========================================

/**
 * Validates baby documents for PHI when updated
 * Rolls back to previous version if PHI is detected
 */
exports.validateBabyDataUpdate = functions.firestore
  .document('artifacts/{appId}/users/{userId}/nicu_shifts/{shiftId}/babies/{babyId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const { appId, userId, shiftId, babyId } = context.params;

    console.log(`Validating update to baby: ${babyId}`);

    // Scan for PHI
    const phiFindings = scanForPHI(newData);

    if (phiFindings.length > 0) {
      console.warn(`PHI detected in baby update ${babyId}:`, phiFindings);

      // Log violation
      await admin.firestore()
        .collection('phi_violations')
        .add({
          appId,
          userId,
          shiftId,
          babyId,
          documentType: 'baby',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          findings: phiFindings,
          action: 'rollback',
          severity: 'high'
        });

      // Rollback to previous version
      await change.after.ref.set(oldData, { merge: false });

      console.log(`Baby document ${babyId} rolled back due to PHI detection`);

      return {
        status: 'rolled_back',
        reason: 'PHI detected in update',
        findings: phiFindings.map(f => f.field)
      };
    }

    console.log(`Baby update ${babyId} validated successfully`);
    return { status: 'approved' };
  });

// ==========================================
// CLOUD FUNCTION: Generate Shift Summary
// ==========================================

/**
 * Generates a comprehensive shift summary
 * Callable function - invoked from client
 */
exports.generateShiftSummary = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to generate summaries'
    );
  }

  const { appId, shiftId } = data;
  const userId = context.auth.uid;

  if (!appId || !shiftId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'appId and shiftId are required'
    );
  }

  try {
    console.log(`Generating summary for shift ${shiftId}, user ${userId}`);

    // Fetch shift document
    const shiftRef = admin.firestore()
      .doc(`artifacts/${appId}/users/${userId}/nicu_shifts/${shiftId}`);

    const shiftSnap = await shiftRef.get();

    if (!shiftSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Shift not found');
    }

    const shift = shiftSnap.data();

    // Fetch all babies in the shift
    const babiesSnap = await admin.firestore()
      .collection(`artifacts/${appId}/users/${userId}/nicu_shifts/${shiftId}/babies`)
      .get();

    const babies = babiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Generate formatted summary
    let summary = `=== NICU SHIFT REPORT SUMMARY ===\n\n`;
    summary += `Shift Date: ${shift.shiftDate}\n`;
    summary += `Shift Start Time: ${shift.shiftStartTime}\n`;
    summary += `Assignment Type: ${shift.assignmentType}\n`;
    summary += `Total Babies: ${babies.length}\n\n`;
    summary += `=================================\n\n`;

    // Generate summary for each baby
    for (const baby of babies) {
      summary += `\n--- Baby: ${baby.internalID_Nickname} ---\n`;
      summary += `  GA: ${baby.gestationalAge_Weeks}+${baby.gestationalAge_Days} weeks\n`;
      summary += `  CGA: ${baby.correctedGestationalAge_Weeks}+${baby.correctedGestationalAge_Days} weeks\n`;
      summary += `  PNA: Day ${baby.pna_Days}\n`;
      summary += `  Bed: ${baby.bedRoomNumber || 'N/A'}\n`;
      summary += `  Birth Wt: ${baby.birthWeight || 'N/A'}g | Last Wt: ${baby.lastWeight || 'N/A'}g\n`;

      // Report Sheet
      if (baby.reportSheet) {
        const rs = baby.reportSheet;
        summary += `\n  -- Clinical Summary --\n`;
        summary += `  Maternal Hx: ${rs.maternalHistory || 'N/A'}\n`;
        summary += `  Current Problems: ${rs.currentProblems || 'N/A'}\n`;
        summary += `  Respiratory: ${rs.respiratoryMode || 'N/A'}`;
        if (rs.respiratoryFlow) summary += ` @ ${rs.respiratoryFlow}L/min`;
        if (rs.respiratoryFiO2) summary += `, FiO2 ${rs.respiratoryFiO2}%`;
        summary += `\n`;

        summary += `  Feeds: ${rs.feedsRoute || 'N/A'} | ${rs.feedType || 'N/A'} ${rs.feedCalories || ''}`;
        if (rs.feedVolume) summary += ` ${rs.feedVolume}ml`;
        summary += `\n`;

        if (rs.bottleNippleType) {
          summary += `  Bottle/Nipple: ${rs.bottleNippleType}\n`;
        }

        // Medications
        if (rs.medications) {
          const medList = Object.entries(rs.medications)
            .filter(([key, val]) => val === true && key !== 'otherMedications')
            .map(([key]) => key);

          if (medList.length > 0 || rs.medications.otherMedications) {
            summary += `  Medications: `;
            if (medList.length > 0) summary += medList.join(', ');
            if (rs.medications.otherMedications) {
              summary += (medList.length > 0 ? ', ' : '') + rs.medications.otherMedications;
            }
            summary += `\n`;
          }
        }

        if (rs.labsOrdered) summary += `  Labs: ${rs.labsOrdered}\n`;
        if (rs.treatmentPlan) summary += `  Tx Plan: ${rs.treatmentPlan}\n`;
      }

      // Touch Time Logs
      if (baby.touchTimeLogs && baby.touchTimeLogs.length > 0) {
        summary += `\n  -- Touch Time Logs (${baby.touchTimeLogs.length}) --\n`;
        baby.touchTimeLogs
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          .forEach(log => {
            if (log.completed) {
              summary += `    ${log.scheduledTime}: `;
              summary += `T:${log.temp || 'N/A'} HR:${log.hr || 'N/A'} `;
              summary += `RR:${log.rr || 'N/A'} SpO2:${log.spo2 || 'N/A'}`;
              if (log.feedVolume) summary += ` | Feed: ${log.feedVolume}ml ${log.feedRoute || ''}`;
              summary += `\n`;
              if (log.comments) summary += `      Note: ${log.comments}\n`;
            }
          });
      }

      // Event Logs
      if (baby.eventLogs && baby.eventLogs.length > 0) {
        summary += `\n  -- Event Log (${baby.eventLogs.length}) --\n`;
        baby.eventLogs
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          .forEach(event => {
            const time = new Date(event.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            });
            summary += `    ${time} - ${event.eventType}: ${event.eventDetails}\n`;
          });
      }

      summary += `\n`;
    }

    summary += `\n=== END OF SHIFT REPORT ===\n`;
    summary += `Generated: ${new Date().toLocaleString()}\n`;
    summary += `🤖 Generated with Cloud Functions\n`;

    // Cache the summary in the shift document
    await shiftRef.update({
      cachedSummary: summary,
      summaryGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Summary generated successfully for shift ${shiftId}`);

    return {
      summary,
      timestamp: new Date().toISOString(),
      babyCount: babies.length
    };

  } catch (error) {
    console.error('Error generating shift summary:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to generate shift summary',
      error.message
    );
  }
});

// ==========================================
// FUTURE: AI-Enhanced Summary with Gemini
// ==========================================

/**
 * TODO: Implement Gemini AI-enhanced summary generation
 *
 * Features:
 * - Better formatting and organization
 * - Flag potential documentation gaps
 * - Suggest clinical considerations
 * - Generate handoff notes
 *
 * Implementation would require:
 * - Google Generative AI SDK
 * - API key management
 * - Prompt engineering for medical context
 */
