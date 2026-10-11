// src/lib/monitoring/telemetry-serializer.ts
// Serializer for Mirror V2 telemetry events
// Requirements: 23.1, 23.2, 23.3, 23.4

import type { TelemetryEvent } from "./mirror-analytics";

export interface SerializedTelemetryEvent {
  timestamp: string; // ISO 8601 format
  event_type: string;
  event_data: Record<string, any>;
}

/**
 * TelemetrySerializer
 * Handles serialization, deserialization, and validation of telemetry events
 * Requirements: 23.1, 23.2, 23.3, 23.4
 */
export class TelemetrySerializer {
  /**
   * Serialize telemetry event to JSON
   * Requirement 23.1
   */
  static serialize(event: TelemetryEvent): string {
    const serialized: SerializedTelemetryEvent = {
      timestamp: new Date().toISOString(),
      event_type: event.event_type,
      event_data: event as any,
    };

    return JSON.stringify(serialized);
  }

  /**
   * Deserialize JSON to telemetry event
   * Requirement 23.3
   */
  static deserialize(json: string): TelemetryEvent {
    const parsed = JSON.parse(json) as SerializedTelemetryEvent;

    // Validate before returning
    this.validate(parsed);

    return parsed.event_data as TelemetryEvent;
  }

  /**
   * Validate telemetry event structure
   * Requirement 23.2, 23.4
   */
  static validate(event: SerializedTelemetryEvent): void {
    // Check required fields (Requirement 23.2)
    if (!event.timestamp) {
      throw new Error("Telemetry event missing required field: timestamp");
    }

    if (!event.event_type) {
      throw new Error("Telemetry event missing required field: event_type");
    }

    if (!event.event_data) {
      throw new Error("Telemetry event missing required field: event_data");
    }

    // Validate timestamp format (Requirement 23.4)
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (!timestampRegex.test(event.timestamp)) {
      throw new Error(
        `Invalid timestamp format: ${event.timestamp}. Expected ISO 8601 format.`,
      );
    }

    // Validate event_type values (Requirement 23.4)
    const validEventTypes = [
      "app_open",
      "anchor_view",
      "keystone_view",
      "display_mode_switch",
      "reality_check_request",
      "felt_helpful_feedback",
    ];

    if (!validEventTypes.includes(event.event_type)) {
      throw new Error(
        `Invalid event_type: ${event.event_type}. Must be one of: ${validEventTypes.join(", ")}`,
      );
    }

    // Validate event_data is an object
    if (typeof event.event_data !== "object" || event.event_data === null) {
      throw new Error("event_data must be a non-null object");
    }
  }

  /**
   * Validate and serialize in one step
   * Useful for API endpoints
   */
  static validateAndSerialize(event: TelemetryEvent): string {
    const serialized: SerializedTelemetryEvent = {
      timestamp: new Date().toISOString(),
      event_type: event.event_type,
      event_data: event as any,
    };

    // Validate before serializing
    this.validate(serialized);

    return JSON.stringify(serialized);
  }

  /**
   * Batch serialize multiple events
   * Useful for batched telemetry uploads
   */
  static serializeBatch(events: TelemetryEvent[]): string {
    const serialized = events.map((event) => ({
      timestamp: new Date().toISOString(),
      event_type: event.event_type,
      event_data: event as any,
    }));

    // Validate all events
    serialized.forEach((event) => this.validate(event));

    return JSON.stringify(serialized);
  }

  /**
   * Deserialize batch of events
   */
  static deserializeBatch(json: string): TelemetryEvent[] {
    const parsed = JSON.parse(json) as SerializedTelemetryEvent[];

    if (!Array.isArray(parsed)) {
      throw new Error("Batch deserialization requires an array");
    }

    // Validate all events
    parsed.forEach((event) => this.validate(event));

    return parsed.map((event) => event.event_data as TelemetryEvent);
  }
}
