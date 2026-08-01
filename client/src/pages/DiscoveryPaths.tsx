import { useEffect } from "react";
import { Link } from "wouter";
import Layout from "../components/Layout";

const VIDEO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/zEfhQrVqqYOqJSPS.mp4";
const POSTER_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/TtbNGYlpCBuPzRzQ.png";

const PATHS = [
  {
    number: "01",
    color: "#F59E0B",
    stage: "Awareness",
    title: "Home Page Feature Card",
    description:
      "A new visitor lands on the Home page and immediately sees the full-width Deep Sleep Wake feature card. It communicates scientific credibility before they even sign up.",
    icon: "👁",
    href: "/",
  },
  {
    number: "02",
    color: "#8B5CF6",
    stage: "Consideration",
    title: "Alarm Page Banner",
    description:
      "A returning user opens the Alarm page to manage their schedule. A prominent purple banner below the stats strip intercepts them at peak intent.",
    icon: "💡",
    href: "/alarm",
  },
  {
    number: "03",
    color: "#00D4AA",
    stage: "Engagement",
    title: "Desktop Sidebar",
    description:
      "Power users navigating the sidebar see the persistent 'δ→θ→α Deep Sleep Wake' sub-item under Alarm — a constant reminder to explore the science.",
    icon: "☰",
    href: "/alarm",
  },
  {
    number: "04",
    color: "#EF4444",
    stage: "Conversion",
    title: "All Features Page",
    description:
      "Pre-purchase users reading the All Features page find a direct '▶ Watch the video' button at the highest-consideration moment in their decision journey.",
    icon: "✓",
    href: "/alarm-features",
  },
];

