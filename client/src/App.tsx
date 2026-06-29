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
import OnboardingModal, { useOnboarding } from "./components/OnboardingModal";
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
      <Route path="/privacy" component={Privacy} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
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
