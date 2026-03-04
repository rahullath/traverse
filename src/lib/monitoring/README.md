# Monitoring and Analytics System

This directory contains the monitoring and analytics infrastructure for the triage-mirror-stateless feature.

## Overview

The monitoring system tracks:
- **Performance metrics**: Latency percentiles (p50, p95, p99) for critical operations
- **Engagement metrics**: User behavior and feature usage patterns
- **Error rates**: API endpoint reliability and failure tracking

## Architecture

### Core Components

1. **AnalyticsService** (`analytics.ts`)
   - Singleton service for tracking metrics, events, and errors
   - Calculates percentiles and error rates
   - Manages data retention and cleanup

2. **Triage Metrics** (`triage-metrics.ts`)
   - Feature-specific tracking functions
   - Convenience wrappers for common tracking patterns
   - Aggregation functions for dashboards

3. **Performance Timer** (`analytics.ts`)
   - Utility for measuring operation duration
   - Automatically tracks metrics on completion

## Usage

### Tracking Performance

```typescript
import { PerformanceTimer } from '@/lib/monitoring/analytics';

// Start timer
const timer = new PerformanceTimer('operation_name', userId, { metadata });

// Do work...

// End timer and track metric
const durationMs = timer.end();
```

### Tracking Events

```typescript
import { trackStateDeclaration } from '@/lib/monitoring/triage-metrics';

trackStateDeclaration(userId, 'ready_for_anchor', {
  hasAnchors: true,
  triggeredTriage: false,
});
```

### Tracking Errors

```typescript
import { trackApiError } from '@/lib/monitoring/analytics';

trackApiError(
  '/api/daily-plan/mirror',
  error.message,
  500,
  userId,
  { stack: error.stack }
);
```

## Metrics Tracked

### Performance Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| `runway_calculation_latency` | Time to calculate runway | < 100ms (p95) |
| `recalculation_latency` | Time to regenerate plan | < 4000ms (p95) |

### Engagement Events

| Event | Description | Properties |
|-------|-------------|------------|
| `triage_mode_activated` | Triage prompt shown | runway, requiredDuration, keystoneActivity |
| `triage_decision` | User made triage choice | decision, anchorId |
| `state_declaration` | User declared state | state, selectedStepId |
| `block_completion` | Block marked done/skipped | action, blockId, blockType |
| `inline_edit` | User edited block | editType, blockId, changes |
| `mirror_session_start` | User opened Mirror UI | - |
| `mirror_session_end` | User closed Mirror UI | durationMs, interactionCount |

### Error Tracking

Errors are tracked per endpoint with:
- Error message
- Status code
- User ID
- Timestamp
- Stack trace (in metadata)

## API Endpoints

### GET /api/monitoring/metrics

Returns aggregated metrics for a time window.

**Query Parameters:**
- `timeWindow` (optional): Time window in milliseconds (default: 86400000 = 24h)

**Response:**
```json
{
  "performance": {
    "runway_calculation": { "p50_ms": 45, "p95_ms": 89, "p99_ms": 120, "count": 1234 },
    "recalculation": { "p50_ms": 1500, "p95_ms": 3200, "p99_ms": 3800, "count": 456 }
  },
  "engagement": {
    "triage_activation_rate": 0.23,
    "state_declaration_usage": { "starting_day": 45, "ready_for_anchor": 78, ... },
    "completion_rate": 0.87
  },
  "errors": {
    "mirror_api": 0.01,
    "recalculate_api": 0.02,
    "state_api": 0.005,
    "triage_api": 0.003
  }
}
```

### POST /api/monitoring/session

Track Mirror UI session start/end.

**Body:**
```json
{
  "event": "mirror_session_start" | "mirror_session_end",
  "userId": "user_id",
  "durationMs": 45000,
  "interactionCount": 12
}
```

### POST /api/monitoring/interaction

Track user interaction.

**Body:**
```json
{
  "event": "mirror_interaction",
  "userId": "user_id",
  "interactionType": "triage_decision" | "state_declaration" | "completion" | "edit"
}
```

## Dashboard

Access the monitoring dashboard at `/monitoring` (requires authentication).

The dashboard displays:
- Performance metrics with percentiles
- Engagement rates and usage patterns
- Error rates per endpoint
- Auto-refreshes every minute

## Integration

### In API Routes

```typescript
import { trackApiRequest, trackApiError } from '@/lib/monitoring/analytics';
import { trackRunwayCalculation } from '@/lib/monitoring/triage-metrics';

export const GET: APIRoute = async ({ cookies }) => {
  const user = await serverAuth.requireAuth();
  
  trackApiRequest('/api/daily-plan/mirror', 'GET', user.id);
  
  try {
    const timer = new PerformanceTimer('runway_calculation', user.id);
    const runway = calculateRunway(timeBlocks);
    timer.end();
    
    return new Response(JSON.stringify({ runway }), { status: 200 });
  } catch (error) {
    trackApiError('/api/daily-plan/mirror', error.message, 500, user.id);
    throw error;
  }
};
```

### In React Components

```typescript
import { useMirrorSessionTracking } from '@/hooks/useMirrorSessionTracking';

export function MirrorUI() {
  const { trackInteraction } = useMirrorSessionTracking();
  
  const handleTriageDecision = (decision) => {
    trackInteraction('triage_decision');
    // ... handle decision
  };
  
  return <div>...</div>;
}
```

## Data Retention

- Metrics are stored in memory
- Old data is automatically cleared after 24 hours
- In production, integrate with external analytics service (PostHog, Mixpanel, etc.)
- For long-term storage, send metrics to time-series database (InfluxDB, Prometheus, etc.)

## Production Integration

To integrate with external services:

1. **Analytics Service** (PostHog, Mixpanel):
   - Uncomment `sendToAnalytics()` calls in `AnalyticsService`
   - Add API keys to environment variables
   - Configure event schemas

2. **Error Tracking** (Sentry):
   - Uncomment `sendToErrorTracking()` calls
   - Add Sentry DSN to environment
   - Configure error grouping rules

3. **Time-Series Database** (InfluxDB, Prometheus):
   - Add periodic export job
   - Configure retention policies
   - Set up alerting rules

## Testing

Run monitoring tests:

```bash
npm test src/test/unit/monitoring/analytics.test.ts
```

## Performance Considerations

- Metrics are stored in memory (lightweight)
- Automatic cleanup prevents memory leaks
- Async tracking doesn't block main thread
- Dashboard queries are cached for 1 minute

## Security

- Metrics API requires authentication
- User IDs are anonymized in logs
- PII is never tracked in metadata
- Dashboard access can be restricted by role (add RBAC)
