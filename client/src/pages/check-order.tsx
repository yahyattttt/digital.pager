import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Wallet } from "lucide-react";

type PagerDoc = {
  docId: string;
  orderNumber: string;
  displayOrderId: string;
  access_pin: string;
};

export default function CheckOrderPage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const [pagers, setPagers] = useState<PagerDoc[]>([]);
  const [merchantName, setMerchantName] = useState<string>("");
  const [merchantLogo, setMerchantLogo] = useState<string>("");
  const [loadingMerchant, setLoadingMerchant] = useState(true);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [loyaltyRewardPct, setLoyaltyRewardPct] = useState(0);

  const [pinOpen, setPinOpen] = useState(false);
  const [pendingPager, setPendingPager] = useState<PagerDoc | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinChecking, setPinChecking] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const [loyaltyPromptOpen, setLoyaltyPromptOpen] = useState(false);
  const [confirmedPager, setConfirmedPager] = useState<PagerDoc | null>(null);
  const [loyaltyPhone, setLoyaltyPhone] = useState<string>(() => localStorage.getItem("dp_customer_phone") || "");
  const [loyaltyJoining, setLoyaltyJoining] = useState(false);
  const [loyaltyJoined, setLoyaltyJoined] = useState(false);
  const [loyaltyTosAccepted, setLoyaltyTosAccepted] = useState(false);
  const loyaltyPhoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!merchantId) return;
    fetch(`/api/merchant-public/${merchantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.storeName) setMerchantName(data.storeName);
        if (data?.logoUrl) setMerchantLogo(data.logoUrl);
        if (data?.loyalty_config?.is_enabled && (data.loyalty_config.manual_visit_reward || 0) > 0) {
          setLoyaltyEnabled(true);
          setLoyaltyRewardPct(data.loyalty_config.manual_visit_reward || 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMerchant(false));
  }, [merchantId]);

  useEffect(() => {
    if (!merchantId) return;
    fetch(`/api/track/tableqr/${merchantId}`, { method: "POST" }).catch(() => {});
  }, [merchantId]);

  useEffect(() => {
    if (!merchantId) return;
    const pagersRef = collection(db, "merchants", merchantId, "pagers");
    const q = query(pagersRef, where("status", "==", "waiting"));
    const unsub = onSnapshot(q, (snap) => {
      const docs: PagerDoc[] = [];
      snap.forEach((d) => {
        const data = d.data();
        docs.push({
          docId: d.id,
          orderNumber: data.orderNumber || "",
          displayOrderId: data.displayOrderId || data.orderNumber || "",
          access_pin: data.access_pin || "",
        });
      });
      docs.sort((a, b) => Number(a.orderNumber) - Number(b.orderNumber));
      setPagers(docs);
    });
    return () => unsub();
  }, [merchantId]);

  function handleSelect(pager: PagerDoc) {
    setPendingPager(pager);
    setPinInput("");
    setPinError("");
    setPinOpen(true);
    setTimeout(() => pinInputRef.current?.focus(), 120);
  }

  function redirectToPager(pager: PagerDoc) {
    window.location.href = `/digital-pager/${pager.docId}?m=${merchantId}&type=manual`;
  }

  function handlePinConfirm() {
    if (!pendingPager) return;
    const entered = pinInput.trim();
    if (!entered) {
      setPinError("الرمز غير صحيح، يرجى التأكد من الكاشير");
      return;
    }
    setPinChecking(true);
    if (entered === pendingPager.access_pin) {
      setPinOpen(false);
      setConfirmedPager(pendingPager);
      if (loyaltyEnabled) {
        setLoyaltyPromptOpen(true);
        setTimeout(() => loyaltyPhoneRef.current?.focus(), 120);
      } else {
        redirectToPager(pendingPager);
      }
    } else {
      setPinError("الرمز غير صحيح، يرجى التأكد من الكاشير");
      setPinChecking(false);
      setPinInput("");
      setTimeout(() => pinInputRef.current?.focus(), 80);
    }
  }

  function handlePinCancel() {
    setPinOpen(false);
    setPendingPager(null);
    setPinInput("");
    setPinError("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handlePinConfirm();
  }

  async function handleJoinLoyalty() {
    if (!confirmedPager || !loyaltyPhone || loyaltyPhone.length < 9 || !loyaltyTosAccepted) return;
    setLoyaltyJoining(true);
    try {
      const cleanPhone = loyaltyPhone.replace(/\D/g, "");
      localStorage.setItem("dp_customer_phone", cleanPhone);
      await fetch(`/api/wallet/${merchantId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          amount: loyaltyRewardPct,
          balance_type: "manual",
          type: "earn_visit",
          note: `مكافأة زيارة طلب #${confirmedPager.displayOrderId || confirmedPager.orderNumber}`,
        }),
      });
      setLoyaltyJoined(true);
      setTimeout(() => redirectToPager(confirmedPager), 1500);
    } catch {
      setLoyaltyJoining(false);
    }
  }

  function handleSkipLoyalty() {
    if (confirmedPager) redirectToPager(confirmedPager);
  }

  const bg = "linear-gradient(180deg, #0a0a0a 0%, #000 40%, #0d0000 100%)";

  if (loadingMerchant) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: bg }}>
        <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: bg }} data-testid="check-order-page">
      <div className="text-center pt-10 pb-6 px-5">
        <p className="text-white/40 text-[11px] font-medium tracking-[0.35em] uppercase mb-3">DIGITAL PAGER</p>
        {merchantLogo && (
          <img
            src={merchantLogo}
            alt=""
            className="w-16 h-16 rounded-full mx-auto mb-3 object-cover border-2 border-white/10"
            data-testid="img-store-logo"
          />
        )}
        {merchantName && (
          <h1
            className="text-white text-2xl font-bold"
            style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
            data-testid="text-store-name"
          >
            {merchantName}
          </h1>
        )}
        <p
          className="text-white/50 text-sm mt-4 font-medium"
          dir="rtl"
          style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
        >
          اختر رقم طلبك
        </p>
        <p className="text-white/20 text-xs mt-1">Select your order number</p>
      </div>

      <div className="flex-1 px-5 pb-10">
        {pagers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="w-8 h-8 text-white/10 animate-spin" />
            <p
              className="text-white/20 text-sm text-center"
              style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
            >
              في انتظار الطلبات...
            </p>
            <p className="text-white/10 text-xs text-center">Waiting for active orders</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto" data-testid="order-grid">
            {pagers.map((p) => (
              <button
                key={p.docId}
                onClick={() => handleSelect(p)}
                className="aspect-square flex items-center justify-center rounded-2xl bg-zinc-900/60 border-2 border-zinc-800/60 hover:border-red-600/40 hover:bg-red-900/10 active:scale-95 transition-all"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
                data-testid={`order-btn-${p.orderNumber}`}
              >
                <span
                  className="text-white font-bold text-2xl"
                  style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
                >
                  {p.displayOrderId}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PIN Verification Modal */}
      {pinOpen && pendingPager && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 backdrop-blur-sm px-5"
          data-testid="pin-modal"
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-5"
            style={{
              background: "linear-gradient(160deg, #13101a 0%, #0c0c0c 100%)",
              border: "1.5px solid rgba(140,60,200,0.25)",
              boxShadow: "0 0 40px rgba(100,0,200,0.08)",
            }}
          >
            <div className="text-center" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              <p className="text-white/35 text-[11px] tracking-[0.25em] uppercase mb-3">PIN VERIFICATION</p>

              <p className="text-white text-lg font-bold mb-1" data-testid="text-pin-modal-title">
                تأكيد ملكية الطلب
              </p>

              <p
                className="text-red-400 font-black mb-3"
                style={{ fontSize: 38, textShadow: "0 0 24px rgba(255,60,0,0.45)", letterSpacing: "0.05em" }}
                data-testid="text-pin-order-id"
              >
                {pendingPager.displayOrderId || `#${pendingPager.orderNumber}`}
              </p>

              <p className="text-white/50 text-sm mb-5 leading-relaxed" data-testid="text-pin-subtitle">
                فضلاً أدخل الرمز الموجود في كرت الطلب
              </p>

              <input
                ref={pinInputRef}
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                value={pinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 3);
                  setPinInput(val);
                  if (pinError) setPinError("");
                }}
                onKeyDown={handleKeyDown}
                placeholder="• • •"
                className="w-full text-center text-3xl font-black tracking-[0.5em] rounded-2xl py-4 outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: pinError ? "1.5px solid rgba(220,38,38,0.7)" : "1.5px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontFamily: "monospace",
                  appearance: "textfield",
                  MozAppearance: "textfield",
                }}
                data-testid="input-pin"
              />

              {pinError && (
                <p className="text-red-400 text-sm font-semibold mt-3" data-testid="text-pin-error" dir="rtl">
                  {pinError}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-2.5" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
              <button
                onClick={handlePinCancel}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1.5px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.45)",
                }}
                data-testid="button-pin-cancel"
              >
                إلغاء
              </button>
              <button
                onClick={handlePinConfirm}
                disabled={pinChecking || pinInput.length !== 3}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-50"
                style={{
                  background: "rgba(160,0,0,0.85)",
                  border: "1.5px solid rgba(200,40,40,0.4)",
                  color: "#fff",
                  boxShadow: "0 0 28px rgba(255,0,0,0.18)",
                }}
                data-testid="button-pin-confirm"
              >
                {pinChecking ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </span>
                ) : "تأكيد"}
              </button>
            </div>

            <p
              className="text-center text-[12px] font-bold leading-snug pt-1"
              style={{ color: "#FBBF24", fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
              dir="rtl"
              data-testid="text-pin-disclaimer"
            >
              ⚠️ تنويه: يجب إحضار الفاتورة الورقية الأصلية أثناء استلام طلبك من الكاونتر.
            </p>
          </div>
        </div>
      )}

      {/* Loyalty Join Prompt — shown after successful PIN if loyalty is enabled */}
      {loyaltyPromptOpen && confirmedPager && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm px-5"
          data-testid="loyalty-prompt-modal"
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-5"
            style={{
              background: "linear-gradient(160deg, #0d1008 0%, #0a0a0a 100%)",
              border: "1.5px solid rgba(251,191,36,0.2)",
              boxShadow: "0 0 40px rgba(180,130,0,0.08)",
            }}
          >
            {!loyaltyJoined ? (
              <>
                <div className="text-center" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(251,191,36,0.1)", border: "1.5px solid rgba(251,191,36,0.2)" }}
                  >
                    <Wallet className="w-7 h-7 text-amber-400" />
                  </div>
                  <p className="text-white text-lg font-bold mb-1" data-testid="text-loyalty-prompt-title">
                    انضم لمحفظة الولاء 🎁
                  </p>
                  <p className="text-sm leading-relaxed mt-2" style={{ color: "rgba(251,191,36,0.65)" }}>
                    احصل على {loyaltyRewardPct} ريال مكافأة على هذه الزيارة فوراً
                  </p>
                </div>

                <div className="space-y-2" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
                  <label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>رقم جوالك</label>
                  <input
                    ref={loyaltyPhoneRef}
                    type="tel"
                    inputMode="numeric"
                    value={loyaltyPhone}
                    onChange={(e) => setLoyaltyPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="05XXXXXXXX"
                    dir="ltr"
                    maxLength={10}
                    className="w-full h-11 px-3 rounded-xl text-white text-base"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(251,191,36,0.18)",
                      outline: "none",
                    }}
                    data-testid="input-loyalty-join-phone"
                  />
                </div>

                {/* ToS Acceptance Checkbox */}
                <label
                  className="flex items-start gap-2.5 cursor-pointer select-none"
                  dir="rtl"
                  style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
                  data-testid="label-loyalty-tos"
                >
                  <div
                    onClick={() => setLoyaltyTosAccepted(prev => !prev)}
                    className="mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
                    style={{
                      background: loyaltyTosAccepted ? "rgba(251,191,36,0.9)" : "transparent",
                      borderColor: loyaltyTosAccepted ? "rgba(251,191,36,0.6)" : "rgba(255,255,255,0.2)",
                    }}
                    data-testid="checkbox-loyalty-tos"
                  >
                    {loyaltyTosAccepted && (
                      <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                        <path d="M1 4.5L4 7.5L10 1.5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                    أوافق على حفظ رقمي في برنامج الولاء واستخدامه لإضافة وعرض المكافآت
                  </span>
                </label>

                <div className="flex gap-3" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
                  <button
                    onClick={handleSkipLoyalty}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1.5px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.35)",
                    }}
                    data-testid="button-loyalty-skip"
                  >
                    تخطي
                  </button>
                  <button
                    onClick={handleJoinLoyalty}
                    disabled={loyaltyJoining || loyaltyPhone.length < 9 || !loyaltyTosAccepted}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{
                      background: "rgba(251,191,36,0.88)",
                      border: "1.5px solid rgba(251,191,36,0.3)",
                      color: "#000",
                    }}
                    data-testid="button-loyalty-join"
                  >
                    {loyaltyJoining ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Wallet className="w-4 h-4" />
                        انضم واكسب
                      </>
                    )}
                  </button>
                </div>

                {/* Cashier redemption notice */}
                <p
                  className="text-sm font-bold text-center leading-relaxed"
                  style={{ color: "#FFD700", fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
                  data-testid="text-loyalty-popup-cashier-note"
                  dir="rtl"
                >
                  ℹ️ للإستعلام عن رصيد مكافأتك أو الاستفادة منها عن طريق كاشير المتجر
                </p>
              </>
            ) : (
              <div className="text-center py-4" dir="rtl" style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}>
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-white font-bold text-lg mb-1" data-testid="text-loyalty-joined-success">
                  تمت إضافة المكافأة!
                </p>
                <p className="text-sm" style={{ color: "rgba(251,191,36,0.65)" }}>
                  تم إضافة {loyaltyRewardPct} ريال لمحفظتك
                </p>
                <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                  جاري التوجيه...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
