import { useState, useEffect } from "react";

const ONBOARDING_KEY = "rih_onboarding_complete";

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    // Skip modal if ?skip_onboarding=1 is in the URL (useful for previews/screenshots)
    const skipParam = new URLSearchParams(window.location.search).get('skip_onboarding');
    if (!completed && !skipParam) {
      // Small delay so the app renders first
      const t = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(t);
    }
  }, []);
  const completeOnboarding = () => setShowOnboarding(false);
  return { showOnboarding, completeOnboarding };
}
