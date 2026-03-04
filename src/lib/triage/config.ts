/**
 * Triage Mirror Configuration
 * 
 * Performance timeouts and configuration values for the triage mirror system.
 * Values can be overridden via environment variables.
 */

export interface TriageConfig {
  RECALC_TIMEOUT_MS: number;
  RUNWAY_CALC_TIMEOUT_MS: number;
  TRIAGE_KEYSTONE_TIMEOUT_MS: number;
}

/**
 * Get configuration value from environment or default
 */
function getConfigValue(key: string, defaultValue: number): number {
  if (typeof process !== 'undefined' && process.env) {
    const envValue = process.env[key];
    if (envValue !== undefined) {
      const parsed = parseInt(envValue, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }
  return defaultValue;
}

/**
 * Triage configuration singleton
 */
export const triageConfig: TriageConfig = {
  // Maximum time for plan recalculation (Requirements: 12.1, 12.2)
  RECALC_TIMEOUT_MS: getConfigValue('RECALC_TIMEOUT_MS', 4000),
  
  // Maximum time for runway calculation (Requirements: 1.3)
  RUNWAY_CALC_TIMEOUT_MS: getConfigValue('RUNWAY_CALC_TIMEOUT_MS', 100),
  
  // Maximum time for keystone identification (Requirements: 10.4)
  TRIAGE_KEYSTONE_TIMEOUT_MS: getConfigValue('TRIAGE_KEYSTONE_TIMEOUT_MS', 50),
};

/**
 * Get configuration value by key
 */
export function getTriageConfig(key: keyof TriageConfig): number {
  return triageConfig[key];
}

/**
 * Get all configuration values
 */
export function getAllTriageConfig(): TriageConfig {
  return { ...triageConfig };
}
