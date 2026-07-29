/**
 * Gift — Gift a Rise In Harmony subscription
 *
 * Allows users to purchase a gift subscription (monthly, annual, or lifetime)
 * for someone else. Routes through the existing Stripe billing flow with a
 * gift metadata flag. Also surfaces the Practitioner tier.
 *
 * Bioluminescent Depth theme.
 */
import { useState } from "react";
import { Gift, Heart, Sparkles, Star, ChevronRight, Check, Users } from "lucide-react";
import Layout from "@/components/Layout";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { toast } from "sonner";
import PremiumPaywall from "@/components/PremiumPaywall";

// ─── Gift tiers ───────────────────────────────────────────────────────────────

const GIFT_TIERS = [
  {
    id: "monthly" as const,
    label: "1-Month Gift",
    price: "$7.99",
    period: "one month",
    icon: Heart,
    color: "#EC4899",
    features: ["All 26 healing frequencies", "Unlimited alarms", "Full Sound Studio", "Meditation library"],
    badge: null,
  },
  {
    id: "annual" as const,
    label: "1-Year Gift",
    price: "$49.99",
    period: "one year",
    icon: Sparkles,
    color: "#00D4AA",
    features: ["Everything in Monthly", "Wellness insights & analytics", "Offline downloads", "Priority support"],
    badge: "BEST VALUE",
  },
  {
    id: "lifetime" as const,
    label: "Lifetime Gift",
    price: "$149.99",
    period: "forever",
    icon: Star,
    color: "#F59E0B",
    features: ["Everything, forever", "Founder badge", "Roadmap voting", "All future features"],
    badge: "FOUNDER",
  },
];

