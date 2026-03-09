import { useState, useEffect } from "react";
import { X } from "lucide-react";

function isIosSafari(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone = ("standalone" in window.navigator) && !(window.navigator as any).standalone;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isIos && isSafari && isStandalone;
}

function ShareIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function PlusSquareIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function IosInstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIosSafari()) return;
    const dismissed = localStorage.getItem("dp-ios-prompt-dismissed");
    if (dismissed) return;
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem("dp-ios-prompt-dismissed", "1");
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" data-testid="ios-install-prompt-overlay">
      <div className="w-full max-w-sm bg-zinc-950 border border-red-600/40 rounded-2xl shadow-[0_0_40px_rgba(255,0,0,0.15)] overflow-hidden animate-in slide-in-from-bottom duration-500" data-testid="ios-install-prompt">
        <div className="relative p-5">
          <button
            onClick={handleDismiss}
            className="absolute top-3 left-3 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"
            data-testid="button-dismiss-ios-prompt"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>

          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-600/30 flex items-center justify-center mx-auto mb-3">
              <img src="/icon-96x96.png" alt="Digital Pager" className="w-10 h-10 rounded-lg" />
            </div>
            <h3 className="text-white font-bold text-lg" dir="rtl" data-testid="text-ios-prompt-title">
              أضف التطبيق للشاشة الرئيسية
            </h3>
            <p className="text-gray-400 text-xs mt-1">Add to Home Screen</p>
          </div>

          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-3 bg-zinc-900/80 rounded-xl p-3 border border-zinc-800">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <ShareIcon />
              </div>
              <ArrowIcon />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium" dir="rtl" data-testid="text-ios-step-1">
                  ١. اضغط على زر المشاركة
                </p>
                <p className="text-gray-500 text-[11px]">1. Tap the Share button</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-zinc-900/80 rounded-xl p-3 border border-zinc-800">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <PlusSquareIcon />
              </div>
              <ArrowIcon />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium" dir="rtl" data-testid="text-ios-step-2">
                  ٢. اختر "إضافة إلى الشاشة الرئيسية"
                </p>
                <p className="text-gray-500 text-[11px]">2. Select "Add to Home Screen"</p>
              </div>
            </div>
          </div>

          <div className="bg-red-600/10 border border-red-600/20 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-xs font-medium leading-relaxed text-center" dir="rtl" data-testid="text-ios-prompt-reason">
              إضافة التطبيق للشاشة الرئيسية تضمن وصول التنبيهات الصوتية والاهتزاز حتى عند تبديل التطبيقات
            </p>
            <p className="text-red-500/60 text-[10px] text-center mt-1.5">
              Adding to home screen ensures sound & vibration alerts work even when switching apps
            </p>
          </div>

          <div className="flex items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-gray-600 text-[10px]">Safari on iPhone</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
