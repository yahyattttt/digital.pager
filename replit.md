# Digital Pager

## Overview
Digital Pager is a multi-tenant SaaS platform designed to provide digital pager services for various businesses like restaurants, cafes, and clinics. It aims to modernize the customer waiting experience by replacing traditional physical pagers with a digital system that notifies customers via their smartphones. The platform supports bilingual interactions (Arabic/English), features a kiosk-mode dashboard for merchants, and a public customer pager interface with real-time notifications, a Google Maps review prompt, and social sharing capabilities. The business vision is to capture a significant market share in the digital notification space for service-oriented businesses, enhancing customer satisfaction and operational efficiency for merchants.

## User Preferences
I prefer clear and concise communication.
I value iterative development and expect to be informed about progress regularly.
I prefer detailed explanations for complex design choices or technical implementations.
I want the agent to ask for confirmation before making any major architectural changes or significant code refactoring.
Do not make changes to the `shared/schema.ts` file without explicit instruction.
Ensure all UI components are responsive and adapt to both desktop and mobile views.

## System Architecture
The platform is built as a multi-tenant SaaS application where each merchant's data is isolated within Firebase Firestore under a unique UID. The architecture comprises a React frontend with Vite, TailwindCSS, and shadcn/ui for a modern and responsive user experience. The backend is built with Node.js and Express, handling file uploads, QR code generation, and Firebase Cloud Messaging (FCM) push notification relay.

