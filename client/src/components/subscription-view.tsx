import { useState, useEffect, useRef } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Merchant } from "@shared/schema";
import {
  CheckCircle2,
  Clock,
  X,
  Copy,
  Users,
  Gift,
  Crown,
  Zap,
  Rocket,
  Star,
  ChevronRight,
  Share2,
  RefreshCw,
  XCircle,
  Send,
} from "lucide-react";

const PLANS = [
  {
    id: "trial",
    price: 99,
    days: 30,
    icon: Star,
    color: "from-slate-700 to-slate-600",
    borderColor: "border-slate-500",
    accentColor: "text-slate-300",
    badgeColor: "bg-slate-600/40 text-slate-300 border-slate-500/50",
    nameAr: "باقة البداية",
    nameEn: "Starter",
    durationAr: "شهر واحد",
    features: ["بيجر رقمي لاسلكي", "QR كود مخصص", "إشعارات فورية", "تقارير أساسية"],
  },
  {
    id: "basic",
    price: 269,
    days: 90,
    icon: Zap,
    color: "from-blue-900 to-blue-800",
    borderColor: "border-blue-500",
    accentColor: "text-blue-300",
    badgeColor: "bg-blue-600/30 text-blue-300 border-blue-500/50",
    nameAr: "باقة النمو",
    nameEn: "Growth",
    durationAr: "٣ أشهر",
    features: ["كل مزايا البداية", "نظام الطلبات الذكي", "CRM العملاء", "كوبونات الخصم"],
  },
  {
    id: "premium",
    price: 499,
    days: 180,
    icon: Rocket,
    color: "from-red-900 to-rose-900",
    borderColor: "border-red-500",
    accentColor: "text-red-300",
    badgeColor: "bg-red-600/30 text-red-300 border-red-500/50",
    nameAr: "باقة التميز",
    nameEn: "Premium",
    durationAr: "٦ أشهر",
    popular: true,
    features: ["كل مزايا النمو", "تحليلات متقدمة", "تتبع العملاء", "دعم ذو أولوية"],
  },
  {
    id: "enterprise",
    price: 999,
    days: 365,
    icon: Crown,
    color: "from-amber-900 to-yellow-900",
    borderColor: "border-amber-400",
    accentColor: "text-amber-300",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-400/50",
    nameAr: "باقة المؤسسات",
    nameEn: "Enterprise",
    durationAr: "سنة كاملة",
    features: ["كل المزايا", "مدير حساب مخصص", "تكاملات متقدمة", "SLA مضمون"],
  },
];

interface Props {
  merchant: Merchant & { subscriptionStartAt?: string | null };
  t: (ar: string, en: string) => string;
  lang: string;
}

