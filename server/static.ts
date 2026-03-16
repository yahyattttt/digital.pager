import express, { type Express } from "express";
import path from "path";

const __dirname = path.resolve();

export function serveStatic(app: Express) {
  // Serve runtime-uploaded files from client/public/uploads (persistent, outside the build output)
  const uploadsDir = path.join(__dirname, "client", "public", "uploads");
  app.use("/uploads", express.static(uploadsDir, { maxAge: 0, etag: false }));

  app.use(express.static(path.join(__dirname, "dist/public")));

  app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(__dirname, "dist/public", "index.html"));
  });
}
