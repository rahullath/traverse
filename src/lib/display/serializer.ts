// src/lib/display/serializer.ts
// Display Mode Serializer for Mirror V2
// Requirements: 22.1, 22.2, 22.3, 22.4

import type { DisplayIntent } from "./display-mode-service";

/**
 * Chain start time options
 */
export type ChainStartTime =
  | { type: "now" }
  | { type: "in_minutes"; minutes: number }
  | { type: "at_time"; time: Date }
  | { type: "when_ready" }; // No times, just sequence

/**
 * Display mode state for sessionStorage persistence
 */
export interface DisplayModeState {
  mode: DisplayIntent;
  startTime: ChainStartTime;
  showTimes: boolean;
  timestamp: Date;
}

/**
 * DisplayModeSerializer
 *
 * Handles serialization and deserialization of display mode state
 * for sessionStorage persistence.
 *
 * Requirements: 22.1, 22.2, 22.3, 22.4
 */
export class DisplayModeSerializer {
  private readonly VALID_MODES: DisplayIntent[] = [
    "full_chain",
    "keystone_focus",
    "reality_check",
    "anchor_only",
    "rest_of_day",
  ];

  /**
   * Serialize display mode state to JSON
   * Requirement: 22.1
   */
  serialize(state: DisplayModeState): string {
    const serializable = {
      mode: state.mode,
      startTime: this.serializeStartTime(state.startTime),
      showTimes: state.showTimes,
      timestamp: state.timestamp.toISOString(),
    };
    return JSON.stringify(serializable);
  }

  /**
   * Deserialize JSON to display mode state
   * Requirement: 22.2
   */
  deserialize(json: string): DisplayModeState {
    try {
      const parsed = JSON.parse(json);

      // Validate mode (Req 22.3)
      if (!this.validate(parsed.mode)) {
        return this.getDefaultState();
      }

      return {
        mode: parsed.mode,
        startTime: this.deserializeStartTime(parsed.startTime),
        showTimes: parsed.showTimes ?? true,
        timestamp: new Date(parsed.timestamp),
      };
    } catch (error) {
      // Return default on parse error (Req 22.4)
      console.warn("Failed to deserialize display mode state:", error);
      return this.getDefaultState();
    }
  }

  /**
   * Validate display mode value
   * Requirement: 22.3
   */
  validate(mode: string): boolean {
    return this.VALID_MODES.includes(mode as DisplayIntent);
  }

  /**
   * Get default display mode
   * Requirement: 22.4
   */
  getDefault(): DisplayIntent {
    return "full_chain";
  }

  /**
   * Get default display mode state
   */
  getDefaultState(): DisplayModeState {
    return {
      mode: "full_chain",
      startTime: { type: "now" },
      showTimes: true,
      timestamp: new Date(),
    };
  }

  /**
   * Serialize chain start time
   */
  private serializeStartTime(startTime: ChainStartTime): any {
    if (startTime.type === "at_time") {
      return {
        type: startTime.type,
        time: startTime.time.toISOString(),
      };
    }
    return startTime;
  }

  /**
   * Deserialize chain start time
   */
  private deserializeStartTime(data: any): ChainStartTime {
    if (!data || !data.type) {
      return { type: "now" };
    }

    if (data.type === "at_time" && data.time) {
      return {
        type: "at_time",
        time: new Date(data.time),
      };
    }

    return data as ChainStartTime;
  }

  /**
   * Get sessionStorage key for display mode
   * Requirements: 18.1
   */
  getStorageKey(date: Date): string {
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
    return `mirror_display_mode_${dateStr}`;
  }

  /**
   * Check if stored state is from today
   * Requirements: 18.4
   */
  isFromToday(state: DisplayModeState): boolean {
    const stateDate = new Date(state.timestamp);
    const today = new Date();

    return (
      stateDate.getFullYear() === today.getFullYear() &&
      stateDate.getMonth() === today.getMonth() &&
      stateDate.getDate() === today.getDate()
    );
  }

  /**
   * Clear old display mode entries (day boundary cleanup)
   * Requirements: 18.4
   */
  clearOldEntries(): void {
    try {
      const today = new Date();
      const todayKey = this.getStorageKey(today);

      // Get all keys from sessionStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith("mirror_display_mode_") && key !== todayKey) {
          keysToRemove.push(key);
        }
      }

      // Remove old entries
      keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    } catch (error) {
      console.warn("Failed to clear old display mode entries:", error);
    }
  }

  /**
   * Save display mode state to sessionStorage
   * Requirements: 18.1, 18.2
   */
  saveToStorage(state: DisplayModeState): void {
    try {
      const key = this.getStorageKey(new Date());
      const serialized = this.serialize(state);
      sessionStorage.setItem(key, serialized);
    } catch (error) {
      console.warn("Failed to save display mode to sessionStorage:", error);
    }
  }

  /**
   * Load display mode state from sessionStorage
   * Requirements: 18.2, 18.3
   */
  loadFromStorage(): DisplayModeState | null {
    try {
      const key = this.getStorageKey(new Date());
      const stored = sessionStorage.getItem(key);

      if (!stored) {
        return null;
      }

      const state = this.deserialize(stored);

      // Verify it's from today (Req 18.4)
      if (!this.isFromToday(state)) {
        sessionStorage.removeItem(key);
        return null;
      }

      return state;
    } catch (error) {
      console.warn("Failed to load display mode from sessionStorage:", error);
      return null;
    }
  }
}
