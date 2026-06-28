/**
 * Layout — Bioluminescent Depth Theme
 * Persistent dark sidebar on desktop, bottom tab bar on mobile
 * Navigation: Home, Player, Alarm, Library, Dashboard
 */
import { Link, useLocation } from "wouter";
import { Home, Music2, AlarmClock, BookOpen, BarChart3, Settings, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/player", icon: Music2, label: "Player" },
  { href: "/studio", icon: Layers, label: "Studio" },
  { href: "/alarm", icon: AlarmClock, label: "Alarm" },
  { href: "/library", icon: BookOpen, label: "Library" },
  { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
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
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around px-2 py-2"
        style={{
          background: 'rgba(17, 20, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = location === href;
          return (
            <Link key={href} href={href}>
              <div className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200"
                style={active ? { color: '#00D4AA' } : { color: '#6B7A99' }}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
