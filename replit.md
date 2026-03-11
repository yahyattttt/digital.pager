# Digital Pager

## Overview
Digital Pager is a multi-tenant SaaS platform designed to modernize customer waiting experiences for businesses such as restaurants and clinics. It replaces traditional pagers with a smartphone-based digital notification system. Key features include bilingual support (Arabic/English), a kiosk-mode merchant dashboard, and a public customer pager interface with real-time notifications. The platform aims to enhance customer satisfaction, improve operational efficiency, and provide tools for customer engagement like Google Maps review prompts and social sharing.

## User Preferences
I prefer clear and concise communication.
I value iterative development and expect to be informed about progress regularly.
I prefer detailed explanations for complex design choices or technical implementations.
I want the agent to ask for confirmation before making any major architectural changes or significant code refactoring.
Do not make changes to the `shared/schema.ts` file without explicit instruction.
Ensure all UI components are responsive and adapt to both desktop and mobile views.

## System Architecture
The platform is a multi-tenant SaaS application. The frontend uses React, Vite, TailwindCSS, and shadcn/ui. The backend is built with Node.js/Express, handling functionalities like file uploads, QR code generation, and FCM push notifications. Firebase Firestore serves as the database, ensuring isolated data for each merchant.

### UI/UX Decisions
- **Theme & Design**: Dark-first design with `bg-[#111]` card backgrounds, `rounded-2xl` elements, and `neon red` accents. Primary actions use `emerald-600`, pager actions `violet-600`, and destructive actions `red`.
- **Typography**: Cairo / Tajawal fonts for Arabic text.
- **Bilingual Support**: Comprehensive Arabic/English support with dynamic RTL/LTR, a global toggle, and `localStorage` persistence.
- **Merchant Dashboard**: Professional SaaS dashboard with sidebar navigation for modules such as Dashboard, Online Section, Customer Feedback, Analytics, My Customers (CRM), Coupons, Financial, and Settings. Includes an Order Management Station for active orders and thermal receipt printing. Features:
  - **Order Type Badges**: Each card shows a colored badge in the top-right: Dine-in (sky/blue, UtensilsCrossed), Takeaway (orange, ShoppingBag), Delivery (emerald/green, Truck), Manual (violet/purple, Pencil). Cards have a matching left-border glow for instant visual recognition.
  - **Advanced Filter Bar**: Sticky filter bar at top of Active Orders with Type chips (الكل/محلي/سفري/توصيل/يدوي) and Status chips (الكل/جديد/قيد التحضير/جاهز). Filters work in sync with the order number search bar. "Clear Filters" button resets all.
  - **Manual Order Highlight**: Manual/pager orders have a darker background (`bg-[#0a0a0a]`) to distinguish from online orders.
- **Customer Pager UI**: Premium "Digital Pager" aesthetic with dark gradients, a circular PagerDevice component with SVG LED animations, and DSEG7 font for order numbers. Features real-time order tracking, "ORDER READY!" notifications with neon pulse, vibration, and sound alerts.
- **Direct Ordering System**: Supports a "Digital Menu" for product selection, real-time price calculation, and checkout with coupon application. Orders can be submitted with "Cash on Delivery" (COD) or online payment via Moyasar gateway (credit card, Apple Pay, STC Pay).
- **Order Type Selection**: Customers can select "Dine-in," "Takeaway," or "Delivery" during checkout. `diningType` is stored in Firestore and reflected in the merchant dashboard and receipts.
- **Customer Notes**: An optional `customerNotes` field is available during checkout, displayed prominently on merchant dashboard order cards and thermal receipts.
- **Delivery Feature**: Merchants can enable a delivery option with a configurable fee. Delivery orders include a Mapbox GL JS map picker (satellite-streets-v12 style) with triple-method location selection: search autocomplete via Mapbox Geocoding API (Arabic, Saudi Arabia scoped), interactive draggable pin, and GPS button. Features real-time reverse geocoding, "تثبيت الموقع" confirm button, WebGL fallback UI, and a "Share with Driver" WhatsApp integration with a pre-filled message including order details and a Google Maps link.
- **Order Tracking Page**: Distinct tracking flows for delivery orders (dedicated `DeliveryTrackingView` with live status updates and WhatsApp driver CTA) and dine-in/takeaway orders (standard Digital Pager flow with LED animation and bell priming).
- **Bell Notification System**: A two-phase system allowing users to "prime" audio context for automatic sound alerts when an order is ready.
- **Smart Rating Screen**: Post-completion rating system for both delivery (with optional WhatsApp driver interaction) and dine-in/takeaway orders, leading to Google Maps reviews for high ratings or a feedback form for lower ratings.
- **Analytics Page**: Provides key metrics, charts (Revenue vs Loss, Top Order Sources), and operational insights.
- **Online Ordering Controls**: Merchants can control `storeOpen` and `onlineOrdersEnabled` settings, with time checks using the Asia/Riyadh timezone.
- **Legal Compliance**: Dual-layer system for platform-level and store-specific terms and privacy policies.

### Technical Implementations
- **Authentication**: Passwordless OTP via email (Resend) with `localStorage` for sessions.
- **Database**: Firebase Firestore.
- **Push Notifications**: Firebase Cloud Messaging (FCM V1) with a unified service worker.
- **File Uploads**: Multer for local storage of assets with PDF magic byte validation.
- **PWA**: Progressive Web App capabilities.
- **Real-time Updates**: Achieved through extensive use of Firestore `onSnapshot` listeners.
- **Tracking & Marketing**: Utilizes Web Share API, QR scan tracking, and a Smart Feedback Filter.
- **Super Admin Panel**: Manages merchants, global settings, impersonation, system health, and ROI reports, including per-merchant feature toggles.
- **Subscription System**: Two-layer gating for subscription status, admin-managed payment tracking, and auto-activation.
- **Platform Finance System**: Isolated `platform_admin_finance` collection for tracking platform revenue, expenses, and net profit.
- **Structured Cloud Numbering System**: Online orders use `[CityCode][YY][PaddedCounter]` format, assigned via a Firestore REST transaction, with city codes configurable.
- **Manual Order System**: Allows merchants to manually enter 3-digit order IDs or use shift-based auto-generation, creating pagers that are strictly isolated from WhatsApp order sync.
- **Advanced Merchant Tracking**: Captures `preparingAt`/`readyAt` timestamps and provides a 4-metric dashboard grid, new/loyal customer badges, top order sources, and revenue/loss charts.

## External Dependencies
- Firebase Firestore
- Firebase Authentication
- Firebase Cloud Messaging (FCM)
- Resend
- Multer
- Vite
- React
- TailwindCSS
- shadcn/ui
- Node.js/Express
- `google-auth-library`
- recharts
- Moyasar Payment SDK (CDN-loaded)
- Mapbox GL JS (map rendering + geocoding)