/**
 * /walkthrough — Live Journey Walkthrough
 *
 * Renders the immersive scroll-driven subscriber journey walkthrough
 * as a full-page experience outside the standard app Layout.
 * The page uses an iframe to embed the standalone HTML walkthrough
 * served from the public directory, so the canvas animations,
 * scroll-driven reveals, and nav dots all work natively.
 */
import { useEffect } from "react";

export default function Walkthrough() {
  // Remove body scroll lock that the app Layout may apply
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0A0B14",
        zIndex: 9999,
      }}
    >
      <iframe
        src="/walkthrough.html"
        title="Rise In Harmony — Live Journey Walkthrough"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        allow="autoplay"
      />
    </div>
  );
}
