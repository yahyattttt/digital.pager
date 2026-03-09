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
- Split-screen layout: sidebar (Waitlist) + main area (Notified Pagers)
- Optimized for tablet landscape (768-1024px) with extra-large touch buttons
- **Fullscreen Mode:** Maximize icon in header uses Fullscreen API to hide browser chrome
- **Wake Lock:** Screen Wake Lock API prevents tablet screen from dimming; green indicator shows status
- **Waitlist Management:** Add orders via dialog, Notify button sends real-time alert, Complete/Remove buttons
- **QR Code:** Download Store QR button in header + stats bar; generates neon red QR via server endpoint
- Stats bar at bottom: Waiting count, Paged count, QR download link

## Data Model (Firestore: `merchants` collection)
- `id` / `uid`: Firebase Auth UID
- `storeName`: Store name (اسم المتجر)
- `businessType`: "restaurant" | "cafe" | "clinic" | "other" (نوع النشاط)
- `ownerName`: Owner name (اسم المالك)
- `email`: Email address
- `logoUrl`: Uploaded logo path
- `googleMapsReviewUrl`: Google Maps review link
- `status`: "pending" | "approved" | "rejected" | "suspended" (account status)
- `subscriptionStatus`: "pending" | "active" | "expired" | "cancelled" (subscription gate)
- `plan`: "trial" | "basic" | "premium" | "enterprise" (subscription plan, default: "trial")
- `createdAt`: ISO timestamp

## Data Model (Firestore: `merchants/{uid}/pagers` subcollection)
- `id`: Auto-generated Firestore document ID
- `storeId`: Parent merchant UID
- `orderNumber`: Customer order number
- `status`: "waiting" | "notified" | "completed"
- `createdAt`: ISO timestamp
- `notifiedAt`: ISO timestamp (set when notified)

## Pages
- `/` - Landing page (bilingual)
- `/register` - Store registration with business type dropdown
- `/login` - Sign in
- `/pending` - Shown when merchant status is "pending"
- `/dashboard` - Kiosk-mode dashboard (split-screen, fullscreen, wake lock)
- `/super-admin` - Super Admin panel (only yahiatohary@hotmail.com)
- `/s/:storeId` - Public customer pager page (no auth required)

## Customer Pager System (`/s/:storeId`)
- Public link for each store — customers enter their order number
- Entry screen: order number input + "ابدأ الانتظار واستقبل التنبيه" button (unlocks audio context for autoplay policy)
- Waiting screen: neon red pulse animation with Arabic waiting message + bouncing dots
- Real-time Firestore `onSnapshot` listener watches for status changes
- When merchant clicks "Notify" in dashboard:
  - Customer's phone vibrates continuously (Vibration API loop: 500-200-500-200-800ms via setInterval)
  - Screen flashes red/black (CSS `animate-flash-red` keyframe at 0.6s)
  - `alert.mp3` plays on loop (HTMLAudioElement, unlocked via user gesture on submit)
  - Text changes to: "طلبك جاهز! تفضل بالاستلام"
  - "تم الاستلام - إيقاف التنبيه" button stops all alerts (audio, vibration, flashing)
- After alert stopped: screen stays solid red with "تم إيقاف التنبيه" confirmation
- 2 minutes after notification → "قيمنا على جوجل ماب" review button appears
- Audio file: `client/public/alert.mp3` (copied from attached_assets)
- Cleanup: audio paused + vibration stopped on component unmount
- Store not found / inactive stores show error page

## Super Admin
- Email-gated access: only `yahiatohary@hotmail.com` can access `/super-admin`
- Non-admin users redirected to `/`
- Stores management table: Store Name, Owner, Email, Status, Subscription
- Status badges: Pending (yellow), Active (green), Suspended (red)
- Subscription badges: Inactive (yellow), Active (green), Expired (orange), Cancelled (red)
- Action buttons: تفعيل (Activate — sets both status + subscription), تفعيل الاشتراك (Activate Sub), إيقاف (Suspend), حذف (Delete)
- Delete requires confirmation dialog
- Real-time toast notifications on actions
- Stats cards: Total, Pending, Active, Suspended, Subscribed
- Suspended/rejected merchants are signed out on login attempt

## Subscription System
- Two-layer gating: `status` (account approval) + `subscriptionStatus` (subscription gate)
- Registration defaults: `subscriptionStatus: "pending"`, `plan: "trial"`
- Dashboard shows "Subscription Required" screen if `subscriptionStatus !== "active"`, with WhatsApp contact button
- Super Admin "Activate" button sets both `status: "approved"` AND `subscriptionStatus: "active"`
- Separate "Activate Sub" button for re-activating subscription on already-approved stores
- Modular plan enum (trial/basic/premium/enterprise) ready for Stripe/payment integration
- Plan labels stored in schema with AR/EN translations

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
- `client/src/pages/super-admin.tsx` - Super Admin dashboard
- `client/src/pages/store-pager.tsx` - Public customer pager page
- `server/routes.ts` - Express API routes (logo upload, QR generation)
