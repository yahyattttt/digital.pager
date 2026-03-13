import express, { type Express } from "express";
import path from "path";

const __dirname = path.resolve();

export function serveStatic(app: Express) {
  app.use(express.static(path.join(__dirname, "dist/public")));

  app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(__dirname, "dist/public", "index.html"));
  });
}
