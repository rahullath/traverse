// src/pages/api/monitoring/metrics.ts
// API endpoint for retrieving monitoring metrics

import type { APIRoute } from 'astro';
import { createServerAuth } from '@/lib/auth/simple-multi-user';
import { AnalyticsService } from '@/lib/monitoring/analytics';
import {
  getTriageActivationRate,
  getStateDeclarationUsage,
  getCompletionRate,
} from '@/lib/monitoring/triage-metrics';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();

    // Only allow admin users to access metrics
    // For now, we'll allow any authenticated user
    // In production, add role-based access control

    const analytics = AnalyticsService.getInstance();
    const url = new URL(request.url);
    const timeWindow = parseInt(url.searchParams.get('timeWindow') || '86400000'); // Default 24h

    // Get performance metrics summaries
    const runwayMetrics = analytics.getMetricsSummary('runway_calculation_latency');
    const recalcMetrics = analytics.getMetricsSummary('recalculation_latency');

    // Get engagement metrics
    const triageActivationRate = getTriageActivationRate(timeWindow);
    const stateDeclarationUsage = getStateDeclarationUsage(timeWindow);
    const completionRate = getCompletionRate(timeWindow);

    // Get error rates
    const mirrorErrorRate = analytics.getErrorRate('/api/daily-plan/mirror', timeWindow);
    const recalcErrorRate = analytics.getErrorRate('/api/daily-plan/recalculate', timeWindow);
    const stateErrorRate = analytics.getErrorRate('/api/daily-plan/state', timeWindow);
    const triageErrorRate = analytics.getErrorRate('/api/daily-plan/triage', timeWindow);

    return new Response(
      JSON.stringify({
        performance: {
          runway_calculation: {
            p50_ms: runwayMetrics.p50,
            p95_ms: runwayMetrics.p95,
            p99_ms: runwayMetrics.p99,
            count: runwayMetrics.count,
          },
          recalculation: {
            p50_ms: recalcMetrics.p50,
            p95_ms: recalcMetrics.p95,
            p99_ms: recalcMetrics.p99,
            count: recalcMetrics.count,
          },
        },
        engagement: {
          triage_activation_rate: triageActivationRate,
          state_declaration_usage: stateDeclarationUsage,
          completion_rate: completionRate,
        },
        errors: {
          mirror_api: mirrorErrorRate,
          recalculate_api: recalcErrorRate,
          state_api: stateErrorRate,
          triage_api: triageErrorRate,
        },
        time_window_ms: timeWindow,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