const PRACTITIONER_FEATURES = [
  "Use Sound Studio during client sessions",
  "Share branded session links with clients",
  "Access all 26 healing frequencies",
  "Unlimited alarms & sleep timers",
  "Priority support",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function GiftPage() {
  const [selectedTier, setSelectedTier] = useState<"monthly" | "annual" | "lifetime">("annual");
  const [showPaywall, setShowPaywall] = useState(false);
  const { theme } = useTheme();
  const { user } = useAuth();
  const isLight = theme === "light";

  const billingConfig = trpc.billing.config.useQuery();
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();

  const handleGiftCheckout = async () => {
    if (!user) { startLogin(); return; }
    if (!billingConfig.data?.enabled) {
      toast("✦ Checkout is almost ready — try again shortly.");
      return;
    }
    try {
      const { url } = await createCheckout.mutateAsync({
        tier: selectedTier,
        successPath: "/gift?success=1",
        cancelPath: "/gift",
      });
      if (url) window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout");
    }
  };

  const bg   = isLight ? "#F5F6F9" : "#0A0B14";
  const card = isLight ? "rgba(255,255,255,0.9)" : "rgba(13,15,30,0.9)";
  const bdr  = isLight ? "rgba(0,0,0,0.06)"      : "rgba(255,255,255,0.06)";
  const text = isLight ? "#1A1D2E"               : "#E8EDF5";
  const muted = "#6B7A99";

  // Success state
  const isSuccess = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("success") === "1";

  return (
    <Layout>
      <div className="min-h-screen px-4 py-12" style={{ background: bg }}>
        <div className="max-w-2xl mx-auto">

          {isSuccess ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6"
                style={{ background: "rgba(0,212,170,0.15)", border: "2px solid rgba(0,212,170,0.4)" }}>
                <Check size={32} style={{ color: "#00D4AA" }} />
              </div>
              <h1 className="text-3xl font-semibold mb-3" style={{ fontFamily: "Cormorant Garamond, serif", color: text }}>
                Gift sent with love ✦
              </h1>
              <p className="text-sm" style={{ color: muted, fontFamily: "DM Sans, sans-serif" }}>
                Your recipient will receive an email with their gift subscription. Thank you for sharing healing frequencies.
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-semibold"
                  style={{ background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.2)", color: "#EC4899", fontFamily: "DM Sans, sans-serif" }}>
                  <Gift size={12} />
                  Gift a Subscription
                </div>
                <h1 className="text-4xl font-semibold mb-3" style={{ fontFamily: "Cormorant Garamond, serif", color: text }}>
                  Share the healing.
                </h1>
                <p className="text-sm max-w-md mx-auto" style={{ color: muted, fontFamily: "DM Sans, sans-serif" }}>
                  Give someone you love the gift of healing frequencies, better sleep, and a morning ritual that transforms their day.
                </p>
              </div>

              {/* Gift tier selector */}
              <div className="space-y-3 mb-8">
                {GIFT_TIERS.map(tier => {
                  const Icon = tier.icon;
                  const isSelected = selectedTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier.id)}
                      className="w-full text-left rounded-2xl p-5 transition-all duration-200"
                      style={{
                        background: isSelected ? `${tier.color}10` : card,
                        border: `1px solid ${isSelected ? `${tier.color}40` : bdr}`,
                        boxShadow: isSelected ? `0 0 30px ${tier.color}15` : "none",
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${tier.color}15`, border: `1px solid ${tier.color}30` }}>
                          <Icon size={18} style={{ color: tier.color }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold" style={{ color: text, fontFamily: "DM Sans, sans-serif" }}>{tier.label}</span>
                            {tier.badge && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: `${tier.color}20`, color: tier.color, fontFamily: "DM Sans, sans-serif" }}>
                                {tier.badge}
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-xl font-bold" style={{ color: tier.color, fontFamily: "DM Sans, sans-serif" }}>{tier.price}</span>
                            <span className="text-xs" style={{ color: muted, fontFamily: "DM Sans, sans-serif" }}>· {tier.period}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {tier.features.map(f => (
                              <span key={f} className="text-xs flex items-center gap-1" style={{ color: muted, fontFamily: "DM Sans, sans-serif" }}>
                                <Check size={10} style={{ color: tier.color }} />
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ borderColor: isSelected ? selectedTier === tier.id ? GIFT_TIERS.find(t => t.id === selectedTier)?.color : bdr : bdr }}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: tier.color }} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleGiftCheckout}
                disabled={createCheckout.isPending}
                className="btn-teal w-full py-4 text-base font-semibold flex items-center justify-center gap-2 mb-4 disabled:opacity-60"
              >
                <Gift size={18} />
                {createCheckout.isPending ? "Opening checkout…" : `Gift ${GIFT_TIERS.find(t => t.id === selectedTier)?.price} · ${GIFT_TIERS.find(t => t.id === selectedTier)?.label}`}
                <ChevronRight size={18} />
              </button>
              <p className="text-center text-xs mb-12" style={{ color: muted, fontFamily: "DM Sans, sans-serif" }}>
                Secure payment via Stripe · Your recipient receives an email with their access
              </p>

              {/* Practitioner Tier */}
              <div className="rounded-2xl p-6" style={{ background: card, border: `1px solid rgba(139,92,246,0.2)`, boxShadow: "0 0 40px rgba(139,92,246,0.08)" }}>
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                    <Users size={20} style={{ color: "#8B5CF6" }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-semibold" style={{ color: text, fontFamily: "DM Sans, sans-serif" }}>Practitioner Tier</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6", fontFamily: "DM Sans, sans-serif" }}>
                        COMING SOON
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: muted, fontFamily: "DM Sans, sans-serif" }}>
                      For yoga instructors, Reiki masters, sound bath facilitators, and massage therapists.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  {PRACTITIONER_FEATURES.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm" style={{ color: muted, fontFamily: "DM Sans, sans-serif" }}>
                      <Check size={13} style={{ color: "#8B5CF6", flexShrink: 0 }} />
                      {f}
                    </div>
                  ))}
                </div>

                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-2xl font-bold" style={{ color: "#8B5CF6", fontFamily: "DM Sans, sans-serif" }}>$9.99</span>
                  <span className="text-sm" style={{ color: muted, fontFamily: "DM Sans, sans-serif" }}>/month or $99/year</span>
                </div>

                <button
                  onClick={() => toast("Practitioner tier launching soon — we'll notify you when it's ready!")}
                  className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200"
                  style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", color: "#8B5CF6", fontFamily: "DM Sans, sans-serif" }}
                >
                  <Users size={15} />
                  Notify Me When Available
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {showPaywall && <PremiumPaywall onClose={() => setShowPaywall(false)} />}
    </Layout>
  );
}
