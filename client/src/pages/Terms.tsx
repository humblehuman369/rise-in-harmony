/**
 * Terms — Rise In Harmony Terms of Service
 * Covers usage, subscriptions, intellectual property, disclaimers, and governing law
 * Bioluminescent Depth theme — mirrors Privacy Policy layout
 */
import { useLocation } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";
import Layout from "@/components/Layout";

const LAST_UPDATED = "June 29, 2026";
const CONTACT_EMAIL = "legal@riseinharmony.com";
const APP_NAME = "Rise In Harmony";

interface Section {
  title: string;
  content: string[];
}

const SECTIONS: Section[] = [
  {
    title: "1. Acceptance of Terms",
    content: [
      `By accessing or using ${APP_NAME} (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.`,
      "These Terms apply to all visitors, registered users, and subscribers. We reserve the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the revised Terms.",
      "If you are using the Service on behalf of an organisation, you represent that you have authority to bind that organisation to these Terms.",
    ],
  },
  {
    title: "2. Description of Service",
    content: [
      `${APP_NAME} is a wellness application that provides healing frequency audio, guided meditation sessions, a healing alarm clock, sound studio tools, and related wellness content (collectively, the "Service").`,
      "**Free tier.** Unregistered and registered free-tier users may access a limited set of frequencies and features as described on the pricing page.",
      "**Premium subscription.** Subscribers gain access to the full library of Solfeggio frequencies, binaural beats, unlimited alarms, advanced Sound Studio presets, and priority feature access. Subscription details, pricing, and billing cycles are presented at the time of purchase.",
      "We reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice.",
    ],
  },
  {
    title: "3. User Accounts",
    content: [
      "To access personalised features (session history, dashboard, alarms, and journal), you must create an account via Manus OAuth. You are responsible for maintaining the confidentiality of your account credentials.",
      "You agree to provide accurate information when creating your account and to keep it up to date. You are responsible for all activity that occurs under your account.",
      "You must be at least 13 years of age to create an account. If we discover that an account belongs to a person under 13, we will delete it promptly.",
      "You may not share your account with others or create multiple accounts to circumvent access restrictions.",
    ],
  },
  {
    title: "4. Subscriptions and Billing",
    content: [
      "**Subscription plans.** Premium subscriptions are offered on a monthly or annual basis. Current pricing is displayed on the upgrade screen within the app.",
      "**Billing.** Subscriptions are billed in advance. By subscribing, you authorise us to charge your payment method on a recurring basis until you cancel.",
      "**Cancellation.** You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. You will retain access to Premium features until that date.",
      "**Refunds.** We offer a 7-day refund on your first subscription payment if you are not satisfied. After 7 days, payments are non-refundable except where required by applicable law. To request a refund, contact " + CONTACT_EMAIL + " within 7 days of your purchase.",
      "**Price changes.** We may change subscription prices with 30 days' notice. Continued use of the Service after a price change constitutes acceptance of the new pricing.",
      "**Free trials.** If a free trial is offered, it will be clearly described at sign-up. Your payment method will be charged at the end of the trial unless you cancel before the trial period ends.",
    ],
  },
  {
    title: "5. Acceptable Use",
    content: [
      "You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:",
      "**Misuse the Service.** Attempt to reverse-engineer, decompile, or extract the source code of the Service; scrape or harvest data from the Service; or use automated tools to access the Service in a manner that places excessive load on our infrastructure.",
      "**Circumvent access controls.** Share Premium account credentials, use VPNs or proxies to circumvent geographic restrictions, or exploit free trials repeatedly.",
      "**Upload harmful content.** If the Service allows user-generated content (such as journal notes), you agree not to upload content that is illegal, defamatory, harassing, or infringes third-party rights.",
      "**Impersonate others.** Misrepresent your identity or affiliation with any person or organisation.",
      "We reserve the right to suspend or terminate accounts that violate these rules without refund.",
    ],
  },
  {
    title: "6. Intellectual Property",
    content: [
      `All content provided through the Service — including healing frequency audio, guided meditation recordings, visual designs, the ${APP_NAME} name and logo, and written content — is owned by or licensed to ${APP_NAME} and is protected by copyright, trademark, and other intellectual property laws.`,
      "**Your licence.** We grant you a limited, non-exclusive, non-transferable, revocable licence to access and use the Service for your personal, non-commercial wellness purposes.",
      "**Restrictions.** You may not copy, distribute, publicly perform, create derivative works from, or commercially exploit any content from the Service without our prior written consent.",
      "**User content.** Journal notes and other content you create within the Service remain yours. By storing them in the Service, you grant us a limited licence to store and display that content to you.",
    ],
  },
  {
    title: "7. Health and Wellness Disclaimer",
    content: [
      `**${APP_NAME} is not a medical device and does not provide medical advice.** The healing frequencies, binaural beats, and guided meditations offered through the Service are intended for general wellness and relaxation purposes only.`,
      "The Service is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified healthcare provider with any questions you may have regarding a medical condition.",
      "Do not use the Service while driving, operating heavy machinery, or in any situation where reduced alertness could cause harm. Some users may experience dizziness or disorientation from binaural beats; discontinue use if this occurs.",
      "If you have epilepsy, a history of seizures, or a psychiatric condition, consult your doctor before using binaural beats or other frequency-based audio.",
    ],
  },
  {
    title: "8. Limitation of Liability",
    content: [
      `To the maximum extent permitted by applicable law, ${APP_NAME} and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service.`,
      "Our total liability to you for any claim arising from these Terms or the Service shall not exceed the amount you paid us in the 12 months preceding the claim, or $50 USD, whichever is greater.",
      "Some jurisdictions do not allow the exclusion or limitation of certain damages. In such jurisdictions, our liability is limited to the greatest extent permitted by law.",
      "The Service is provided \"as is\" and \"as available\" without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.",
    ],
  },
  {
    title: "9. Indemnification",
    content: [
      `You agree to indemnify, defend, and hold harmless ${APP_NAME} and its operators, employees, and agents from any claims, damages, losses, liabilities, and expenses (including reasonable legal fees) arising from: (a) your use of the Service; (b) your violation of these Terms; or (c) your violation of any third-party rights.`,
    ],
  },
  {
    title: "10. Third-Party Services",
    content: [
      "The Service integrates with third-party services including Manus OAuth (authentication), Resend (email), PostHog (analytics), and RevenueCat (subscription management). Your use of these services is governed by their respective terms and privacy policies.",
      "We are not responsible for the availability, accuracy, or practices of third-party services. Links to third-party websites within the Service are provided for convenience only.",
    ],
  },
  {
    title: "11. Termination",
    content: [
      "We may suspend or terminate your access to the Service at any time, with or without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.",
      "You may terminate your account at any time by contacting us at " + CONTACT_EMAIL + ". Upon termination, your right to use the Service ceases immediately. We may retain anonymised data derived from your usage.",
      "Provisions of these Terms that by their nature should survive termination — including intellectual property, disclaimer, limitation of liability, and indemnification — shall survive.",
    ],
  },
  {
    title: "12. Governing Law and Disputes",
    content: [
      "These Terms are governed by the laws of the State of California, United States, without regard to conflict of law principles.",
      "Any dispute arising from these Terms or the Service shall first be addressed through good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration under the rules of the American Arbitration Association, conducted in English.",
      "You waive any right to participate in a class action lawsuit or class-wide arbitration.",
      "Notwithstanding the above, either party may seek injunctive or other equitable relief in a court of competent jurisdiction to prevent irreparable harm.",
    ],
  },
  {
    title: "13. Changes to These Terms",
    content: [
      "We may update these Terms from time to time. When we do, we will update the \"Last updated\" date at the top of this page. For material changes, we will send an email notification to registered users at least 14 days before the changes take effect.",
      "Your continued use of the Service after the effective date of updated Terms constitutes your acceptance of those Terms.",
    ],
  },
  {
    title: "14. Contact",
    content: [
      "For questions about these Terms, contact us at: " + CONTACT_EMAIL,
      `${APP_NAME} is operated independently. We aim to respond to all legal inquiries within 5 business days.`,
    ],
  },
];

export default function Terms() {
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
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <FileText size={18} style={{ color: '#8B5CF6' }} />
            </div>
            <h1 style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '2rem',
              fontWeight: 600,
              color: '#E8EDF5',
            }}>
              Terms of Service
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
              These Terms of Service govern your use of {APP_NAME}. Please read them carefully before using the
              Service. By accessing or using {APP_NAME}, you agree to be bound by these Terms. If you have
              questions, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#8B5CF6' }}>{CONTACT_EMAIL}</a>.
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
