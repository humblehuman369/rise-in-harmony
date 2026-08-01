/**
 * Layout — Bioluminescent Depth (Dark) / Morning Mist (Light) Theme
 * Persistent sidebar on desktop, horizontally scrollable bottom tab bar on mobile
 * Theme toggle (sun/moon) in sidebar bottom and mobile nav
 * Top navigation bar with login/user button at top right
 */
import { useRef, useCallback, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Home, Music2, AlarmClock, BookOpen, BarChart3, Settings,
  Layers, Headphones, ShieldCheck, LogIn, LogOut, User,
  GraduationCap, Sun, Moon, CalendarRange, Sparkles, Map, ChevronDown, Heart, Gift, Route,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";

// ─── Nav definitions ──────────────────────────────────────────────────────────

const mobileNavItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/journey", icon: Map, label: "Journey" },
  { href: "/alarm", icon: AlarmClock, label: "Alarm" },
  { href: "/player", icon: Music2, label: "Player" },
  { href: "/reiki", icon: Sparkles, label: "Reiki" },
  { href: "/meditation", icon: Headphones, label: "Meditate" },
  { href: "/studio", icon: Layers, label: "Studio" },
  { href: "/library", icon: BookOpen, label: "Library" },
  { href: "/programs", icon: CalendarRange, label: "Programs" },
  { href: "/learn", icon: GraduationCap, label: "Learn" },
  { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
];

const adminNavItem = { href: "/admin", icon: ShieldCheck, label: "Admin" };

const baseNavItems = [
  { href: "/journey", icon: Map, label: "Journey" },
  { href: "/alarm", icon: AlarmClock, label: "Alarm" },
  { href: "/player", icon: Music2, label: "Player" },
  { href: "/reiki", icon: Sparkles, label: "Reiki" },
  { href: "/meditation", icon: Headphones, label: "Meditate" },
  { href: "/studio", icon: Layers, label: "Studio" },
  { href: "/prescription", icon: Heart, label: "Prescribe" },
  { href: "/library", icon: BookOpen, label: "Library" },
  { href: "/programs", icon: CalendarRange, label: "Programs" },
  { href: "/learn", icon: GraduationCap, label: "Learn" },
  { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { href: "/gift", icon: Gift, label: "Gift" },
  { href: "/walkthrough", icon: Route, label: "How It Works" },
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

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ background: c.mainBg }}>

      {/* ── Top Navigation Bar ──────────────────────────────────────────── */}
      <header
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 md:px-6"
        style={{
          height: '60px',
          background: isLight
            ? 'rgba(237,240,247,0.92)'
            : 'rgba(10,11,20,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${c.sidebarBorder}`,
        }}
      >
        {/* Logo — left side */}
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer select-none">
            <img
              src="/rih-logo.svg"
              alt="Rise In Harmony"
              className="w-7 h-7 object-contain"
            />
            <span
              className="hidden sm:block text-sm font-semibold"
              style={{ color: c.logoTitle, fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.01em' }}
            >
              Rise In Harmony
            </span>
          </div>
        </Link>

        {/* Right side — auth controls */}
        <div className="flex items-center gap-2">
          {/* Auth button — theme toggle moved into user dropdown */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl transition-all duration-200"
                style={{
                  background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${c.userCardBorder}`,
                  fontFamily: 'DM Sans, sans-serif',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = isLight ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.10)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)';
                }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #00D4AA, #8B5CF6)' }}
                >
                  <User size={12} style={{ color: '#0A0B14' }} />
                </div>
                <span className="text-xs font-semibold max-w-[100px] truncate hidden sm:block" style={{ color: c.userName }}>
                  {user.name || 'Member'}
                </span>
                <ChevronDown size={13} style={{ color: c.navInactive, flexShrink: 0 }} />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-2 w-52 rounded-2xl z-50 overflow-hidden"
                    style={{
                      background: isLight ? '#FFFFFF' : '#12152A',
                      border: `1px solid ${c.userCardBorder}`,
                      boxShadow: isLight
                        ? '0 8px 32px rgba(0,0,0,0.12)'
                        : '0 8px 32px rgba(0,0,0,0.5)',
                      animation: 'scale-in 150ms cubic-bezier(0.23,1,0.32,1) forwards',
                      transformOrigin: 'top right',
                    }}
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: c.divider }}>
                      <div className="text-xs font-semibold truncate" style={{ color: c.userName, fontFamily: 'DM Sans, sans-serif' }}>
                        {user.name || 'Member'}
                      </div>
                      {user.email && (
                        <div className="text-[11px] truncate mt-0.5" style={{ color: c.userEmail, fontFamily: 'DM Sans, sans-serif' }}>
                          {user.email}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="p-1.5">
                      <Link href="/dashboard">
                        <div
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150"
                          style={{ color: c.navInactive, fontFamily: 'DM Sans, sans-serif' }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = c.navHoverBg;
                            (e.currentTarget as HTMLElement).style.color = c.navInactiveHover;
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = c.navInactive;
                          }}
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <BarChart3 size={14} />
                          Dashboard
                        </div>
                      </Link>
                      <Link href="/settings">
                        <div
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150"
                          style={{ color: c.navInactive, fontFamily: 'DM Sans, sans-serif' }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = c.navHoverBg;
                            (e.currentTarget as HTMLElement).style.color = c.navInactiveHover;
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = c.navInactive;
                          }}
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings size={14} />
                          Settings
                        </div>
                      </Link>
                      {toggleTheme && (
                        <button
                          onClick={() => { toggleTheme(); setUserMenuOpen(false); }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium w-full transition-all duration-150"
                          style={{ color: c.navInactive, fontFamily: 'DM Sans, sans-serif', background: 'transparent' }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = c.navHoverBg;
                            (e.currentTarget as HTMLElement).style.color = c.navInactiveHover;
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = c.navInactive;
                          }}
                        >
                          {isLight ? <Moon size={14} /> : <Sun size={14} />}
                          {isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                        </button>
                      )}
                      <div className="my-1" style={{ height: '1px', background: c.divider, margin: '4px 12px' }} />
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium w-full transition-all duration-150"
                        style={{ color: '#EF4444', fontFamily: 'DM Sans, sans-serif', background: 'transparent' }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                      >
                        <LogOut size={14} />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/join">
                <div
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.07))',
                    border: '1px solid rgba(139,92,246,0.28)',
                    color: '#8B5CF6',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Subscribe
                </div>
              </Link>
              <button
                onClick={() => startLogin()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,212,170,0.18), rgba(0,212,170,0.08))',
                  border: '1px solid rgba(0,212,170,0.3)',
                  color: '#00D4AA',
                  fontFamily: 'DM Sans, sans-serif',
                  boxShadow: '0 0 16px rgba(0,212,170,0.12)',
                }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(0,212,170,0.28), rgba(0,212,170,0.16))';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(0,212,170,0.22)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(0,212,170,0.18), rgba(0,212,170,0.08))';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(0,212,170,0.12)';
              }}
            >
              <LogIn size={14} />
              Sign In
            </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 fixed left-0 z-40"
        style={{
          top: '60px',
          bottom: 0,
          background: isLight ? c.sidebarBg : 'linear-gradient(180deg, #0E1020 0%, #0A0B14 100%)',
          borderRight: `1px solid ${c.sidebarBorder}`,
          boxShadow: isLight ? 'none' : '4px 0 32px rgba(0,0,0,0.4)',
        }}>
        {/* Divider — top spacing now provided by top nav bar */}
        <div className="mx-6 mt-4 mb-4" style={{ height: '1px', background: c.divider }} />

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = location === href;
            return (
              <>
              <Link key={href} href={href}>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden"
                  style={{
                    color: active ? '#00D4AA' : c.navInactive,
                    background: active
                      ? (isLight ? 'rgba(0,212,170,0.10)' : 'rgba(0,212,170,0.08)')
                      : 'transparent',
                    borderLeft: active ? '3px solid #00D4AA' : '3px solid transparent',
                    boxShadow: active && !isLight ? '0 0 12px rgba(0,212,170,0.08)' : 'none',
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
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.5 : 1.8}
                    style={{ color: active ? '#00D4AA' : undefined, filter: active && !isLight ? 'drop-shadow(0 0 4px rgba(0,212,170,0.5))' : 'none' }}
                  />
                  <span className="text-sm font-medium" style={{ fontFamily: 'DM Sans, sans-serif', color: active ? '#00D4AA' : undefined }}>{label}</span>
                </div>
              </Link>
              {/* Deep Sleep Wake sub-item — shown only after Alarm */}
              {href === '/walkthrough' && (
                <>
                <Link href="/homepage-showcase">
                  <div
                    className="flex items-center gap-2 ml-6 pl-3 py-1.5 transition-all duration-200"
                    style={{
                      color: location === '/homepage-showcase' ? '#00D4AA' : c.navInactive,
                      borderLeft: location === '/homepage-showcase' ? '2px solid #00D4AA' : '2px solid transparent',
                      fontSize: '12px',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                    onMouseEnter={e => {
                      if (location !== '/homepage-showcase') {
                        (e.currentTarget as HTMLElement).style.color = '#00D4AA';
                      }
                    }}
                    onMouseLeave={e => {
                      if (location !== '/homepage-showcase') {
                        (e.currentTarget as HTMLElement).style.color = c.navInactive;
                      }
                    }}
                  >
                    <span style={{ fontSize: '12px' }}>🏠</span>
                    <span>Homepage Showcase</span>
                  </div>
                </Link>
                <Link href="/discovery-paths">
                  <div
                    className="flex items-center gap-2 ml-6 pl-3 py-1.5 transition-all duration-200"
                    style={{
                      color: location === '/discovery-paths' ? '#F59E0B' : c.navInactive,
                      borderLeft: location === '/discovery-paths' ? '2px solid #F59E0B' : '2px solid transparent',
                      fontSize: '12px',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                    onMouseEnter={e => {
                      if (location !== '/discovery-paths') {
                        (e.currentTarget as HTMLElement).style.color = '#F59E0B';
                      }
                    }}
                    onMouseLeave={e => {
                      if (location !== '/discovery-paths') {
                        (e.currentTarget as HTMLElement).style.color = c.navInactive;
                      }
                    }}
                  >
                    <span style={{ fontSize: '12px' }}>🧭</span>
                    <span>Four Paths</span>
                  </div>
                </Link>
                </>
              )}
              {href === '/alarm' && (
                <>
                <Link href="/deep-sleep-wake">
                  <div
                    className="flex items-center gap-2 ml-6 pl-3 py-1.5 transition-all duration-200"
                    style={{
                      color: location === '/deep-sleep-wake' ? '#8B5CF6' : c.navInactive,
                      borderLeft: location === '/deep-sleep-wake' ? '2px solid #8B5CF6' : '2px solid transparent',
                      fontSize: '12px',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                    onMouseEnter={e => {
                      if (location !== '/deep-sleep-wake') {
                        (e.currentTarget as HTMLElement).style.color = '#8B5CF6';
                      }
                    }}
                    onMouseLeave={e => {
                      if (location !== '/deep-sleep-wake') {
                        (e.currentTarget as HTMLElement).style.color = c.navInactive;
                      }
                    }}
                  >
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '14px', color: location === '/deep-sleep-wake' ? '#8B5CF6' : '#6B7A99' }}>δ→θ→α</span>
                    <span>Deep Sleep Wake</span>
                  </div>
                </Link>
                <Link href="/alarm-features">
                  <div
                    className="flex items-center gap-2 ml-6 pl-3 py-1.5 transition-all duration-200"
                    style={{
                      color: location === '/alarm-features' ? '#00D4AA' : c.navInactive,
                      borderLeft: location === '/alarm-features' ? '2px solid #00D4AA' : '2px solid transparent',
                      fontSize: '12px',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                    onMouseEnter={e => {
                      if (location !== '/alarm-features') {
                        (e.currentTarget as HTMLElement).style.color = '#00D4AA';
                      }
                    }}
                    onMouseLeave={e => {
                      if (location !== '/alarm-features') {
                        (e.currentTarget as HTMLElement).style.color = c.navInactive;
                      }
                    }}
                  >
                    <span style={{ fontSize: '12px' }}>⚡</span>
                    <span>All Features</span>
                  </div>
                </Link>
                <Link href="/alarm-showcase">
                  <div
                    className="flex items-center gap-2 ml-6 pl-3 py-1.5 transition-all duration-200"
                    style={{
                      color: location === '/alarm-showcase' ? '#00D4AA' : c.navInactive,
                      borderLeft: location === '/alarm-showcase' ? '2px solid #00D4AA' : '2px solid transparent',
                      fontSize: '12px',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                    onMouseEnter={e => {
                      if (location !== '/alarm-showcase') {
                        (e.currentTarget as HTMLElement).style.color = '#00D4AA';
                      }
                    }}
                    onMouseLeave={e => {
                      if (location !== '/alarm-showcase') {
                        (e.currentTarget as HTMLElement).style.color = c.navInactive;
                      }
                    }}
                  >
                    <span style={{ fontSize: '12px' }}>🔔</span>
                    <span>Alarm Showcase</span>
                  </div>
                </Link>
                <Link href="/brainwave-video">
                  <div
                    className="flex items-center gap-2 ml-6 pl-3 py-1.5 transition-all duration-200"
                    style={{
                      color: location === '/brainwave-video' ? '#8B5CF6' : c.navInactive,
                      borderLeft: location === '/brainwave-video' ? '2px solid #8B5CF6' : '2px solid transparent',
                      fontSize: '12px',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                    onMouseEnter={e => {
                      if (location !== '/brainwave-video') {
                        (e.currentTarget as HTMLElement).style.color = '#8B5CF6';
                      }
                    }}
                    onMouseLeave={e => {
                      if (location !== '/brainwave-video') {
                        (e.currentTarget as HTMLElement).style.color = c.navInactive;
                      }
                    }}
                  >
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '14px', color: location === '/brainwave-video' ? '#8B5CF6' : '#6B7A99' }}>δθα</span>
                    <span>Brainwave Video</span>
                  </div>
                </Link>
                </>
              )}
              </>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-6">
          <div className="mx-3 mb-4" style={{ height: '1px', background: c.divider }} />

          {/* Settings and theme toggle moved to user profile dropdown */}

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
              <button
                onClick={() => startLogin()}
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
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 lg:ml-64 pb-24 lg:pb-0" style={{ paddingTop: '60px' }}>
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

            {/* Sign in button for guests only in mobile nav */}
            {!isAuthenticated && (
              <button
                onClick={() => startLogin()}
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
              </button>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
