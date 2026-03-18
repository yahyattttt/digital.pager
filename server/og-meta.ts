/**
 * og-meta.ts
 * Server-side Open Graph meta tag injection for store/menu links.
 * WhatsApp and social media crawlers do NOT execute JavaScript,
 * so OG tags must be injected into the HTML at request time.
 */

const DEFAULT_OG_IMAGE = "/icon-512x512.png";
const SITE_NAME = "Digital Pager";

function getApiKey(): string | null {
  return process.env.VITE_FIREBASE_API_KEY || null;
}

function getProjectId(): string | null {
  return process.env.VITE_FIREBASE_PROJECT_ID || null;
}

function getBaseUrl(): string | null {
  const projectId = getProjectId();
  const apiKey = getApiKey();
  if (!projectId || !apiKey) return null;
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

async function fsGet(path: string): Promise<any> {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();
  if (!apiKey || !baseUrl) return null;
  try {
    const res = await fetch(`${baseUrl}/${path}?key=${apiKey}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function str(field: any): string {
  return field?.stringValue || "";
}

export interface OGData {
  title: string;
  description: string;
  image: string;
  siteName: string;
  url: string;
}

function fallback(pageUrl: string): OGData {
  return {
    title: `${SITE_NAME} - اطلب الآن أونلاين`,
    description: `استعرض المنيو وتابع طلبك مع ${SITE_NAME}`,
    image: DEFAULT_OG_IMAGE,
    siteName: SITE_NAME,
    url: pageUrl,
  };
}

export async function getMerchantOG(merchantId: string, pageUrl: string): Promise<OGData> {
  if (!merchantId) return fallback(pageUrl);
  const doc = await fsGet(`merchants/${merchantId}`);
  if (!doc?.fields) return fallback(pageUrl);

  const f = doc.fields;
  const storeName = str(f.storeName) || SITE_NAME;
  const logoUrl = str(f.logoUrl);

  return {
    siteName: storeName,
    title: `${storeName} - اطلب الآن أونلاين`,
    description: `استعرض المنيو وتابع طلبك مع ${storeName}`,
    image: logoUrl || DEFAULT_OG_IMAGE,
    url: pageUrl,
  };
}

export async function getMerchantIdFromOrder(orderId: string): Promise<string | null> {
  const apiKey = getApiKey();
  const projectId = getProjectId();
  if (!apiKey || !projectId || !orderId) return null;

  try {
    const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
    const body = {
      structuredQuery: {
        from: [{ collectionId: "orders", allDescendants: true }],
        where: {
          fieldFilter: {
            field: { fieldPath: "id" },
            op: "EQUAL",
            value: { stringValue: orderId },
          },
        },
        limit: 1,
      },
    };
    const res = await fetch(queryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const results = await res.json();
    const docName: string = results[0]?.document?.name || "";
    if (!docName) return null;
    const parts = docName.split("/");
    const idx = parts.indexOf("merchants");
    return idx >= 0 ? parts[idx + 1] : null;
  } catch {
    return null;
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function injectOGTags(html: string, og: OGData, origin: string): string {
  const absImg = og.image.startsWith("http") ? og.image : `${origin}${og.image}`;

  const tags = `
    <!-- Dynamic OG: injected server-side for crawler compatibility -->
    <title>${esc(og.title)}</title>
    <meta name="description" content="${esc(og.description)}" />
    <meta property="og:title" content="${esc(og.title)}" />
    <meta property="og:description" content="${esc(og.description)}" />
    <meta property="og:image" content="${esc(absImg)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="${esc(og.siteName)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${esc(og.url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(og.title)}" />
    <meta name="twitter:description" content="${esc(og.description)}" />
    <meta name="twitter:image" content="${esc(absImg)}" />`;

  return html
    .replace(/<title>.*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/i, "")
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, "")
    .replace("</head>", `${tags}\n  </head>`);
}
