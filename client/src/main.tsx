import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Unregister any stale service workers (sw.js errors from cached PWA registrations)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => {
      reg.unregister().then((success) => {
        if (success) console.log("[SW] Unregistered stale service worker:", reg.scope);
      });
    });
  }).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
