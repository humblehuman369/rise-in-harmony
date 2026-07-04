import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Player from "./pages/Player";
import Alarm from "./pages/Alarm";
import Library from "./pages/Library";
import Dashboard from "./pages/Dashboard";
import SoundStudio from "./pages/SoundStudio";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import About from "./pages/About";
import Meditation from "./pages/Meditation";
import PrecisionPlayer from "./pages/PrecisionPlayer";
import OnboardingModal from "./components/OnboardingModal";
import { useOnboarding } from "./hooks/useOnboarding";
import Technology from "./pages/Technology";
import Admin from "./pages/Admin";
import { useAuth } from "./_core/hooks/useAuth";
import { useLocalSessionImport } from "./hooks/useLocalSessionImport";
import { useAnalytics } from "./hooks/useAnalytics";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/player" component={Player} />
      <Route path="/studio" component={SoundStudio} />
      <Route path="/alarm" component={Alarm} />
      <Route path="/library" component={Library} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/meditation" component={Meditation} />
      <Route path="/precision" component={PrecisionPlayer} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/about" component={About} />
      <Route path="/technology" component={Technology} />
      <Route path="/admin" component={Admin} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { user } = useAuth();
  // Initialize PostHog, identify user, and reload feature flags after login
  useAnalytics(user?.id ?? undefined, user?.email ?? undefined);
  // One-time bulk import of localStorage sessions to server after login
  useLocalSessionImport(user?.id);
  return (
    <>
      <Toaster
        toastOptions={{
          style: {
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
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
