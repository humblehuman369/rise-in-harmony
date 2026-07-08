/**
 * PremiumPaywall — Upgrade modal for locked premium frequencies
 * Shows pricing tiers, feature list, and Stripe Checkout CTA
 * Bioluminescent Depth theme
 */
import { useState } from "react";
import { X, Sparkles, Check, Lock, Zap, Music, Waves, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { trackUpgradeTapped } from "@/hooks/useAnalytics";

// ─── Pricing tiers ────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "monthly",
    label: "Monthly",
    price: "$7.99",
    period: "/month",
    annualEquiv: null,
    badge: null,
    color: "#00D4AA",
  },
  {
    id: "annual",
    label: "Annual",
    price: "$49.99",
    period: "/year",
    annualEquiv: "$4.17/mo",
    badge: "Best Value",
    color: "#8B5CF6",
  },
  {
    id: "lifetime",
    label: "Lifetime",
    price: "$149.99",
    period: "once",
    annualEquiv: "Pay once, own forever",
    badge: null,
    color: "#F59E0B",
  },
];

const PREMIUM_FEATURES = [
  { Icon: Music,  text: "All 25 healing frequencies & recorded sessions" },
  { Icon: Waves,  text: "Sound Studio with music & nature layers" },
  { Icon: Zap,    text: "7-Chakra guided morning sequence" },
  { Icon: Star,   text: "Unlimited healing alarms" },
  { Icon: Sparkles, text: "Unlimited session journal & mood history" },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface PremiumPaywallProps {
  triggerFrequencyName?: string;
  triggerFrequencyHz?: number;
  onClose: () => void;
}

export default function PremiumPaywall({
  triggerFrequencyName,
  triggerFrequencyHz,
  onClose,
}: PremiumPaywallProps) {
  // A/B test: "annual-first" highlights annual plan, "lifetime-highlight" highlights lifetime
  const pricingVariant = useFeatureFlag<string>("pricing-test", "control");
  const defaultPlan = pricingVariant === "lifetime-highlight" ? "lifetime" : "annual";
  const [selectedPlan, setSelectedPlan] = useState(defaultPlan);
  const { user } = useAuth();
  const billingConfig = trpc.billing.config.useQuery();
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();

  const founderSeatsRemaining = billingConfig.data?.founderSeatsRemaining ?? null;
  const founderSoldOut = founderSeatsRemaining !== null && founderSeatsRemaining <= 0;

  const handleStartTrial = async () => {
    const tier = selectedPlan as "monthly" | "annual" | "lifetime";
    trackUpgradeTapped(tier === "annual" ? "yearly" : tier);

    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    if (!billingConfig.data?.enabled) {
      toast("✦ Checkout is almost ready — try again shortly.");
      return;
    }
    try {
      const { url } = await createCheckout.mutateAsync({ tier });
      if (url) window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout");
    }
  };

  const plan = PLANS.find(p => p.id === selectedPlan)!;
  const ctaLabel =
    selectedPlan === "annual"
      ? "Start 7-Day Free Trial"
      : selectedPlan === "lifetime"
        ? "Claim Founder Lifetime"
        : "Subscribe Monthly";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,11,20,0.88)", backdropFilter: "blur(16px)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden relative"
        style={{
          background: "linear-gradient(160deg, #12152A 0%, #0D0F1E 100%)",
          border: "1px solid rgba(139,92,246,0.2)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(139,92,246,0.08)",
        }}
      >
        {/* Glow header strip */}
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, #00D4AA, #8B5CF6, #EC4899)" }}
        />

        <div className="p-6">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ color: "#6B7A99", background: "rgba(255,255,255,0.05)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#E8EDF5"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6B7A99"; }}
          >
            <X size={14} />
          </button>

          {/* Lock icon + headline */}
          <div className="flex flex-col items-center text-center mb-5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(0,212,170,0.1))",
                border: "1px solid rgba(139,92,246,0.3)",
              }}
            >
              <Lock size={24} style={{ color: "#8B5CF6" }} />
            </div>
            <h2
              style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.6rem", fontWeight: 600, color: "#E8EDF5" }}
            >
              Unlock Rise In Harmony
            </h2>
            {triggerFrequencyHz && (
              <p className="text-sm mt-1" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                <span style={{ color: "#8B5CF6" }}>{triggerFrequencyHz}Hz — {triggerFrequencyName}</span> is a premium frequency
              </p>
            )}
          </div>

          {/* Feature list */}
          <div className="space-y-2 mb-5">
            {PREMIUM_FEATURES.map(({ Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(0,212,170,0.12)" }}
                >
                  <Check size={12} style={{ color: "#00D4AA" }} />
                </div>
                <span className="text-sm" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Plan selector */}
          <div className="flex gap-2 mb-4">
            {PLANS.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                className="flex-1 relative flex flex-col items-center py-3 px-2 rounded-xl transition-all duration-200"
                style={{
                  background: selectedPlan === p.id ? `${p.color}15` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${selectedPlan === p.id ? `${p.color}50` : "rgba(255,255,255,0.06)"}`,
                }}
              >
                {p.badge && (
                  <span
                    className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{ background: p.color, color: "#0A0B14", fontFamily: "DM Sans, sans-serif" }}
                  >
                    {p.badge}
                  </span>
                )}
                <span
                  className="text-xs font-semibold mb-0.5"
                  style={{ color: selectedPlan === p.id ? "#E8EDF5" : "#6B7A99", fontFamily: "DM Sans, sans-serif" }}
                >
                  {p.label}
                </span>
                <span
                  className="text-base font-bold font-mono-brand"
                  style={{ color: selectedPlan === p.id ? p.color : "#8FA3BF" }}
                >
                  {p.price}
                </span>
                <span
                  className="text-[9px]"
                  style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}
                >
                  {p.period}
                </span>
                {p.annualEquiv && (
                  <span
                    className="text-[9px] mt-0.5"
                    style={{ color: selectedPlan === p.id ? p.color : "#4A5568", fontFamily: "DM Sans, sans-serif" }}
                  >
                    {p.annualEquiv}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Founder seat counter */}
          {selectedPlan === "lifetime" && founderSeatsRemaining !== null && (
            <p className="text-center text-[10px] mb-2" style={{ color: "#F59E0B", fontFamily: "DM Sans, sans-serif" }}>
              {founderSoldOut
                ? "All founder seats have been claimed"
                : `${founderSeatsRemaining} of 500 founder seats remaining`}
            </p>
          )}

          {/* CTA */}
          <button
            onClick={handleStartTrial}
            disabled={createCheckout.isPending || (selectedPlan === "lifetime" && founderSoldOut)}
            className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
            style={{
              background: `linear-gradient(135deg, ${plan.color}, ${plan.color}CC)`,
              color: "#0A0B14",
              fontFamily: "DM Sans, sans-serif",
              boxShadow: `0 0 24px ${plan.color}35`,
            }}
          >
            {createCheckout.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {createCheckout.isPending ? "Opening secure checkout…" : ctaLabel}
          </button>

          <p className="text-center text-[10px] mt-3" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
            {selectedPlan === "annual"
              ? "No charge for 7 days · Cancel anytime · Secure payment via Stripe"
              : selectedPlan === "lifetime"
                ? "One-time payment · Yours forever · Secure payment via Stripe"
                : "Cancel anytime · Secure payment via Stripe"}
          </p>
        </div>
      </div>
    </div>
  );
}
