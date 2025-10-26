# NICU Shift Report Tracker

A comprehensive digital shift tracking application designed specifically for NICU nurses. This app replaces traditional paper report sheets with a streamlined digital workflow that tracks patient care, touch times, and events throughout your shift.

## Features

### Core Functionality

1. **Shift Setup**
   - Select shift start time (Day: 07:00 or Night: 13:00)
   - **Choose Assignment Type:** ICU (Critical Care) or Intermediate (Feeder/Grower)
     - **ICU Assignment:** Emphasizes IV lines, hourly assessments, critical care tasks, medications, problem-solving & advocacy
     - **Intermediate Assignment:** Focuses on feeding progression, growth tracking, discharge planning, parent teaching
   - Auto-generates q3 touch time schedules
   - Supports multiple babies per shift

2. **Baby Management**
   - Add multiple babies with de-identified information
   - Track gestational age, corrected age, and post-natal age
   - Record growth data (weight, length, head circumference, abdominal girth)
   - Individual q3 start time per baby

3. **Comprehensive Report Sheet**

   **All Assignment Types:**
   - **Maternal History** - De-identified maternal background
   - **Current Problems** - Baby's diagnosis and issues
   - **Respiratory Support** - Mode, flow, FiO2, blood gas schedule
   - **Feeds** - Route, type, calories, volume, nipple type, special instructions
   - **IV Fluids & Lines** - Enhanced tracking for:
     - Peripheral IVs
     - PICC lines (circumference, line out measurements)
     - UVC lines (length visible, proximal/distal lumen details)
     - UAC lines (length visible, fluids)
   - **Medications** - Common antibiotics (Gentamicin, Ampicillin, Vanc) + custom meds
   - **Labs** - Ordered tests and results
   - **Treatment Plan** - Care plan and timelines
   - **Notes** - Additional narrative information

   **Intermediate Assignment Additional Sections:**
   - **Feeding Progression & Goals** - Track bottle/breastfeeding progress, feeding goals
   - **Discharge Planning** - Discharge goals, criteria remaining, car seat test, home preparation
   - **Parent Teaching & Involvement** - Document teaching sessions and parent participation
   - **Growth & Weight Goals** - Weight gain goals and tracking

4. **Touch Time Logs (q3 Intervals)**
   - Auto-generated time slots based on baby's q3 start time
   - Track for each touch time:
     - Vital signs (Temp, HR, RR, SpO2)
     - Feed given (volume, route, tolerance)
     - Residual checks
     - Diaper output (U/B/M combinations)
     - Positioning
     - Line checks
     - Comments
   - Visual completion status for each time slot

5. **Event Log**
   - Timestamped entries for any-time events:
     - Desat/Brady events
     - Medications given
     - Labs drawn
     - Procedures
     - Parent contact/visitation
     - Escalation to MD/NP
     - General notes

6. **End-of-Shift Summary**
   - Complete shift overview for each baby
   - Copy-to-clipboard for easy charting
   - Printable/PDF export option
   - Includes all report data, touch times, and events

## Privacy & HIPAA Compliance

**IMPORTANT:** This app is designed for **DE-IDENTIFIED** patient information only.

- ❌ DO NOT enter patient names
- ❌ DO NOT enter exact dates of birth
- ❌ DO NOT enter medical record numbers
- ✅ DO use internal IDs, nicknames, or room/bed numbers
- ✅ DO calculate ages (PNA, GA, CGA) without storing DOB
- ✅ DO add full PHI only when transferring to official hospital charting systems

The app uses Firebase for data storage. All data is stored per-user and not shared between users.

## Technology Stack

- **Frontend:** React 18
- **Styling:** Tailwind CSS
- **Backend/Database:** Firebase (Firestore + Authentication)
- **Build Tool:** Vite
- **Deployment:** Can be deployed to Firebase Hosting, Vercel, Netlify, or any static hosting service

## Setup Instructions

### Quick Start

Choose your path:

✨ **[Already Have Firebase Auth?](./COMPLETE_DATABASE_SETUP.md)** - Complete your database setup (5 min)

📚 **[Quick Start Guide](./QUICKSTART.md)** - Full setup from scratch (10-15 min)

📖 **[Detailed Setup Guide](./FIREBASE_SETUP.md)** - Complete instructions with troubleshooting

🗄️ **[Database Schema](./DATABASE_SCHEMA.md)** - Understanding the data structure

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Firebase account (free tier is sufficient for personal use)

### Setup Steps Overview

#### Automated Setup (Recommended)

```bash
# 1. Clone and install
git clone <your-repo-url>
cd nicushifttracker
npm install

# 2. Run interactive setup
npm run setup-database

# 3. Test connection
npm run test-database

# 4. Start developing
npm run dev
```

#### Manual Setup

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd nicushifttracker
   npm install
   ```

2. **Create Firebase Project**
   - Visit [Firebase Console](https://console.firebase.google.com/)
   - Create new project
   - Enable Firestore Database (production mode)
   - Enable Anonymous Authentication

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase credentials
   ```

4. **Deploy Security Rules**
   ```bash
   firebase login
   firebase deploy --only firestore
   ```

5. **Verify Setup**
   ```bash
   npm run verify-firebase
   ```

6. **Start Development**
   ```bash
   npm run dev
   ```

For detailed instructions, see **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** or **[COMPLETE_DATABASE_SETUP.md](./COMPLETE_DATABASE_SETUP.md)** if you already have authentication configured.

