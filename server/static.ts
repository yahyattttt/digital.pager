import express, { type Express, type Request, type Response } from "express";
import path from "path";
import fs from "fs";
import { getMerchantOG, getMerchantOGBySlug, getMerchantIdFromOrder, injectOGTags } from "./og-meta";

const __dirname = path.resolve();
const DIST_HTML = path.join(__dirname, "dist/public", "index.html");

const MERCHANT_ROUTES = ["/menu", "/check-order", "/store-pager", "/digital-pager", "/delivery-tracker"];

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return `${proto}://${host}`;
}

async function sendWithOG(req: Request, res: Response, og: Awaited<ReturnType<typeof getMerchantOG>>) {
  try {
    let html = await fs.promises.readFile(DIST_HTML, "utf-8");
    const origin = getOrigin(req);
    html = injectOGTags(html, og, origin);
    res.set("Content-Type", "text/html").send(html);
  } catch {
    res.sendFile(DIST_HTML);
  }
}

export function serveStatic(app: Express) {
  const uploadsDir = path.join(__dirname, "client", "public", "uploads");
  app.use("/uploads", express.static(uploadsDir, { maxAge: 0, etag: false }));
  app.use(express.static(path.join(__dirname, "dist/public")));

  for (const routePrefix of MERCHANT_ROUTES) {
    app.get(`${routePrefix}/:merchantId`, async (req: Request, res: Response) => {
      const origin = getOrigin(req);
      const pageUrl = `${origin}${req.originalUrl}`;
      const og = await getMerchantOG(req.params.merchantId, pageUrl);
      await sendWithOG(req, res, og);
    });
  }

  app.get("/online-order/:slug", async (req: Request, res: Response) => {
    const origin = getOrigin(req);
    const pageUrl = `${origin}${req.originalUrl}`;
    const og = await getMerchantOGBySlug(req.params.slug, pageUrl);
    await sendWithOG(req, res, og);
  });

  app.get("/track/:orderId", async (req: Request, res: Response) => {
    const origin = getOrigin(req);
    const pageUrl = `${origin}${req.originalUrl}`;
    const merchantId = await getMerchantIdFromOrder(req.params.orderId);
    const og = merchantId
      ? await getMerchantOG(merchantId, pageUrl)
      : { title: "تتبع طلبك - Digital Pager", description: "تتبع حالة طلبك لحظة بلحظة", image: "/icon-512x512.png", siteName: "Digital Pager", url: pageUrl };
    await sendWithOG(req, res, og);
  });

  app.get("/{*path}", (_req, res) => {
    res.sendFile(DIST_HTML);
  });
}
