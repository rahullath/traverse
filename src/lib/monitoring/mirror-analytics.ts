// src/lib/monitoring/mirror-analytics.ts
// Mirror V2 opt-in analytics service
// Requirements: 14.2, 14.3, 14.6, 15.1, 15.2, 15.3, 15.4

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export type DisplayIntent =
  | "full_chain"
  | "keystone_focus"
  | "reality_check"
  | "anchor_only"
  | "rest_of_day";

export interface AppOpenEvent {
  event_type: "app_open";
  had_anchor_today: boolean;
  time_until_next_anchor: number | null; // minutes
}

export interface AnchorViewEvent {
  event_type: "anchor_view";
  anchor_id: string;
  anchor_time: string; // ISO string
  viewed_before_anchor: boolean;
  time_until_anchor: number; // minutes
}

export interface KeystoneViewEvent {
  event_type: "keystone_view";
  keystone_type: string;
  display_mode: DisplayIntent;
}

export interface DisplayModeSwitchEvent {
  event_type: "display_mode_switch";
  from_mode: DisplayIntent;
  to_mode: DisplayIntent;
}

export interface RealityCheckRequestEvent {
  event_type: "reality_check_request";
  runway: number;
  required_duration: number;
  anchor_id: string;
}

export interface FeltHelpfulFeedbackEvent {
  event_type: "felt_helpful_feedback";
  response: "yes" | "somewhat" | "not_really";
  date: string; // YYYY-MM-DD
}

export type TelemetryEvent =
  | AppOpenEvent
  | AnchorViewEvent
  | KeystoneViewEvent
  | DisplayModeSwitchEvent
  | RealityCheckRequestEvent
  | FeltHelpfulFeedbackEvent;

export interface InferredAnchorAttendance {
  anchor_id: string;
  anchor_time: Date;
  likely_attended: boolean;
  confidence: "high" | "medium" | "low";
  inference_reason: string;
}

/**
 * Mirror V2 Analytics Service
 * All analytics are OPT-IN by default (enable_usage_analytics = false)
 * Requirements: 14.1, 14.2, 14.3, 14.6, 15.1, 15.2, 15.3, 15.4
 */
