import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { getMerchantOG, getMerchantIdFromOrder, injectOGTags } from "./og-meta";

const viteLogger = createLogger();

/** Routes that carry a merchantId in position 2 of the path */
const MERCHANT_ROUTES = ["/menu", "/check-order", "/store-pager", "/digital-pager", "/delivery-tracker"];

function getOrigin(req: any): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return `${proto}://${host}`;
}

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  /** Helper: load, transform, optionally inject OG tags, and send index.html */
  async function sendPage(req: any, res: any, next: any, ogInjector?: (html: string) => Promise<string>) {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(import.meta.dirname, "..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
      let page = await vite.transformIndexHtml(url, template);
      if (ogInjector) page = await ogInjector(page);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  }

  /* ── Merchant-specific store pages: inject dynamic OG tags ── */
  for (const routePrefix of MERCHANT_ROUTES) {
    app.get(`${routePrefix}/:merchantId`, async (req, res, next) => {
      const { merchantId } = req.params;
      const origin = getOrigin(req);
      const pageUrl = `${origin}${req.originalUrl}`;
      await sendPage(req, res, next, async (html) => {
        const og = await getMerchantOG(merchantId, pageUrl);
        return injectOGTags(html, og, origin);
      });
    });
  }

  /* ── Order tracking page: look up order → merchant → OG tags ── */
  app.get("/track/:orderId", async (req, res, next) => {
    const { orderId } = req.params;
    const origin = getOrigin(req);
    const pageUrl = `${origin}${req.originalUrl}`;
    await sendPage(req, res, next, async (html) => {
      const merchantId = await getMerchantIdFromOrder(orderId);
      const og = merchantId
        ? await getMerchantOG(merchantId, pageUrl)
        : { title: "تتبع طلبك - Digital Pager", description: "تتبع حالة طلبك لحظة بلحظة", image: "/icon-512x512.png", siteName: "Digital Pager", url: pageUrl };
      return injectOGTags(html, og, origin);
    });
  });

  /* ── Default catch-all: serve index.html for all other SPA routes ── */
  app.use("/{*path}", async (req, res, next) => {
    await sendPage(req, res, next);
  });
}
