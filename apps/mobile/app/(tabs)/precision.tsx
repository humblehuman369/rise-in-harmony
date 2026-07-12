/**
 * Precision Player — now merged into Studio.
 * This file exists only so deep-links to /precision still resolve.
 * It immediately redirects to the unified Studio tab.
 */
import { Redirect } from "expo-router";

export default function PrecisionRedirect() {
  return <Redirect href="/(tabs)/studio" />;
}
