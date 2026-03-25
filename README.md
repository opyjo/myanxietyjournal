# Anxiety Journal

Consumer wellness app for anxiety check-ins, trigger logging, medication tracking, AI pattern analysis, and clinician-ready summaries.

## Stack

- React + Vite + TypeScript
- Firebase Auth, Firestore, Hosting, Cloud Functions
- Claude Sonnet 4 for pattern analysis

## Local setup

1. Copy `.env.example` to `.env.local` and fill in Firebase web config values.
2. Create Firebase projects for dev and prod, then connect them via `.firebaserc`.
3. Set the Anthropic API key for Firebase Functions:

   ```bash
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```

4. Install dependencies:

   ```bash
   npm install
   ```

5. Run the app:

   ```bash
   npm run dev
   ```

## Firebase data model

- `users/{uid}/dailyCheckins/{yyyy-mm-dd}`
- `users/{uid}/triggerLogs/{autoId}`
- `users/{uid}/medications/{medId}`
- `users/{uid}/analysisRuns/{autoId}`
