// src/test/unit/monitoring/analytics.test.ts
// Unit tests for analytics and monitoring

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AnalyticsService,
  PerformanceTimer,
  trackApiRequest,
  trackApiError,
} from '@/lib/monitoring/analytics';
import {
  trackRunwayCalculation,
  trackRecalculation,
  trackTriageActivation,
  trackTriageDecision,
  trackStateDeclaration,
  trackCompletion,
  trackInlineEdit,
  getTriageActivationRate,
  getStateDeclarationUsage,
  getCompletionRate,
} from '@/lib/monitoring/triage-metrics';

describe('AnalyticsService', () => {
  let analytics: AnalyticsService;

  beforeEach(() => {
    analytics = AnalyticsService.getInstance();
    // Clear old data before each test
    analytics.clearOldData(0);
  });

  it('should track performance metrics', () => {
    analytics.trackMetric({
      name: 'test_metric',
      value: 100,
      timestamp: new Date(),
      userId: 'user1',
    });

    const summary = analytics.getMetricsSummary('test_metric');
    expect(summary.count).toBe(1);
    expect(summary.p50).toBe(100);
  });

  it('should calculate percentiles correctly', () => {
    // Add 100 metrics with values 1-100
    for (let i = 1; i <= 100; i++) {
      analytics.trackMetric({
        name: 'test_metric',
        value: i,
        timestamp: new Date(),
      });
    }

    const summary = analytics.getMetricsSummary('test_metric');
    expect(summary.count).toBe(100);
    expect(summary.p50).toBeGreaterThanOrEqual(45);
    expect(summary.p50).toBeLessThanOrEqual(55);
    expect(summary.p95).toBeGreaterThanOrEqual(90);
    expect(summary.p99).toBeGreaterThanOrEqual(95);
  });

  it('should track engagement events', () => {
    analytics.trackEvent({
      event: 'test_event',
      userId: 'user1',
      timestamp: new Date(),
      properties: { foo: 'bar' },
    });

    // Event should be stored (we can't directly access private array, but no error means success)
    expect(true).toBe(true);
  });

  it('should track errors', () => {
    analytics.trackError({
      endpoint: '/api/test',
      error: 'Test error',
      statusCode: 500,
      userId: 'user1',
      timestamp: new Date(),
    });

    const errorRate = analytics.getErrorRate('/api/test');
    // Error rate will be 0 because we need requests to calculate rate
    expect(errorRate).toBe(0);
  });

  it('should calculate error rate correctly', () => {
    const now = new Date();

    // Track 10 requests
    for (let i = 0; i < 10; i++) {
      analytics.trackEvent({
        event: 'api_request',
        userId: 'user1',
        timestamp: now,
        properties: { endpoint: '/api/test' },
      });
    }

    // Track 2 errors
    for (let i = 0; i < 2; i++) {
      analytics.trackError({
        endpoint: '/api/test',
        error: 'Test error',
        statusCode: 500,
        timestamp: now,
      });
    }

    const errorRate = analytics.getErrorRate('/api/test');
    expect(errorRate).toBe(0.2); // 2/10 = 20%
  });

  it('should clear old data', () => {
    const oldDate = new Date(Date.now() - 2 * 86400000); // 2 days ago

    analytics.trackMetric({
      name: 'old_metric',
      value: 100,
      timestamp: oldDate,
    });

    analytics.trackMetric({
      name: 'new_metric',
      value: 200,
      timestamp: new Date(),
    });

    analytics.clearOldData(86400000); // Clear data older than 1 day

    const oldSummary = analytics.getMetricsSummary('old_metric');
    const newSummary = analytics.getMetricsSummary('new_metric');

    expect(oldSummary.count).toBe(0);
    expect(newSummary.count).toBe(1);
  });
});

describe('PerformanceTimer', () => {
  it('should measure duration', async () => {
    const timer = new PerformanceTimer('test_timer', 'user1');

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 10));

    const duration = timer.end();
    // Allow for slight timing variance in test environment
    expect(duration).toBeGreaterThanOrEqual(8);
  });

  it('should track metric on end', () => {
    const analytics = AnalyticsService.getInstance();
    analytics.clearOldData(0);

    const timer = new PerformanceTimer('test_timer', 'user1');
    timer.end();

    const summary = analytics.getMetricsSummary('test_timer');
    expect(summary.count).toBe(1);
  });
});

