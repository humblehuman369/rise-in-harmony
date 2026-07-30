/**
 * Onboarding — Subscriber Journey Walkthrough
 *
 * A visual, step-by-step guide showing the complete new subscriber journey:
 * from choosing a plan → sign in → Stripe checkout → /journey welcome.
 *
 * Route: /onboarding
 * Design: Bioluminescent Depth dark theme (#0A0B14 bg, #00D4AA teal accent)
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

// ── Step data ─────────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    tag: "Step 1",
    tagColor: "teal" as const,
    icon: "🎵",
    title: "Choose Your Plan",
    body: "Visit riseinharmony.com and scroll to the pricing section — or click the Subscribe button in the top navigation bar to go directly to /join. Three tiers are presented side by side.",
    detail: "Monthly $7.99 · Annual $49.99 (7-day free trial) · Founder Lifetime $149.99",
  },
  {
    num: "02",
    tag: "Step 2",
    tagColor: "purple" as const,
    icon: "🔐",
    title: "Sign In or Create Account",
    body: "Clicking any Subscribe button stores your selected tier and routes you to the Manus OAuth portal. Sign in with Google, Apple, Microsoft, Facebook, or email. New users create an account here — no separate registration form required.",
    detail: "Your subscription intent is remembered — no second click needed after sign-in.",
  },
  {
    num: "03",
    tag: "Step 3",
    tagColor: "stripe" as const,
    icon: "💳",
    title: "Complete Payment via Stripe",
    body: "After signing in, the app automatically resumes checkout and redirects you to Stripe's secure payment gateway with your selected plan pre-loaded. Payment is processed via Stripe's PCI-compliant infrastructure.",
    detail: "Annual plan includes a 7-day free trial. Cancel anytime before the trial ends.",
  },
  {
    num: "04",
    tag: "Step 4",
    tagColor: "gold" as const,
    icon: "✦",
    title: "Redirected to Your Journey",
    body: "On successful payment, Stripe routes you back to riseinharmony.com/journey?welcome=1. The app detects the welcome parameter, confirms your subscription, and cleans the URL to /journey.",
    detail: "Subscription active · Full library unlocked · All 26 healing frequencies",
  },
  {
    num: "05",
    tag: "Step 5",
    tagColor: "rose" as const,
    icon: "🔔",
    title: "Welcome to Premium Toast",
    body: "A teal notification toast appears confirming your subscription is active. The message reads \"Welcome to Premium ✦\" with the description \"Your subscription is active. Enjoy the full library.\" It displays for 6 seconds.",
    detail: "The toast appears in the bottom-right corner and auto-dismisses after 6 seconds.",
  },
  {
    num: "06",
    tag: "Step 6",
    tagColor: "teal" as const,
    icon: "🌊",
    title: "The Journey Begins",
    body: "You land on the Journey tab — an immersive, full-screen scroll experience with six sections: Healing Frequencies, Body & Mind, Sacred Geometry, Science of Sound, Waveform Visualization, and Begin Your Practice.",
    detail: "Journey is the designed starting point for every new subscriber.",
  },
];

const TAG_STYLES: Record<string, { color: string; bg: string }> = {
  teal:   { color: "#00D4AA", bg: "rgba(0,212,170,0.12)" },
  purple: { color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
  stripe: { color: "#635BFF", bg: "rgba(99,91,255,0.12)" },
  gold:   { color: "#FFD93D", bg: "rgba(255,217,61,0.12)" },
  rose:   { color: "#FF8B94", bg: "rgba(255,139,148,0.12)" },
};

const CIRCLE_STYLES: Record<string, React.CSSProperties> = {
  teal:   { background: "rgba(0,212,170,0.15)",   border: "1.5px solid rgba(0,212,170,0.3)",   boxShadow: "0 0 24px rgba(0,212,170,0.15)" },
  purple: { background: "rgba(139,92,246,0.15)",  border: "1.5px solid rgba(139,92,246,0.3)",  boxShadow: "0 0 24px rgba(139,92,246,0.12)" },
  stripe: { background: "rgba(99,91,255,0.15)",   border: "1.5px solid rgba(99,91,255,0.3)",   boxShadow: "0 0 24px rgba(99,91,255,0.12)" },
  gold:   { background: "rgba(255,217,61,0.15)",  border: "1.5px solid rgba(255,217,61,0.3)",  boxShadow: "0 0 24px rgba(255,217,61,0.12)" },
  rose:   { background: "rgba(255,139,148,0.15)", border: "1.5px solid rgba(255,139,148,0.3)", boxShadow: "0 0 24px rgba(255,139,148,0.12)" },
};

const TOP_BAR_COLORS: Record<string, string> = {
  teal:   "linear-gradient(to right, #00D4AA, transparent)",
  purple: "linear-gradient(to right, #8B5CF6, transparent)",
  stripe: "linear-gradient(to right, #635BFF, transparent)",
  gold:   "linear-gradient(to right, #FFD93D, transparent)",
  rose:   "linear-gradient(to right, #FF8B94, transparent)",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const billingConfig = trpc.billing.config.useQuery();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const founderSeats = billingConfig.data?.founderSeatsRemaining ?? null;

  return (
    <Layout>
      <div
        style={{
          background: "#0A0B14",
          minHeight: "100vh",
          color: "#E8EDF5",
          fontFamily: "DM Sans, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: `
              radial-gradient(ellipse 60% 40% at 20% 10%, rgba(0,212,170,0.05) 0%, transparent 60%),
              radial-gradient(ellipse 50% 35% at 80% 80%, rgba(139,92,246,0.04) 0%, transparent 60%)
            `,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 20px", position: "relative", zIndex: 1 }}>

          {/* ── Hero ── */}
          <div style={{ padding: "56px 0 64px", textAlign: "center" }}>
            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 16px",
                borderRadius: 100,
                background: "rgba(0,212,170,0.1)",
                border: "1px solid rgba(0,212,170,0.25)",
                color: "#00D4AA",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#00D4AA",
                  animation: "pulse 2s ease-in-out infinite",
                  display: "inline-block",
                }}
              />
              New Subscriber Journey
            </div>

            <h1
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "clamp(36px, 6vw, 54px)",
                fontWeight: 400,
                lineHeight: 1.15,
                marginBottom: 16,
                color: "#E8EDF5",
              }}
            >
              From{" "}
              <em style={{ fontStyle: "italic", color: "#00D4AA" }}>first click</em>
              <br />
              to your healing practice
            </h1>

            <p style={{ fontSize: 16, color: "#6B7A99", maxWidth: 520, margin: "0 auto 32px", lineHeight: 1.7 }}>
              A step-by-step walkthrough of the complete onboarding experience — from choosing a plan to landing on your personalized Journey tab.
            </p>

            {/* CTA row */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/join")}
                style={{
                  padding: "12px 28px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, rgba(0,212,170,0.2), rgba(0,212,170,0.08))",
                  border: "1px solid rgba(0,212,170,0.3)",
                  color: "#00D4AA",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                View Pricing Plans
              </button>
              {!isAuthenticated && (
                <button
                  onClick={() => startLogin()}
                  style={{
                    padding: "12px 28px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#6B7A99",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Founder seats */}
            {founderSeats !== null && founderSeats > 0 && (
              <p style={{ marginTop: 16, fontSize: 12, color: "#6B7A99" }}>
                <span style={{ color: "#FFD93D" }}>✦</span>{" "}
                {founderSeats} of 500 Founder Lifetime seats remaining
              </p>
            )}
          </div>

          {/* ── Steps ── */}
          <div style={{ paddingBottom: 80 }}>
            {STEPS.map((step, i) => {
              const isEven = i % 2 === 0;
              const tag = TAG_STYLES[step.tagColor];
              const circle = CIRCLE_STYLES[step.tagColor];
              const topBar = TOP_BAR_COLORS[step.tagColor];

              return (
                <div
                  key={step.num}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 72px 1fr",
                    gap: "0 20px",
                    marginBottom: 64,
                    alignItems: "start",
                  }}
                >
                  {/* Left content (odd steps) or spacer (even steps) */}
                  <div style={{ gridColumn: 1, paddingTop: 8, textAlign: isEven ? "right" : "left" }}>
                    {isEven && <StepContent step={step} tag={tag} topBar={topBar} />}
                  </div>

                  {/* Center node */}
                  <div style={{ gridColumn: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        position: "relative",
                        zIndex: 2,
                        ...circle,
                      }}
                    >
                      {step.icon}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#4A5568",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        marginTop: 8,
                      }}
                    >
                      {step.num}
                    </div>
                  </div>

                  {/* Right content (even steps) or spacer (odd steps) */}
                  <div style={{ gridColumn: 3, paddingTop: 8 }}>
                    {!isEven && <StepContent step={step} tag={tag} topBar={topBar} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Summary grid ── */}
          <div style={{ paddingBottom: 80 }}>
            <h2
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "clamp(28px, 4vw, 40px)",
                fontWeight: 400,
                textAlign: "center",
                color: "#E8EDF5",
                marginBottom: 8,
              }}
            >
              The complete{" "}
              <em style={{ fontStyle: "italic", color: "#00D4AA" }}>journey</em>{" "}
              at a glance
            </h2>
            <p style={{ textAlign: "center", color: "#6B7A99", fontSize: 15, marginBottom: 40 }}>
              Six seamless steps from first visit to first healing session
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {STEPS.map((step) => {
                const topBar = TOP_BAR_COLORS[step.tagColor];
                return (
                  <div
                    key={step.num}
                    style={{
                      background: "#11142A",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 16,
                      padding: "24px 20px",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Top color bar */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: topBar,
                      }}
                    />
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4A5568", marginBottom: 12 }}>
                      Step {step.num}
                    </div>
                    <div style={{ fontSize: 24, marginBottom: 10 }}>{step.icon}</div>
                    <h4
                      style={{
                        fontFamily: "Cormorant Garamond, serif",
                        fontSize: 17,
                        fontWeight: 500,
                        color: "#E8EDF5",
                        marginBottom: 6,
                      }}
                    >
                      {step.title}
                    </h4>
                    <p style={{ fontSize: 12, color: "#6B7A99", lineHeight: 1.6 }}>{step.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Final CTA ── */}
          <div
            style={{
              textAlign: "center",
              padding: "48px 0 80px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <h3
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: 28,
                fontWeight: 400,
                color: "#E8EDF5",
                marginBottom: 8,
              }}
            >
              Ready to begin?
            </h3>
            <p style={{ color: "#6B7A99", fontSize: 14, marginBottom: 24 }}>
              Join thousands of practitioners using healing frequencies daily.
            </p>
            <button
              onClick={() => navigate("/join")}
              style={{
                padding: "14px 36px",
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(0,212,170,0.25), rgba(0,212,170,0.1))",
                border: "1px solid rgba(0,212,170,0.35)",
                color: "#00D4AA",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
                letterSpacing: "0.02em",
              }}
            >
              View Plans & Subscribe
            </button>
          </div>

        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.7); }
          }
          @media (max-width: 600px) {
            .onboarding-step { display: flex !important; flex-direction: row !important; gap: 16px !important; }
          }
        `}</style>
      </div>
    </Layout>
  );
}

// ── Sub-component: step content card ─────────────────────────────────────────

function StepContent({
  step,
  tag,
  topBar,
}: {
  step: (typeof STEPS)[0];
  tag: { color: string; bg: string };
  topBar: string;
}) {
  return (
    <div>
      {/* Tag */}
      <span
        style={{
          display: "inline-block",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          padding: "3px 12px",
          borderRadius: 100,
          color: tag.color,
          background: tag.bg,
          marginBottom: 10,
        }}
      >
        {step.tag}
      </span>

      {/* Title */}
      <h3
        style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: 22,
          fontWeight: 500,
          color: "#E8EDF5",
          marginBottom: 8,
          lineHeight: 1.3,
        }}
      >
        {step.title}
      </h3>

      {/* Body */}
      <p style={{ fontSize: 14, color: "#6B7A99", lineHeight: 1.7, marginBottom: 12 }}>
        {step.body}
      </p>

      {/* Detail card */}
      <div
        style={{
          background: "#11142A",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          padding: "12px 14px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: topBar,
          }}
        />
        <p style={{ fontSize: 12, color: "#6B7A99", lineHeight: 1.6, margin: 0 }}>
          {step.detail}
        </p>
      </div>
    </div>
  );
}
