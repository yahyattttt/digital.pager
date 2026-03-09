import { useState, useEffect, useRef } from "react";
import { X, Download, Smartphone } from "lucide-react";

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

function ShareIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function PlusSquareIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

export default function IosInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isInStandaloneMode()) return;

    const dismissed = localStorage.getItem("dp-install-prompt-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) return;
    }

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setPlatform("android");
      setTimeout(() => setVisible(true), 3000);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    if (isIosSafari()) {
      setPlatform("ios");
      const timer = setTimeout(() => setVisible(true), 3000);
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
    setVisible(false);
    localStorage.setItem("dp-install-prompt-dismissed", String(Date.now()));
  }

  async function handleInstallClick() {
    if (deferredPromptRef.current) {
      try {
        await deferredPromptRef.current.prompt();
        const choice = await deferredPromptRef.current.userChoice;
        if (choice.outcome === "accepted") {
          setVisible(false);
          localStorage.setItem("dp-install-prompt-dismissed", String(Date.now()));
        }
      } catch {}
      deferredPromptRef.current = null;
    }
  }

  if (!visible || !platform) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={handleDismiss}
      data-testid="install-prompt-overlay"
    >
      <div
        className="w-full max-w-sm bg-zinc-950 border border-red-600/30 rounded-2xl overflow-hidden animate-in slide-in-from-bottom duration-500"
        style={{ boxShadow: "0 -8px 40px rgba(255,0,0,0.1), 0 0 0 1px rgba(255,0,0,0.05)" }}
        onClick={(e) => e.stopPropagation()}
        data-testid="install-prompt"
      >
        <div className="relative p-5 pb-4">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-zinc-800/80 flex items-center justify-center hover:bg-zinc-700 transition-colors"
            data-testid="button-dismiss-install-prompt"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-black border border-red-600/30 flex items-center justify-center flex-shrink-0" style={{ boxShadow: "0 0 15px rgba(255,0,0,0.1)" }}>
              <img src="/icon-96x96.png" alt="Digital Pager" className="w-10 h-10 rounded-lg" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base" data-testid="text-install-prompt-title">
                Digital Pager
              </h3>
              <p className="text-white/40 text-xs mt-0.5" dir="rtl">أضف التطبيق للشاشة الرئيسية</p>
              <p className="text-white/30 text-[10px]">Add to Home Screen</p>
            </div>
          </div>

          <div className="bg-zinc-900/60 rounded-xl p-3 mb-4 border border-zinc-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-white/70 text-xs" dir="rtl" data-testid="text-install-benefit">
                استخدم التطبيق كأنه تطبيق أصلي مع تنبيهات فورية
              </p>
            </div>
            <p className="text-white/30 text-[10px] ps-6">Use the app like a native app with instant alerts</p>
          </div>

          {platform === "ios" && (
            <div className="space-y-2.5 mb-4">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/30">
                <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <ShareIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-xs font-medium" dir="rtl" data-testid="text-ios-step-1">
                    ١. اضغط على زر المشاركة <span className="text-white/40">في الأسفل</span>
                  </p>
                  <p className="text-white/30 text-[10px]">1. Tap the Share button below</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/30">
                <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <PlusSquareIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-xs font-medium" dir="rtl" data-testid="text-ios-step-2">
                    ٢. اختر "إضافة إلى الشاشة الرئيسية"
                  </p>
                  <p className="text-white/30 text-[10px]">2. Select "Add to Home Screen"</p>
                </div>
              </div>
            </div>
          )}

          {platform === "android" && (
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors mb-4"
              style={{ boxShadow: "0 0 25px rgba(255,0,0,0.2)" }}
              data-testid="button-install-app"
            >
              <Download className="w-5 h-5" />
              <span dir="rtl">تثبيت التطبيق</span>
              <span className="text-white/70 mx-1">|</span>
              <span>Install App</span>
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="w-full text-center text-white/30 text-xs py-1 hover:text-white/50 transition-colors"
            data-testid="button-skip-install"
          >
            <span dir="rtl">لاحقاً</span> / Not now
          </button>
        </div>

        {platform === "ios" && (
          <div className="flex items-center justify-center gap-1.5 py-2 bg-zinc-900/30 border-t border-zinc-800/30">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500/60 animate-pulse" />
            <span className="text-white/20 text-[10px]">Safari on iPhone / iPad</span>
          </div>
        )}
      </div>
    </div>
  );
}
