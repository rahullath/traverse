import React from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import MirrorUI, { type MirrorUIProps } from "./MirrorUI";
import MirrorUIV2 from "./MirrorUI.v2";
import { isFeatureEnabled } from "@/lib/feature-flags";

// Evaluated once at module load — flag is a static env var, never changes at runtime.
// Keeps the component reference stable so React never thinks the tree type changed.
const Mirror = isFeatureEnabled("MIRROR_V2_ENABLED") ? MirrorUIV2 : MirrorUI;

export default function MirrorUIWithErrorBoundary(props: MirrorUIProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error("MirrorUI Error:", error, errorInfo);
  };

  return (
    <ErrorBoundary onError={handleError}>
      <Mirror {...props} />
    </ErrorBoundary>
  );
}
