// Feature flags for Mirror V2 migration
// These allow gradual rollout of philosophy-aligned changes

export const FEATURE_FLAGS = {
  // Core Mirror V2 flags
  MIRROR_V2_ENABLED: "MIRROR_V2_ENABLED",
  MIRROR_V2_NEUTRAL_DISPLAY: "MIRROR_V2_NEUTRAL_DISPLAY",
  MIRROR_V2_FLEXIBLE_START: "MIRROR_V2_FLEXIBLE_START",
  MIRROR_V2_OPTIONAL_TRACKING: "MIRROR_V2_OPTIONAL_TRACKING",
  MIRROR_V2_TELEMETRY: "MIRROR_V2_TELEMETRY",

  // Existing flags
  TRIAGE_MIRROR_ENABLED: "TRIAGE_MIRROR_ENABLED",
  STATE_DECLARATION_ENABLED: "STATE_DECLARATION_ENABLED",
  STATELESS_RECALC_ENABLED: "STATELESS_RECALC_ENABLED",
  INLINE_EDITING_ENABLED: "INLINE_EDITING_ENABLED",
} as const;

// Default flag values (can be overridden by environment or user preferences)
const DEFAULT_FLAGS: Record<string, boolean> = {
  // V2 flags - start disabled, enable gradually
  [FEATURE_FLAGS.MIRROR_V2_ENABLED]: true,
  [FEATURE_FLAGS.MIRROR_V2_NEUTRAL_DISPLAY]: false,
  [FEATURE_FLAGS.MIRROR_V2_FLEXIBLE_START]: false,
  [FEATURE_FLAGS.MIRROR_V2_OPTIONAL_TRACKING]: false,
  [FEATURE_FLAGS.MIRROR_V2_TELEMETRY]: false,

  // V1 flags - currently enabled
  [FEATURE_FLAGS.TRIAGE_MIRROR_ENABLED]: true,
  [FEATURE_FLAGS.STATE_DECLARATION_ENABLED]: true,
  [FEATURE_FLAGS.STATELESS_RECALC_ENABLED]: true,
  [FEATURE_FLAGS.INLINE_EDITING_ENABLED]: true,
};

/**
 * Check if a feature flag is enabled
 * Priority: Environment variable > Default value
 */
export function isFeatureEnabled(flag: string): boolean {
  // Check environment variable first
  const envValue = import.meta.env[`PUBLIC_${flag}`];
  if (envValue !== undefined) {
    return envValue === "true" || envValue === "1";
  }

  // Fall back to default
  return DEFAULT_FLAGS[flag] ?? false;
}

/**
 * Get all enabled feature flags
 */
export function getEnabledFeatures(): string[] {
  return Object.keys(DEFAULT_FLAGS).filter((flag) => isFeatureEnabled(flag));
}
