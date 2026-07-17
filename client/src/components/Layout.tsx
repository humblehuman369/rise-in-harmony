/**
 * Layout — Bioluminescent Depth (Dark) / Morning Mist (Light) Theme
 * Persistent sidebar on desktop, horizontally scrollable bottom tab bar on mobile
 * Theme toggle (sun/moon) in sidebar bottom and mobile nav
 */
import { useRef, useCallback, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Home, Music2, AlarmClock, BookOpen, BarChart3, Settings,
  Layers, Headphones, ShieldCheck, LogIn, LogOut, User,
  GraduationCap, Sun, Moon, CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";

// ─── Nav definitions ──────────────────────────────────────────────────────────

const mobileNavItems = [
  { href: "/alarm", icon: AlarmClock, label: "Alarm" },
  { href: "/player", icon: Music2, label: "Player" },
  { href: "/meditation", icon: Headphones, label: "Meditate" },
  { href: "/studio", icon: Layers, label: "Studio" },
  { href: "/library", icon: BookOpen, label: "Library" },
  { href: "/programs", icon: CalendarRange, label: "Programs" },
  { href: "/learn", icon: GraduationCap, label: "Learn" },
  { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { href: "/", icon: Home, label: "Home" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

const adminNavItem = { href: "/admin", icon: ShieldCheck, label: "Admin" };

const baseNavItems = [
  { href: "/alarm", icon: AlarmClock, label: "Alarm" },
  { href: "/player", icon: Music2, label: "Player" },
  { href: "/meditation", icon: Headphones, label: "Meditate" },
  { href: "/studio", icon: Layers, label: "Studio" },
  { href: "/library", icon: BookOpen, label: "Library" },
  { href: "/programs", icon: CalendarRange, label: "Programs" },
  { href: "/learn", icon: GraduationCap, label: "Learn" },
  { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { href: "/", icon: Home, label: "Home" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeftFade(scrollLeft > 8);
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 8);
  }, []);

  const navItems = user?.role === "admin" ? [...baseNavItems, adminNavItem] : baseNavItems;
  const allMobileItems = user?.role === "admin"
    ? [...mobileNavItems, adminNavItem]
    : mobileNavItems;

  // ── Color tokens derived from theme ─────────────────────────────────────────
  const c = isLight ? {
    sidebarBg: '#EDF0F7',
    sidebarBorder: 'rgba(0,0,0,0.07)',
    mainBg: '#F5F6F9',
    divider: 'rgba(0,0,0,0.07)',
    logoTitle: '#1A1D2E',
    logoSub: '#6B7A99',
    navInactive: '#6B7A99',
    navInactiveHover: '#1A1D2E',
    navHoverBg: 'rgba(0,0,0,0.04)',
    legalLink: '#9AA3B5',
    legalLinkHover: '#6B7A99',
    legalDot: '#C5CAD6',
    userCardBg: 'rgba(0,0,0,0.04)',
    userCardBorder: 'rgba(0,0,0,0.07)',
    userName: '#1A1D2E',
    userEmail: '#6B7A99',
    signOutColor: '#6B7A99',
    signOutHoverBg: 'rgba(0,0,0,0.05)',
    signOutHoverColor: '#1A1D2E',
    mobileNavBg: 'rgba(237,240,247,0.98)',
    mobileNavBorder: 'rgba(0,0,0,0.08)',
    mobileNavShadow: '0 -4px 24px rgba(0,0,0,0.08)',
    mobileFadeLeft: 'linear-gradient(to right, rgba(237,240,247,0.95) 0%, transparent 100%)',
    mobileFadeRight: 'linear-gradient(to left, rgba(237,240,247,0.95) 0%, transparent 100%)',
    mobileIconInactive: '#6B7A99',
    mobileLabelInactive: '#9AA3B5',
    mobileLabelActive: '#007A62',
  } : {
    sidebarBg: '#11142A',
    sidebarBorder: 'rgba(255,255,255,0.06)',
    mainBg: '#0A0B14',
    divider: 'rgba(255,255,255,0.06)',
    logoTitle: '#E8EDF5',
    logoSub: '#6B7A99',
    navInactive: '#6B7A99',
    navInactiveHover: '#E8EDF5',
    navHoverBg: 'rgba(255,255,255,0.04)',
    legalLink: '#4A5568',
    legalLinkHover: '#6B7A99',
    legalDot: '#2A3040',
    userCardBg: 'rgba(255,255,255,0.03)',
    userCardBorder: 'rgba(255,255,255,0.06)',
    userName: '#E8EDF5',
    userEmail: '#6B7A99',
    signOutColor: '#6B7A99',
    signOutHoverBg: 'rgba(255,255,255,0.05)',
    signOutHoverColor: '#E8EDF5',
    mobileNavBg: 'rgba(11,13,28,0.98)',
    mobileNavBorder: 'rgba(255,255,255,0.1)',
    mobileNavShadow: '0 -4px 24px rgba(0,0,0,0.5)',
    mobileFadeLeft: 'linear-gradient(to right, rgba(11,13,28,0.95) 0%, transparent 100%)',
    mobileFadeRight: 'linear-gradient(to left, rgba(11,13,28,0.95) 0%, transparent 100%)',
    mobileIconInactive: '#6B7A99',
    mobileLabelInactive: '#4A5568',
    mobileLabelActive: '#00D4AA',
  };

  return (
    <div className="flex min-h-screen" style={{ background: c.mainBg }}>
      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-40"
        style={{
          background: c.sidebarBg,
          borderRight: `1px solid ${c.sidebarBorder}`,
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
            <div className="font-display text-base font-semibold leading-tight" style={{ color: c.logoTitle, fontFamily: 'Cormorant Garamond, serif' }}>
              Rise In Harmony
            </div>
            <div className="text-xs" style={{ color: c.logoSub, fontFamily: 'DM Sans, sans-serif' }}>
              Healing Frequencies
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 mb-4" style={{ height: '1px', background: c.divider }} />

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = location === href;
            return (
              <Link key={href} href={href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                  active ? "text-[#0A0B14]" : ""
                )}
                  style={{
                    color: active ? '#0A0B14' : c.navInactive,
                    ...(active ? {
                      background: 'linear-gradient(135deg, #00D4AA, #00B894)',
                      boxShadow: '0 0 20px rgba(0,212,170,0.3)',
                    } : { background: 'transparent' }),
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = c.navHoverBg;
                      (e.currentTarget as HTMLElement).style.color = c.navInactiveHover;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = c.navInactive;
                    }
                  }}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                  <span className="text-sm font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-6">
          <div className="mx-3 mb-4" style={{ height: '1px', background: c.divider }} />

          {/* Theme toggle */}
          {toggleTheme && (
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full transition-all duration-200 mb-1"
              style={{ color: c.navInactive, background: 'transparent', fontFamily: 'DM Sans, sans-serif' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = c.navHoverBg;
                (e.currentTarget as HTMLElement).style.color = c.navInactiveHover;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = c.navInactive;
              }}
              title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {isLight ? <Moon size={18} strokeWidth={1.8} /> : <Sun size={18} strokeWidth={1.8} />}
              <span className="text-sm font-medium">{isLight ? "Dark Mode" : "Light Mode"}</span>
            </button>
          )}

          <Link href="/settings">
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full transition-all duration-200 cursor-pointer"
              style={{
                color: location === '/settings' ? '#00D4AA' : c.navInactive,
                background: location === '/settings' ? 'rgba(0,212,170,0.08)' : 'transparent',
                fontFamily: 'DM Sans, sans-serif',
              }}
              onMouseEnter={e => {
                if (location !== '/settings') {
                  (e.currentTarget as HTMLElement).style.background = c.navHoverBg;
                  (e.currentTarget as HTMLElement).style.color = c.navInactiveHover;
                }
              }}
              onMouseLeave={e => {
                if (location !== '/settings') {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = c.navInactive;
                }
              }}
            >
              <Settings size={18} strokeWidth={location === '/settings' ? 2.5 : 1.8} />
              <span className="text-sm font-medium">Settings</span>
            </div>
          </Link>

          {/* Legal links */}
          <div className="flex flex-wrap gap-x-1 px-3 mt-1">
            {[
              { href: '/about', label: 'About' },
              { href: '/technology', label: 'Technology' },
              { href: '/privacy', label: 'Privacy' },
              { href: '/terms', label: 'Terms' },
            ].map((item, i, arr) => (
              <span key={item.href} className="flex items-center gap-x-1">
                <Link href={item.href}>
                  <span className="text-xs transition-colors duration-200 cursor-pointer"
                    style={{ color: c.legalLink, fontFamily: 'DM Sans, sans-serif' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = c.legalLinkHover; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = c.legalLink; }}
                  >{item.label}</span>
                </Link>
                {i < arr.length - 1 && <span className="text-xs" style={{ color: c.legalDot }}>·</span>}
              </span>
            ))}
          </div>

          {/* User profile / Sign In */}
          <div className="mt-3 mx-1">
            {isAuthenticated && user ? (
              <div className="p-3 rounded-xl" style={{
                background: c.userCardBg,
                border: `1px solid ${c.userCardBorder}`,
              }}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #00D4AA, #8B5CF6)' }}>
                    <User size={13} style={{ color: '#0A0B14' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: c.userName, fontFamily: 'DM Sans, sans-serif' }}>
                      {user.name || 'User'}
                    </div>
                    <div className="text-[10px] truncate" style={{ color: c.userEmail, fontFamily: 'DM Sans, sans-serif' }}>
                      {user.email || ''}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-2 w-full text-xs py-1.5 px-2 rounded-lg transition-all duration-150"
                  style={{ color: c.signOutColor, fontFamily: 'DM Sans, sans-serif' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = c.signOutHoverBg;
                    (e.currentTarget as HTMLElement).style.color = c.signOutHoverColor;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = c.signOutColor;
                  }}
                >
                  <LogOut size={13} />
                  Sign out
                </button>
              </div>
            ) : (
              <a
                href={getLoginUrl()}
                className="flex items-center justify-center gap-2 w-full text-sm font-semibold py-2.5 rounded-xl transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,212,170,0.15), rgba(0,212,170,0.08))',
                  border: '1px solid rgba(0,212,170,0.25)',
                  color: '#00D4AA',
                  fontFamily: 'DM Sans, sans-serif',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(0,212,170,0.25), rgba(0,212,170,0.15))'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(0,212,170,0.15), rgba(0,212,170,0.08))'; }}
              >
                <LogIn size={15} />
                Sign In
              </a>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 lg:ml-64 pb-24 lg:pb-0">
        {children}
      </main>

      {/* ── Mobile horizontally scrollable bottom tab bar ────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40"
        style={{
          background: c.mobileNavBg,
          backdropFilter: 'blur(24px)',
          borderTop: `1px solid ${c.mobileNavBorder}`,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxShadow: c.mobileNavShadow,
        }}
      >
        <div className="relative">
          {showLeftFade && (
            <div className="pointer-events-none absolute bottom-0 left-0 z-50 lg:hidden"
              style={{ width: '48px', height: '80px', background: c.mobileFadeLeft, paddingBottom: 'env(safe-area-inset-bottom, 0px)', transition: 'opacity 150ms ease' }}
            />
          )}
          {showRightFade && (
            <div className="pointer-events-none absolute bottom-0 right-0 z-50 lg:hidden"
              style={{ width: '48px', height: '80px', background: c.mobileFadeRight, paddingBottom: 'env(safe-area-inset-bottom, 0px)', transition: 'opacity 150ms ease' }}
            />
          )}

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="rih-nav flex items-stretch h-20 overflow-x-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x proximity' }}
          >
            <style>{`.rih-nav::-webkit-scrollbar { display: none; }`}</style>

            {allMobileItems.map(({ href, icon: Icon, label }) => {
              const active = location === href;
              return (
                <Link key={href} href={href}>
                  <div
                    className="flex flex-col items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 flex-shrink-0"
                    style={{ width: '76px', height: '80px', scrollSnapAlign: 'start' }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200"
                      style={active ? {
                        background: 'linear-gradient(135deg, #00D4AA, #00B894)',
                        boxShadow: '0 4px 16px rgba(0,212,170,0.4)',
                      } : { background: 'transparent' }}
                    >
                      <Icon
                        size={22}
                        strokeWidth={active ? 2.5 : 1.8}
                        style={{ color: active ? '#0A0B14' : c.mobileIconInactive }}
                      />
                    </div>
                    <span
                      className="text-[11px] font-semibold leading-none"
                      style={{ color: active ? c.mobileLabelActive : c.mobileLabelInactive, fontFamily: 'DM Sans, sans-serif' }}
                    >
                      {label}
                    </span>
                  </div>
                </Link>
              );
            })}

            {/* Theme toggle in mobile nav */}
            {toggleTheme && (
              <button
                onClick={toggleTheme}
                className="flex flex-col items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 flex-shrink-0"
                style={{ width: '76px', height: '80px' }}
                title={isLight ? "Dark Mode" : "Light Mode"}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'transparent' }}>
                  {isLight
                    ? <Moon size={22} strokeWidth={1.8} style={{ color: c.mobileIconInactive }} />
                    : <Sun size={22} strokeWidth={1.8} style={{ color: c.mobileIconInactive }} />
                  }
                </div>
                <span className="text-[11px] font-semibold leading-none"
                  style={{ color: c.mobileLabelInactive, fontFamily: 'DM Sans, sans-serif' }}>
                  {isLight ? 'Dark' : 'Light'}
                </span>
              </button>
            )}

            {/* Sign in / out */}
            {isAuthenticated ? (
              <button
                onClick={() => logout()}
                className="flex flex-col items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 flex-shrink-0"
                style={{ width: '76px', height: '80px' }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'transparent' }}>
                  <LogOut size={22} strokeWidth={1.8} style={{ color: c.mobileIconInactive }} />
                </div>
                <span className="text-[11px] font-semibold leading-none"
                  style={{ color: c.mobileLabelInactive, fontFamily: 'DM Sans, sans-serif' }}>
                  Sign Out
                </span>
              </button>
            ) : (
              <a
                href={getLoginUrl()}
                className="flex flex-col items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 flex-shrink-0"
                style={{ width: '76px', height: '80px' }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(0,212,170,0.1)', boxShadow: '0 0 12px rgba(0,212,170,0.15)' }}>
                  <LogIn size={22} strokeWidth={1.8} style={{ color: '#00D4AA' }} />
                </div>
                <span className="text-[11px] font-semibold leading-none"
                  style={{ color: '#00D4AA', fontFamily: 'DM Sans, sans-serif' }}>
                  Sign In
                </span>
              </a>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
