# Digital Pager

A multi-tenant SaaS platform for digital pager services (restaurants, cafes, clinics, etc.).

## Tech Stack
- **Frontend:** React, Vite, TailwindCSS, shadcn/ui
- **Backend:** Node.js, Express
- **Database:** Firebase Firestore (NoSQL)
- **Auth:** Firebase Auth (Passwordless OTP via Resend + Custom Token)
- **Push Notifications:** Firebase Cloud Messaging (FCM)
- **File Uploads:** Multer (stored locally in `client/public/uploads/`)

## Architecture
- Multi-tenant: Each store's data is isolated in Firestore under `merchants/{uid}`
- Firebase client SDK handles auth and Firestore on the frontend
- Backend handles file uploads, QR generation, and FCM push relay
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
- `fcmToken`: FCM push notification token (optional, stored when customer grants permission)
- `createdAt`: ISO timestamp
- `notifiedAt`: ISO timestamp (set when notified)

## Pages
- `/` - Landing page (bilingual)
- `/register` - Store registration with passwordless OTP email verification, business type dropdown
- `/login` - Passwordless OTP sign in (email → OTP code → signInWithCustomToken)
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

## Firebase Cloud Messaging (FCM V1)
- **FCM V1 API:** Uses `google-auth-library` with service account (`FIREBASE_SERVICE_ACCOUNT_JSON`) for OAuth2 tokens
- **Endpoint:** `https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`
- **Unified Service Worker:** `client/public/sw.js` handles both app-shell caching AND FCM background messages
- `/firebase-messaging-sw.js` redirects 301 to `/sw.js` for FCM SDK compatibility
- **Config Endpoint:** `/api/firebase-config` returns Firebase config JSON for SW initialization
- **Token Flow:** Customer submits order → notification permission requested → FCM token stored in pager doc `fcmToken` field
- **Push Relay:** Dashboard reads `fcmToken` from pager doc → fetches auth token from `/api/push-auth` → POST `/api/send-push` with `X-Push-Auth` header
- **Auth Protection:** `/api/send-push` requires `X-Push-Auth` header derived from `SESSION_SECRET` (SHA-256 hash)
- **Background Notifications:** SW shows notification with vibration, icon, requireInteraction when app is backgrounded
- `messagingSenderId` extracted from `VITE_FIREBASE_APP_ID` (format `1:SENDER_ID:web:HEX`)
- Token persistence uses `onSnapshot` with retry (waits for pager doc to appear, 30s timeout)

## Passwordless OTP Authentication (Resend + Session-based)
- **No passwords** — both login and registration use email OTP only
- **POST `/api/send-otp`**: Sends 6-digit OTP via Resend, stores OTP in Firestore `otps` collection
- **POST `/api/verify-otp`**: Validates OTP (10-min expiry, max 5 attempts, 6-digit format enforced) → returns UID and custom token
- **Session-based auth**: Client stores `{uid, email}` in localStorage (`dp-session`), no Firebase Auth SDK needed for login
- **No `signInWithCustomToken`** — completely removed Firebase Auth client dependency; sessions are managed via localStorage
- **Login flow**: Email → Send OTP → Enter 6-digit code → Server verifies → Client stores session → Navigate to dashboard
- **Registration flow**: Fill store details + email → Send OTP → Verify OTP (gets UID) → Store session → Save merchant data to Firestore
- OTPs stored in Firestore `otps` collection (persists across server restarts); branded HTML email template (neon red/black theme, Arabic/English)
- Real-time merchant status via Firestore `onSnapshot` — admin approval/suspension reflects immediately in merchant dashboard
- Master OTP `123456` works in dev mode (NODE_ENV !== "production"), bypasses Firestore OTP check entirely
- Error codes: `OTP_EXPIRED`, `INVALID_CODE`, `TOO_MANY_ATTEMPTS`, `NO_OTP`

## Route Guards (App.tsx)
- **ProtectedRoute**: Shows spinner while `loading` or while `user` exists but `merchant` hasn't loaded yet (5s timeout before redirecting to /pending). Rejected/suspended merchants redirected to /login.
- **PendingRoute**: Shows spinner while merchant loading; redirects to /dashboard if merchant exists with approved/pending status.
- **GuestRoute**: Redirects logged-in users to appropriate pages based on role/status.
- **login()** sets `loading=true` to prevent route guards from making premature redirect decisions before merchant data loads from Firestore onSnapshot.

## Registration Resilience
- If client-side Firestore `setDoc` fails, falls back to **POST `/api/register-merchant`** (requires `Authorization: Bearer <idToken>` header)
- Server-side fallback writes to Firestore via REST API + service account OAuth2 token
- Logo upload failure doesn't block registration (gracefully continues)

## Super Admin (SaaS Dashboard)
- Email-gated access: only `yahiatohary@hotmail.com` can access `/super-admin`
- Admin login bypasses merchant checks entirely (server returns `isAdmin: true`, client uses `window.location.href` redirect)
- **Tabs**: Merchants, Settings
- **Merchants Tab**:
  - Stats cards: Total Merchants, Total Alerts Today (from API), Total Viral Shares, Active, Subscribed
  - Table columns: Store Name, Owner, Status, Subscription, Expiry Date (inline editable), Shares, GMaps Clicks, Actions
  - Actions: Activate/Suspend toggle, Activate Subscription, Login as Merchant (impersonation), Download QR, Delete
  - Delete requires confirmation dialog
