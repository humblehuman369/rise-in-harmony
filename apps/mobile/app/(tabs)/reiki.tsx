/**
 * Reiki tab — plays the Reiki Healing Garden 432Hz TrueHz meditation.
 * Redirects to the meditation player pre-loaded with the reiki track.
 */
import { Redirect } from "expo-router";

export default function ReikiTab() {
  // Open the meditation player with the Reiki Healing Garden track.
  // The [id] route in app/meditation/[id].tsx handles the full player UI.
  return <Redirect href="/meditation/reiki-healing-garden-285" />;
}
