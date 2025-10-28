import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, collection, query, orderBy, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore';

// --- Firebase Configuration & Context ---

// Use environment variables for Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Global variables (fallback for Canvas environment)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-nicu-app';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase App
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// Create a context for authentication and Firestore
const AppContext = createContext();

// AppProvider component to manage Firebase initialization and authentication state
const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [firebaseReady, setFirebaseReady] = useState(false);

    useEffect(() => {
        if (!auth) {
            console.error("Firebase Auth is not initialized. Check environment variables.");
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setUserId(currentUser.uid);
                console.log('Firebase: User signed in:', currentUser.uid);
            } else {
                console.log('Firebase: No user, attempting anonymous sign-in.');
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Firebase Auth Error:", error);
                    // Fallback to a random UUID if anonymous sign-in fails
                    setUserId(crypto.randomUUID());
                }
            }
            setLoading(false);
            setFirebaseReady(true);
        });

        return () => unsubscribe();
    }, []);

    // Provide the Firebase instances and user state through context
    return (
        <AppContext.Provider value={{ db, auth, user, userId, loading, firebaseReady }}>
            {children}
        </AppContext.Provider>
    );
};

// --- Firestore Service Functions ---

// Collection path for private user data
const getUserCollectionPath = (uid) => doc(collection(db, 'artifacts', appId, 'users'), uid);

// Fetches all shifts for the current user
const getShifts = (userId, callback) => {
    if (!db || !userId) return;
    const shiftsRef = collection(getUserCollectionPath(userId), 'nicu_shifts');
    const q = query(shiftsRef);
    return onSnapshot(q, (snapshot) => {
        const shifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        shifts.sort((a, b) => {
            const dateA = new Date(a.shiftDate + 'T' + a.shiftStartTime);
            const dateB = new Date(b.shiftDate + 'T' + b.shiftStartTime);
            return dateB - dateA; // Newest shift first
        });
        callback(shifts);
    });
};

// Adds a new shift for the current user
const addShift = async (userId, shiftData) => {
    if (!db || !userId) return;
    const shiftsRef = collection(getUserCollectionPath(userId), 'nicu_shifts');
    return await addDoc(shiftsRef, shiftData);
};

// Updates an existing shift
const updateShift = async (userId, shiftId, shiftData) => {
    if (!db || !userId) return;
    const shiftRef = doc(collection(getUserCollectionPath(userId), 'nicu_shifts'), shiftId);
    return await updateDoc(shiftRef, shiftData);
};

// Deletes a shift and its subcollections (babies, reports, etc.) using batch operations
const deleteShift = async (userId, shiftId) => {
    if (!db || !userId) return;
    const shiftRef = doc(collection(getUserCollectionPath(userId), 'nicu_shifts'), shiftId);

    // Fetch all babies in the shift
    const babiesQuery = query(collection(shiftRef, 'babies'));
    const babiesSnapshot = await getDocs(babiesQuery);

    // Use a write batch to delete all subcollections
    const batch = writeBatch(db);

    // Delete all baby-related subcollections
    for (const babyDoc of babiesSnapshot.docs) {
        const babyRef = doc(shiftRef, 'babies', babyDoc.id);

        // Delete reportSheet
        const reportSheetRef = doc(babyRef, 'reportSheet', 'main');
        batch.delete(reportSheetRef);

        // Delete touchTimeLogs
        const touchTimesQuery = query(collection(babyRef, 'touchTimeLogs'));
        const touchTimesSnapshot = await getDocs(touchTimesQuery);
        touchTimesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        // Delete eventLogs
        const eventsQuery = query(collection(babyRef, 'eventLogs'));
        const eventsSnapshot = await getDocs(eventsQuery);
        eventsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        // Delete the baby document itself
        batch.delete(babyRef);
    }

    // Finally, delete the shift document
    batch.delete(shiftRef);

    // Commit the batch
    await batch.commit();
    console.log(`Shift ${shiftId} and its subcollections deleted.`);
};


// Fetches babies for a specific shift
const getBabies = (userId, shiftId, callback) => {
    if (!db || !userId) return;
    const babiesRef = collection(getUserCollectionPath(userId), 'nicu_shifts', shiftId, 'babies');
    const q = query(babiesRef, orderBy('internalID_Nickname'));
    return onSnapshot(q, (snapshot) => {
        const babies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(babies);
    });
};

// Adds a new baby to a shift
const addBaby = async (userId, shiftId, babyData) => {
    if (!db || !userId || !shiftId) return;
    const babiesRef = collection(getUserCollectionPath(userId), 'nicu_shifts', shiftId, 'babies');
    return await addDoc(babiesRef, babyData);
};

// Updates an existing baby in a shift
const updateBaby = async (userId, shiftId, babyId, babyData) => {
    if (!db || !userId || !shiftId || !babyId) return;
    const babyRef = doc(collection(getUserCollectionPath(userId), 'nicu_shifts', shiftId, 'babies'), babyId);
    return await updateDoc(babyRef, babyData);
};

// Fetches a baby's report sheet
const getReportSheet = (userId, shiftId, babyId, callback) => {
    if (!db || !userId || !shiftId || !babyId) return;
    const reportSheetRef = doc(collection(getUserCollectionPath(userId), 'nicu_shifts', shiftId, 'babies', babyId, 'reportSheet'), 'main');
    return onSnapshot(reportSheetRef, (docSnap) => {
        callback(docSnap.exists() ? docSnap.data() : null);
    });
};

// Sets/Updates a baby's report sheet (using setDoc for 'main' document)
const setReportSheet = async (userId, shiftId, babyId, reportData) => {
    if (!db || !userId || !shiftId || !babyId) return;
    const reportSheetRef = doc(collection(getUserCollectionPath(userId), 'nicu_shifts', shiftId, 'babies', babyId, 'reportSheet'), 'main');
    return await setDoc(reportSheetRef, reportData, { merge: true });
};

// Fetches touch time logs for a baby
const getTouchTimeLogs = (userId, shiftId, babyId, callback) => {
    if (!db || !userId || !shiftId || !babyId) return;
    const touchTimeLogsRef = collection(getUserCollectionPath(userId), 'nicu_shifts', shiftId, 'babies', babyId, 'touchTimeLogs');
    const q = query(touchTimeLogsRef, orderBy('timestamp', 'asc')); // Order by timestamp
    return onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(logs);
    });
};

// Adds a touch time log for a baby
const addTouchTimeLog = async (userId, shiftId, babyId, logData) => {
    if (!db || !userId || !shiftId || !babyId) return;
    const touchTimeLogsRef = collection(getUserCollectionPath(userId), 'nicu_shifts', shiftId, 'babies', babyId, 'touchTimeLogs');
    return await addDoc(touchTimeLogsRef, logData);
};

// Updates a touch time log
const updateTouchTimeLog = async (userId, shiftId, babyId, logId, logData) => {
    if (!db || !userId || !shiftId || !babyId || !logId) return;
    const logRef = doc(collection(getUserCollectionPath(userId), 'nicu_shifts', shiftId, 'babies', babyId, 'touchTimeLogs'), logId);
    return await updateDoc(logRef, logData);
};


// Fetches event logs for a baby
const getEventLogs = (userId, shiftId, babyId, callback) => {
    if (!db || !userId || !shiftId || !babyId) return;
    const eventLogsRef = collection(getUserCollectionPath(userId), 'nicu_shifts', shiftId, 'babies', babyId, 'eventLogs');
    const q = query(eventLogsRef, orderBy('timestamp', 'asc')); // Order by timestamp
    return onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(logs);
    });
};

// Adds an event log for a baby
const addEventLog = async (userId, shiftId, babyId, eventData) => {
    if (!db || !userId || !shiftId || !babyId) return;
    const eventLogsRef = collection(getUserCollectionPath(userId), 'nicu_shifts', shiftId, 'babies', babyId, 'eventLogs');
    return await addDoc(eventLogsRef, eventData);
};


// --- Utility Components (for styling and common elements) ---

const Button = ({ children, onClick, className = '', disabled = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition duration-150 ease-in-out ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
        {children}
    </button>
);

// Corrected: Pass the 'name' prop down to the native input element
const Input = ({ label, type = 'text', value = '', onChange, placeholder, className = '', name }) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${className}`}
        />
    </div>
);

// Corrected: Pass the 'name' prop down to the native select element
const Select = ({ label, value = '', onChange, options, className = '', name }) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <select
            name={name}
            value={value}
            onChange={onChange}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm ${className}`}
        >
            {options.map((option, index) => (
                <option key={index} value={option.value || option}>
                    {option.label || option}
                </option>
            ))}
        </select>
    </div>
);

