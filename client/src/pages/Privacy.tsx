/**
 * Privacy — Rise In Harmony Privacy Policy
 * Covers data collection, usage, storage, third-party services, and user rights
 * Bioluminescent Depth theme
 */
import { useLocation } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";
import Layout from "@/components/Layout";

const LAST_UPDATED = "July 14, 2026";
const CONTACT_EMAIL = "privacy@riseinharmony.com";

interface Section {
  title: string;
  content: string[];
}

const SECTIONS: Section[] = [
  {
    title: "1. Information We Collect",
    content: [
      "**Account information.** When you sign in via Manus OAuth we receive your name and email address. We store these to identify your account and send you transactional emails.",
      "**Session data.** Each healing session you start is recorded: the frequency played, session type (single, chakra sequence, studio mix, or sleep timer), duration in seconds, optional mood rating (1–5), and an optional journal note. This data powers your Dashboard analytics and streak tracking.",
      "**Studio presets.** Custom Sound Studio configurations you save are stored server-side and associated with your account.",
      "**Alarm settings.** Healing alarms you create are stored server-side so they persist across devices.",
      "**Usage analytics.** If you have consented to analytics, we collect anonymised product events (e.g. session started, paywall shown) via PostHog. No personally identifiable information is included in these events.",
      "**Device and browser data.** Standard server logs include IP address, user-agent string, and request timestamps. These are retained for up to 30 days for security and debugging purposes.",
    ],
  },
  {
    title: "2. How We Use Your Information",
    content: [
      "**To provide the service.** Session data, presets, and alarms are used exclusively to deliver the features you expect: your Dashboard, streak calendar, Chakra Map, and alarm scheduler.",
      "**Transactional emails.** We use your email address to send: a welcome email on first login, streak milestone celebrations (7-day and 30-day), re-engagement nudges after 7 days of inactivity, and subscription receipts or trial-ending notices if you subscribe to Premium.",
      "**Product improvement.** Anonymised analytics events help us understand which features are most valuable and where users encounter friction.",
      "**Security.** Server logs are used to detect abuse, investigate incidents, and maintain the integrity of the service.",
      "We do not sell, rent, or share your personal information with third parties for their own marketing purposes.",
    ],
  },
  {
    title: "3. Third-Party Services",
    content: [
      "**Manus OAuth.** Authentication is handled by Manus. When you log in, Manus shares your name, email, and a unique identifier with us. Manus's privacy policy governs their handling of your data.",
      "**Resend.** Transactional emails are sent via Resend (resend.com). Your email address is transmitted to Resend solely for the purpose of delivering emails you have requested or that are necessary for the service. Resend does not use your data for advertising.",
      "**PostHog.** If analytics are enabled, product events are sent to PostHog (posthog.com). PostHog is configured with `autocapture: false` — only explicitly coded events are sent.",
      "**RevenueCat.** Mobile Premium subscriptions are managed by RevenueCat (revenuecat.com). RevenueCat receives a pseudonymous user identifier and subscription status; it does not receive your name or email from us.",
      "**Stripe.** Web Premium and Founder Lifetime purchases are processed by Stripe (stripe.com). Stripe receives the payment details you enter at checkout and billing metadata needed to fulfill the purchase. Stripe's privacy policy governs payment data.",
    ],
  },
  {
    title: "4. Data Storage and Security",
    content: [
      "Your data is stored in a MySQL-compatible database hosted on a secure cloud provider. All connections are encrypted in transit using TLS 1.2 or higher.",
      "Session cookies are signed with a secret key and are HttpOnly, meaning they cannot be accessed by JavaScript on the page. In production they use the Secure and SameSite=Lax flags.",
      "We retain your account and session data for as long as your account is active. If you delete your account in Settings (or request deletion), we remove your personal data from our systems; related billing may retain records as required by law or payment processors.",
      "No system is perfectly secure. If you discover a security vulnerability, please report it to " + CONTACT_EMAIL + " and we will respond within 72 hours.",
    ],
  },
  {
    title: "5. Your Rights",
    content: [
      "**Access.** You may download a copy of your data from Settings → Export, or email us for assistance.",
      "**Correction.** You may update your display name in Settings, or ask us to correct inaccurate information.",
      "**Deletion.** You may delete your account in Settings (confirm with the phrase DELETE MY ACCOUNT). This cancels active web subscriptions where possible, revokes promotional mobile entitlements, and removes your account data. Anonymised analytics events cannot always be deleted.",
      "**Opt-out of emails.** Contact us at " + CONTACT_EMAIL + " to stop non-essential transactional emails.",
      "**Data portability.** Settings → Export returns your profile, sessions, alarms, presets, favorites, and subscription event history as JSON.",
      "To exercise any of these rights offline, email " + CONTACT_EMAIL + " with the subject line \"Privacy Request\" and your registered email address.",
    ],
  },
  {
    title: "6. Cookies and Local Storage",
    content: [
      "**Session cookie.** A single HttpOnly cookie (`app_session_id`) is set on login to maintain your authenticated session. It expires after 7 days of validity (or when you log out) and is renewed when you sign in again.",
      "**localStorage / device storage.** The app may store journal entries, alarm settings, onboarding state, and studio presets locally for offline access. When you are logged in, corresponding data may also be synced to our servers.",
      "We do not use third-party advertising cookies.",
    ],
  },
  {
    title: "7. Children's Privacy",
    content: [
      "Rise In Harmony is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us at " + CONTACT_EMAIL + " and we will delete it promptly.",
    ],
  },
  {
    title: "8. Changes to This Policy",
    content: [
      "We may update this Privacy Policy from time to time. When we do, we will update the \"Last updated\" date at the top of this page and, for material changes, send an email notification to registered users.",
      "Your continued use of Rise In Harmony after a policy update constitutes your acceptance of the revised policy.",
    ],
  },
  {
    title: "9. Contact",
    content: [
      "For privacy-related questions, requests, or concerns, contact us at: " + CONTACT_EMAIL,
      "Rise In Harmony is operated independently. We aim to respond to all privacy inquiries within 5 business days.",
    ],
  },
];

