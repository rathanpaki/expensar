# Setup Guide for Expense Tracker Pro

## Prerequisites

- Node.js 16+
- A Firebase account

## Installation & Setup

1. **Clone/extract the project** and install dependencies:

   ```bash
   npm install
   ```

2. **Create a Firebase project**:
   - Go to [firebase.google.com](https://firebase.google.com)
   - Create a new project
   - Skip Google Analytics (optional)

3. **Enable authentication**:
   - Go to Authentication → Sign-in method
   - Enable "Email/Password"
   - Save

4. **Create Firestore database**:
   - Go to Firestore Database
   - Create database in production mode
   - Choose your region and start

5. **Get Firebase config**:
   - Go to Project Settings (gear icon)
   - Under "Your apps", click on the web app or create one
   - Copy the config values

6. **Add environment variables**:
   - Copy `.env.example` to `.env.local`
   - Fill in your Firebase config:
     ```
     VITE_FIREBASE_API_KEY=...
     VITE_FIREBASE_AUTH_DOMAIN=...
     VITE_FIREBASE_PROJECT_ID=...
     VITE_FIREBASE_STORAGE_BUCKET=...
     VITE_FIREBASE_MESSAGING_SENDER_ID=...
     VITE_FIREBASE_APP_ID=...
     ```

7. **Start the app**:
   ```bash
   npm run dev
   ```
   Open http://localhost:5173

## Security Features

✓ **Firestore Security Rules** - Only users can access their own data  
✓ **Firebase Auth** - No password storage on client  
✓ **Input Validation** - All form fields validated before saving  
✓ **Error Messages** - Simple, non-leaking messages to users

## Deploy to Firebase Hosting

```bash
npm run build

npm install -g firebase-tools
firebase login
firebase init hosting  # Select your Firebase project
firebase deploy
```

Your app will be live at: `https://your-project.web.app`
