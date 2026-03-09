# Digital Pager

A multi-tenant SaaS platform for restaurant digital pager services.

## Tech Stack
- **Frontend:** React, Vite, TailwindCSS, shadcn/ui
- **Backend:** Node.js, Express
- **Database:** Firebase Firestore (NoSQL)
- **Auth:** Firebase Auth (Email/Password with email verification)
- **File Uploads:** Multer (stored locally in `client/public/uploads/`)

## Architecture
- Multi-tenant: Each restaurant's data is isolated in Firestore under `merchants/{uid}`
- Firebase client SDK handles auth and Firestore on the frontend
- Backend handles file uploads only (logo images)
- Admin approval gate: merchants start with `status: "pending"` until Super Admin changes to `"approved"` in Firestore

## Theme
- Neon Red (#FF0000) primary on Black (#000000) background
- Font: Space Grotesk (sans), JetBrains Mono (mono)
- Dark-first design (`:root` uses dark colors, `.dark` class mirrors)

## Pages
- `/` - Landing page
- `/register` - Merchant registration (restaurant name, owner, email, password, logo upload, Google Maps URL)
- `/login` - Sign in
- `/pending` - Shown when merchant status is "pending"
- `/dashboard` - Main dashboard (only accessible when status is "approved")

## Environment Variables
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID

## Key Files
- `client/src/lib/firebase.ts` - Firebase initialization
- `client/src/hooks/use-auth.ts` - Auth state hook
- `shared/schema.ts` - Zod schemas for merchant data
- `server/routes.ts` - Express API routes (logo upload)

## Firebase Setup Required
1. Enable Email/Password authentication in Firebase Console
2. Create a Firestore database
3. Add the Repl's URL to Firebase Auth authorized domains
