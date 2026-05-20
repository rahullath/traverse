import React from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import MirrorUI, { type MirrorUIProps } from "./MirrorUI";
import MirrorUIV2 from "./MirrorUI.v2";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default function MirrorUIWithErrorBoundary(props: MirrorUIProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error("MirrorUI Error:", error, errorInfo);
  };

  const Mirror = isFeatureEnabled("MIRROR_V2_ENABLED") ? MirrorUIV2 : MirrorUI;

  return (
    <ErrorBoundary onError={handleError}>
      <Mirror {...props} />
    </ErrorBoundary>
  );
}
