# Digital Pager

A multi-tenant SaaS platform for digital pager services (restaurants, cafes, clinics, etc.).

## Tech Stack
- **Frontend:** React, Vite, TailwindCSS, shadcn/ui
- **Backend:** Node.js, Express
- **Database:** Firebase Firestore (NoSQL)
- **Auth:** Firebase Auth (Email/Password with email verification)
- **File Uploads:** Multer (stored locally in `client/public/uploads/`)

## Architecture
- Multi-tenant: Each store's data is isolated in Firestore under `merchants/{uid}`
- Firebase client SDK handles auth and Firestore on the frontend
- Backend handles file uploads only (logo images)
- Admin approval gate: merchants start with `status: "pending"` until Super Admin changes to `"approved"` in Firestore
- UI is fully in Arabic (RTL layout)

## Theme
- Neon Red (#FF0000) primary on Black (#000000) background
- Font: Tajawal / Cairo (Arabic fonts)
- Dark-first design (`:root` uses dark colors)

## Language & Direction
- Full Arabic UI with RTL direction set on `<html dir="rtl" lang="ar">`
- All labels, messages, errors in Arabic
- Email/password/URL inputs use `dir="ltr"` for proper input behavior

## Data Model (Firestore: `merchants` collection)
- `id` / `uid`: Firebase Auth UID
- `storeName`: Store name (اسم المتجر)
- `businessType`: "restaurant" | "cafe" | "clinic" | "other" (نوع النشاط)
- `ownerName`: Owner name (اسم المالك)
- `email`: Email address
- `logoUrl`: Uploaded logo path
- `googleMapsReviewUrl`: Google Maps review link
- `status`: "pending" | "approved" | "rejected"
- `createdAt`: ISO timestamp

## Pages
- `/` - Landing page (Arabic)
- `/register` - Store registration with business type dropdown
- `/login` - Sign in
- `/pending` - Shown when merchant status is "pending"
- `/dashboard` - Main dashboard (only accessible when status is "approved")

## Environment Variables
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID

## Key Files
- `client/src/lib/firebase.ts` - Firebase initialization
- `client/src/hooks/use-auth.ts` - Auth state hook (context-based)
- `shared/schema.ts` - Zod schemas for merchant data with Arabic validation messages
- `server/routes.ts` - Express API routes (logo upload)
