/**
 * Join — Dedicated subscription landing page for Rise In Harmony
 * Presents all three tiers, a step-by-step how-to-subscribe guide, feature
 * comparison table, and FAQ. Wired directly into Stripe Checkout.
 * Bioluminescent Depth theme: background #0A0B14, teal accent #00D4AA
 */
import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp, Sparkles, Loader2, Shield, Zap, Music, Bell, BarChart2, Download, Star, Gift } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { startLogin, startSignup } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";

type Tier = "monthly" | "annual" | "lifetime";

const TEAL = "#00D4AA";
const PURPLE = "#8B5CF6";
const AMBER = "#F59E0B";
const BG = "#0A0B14";
const CARD = "#0D0F1E";
const BORDER = "rgba(255,255,255,0.07)";
const TEXT_PRIMARY = "#E8EDF5";
const TEXT_SECONDARY = "#8FA3BF";
const TEXT_MUTED = "#6B7A99";

// ─── Feature comparison data ──────────────────────────────────────────────────
const FEATURES = [
  { label: "Healing frequencies", free: "3 of 26", monthly: "All 26", annual: "All 26", lifetime: "All 26" },
  { label: "TrueHz™ precision synthesis", free: true, monthly: true, annual: true, lifetime: true },
  { label: "Guided meditations", free: "3 of 9", monthly: "All 9", annual: "All 9", lifetime: "All 9" },
  { label: "Healing alarm clock", free: "1 alarm", monthly: "Unlimited", annual: "Unlimited", lifetime: "Unlimited" },
  { label: "Sound Studio", free: "Basic", monthly: "Full", annual: "Full", lifetime: "Full" },
  { label: "Binaural beats & isochronic", free: false, monthly: true, annual: true, lifetime: true },
  { label: "Chakra wake sequences", free: false, monthly: true, annual: true, lifetime: true },
  { label: "Reiki session player", free: false, monthly: true, annual: true, lifetime: true },
  { label: "Sleep-to-Wake cycle", free: false, monthly: true, annual: true, lifetime: true },
  { label: "AI Frequency Prescription", free: false, monthly: true, annual: true, lifetime: true },
  { label: "Session sharing cards", free: false, monthly: true, annual: true, lifetime: true },
  { label: "Wellness analytics & insights", free: false, monthly: false, annual: true, lifetime: true },
  { label: "Offline downloads (mobile)", free: false, monthly: false, annual: true, lifetime: true },
  { label: "7-day free trial", free: false, monthly: false, annual: true, lifetime: false },
  { label: "Founder badge on profile", free: false, monthly: false, annual: false, lifetime: true },
  { label: "Vote on the roadmap", free: false, monthly: false, annual: false, lifetime: true },
  { label: "All future features, forever", free: false, monthly: false, annual: false, lifetime: true },
];

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "How does the 7-day free trial work?",
    a: "The Annual plan includes a 7-day free trial. You pay nothing today — your card is only charged after 7 days. Cancel any time before the trial ends and you won't be billed.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes. Monthly and Annual subscriptions can be cancelled at any time from your Dashboard. You retain access to Premium features until the end of your current billing period.",
  },
  {
    q: "What is the Founder Lifetime plan?",
    a: "A one-time payment of $149.99 that gives you permanent access to everything — all current features and all future features — forever. Limited to 500 seats. Once sold out, this tier will not be available again.",
  },
  {
    q: "What payment methods are accepted?",
    a: "All major credit and debit cards (Visa, Mastercard, Amex, Discover), Apple Pay, and Google Pay via Stripe's secure checkout.",
  },
  {
    q: "Is my payment information secure?",
    a: "Yes. All payments are processed by Stripe, a PCI DSS Level 1 certified payment processor. Rise In Harmony never stores your card details.",
  },
  {
    q: "Can I switch between plans?",
    a: "Yes. You can upgrade from Monthly to Annual at any time — the remaining days on your current plan are prorated. Contact support@riseinharmony.com to switch.",
  },
  {
    q: "Do I need an account to use Rise In Harmony?",
    a: "No. Three frequencies (174 Hz, 396 Hz, 432 Hz) are available without an account. Creating a free account unlocks session history, alarms, and the dashboard.",
  },
  {
    q: "What if I'm not satisfied?",
    a: "We offer a 7-day refund on your first subscription payment. Contact support@riseinharmony.com within 7 days of purchase.",
  },
];

