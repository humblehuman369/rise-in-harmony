/**
 * Journey tab — renders the 7-Chakra Journey screen.
 * The full implementation lives in app/chakra-journey.tsx;
 * this file exposes it as a tab-bar entry point.
 */
import { Redirect } from "expo-router";

export default function JourneyTab() {
  // Redirect to the standalone chakra-journey route so we share
  // one implementation and avoid code duplication.
  return <Redirect href="/chakra-journey" />;
}
