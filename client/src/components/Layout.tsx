/**
 * Layout — Bioluminescent Depth Theme
 * Persistent dark sidebar on desktop, bottom tab bar on mobile
 * Navigation: Home, Player, Alarm, Library, Dashboard
 */
import { Link, useLocation } from "wouter";
import { Home, Music2, AlarmClock, BookOpen, BarChart3, Settings, Layers, Headphones, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/player", icon: Music2, label: "Player" },
  { href: "/studio", icon: Layers, label: "Studio" },
  { href: "/meditation", icon: Headphones, label: "Meditate" },
  { href: "/alarm", icon: AlarmClock, label: "Alarm" },
  { href: "/library", icon: BookOpen, label: "Library" },
  { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { href: "/precision", icon: Activity, label: "Precision" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen" style={{ background: '#0A0B14' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-40"
        style={{
          background: '#11142A',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="relative w-9 h-9 flex-shrink-0">
            <img
              src="/manus-storage/rih-logo-icon_0fedc44f.png"
              alt="Rise In Harmony"
              className="w-9 h-9 object-contain"
            />
          </div>
          <div>
            <div className="font-display text-base font-semibold leading-tight" style={{ color: '#E8EDF5', fontFamily: 'Cormorant Garamond, serif' }}>
              Rise In Harmony
            </div>
            <div className="text-xs" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
              Healing Frequencies
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 mb-4" style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = location === href;
            return (
              <Link key={href} href={href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                  active
                    ? "text-[#0A0B14]"
                    : "text-[#6B7A99] hover:text-[#E8EDF5]"
                )}
                  style={active ? {
                    background: 'linear-gradient(135deg, #00D4AA, #00B894)',
                    boxShadow: '0 0 20px rgba(0,212,170,0.3)',
                  } : {
                    background: 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                  <span className="text-sm font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom settings */}
        <div className="px-3 pb-6">
          <div className="mx-3 mb-4" style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          <button
            onClick={() => toast("Settings coming in Phase 2 — stay tuned!")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full transition-all duration-200"
            style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = '#E8EDF5'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7A99'; }}
          >
            <Settings size={18} strokeWidth={1.8} />
            <span className="text-sm font-medium">Settings</span>
          </button>

          {/* Legal links */}
          <div className="flex flex-wrap gap-x-1 px-3 mt-1">
            <Link href="/about">
              <span className="text-xs transition-colors duration-200 cursor-pointer"
                style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#6B7A99'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4A5568'; }}
              >About</span>
            </Link>
            <span className="text-xs" style={{ color: '#2A3040' }}>·</span>
            <Link href="/privacy">
              <span className="text-xs transition-colors duration-200 cursor-pointer"
                style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#6B7A99'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4A5568'; }}
              >Privacy</span>
            </Link>
            <span className="text-xs" style={{ color: '#2A3040' }}>·</span>
            <Link href="/terms">
              <span className="text-xs transition-colors duration-200 cursor-pointer"
                style={{ color: '#4A5568', fontFamily: 'DM Sans, sans-serif' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#6B7A99'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4A5568'; }}
              >Terms</span>
            </Link>
          </div>

          {/* Premium badge */}
          <div className="mt-4 mx-1 p-3 rounded-xl" style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(0,212,170,0.08))',
            border: '1px solid rgba(139,92,246,0.2)',
          }}>
            <div className="text-xs font-semibold mb-1" style={{ color: '#8B5CF6', fontFamily: 'DM Sans, sans-serif' }}>✦ Rise Premium</div>
            <div className="text-xs leading-relaxed" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
              Unlock 12+ healing frequencies & unlimited alarms
            </div>
            <button
              onClick={() => toast("Premium subscription — coming soon!")}
              className="mt-2 w-full text-xs font-semibold py-1.5 rounded-lg transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                color: '#fff',
              }}
            >
              Upgrade — $7.99/mo
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around"
        style={{
          background: 'rgba(13, 15, 30, 0.97)',
          backdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = location === href;
          return (
            <Link key={href} href={href}>
              <div
                className="relative flex flex-col items-center gap-0.5 px-2 py-3 transition-all duration-200"
                style={{ minWidth: '52px' }}
              >
                {/* Active top indicator */}
                {active && (
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                    style={{
                      width: '24px',
                      height: '2px',
                      background: 'linear-gradient(90deg, #00D4AA, #8B5CF6)',
                      boxShadow: '0 0 8px rgba(0,212,170,0.6)',
                    }}
                  />
                )}
                {/* Icon with glow when active */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={active ? {
                    background: 'rgba(0,212,170,0.12)',
                    boxShadow: '0 0 12px rgba(0,212,170,0.2)',
                  } : {}}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.5 : 1.8}
                    style={{ color: active ? '#00D4AA' : '#6B7A99' }}
                  />
                </div>
                <span
                  className="text-[9px] font-semibold"
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    color: active ? '#00D4AA' : '#4A5568',
                    letterSpacing: '0.03em',
                  }}
                >
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