// ─── How-to steps ─────────────────────────────────────────────────────────────
const HOW_TO_STEPS = [
  {
    step: "01",
    title: "Choose your plan",
    desc: "Select Monthly, Annual (best value with 7-day free trial), or Founder Lifetime below.",
    color: TEAL,
  },
  {
    step: "02",
    title: "Create your account",
    desc: "Sign in with Google, Apple, Facebook, or email. Takes under 30 seconds — no credit card required to start.",
    color: PURPLE,
  },
  {
    step: "03",
    title: "Complete checkout",
    desc: "You'll be taken to Stripe's secure checkout. Enter your payment details and confirm. That's it.",
    color: AMBER,
  },
  {
    step: "04",
    title: "Begin your practice",
    desc: "Your Premium access is instant. Open the Player, Studio, or Alarm and start your first healing session.",
    color: TEAL,
  },
];

// ─── Tier card data ───────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "monthly" as Tier,
    label: "Monthly",
    price: "$7.99",
    period: "/month",
    sub: "Cancel anytime",
    cta: "Subscribe Monthly",
    color: TEAL,
    highlight: false,
    badge: null,
    features: [
      "All 26 healing frequencies",
      "Every guided meditation",
      "Unlimited healing alarms",
      "Full Sound Studio & Precision Player",
      "Binaural beats & isochronic tones",
      "AI Frequency Prescription",
      "Session sharing cards",
    ],
  },
  {
    id: "annual" as Tier,
    label: "Annual",
    price: "$49.99",
    period: "/year",
    sub: "$4.17/mo · save 48%",
    cta: "Start 7-Day Free Trial",
    color: PURPLE,
    highlight: true,
    badge: "BEST VALUE",
    features: [
      "Everything in Monthly",
      "7-day free trial — $0 today",
      "Wellness insights & analytics",
      "Offline downloads (mobile)",
      "Priority feature access",
    ],
  },
  {
    id: "lifetime" as Tier,
    label: "Founder Lifetime",
    price: "$149.99",
    period: " once",
    sub: "Pay once, own forever",
    cta: "Claim Founder Seat",
    color: AMBER,
    highlight: false,
    badge: "LIMITED",
    features: [
      "Everything, forever",
      "All future features included",
      "Founder badge on your profile",
      "Vote on the product roadmap",
      "Limited to 500 seats",
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function FeatureValue({ val }: { val: boolean | string }) {
  if (val === true) return <Check size={16} style={{ color: TEAL }} />;
  if (val === false) return <X size={16} style={{ color: "#3A4060" }} />;
  return <span style={{ color: TEXT_SECONDARY, fontSize: "0.8rem", fontFamily: "DM Sans, sans-serif" }}>{val}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-b cursor-pointer"
      style={{ borderColor: BORDER }}
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-center justify-between py-4 gap-4">
        <span className="text-sm font-medium" style={{ color: TEXT_PRIMARY, fontFamily: "DM Sans, sans-serif" }}>{q}</span>
        {open
          ? <ChevronUp size={16} style={{ color: TEXT_MUTED, flexShrink: 0 }} />
          : <ChevronDown size={16} style={{ color: TEXT_MUTED, flexShrink: 0 }} />}
      </div>
      {open && (
        <p className="pb-4 text-sm leading-relaxed" style={{ color: TEXT_SECONDARY, fontFamily: "DM Sans, sans-serif" }}>{a}</p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Join() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const billingConfig = trpc.billing.config.useQuery();
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();
  const [pendingTier, setPendingTier] = useState<Tier | null>(null);

  const seatsRemaining = billingConfig.data?.founderSeatsRemaining ?? null;
  const founderSoldOut = seatsRemaining !== null && seatsRemaining <= 0;

  const handleChoose = async (tier: Tier) => {
    if (tier === "lifetime" && founderSoldOut) {
      toast.error("All Founder seats have been claimed.");
      return;
    }
    if (!user) {
      startSignup(tier); // take new users to signup; tier resumes after registration
      return;
    }
    if (!billingConfig.data?.enabled) {
      toast("✦ Checkout is warming up — try again in a moment.");
      return;
    }
    setPendingTier(tier);
    try {
      const { url } = await createCheckout.mutateAsync({ tier, successPath: "/journey?welcome=1" });
      if (url) window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout");
    } finally {
      setPendingTier(null);
    }
  };

  const bgMain = isLight ? "#F0F4FF" : BG;
  const bgCard = isLight ? "#FFFFFF" : CARD;
  const borderCol = isLight ? "rgba(0,0,0,0.07)" : BORDER;
  const textPrimary = isLight ? "#1A1D2E" : TEXT_PRIMARY;
  const textSecondary = isLight ? "#4A5568" : TEXT_SECONDARY;
  const textMuted = isLight ? "#6B7A99" : TEXT_MUTED;

  return (
    <Layout>
      <div style={{ background: bgMain, minHeight: "100vh" }}>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="pt-16 pb-12 text-center px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-semibold uppercase tracking-widest"
            style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.25)", color: TEAL, fontFamily: "DM Sans, sans-serif" }}>
            <Sparkles size={12} />
            Premium Membership
          </div>
          <h1 style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: "clamp(2.4rem, 6vw, 4rem)",
            fontWeight: 600,
            color: textPrimary,
            lineHeight: 1.15,
            marginBottom: "1rem",
          }}>
            Begin every morning<br />
            <span style={{ color: TEAL }}>in resonance.</span>
          </h1>
          <p className="max-w-xl mx-auto text-base leading-relaxed" style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}>
            Upgrade to Rise In Harmony Premium and unlock the complete library of 26 healing frequencies,
            guided meditations, binaural beats, and the full Sound Studio — all powered by TrueHz™ precision synthesis.
          </p>
        </section>

        {/* ── Tier cards ───────────────────────────────────────────── */}
        <section className="px-4 pb-16 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(plan => {
              const isBusy = pendingTier === plan.id;
              const isDisabled = plan.id === "lifetime" && founderSoldOut;
              return (
                <div
                  key={plan.id}
                  className="rounded-2xl flex flex-col relative overflow-hidden"
                  style={{
                    background: bgCard,
                    border: plan.highlight
                      ? `1.5px solid ${plan.color}`
                      : `1px solid ${borderCol}`,
                    boxShadow: plan.highlight ? `0 0 32px rgba(139,92,246,0.15)` : undefined,
                  }}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold tracking-widest rounded-bl-xl"
                      style={{ background: plan.color, color: plan.id === "annual" ? "#fff" : "#0A0B14", fontFamily: "DM Sans, sans-serif" }}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="p-6 flex flex-col flex-1">
                    {/* Header */}
                    <div className="mb-5">
                      <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                        style={{ color: plan.color, fontFamily: "DM Sans, sans-serif" }}>{plan.label}</p>
                      <div className="flex items-baseline gap-1">
                        <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2.6rem", fontWeight: 700, color: textPrimary, lineHeight: 1 }}>
                          {plan.price}
                        </span>
                        <span className="text-sm" style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}>{plan.period}</span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}>{plan.sub}</p>
                      {plan.id === "lifetime" && seatsRemaining !== null && (
                        <p className="text-xs mt-1 font-semibold" style={{ color: AMBER, fontFamily: "DM Sans, sans-serif" }}>
                          {seatsRemaining} of 500 seats remaining
                        </p>
                      )}
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => handleChoose(plan.id)}
                      disabled={isBusy || isDisabled}
                      className="w-full py-3.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 mb-6 transition-all duration-200 active:scale-[0.98]"
                      style={{
                        background: isDisabled ? "rgba(255,255,255,0.05)" : plan.color,
                        color: isDisabled ? textMuted : (plan.id === "annual" ? "#fff" : "#0A0B14"),
                        fontFamily: "DM Sans, sans-serif",
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        opacity: isBusy ? 0.7 : 1,
                      }}
                    >
                      {isBusy ? <Loader2 size={16} className="animate-spin" /> : null}
                      {isDisabled ? "Sold Out" : isBusy ? "Opening checkout…" : plan.cta}
                    </button>

                    {/* Features */}
                    <ul className="space-y-2.5 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2.5">
                          <Check size={15} style={{ color: plan.color, flexShrink: 0, marginTop: 2 }} />
                          <span className="text-sm" style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trust badge */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
            {[
              { icon: <Shield size={14} />, text: "Secure payment via Stripe" },
              { icon: <Zap size={14} />, text: "Instant access after checkout" },
              { icon: <Star size={14} />, text: "7-day refund guarantee" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-xs" style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}>
                <span style={{ color: TEAL }}>{icon}</span>
                {text}
              </div>
            ))}
          </div>
        </section>

        {/* ── How to subscribe ─────────────────────────────────────── */}
        <section className="px-6 py-16 border-t" style={{ borderColor: borderCol }}>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-center mb-2" style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              fontWeight: 600,
              color: textPrimary,
            }}>
              How to subscribe
            </h2>
            <p className="text-center text-sm mb-12" style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}>
              From first click to first session in under 2 minutes.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {HOW_TO_STEPS.map(step => (
                <div key={step.step} className="rounded-2xl p-6" style={{ background: bgCard, border: `1px solid ${borderCol}` }}>
                  <div className="text-3xl font-bold mb-3" style={{ fontFamily: "Cormorant Garamond, serif", color: step.color, opacity: 0.5 }}>
                    {step.step}
                  </div>
                  <h3 className="font-semibold mb-2 text-base" style={{ color: textPrimary, fontFamily: "DM Sans, sans-serif" }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Feature comparison table ──────────────────────────────── */}
        <section className="px-4 py-16 border-t" style={{ borderColor: borderCol }}>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-center mb-2" style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              fontWeight: 600,
              color: textPrimary,
            }}>
              Compare plans
            </h2>
            <p className="text-center text-sm mb-10" style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}>
              Everything you get at each tier.
            </p>

            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${borderCol}` }}>
              {/* Table header */}
              <div className="grid grid-cols-5 text-xs font-semibold uppercase tracking-widest"
                style={{ background: isLight ? "#E8EDF5" : "#0D0F1E", borderBottom: `1px solid ${borderCol}` }}>
                <div className="p-4 col-span-1" style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}>Feature</div>
                {[
                  { label: "Free", color: textMuted },
                  { label: "Monthly", color: TEAL },
                  { label: "Annual", color: PURPLE },
                  { label: "Lifetime", color: AMBER },
                ].map(col => (
                  <div key={col.label} className="p-4 text-center" style={{ color: col.color, fontFamily: "DM Sans, sans-serif" }}>
                    {col.label}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {FEATURES.map((row, i) => (
                <div
                  key={row.label}
                  className="grid grid-cols-5 items-center"
                  style={{
                    borderBottom: i < FEATURES.length - 1 ? `1px solid ${borderCol}` : undefined,
                    background: i % 2 === 0 ? "transparent" : (isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.015)"),
                  }}
                >
                  <div className="p-3 pl-4 text-xs col-span-1" style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}>
                    {row.label}
                  </div>
                  {[row.free, row.monthly, row.annual, row.lifetime].map((val, j) => (
                    <div key={j} className="p-3 flex justify-center items-center">
                      <FeatureValue val={val as boolean | string} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── What's included callouts ──────────────────────────────── */}
        <section className="px-6 py-16 border-t" style={{ borderColor: borderCol }}>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-center mb-10" style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              fontWeight: 600,
              color: textPrimary,
            }}>
              What's included in Premium
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { icon: <Music size={18} />, title: "26 Healing Frequencies", desc: "The complete Solfeggio scale from 174 Hz to 963 Hz, binaural beats for Alpha, Theta, and Delta states, plus Schumann resonance sessions.", color: TEAL },
                { icon: <Bell size={18} />, title: "Unlimited Healing Alarms", desc: "Wake to 432 Hz or 528 Hz with progressive fade-in over 5 minutes. Set as many alarms as you need with different frequencies for different days.", color: PURPLE },
                { icon: <Zap size={18} />, title: "Full Sound Studio", desc: "Layer frequencies, music, and nature sounds. Binaural beats, isochronic tones, bowl waveforms, and real-time waveform visualization.", color: AMBER },
                { icon: <BarChart2 size={18} />, title: "Wellness Analytics", desc: "Track your healing sessions, streak, and trends. Understand how your morning ritual impacts your day with weekly insight emails.", color: TEAL },
                { icon: <Download size={18} />, title: "Offline Downloads", desc: "Cache your favourite frequencies and meditations for offline use. Your morning ritual works even in airplane mode.", color: PURPLE },
                { icon: <Gift size={18} />, title: "AI Frequency Prescription", desc: "Answer 4 questions about your current state and receive a personalised frequency session recommendation — instantly.", color: AMBER },
              ].map(item => (
                <div key={item.title} className="flex gap-4 p-5 rounded-2xl" style={{ background: bgCard, border: `1px solid ${borderCol}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${item.color}18`, border: `1px solid ${item.color}30` }}>
                    <span style={{ color: item.color }}>{item.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1" style={{ color: textPrimary, fontFamily: "DM Sans, sans-serif" }}>{item.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────── */}
        <section className="px-6 py-16 border-t" style={{ borderColor: borderCol }}>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-center mb-10" style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              fontWeight: 600,
              color: textPrimary,
            }}>
              Frequently asked questions
            </h2>
            <div>
              {FAQS.map(faq => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────── */}
        <section className="px-6 py-20 border-t text-center" style={{ borderColor: borderCol }}>
          <h2 className="mb-3" style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 600,
            color: textPrimary,
          }}>
            Your practice begins today.
          </h2>
          <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: textSecondary, fontFamily: "DM Sans, sans-serif" }}>
            Join thousands waking up with intention. Start with the Annual plan and try it free for 7 days.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => handleChoose("annual")}
              disabled={pendingTier === "annual"}
              className="px-8 py-4 rounded-full font-semibold text-sm flex items-center gap-2 transition-all duration-200 active:scale-[0.98]"
              style={{ background: PURPLE, color: "#fff", fontFamily: "DM Sans, sans-serif" }}
            >
              {pendingTier === "annual" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Start 7-Day Free Trial
            </button>
            <button
              onClick={() => handleChoose("lifetime")}
              disabled={pendingTier === "lifetime" || founderSoldOut}
              className="px-8 py-4 rounded-full font-semibold text-sm flex items-center gap-2 transition-all duration-200 active:scale-[0.98]"
              style={{
                background: "transparent",
                border: `1.5px solid ${AMBER}`,
                color: AMBER,
                fontFamily: "DM Sans, sans-serif",
                opacity: founderSoldOut ? 0.4 : 1,
              }}
            >
              {pendingTier === "lifetime" ? <Loader2 size={16} className="animate-spin" /> : null}
              {founderSoldOut ? "Founder Seats Sold Out" : "Claim Founder Seat — $149.99"}
            </button>
          </div>
          <p className="text-xs mt-6" style={{ color: textMuted, fontFamily: "DM Sans, sans-serif" }}>
            Secure payment via Stripe · Cancel anytime · Questions? <a href="mailto:support@riseinharmony.com" style={{ color: TEAL }}>support@riseinharmony.com</a>
          </p>
        </section>

      </div>
    </Layout>
  );
}