- **Settings Tab**:
  - Global settings form: App Name, Global Logo URL, Support WhatsApp, Global Theme Color (with color picker)
  - Saves to Firestore `systemSettings/global` document
- **API Routes**:
  - `POST /api/admin/impersonate/:merchantId` - returns merchant data for impersonation
  - `GET/POST /api/admin/settings` - CRUD for system settings
  - `GET /api/admin/stats` - total alerts today count
  - `POST /api/track/share/:storeId` - atomic increment sharesCount
  - `POST /api/track/gmaps/:storeId` - atomic increment googleMapsClicks
  - Admin routes verify admin email via `x-admin-email` header

## Subscription System
- Two-layer gating: `status` (account approval) + `subscriptionStatus` (subscription gate)
- Registration defaults: `subscriptionStatus: "pending"`, `plan: "trial"`
- Dashboard shows "Subscription Required" screen if `subscriptionStatus !== "active"`, with WhatsApp contact button
- Super Admin "Activate" button sets both `status: "approved"` AND `subscriptionStatus: "active"`
- Separate "Activate Sub" button for re-activating subscription on already-approved stores
- Modular plan enum (trial/basic/premium/enterprise) ready for Stripe/payment integration
- Plan labels stored in schema with AR/EN translations
- `subscriptionExpiry` field (string/null) with countdown display on merchant dashboard

## Marketing & Tracking
- **Share Feature**: Customer page has "Share with Friends" button (Web Share API with clipboard fallback)
  - Increments `sharesCount` atomically via Firestore field transforms
- **Google Maps Feature**: "Rate us on Google Maps" button on customer page
  - Increments `googleMapsClicks` atomically, then opens merchant's `googleMapsReviewUrl`
- **Merchant Dashboard**: Shows Shares count and Google Maps Clicks cards with real-time updates via onSnapshot
- Share URL format: `/s/{storeId}` (matches app routes)

## PWA (Progressive Web App)
- `manifest.json` at `client/public/manifest.json` with neon red/black theme, `gcm_sender_id` for FCM
- Icons: 72, 96, 128, 144, 152, 192, 384, 512px (generated from favicon.png)
- Unified service worker at `client/public/sw.js` with app-shell caching + FCM background messages + navigation fallback
- Apple meta tags: `apple-mobile-web-app-capable`, `apple-touch-icon`, `apple-mobile-web-app-status-bar-style`
- Service worker registered inline in `client/index.html`
- iOS Install Prompt (`client/src/components/ios-install-prompt.tsx`):
  - Detects iOS Safari (non-standalone) via UA sniffing
  - Shows after 2s delay with Share icon → Plus icon instructions (AR/EN)
  - Explains alert benefits of home screen install
  - Dismissible with localStorage persistence (`dp-ios-prompt-dismissed`)
  - Rendered at top level of store-pager across all states

## Screen Wake Lock
- `client/src/hooks/use-wake-lock.ts` supports auto-acquire (dashboard) and manual mode (pager)
- Dashboard: `useWakeLock()` — auto-acquires on mount, re-acquires on visibility change
- Store Pager: `useWakeLock(false)` — acquires on form submit, releases on alert stop
- **iOS Fix:** Wake lock re-acquires on visibility change even in manual mode (once initially activated via `wasManuallyAcquired` flag), preventing iOS from losing the lock on tab switch
- Green/yellow indicator pill shown at bottom of waiting screen

## Environment Variables
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID
- `VITE_FIREBASE_VAPID_KEY` - Firebase Cloud Messaging VAPID key (for FCM token generation)
- `FIREBASE_SERVICE_ACCOUNT_JSON` - Firebase service account JSON (for FCM V1 OAuth2 authentication)
- `SESSION_SECRET` - Session secret (also used to derive push auth tokens)
- `RESEND_API_KEY` - Resend API key for sending OTP emails (optional; logs to console if not set)

## Key Files
- `client/src/lib/firebase.ts` - Firebase initialization + FCM token generation
- `client/src/hooks/use-auth.ts` - Auth state hook (context-based)
- `client/src/hooks/use-language.ts` - Language context (AR/EN toggle)
- `client/src/hooks/use-wake-lock.ts` - Screen Wake Lock API hook
- `client/src/hooks/use-fullscreen.ts` - Fullscreen API hook
- `shared/schema.ts` - Zod schemas for merchant data with Arabic validation messages
- `client/src/pages/super-admin.tsx` - Super Admin dashboard
- `client/src/pages/store-pager.tsx` - Public customer pager page with FCM integration
- `client/src/pages/dashboard.tsx` - Kiosk dashboard with push notification sending
- `client/src/components/ios-install-prompt.tsx` - iOS PWA install prompt
- `client/public/sw.js` - Unified service worker (caching + FCM background messages)
- `server/routes.ts` - Express API routes (logo upload, QR generation, FCM push relay, Firebase config)