### Alternative: Manual Firebase Setup

If you prefer to configure Firebase directly in code (for Canvas or similar environments):

Edit `src/App.jsx` and update the Firebase initialization section (lines 8-11) to use your config directly or environment variables.

Manual security rules setup is also covered in the [Complete Setup Guide](./FIREBASE_SETUP.md#step-6-set-up-firestore-security-rules).
```

The app will be available at `http://localhost:3000`

## Deployment

### Option 1: Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init
   ```
   - Select "Hosting"
   - Choose your Firebase project
   - Set public directory to `dist`
   - Configure as single-page app: Yes
   - Don't overwrite index.html

4. Build and deploy:
   ```bash
   npm run build
   firebase deploy
   ```

### Option 2: Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   npm run build
   vercel --prod
   ```

3. Add environment variables in Vercel dashboard

### Option 3: Netlify

1. Build the app:
   ```bash
   npm run build
   ```

2. Drag and drop the `dist` folder to [Netlify Drop](https://app.netlify.com/drop)

3. Or use Netlify CLI:
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=dist
   ```

## Usage Guide

### Starting a Shift

1. Open the app
2. Select your shift start time (07:00 for day shift, 13:00 for night shift)
3. **Choose your assignment type:**
   - **ICU (Critical Care):** For critically ill babies requiring intensive monitoring, IV medications, line management, and complex care
   - **Intermediate (Feeder/Grower):** For stable babies working towards discharge, focusing on feeding progression and parent teaching
4. Review the assignment focus description to confirm
5. Click "Start Shift"

### Adding a Baby

1. Click "Add Baby" on the dashboard
2. Fill in the baby's information:
   - Internal ID/Nickname (e.g., "R3B1", "Baby Star")
   - Select baby's q3 start time
   - Days old (PNA)
   - Gestational ages
   - Apgars
   - Growth data
3. Click "Save Baby"

### Filling Out Report Sheet

1. Click on a baby card from the dashboard
2. Go to "Report Sheet" tab
3. Fill out each section (collapsible for easy navigation):
   - History & Current Problems
   - Respiratory
   - Feeds & Details
   - IV Fluids & Lines (select line type to see specific fields)
   - Medications
   - Labs, Treatment & Notes
4. Click "Save Report Sheet"

### Logging Touch Times

1. Select a baby
2. Go to "Touch Time Logs" tab
3. For each q3 scheduled time:
   - Fill in vital signs
   - Document feeding
   - Record diaper output
   - Note positioning and line checks
   - Add comments as needed
4. Click "Add Log for [time]"
5. Completed touch times are marked with a green indicator

### Adding Events

1. Select a baby
2. Go to "Event Log" tab
3. Click "Add New Event"
4. Select event type and add details
5. Events are automatically timestamped

### Ending Your Shift

1. Return to the baby list dashboard
2. Click "End Shift / Delete"
3. View the comprehensive summary
4. Use "Copy for Charting" to copy the entire summary
5. Or "Print / PDF" to create a printable version
6. Transfer information to official hospital charting system (adding PHI as needed)
7. Confirm deletion when done

## App Structure

```
nicushifttracker/
├── src/
│   ├── App.jsx           # Main application component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles with Tailwind
├── public/               # Static assets
├── index.html            # HTML template
├── package.json          # Dependencies and scripts
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── .env                  # Environment variables (not committed)
```

## Data Structure

The app uses Firestore with the following structure:

```
artifacts/
  └── {appId}/
      └── users/
          └── {userId}/
              └── nicu_shifts/
                  └── {shiftId}/
                      ├── shiftDate
                      ├── shiftStartTime
                      └── babies/
                          └── {babyId}/
                              ├── baby data (name, ages, growth, etc.)
                              ├── reportSheet/
                              │   └── main (all report data)
                              ├── touchTimeLogs/
                              │   └── {logId} (timestamp, vitals, etc.)
                              └── eventLogs/
                                  └── {eventId} (timestamp, type, details)
```

## Troubleshooting

### Firebase Connection Issues

- Verify your `.env` file has correct Firebase credentials
- Check that Firestore and Authentication are enabled in Firebase Console
- Ensure security rules are properly configured

### App Not Loading

- Clear browser cache and reload
- Check browser console for errors
- Verify all dependencies are installed (`npm install`)

### Data Not Saving

- Confirm you're signed in (check console for auth messages)
- Verify Firestore security rules allow writes
- Check browser console for Firestore errors

## Future Enhancements (Phase 2)

- Photo attachment for bedside cards
- Status tags (Stable / Watch / Critical)
- Archive and search past shifts
- Auto-calculate weight loss percentage
- Multi-user support with secure nurse login
- Dark mode
- Offline support with sync

## Contributing

This is a personal/clinical tool. If you'd like to adapt it for your unit:
1. Fork the repository
2. Customize for your workflow
3. Test thoroughly before clinical use
4. Ensure HIPAA compliance in your deployment

## License

This project is provided as-is for educational and clinical use. Ensure compliance with your institution's policies and HIPAA regulations before deployment.

## Support

For issues or questions:
- Check the Troubleshooting section
- Review Firebase documentation
- Open an issue in the repository

---

**Remember:** This app is a workflow tool to help organize your shift. Always document officially in your hospital's approved charting system. Never rely solely on this app for patient records.