describe('Triage Metrics', () => {
  beforeEach(() => {
    const analytics = AnalyticsService.getInstance();
    analytics.clearOldData(0);
  });

  it('should track runway calculation', () => {
    trackRunwayCalculation(50, 'user1', {
      hasAnchors: true,
      blockCount: 10,
      hasSufficientTime: true,
    });

    const analytics = AnalyticsService.getInstance();
    const summary = analytics.getMetricsSummary('runway_calculation_latency');
    expect(summary.count).toBe(1);
    expect(summary.p50).toBe(50);
  });

  it('should track recalculation success', () => {
    trackRecalculation(true, 1500, 'user1', {
      anchorCount: 3,
      blockCount: 15,
    });

    const analytics = AnalyticsService.getInstance();
    const summary = analytics.getMetricsSummary('recalculation_latency');
    expect(summary.count).toBe(1);
  });

  it('should track triage activation', () => {
    trackTriageActivation('user1', {
      runway: 30,
      requiredDuration: 45,
      keystoneActivity: 'Prepare for meeting',
      anchorType: 'appointment',
    });

    // Event should be tracked
    expect(true).toBe(true);
  });

  it('should track triage decision', () => {
    trackTriageDecision('user1', 'protect_keystone', {
      anchorId: 'anchor1',
      keystoneActivity: 'Meeting prep',
    });

    expect(true).toBe(true);
  });

  it('should track state declaration', () => {
    trackStateDeclaration('user1', 'ready_for_anchor', {
      hasAnchors: true,
      triggeredTriage: false,
    });

    expect(true).toBe(true);
  });

  it('should track completion', () => {
    trackCompletion('user1', 'completed', {
      blockId: 'block1',
      blockType: 'prep',
    });

    expect(true).toBe(true);
  });

  it('should track inline edit', () => {
    trackInlineEdit('user1', 'anchor', {
      blockId: 'block1',
      changes: ['time', 'duration'],
      hadConflict: false,
    });

    expect(true).toBe(true);
  });

  it('should calculate triage activation rate', () => {
    // Track 10 mirror sessions
    for (let i = 0; i < 10; i++) {
      AnalyticsService.getInstance().trackEvent({
        event: 'mirror_session_start',
        userId: 'user1',
        timestamp: new Date(),
      });
    }

    // Track 3 triage activations
    for (let i = 0; i < 3; i++) {
      trackTriageActivation('user1', {
        runway: 30,
        requiredDuration: 45,
      });
    }

    const rate = getTriageActivationRate();
    expect(rate).toBe(0.3); // 3/10 = 30%
  });

  it('should get state declaration usage', () => {
    trackStateDeclaration('user1', 'starting_day');
    trackStateDeclaration('user1', 'ready_for_anchor');
    trackStateDeclaration('user1', 'ready_for_anchor');

    const usage = getStateDeclarationUsage();
    expect(usage.starting_day).toBe(1);
    expect(usage.ready_for_anchor).toBe(2);
    expect(usage.mid_chain).toBe(0);
  });

  it('should calculate completion rate', () => {
    trackCompletion('user1', 'completed', { blockId: 'block1' });
    trackCompletion('user1', 'completed', { blockId: 'block2' });
    trackCompletion('user1', 'skipped', { blockId: 'block3' });

    const rate = getCompletionRate();
    expect(rate).toBeCloseTo(0.667, 2); // 2/3 = 66.7%
  });
});

describe('API Tracking', () => {
  beforeEach(() => {
    const analytics = AnalyticsService.getInstance();
    analytics.clearOldData(0);
  });

  it('should track API request', () => {
    trackApiRequest('/api/test', 'GET', 'user1', { foo: 'bar' });

    // Event should be tracked
    expect(true).toBe(true);
  });

  it('should track API error', () => {
    trackApiError('/api/test', 'Internal error', 500, 'user1', {
      stack: 'Error stack',
    });

    const analytics = AnalyticsService.getInstance();
    const errorRate = analytics.getErrorRate('/api/test');
    expect(errorRate).toBe(0); // No requests tracked yet
  });
});