export default function SubscriptionView({ merchant, t, lang }: Props) {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string>(merchant.subscriptionRequestedPlan || merchant.plan || "trial");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referralStats, setReferralStats] = useState({ joined: 0, monthsEarned: 0 });
  const [referralLoading, setReferralLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [resubmitMode, setResubmitMode] = useState(false);
  const prevSubscriptionStatusRef = useRef<string>(merchant.subscriptionStatus || "pending");

  // Show success toast when admin activates the plan (real-time onSnapshot update)
  useEffect(() => {
    const prev = prevSubscriptionStatusRef.current;
    const current = merchant.subscriptionStatus || "pending";
    if (prev !== "active" && current === "active") {
      toast({
        title: t("🎉 تم تفعيل اشتراكك بنجاح!", "🎉 Subscription activated!"),
        description: t(
          "مرحباً بك! متجرك الآن نشط ويمكنك استخدام جميع الميزات.",
          "Welcome! Your store is now active and all features are unlocked."
        ),
      });
    }
    prevSubscriptionStatusRef.current = current;
  }, [merchant.subscriptionStatus]);

  const referralLink = `${window.location.origin}/register?ref=${merchant.uid}`;
  const isRejected = merchant.subscriptionRequestStatus === "rejected" && !resubmitMode;
  const isPending = merchant.subscriptionRequestStatus === "pending" && !submitted;
  const isAlreadyActive = merchant.subscriptionStatus === "active";
  const isLocked = (isPending || submitted) && !resubmitMode;

  useEffect(() => {
    async function fetchReferrals() {
      try {
        const q = query(collection(db, "merchants"), where("referredBy", "==", merchant.uid));
        const snap = await getDocs(q);
        const joined = snap.size;
        const monthsEarned = snap.docs.filter(
          (d) => d.data().subscriptionRequestStatus === "approved"
        ).length;
        setReferralStats({ joined, monthsEarned });
      } catch {
      } finally {
        setReferralLoading(false);
      }
    }
    fetchReferrals();
  }, [merchant.uid]);

  async function handleSubmit() {
    if (!selectedPlan) {
      toast({ title: t("اختر الباقة أولاً", "Please select a plan"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/merchant/subscription-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: merchant.uid,
          plan: selectedPlan,
          documents: [],
          notes: "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSubmitted(true);
      setResubmitMode(false);
      toast({
        title: t("تم إرسال الطلب بنجاح", "Request submitted"),
        description: t(
          "تم إرسال طلب تفعيل الباقة بنجاح. سنراجع بيانات متجرك ونفعل الاشتراك قريباً.",
          "Your activation request has been submitted. We'll review your store details and activate your subscription soon."
        ),
      });
    } catch (err: any) {
      toast({ title: t("فشل الإرسال", "Submission failed"), description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function copyReferral() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const planDetails = PLANS.find((p) => p.id === selectedPlan);

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-4xl mx-auto" dir={lang === "ar" ? "rtl" : "ltr"}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Crown className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-subscription-title">
            {t("اشتراكي", "My Subscription")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("اختر الباقة المناسبة لمتجرك", "Choose the right plan for your store")}
          </p>
        </div>
      </div>

      {/* Referral Discount Banner */}
      {merchant.referralDiscount && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10">
          <Gift className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300 font-medium">
            {t("لديك خصم 50% على أول شهر — هدية دعوة الصديق!", "You have a 50% discount on your first month — referral gift!")}
          </p>
        </div>
      )}

      {/* Active Subscription Status Card */}
      {isAlreadyActive && (() => {
        const activePlan = PLANS.find(p => p.id === merchant.plan) || PLANS[0];
        const expiryDate = merchant.subscriptionExpiry ? new Date(merchant.subscriptionExpiry) : null;
        const msLeft = expiryDate ? expiryDate.getTime() - Date.now() : null;
        const daysLeft = msLeft !== null ? Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24))) : null;
        const isExpiredCard = expiryDate !== null && expiryDate < new Date();
        const progressPct = (() => {
          if (!merchant.subscriptionStartAt || !expiryDate) return 0;
          const totalMs = expiryDate.getTime() - new Date(merchant.subscriptionStartAt).getTime();
          const elapsedMs = Date.now() - new Date(merchant.subscriptionStartAt).getTime();
          return Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));
        })();
        const PlanIcon = activePlan.icon;
        return (
          <div className={`rounded-2xl border p-5 space-y-4 ${isExpiredCard ? "border-red-500/40 bg-red-500/5" : "border-green-500/30 bg-green-500/5"}`} data-testid="card-active-subscription">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${activePlan.color}`}>
                  <PlanIcon className={`w-5 h-5 ${activePlan.accentColor}`} />
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">{t("الباقة الحالية", "Current Plan")}</p>
                  <p className="text-base font-bold text-white" data-testid="text-current-plan-name">
                    {lang === "ar" ? activePlan.nameAr : activePlan.nameEn}
                  </p>
                </div>
              </div>
              {isExpiredCard ? (
                <span className="text-xs font-bold text-red-400 border border-red-500/30 bg-red-500/10 px-2.5 py-1 rounded-lg" data-testid="badge-expired">
                  {t("منتهي", "Expired")}
                </span>
              ) : (
                <span className="text-xs font-bold text-green-400 border border-green-500/30 bg-green-500/10 px-2.5 py-1 rounded-lg" data-testid="badge-active">
                  {t("نشط", "Active")}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-black/20 border border-white/[0.06] p-3">
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{t("تاريخ الانتهاء", "Expiry Date")}</p>
                <p className={`text-sm font-bold ${isExpiredCard ? "text-red-400" : "text-white"}`} data-testid="text-expiry-date">
                  {expiryDate ? expiryDate.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-black/20 border border-white/[0.06] p-3">
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{t("الأيام المتبقية", "Days Remaining")}</p>
                <p className={`text-sm font-bold ${isExpiredCard ? "text-red-400" : daysLeft !== null && daysLeft <= 7 ? "text-amber-400" : "text-emerald-400"}`} data-testid="text-days-remaining">
                  {isExpiredCard ? t("انتهى", "Expired") : daysLeft !== null ? `${daysLeft} ${t("يوم", "days")}` : "—"}
                </p>
              </div>
            </div>

            {!isExpiredCard && expiryDate && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-white/30">
                  <span>{t("المدة المستهلكة", "Elapsed")}</span>
                  <span>{Math.round(progressPct)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progressPct > 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Rejection Banner */}
      {isRejected && (
        <div className="rounded-xl border-2 border-red-500/50 bg-red-500/10 p-4 space-y-3" data-testid="banner-rejected">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-400">
                {t("تم رفض طلب التفعيل", "Activation Request Rejected")}
              </p>
              {merchant.subscriptionRequestRejectionReason && (
                <div className="mt-2 p-3 rounded-lg bg-black/20 border border-red-500/20">
                  <p className="text-[11px] text-red-300/60 mb-1 uppercase tracking-wider font-medium">
                    {t("السبب", "Reason")}
                  </p>
                  <p className="text-sm text-white/90 leading-relaxed" data-testid="text-rejection-reason">
                    {merchant.subscriptionRequestRejectionReason}
                  </p>
                </div>
              )}
            </div>
          </div>
          <Button
            onClick={() => {
              setResubmitMode(true);
              setSubmitted(false);
            }}
            className="w-full h-10 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-bold text-sm gap-2"
            data-testid="btn-resubmit"
          >
            <RefreshCw className="w-4 h-4" />
            {t("إعادة إرسال الطلب", "Resubmit Request")}
          </Button>
        </div>
      )}

      {/* Pending Review Banner */}
      {(isPending || submitted) && !resubmitMode && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10">
          <Clock className="w-5 h-5 text-yellow-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-300">
              {t("طلبك قيد المراجعة", "Your request is under review")}
            </p>
            <p className="text-xs text-yellow-400/70 mt-0.5">
              {t("سيتواصل معك الفريق قريباً", "Our team will contact you soon")}
            </p>
          </div>
        </div>
      )}

      {/* Re-submit Mode Banner */}
      {resubmitMode && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-blue-500/40 bg-blue-500/10">
          <RefreshCw className="w-4 h-4 text-blue-400 shrink-0" />
          <p className="text-sm text-blue-300 font-medium">
            {t("وضع إعادة الإرسال — اختر الباقة ثم أرسل الطلب مجدداً", "Resubmission mode — select a plan and resubmit your request")}
          </p>
          <button onClick={() => setResubmitMode(false)} className="ms-auto text-blue-400/60 hover:text-blue-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Plan Cards */}
      <div>
        <h2 className="text-base font-semibold mb-4" data-testid="text-plans-heading">
          {t("اختر الباقة", "Choose Your Plan")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                data-testid={`card-plan-${plan.id}`}
                onClick={() => !isLocked && !isRejected && setSelectedPlan(plan.id)}
                className={`relative text-start rounded-2xl border-2 p-4 transition-all duration-200 bg-gradient-to-br ${plan.color} ${
                  isSelected
                    ? `${plan.borderColor} shadow-lg shadow-black/30 scale-[1.02]`
                    : "border-transparent opacity-70 hover:opacity-90 hover:scale-[1.01]"
                } ${isLocked || isRejected ? "cursor-default" : "cursor-pointer"}`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-0.5 rounded-full bg-primary text-white border border-primary/50 whitespace-nowrap">
                    {t("الأكثر طلباً", "Most Popular")}
                  </span>
                )}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${plan.accentColor}`} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{plan.nameAr}</p>
                      <p className="text-xs text-white/60">{plan.durationAr}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-white shrink-0 mt-0.5" />
                  )}
                </div>
                <div className="mb-3">
                  <span className="text-2xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-sm text-white/60 ms-1">{t("ريال", "SAR")}</span>
                </div>
                <ul className="space-y-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-white/80">
                      <ChevronRight className={`w-3 h-3 ${plan.accentColor} shrink-0`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit Button */}
      {!isLocked && !isRejected && (
        <Button
          data-testid="btn-submit-subscription"
          onClick={handleSubmit}
          disabled={submitting || !selectedPlan}
          className="w-full h-12 text-base font-bold rounded-xl bg-primary hover:bg-primary/90 gap-2"
        >
          <Send className="w-4 h-4" />
          {submitting ? t("جاري الإرسال...", "Submitting...") : t("طلب تفعيل الباقة", "Request Plan Activation")}
        </Button>
      )}

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Referral Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">{t("برنامج الإحالة", "Referral Program")}</h2>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-2xl font-extrabold text-white" data-testid="text-referral-joined">
              {referralLoading ? "—" : referralStats.joined}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("أصدقاء انضموا", "Friends Joined")}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <Gift className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-2xl font-extrabold text-white" data-testid="text-referral-months">
              {referralLoading ? "—" : referralStats.monthsEarned}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("أشهر مكتسبة", "Months Earned")}</p>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t("كيف يعمل البرنامج؟", "How does it work?")}
          </p>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Share2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <span>{t("شارك رابط دعوتك مع أصحاب المطاعم والمقاهي", "Share your invite link with restaurant & café owners")}</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <span>{t("كل متجر يسجّل عبر رابطك يحصل على خصم 50% لأول شهر", "Each store that registers via your link gets 50% off the first month")}</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>{t("عند تفعيل اشتراكهم، تُضاف 30 يومًا تلقائياً لاشتراكك", "When their subscription is activated, 30 days are automatically added to yours")}</span>
          </div>
        </div>

        {/* Referral link */}
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-muted-foreground truncate" data-testid="text-referral-link">
            {referralLink}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copyReferral}
            className="shrink-0 rounded-xl border-white/20"
            data-testid="btn-copy-referral"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        {copied && (
          <p className="text-xs text-green-400 mt-1.5 text-center" data-testid="text-copied-confirm">
            {t("تم نسخ الرابط!", "Link copied!")}
          </p>
        )}
      </div>

    </div>
  );
}
