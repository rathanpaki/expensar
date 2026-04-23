# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Firebase backend

This app uses Firebase Auth and Firestore as the full backend (no separate server needed).

### Setup

1. Create a project at [firebase.google.com](https://firebase.google.com)
2. Go to Authentication → Email/Password and enable it
3. Create a Firestore database in production mode
4. In Project Settings, copy your web app config values
5. Copy `.env.example` to `.env.local` and fill in the values
6. Restart the dev server: `npm run dev`

### Data Structure

```
users/{uid}
  └─ expenses/{docId}
  └─ budgets/{category}
```

All reads and writes are scoped to authenticated users only by Firestore rules.

### Security

- **Firestore Rules**: Only users can read/write their own data (`firestore.rules`)
- **Auth**: Uses Firebase Email/Password with no client secret exposure
- **Validation**: All inputs validated before database operations
- **Storage**: User data never stored in localStorage beyond the session
- **Environment**: Firebase config is public-safe (API key is meant to be exposed in client apps)

### Deploy

Build the app:

```bash
npm run build
```

Deploy to Firebase Hosting:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting  # Select your project
firebase deploy
```
