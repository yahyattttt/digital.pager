# Digital Pager

## Overview
Digital Pager is a multi-tenant SaaS platform that modernizes customer waiting experiences for businesses like restaurants and clinics. It replaces traditional pagers with a smartphone-based digital notification system. Key features include bilingual support (Arabic/English), a kiosk-mode merchant dashboard, and a public customer pager interface with real-time notifications, Google Maps review prompts, and social sharing. The project aims to capture a significant market share in digital notifications, enhancing customer satisfaction and operational efficiency.

## User Preferences
I prefer clear and concise communication.
I value iterative development and expect to be informed about progress regularly.
I prefer detailed explanations for complex design choices or technical implementations.
I want the agent to ask for confirmation before making any major architectural changes or significant code refactoring.
Do not make changes to the `shared/schema.ts` file without explicit instruction.
Ensure all UI components are responsive and adapt to both desktop and mobile views.

## System Architecture
The platform is a multi-tenant SaaS application with isolated merchant data in Firebase Firestore. It uses a React frontend with Vite, TailwindCSS, and shadcn/ui, and a Node.js/Express backend for file uploads, QR code generation, and FCM push notifications.

### UI/UX Decisions
- **Theme**: Dark-first design with a black background. Color hierarchy: emerald-600 for primary actions, violet-600 for pager actions, red for destructive actions. CSS primary variable is neon red for branding accents.
- **Typography**: Cairo / Tajawal fonts for Arabic text.
- **Design System**: `rounded-2xl` for cards and badges, `bg-[#111]` for card backgrounds, consistent padding.
- **Bilingual Support**: Full Arabic/English support with dynamic RTL/LTR, global toggle, and `localStorage` persistence.
- **Merchant Dashboard**: Professional SaaS dashboard with sidebar navigation (Dashboard, Waiting List, Online Section, Customer Feedback, Analytics, My Customers, Coupons, Financial, Settings). Sidebar items conditionally rendered based on feature flags from `/api/merchant-features/:merchantId` — Analytics hidden if `analyticsEnabled=false`, Customers hidden if `crmEnabled=false`, Print button hidden if `printReceiptsEnabled=false`.
  - **My Customers (عملائي)**: CRM table auto-populated from online orders. Columns: Name, Phone, Total Orders, Last Order Date, No-Shows, WhatsApp. WhatsApp button per row opens pre-filled promotional message with coupon placeholder. Customers with noShowCount >= 2 get red "غير ملتزم" / "Unreliable" warning badge.
  - **Coupons (الكوبونات)**: Create, toggle active/inactive, and delete discount coupons. Fields: Code, Discount %, Status. Stored in `merchants/{merchantId}/coupons` Firestore collection.
  - **Financial Management (الإدارة المالية)**: Dashboard with date filters (Today, 7 Days, 30 Days, Custom range). 4 stat cards: Total Sales, Collected (green), Lost/No-Show (red), Collection Rate % (dynamic color). Orders log table with status badges. CSV export button. Fetches from `GET /api/financial/:merchantId`.
  - **Overview (Order Management Station)**: Dedicated full-screen order management view. Active orders workspace as a professional KDS-style card grid (1/2/3 cols responsive). Each card has a header (order #, type icon, status badge, live timer), body (item list with quantities, variants in parentheses, extras/addons in amber below), footer (dynamic payment label, total price), and action buttons (Accept/Ready/Deliver + Print for online orders). Online orders have neon red border + Globe icon; QR/Manual orders have white/gray border + QrCode icon. Prominent floating "Add Manual Order" button (h-14, ring accent). Print button generates an 80mm thermal receipt. No stats/charts on this page — those are on Analytics.
  - **Waiting List**: Quick Add, manual add, and split-screen detail panel on larger screens.
  - **Order Entry System**: Manages `nextOrderNumber` via Firestore transactions, allowing custom or quick adds, with real-time sync and shift start functionality.
- **Customer Pager UI**: Premium "Digital Pager" aesthetic with dark gradients.
  - Features a circular PagerDevice component with SVG LED dots (spinning/flashing animations), DSEG7 font for order numbers.
  - **OrderSelectionScreen**: Real-time grid of active waiting orders. Tapping confirms order, saves to `localStorage` (4-hour TTL). Notified state shows "ORDER READY!", neon pulse, "Get Directions" button, and vibration/sound alerts. Review/share UI appears post-notification.
  - All screens use `h-[100dvh]` and pull-to-refresh.
- **Product Management Form**: RTL-aligned form with dynamic Variant/Sizes and Add-ons/Extras management.
- **Direct Ordering System (Cash on Delivery)**: Merchants manage products in a "Digital Menu." Public menu displays products.
  - **Product Selection Modal**: Allows selection of variants, add-ons, and quantity with real-time price calculation.
  - **Checkout**: Shows cart items with variant/add-on details, quantity controls, coupon code input ("هل لديك كود خصم؟"), payment method display ("الدفع عند الاستلام" / Cash on Delivery), store legal terms acceptance. Valid coupons show discount amount, original total (strikethrough), and discounted final total.
  - **Order submission**: Creates order directly in Firestore with `status: pending_verification`, `paymentMethod: "cod"`. If coupon applied, order includes `couponCode`, `discountAmount`, `originalTotal`. Redirects to tracking page (no WhatsApp redirect).
  - **Tracking Page**: Shows real-time order status flow: `pending_verification` → `preparing` → `ready` → `archived` (or `uncollected` for no-shows).
    - **Pending Verification**: Shows success message, "wait for call/WhatsApp from store" notice, Order ID, payment method badge, order details.
    - **Preparing**: Digital Pager device with LED ring animation, "جاري التحضير" status.
    - **Audio Notification System**: Exclusive to preparing screen ONLY. Button text: "🔔 ودك نذكرك بالجرس؟" — clicking initializes/resumes AudioContext, then primes audio engine via `audio.play()→pause()→reset` (iOS Safari compatible). Confirmation: "✅ سيتم تنبيهك فور الجاهزية". Background keep-alive: 25s interval plays silent 0-gain oscillator to prevent AudioContext suspension in background tabs. Firestore listener only triggers bell on specific status transition (`prevStatus !== "ready"`), prevents duplicate bells on data updates. Multi-order: `replayAlert()` resets `hasPlayedAlert` before triggering. Ready screen has non-bell "اضغط لتشغيل الصوت" fallback. Session persistence via `sessionStorage` key `pager_audio_unlocked`. AudioContext + keep-alive interval cleaned up on unmount. No bell UI on pending_verification or any other page. Super Admin Settings has "Check Sound" button (`button-check-sound`) to verify bell.mp3 loads and plays correctly.
    - **Ready**: Full pager alert with sound/vibration, "الطلب جاهز" / "ORDER READY!". If browser blocks audio, shows fallback activation button. `pendingAlertRef` defers alerts until unlock.
    - **Completed/Archived**: Smart Rating Screen with 5 large interactive stars (w-12/w-14). If ≤3 stars: saves to `store_internal_reviews` Firestore collection via `POST /api/store-internal-review`, shows feedback textarea, displays "شكراً لملاحظاتك، نسعى دائماً للأفضل". If ≥4 stars: saves review, then opens store's `googleMapsReviewUrl` in new tab (if available). No redirect if no Google Maps link configured. Endpoint: `POST /api/store-internal-review` (merchantId, stars, comment, orderNumber).
  - **Analytics Page (التحليلات)**: Comprehensive analytics hub. Today's Summary cards at top (Revenue, Total Orders, New Customers, Avg Prep Time) fetched from `/api/merchant-analytics/:merchantId` with 60s auto-refresh. Charts section: Revenue vs Loss bar chart, Top Order Sources horizontal bar chart. Operations section (Daily Scans, Active Orders, Done Today, Avg Wait). Marketing section (QR Visitors, Shares, Maps Clicks, Notifications Sent). Subscription Status card with days remaining, plan, and status badge.
- **Online Ordering Controls**: `storeOpen` toggle takes 100% priority — when manually set to Open, business hours are NOT checked. `onlineOrdersEnabled` toggle separately controls online ordering. All time checks use Asia/Riyadh timezone (UTC+3). During loading, no "closed" banner is shown. Debug `[StoreStatus]` logs printed in both client console and server for diagnostics.
- **Dual-Layer Legal Compliance**:
  - **Platform Level**: Super Admin manages global terms/privacy, mandatory acceptance on registration.
  - **Store Level**: Merchants manage store-specific terms/privacy, mandatory acceptance during public menu checkout.

### Technical Implementations
- **Authentication**: Passwordless OTP via email using Resend, `localStorage` for session management.
- **Database**: Firebase Firestore for all data.
- **Push Notifications**: Firebase Cloud Messaging (FCM V1) with `google-auth-library` and a unified service worker.
- **File Uploads**: Multer for local logo/product image uploads and PDF commercial register uploads (stored at `uploads/commercial_registers/` with PDF magic byte validation).
- **PWA**: Progressive Web App with manifest, icons, and service worker for offline capabilities and push notifications.
- **Real-time Updates**: Extensive use of Firestore `onSnapshot` listeners.
- **Tracking & Marketing**: Web Share API, QR scan tracking, Smart Feedback Filter (Google Maps reviews for 4-5 stars, private feedback for 1-3 stars).
- **Super Admin Panel**: Merchant management, global settings, impersonation, system health monitoring, and ROI reports. Includes merchant table with search, filters, sort, pagination, and analytics charts. Owner column shows commercial register PDF link if available. **Feature Toggles**: Per-merchant toggles (Analytics, CRM, Smart Rating, Print Receipts) via Settings button on each merchant row. Flags stored in Firestore merchant document. Endpoints: `GET/PATCH /api/admin/merchant-features/:merchantId` (admin-only), `GET /api/merchant-features/:merchantId` (public). **Global Monitor**: Aggregated cross-merchant stats (total orders, today orders, collected, uncollected, preparing, ready) with per-merchant breakdown table showing revenue.
- **Subscription System**: Two-layer gating (`status`, `subscriptionStatus`) with smart expiry. Admin sets duration, auto-calculation of expiry. Expired merchants see a dedicated page, and their QR pages show "Service Temporarily Unavailable." Dashboard shows a subscription countdown. **Subscription Payment Tracking**: Per-merchant payment records stored in `merchants/{merchantId}/subscriptionPayments/{paymentId}`. Admin can record payments (amount, start/end dates) via wallet button on each merchant row. Payment auto-activates subscription. Full payment history visible in dialog. Endpoints: `POST /api/admin/subscription-payment/:merchantId`, `GET /api/admin/subscription-payments/:merchantId`.
- **Platform Finance System**: Isolated `platform_admin_finance` Firestore collection for platform-level financial management. "Central Finance" tab in Super Admin with: Total Revenue (aggregated from all merchant subscription payments), Total Expenses (manually tracked), Net Profit calculation. Expense tracker with add/delete. Revenue breakdown by merchant. Upcoming subscription expirations (7-day window) with quick renewal buttons. Endpoints: `GET /api/admin/platform-finance`, `POST /api/admin/platform-expense`, `DELETE /api/admin/platform-expense/:expenseId`, `GET /api/admin/renewal-analytics`.
- **Structured Cloud Numbering System**: Each store maintains separate counters for online (`onlineCounter`) and manual (`manualCounter`) orders in Firestore at `merchants/{uid}/settings/orderCounter`. Online orders use structured cloud format: `[CityCode][YY][PaddedCounter]` (e.g., `0126001` = Riyadh + 2026 + order #1). Counter auto-resets on year change via `onlineCounterYear` field. Padding is 3 digits minimum, auto-expands beyond 999. Manual/pager orders use `MA-{n}` prefix. `displayOrderId` and `orderType` ("online"|"manual") fields stored on both pager docs and whatsapp order docs. `cityCode` field on merchant profile (2-digit code, 15 Saudi cities supported), configurable in Settings with live preview. Legacy orders without `displayOrderId` fall back to `#orderNumber` display. Shift start and counter reset clear both counters and set `onlineCounterYear`. Dashboard search bar filters by `displayOrderId`. Tracking page shows `displayOrderId` on PagerDevice.
- **Advanced Merchant Tracking**: Performance analytics with `preparingAt`/`readyAt` timestamps on order status transitions. Dashboard overview shows 4-metric grid (Avg Prep Time, Total Orders, New Customers, Today Revenue), New/Loyal customer badges on each order card, Top Order Sources horizontal bar chart, and Revenue vs Loss bar chart. Order source tracking captures `?source=` URL parameter from public menu links (e.g., `?source=instagram`). Stored as `source` field on order document. Endpoint: `GET /api/merchant-analytics/:merchantId`. Auto-refreshes every 60 seconds.

## External Dependencies
- **Firebase Firestore**: Main database.
- **Firebase Authentication**: For UID generation and custom tokens.
- **Firebase Cloud Messaging (FCM)**: Push notifications.
- **Resend**: OTP email delivery.
- **Multer**: File uploads.
- **Vite**: Frontend build tool.
- **React**: Frontend library.
- **TailwindCSS**: CSS framework.
- **shadcn/ui**: UI component library.
- **Node.js/Express**: Backend server.
- **`google-auth-library`**: OAuth2 for FCM V1 API.
- **recharts**: Data visualization for Super Admin.