### UI/UX Decisions
- **Theme**: A "neon red" (#FF0000) primary color on a "black" (#000000) background, establishing a dark-first design.
- **Typography**: Uses Tajawal / Cairo fonts for Arabic text.
- **Bilingual Support**: The UI is fully bilingual (Arabic/English) with dynamic RTL/LTR adjustments. A globe icon toggle is present on every page, and language preference is persisted in `localStorage`.
- **Merchant Dashboard**: Professional SaaS dashboard with sidebar navigation (Dashboard, Waiting List, Digital Menu, Customer Feedback, Analytics, Settings). Sidebar shows subscription progress bar at top with days remaining. Header has Store Status toggle (Open/Closed, persisted to Firestore) and compact toolbar (QR download, language, fullscreen, add to waitlist). Overview page shows active waitlist count hero card, Quick Add button, recent waiting/notified customers, and last 3 feedback items. Waiting List page is the hero view with Quick Add button + manual add, large clean cards; on tablet/desktop (lg+), selecting an order shows a split-screen layout with order list on the left and detail panel on the right. Analytics page has dedicated marketing stats (QR scans, shares, maps clicks, notifications). Feedback is a full dedicated page. Settings shows store info + tools + Order Counter (reset, shift start). Mobile-responsive with overlay sidebar and FAB button for adding to waitlist. Touch targets are h-12/h-14 for tablet use.
- **Order Entry System**: Source of truth is `nextOrderNumber` field at `merchants/{uid}/settings/orderCounter` (defaults to 1). Three-part horizontal bar: Custom Number input + Add button + "Quick Add #N" button. Quick Add reads `nextOrderNumber`, creates order, and increments to `nextOrderNumber + 1` atomically via Firestore transaction. Manual Add uses the typed number, sets `nextOrderNumber` to `typedNumber + 1`. All counters synced in real-time via `onSnapshot`. Shift Start dialog on first session. Settings page: "Starting Order Number" input + Set button + Reset to #1 + Shift Start. Safety: all inputs validated with `parseInt()`, positive integer only. Toast: "Order #X added. Next auto-number will be #X+1".
- **Customer Pager UI**: Premium "Digital Pager" device aesthetic with deep matte black gradient backgrounds. Features a circular PagerDevice component with 12 SVG LED dots (spinning animation while waiting via `led-spin`, rapid flashing when ready via `led-flash`), DSEG7 7-segment font for order numbers, "DIGITAL PAGER" branding, concentric circle rings with matte finish gradients. Notified state shows "ORDER READY!" / "طلبك جاهز!", neon pulse glow on the entire screen, "Get Directions" button linking to merchant's Google Maps URL, and vibration/sound alerts. Review/share UI appears after 2-minute delay post-notification. All screens (entry, waiting, notified, loading) use `h-[100dvh]` for proper mobile viewport sizing, consistent premium dark gradient theme, and pull-to-refresh on the waiting screen.

### Technical Implementations
- **Authentication**: Passwordless OTP authentication via email using Resend for sending OTPs. Session management is handled via `localStorage` on the client-side, bypassing Firebase Auth SDK for core login flows.
- **Database**: Firebase Firestore (NoSQL) is used for all data storage, with a `merchants` collection and a `pagers` subcollection.
- **Push Notifications**: Firebase Cloud Messaging (FCM V1) is implemented using `google-auth-library` for secure OAuth2 token generation. A unified service worker (`sw.js`) handles both app-shell caching and FCM background messages.
- **File Uploads**: Multer is used for handling local logo uploads, stored in `client/public/uploads/`.
- **PWA**: The application is a Progressive Web App (PWA) with a `manifest.json`, various icon sizes, and a unified service worker for offline capabilities and push notifications. An iOS-specific install prompt is included for Safari users.
- **Real-time Updates**: Extensive use of `onSnapshot` listeners in Firestore ensures real-time updates across the dashboard and customer pager.
- **Tracking & Marketing**: Features include sharing via Web Share API, QR scan tracking (atomic increments), and a Smart Feedback Filter: star rating widget on customer page routes 4-5 stars to Google Maps reviews and captures 1-3 star feedback privately to `private_feedbacks` Firestore collection. Merchant dashboard has a "Customer Feedback" tab with unread badge and mark-as-read. Super Admin has complaints column + dialog per merchant and Total Complaints stat card.
- **Super Admin Panel**: A dedicated admin interface, accessible via email gating, provides comprehensive merchant management, global settings, impersonation capabilities, system health monitoring (error logs from `system_errors` Firestore collection with bell icon + badge in header), and merchant value reports (ROI generator with stats aggregation and conversion rate). Merchant table features: search (by name/owner/email with match highlighting), filter chips (All/Pending/Active/Suspended/Expired), sort dropdown (Newest/Most QR Scans/Most Shares/Soonest Expiry), pagination (10 per page), and Clear All Filters. On desktop (lg+), shows recharts bar charts: "New Signups" (last 6 months by createdAt) and "Subscription Expiries" (color-coded by time-to-expiry ranges).
- **Subscription System**: A two-layer gating system (`status` and `subscriptionStatus`) with smart expiry. Admin sets subscriptions by days (preset 30/90/365) which auto-calculates expiry and stores `subscriptionStartAt`. Auto-expire: `use-auth.ts` onSnapshot detects past expiry and auto-sets status to `"expired"`. Expired merchants see a dedicated "Subscription Expired" page with WhatsApp renewal. Customer QR pages show "Service Temporarily Unavailable" for expired merchants. Merchant dashboard has a SubscriptionBanner with live countdown timer (updates every minute), green→orange→red progress bar based on actual subscription duration, and "Contact Admin to Renew" WhatsApp button when ≤7 days remain. Admin table highlights rows red when ≤5 days remain with "Expiring Soon" badges and a warning card.

## External Dependencies
- **Firebase Firestore**: Main database for all application data.
- **Firebase Authentication**: Used for UID generation and custom token creation for the passwordless OTP system.
- **Firebase Cloud Messaging (FCM)**: For sending real-time push notifications to customer devices.
- **Resend**: Used for sending OTP emails during the authentication process.
- **Multer**: For handling local file uploads (specifically merchant logos).
- **Vite**: Frontend build tool.
- **React**: Frontend JavaScript library.
- **TailwindCSS**: CSS framework for styling.
- **shadcn/ui**: UI component library built on Tailwind CSS.
- **Node.js/Express**: Backend server environment and framework.
- **`google-auth-library`**: For OAuth2 authentication with FCM V1 API.
- **recharts**: Data visualization library used for Super Admin analytics charts.