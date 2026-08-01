import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Player from "./pages/Player";
import Alarm from "./pages/Alarm";
import Library from "./pages/Library";
import Dashboard from "./pages/Dashboard";
import FrequencyStudio from "./pages/FrequencyStudio";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import About from "./pages/About";
import Meditation from "./pages/Meditation";

import OnboardingModal from "./components/OnboardingModal";
import { useOnboarding } from "./hooks/useOnboarding";
import Technology from "./pages/Technology";
import Learn from "./pages/Learn";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import Programs from "./pages/Programs";
import Convert from "./pages/Convert";
import ReikiPlayer from "./pages/ReikiPlayer";
import Journey from "./pages/Journey";
import Prescription from "./pages/Prescription";
import Gift from "./pages/Gift";
import Join from "./pages/Join";
import Onboarding from "./pages/Onboarding";
import Walkthrough from "./pages/Walkthrough";
import AlarmFeatures from "./pages/AlarmFeatures";
import DeepSleepWake from "./pages/DeepSleepWake";
import DiscoveryPaths from "./pages/DiscoveryPaths";
import AlarmShowcase from "./pages/AlarmShowcase";
import BrainwaveVideo from "./pages/BrainwaveVideo";
import HomepageShowcase from "./pages/HomepageShowcase";
import { useAuth } from "./_core/hooks/useAuth";
import { useLocalSessionImport } from "./hooks/useLocalSessionImport";
import { useAnalytics } from "./hooks/useAnalytics";
import { useEffect, useRef } from "react";
import { trpc } from "./lib/trpc";
import { PENDING_CHECKOUT_KEY } from "./const";
import { toast } from "sonner";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/player" component={Player} />
      <Route path="/studio" component={FrequencyStudio} />
      <Route path="/alarm" component={Alarm} />
      <Route path="/library" component={Library} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/programs" component={Programs} />
      <Route path="/meditation" component={Meditation} />
      <Route path="/convert" component={Convert} />
      <Route path="/reiki" component={ReikiPlayer} />
      <Route path="/journey" component={Journey} />
      <Route path="/prescription" component={Prescription} />
      <Route path="/gift" component={Gift} />
      <Route path="/join" component={Join} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/walkthrough" component={Walkthrough} />
      <Route path="/alarm-features" component={AlarmFeatures} />
      <Route path="/deep-sleep-wake" component={DeepSleepWake} />
      <Route path="/discovery-paths" component={DiscoveryPaths} />
      <Route path="/alarm-showcase" component={AlarmShowcase} />
      <Route path="/brainwave-video" component={BrainwaveVideo} />
      <Route path="/homepage-showcase" component={HomepageShowcase} />
      <Route path="/precision">{() => { window.location.replace("/studio"); return null; }}</Route>
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/about" component={About} />
      <Route path="/technology" component={Technology} />
      <Route path="/learn" component={Learn} />
      <Route path="/admin" component={Admin} />
      <Route path="/settings" component={Settings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { user } = useAuth();
  const { theme } = useTheme();
  // Initialize PostHog, identify user, and reload feature flags after login
  useAnalytics(user?.id ?? undefined, user?.email ?? undefined);
  // One-time bulk import of localStorage sessions to server after login
  useLocalSessionImport(user?.id);
  // Resume pending checkout after sign-in (e.g. guest clicked Subscribe then logged in)
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();
  const resumedRef = useRef(false);
  useEffect(() => {
    if (!user || resumedRef.current) return;
    let tier: string | null = null;
    try { tier = sessionStorage.getItem(PENDING_CHECKOUT_KEY); } catch { /* private mode */ }
    if (!tier) return;
    resumedRef.current = true;
    try { sessionStorage.removeItem(PENDING_CHECKOUT_KEY); } catch { /* */ }
    createCheckout
      .mutateAsync({ tier: tier as "monthly" | "annual" | "lifetime" })
      .then(({ url }) => { if (url) window.location.href = url; })
      .catch(() => toast.error("Could not resume checkout — please try subscribing again."));
  }, [user]);
  const isLight = theme === 'light';
  return (
    <>
      <Toaster
        toastOptions={{
          style: isLight ? {
            background: '#FFFFFF',
            border: '1px solid rgba(0,0,0,0.08)',
            color: '#1A1D2E',
          } : {
            background: '#12152A',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#E8EDF5',
          },
        }}
      />
      <Router />
      {showOnboarding && <OnboardingModal onComplete={completeOnboarding} />}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
