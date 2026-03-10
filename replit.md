# Digital Pager

## Overview
Digital Pager is a multi-tenant SaaS platform designed to modernize customer waiting experiences for businesses like restaurants and clinics. It replaces traditional pagers with a smartphone-based digital notification system, offering features such as bilingual support (Arabic/English), a kiosk-mode merchant dashboard, and a public customer pager interface with real-time notifications. The platform also includes Google Maps review prompts and social sharing capabilities, aiming to enhance customer satisfaction and operational efficiency while capturing a significant market share in digital notifications.

## User Preferences
I prefer clear and concise communication.
I value iterative development and expect to be informed about progress regularly.
I prefer detailed explanations for complex design choices or technical implementations.
I want the agent to ask for confirmation before making any major architectural changes or significant code refactoring.
Do not make changes to the `shared/schema.ts` file without explicit instruction.
Ensure all UI components are responsive and adapt to both desktop and mobile views.

## System Architecture
The platform is a multi-tenant SaaS application utilizing Firebase Firestore for isolated merchant data. The frontend is built with React, Vite, TailwindCSS, and shadcn/ui, while the backend uses Node.js/Express for functionalities like file uploads, QR code generation, and FCM push notifications.

### UI/UX Decisions
- **Theme & Design**: Dark-first design with `bg-[#111]` card backgrounds, `rounded-2xl` for cards/badges, and `neon red` accents. Primary actions use `emerald-600`, pager actions `violet-600`, and destructive actions `red`.
- **Typography**: Cairo / Tajawal fonts for Arabic text.
- **Bilingual Support**: Comprehensive Arabic/English support with dynamic RTL/LTR, a global toggle, and `localStorage` persistence.
- **Merchant Dashboard**: Professional SaaS dashboard with sidebar navigation (Dashboard, Waiting List, Online Section, Customer Feedback, Analytics, My Customers, Coupons, Financial, Settings). Sidebar items are conditionally rendered based on feature flags.
  - **Key Modules**: My Customers (CRM with no-show tracking), Coupons (create/manage discounts), Financial Management (sales, collection, loss stats with CSV export), Order Management Station (KDS-style card grid for active orders, manual order input, thermal receipt printing), Waiting List (quick/manual adds, split-screen detail).
- **Customer Pager UI**: Premium "Digital Pager" aesthetic with dark gradients, featuring a circular PagerDevice component with SVG LED animations and DSEG7 font for order numbers.
  - **Order Tracking**: Real-time grid of active waiting orders, `localStorage` persistence, "ORDER READY!" notification with neon pulse, vibration, sound alerts, Google Maps directions, and review/share UI.
  - **Direct Ordering System (Cash on Delivery)**: Merchants manage a "Digital Menu." Public menu allows product selection (variants, add-ons), real-time price calculation, and checkout with coupon application, displaying original and discounted totals. Orders are submitted with `status: pending_verification` and `paymentMethod: "cod"`.
  - **Order Tracking Page**: Displays real-time status flow (`pending_verification` → `preparing` → `ready` → `archived`/`uncollected`). Includes a Digital Pager device with LED animation for `preparing` status.
  - **Bell Notification System (Early Activation & Priming)**: Two-phase system. During `preparing` status, a pulsing button "ودك ننبهك بالجرس إذا جهز طلبك؟" (`data-testid="button-prime-bell"`) lets the user prime the AudioContext — plays `alert.mp3` for 1 second then stops, unlocking the browser audio. Confirmation "✅ تم تفعيل الجرس، سنقوم بتنبيهك فوراً" shown after priming. Primed state persisted via `sessionStorage("pager_bell_primed")`. When Firestore listener detects status → `ready`, the full looping alert plays automatically (no user interaction needed). Ready screen shows stop button, neon pulse animation when alert active. If user never primed, ready screen shows manual bell prompt as fallback. Hidden during `pending_verification`. No bell UI on any other pages.
  - **Smart Rating Screen**: Post-completion, gathers feedback; ≤3 stars go to internal reviews, ≥4 stars prompt Google Maps review.
- **Analytics Page**: Comprehensive analytics hub with Today's Summary cards (Revenue, Orders, New Customers, Avg Prep Time), charts (Revenue vs Loss, Top Order Sources), operational metrics, marketing insights, and subscription status.
- **Online Ordering Controls**: `storeOpen` toggle overrides business hours. `onlineOrdersEnabled` controls online ordering availability. All time checks use Asia/Riyadh timezone.
- **Legal Compliance**: Dual-layer system for platform-level (Super Admin) and store-specific (Merchant) terms and privacy policies.

### Technical Implementations
- **Authentication**: Passwordless OTP via email (Resend), `localStorage` for sessions.
- **Database**: Firebase Firestore.
- **Push Notifications**: Firebase Cloud Messaging (FCM V1) via `google-auth-library` and a unified service worker.
- **File Uploads**: Multer for local storage of logos, product images, and commercial registers with PDF magic byte validation.
- **PWA**: Progressive Web App with manifest, icons, and service worker.
- **Real-time Updates**: Extensive use of Firestore `onSnapshot` listeners.
- **Tracking & Marketing**: Web Share API, QR scan tracking, Smart Feedback Filter.
- **Super Admin Panel**: Merchant management (search, filter, sort, pagination), global settings, impersonation, system health, ROI reports. Includes per-merchant feature toggles and a global monitor for aggregated stats.
- **Subscription System**: Two-layer gating (status, subscriptionStatus) with smart expiry, admin-managed payment tracking, and auto-activation.
- **Platform Finance System**: Isolated `platform_admin_finance` collection for tracking platform revenue (from subscriptions), expenses, and net profit. Includes an expense tracker and upcoming subscription renewal analytics.
- **Structured Cloud Numbering System**: Separate Firestore counters (`onlineCounter`, `manualCounter`) per store. Online orders use `[CityCode][YY][PaddedCounter]` format (e.g., `0126001`), assigned at order creation on server via `generateOnlineOrderId()` Firestore REST transaction. Accept flow validates Cloud ID pattern (`/^\d{4,}$/`) and only updates status — strictly forbidden from touching manual counter. Manual counter functions (`handleQuickAdd`/`handleManualAdd`) reject `sourceType: "online"` with console.error. `cityCode` configurable in Settings (15 Saudi cities). `orderType` ("online"|"manual") field on orders/pagers. Counter auto-resets on year change. One-time cleanup endpoint: `POST /api/cleanup-online-order-ids/:merchantId` (admin auth required via `x-admin-email` header) — scans all online orders with paginated Firestore reads and fixes stale `orderNumber` fields to match Cloud `displayOrderId`.
- **Advanced Merchant Tracking**: Order status transitions capture `preparingAt`/`readyAt` timestamps. Dashboard includes 4-metric grid, new/loyal customer badges, top order sources, and revenue/loss charts. `?source=` URL parameter tracking.

## External Dependencies
- **Firebase Firestore**
- **Firebase Authentication**
- **Firebase Cloud Messaging (FCM)**
- **Resend**
- **Multer**
- **Vite**
- **React**
- **TailwindCSS**
- **shadcn/ui**
- **Node.js/Express**
- **`google-auth-library`**
- **recharts**