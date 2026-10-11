// src/lib/monitoring/analytics.ts
// Analytics and monitoring service for triage-mirror-stateless feature

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface EngagementEvent {
  event: string;
  userId: string;
  timestamp: Date;
  properties?: Record<string, any>;
}

export interface ErrorEvent {
  endpoint: string;
  error: string;
  statusCode: number;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Analytics service for tracking performance and user engagement
 * Requirements: All (monitoring)
 */
export class AnalyticsService {
  private static instance: AnalyticsService;
  private metrics: PerformanceMetric[] = [];
  private events: EngagementEvent[] = [];
  private errors: ErrorEvent[] = [];

  private constructor() {}

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Track performance metric
   */
  trackMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Metric] ${metric.name}: ${metric.value}ms`,
        metric.metadata,
      );
    }

    // In production, send to analytics service (e.g., PostHog, Mixpanel)
    // this.sendToAnalytics('metric', metric);
  }

  /**
   * Track user engagement event
   */
  trackEvent(event: EngagementEvent): void {
    this.events.push(event);

    if (process.env.NODE_ENV === "development") {
      console.log(`[Event] ${event.event}`, event.properties);
    }

    // In production, send to analytics service
    // this.sendToAnalytics('event', event);
  }

  /**
   * Track error
   */
  trackError(error: ErrorEvent): void {
    this.errors.push(error);

    console.error(`[Error] ${error.endpoint}: ${error.error}`, error.metadata);

    // In production, send to error tracking service (e.g., Sentry)
    // this.sendToErrorTracking(error);
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(metricName: string): {
    p50: number;
    p95: number;
    p99: number;
    count: number;
  } {
    const filtered = this.metrics
      .filter((m) => m.name === metricName)
      .map((m) => m.value)
      .sort((a, b) => a - b);

    if (filtered.length === 0) {
      return { p50: 0, p95: 0, p99: 0, count: 0 };
    }

    const p50Index = Math.floor(filtered.length * 0.5);
    const p95Index = Math.floor(filtered.length * 0.95);
    const p99Index = Math.floor(filtered.length * 0.99);

    return {
      p50: filtered[p50Index],
      p95: filtered[p95Index],
      p99: filtered[p99Index],
      count: filtered.length,
    };
  }

  /**
   * Get error rate for endpoint
   */
  getErrorRate(endpoint: string, timeWindowMs: number = 3600000): number {
    const now = Date.now();
    const recentErrors = this.errors.filter(
      (e) =>
        e.endpoint === endpoint && now - e.timestamp.getTime() < timeWindowMs,
    );

    const totalRequests = this.events.filter(
      (e) =>
        e.event === "api_request" &&
        e.properties?.endpoint === endpoint &&
        now - e.timestamp.getTime() < timeWindowMs,
    ).length;

    if (totalRequests === 0) return 0;
    return recentErrors.length / totalRequests;
  }

  /**
   * Clear old data (call periodically to prevent memory leaks)
   */
  clearOldData(maxAgeMs: number = 86400000): void {
    const cutoff = Date.now() - maxAgeMs;
    this.metrics = this.metrics.filter((m) => m.timestamp.getTime() > cutoff);
    this.events = this.events.filter((e) => e.timestamp.getTime() > cutoff);
    this.errors = this.errors.filter((e) => e.timestamp.getTime() > cutoff);
  }
}

/**
 * Performance timer utility
 */
export class PerformanceTimer {
  private startTime: number;
  private name: string;
  private userId?: string;
  private metadata?: Record<string, any>;

  constructor(name: string, userId?: string, metadata?: Record<string, any>) {
    this.name = name;
    this.userId = userId;
    this.metadata = metadata;
    this.startTime = performance.now();
  }

  /**
   * End timer and track metric
   */
  end(): number {
    const duration = performance.now() - this.startTime;

    AnalyticsService.getInstance().trackMetric({
      name: this.name,
      value: duration,
      timestamp: new Date(),
      userId: this.userId,
      metadata: this.metadata,
    });

    return duration;
  }
}

/**
 * Track API request
 */
export function trackApiRequest(
  endpoint: string,
  method: string,
  userId?: string,
  metadata?: Record<string, any>,
): void {
  AnalyticsService.getInstance().trackEvent({
    event: "api_request",
    userId: userId || "anonymous",
    timestamp: new Date(),
    properties: {
      endpoint,
      method,
      ...metadata,
    },
  });
}

/**
 * Track API error
 */
export function trackApiError(
  endpoint: string,
  error: string,
  statusCode: number,
  userId?: string,
  metadata?: Record<string, any>,
): void {
  AnalyticsService.getInstance().trackError({
    endpoint,
    error,
    statusCode,
    userId,
    timestamp: new Date(),
    metadata,
  });
}