export class MirrorAnalyticsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Check if analytics are enabled for user
   * Requirement 14.1, 14.2, 15.1
   */
  async isAnalyticsEnabled(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from("user_preferences")
        .select("enable_usage_analytics")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error checking analytics preference:", error);
        return false; // Default to disabled on error
      }

      return data?.enable_usage_analytics === true;
    } catch (error) {
      console.error("Exception checking analytics preference:", error);
      return false; // Default to disabled on exception
    }
  }

  /**
   * Record app open event (only if analytics enabled)
   * Requirement 14.3
   */
  async recordAppOpen(
    userId: string,
    hadAnchorToday: boolean,
    timeUntilNextAnchor: number | null,
  ): Promise<void> {
    const enabled = await this.isAnalyticsEnabled(userId);
    if (!enabled) {
      return; // Silently skip if analytics disabled
    }

    try {
      const event: AppOpenEvent = {
        event_type: "app_open",
        had_anchor_today: hadAnchorToday,
        time_until_next_anchor: timeUntilNextAnchor,
      };

      await this.supabase.from("mirror_telemetry_events").insert({
        user_id: userId,
        event_type: event.event_type,
        event_data: event as any,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Fail silently - don't block user experience
      console.error("Error recording app_open event:", error);
    }
  }

  /**
   * Record anchor view event (only if analytics enabled)
   * Requirement 14.3
   */
  async recordAnchorView(
    userId: string,
    anchorId: string,
    anchorTime: Date,
    currentTime: Date,
  ): Promise<void> {
    const enabled = await this.isAnalyticsEnabled(userId);
    if (!enabled) {
      return; // Silently skip if analytics disabled
    }

    try {
      const timeUntilAnchor = Math.floor(
        (anchorTime.getTime() - currentTime.getTime()) / 60000,
      );
      const viewedBeforeAnchor = currentTime < anchorTime;

      const event: AnchorViewEvent = {
        event_type: "anchor_view",
        anchor_id: anchorId,
        anchor_time: anchorTime.toISOString(),
        viewed_before_anchor: viewedBeforeAnchor,
        time_until_anchor: timeUntilAnchor,
      };

      await this.supabase.from("mirror_telemetry_events").insert({
        user_id: userId,
        event_type: event.event_type,
        event_data: event as any,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Fail silently - don't block user experience
      console.error("Error recording anchor_view event:", error);
    }
  }

  /**
   * Record keystone view event (only if analytics enabled)
   * Requirement 14.3
   */
  async recordKeystoneView(
    userId: string,
    keystoneType: string,
    displayMode: DisplayIntent,
  ): Promise<void> {
    const enabled = await this.isAnalyticsEnabled(userId);
    if (!enabled) {
      return; // Silently skip if analytics disabled
    }

    try {
      const event: KeystoneViewEvent = {
        event_type: "keystone_view",
        keystone_type: keystoneType,
        display_mode: displayMode,
      };

      await this.supabase.from("mirror_telemetry_events").insert({
        user_id: userId,
        event_type: event.event_type,
        event_data: event as any,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Fail silently - don't block user experience
      console.error("Error recording keystone_view event:", error);
    }
  }

  /**
   * Record display mode switch (only if analytics enabled)
   * Requirement 14.3
   */
  async recordDisplayModeSwitch(
    userId: string,
    fromMode: DisplayIntent,
    toMode: DisplayIntent,
  ): Promise<void> {
    const enabled = await this.isAnalyticsEnabled(userId);
    if (!enabled) {
      return; // Silently skip if analytics disabled
    }

    try {
      const event: DisplayModeSwitchEvent = {
        event_type: "display_mode_switch",
        from_mode: fromMode,
        to_mode: toMode,
      };

      await this.supabase.from("mirror_telemetry_events").insert({
        user_id: userId,
        event_type: event.event_type,
        event_data: event as any,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Fail silently - don't block user experience
      console.error("Error recording display_mode_switch event:", error);
    }
  }

  /**
   * Record reality check request (only if analytics enabled)
   * Requirement 14.3
   */
  async recordRealityCheckRequest(
    userId: string,
    runway: number,
    requiredDuration: number,
    anchorId: string,
  ): Promise<void> {
    const enabled = await this.isAnalyticsEnabled(userId);
    if (!enabled) {
      return; // Silently skip if analytics disabled
    }

    try {
      const event: RealityCheckRequestEvent = {
        event_type: "reality_check_request",
        runway,
        required_duration: requiredDuration,
        anchor_id: anchorId,
      };

      await this.supabase.from("mirror_telemetry_events").insert({
        user_id: userId,
        event_type: event.event_type,
        event_data: event as any,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Fail silently - don't block user experience
      console.error("Error recording reality_check_request event:", error);
    }
  }

  /**
   * Infer anchor attendance from app opens (only if analytics enabled)
   * Returns null if analytics disabled
   * Requirement 15.2
   */
  async inferAnchorAttendance(
    userId: string,
    anchorId: string,
    anchorTime: Date,
  ): Promise<InferredAnchorAttendance | null> {
    const enabled = await this.isAnalyticsEnabled(userId);
    if (!enabled) {
      return null; // Return null if analytics disabled
    }

    try {
      // Look for app opens within 30 minutes after anchor time
      const windowStart = new Date(anchorTime.getTime() + 30 * 60000); // +30 min
      const windowEnd = new Date(anchorTime.getTime() + 120 * 60000); // +2 hours

      const { data: events, error } = await this.supabase
        .from("mirror_telemetry_events")
        .select("*")
        .eq("user_id", userId)
        .eq("event_type", "app_open")
        .gte("timestamp", windowStart.toISOString())
        .lte("timestamp", windowEnd.toISOString());

      if (error) {
        console.error("Error querying telemetry events:", error);
        return null;
      }

      if (!events || events.length === 0) {
        return {
          anchor_id: anchorId,
          anchor_time: anchorTime,
          likely_attended: false,
          confidence: "medium",
          inference_reason: "No app opens within 2 hours after anchor",
        };
      }

      return {
        anchor_id: anchorId,
        anchor_time: anchorTime,
        likely_attended: true,
        confidence: "high",
        inference_reason: `App opened ${events.length} time(s) after anchor`,
      };
    } catch (error) {
      console.error("Error inferring anchor attendance:", error);
      return null;
    }
  }

  /**
   * Check if completion metrics should be recorded
   * Requires BOTH enable_usage_analytics AND show_completion_controls
   * Requirement 15.3, 15.4
   */
  shouldRecordCompletionMetrics(
    enableAnalytics: boolean,
    showCompletionControls: boolean,
  ): boolean {
    return enableAnalytics && showCompletionControls;
  }
}