export default function Privacy() {
  const [, navigate] = useLocation();

  return (
    <Layout>
      <div className="min-h-screen" style={{ background: '#0A0B14' }}>
        {/* Header */}
        <div className="px-6 pt-8 pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm mb-6 transition-colors duration-200"
            style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#8FA3BF'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B7A99'; }}
          >
            <ArrowLeft size={14} />
            Back to Rise In Harmony
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)' }}>
              <Shield size={18} style={{ color: '#00D4AA' }} />
            </div>
            <h1 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '2rem',
              fontWeight: 600,
              color: '#E8EDF5',
            }}>
              Privacy Policy
            </h1>
          </div>
          <p className="text-sm" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        {/* Intro */}
        <div className="px-6 py-8 max-w-3xl">
          <div className="glow-card p-6 mb-8">
            <p className="text-sm leading-relaxed" style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}>
              Rise In Harmony is a healing frequency and wellness app. This Privacy Policy explains what personal
              information we collect, how we use it, and what rights you have over your data. We have written this
              policy in plain language — if anything is unclear, please contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#00D4AA' }}>{CONTACT_EMAIL}</a>.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-8">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="text-base font-semibold mb-4" style={{
                  color: '#E8EDF5',
                  fontFamily: 'DM Sans, sans-serif',
                }}>
                  {section.title}
                </h2>
                <div className="space-y-3">
                  {section.content.map((paragraph, i) => (
                    <p key={i} className="text-sm leading-relaxed"
                      style={{ color: '#8FA3BF', fontFamily: 'DM Sans, sans-serif' }}
                      dangerouslySetInnerHTML={{
                        __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#C8D5E8">$1</strong>'),
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="mt-12 pt-8 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-xs text-center" style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}>
              © 2026 Rise In Harmony · Begin every morning in resonance.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
