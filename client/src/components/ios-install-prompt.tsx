import { useState, useEffect, useRef } from "react";
import { X, Download, Bell } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    ("standalone" in window.navigator && (window.navigator as any).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return isIos() && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
}

let sessionDismissed = false;

export default function IosInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (sessionDismissed) return;

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setPlatform("android");
      setTimeout(() => {
        setVisible(true);
        requestAnimationFrame(() => setAnimateIn(true));
      }, 1500);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    if (isIosSafari()) {
      setPlatform("ios");
      const timer = setTimeout(() => {
        setVisible(true);
        requestAnimationFrame(() => setAnimateIn(true));
      }, 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  function handleDismiss() {
    setAnimateIn(false);
    sessionDismissed = true;
    setTimeout(() => setVisible(false), 300);
  }

  async function handleInstallClick() {
    if (platform === "ios") {
      handleDismiss();
      return;
    }
    if (deferredPromptRef.current) {
      try {
        await deferredPromptRef.current.prompt();
        const choice = await deferredPromptRef.current.userChoice;
        if (choice.outcome === "accepted") {
          sessionDismissed = true;
          setAnimateIn(false);
          setTimeout(() => setVisible(false), 300);
        }
      } catch {}
      deferredPromptRef.current = null;
    }
  }

  if (!visible || !platform) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] px-3 pb-3 pointer-events-none"
      data-testid="install-prompt-bar"
    >
      <div
        className="pointer-events-auto w-full max-w-md mx-auto rounded-xl border-t-2 border-red-600 overflow-hidden transition-all duration-300 ease-out"
        style={{
          background: "rgba(15, 15, 15, 0.95)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 -4px 30px rgba(255,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.04)",
          transform: animateIn ? "translateY(0)" : "translateY(100%)",
          opacity: animateIn ? 1 : 0,
        }}
        data-testid="install-prompt"
      >
        <div className="flex items-center gap-3 p-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-red-600/10 border border-red-600/20 flex items-center justify-center">
            <Bell className="w-4.5 h-4.5 text-red-500" />
          </div>

          <p className="flex-1 text-white/80 text-xs leading-snug" dir="rtl" data-testid="text-install-message">
            لتفعيل جرس التنبيه واهتزاز الجوال، أضف التطبيق لشاشتك
          </p>

          <button
            onClick={handleInstallClick}
            className="flex-shrink-0 h-8 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
            data-testid="button-install-app"
          >
            <Download className="w-3.5 h-3.5" />
            <span>أضف</span>
          </button>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors"
            data-testid="button-dismiss-install-prompt"
          >
            <X className="w-3.5 h-3.5 text-white/30" />
          </button>
        </div>
      </div>
    </div>
  );
}
