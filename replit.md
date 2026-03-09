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
- Bilingual UI (Arabic/English) with language toggle on every page

## Theme
- Neon Red (#FF0000) primary on Black (#000000) background
- Font: Tajawal / Cairo (Arabic fonts)
- Dark-first design (`:root` uses dark colors)

## Language & Direction
- Bilingual: Arabic (default, RTL) and English (LTR)
- Language persisted in localStorage (`dp-lang`)
- `useLanguage()` hook provides `t(ar, en)` helper, `toggleLanguage()`, `isRTL`, `lang`
- Globe icon toggle appears on every page (nav bar, login, register, pending, dashboard)
- HTML `dir` and `lang` attributes updated dynamically on language switch
- Email/password/URL inputs always use `dir="ltr"`

## Dashboard - Kiosk Mode
- Split-screen layout: sidebar (New Orders) + main area (Active Pagers)
- Optimized for tablet landscape (768-1024px) with extra-large touch buttons
- **Fullscreen Mode:** Maximize icon in header uses Fullscreen API to hide browser chrome
- **Wake Lock:** Screen Wake Lock API prevents tablet screen from dimming; green indicator shows status
- Stats bar at bottom: Waiting, Paged, Completed counts

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
- `/` - Landing page (bilingual)
- `/register` - Store registration with business type dropdown
- `/login` - Sign in
- `/pending` - Shown when merchant status is "pending"
- `/dashboard` - Kiosk-mode dashboard (split-screen, fullscreen, wake lock)

## Environment Variables
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID

## Key Files
- `client/src/lib/firebase.ts` - Firebase initialization
- `client/src/hooks/use-auth.ts` - Auth state hook (context-based)
- `client/src/hooks/use-language.ts` - Language context (AR/EN toggle)
- `client/src/hooks/use-wake-lock.ts` - Screen Wake Lock API hook
- `client/src/hooks/use-fullscreen.ts` - Fullscreen API hook
- `shared/schema.ts` - Zod schemas for merchant data with Arabic validation messages
- `server/routes.ts` - Express API routes (logo upload)
