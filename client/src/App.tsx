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
import { useAuth } from "./_core/hooks/useAuth";
import { useLocalSessionImport } from "./hooks/useLocalSessionImport";
import { useAnalytics } from "./hooks/useAnalytics";
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