// Corrected: Pass the 'name' prop down to the native textarea element
const TextArea = ({ label, value = '', onChange, placeholder, rows = 3, className = '', name }) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <textarea
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${className}`}
        ></textarea>
    </div>
);

const Checkbox = ({ label, checked, onChange, className = '', name }) => ( // Added name prop to Checkbox
    <div className="flex items-center">
        <input
            type="checkbox"
            name={name} // ADDED name prop here
            checked={checked}
            onChange={onChange}
            className={`h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded ${className}`}
        />
        {label && <label className="ml-2 block text-sm text-gray-900">{label}</label>}
    </div>
);


const RadioGroup = ({ label, name, options, selectedValue, onChange }) => (
    <fieldset className="mb-4">
        {label && <legend className="text-sm font-medium text-gray-700 mb-1">{label}</legend>}
        <div className="mt-2 space-y-2">
            {options.map(option => (
                <div key={option.value} className="flex items-center">
                    <input
                        id={`${name}-${option.value}`}
                        name={name}
                        type="radio"
                        value={option.value}
                        checked={selectedValue === option.value}
                        onChange={onChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <label htmlFor={`${name}-${option.value}`} className="ml-2 block text-sm text-gray-900">
                        {option.label}
                    </label>
                </div>
            ))}
        </div>
    </fieldset>
);

// Helper function to generate q3 schedule for a given start time
const generateQ3Schedule = (startTime) => {
    const times = [];
    let [hours, minutes] = startTime.split(':').map(Number);
    const startDateTime = new Date();
    startDateTime.setHours(hours, minutes, 0, 0);

    for (let i = 0; i < 8; i++) { // Generate 8 touch times (24 hours / 3 hours)
        const touchTime = new Date(startDateTime.getTime() + i * 3 * 60 * 60 * 1000);
        times.push(touchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    }
    return times;
};

// Collapsible section component
const CollapsibleSection = ({ title, children, isOpen, toggleOpen }) => (
    <div className="bg-white p-6 rounded-lg shadow-md mb-4 border border-gray-200">
        <button
            className="w-full flex justify-between items-center text-left text-xl font-semibold text-gray-800"
            onClick={toggleOpen}
        >
            {title}
            <span className="text-gray-500 text-2xl">{isOpen ? '−' : '+'}</span>
        </button>
        {isOpen && <div className="mt-4 pt-4 border-t border-gray-100">{children}</div>}
    </div>
);


// --- Screens & Components ---

// Screen 1: Shift Setup
const ShiftSetupScreen = ({ onStartShift }) => {
    const [selectedTime, setSelectedTime] = useState('07:00');
    const [assignmentType, setAssignmentType] = useState('ICU');
    const [currentDate, setCurrentDate] = useState('');

    useEffect(() => {
        setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }, []);

    const shiftStartOptions = ['07:00', '13:00'];

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-indigo-800 mb-6">NICU Shift Tracker</h2>

                <div className="mb-6">
                    <Select
                        label="Select Your Overall Shift Start Time:"
                        name="shiftStartTime"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        options={shiftStartOptions}
                    />
                </div>

                <div className="mb-6">
                    <RadioGroup
                        label="Assignment Type:"
                        name="assignmentType"
                        selectedValue={assignmentType}
                        onChange={(e) => setAssignmentType(e.target.value)}
                        options={[
                            { value: 'ICU', label: 'ICU (Critical Care)' },
                            { value: 'Intermediate', label: 'Intermediate (Feeder/Grower)' }
                        ]}
                    />
                    <div className="mt-2 p-3 bg-gray-50 rounded-md text-xs text-gray-600">
                        {assignmentType === 'ICU' ? (
                            <p><strong>ICU Focus:</strong> IV lines, hourly assessments, critical care tasks, medications, problem-solving & advocacy</p>
                        ) : (
                            <p><strong>Intermediate Focus:</strong> Feeding progression, growth tracking, discharge planning, parent teaching</p>
                        )}
                    </div>
                </div>

                <div className="mb-8 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <p className="text-sm font-semibold text-indigo-700 mb-2">{currentDate}</p>
                    <p className="text-lg font-bold text-indigo-800 mb-2">Common Baby q3 Start Options:</p>
                    <div className="grid grid-cols-2 gap-2 text-gray-700 text-sm">
                        {selectedTime === '07:00' ? (
                            <>
                                <span className="px-2 py-1 bg-indigo-100 rounded-md text-center">08:00</span>
                                <span className="px-2 py-1 bg-indigo-100 rounded-md text-center">08:30</span>
                                <span className="px-2 py-1 bg-indigo-100 rounded-md text-center">09:00</span>
                            </>
                        ) : (
                            <>
                                <span className="px-2 py-1 bg-indigo-100 rounded-md text-center">20:00</span>
                                <span className="px-2 py-1 bg-indigo-100 rounded-md text-center">20:30</span>
                                <span className="px-2 py-1 bg-indigo-100 rounded-md text-center">21:00</span>
                            </>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">You'll pick each baby's exact q3 start time when you add them.</p>
                </div>
                <Button onClick={() => onStartShift({
                    shiftDate: new Date().toISOString().slice(0, 10),
                    shiftStartTime: selectedTime,
                    assignmentType: assignmentType
                })} className="w-full">
                    Start Shift
                </Button>
            </div>
        </div>
    );
};

// Screen 2: Baby List Dashboard
const BabyListDashboard = ({ currentShift, onAddBaby, onSelectBaby, onEndShift }) => {
    const { userId, db } = useContext(AppContext);
    const [babies, setBabies] = useState([]);
    const [showEndShiftConfirm, setShowEndShiftConfirm] = useState(false);

    useEffect(() => {
        if (!userId || !currentShift?.id) return;
        const unsubscribe = getBabies(userId, currentShift.id, setBabies);
        return () => unsubscribe();
    }, [userId, currentShift?.id]);

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="container mx-auto py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">Current Shift</h2>
                        <p className="text-xl text-indigo-700">Shift Start: {currentShift.shiftDate} @ {currentShift.shiftStartTime}</p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-semibold text-lg ${
                        currentShift.assignmentType === 'ICU'
                            ? 'bg-red-100 text-red-800 border-2 border-red-300'
                            : 'bg-green-100 text-green-800 border-2 border-green-300'
                    }`}>
                        {currentShift.assignmentType || 'ICU'} Assignment
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {babies.length === 0 ? (
                        <p className="text-gray-600 col-span-full text-center py-8">No babies added yet. Click 'Add Baby' to start!</p>
                    ) : (
                        babies.map(baby => (
                            <div key={baby.id}
                                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer border-l-4 border-indigo-500"
                                onClick={() => onSelectBaby(baby.id)}>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">{baby.internalID_Nickname}</h3>
                                <p className="text-sm text-gray-600">GA: {baby.gestationalAge_Weeks}+{baby.gestationalAge_Days} | CGA: {baby.correctedGestationalAge_Weeks}+{baby.correctedGestationalAge_Days} | PNA: Day {baby.pna_Days}</p>
                                <p className="text-sm text-gray-600">Bed: {baby.bedRoomNumber}</p>
                                <p className="text-sm text-indigo-600 font-medium">q3 Start: {baby.babyQ3StartTime}</p>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex justify-between items-center mt-8">
                    <Button onClick={onAddBaby}>Add Baby</Button>
                    <Button onClick={() => setShowEndShiftConfirm(true)} className="bg-indigo-500 hover:bg-indigo-600 ml-4">End Shift & View Summary</Button>
                </div>

                {showEndShiftConfirm && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full text-center">
                            <p className="text-lg font-semibold mb-4">Ready to end your shift?</p>
                            <p className="text-sm text-gray-600 mb-6">You'll be able to review your shift summary, copy it for charting, and then optionally delete the shift data.</p>
                            <div className="flex justify-center space-x-4">
                                <Button onClick={() => setShowEndShiftConfirm(false)} className="bg-gray-400 hover:bg-gray-500">Cancel</Button>
                                <Button onClick={() => { setShowEndShiftConfirm(false); onEndShift(); }} className="bg-indigo-600 hover:bg-indigo-700">
                                    View Summary
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Screen 3: Add Baby Details Form (wrapped for navigation)
const AddBabyScreen = ({ currentShiftId, shiftStartTime, onSaveBaby, onCancel }) => {
    const { userId, db } = useContext(AppContext);
    const [babyData, setBabyData] = useState({
        internalID_Nickname: '',
        gestationalAge_Weeks: '',
        gestationalAge_Days: '',
        correctedGestationalAge_Weeks: '',
        correctedGestationalAge_Days: '',
        pna_Days: '',
        apgars_1min: '',
        apgars_5min: '',
        apgars_10min: '',
        bedRoomNumber: '',
        birthWeight: '',
        birthLength: '',
        lastWeight: '',
        headCircumference: '',
        abdominalGirth: '',
        bedChangeDue: false,
        babyQ3StartTime: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // Accordion state
    const [openSection, setOpenSection] = useState('basicInfo'); // State to control which section is open

    const toggleSection = (sectionName) => {
        setOpenSection(openSection === sectionName ? '' : sectionName);
    };

    const babyQ3StartOptions = (() => {
        const [hours] = shiftStartTime.split(':').map(Number);
        if (hours >= 7 && hours <= 15) { // Day shift range
            return ['', '08:00', '08:30', '09:00'];
        } else { // Night shift range
            return ['', '20:00', '20:30', '21:00'];
        }
    })();

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        // Ensure name is present to avoid Firestore errors with empty field names
        if (!name) {
            console.error("Input element is missing 'name' attribute:", e.target);
            return;
        }

        let newValue = value;
        if (type === 'number') {
            // Convert to number, but store null if empty string
            newValue = value === '' ? null : Number(value);
        } else if (type === 'checkbox') {
            newValue = checked;
        }

        setBabyData(prev => ({
            ...prev,
            [name]: newValue
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            console.log("Attempting to add baby with data:", babyData); // Log for debugging
            await addBaby(userId, currentShiftId, babyData);
            alert('Baby added successfully!');
            onSaveBaby();
        } catch (error) {
            console.error("Error adding baby:", error);
            alert('Failed to add baby. See console for details.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="container mx-auto py-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Add New Baby (PHI-Free)</h2>
                <p className="text-sm text-red-600 mb-4">
                    **Important: Do NOT enter any Protected Health Information (PHI) like full patient names, exact dates of birth, or unique identifiers that could re-identify the patient.**
                </p>
                <div className="max-w-3xl mx-auto space-y-4"> {/* Added space-y for vertical spacing */}
                    <CollapsibleSection
                        title="Basic Info"
                        isOpen={openSection === 'basicInfo'}
                        toggleOpen={() => toggleSection('basicInfo')}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Reduced gap for within section */}
                            <Input label="Internal ID / Nickname" name="internalID_Nickname" value={babyData.internalID_Nickname} onChange={handleChange} placeholder="e.g., R3B1, Baby Star" />
                            <Select
                                label="Baby's q3 Start Time"
                                name="babyQ3StartTime"
                                value={babyData.babyQ3StartTime}
                                onChange={handleChange}
                                options={babyQ3StartOptions}
                            />
                            <Input label="Days Old / PNA" type="number" name="pna_Days" value={babyData.pna_Days} onChange={handleChange} placeholder="e.g., 15 (calculate from chart)" />
                            <Input label="Bed / Room Number (Generic)" name="bedRoomNumber" value={babyData.bedRoomNumber} onChange={handleChange} placeholder="e.g., Room 3, Bed 1" />
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                        title="Gestational & Corrected Age"
                        isOpen={openSection === 'gestationalAge'}
                        toggleOpen={() => toggleSection('gestationalAge')}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Gestational Age (Weeks)" type="number" name="gestationalAge_Weeks" value={babyData.gestationalAge_Weeks} onChange={handleChange} />
                            <Input label="Gestational Age (Days)" type="number" name="gestationalAge_Days" value={babyData.gestationalAge_Days} onChange={handleChange} />
                            <Input label="Corrected Gestational Age (Weeks)" type="number" name="correctedGestationalAge_Weeks" value={babyData.correctedGestationalAge_Weeks} onChange={handleChange} />
                            <Input label="Corrected Gestational Age (Days)" type="number" name="correctedGestationalAge_Days" value={babyData.correctedGestationalAge_Days} onChange={handleChange} />
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                        title="Apgars"
                        isOpen={openSection === 'apgars'}
                        toggleOpen={() => toggleSection('apgars')}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="Apgars (1 min)" type="number" name="apgars_1min" value={babyData.apgars_1min} onChange={handleChange} />
                            <Input label="Apgars (5 min)" type="number" name="apgars_5min" value={babyData.apgars_5min} onChange={handleChange} />
                            <Input label="Apgars (10 min)" type="number" name="apgars_10min" value={babyData.apgars_10min} onChange={handleChange} />
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                        title="Growth Data"
                        isOpen={openSection === 'growthData'}
                        toggleOpen={() => toggleSection('growthData')}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Birth Weight (g)" type="number" name="birthWeight" value={babyData.birthWeight} onChange={handleChange} />
                            <Input label="Birth Length (cm)" type="number" name="birthLength" value={babyData.birthLength} onChange={handleChange} />
                            <Input label="Last Weight (g)" type="number" name="lastWeight" value={babyData.lastWeight} onChange={handleChange} />
                            <Input label="Head Circumference (cm)" type="number" name="headCircumference" value={babyData.headCircumference} onChange={handleChange} />
                            <Input label="Abdominal Girth (cm)" type="number" name="abdominalGirth" value={babyData.abdominalGirth} onChange={handleChange} />
                            <Checkbox label="Bed Change Due?" name="bedChangeDue" checked={babyData.bedChangeDue} onChange={handleChange} />
                        </div>
                    </CollapsibleSection>

                </div>
                <div className="flex justify-end space-x-4 mt-6">
                    <Button onClick={onCancel} className="bg-gray-400 hover:bg-gray-500">Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Baby'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Component for Report Sheet tab
const ReportSheetSection = ({ currentShiftId, babyId, assignmentType }) => {
    const { userId, db } = useContext(AppContext);
    const [reportData, setReportData] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [openSection, setOpenSection] = useState(assignmentType === 'Intermediate' ? 'feedingProgression' : 'historyProblems'); // Accordion state - default to relevant section

    const toggleSection = (sectionName) => {
        setOpenSection(openSection === sectionName ? '' : sectionName);
    };

    useEffect(() => {
        if (!userId || !currentShiftId || !babyId) return;
        const unsubscribe = getReportSheet(userId, currentShiftId, babyId, (data) => {
            // Ensure medications object exists for checkboxes and provide default values for all fields
            setReportData({
                ...data,
                maternalHistory: data?.maternalHistory || '',
                currentProblems: data?.currentProblems || '',
                // Baby History fields
                birthWeight: data?.birthWeight || null,
                currentWeight: data?.currentWeight || null,
                apgars_1min: data?.apgars_1min || null,
                apgars_5min: data?.apgars_5min || null,
                apgars_10min: data?.apgars_10min || null,
                abdominalGirth: data?.abdominalGirth || null,
                // Imaging - CUS (Cranial Ultrasound)
                cusDate: data?.cusDate || '',
                cusFindings: data?.cusFindings || '',
                cusFollowUpPlan: data?.cusFollowUpPlan || '',
                cusFollowUpDate: data?.cusFollowUpDate || '',
                // Imaging - Echo
                echoDate: data?.echoDate || '',
                echoFindings: data?.echoFindings || '',
                echoFollowUpPlan: data?.echoFollowUpPlan || '',
                echoFollowUpDate: data?.echoFollowUpDate || '',
                // Imaging - EEG
                eegDate: data?.eegDate || '',
                eegFindings: data?.eegFindings || '',
                eegFollowUpPlan: data?.eegFollowUpPlan || '',
                eegFollowUpDate: data?.eegFollowUpDate || '',
                // Other Imaging
                mriDate: data?.mriDate || '',
                mriFindings: data?.mriFindings || '',
                renalUSDate: data?.renalUSDate || '',
                renalUSFindings: data?.renalUSFindings || '',
                abdominalUSDate: data?.abdominalUSDate || '',
                abdominalUSFindings: data?.abdominalUSFindings || '',
                otherImagingType: data?.otherImagingType || '',
                otherImagingDate: data?.otherImagingDate || '',
                otherImagingFindings: data?.otherImagingFindings || '',
                respiratoryMode: data?.respiratoryMode || '',
                respiratoryFlow: data?.respiratoryFlow || null, // Changed to null for numbers
                respiratoryFiO2: data?.respiratoryFiO2 || null, // Changed to null for numbers
                cbgAbgSchedule: data?.cbgAbgSchedule || '',
                feedsRoute: data?.feedsRoute || '',
                ngOgTubeDetails: data?.ngOgTubeDetails || '',
                feedType: data?.feedType || '',
                feedCalories: data?.feedCalories || null, // Changed to null for numbers
                feedVolume: data?.feedVolume || null, // Changed to null for numbers
                feedSpecialInstructions: data?.feedSpecialInstructions || '',
                bottleNippleType: data?.bottleNippleType || '',
                ivLineType: data?.ivLineType || '', // '', 'Peripheral', 'PICC', 'UVC', 'UAC'
                ivSite: data?.ivSite || '',
                ivFluidsGeneral: data?.ivFluidsGeneral || '',
                ivRateGeneral: data?.ivRateGeneral || '',
                // PICC-specific
                piccCircumference: data?.piccCircumference || '',
                piccLineOut: data?.piccLineOut || '',
                piccFluids: data?.piccFluids || '',
                piccRate: data?.piccRate || '',
                // UVC-specific
                uvcLengthVisible: data?.uvcLengthVisible || '',
                uvcProximalLumen: data?.uvcProximalLumen || '',
                uvcProximalRate: data?.uvcProximalRate || '',
                uvcDistalLumen: data?.uvcDistalLumen || '',
                uvcDistalRate: data?.uvcDistalRate || '',
                // UAC-specific
                uacLengthVisible: data?.uacLengthVisible || '',
                uacFluids: data?.uacFluids || '',
                uacRate: data?.uacRate || '',
                medications: data?.medications || {
                    vitD: false,
                    multivitaminWithIron: false,
                    multivitaminWithoutIron: false,
                    iron: false,
                    caffeine: false,
                    nacl: false,
                    glycerin: false,
                    kcl: false,
                    ampicillin: false,
                    gentamicin: false,
                    otherMedications: ''
                },
                labsOrdered: data?.labsOrdered || '',
                labResults: data?.labResults || '',
                treatmentPlan: data?.treatmentPlan || '',
                notes: data?.notes || '',
                // Intermediate-specific fields
                feedingProgression: data?.feedingProgression || '',
                feedingGoals: data?.feedingGoals || '',
                bottleFeedingStatus: data?.bottleFeedingStatus || '',
                breastfeedingStatus: data?.breastfeedingStatus || '',
                dischargeGoals: data?.dischargeGoals || '',
                dischargeCriteria: data?.dischargeCriteria || '',
                parentTeaching: data?.parentTeaching || '',
                parentInvolvement: data?.parentInvolvement || '',
                growthGoals: data?.growthGoals || '',
                carSeatTest: data?.carSeatTest || '',
                homePreparation: data?.homePreparation || ''
            });
        });
        return () => unsubscribe();
    }, [userId, currentShiftId, babyId]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        // Ensure name is present
        if (!name) {
            console.error("Input element is missing 'name' attribute:", e.target);
            return;
        }
        let newValue = value;
        if (type === 'number') {
            newValue = value === '' ? null : Number(value); // Store null for empty number fields
        } else if (type === 'checkbox') {
            newValue = checked;
        }

        // Handle medications as a nested object
        if (name === 'vitD' || name === 'multivitaminWithIron' || name === 'multivitaminWithoutIron' ||
            name === 'iron' || name === 'caffeine' || name === 'nacl' || name === 'glycerin' ||
            name === 'kcl' || name === 'ampicillin' || name === 'gentamicin' || name === 'otherMedications') {
            setReportData(prev => ({
                ...prev,
                medications: {
                    ...prev.medications,
                    [name]: newValue
                }
            }));
        } else {
            setReportData(prev => ({ ...prev, [name]: newValue }));
        }
    };

    const handleCheckboxChange = (e) => {
        // This function is specifically for the main checkboxes like Gentamicin, Ampicillin, Vanc
        const { name, checked } = e.target;
        if (!name) {
            console.error("Checkbox element is missing 'name' attribute:", e.target);
            return;
        }
        setReportData(prev => ({
            ...prev,
            medications: {
                ...prev.medications,
                [name]: checked
            }
        }));
    };


    const handleSaveReport = async () => {
        setIsSaving(true);
        try {
            await setReportSheet(userId, currentShiftId, babyId, reportData);
            alert('Report Sheet updated!');
        } catch (error) {
            console.error("Error saving report sheet:", error);
            alert('Failed to save report sheet.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-gray-50 p-4 rounded-lg shadow-inner">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Report Sheet (One-Time Input)</h3>
            <p className="text-sm text-red-600 mb-4">
                **Reminder: Do NOT enter any PHI in free-text fields.**
            </p>
            <div className="space-y-4"> {/* Added space-y for vertical spacing between collapsible sections */}
                <CollapsibleSection
                    title="History & Current Problems"
                    isOpen={openSection === 'historyProblems'}
                    toggleOpen={() => toggleSection('historyProblems')}
                >
                    <div className="grid grid-cols-1 gap-4">
                        <TextArea label="Maternal History (De-identified)" name="maternalHistory" value={reportData.maternalHistory} onChange={handleChange} placeholder="e.g., G1P1, chorio, GDM, c/s (no names)" />
                        <TextArea label="Baby's Current Problems" name="currentProblems" value={reportData.currentProblems} onChange={handleChange} placeholder="e.g., Presumed pneumonia, hypoglycemia" />
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="👶 Baby History & Measurements"
                    isOpen={openSection === 'babyHistory'}
                    toggleOpen={() => toggleSection('babyHistory')}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Birth Weight (g)" type="number" name="birthWeight" value={reportData.birthWeight} onChange={handleChange} />
                        <Input label="Current Weight (g)" type="number" name="currentWeight" value={reportData.currentWeight} onChange={handleChange} />
                        <Input label="Apgars (1 min)" type="number" name="apgars_1min" value={reportData.apgars_1min} onChange={handleChange} />
                        <Input label="Apgars (5 min)" type="number" name="apgars_5min" value={reportData.apgars_5min} onChange={handleChange} />
                        <Input label="Apgars (10 min)" type="number" name="apgars_10min" value={reportData.apgars_10min} onChange={handleChange} />
                        <Input label="Abdominal Girth (cm)" type="number" name="abdominalGirth" value={reportData.abdominalGirth} onChange={handleChange} />
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="🩻 Imaging & Studies"
                    isOpen={openSection === 'imaging'}
                    toggleOpen={() => toggleSection('imaging')}
                >
                    <div className="space-y-6">
                        {/* CUS - Cranial Ultrasound */}
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-3">CUS (Cranial Ultrasound)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Date" name="cusDate" value={reportData.cusDate} onChange={handleChange} placeholder="e.g., DOL 3" />
                                <TextArea label="Findings" name="cusFindings" value={reportData.cusFindings} onChange={handleChange} placeholder="e.g., Grade II IVH" rows="2" />
                                <Input label="Follow-up Date" name="cusFollowUpDate" value={reportData.cusFollowUpDate} onChange={handleChange} placeholder="e.g., DOL 30" />
                                <TextArea label="Follow-up Plan" name="cusFollowUpPlan" value={reportData.cusFollowUpPlan} onChange={handleChange} placeholder="e.g., Repeat CUS in 4 weeks" rows="2" />
                            </div>
                        </div>

                        {/* Echo */}
                        <div className="p-4 bg-red-50 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-3">Echo (Echocardiogram)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Date" name="echoDate" value={reportData.echoDate} onChange={handleChange} placeholder="e.g., DOL 5" />
                                <TextArea label="Findings" name="echoFindings" value={reportData.echoFindings} onChange={handleChange} placeholder="e.g., Small PDA, no PH" rows="2" />
                                <Input label="Follow-up Date" name="echoFollowUpDate" value={reportData.echoFollowUpDate} onChange={handleChange} placeholder="e.g., DOL 14" />
                                <TextArea label="Follow-up Plan" name="echoFollowUpPlan" value={reportData.echoFollowUpPlan} onChange={handleChange} placeholder="e.g., Repeat echo to assess PDA" rows="2" />
                            </div>
                        </div>

                        {/* EEG */}
                        <div className="p-4 bg-purple-50 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-3">EEG</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Date" name="eegDate" value={reportData.eegDate} onChange={handleChange} placeholder="e.g., DOL 2" />
                                <TextArea label="Findings" name="eegFindings" value={reportData.eegFindings} onChange={handleChange} placeholder="e.g., Normal background, no seizures" rows="2" />
                                <Input label="Follow-up Date" name="eegFollowUpDate" value={reportData.eegFollowUpDate} onChange={handleChange} placeholder="e.g., DOL 10" />
                                <TextArea label="Follow-up Plan" name="eegFollowUpPlan" value={reportData.eegFollowUpPlan} onChange={handleChange} placeholder="e.g., Repeat if clinical concern" rows="2" />
                            </div>
                        </div>

                        {/* Other Imaging */}
                        <div className="p-4 bg-green-50 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-3">Other Imaging</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="MRI Date" name="mriDate" value={reportData.mriDate} onChange={handleChange} placeholder="e.g., DOL 7" />
                                <TextArea label="MRI Findings" name="mriFindings" value={reportData.mriFindings} onChange={handleChange} placeholder="e.g., Normal brain MRI" rows="2" />
                                <Input label="Renal U/S Date" name="renalUSDate" value={reportData.renalUSDate} onChange={handleChange} placeholder="e.g., DOL 3" />
                                <TextArea label="Renal U/S Findings" name="renalUSFindings" value={reportData.renalUSFindings} onChange={handleChange} placeholder="e.g., Normal kidneys bilaterally" rows="2" />
                                <Input label="Abdominal U/S Date" name="abdominalUSDate" value={reportData.abdominalUSDate} onChange={handleChange} placeholder="e.g., DOL 4" />
                                <TextArea label="Abdominal U/S Findings" name="abdominalUSFindings" value={reportData.abdominalUSFindings} onChange={handleChange} placeholder="e.g., Normal bowel gas pattern" rows="2" />
                                <Input label="Other Imaging Type" name="otherImagingType" value={reportData.otherImagingType} onChange={handleChange} placeholder="e.g., Chest X-ray, Hip U/S" />
                                <Input label="Other Imaging Date" name="otherImagingDate" value={reportData.otherImagingDate} onChange={handleChange} placeholder="e.g., DOL 1" />
                                <div className="col-span-full">
                                    <TextArea label="Other Imaging Findings" name="otherImagingFindings" value={reportData.otherImagingFindings} onChange={handleChange} placeholder="e.g., RDS pattern on CXR" rows="2" />
                                </div>
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Respiratory"
                    isOpen={openSection === 'respiratory'}
                    toggleOpen={() => toggleSection('respiratory')}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Respiratory Mode"
                            name="respiratoryMode"
                            value={reportData.respiratoryMode}
                            onChange={handleChange}
                            options={['', 'RA', 'NC', 'HFNC', 'CPAP', 'Vent']}
                        />
                        <Input label="Flow (L/min)" type="number" name="respiratoryFlow" value={reportData.respiratoryFlow} onChange={handleChange} />
                        <Input label="FiO₂ (%)" type="number" name="respiratoryFiO2" value={reportData.respiratoryFiO2} onChange={handleChange} />
                        <Input label="CBG / ABG Schedule" name="cbgAbgSchedule" value={reportData.cbgAbgSchedule} onChange={handleChange} placeholder="e.g., q6h, q shift" />
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Feeds & Details"
                    isOpen={openSection === 'feeds'}
                    toggleOpen={() => toggleSection('feeds')}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <RadioGroup
                            label="Feeds Route"
                            name="feedsRoute"
                            selectedValue={reportData.feedsRoute}
                            onChange={handleChange}
                            options={[{ value: 'PO', label: 'PO' }, { value: 'NG', label: 'NG' }, { value: 'NPO', label: 'NPO' }]}
                        />
                        <Input label="NG/OG Tube Details" name="ngOgTubeDetails" value={reportData.ngOgTubeDetails} onChange={handleChange} placeholder="e.g., 8Fr OG @ 10cm" />
                        <Select
                            label="Feed Type"
                            name="feedType"
                            value={reportData.feedType}
                            onChange={handleChange}
                            options={['', 'Formula', 'Breastmilk', 'Donor', 'Fortified', 'Nutramigen 20 cal', 'Nutramigen 22 cal']}
                        />
                        <Input label="Feed Calories" name="feedCalories" value={reportData.feedCalories} onChange={handleChange} placeholder="e.g., 20 cal" />
                        <Input label="Feed Volume" type="number" name="feedVolume" value={reportData.feedVolume} onChange={handleChange} />
                        <TextArea label="Feed Special Instructions" name="feedSpecialInstructions" value={reportData.feedSpecialInstructions} onChange={handleChange} placeholder="e.g., Hold if RR > 70" />
                        <Select
                            label="Bottle/Nipple Type"
                            name="bottleNippleType"
                            value={reportData.bottleNippleType}
                            onChange={handleChange}
                            options={['', 'Slow flow', 'Extra slow flow', 'Dr. Browns preemie', 'Dr. Browns ultra preemie', 'Dr. Browns transition', 'Dr. Browns level 1', 'Dr. Browns level 2', 'MAM level 0', 'MAM level 1', 'MAM level 2', 'Other']}
                        />
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="IV Fluids & Lines"
                    isOpen={openSection === 'ivMeds'}
                    toggleOpen={() => toggleSection('ivMeds')}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="IV Line Type"
                            name="ivLineType"
                            value={reportData.ivLineType}
                            onChange={handleChange}
                            options={['', 'Peripheral', 'PICC', 'UVC', 'UAC']}
                        />
                        <Input label="IV Site / Location" name="ivSite" value={reportData.ivSite} onChange={handleChange} placeholder="e.g., RH, left AC" />

                        {/* Peripheral or General IV Fields */}
                        {(reportData.ivLineType === 'Peripheral' || reportData.ivLineType === '') && (
                            <>
                                <TextArea label="IV Fluids" name="ivFluidsGeneral" value={reportData.ivFluidsGeneral} onChange={handleChange} placeholder="e.g., D10 80 mL/kg/day" />
                                <Input label="Rate" name="ivRateGeneral" value={reportData.ivRateGeneral} onChange={handleChange} placeholder="e.g., 4.2 mL/hr" />
                            </>
                        )}

                        {/* PICC Line Specific Fields */}
                        {reportData.ivLineType === 'PICC' && (
                            <>
                                <Input label="Circumference (cm)" name="piccCircumference" value={reportData.piccCircumference} onChange={handleChange} placeholder="e.g., 8.5 cm" />
                                <Input label="Amount of Line Out (cm)" name="piccLineOut" value={reportData.piccLineOut} onChange={handleChange} placeholder="e.g., 2 cm" />
                                <TextArea label="PICC Fluids Running" name="piccFluids" value={reportData.piccFluids} onChange={handleChange} placeholder="e.g., TPN + lipids, meds" />
                                <Input label="Rate" name="piccRate" value={reportData.piccRate} onChange={handleChange} placeholder="e.g., 4.2 mL/hr" />
                            </>
                        )}

                        {/* UVC (Umbilical Venous Catheter) Specific Fields */}
                        {reportData.ivLineType === 'UVC' && (
                            <>
                                <Input label="UVC Length Visible (cm)" name="uvcLengthVisible" value={reportData.uvcLengthVisible} onChange={handleChange} placeholder="e.g., 8 cm" />
                                <div className="col-span-full">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Proximal Lumen</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <TextArea label="Proximal Lumen Fluids" name="uvcProximalLumen" value={reportData.uvcProximalLumen} onChange={handleChange} placeholder="e.g., TPN + lipids, meds" rows="2" />
                                        <Input label="Proximal Rate" name="uvcProximalRate" value={reportData.uvcProximalRate} onChange={handleChange} placeholder="e.g., 4.2 mL/hr" />
                                    </div>
                                </div>
                                <div className="col-span-full">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Distal Lumen</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <TextArea label="Distal Lumen Fluids" name="uvcDistalLumen" value={reportData.uvcDistalLumen} onChange={handleChange} placeholder="e.g., 1 mL TPN" rows="2" />
                                        <Input label="Distal Rate" name="uvcDistalRate" value={reportData.uvcDistalRate} onChange={handleChange} placeholder="e.g., 1 mL/hr" />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* UAC (Umbilical Arterial Catheter) Specific Fields */}
                        {reportData.ivLineType === 'UAC' && (
                            <>
                                <Input label="UAC Length Visible (cm)" name="uacLengthVisible" value={reportData.uacLengthVisible} onChange={handleChange} placeholder="e.g., 10 cm" />
                                <TextArea label="UAC Fluids Running" name="uacFluids" value={reportData.uacFluids} onChange={handleChange} placeholder="e.g., heparinized saline" />
                                <Input label="Rate" name="uacRate" value={reportData.uacRate} onChange={handleChange} placeholder="e.g., 1 mL/hr" />
                            </>
                        )}
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Medications"
                    isOpen={openSection === 'medications'}
                    toggleOpen={() => toggleSection('medications')}
                >
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Vitamins & Supplements</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <Checkbox label="Vitamin D" name="vitD" checked={reportData.medications?.vitD} onChange={handleCheckboxChange} />
                                <Checkbox label="MVI with Iron" name="multivitaminWithIron" checked={reportData.medications?.multivitaminWithIron} onChange={handleCheckboxChange} />
                                <Checkbox label="MVI w/o Iron" name="multivitaminWithoutIron" checked={reportData.medications?.multivitaminWithoutIron} onChange={handleCheckboxChange} />
                                <Checkbox label="Iron" name="iron" checked={reportData.medications?.iron} onChange={handleCheckboxChange} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Common NICU Meds</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <Checkbox label="Caffeine" name="caffeine" checked={reportData.medications?.caffeine} onChange={handleCheckboxChange} />
                                <Checkbox label="NaCl" name="nacl" checked={reportData.medications?.nacl} onChange={handleCheckboxChange} />
                                <Checkbox label="Glycerin" name="glycerin" checked={reportData.medications?.glycerin} onChange={handleCheckboxChange} />
                                <Checkbox label="KCl" name="kcl" checked={reportData.medications?.kcl} onChange={handleCheckboxChange} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Antibiotics</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <Checkbox label="Ampicillin" name="ampicillin" checked={reportData.medications?.ampicillin} onChange={handleCheckboxChange} />
                                <Checkbox label="Gentamicin" name="gentamicin" checked={reportData.medications?.gentamicin} onChange={handleCheckboxChange} />
                            </div>
                        </div>

                        <div className="col-span-full">
                            <Input label="Other Medications" name="otherMedications" value={reportData.medications?.otherMedications} onChange={handleChange} placeholder="e.g., Vanc, Dopamine, etc." />
                        </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Labs, Treatment & Notes"
                    isOpen={openSection === 'labsTxNotes'}
                    toggleOpen={() => toggleSection('labsTxNotes')}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextArea label="Labs Ordered" name="labsOrdered" value={reportData.labsOrdered} onChange={handleChange} placeholder="e.g., CRP, CBC (with time)" />
                        <TextArea label="Lab Results" name="labResults" value={reportData.labResults} onChange={handleChange} placeholder="e.g., CRP 1.6, no bands" />
                        <TextArea label="Treatment Plan" name="treatmentPlan" value={reportData.treatmentPlan} onChange={handleChange} placeholder="e.g., Treat for 5 days, repeat CRP in 48h" />
                        <TextArea label="Notes" name="notes" value={reportData.notes} onChange={handleChange} placeholder="Any additional narrative (no PHI)" />
                    </div>
                </CollapsibleSection>

                {/* Intermediate-Specific Sections */}
                {assignmentType === 'Intermediate' && (
                    <>
                        <CollapsibleSection
                            title="📈 Feeding Progression & Goals"
                            isOpen={openSection === 'feedingProgression'}
                            toggleOpen={() => toggleSection('feedingProgression')}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <TextArea label="Feeding Progression" name="feedingProgression" value={reportData.feedingProgression} onChange={handleChange} placeholder="e.g., Taking 30mL PO q3, tiring midway" rows="3" />
                                <TextArea label="Feeding Goals" name="feedingGoals" value={reportData.feedingGoals} onChange={handleChange} placeholder="e.g., Increase to full PO by end of week" rows="3" />
                                <Input label="Bottle Feeding Status" name="bottleFeedingStatus" value={reportData.bottleFeedingStatus} onChange={handleChange} placeholder="e.g., 3/4 feeds PO today" />
                                <Input label="Breastfeeding Status" name="breastfeedingStatus" value={reportData.breastfeedingStatus} onChange={handleChange} placeholder="e.g., Latching well x10min" />
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection
                            title="🏠 Discharge Planning"
                            isOpen={openSection === 'dischargePlanning'}
                            toggleOpen={() => toggleSection('dischargePlanning')}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <TextArea label="Discharge Goals" name="dischargeGoals" value={reportData.dischargeGoals} onChange={handleChange} placeholder="e.g., Full PO feeds, stable temps in open crib" rows="3" />
                                <TextArea label="Discharge Criteria Remaining" name="dischargeCriteria" value={reportData.dischargeCriteria} onChange={handleChange} placeholder="e.g., Car seat test, parent CPR class" rows="3" />
                                <Input label="Car Seat Test Status" name="carSeatTest" value={reportData.carSeatTest} onChange={handleChange} placeholder="e.g., Scheduled for tomorrow" />
                                <TextArea label="Home Preparation" name="homePreparation" value={reportData.homePreparation} onChange={handleChange} placeholder="e.g., Parents preparing nursery, ordering supplies" rows="3" />
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection
                            title="👨‍👩‍👧 Parent Teaching & Involvement"
                            isOpen={openSection === 'parentTeaching'}
                            toggleOpen={() => toggleSection('parentTeaching')}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <TextArea label="Parent Teaching Today" name="parentTeaching" value={reportData.parentTeaching} onChange={handleChange} placeholder="e.g., Taught bathing, diapering. Reviewed feeding cues" rows="4" />
                                <TextArea label="Parent Involvement" name="parentInvolvement" value={reportData.parentInvolvement} onChange={handleChange} placeholder="e.g., Mom did full bath, dad gave 2 bottles" rows="4" />
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection
                            title="📊 Growth & Weight Goals"
                            isOpen={openSection === 'growthGoals'}
                            toggleOpen={() => toggleSection('growthGoals')}
                        >
                            <div className="grid grid-cols-1 gap-4">
                                <TextArea label="Growth Goals & Tracking" name="growthGoals" value={reportData.growthGoals} onChange={handleChange} placeholder="e.g., Goal: 25g/day weight gain. Current: gaining 20g/day. May increase calories if no improvement" rows="4" />
                            </div>
                        </CollapsibleSection>
                    </>
                )}
            </div>
            <div className="flex justify-end mt-6">
                <Button onClick={handleSaveReport} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Report Sheet'}
                </Button>
            </div>
        </div>
    );
};

// Component for Touch Time Logs tab
const TouchTimeLogsSection = ({ currentShiftId, babyId, babyQ3StartTime }) => {
    const { userId, db } = useContext(AppContext);
    const [touchTimes, setTouchTimes] = useState([]);
    // Ensure all currentLogInputs are initialized to empty string or null for numbers
    const [currentLogInputs, setCurrentLogInputs] = useState({
        temp: null,
        hr: null,
        rr: null,
        spo2: null,
        feedVolume: null,
        feedRoute: '',
        feedTolerance: '',
        residualChecked: '',
        diaperOutput: '',
        positioning: '',
        lineCheck: '',
        comments: ''
    });
    const [savingLog, setSavingLog] = useState(false);

    // Generate q3 schedule for this specific baby based on their assigned q3 start time
    const q3ScheduleTimes = babyQ3StartTime ? generateQ3Schedule(babyQ3StartTime) : [];

    useEffect(() => {
        if (!userId || !currentShiftId || !babyId) return;
        const unsubscribe = getTouchTimeLogs(userId, currentShiftId, babyId, setTouchTimes);
        return () => unsubscribe();
    }, [userId, currentShiftId, babyId]);

    const handleLogInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (!name) { // Defensive check
            console.error("Input element is missing 'name' attribute in TouchTimeLogsSection:", e.target);
            return;
        }

        let newValue = value;
        if (type === 'number') {
            newValue = value === '' ? null : Number(value); // Store null for empty number fields
        } else if (type === 'checkbox') {
            newValue = checked;
        }

        setCurrentLogInputs(prev => ({
            ...prev,
            [name]: newValue
        }));
    };

    const handleAddLog = async (scheduledTime) => {
        setSavingLog(true);
        try {
            const newLog = {
                timestamp: new Date().toISOString(), // Actual time of logging
                scheduledTime: scheduledTime, // The q3 scheduled time this log corresponds to
                ...currentLogInputs,
                completed: true // Mark as completed when logged
            };
            await addTouchTimeLog(userId, currentShiftId, babyId, newLog);
            // Reset inputs after saving
            setCurrentLogInputs({
                temp: null, hr: null, rr: null, spo2: null, feedVolume: null,
                feedRoute: '', feedTolerance: '', residualChecked: '', diaperOutput: '',
                positioning: '', lineCheck: '', comments: ''
            });
            alert(`Log for ${scheduledTime} added!`);
        } catch (error) {
            console.error("Error adding touch time log:", error);
            alert('Failed to add log.');
        } finally {
            setSavingLog(false);
        }
    };

    const isLogCompleted = (scheduledTime) => {
        return touchTimes.some(log => log.scheduledTime === scheduledTime && log.completed);
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Touch Time Logs (q3 Intervals)</h3>
            <p className="text-sm text-red-600 mb-4">
                **Reminder: Do NOT enter any PHI in comments or free-text fields.**
            </p>
            {q3ScheduleTimes.length === 0 ? (
                <p className="text-gray-600">Please assign a q3 Start Time for this baby in the 'Add Baby' form.</p>
            ) : (
                q3ScheduleTimes.map((time, index) => (
                    <div key={index} className={`mb-4 p-4 rounded-lg border-l-4 ${isLogCompleted(time) ? 'border-green-500 bg-green-50' : 'border-indigo-300 bg-indigo-50'}`}>
                        <h4 className="text-lg font-bold text-gray-800 flex justify-between items-center">
                            {time}
                            {isLogCompleted(time) && <span className="text-green-600 text-sm">Completed</span>}
                        </h4>
                        {touchTimes.filter(log => log.scheduledTime === time).map(log => (
                            <div key={log.id} className="text-sm text-gray-700 mt-2 p-2 bg-white rounded-md shadow-sm">
                                <p className="font-semibold">Logged At: {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                <p>Temp: {log.temp || 'N/A'}, HR: {log.hr || 'N/A'}, RR: {log.rr || 'N/A'}, SpO2: {log.spo2 || 'N/A'}</p>
                                <p>Feed: {log.feedVolume || 'N/A'} {log.feedRoute || ''} ({log.feedTolerance || 'N/A'})</p>
                                <p>Diaper: {log.diaperOutput || 'N/A'} | Position: {log.positioning || 'N/A'} | Line: {log.lineCheck || 'N/A'}</p>
                                <p>Comments: {log.comments || 'N/A'}</p>
                            </div>
                        ))}
                        {!isLogCompleted(time) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {/* Values for inputs in currentLogInputs are explicitly initialized to null or '' */}
                                <Input label="Temp" type="number" name="temp" value={currentLogInputs.temp} onChange={handleLogInputChange} />
                                <Input label="HR" type="number" name="hr" value={currentLogInputs.hr} onChange={handleLogInputChange} />
                                <Input label="RR" type="number" name="rr" value={currentLogInputs.rr} onChange={handleLogInputChange} />
                                <Input label="SpO2" type="number" name="spo2" value={currentLogInputs.spo2} onChange={handleLogInputChange} />
                                <Input label="Feed Volume" type="number" name="feedVolume" value={currentLogInputs.feedVolume} onChange={handleLogInputChange} />
                                <Input label="Feed Route" name="feedRoute" value={currentLogInputs.feedRoute} onChange={handleLogInputChange} placeholder="PO/NG" />
                                <Input label="Feed Tolerance" name="feedTolerance" value={currentLogInputs.feedTolerance} onChange={handleLogInputChange} placeholder="e.g., tolerated well" />
                                <Input label="Residual Checked" name="residualChecked" value={currentLogInputs.residualChecked} onChange={handleLogInputChange} placeholder="e.g., 5mL clear" />
                                <Select label="Diaper Output" name="diaperOutput" value={currentLogInputs.diaperOutput} onChange={handleLogInputChange} options={['', 'U', 'B', 'M', 'U/B', 'U/M', 'B/M', 'U/B/M']} />
                                <Input label="Positioning" name="positioning" value={currentLogInputs.positioning} onChange={handleLogInputChange} />
                                <Input label="Line Check" name="lineCheck" value={currentLogInputs.lineCheck} onChange={handleLogInputChange} />
                                <TextArea label="Comments" name="comments" value={currentLogInputs.comments} onChange={handleLogInputChange} rows="2" />
                                <div className="col-span-full flex justify-end">
                                    <Button onClick={() => handleAddLog(time)} disabled={savingLog}>
                                        {savingLog ? 'Adding...' : `Add Log for ${time}`}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

// Component for Event Log tab
const EventLogSection = ({ currentShiftId, babyId }) => {
    const { userId, db } = useContext(AppContext);
    const [events, setEvents] = useState([]);
    const [showAddEventModal, setShowAddEventModal] = useState(false);

    useEffect(() => {
        if (!userId || !currentShiftId || !babyId) return;
        const unsubscribe = getEventLogs(userId, currentShiftId, babyId, setEvents);
        return () => unsubscribe();
    }, [userId, currentShiftId, babyId]);

    const handleAddEvent = async (eventData) => {
        try {
            await addEventLog(userId, currentShiftId, babyId, { ...eventData, timestamp: new Date().toISOString() });
            alert('Event added!');
            setShowAddEventModal(false);
        } catch (error) {
            console.error("Error adding event:", error);
            alert('Failed to add event.');
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Event Log</h3>
            <p className="text-sm text-red-600 mb-4">
                **Reminder: Do NOT enter any PHI in event details.** (e.g., "Parents visited," NOT "Mr. and Mrs. Smith visited")
            </p>
            <Button onClick={() => setShowAddEventModal(true)} className="mb-4">Add New Event</Button>

            <div className="space-y-4">
                {events.length === 0 ? (
                    <p className="text-gray-600">No events logged yet.</p>
                ) : (
                    events.map(event => (
                        <div key={event.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-500">{new Date(event.timestamp).toLocaleString()}</p>
                            <p className="font-semibold text-gray-800">{event.eventType}:</p>
                            <p className="text-gray-700">{event.eventDetails}</p>
                        </div>
                    ))
                )}
            </div>

            {showAddEventModal && (
                <AddEventModal onClose={() => setShowAddEventModal(false)} onSave={handleAddEvent} />
            )}
        </div>
    );
};

// Modal for adding events
const AddEventModal = ({ onClose, onSave }) => {
    const [eventType, setEventType] = useState('');
    const [eventDetails, setEventDetails] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!eventType || !eventDetails) {
            alert('Please select event type and provide details.');
            return;
        }
        setIsSaving(true);
        await onSave({ eventType, eventDetails });
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Add New Event</h3>
                <p className="text-sm text-red-600 mb-4">
                    **Reminder: Do NOT enter any PHI.**
                </p>
                <div className="mb-4">
                    <Select
                        label="Event Type"
                        name="eventType" // Added name prop
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        options={['', 'Desat / Brady event', 'Med given', 'Lab drawn', 'Procedure', 'Note', 'Parent contact / visitation', 'Escalation to MD / NP']}
                    />
                </div>
                <TextArea label="Event Details" name="eventDetails" value={eventDetails} onChange={(e) => setEventDetails(e.target.value)} placeholder="e.g., Desat to 60s x 15 sec, required required stimulation" rows="4" />
                <div className="flex justify-end space-x-4 mt-6">
                    <Button onClick={onClose} className="bg-gray-400 hover:bg-gray-500">Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Event'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Main Individual Baby Report Screen
const IndividualBabyReportScreen = ({ currentShift, babyId, onBack }) => {
    const { userId, db } = useContext(AppContext);
    const [baby, setBaby] = useState(null);
    const [activeTab, setActiveTab] = useState('report'); // 'report', 'touchTimeLogs', 'eventLog'

    useEffect(() => {
        if (!userId || !currentShift?.id || !babyId) return;
        const babyRef = doc(collection(getUserCollectionPath(userId), 'nicu_shifts', currentShift.id, 'babies'), babyId);
        const unsubscribe = onSnapshot(babyRef, (docSnap) => {
            if (docSnap.exists()) {
                setBaby({ id: docSnap.id, ...docSnap.data() });
            } else {
                setBaby(null);
                onBack(); // Go back if baby not found (e.g., deleted)
            }
        });
        return () => unsubscribe();
    }, [userId, currentShift?.id, babyId, onBack]);

    if (!baby) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <p className="text-lg text-gray-600">Loading baby data...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="container mx-auto py-8">
                <Button onClick={onBack} className="mb-6 bg-gray-600 hover:bg-gray-700">← Back to Babies</Button>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">{baby.internalID_Nickname}</h2>
                <p className="text-xl text-indigo-700 mb-6">
                    GA: {baby.gestationalAge_Weeks}+{baby.gestationalAge_Days} | CGA: {baby.correctedGestationalAge_Weeks}+{baby.correctedGestationalAge_Days} | PNA: Day {baby.pna_Days}
                </p>

                <div className="flex border-b border-gray-200 mb-6">
                    <button
                        className={`py-2 px-4 text-sm font-medium ${activeTab === 'report' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('report')}
                    >
                        Report Sheet
                    </button>
                    <button
                        className={`py-2 px-4 text-sm font-medium ${activeTab === 'touchTimeLogs' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('touchTimeLogs')}
                    >
                        Touch Time Logs
                    </button>
                    <button
                        className={`py-2 px-4 text-sm font-medium ${activeTab === 'eventLog' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('eventLog')}
                    >
                        Event Log
                    </button>
                </div>

                {activeTab === 'report' && <ReportSheetSection currentShiftId={currentShift.id} babyId={baby.id} assignmentType={currentShift.assignmentType || 'ICU'} />}
                {activeTab === 'touchTimeLogs' && <TouchTimeLogsSection currentShiftId={currentShift.id} babyId={baby.id} babyQ3StartTime={baby.babyQ3StartTime} />}
                {activeTab === 'eventLog' && <EventLogSection currentShiftId={currentShift.id} babyId={baby.id} />}
            </div>
        </div>
    );
};

// Screen 4: End-of-Shift Summary
const ShiftSummaryScreen = ({ currentShift, babies, allReportDetails, allTouchTimeLogs, allEventsData, onBackToShifts, onDeleteShift }) => {
    const { userId } = useContext(AppContext);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteAndReturn = async () => {
        if (!window.confirm('Are you sure you want to delete this shift? This action cannot be undone.')) {
            return;
        }
        setIsDeleting(true);
        try {
            await deleteShift(userId, currentShift.id);
            alert('Shift deleted successfully!');
            onDeleteShift(); // This should clear the shift and return to setup
        } catch (error) {
            console.error("Error deleting shift:", error);
            alert('Failed to delete shift. See console for details.');
            setIsDeleting(false);
        }
    };

    const generateSummaryText = () => {
        let summary = `--- NICU Shift Report Summary ---\n`;
        summary += `Shift Date: ${currentShift.shiftDate} | Overall Shift Start Time: ${currentShift.shiftStartTime}\n\n`;

        babies.forEach(baby => {
            summary += `--- Baby: ${baby.internalID_Nickname} ---\n`;
            summary += `  GA: ${baby.gestationalAge_Weeks}+${baby.gestationalAge_Days} | CGA: ${baby.correctedGestationalAge_Weeks}+${baby.correctedGestationalAge_Days} | PNA: Day ${baby.pna_Days}\n`;
            summary += `  Bed: ${baby.bedRoomNumber}\n`;
            summary += `  Birth Wt: ${baby.birthWeight}g | Last Wt: ${baby.lastWeight}g | HC: ${baby.headCircumference}cm | AG: ${baby.abdominalGirth}cm\n`;
            if (baby.birthWeight && baby.lastWeight) {
                const weightChange = ((baby.lastWeight - baby.birthWeight) / baby.birthWeight * 100).toFixed(2);
                summary += `  Weight % Change: ${weightChange}%\n`;
            }
            if (baby.bedChangeDue) summary += `  Bed Change Due: Yes\n`;

            summary += `  Baby q3 Start Time: ${baby.babyQ3StartTime}\n`;
            summary += `  Baby q3 Schedule: ${generateQ3Schedule(baby.babyQ3StartTime).join(', ')}\n`;


            const report = allReportDetails[baby.id] || {};
            summary += `\n  -- Report Sheet --\n`;
            summary += `  Maternal Hx: ${report.maternalHistory || 'N/A'}\n`;
            summary += `  Problems: ${report.currentProblems || 'N/A'}\n`;
            summary += `  Resp: ${report.respiratoryMode || 'N/A'} @ ${report.respiratoryFlow || 'N/A'}L/min, ${report.respiratoryFiO2 || 'N/A'}% FiO2 | CBG/ABG Sched: ${report.cbgAbgSchedule || 'N/A'}\n`;
            summary += `  Feeds: ${report.feedsRoute || 'N/A'} ${report.feedType || 'N/A'} ${report.feedCalories || 'N/A'} ${report.feedVolume || 'N/A'} (NG/OG: ${report.ngOgTubeDetails || 'N/A'}) | Nipple: ${report.bottleNippleType || 'N/A'}\n`;
            summary += `  Feed Instr: ${report.feedSpecialInstructions || 'N/A'}\n`;

            // IV Fluids - Enhanced display based on line type
            summary += `  IV Line: ${report.ivLineType || 'N/A'} @ ${report.ivSite || 'N/A'}\n`;
            if (report.ivLineType === 'PICC') {
                summary += `    PICC: Circumference ${report.piccCircumference || 'N/A'}, Line out ${report.piccLineOut || 'N/A'}\n`;
                summary += `    Fluids: ${report.piccFluids || 'N/A'} @ ${report.piccRate || 'N/A'}\n`;
            } else if (report.ivLineType === 'UVC') {
                summary += `    UVC Length Visible: ${report.uvcLengthVisible || 'N/A'}\n`;
                summary += `    Proximal Lumen: ${report.uvcProximalLumen || 'N/A'} @ ${report.uvcProximalRate || 'N/A'}\n`;
                summary += `    Distal Lumen: ${report.uvcDistalLumen || 'N/A'} @ ${report.uvcDistalRate || 'N/A'}\n`;
            } else if (report.ivLineType === 'UAC') {
                summary += `    UAC Length Visible: ${report.uacLengthVisible || 'N/A'}\n`;
                summary += `    Fluids: ${report.uacFluids || 'N/A'} @ ${report.uacRate || 'N/A'}\n`;
            } else {
                summary += `    Fluids: ${report.ivFluidsGeneral || 'N/A'} @ ${report.ivRateGeneral || 'N/A'}\n`;
            }

            const meds = report.medications ? Object.keys(report.medications).filter(key => report.medications[key] === true).join(', ') : '';
            summary += `  Medications: ${meds}${report.medications?.otherMedications ? (meds ? ', ' : '') + report.medications.otherMedications : '' || 'N/A'}\n`;
            summary += `  Labs Ordered: ${report.labsOrdered || 'N/A'}\n`;
            summary += `  Lab Results: ${report.labResults || 'N/A'}\n`;
            summary += `  Tx Plan: ${report.treatmentPlan || 'N/A'}\n`;
            summary += `  Notes: ${report.notes || 'N/A'}\n`;

            summary += `\n  -- Touch Time Logs --\n`;
            const babyTouchTimes = allTouchTimeLogs[baby.id] || [];
            if (babyTouchTimes.length === 0) {
                summary += `  No touch times logged.\n`;
            } else {
                babyTouchTimes.forEach(log => {
                    summary += `    ${log.scheduledTime} (Logged: ${new Date(log.timestamp).toLocaleTimeString()})\n`;
                    summary += `      Temp: ${log.temp || 'N/A'}, HR: ${log.hr || 'N/A'}, RR: ${log.rr || 'N/A'}, SpO2: ${log.spo2 || 'N/A'}\n`;
                    summary += `      Feed: ${log.feedVolume || 'N/A'} ${log.feedRoute || ''} (${log.feedTolerance || 'N/A'})\n`;
                    summary += `      Diaper: ${log.diaperOutput || 'N/A'} | Position: ${log.positioning || 'N/A'} | Line: ${log.lineCheck || 'N/A'}\n`;
                    summary += `      Comments: ${log.comments || 'N/A'}\n`;
                });
            }

            summary += `\n  -- Event Log --\n`;
            const babyEvents = allEventsData[baby.id] || [];
            if (babyEvents.length === 0) {
                summary += `  No events logged.\n`;
            } else {
                babyEvents.forEach(event => {
                    summary += `    ${new Date(event.timestamp).toLocaleString()}: ${event.eventType} - ${event.eventDetails || 'N/A'}\n`;
                });
            }
            summary += `\n`;
        });
        return summary;
    };

    const handleCopyToClipboard = () => {
        const summaryText = generateSummaryText();
        // Use document.execCommand('copy') for better compatibility in iFrames
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = summaryText;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        try {
            document.execCommand('copy');
            alert('Summary copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy. Please manually select and copy the text.');
        } finally {
            document.body.removeChild(tempTextArea);
        }
    };

    const handlePrintPdf = () => {
        const summaryText = generateSummaryText();
        // A simple way to trigger print for text, a dedicated PDF library would be needed for true PDF generation
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<pre>${summaryText}</pre>`);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="container mx-auto py-8">
                <div className="flex justify-between items-center mb-6">
                    <Button onClick={onBackToShifts} className="bg-gray-600 hover:bg-gray-700">← Back to Dashboard</Button>
                    <Button onClick={handleDeleteAndReturn} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                        {isDeleting ? 'Deleting...' : 'Delete Shift & Return'}
                    </Button>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-6">End-of-Shift Summary</h2>
                <p className="text-sm text-red-600 mb-4">
                    **Reminder: This summary is de-identified. Add patient PHI (Name, DOB) ONLY when charting in the hospital's official system.**
                </p>

                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Summary Text for Review:</h3>
                    <div className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm font-mono whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                        {generateSummaryText()}
                    </div>
                    <div className="flex justify-end space-x-4 mt-6">
                        <Button onClick={handleCopyToClipboard}>Copy for Charting</Button>
                        <Button onClick={handlePrintPdf} className="bg-blue-500 hover:bg-blue-600">Print / PDF</Button>
                    </div>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> You can keep this shift data and return to the dashboard, or delete it permanently using the button above.
                        Make sure you've copied the summary for your official charting before deleting!
                    </p>
                </div>

            </div>
        </div>
    );
};

// Main App component wrapper to provide context
function MainApp() {
    const { userId, loading, firebaseReady } = useContext(AppContext);
    const [screen, setScreen] = useState('shiftSetup'); // 'shiftSetup', 'dashboard', 'addBaby', 'babyReport', 'summary'
    const [currentShift, setCurrentShift] = useState(null); // Currently selected shift object
    const [selectedBabyId, setSelectedBabyId] = useState(null); // Currently selected baby ID
    const [allShifts, setAllShifts] = useState([]); // To display list of past shifts for summary
    const [allBabiesData, setAllBabiesData] = useState({}); // To store babies data across shifts
    const [allReportsData, setAllReportsData] = useState({}); // To store report data across babies/shifts
    const [allTouchTimesData, setAllTouchTimesData] = useState({}); // To store touch times across babies/shifts
    const [allEventsData, setAllEventsData] = useState({}); // To store events across babies/shifts

    // Fetch all shifts on app load to populate past shifts list
    useEffect(() => {
        if (!firebaseReady || !userId) return;
        const unsubscribe = getShifts(userId, setAllShifts);
        return () => unsubscribe();
    }, [userId, firebaseReady]);

    // Handle shift creation and navigation
    const handleStartShift = async (shiftDetails) => {
        if (!userId) return;
        try {
            const newShiftRef = await addShift(userId, shiftDetails);
            setCurrentShift({ id: newShiftRef.id, ...shiftDetails });
            setScreen('dashboard');
        } catch (error) {
            console.error("Error starting new shift:", error);
            alert("Failed to start new shift. Please try again.");
        }
    };

    // Handle navigating to Add Baby screen
    const handleAddBaby = () => {
        setScreen('addBaby');
    };

    // Handle saving new baby and returning to dashboard
    const handleSaveBaby = () => {
        setScreen('dashboard');
    };

    // Handle selecting a baby to view its report
    const handleSelectBaby = (babyId) => {
        setSelectedBabyId(babyId);
        setScreen('babyReport');
    };

    // Handle navigating back from baby report to dashboard
    const handleBackToDashboard = () => {
        setSelectedBabyId(null);
        setScreen('dashboard');
    };

    // Handle ending shift and going to summary (pre-fetches all data for summary)
    const handleEndShift = async () => {
        if (!userId || !currentShift?.id) return;

        const babiesInCurrentShift = await new Promise(resolve => {
            const unsubscribe = getBabies(userId, currentShift.id, (babies) => {
                unsubscribe(); // Unsubscribe after first fetch
                resolve(babies);
            });
        });

        const reportsMap = {};
        const touchTimesMap = {};
        const eventsMap = {};

        // Fetch all report details, touch times, and events for each baby
        await Promise.all(babiesInCurrentShift.map(async (baby) => {
            const report = await new Promise(resolve => {
                const unsubscribe = getReportSheet(userId, currentShift.id, baby.id, (data) => {
                    unsubscribe();
                    resolve(data);
                });
            });
            reportsMap[baby.id] = report;

            const touchTimes = await new Promise(resolve => {
                const unsubscribe = getTouchTimeLogs(userId, currentShift.id, baby.id, (data) => {
                    unsubscribe();
                    resolve(data);
                });
            });
            touchTimesMap[baby.id] = touchTimes;

            const events = await new Promise(resolve => {
                const unsubscribe = getEventLogs(userId, currentShift.id, baby.id, (data) => {
                    unsubscribe();
                    resolve(data);
                });
            });
            eventsMap[baby.id] = events;
        }));

        setAllBabiesData(babiesInCurrentShift);
        setAllReportsData(reportsMap);
        setAllTouchTimesData(touchTimesMap);
        setAllEventsData(eventsMap);
        setScreen('summary');
    };

    // Handle going back from summary to the dashboard (keeps current shift context)
    const handleBackToDashboardFromSummary = () => {
        setScreen('dashboard');
    };

    // Handle shift deletion from summary screen (clears current shift and returns to setup)
    const handleDeleteShiftAndReturn = () => {
        setCurrentShift(null);
        setScreen('shiftSetup');
    };


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <p className="text-xl text-indigo-600">Loading application...</p>
            </div>
        );
    }

    if (!firebaseReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 p-4">
                <p className="text-xl">Error: Firebase is not properly configured or initialized. Please check your environment variables.</p>
            </div>
        );
    }

    // Main App Routing Logic
    switch (screen) {
        case 'shiftSetup':
            return <ShiftSetupScreen onStartShift={handleStartShift} />;
        case 'dashboard':
            return (
                <BabyListDashboard
                    currentShift={currentShift}
                    onAddBaby={handleAddBaby}
                    onSelectBaby={handleSelectBaby}
                    onEndShift={handleEndShift} // Trigger end shift which loads summary
                />
            );
        case 'addBaby':
            return <AddBabyScreen currentShiftId={currentShift?.id} shiftStartTime={currentShift?.shiftStartTime || '07:00'} onSaveBaby={handleSaveBaby} onCancel={handleBackToDashboard} />;
        case 'babyReport':
            return (
                <IndividualBabyReportScreen
                    currentShift={currentShift}
                    babyId={selectedBabyId}
                    onBack={handleBackToDashboard}
                />
            );
        case 'summary':
            return (
                <ShiftSummaryScreen
                    currentShift={currentShift}
                    babies={allBabiesData}
                    allReportDetails={allReportsData}
                    allTouchTimeLogs={allTouchTimesData}
                    allEventsData={allEventsData}
                    onBackToShifts={handleBackToDashboardFromSummary}
                    onDeleteShift={handleDeleteShiftAndReturn}
                />
            );
        default:
            return <ShiftSetupScreen onStartShift={handleStartShift} />;
    }
}

// The main App component will now just wrap MainAppContent with AppProvider
function App() {
    return (
        <AppProvider>
            <MainApp />
        </AppProvider>
    );
}

export default App;