export default function DiscoveryPaths() {
  useEffect(() => {
    document.title = "Four Paths. One Destination. — Rise In Harmony";
  }, []);

  return (
    <Layout>
      <div
        style={{
          minHeight: "100vh",
          background: "#0A0B14",
          color: "#E8EDF5",
          fontFamily: "'DM Sans', sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background ambient glows */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(139,92,246,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(0,212,170,0.06) 0%, transparent 60%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* ── Hero ── */}
          <section
            style={{
              textAlign: "center",
              padding: "80px 24px 60px",
              maxWidth: 800,
              margin: "0 auto",
            }}
          >
            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 18px",
                border: "1px solid rgba(139,92,246,0.35)",
                background: "rgba(139,92,246,0.1)",
                marginBottom: 32,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#8B5CF6",
                  boxShadow: "0 0 8px rgba(139,92,246,0.8)",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: "#8B5CF6",
                }}
              >
                Feature Discovery Strategy
              </span>
            </div>

            {/* Title */}
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(48px, 8vw, 80px)",
                fontWeight: 700,
                lineHeight: 1.05,
                color: "#fff",
                margin: "0 0 12px",
                textShadow: "0 0 60px rgba(139,92,246,0.3)",
              }}
            >
              Four paths.
              <br />
              <span style={{ color: "#00D4AA" }}>One destination.</span>
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontSize: 22,
                color: "#8FA3BF",
                lineHeight: 1.6,
                margin: "20px 0 48px",
              }}
            >
              A feature is only as valuable as the number of users who discover
              it. We built four deliberate paths to intercept users at the exact
              right moment — wherever they are in their journey.
            </p>

            {/* Phase pills */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {["Awareness", "Consideration", "Engagement", "Conversion"].map(
                (stage, i) => {
                  const colors = ["#F59E0B", "#8B5CF6", "#00D4AA", "#EF4444"];
                  return (
                    <span
                      key={stage}
                      style={{
                        padding: "6px 16px",
                        border: `1px solid ${colors[i]}55`,
                        background: `${colors[i]}15`,
                        color: colors[i],
                        fontSize: 13,
                        fontWeight: 600,
                        letterSpacing: "0.5px",
                      }}
                    >
                      {stage}
                    </span>
                  );
                }
              )}
            </div>
          </section>

          {/* ── Video Player ── */}
          <section style={{ padding: "0 24px 80px", maxWidth: 1000, margin: "0 auto" }}>
            <div
              style={{
                position: "relative",
                border: "1px solid rgba(139,92,246,0.3)",
                boxShadow:
                  "0 0 60px rgba(139,92,246,0.12), 0 0 120px rgba(0,212,170,0.06)",
                background: "#000",
              }}
            >
              {/* Corner accents */}
              {["topLeft", "topRight", "bottomLeft", "bottomRight"].map((pos) => {
                const isTop = pos.startsWith("top");
                const isLeft = pos.endsWith("Left");
                return (
                  <div
                    key={pos}
                    style={{
                      position: "absolute",
                      width: 20,
                      height: 20,
                      borderTop: isTop ? "2px solid #8B5CF6" : "none",
                      borderBottom: !isTop ? "2px solid #8B5CF6" : "none",
                      borderLeft: isLeft ? "2px solid #8B5CF6" : "none",
                      borderRight: !isLeft ? "2px solid #8B5CF6" : "none",
                      top: isTop ? -1 : "auto",
                      bottom: !isTop ? -1 : "auto",
                      left: isLeft ? -1 : "auto",
                      right: !isLeft ? -1 : "auto",
                      zIndex: 2,
                    }}
                  />
                );
              })}

              <video
                controls
                autoPlay
                muted
                loop
                playsInline
                poster={POSTER_URL}
                style={{ width: "100%", display: "block" }}
              >
                <source src={VIDEO_URL} type="video/mp4" />
              </video>
            </div>

            {/* Caption */}
            <p
              style={{
                textAlign: "center",
                marginTop: 20,
                fontSize: 14,
                color: "#8FA3BF",
                letterSpacing: "0.5px",
              }}
            >
              Navigation demo — user journey through all four discovery paths to
              the Deep Sleep Wake Sequence page
            </p>
          </section>

          {/* ── Four Paths Grid ── */}
          <section
            style={{
              padding: "0 24px 80px",
              maxWidth: 1100,
              margin: "0 auto",
            }}
          >
            {/* Section header */}
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 14px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: "#8FA3BF",
                  marginBottom: 20,
                }}
              >
                Four Discovery Paths
              </div>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 48,
                  fontWeight: 700,
                  color: "#fff",
                  margin: 0,
                }}
              >
                Every user. Every moment.
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 24,
              }}
            >
              {PATHS.map((path) => (
                <Link key={path.number} href={path.href}>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${path.color}30`,
                      borderTop: `3px solid ${path.color}`,
                      padding: "28px 24px",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                    }}
                  >
                    {/* Icon + Stage */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 16,
                      }}
                    >
                      <span style={{ fontSize: 28 }}>{path.icon}</span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "2px",
                          textTransform: "uppercase",
                          color: path.color,
                        }}
                      >
                        {path.stage}
                      </span>
                    </div>

                    {/* Number + Title */}
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#8FA3BF",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      Path {path.number}
                    </div>
                    <h3
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 26,
                        fontWeight: 700,
                        color: "#fff",
                        margin: "0 0 14px",
                        lineHeight: 1.2,
                      }}
                    >
                      {path.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 15,
                        color: "#8FA3BF",
                        lineHeight: 1.6,
                        margin: 0,
                      }}
                    >
                      {path.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ── Journey Map ── */}
          <section
            style={{
              padding: "0 24px 80px",
              maxWidth: 900,
              margin: "0 auto",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 48,
                fontWeight: 700,
                color: "#fff",
                margin: "0 0 16px",
              }}
            >
              The user journey map
            </h2>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontSize: 20,
                color: "#8FA3BF",
                margin: "0 0 48px",
                lineHeight: 1.6,
              }}
            >
              "No matter where a user is in their relationship with Rise In
              Harmony, there is a clear, contextually appropriate path to
              discovery."
            </p>

            {/* Flow diagram */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0,
                flexWrap: "wrap",
              }}
            >
              {[
                { label: "New Visitor", sub: "Home Page", color: "#F59E0B" },
                { label: "Returning User", sub: "Alarm Page", color: "#8B5CF6" },
                { label: "Power User", sub: "Sidebar", color: "#00D4AA" },
                { label: "Pre-Purchase", sub: "All Features", color: "#EF4444" },
              ].map((step, i) => (
                <div
                  key={step.label}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <div
                    style={{
                      textAlign: "center",
                      padding: "20px 16px",
                      minWidth: 120,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        border: `2px solid ${step.color}`,
                        background: `${step.color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 12px",
                        fontSize: 18,
                        fontWeight: 700,
                        color: step.color,
                        boxShadow: `0 0 20px ${step.color}30`,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#E8EDF5",
                        marginBottom: 4,
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      style={{ fontSize: 12, color: step.color }}
                    >
                      {step.sub}
                    </div>
                  </div>
                  {i < 3 && (
                    <div
                      style={{
                        width: 32,
                        height: 2,
                        background:
                          "linear-gradient(to right, rgba(255,255,255,0.2), rgba(255,255,255,0.05))",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Destination */}
            <div
              style={{
                marginTop: 40,
                padding: "28px 40px",
                border: "1px solid rgba(0,212,170,0.3)",
                background: "rgba(0,212,170,0.05)",
                boxShadow: "0 0 40px rgba(0,212,170,0.08)",
                display: "inline-block",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: "#00D4AA",
                  marginBottom: 10,
                }}
              >
                One Destination
              </div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Deep Sleep Wake Sequence
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: "#8FA3BF",
                  marginTop: 8,
                }}
              >
                δ Delta · 3Hz → θ Theta · 6Hz → α Alpha · 10Hz
              </div>
            </div>
          </section>

          {/* ── CTA ── */}
          <section
            style={{
              padding: "0 24px 100px",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 48,
                fontWeight: 700,
                color: "#fff",
                margin: "0 0 16px",
              }}
            >
              Ready to experience it?
            </h2>
            <p
              style={{
                fontSize: 18,
                color: "#8FA3BF",
                margin: "0 0 40px",
              }}
            >
              Set your first brain-guided healing alarm tonight.
            </p>
            <div
              style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}
            >
              <Link href="/alarm">
                <button
                  style={{
                    padding: "14px 32px",
                    background: "#00D4AA",
                    color: "#0A0B14",
                    border: "none",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                    letterSpacing: "0.5px",
                  }}
                >
                  Set Your Healing Alarm →
                </button>
              </Link>
              <Link href="/deep-sleep-wake">
                <button
                  style={{
                    padding: "14px 32px",
                    background: "transparent",
                    color: "#E8EDF5",
                    border: "1px solid rgba(255,255,255,0.2)",
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Watch the Video
                </button>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
