/**
 * PricingSection — homepage subscription signup
 * Three tier cards wired straight into Stripe Checkout (annual highlighted).
 * Guests are sent to login first; signed-in users go directly to checkout.
 * Bioluminescent Depth theme
 */
import { useState } from "react";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { trackUpgradeTapped } from "@/hooks/useAnalytics";
import { useTheme } from "@/contexts/ThemeContext";

type Tier = "monthly" | "annual" | "lifetime";

const PLANS: Array<{
  id: Tier;
  label: string;
  price: string;
  period: string;
  sub: string;
  cta: string;
  color: string;
  highlight: boolean;
  features: string[];
}> = [
  {
    id: "monthly",
    label: "Monthly",
    price: "$7.99",
    period: "/month",
    sub: "Cancel anytime",
    cta: "Subscribe Monthly",
    color: "#00D4AA",
    highlight: false,
    features: [
      "All 25 frequencies & recorded sessions",
      "Every guided meditation",
      "Unlimited healing alarms",
      "Full Sound Studio & Precision Player",
    ],
  },
  {
    id: "annual",
    label: "Annual",
    price: "$49.99",
    period: "/year",
    sub: "$4.17/mo · save 48%",
    cta: "Start 7-Day Free Trial",
    color: "#8B5CF6",
    highlight: true,
    features: [
      "Everything in Monthly",
      "7-day free trial — $0 today",
      "Wellness insights & analytics",
      "Offline downloads (mobile)",
    ],
  },
  {
    id: "lifetime",
    label: "Founder Lifetime",
    price: "$149.99",
    period: "once",
    sub: "Pay once, own forever",
    cta: "Claim Founder Seat",
    color: "#F59E0B",
    highlight: false,
    features: [
      "Everything, forever",
      "Founder badge on your profile",
      "Vote on the roadmap",
      "Limited to 500 seats",
    ],
  },
];

export default function PricingSection() {
  const { user } = useAuth();
  const billingConfig = trpc.billing.config.useQuery();
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();
  const [pendingTier, setPendingTier] = useState<Tier | null>(null);
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const seatsRemaining = billingConfig.data?.founderSeatsRemaining ?? null;
  const founderSoldOut = seatsRemaining !== null && seatsRemaining <= 0;

  const handleChoose = async (tier: Tier) => {
    trackUpgradeTapped(tier === "annual" ? "yearly" : tier);
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    if (!billingConfig.data?.enabled) {
      toast("✦ Checkout is warming up — try again in a moment.");
      return;
    }
    setPendingTier(tier);
    try {
      const { url } = await createCheckout.mutateAsync({ tier });
      if (url) window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout");
    } finally {
      setPendingTier(null);
    }
  };

  return (
    <section id="pricing" className="py-24" style={{ background: isLight ? '#EDF0F7' : '#0D0F1E' }}>
      <div className="container">
        <div className="text-center mb-14">
          <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            Simple pricing
          </div>
          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 600,
            color: isLight ? '#1A1D2E' : '#E8EDF5',
          }}>
            Start free. Upgrade when ready.
          </h2>
          <p className="text-sm mt-3 max-w-md mx-auto" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            Seven frequencies, seven meditations, one alarm, and the full Sound
            Studio are free forever — no card required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto items-stretch">
          {PLANS.map(plan => {
            const isPending = pendingTier === plan.id && createCheckout.isPending;
            const disabled = isPending || (plan.id === "lifetime" && founderSoldOut);
            return (
              <div
                key={plan.id}
                className="relative rounded-2xl p-6 flex flex-col"
                style={{
                  background: plan.highlight
                    ? (isLight ? `linear-gradient(160deg, ${plan.color}14 0%, #FFFFFF 100%)` : `linear-gradient(160deg, ${plan.color}14 0%, #12152A 100%)`)
                    : (isLight ? '#FFFFFF' : '#11142A'),
                  border: `1px solid ${plan.highlight ? `${plan.color}45` : (isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)')}`,
                  boxShadow: plan.highlight ? `0 0 48px ${plan.color}20` : (isLight ? '0 2px 12px rgba(0,0,0,0.07)' : 'none'),

                }}
              >
                {plan.highlight && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap"
                    style={{ background: plan.color, color: '#0A0B14', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    BEST VALUE
                  </span>
                )}

                <div className="text-sm font-semibold mb-2" style={{ color: plan.color, fontFamily: 'DM Sans, sans-serif' }}>
                  {plan.label}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold font-mono-brand" style={{ color: isLight ? '#1A1D2E' : '#E8EDF5' }}>{plan.price}</span>
                  <span className="text-sm" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>{plan.period}</span>
                </div>
                <div className="text-xs mb-5" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                  {plan.id === "lifetime" && seatsRemaining !== null
                    ? founderSoldOut
                      ? "All 500 founder seats claimed"
                      : `${plan.sub} · ${seatsRemaining} of 500 seats left`
                    : plan.sub}
                </div>

                <div className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2.5">
                      <Check size={14} className="flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                      <span className="text-xs leading-relaxed" style={{ color: isLight ? '#4A5568' : '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleChoose(plan.id)}
                  disabled={disabled}
                  className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                  style={plan.highlight ? {
                    background: `linear-gradient(135deg, ${plan.color}, ${plan.color}CC)`,
                    color: '#fff',
                    fontFamily: 'DM Sans, sans-serif',
                    boxShadow: `0 0 24px ${plan.color}30`,
                  } : {
                    background: `${plan.color}15`,
                    border: `1px solid ${plan.color}35`,
                    color: plan.color,
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  {isPending
                    ? "Opening checkout…"
                    : plan.id === "lifetime" && founderSoldOut
                      ? "Sold out"
                      : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[11px] mt-8" style={{ color: isLight ? '#6B7A99' : '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
          Secure payment via Stripe · Cancel anytime · Wellness &amp; entertainment purposes only
        </p>
      </div>
    </section>
  );
}
