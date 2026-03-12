# Staged Rollout Guide: Triage Mirror Stateless

## Overview

This guide provides detailed instructions for implementing and executing a staged rollout of the Triage Mirror Stateless feature. The rollout follows a 10% → 50% → 100% progression with monitoring gates between each phase.

## Rollout Strategy

### Phase Timeline

| Phase   | Percentage    | Duration         | Go/No-Go Criteria                              |
| ------- | ------------- | ---------------- | ---------------------------------------------- |
| Staging | Internal only | 2-3 days         | Zero critical bugs, positive internal feedback |
| Phase 1 | 10%           | 48 hours minimum | Error rate <1%, performance targets met        |
| Phase 2 | 50%           | 72 hours minimum | Error rate <1%, no critical bugs               |
| Phase 3 | 100%          | Ongoing          | Stable metrics, positive user feedback         |

### Rollback Triggers

**Automatic Rollback:**

- Error rate >5%
- Database performance degradation >50%
- Critical security vulnerability detected

**Manual Rollback:**

- Error rate 2-5% sustained for >1 hour
- User complaints >10 per hour
- Performance degradation 20-50%

## Implementation

### 1. User Sampling Logic

Add deterministic user sampling to `src/lib/feature-flags.ts`:

```typescript
/**
 * Feature Flags Configuration with User Sampling
 *
 * Supports gradual rollout by enabling features for a percentage of users
 * based on deterministic hashing of user_id.
 */

export interface FeatureFlags {
  TRIAGE_MIRROR_ENABLED: boolean;
  STATE_DECLARATION_ENABLED: boolean;
  INLINE_EDITING_ENABLED: boolean;
  STATELESS_RECALC_ENABLED: boolean;
}

export interface RolloutConfig {
  enabled: boolean;
  rolloutPercentage: number; // 0-100
}

/**
 * Simple hash function for deterministic user sampling
 * Returns a number between 0-99
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Get rollout configuration from environment
 */
function getRolloutConfig(key: string): RolloutConfig {
  const enabled = getFeatureFlag(key, false);
  const percentageKey = `${key}_ROLLOUT_PERCENTAGE`;
  const percentage = parseInt(process.env[percentageKey] || "100", 10);

  return {
    enabled,
    rolloutPercentage: Math.min(Math.max(percentage, 0), 100),
  };
}

/**
 * Check if feature is enabled for a specific user
 */
export function isFeatureEnabledForUser(
  flag: keyof FeatureFlags,
  userId: string,
): boolean {
  const config = getRolloutConfig(flag);

  // If feature is disabled globally, return false
  if (!config.enabled) {
    return false;
  }

  // If rollout is 100%, return true
  if (config.rolloutPercentage >= 100) {
    return true;
  }

  // If rollout is 0%, return false
  if (config.rolloutPercentage <= 0) {
    return false;
  }

  // Deterministic sampling based on user_id hash
  const userHash = hashUserId(userId);
  return userHash < config.rolloutPercentage;
}

/**
 * Check if Triage Mirror is enabled for user
 */
export function isTriageMirrorEnabledForUser(userId: string): boolean {
  return isFeatureEnabledForUser("TRIAGE_MIRROR_ENABLED", userId);
}

/**
 * Get feature flag value from environment or default
 */
function getFeatureFlag(key: string, defaultValue: boolean = false): boolean {
  if (typeof process !== "undefined" && process.env) {
    const envValue = process.env[key];
    if (envValue !== undefined) {
      return envValue === "true" || envValue === "1";
    }
  }
  return defaultValue;
}

/**
 * Feature flags singleton (for non-user-specific checks)
 */
export const featureFlags: FeatureFlags = {
  TRIAGE_MIRROR_ENABLED: getFeatureFlag("TRIAGE_MIRROR_ENABLED", false),
  STATE_DECLARATION_ENABLED: getFeatureFlag("STATE_DECLARATION_ENABLED", false),
  INLINE_EDITING_ENABLED: getFeatureFlag("INLINE_EDITING_ENABLED", false),
  STATELESS_RECALC_ENABLED: getFeatureFlag("STATELESS_RECALC_ENABLED", false),
};

/**
 * Check if a feature is enabled (global check, no user sampling)
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return featureFlags[flag];
}

/**
 * Get all feature flags
 */
export function getAllFeatureFlags(): FeatureFlags {
  return { ...featureFlags };
}

/**
 * Get rollout status for monitoring
 */
export function getRolloutStatus(): Record<string, RolloutConfig> {
  return {
    TRIAGE_MIRROR_ENABLED: getRolloutConfig("TRIAGE_MIRROR_ENABLED"),
    STATE_DECLARATION_ENABLED: getRolloutConfig("STATE_DECLARATION_ENABLED"),
    INLINE_EDITING_ENABLED: getRolloutConfig("INLINE_EDITING_ENABLED"),
    STATELESS_RECALC_ENABLED: getRolloutConfig("STATELESS_RECALC_ENABLED"),
  };
}
```

### 2. Update Mirror UI Page

Update `src/pages/daily-plan/mirror.astro` to check user-specific feature flag:

```astro
---
import { createServerAuth } from '@/lib/auth/simple-multi-user';
import { isTriageMirrorEnabledForUser } from '@/lib/feature-flags';
import MirrorUIWithErrorBoundary from '@/components/daily-plan/MirrorUIWithErrorBoundary';

const serverAuth = createServerAuth(Astro.cookies);

// Require authentication
let user;
try {
  user = await serverAuth.requireAuth();
} catch (error) {
  return Astro.redirect('/auth/login');
}

// Check if feature is enabled for this user
const isEnabled = isTriageMirrorEnabledForUser(user.id);

if (!isEnabled) {
  // Feature not enabled for this user
  return new Response(null, {
    status: 404,
    statusText: 'Not Found'
  });
}
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mirror View - MeshOS</title>
  </head>
  <body>
    <MirrorUIWithErrorBoundary client:load userId={user.id} />
  </body>
</html>
```

### 3. Update API Endpoints

Add user-specific feature checks to all Mirror API endpoints:

```typescript
// src/pages/api/daily-plan/mirror.ts
import type { APIRoute } from "astro";
import { createServerAuth } from "@/lib/auth/simple-multi-user";
import { isTriageMirrorEnabledForUser } from "@/lib/feature-flags";

export const GET: APIRoute = async ({ cookies }) => {
  const serverAuth = createServerAuth(cookies);

  try {
    const user = await serverAuth.requireAuth();

    // Check if feature is enabled for this user
    if (!isTriageMirrorEnabledForUser(user.id)) {
      return new Response(JSON.stringify({ error: "Feature not available" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ... rest of endpoint logic
  } catch (error) {
    // ... error handling
  }
};
```

Apply the same pattern to:

- `src/pages/api/daily-plan/recalculate.ts`
- `src/pages/api/daily-plan/state.ts`
- `src/pages/api/daily-plan/triage.ts`
- `src/pages/api/time-blocks/[id]/complete.ts`
- `src/pages/api/time-blocks/[id]/edit.ts`
- `src/pages/api/time-blocks/[id]/delete.ts`
- `src/pages/api/time-blocks/insert.ts`

### 4. Environment Variables

Add rollout percentage variables to Vercel:

```bash
# Feature Flags (start disabled)
TRIAGE_MIRROR_ENABLED=false
TRIAGE_MIRROR_ENABLED_ROLLOUT_PERCENTAGE=0

STATE_DECLARATION_ENABLED=false
STATE_DECLARATION_ENABLED_ROLLOUT_PERCENTAGE=0

INLINE_EDITING_ENABLED=false
INLINE_EDITING_ENABLED_ROLLOUT_PERCENTAGE=0

STATELESS_RECALC_ENABLED=false
STATELESS_RECALC_ENABLED_ROLLOUT_PERCENTAGE=0
```

## Rollout Execution

### Phase 0: Staging Deployment

**Timeline: Day 1-2**

1. **Deploy to Staging:**

   ```bash
   git checkout staging
   git merge feature/triage-mirror-stateless
   git push origin staging
   ```

2. **Enable for Staging:**

   ```bash
   # In Vercel staging environment
   TRIAGE_MIRROR_ENABLED=true
   TRIAGE_MIRROR_ENABLED_ROLLOUT_PERCENTAGE=100
   STATE_DECLARATION_ENABLED=true
   INLINE_EDITING_ENABLED=true
   STATELESS_RECALC_ENABLED=true
   ```

3. **Internal Testing:**
   - [ ] Test with 3-5 internal users
   - [ ] Verify all features work end-to-end
   - [ ] Check monitoring dashboard
   - [ ] Review error logs
   - [ ] Collect feedback

4. **Go/No-Go Decision:**
   - ✅ Zero critical bugs
   - ✅ Performance targets met
   - ✅ Positive internal feedback
   - ✅ Monitoring working correctly

### Phase 1: 10% Production Rollout

**Timeline: Day 3-5 (48 hours minimum)**

1. **Deploy to Production:**

   ```bash
   git checkout main
   git merge staging
   git push origin main
   ```

2. **Enable 10% Rollout:**

   ```bash
   # In Vercel production environment
   TRIAGE_MIRROR_ENABLED=true
   TRIAGE_MIRROR_ENABLED_ROLLOUT_PERCENTAGE=10
   STATE_DECLARATION_ENABLED=true
   STATE_DECLARATION_ENABLED_ROLLOUT_PERCENTAGE=10
   INLINE_EDITING_ENABLED=false  # Keep disabled for now
   STATELESS_RECALC_ENABLED=false  # Keep disabled for now
   ```

3. **Monitor for 48 Hours:**

   **Hour 1-4 (Critical Window):**
   - [ ] Check error rate every 15 minutes
   - [ ] Monitor performance metrics
   - [ ] Watch for database issues
   - [ ] Review first user feedback

   **Hour 4-24:**
   - [ ] Check error rate every hour
   - [ ] Monitor performance trends
   - [ ] Review support tickets
   - [ ] Check user engagement metrics

   **Hour 24-48:**
   - [ ] Daily error rate review
   - [ ] Daily performance review
   - [ ] Collect user feedback
   - [ ] Prepare Phase 2 decision

4. **Metrics to Track:**

   | Metric            | Target | Current | Status |
   | ----------------- | ------ | ------- | ------ |
   | Error Rate        | <1%    | \_\_\_  | ⚠️/✅  |
   | Runway Calc p95   | <100ms | \_\_\_  | ⚠️/✅  |
   | Recalc p95        | <4s    | \_\_\_  | ⚠️/✅  |
   | Triage Activation | 10-30% | \_\_\_  | ⚠️/✅  |
   | User Complaints   | <5/day | \_\_\_  | ⚠️/✅  |

5. **Go/No-Go Decision for Phase 2:**
   - ✅ Error rate <1%
   - ✅ Performance targets met
   - ✅ No critical bugs
   - ✅ User feedback neutral or positive
   - ✅ Database performance stable

### Phase 2: 50% Production Rollout

**Timeline: Day 7-10 (72 hours minimum)**

1. **Increase to 50%:**

   ```bash
   # In Vercel production environment
   TRIAGE_MIRROR_ENABLED=true
   TRIAGE_MIRROR_ENABLED_ROLLOUT_PERCENTAGE=50
   STATE_DECLARATION_ENABLED=true
   STATE_DECLARATION_ENABLED_ROLLOUT_PERCENTAGE=50
   INLINE_EDITING_ENABLED=true  # Enable now
   INLINE_EDITING_ENABLED_ROLLOUT_PERCENTAGE=50
   STATELESS_RECALC_ENABLED=true  # Enable now
   STATELESS_RECALC_ENABLED_ROLLOUT_PERCENTAGE=50
   ```

2. **Monitor for 72 Hours:**

   **Hour 1-4 (Critical Window):**
   - [ ] Check error rate every 15 minutes
   - [ ] Monitor database load (5x increase expected)
   - [ ] Watch for performance degradation
   - [ ] Review immediate user feedback

   **Hour 4-24:**
   - [ ] Check error rate every hour
   - [ ] Monitor inline editing usage
   - [ ] Monitor recalculation frequency
   - [ ] Review support tickets

   **Hour 24-72:**
   - [ ] Daily error rate review
   - [ ] Daily performance review
   - [ ] Daily user engagement review
   - [ ] Prepare Phase 3 decision

3. **Additional Metrics for Phase 2:**

   | Metric            | Target       | Current | Status |
   | ----------------- | ------------ | ------- | ------ |
   | Inline Edit Usage | >20%         | \_\_\_  | ⚠️/✅  |
   | Recalc Frequency  | 1-3/user/day | \_\_\_  | ⚠️/✅  |
   | Edit Conflicts    | <5%          | \_\_\_  | ⚠️/✅  |
   | Database CPU      | <70%         | \_\_\_  | ⚠️/✅  |

4. **Go/No-Go Decision for Phase 3:**
   - ✅ Error rate <1%
   - ✅ Performance targets met
   - ✅ No critical bugs
   - ✅ Inline editing working well
   - ✅ Recalculation stable
   - ✅ Database performance stable

### Phase 3: 100% Production Rollout

**Timeline: Day 12-14**

1. **Increase to 100%:**

   ```bash
   # In Vercel production environment
   TRIAGE_MIRROR_ENABLED=true
   TRIAGE_MIRROR_ENABLED_ROLLOUT_PERCENTAGE=100
   STATE_DECLARATION_ENABLED=true
   STATE_DECLARATION_ENABLED_ROLLOUT_PERCENTAGE=100
   INLINE_EDITING_ENABLED=true
   INLINE_EDITING_ENABLED_ROLLOUT_PERCENTAGE=100
   STATELESS_RECALC_ENABLED=true
   STATELESS_RECALC_ENABLED_ROLLOUT_PERCENTAGE=100
   ```

2. **Monitor for 24 Hours:**

   **Hour 1-4 (Critical Window):**
   - [ ] Check error rate every 15 minutes
   - [ ] Monitor database load (2x increase expected)
   - [ ] Watch for performance degradation
   - [ ] Review immediate user feedback

   **Hour 4-24:**
   - [ ] Check error rate every 2 hours
   - [ ] Monitor all metrics
   - [ ] Review support tickets
   - [ ] Collect user feedback

3. **Final Verification:**
   - [ ] Error rate <1%
   - [ ] Performance targets met
   - [ ] No critical bugs
   - [ ] User feedback positive
   - [ ] Feature adoption >20%

4. **Post-Rollout:**
   - [ ] Update documentation with launch date
   - [ ] Send announcement to users (optional)
   - [ ] Schedule post-mortem meeting
   - [ ] Document lessons learned
   - [ ] Plan next iteration

## Monitoring Dashboard

### Key Metrics to Display

Create a real-time dashboard showing:

1. **Rollout Status**
   - Current rollout percentage
   - Number of users with access
   - Feature flag status

2. **Error Metrics**
   - Error rate (last hour, last 24h)
   - Error breakdown by endpoint
   - Top 5 error messages

3. **Performance Metrics**
   - Runway calculation latency (p50, p95, p99)
   - Recalculation latency (p50, p95, p99)
   - API response times (p50, p95, p99)

4. **User Engagement**
   - Triage activation rate
   - State declaration usage
   - Completion tracking usage
   - Inline editing usage
   - Recalculation frequency

5. **Database Metrics**
   - Connection pool usage
   - Query latency
   - Table sizes
   - Active connections

### Example Monitoring Query

```sql
-- Get rollout metrics for last 24 hours
WITH user_activity AS (
  SELECT
    user_id,
    COUNT(*) as mirror_loads,
    COUNT(CASE WHEN metadata->>'visibility' IS NOT NULL THEN 1 END) as state_declarations,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completions
  FROM time_blocks
  WHERE updated_at > NOW() - INTERVAL '24 hours'
  GROUP BY user_id
)
SELECT
  COUNT(DISTINCT user_id) as active_users,
  AVG(mirror_loads) as avg_loads_per_user,
  AVG(state_declarations) as avg_declarations_per_user,
  AVG(completions) as avg_completions_per_user
FROM user_activity;
```

## Rollback Procedures

### Immediate Rollback (Critical)

**When to Use:**

- Error rate >5%
- Database down or severely degraded
- Critical security vulnerability
- Data corruption detected

**Steps:**

1. **Disable Feature Flags (30 seconds):**

   ```bash
   # In Vercel production environment
   TRIAGE_MIRROR_ENABLED=false
   ```

2. **Verify Rollback:**
   - [ ] Check error rate drops to baseline
   - [ ] Verify users can access app
   - [ ] Confirm no data loss

3. **Communicate:**
   - [ ] Notify engineering team
   - [ ] Update status page (if public)
   - [ ] Prepare incident report

### Gradual Rollback (Non-Critical)

**When to Use:**

- Error rate 2-5%
- Performance degradation
- Negative user feedback

**Steps:**

1. **Reduce Rollout Percentage:**

   ```bash
   # Reduce from current to previous phase
   # 100% → 50%
   # 50% → 10%
   # 10% → 0%
   TRIAGE_MIRROR_ENABLED_ROLLOUT_PERCENTAGE=10
   ```

2. **Monitor for 1 Hour:**
   - [ ] Check if error rate improves
   - [ ] Verify performance improves
   - [ ] Review user feedback

3. **Decide Next Steps:**
   - If improved: Investigate root cause, fix, re-rollout
   - If not improved: Full rollback

## Testing Rollout Logic

### Unit Tests

```typescript
// src/test/unit/feature-flags.test.ts
import { describe, it, expect } from "vitest";
import { hashUserId, isFeatureEnabledForUser } from "@/lib/feature-flags";

describe("Feature Flag Rollout", () => {
  it("should hash user IDs deterministically", () => {
    const userId = "user_123";
    const hash1 = hashUserId(userId);
    const hash2 = hashUserId(userId);
    expect(hash1).toBe(hash2);
    expect(hash1).toBeGreaterThanOrEqual(0);
    expect(hash1).toBeLessThan(100);
  });

  it("should enable feature for users below rollout percentage", () => {
    // Mock environment
    process.env.TRIAGE_MIRROR_ENABLED = "true";
    process.env.TRIAGE_MIRROR_ENABLED_ROLLOUT_PERCENTAGE = "50";

    // Test with multiple users
    const results = Array.from({ length: 100 }, (_, i) =>
      isFeatureEnabledForUser("TRIAGE_MIRROR_ENABLED", `user_${i}`),
    );

    const enabledCount = results.filter(Boolean).length;

    // Should be approximately 50% (allow 10% variance)
    expect(enabledCount).toBeGreaterThan(40);
    expect(enabledCount).toBeLessThan(60);
  });

  it("should disable feature when rollout is 0%", () => {
    process.env.TRIAGE_MIRROR_ENABLED = "true";
    process.env.TRIAGE_MIRROR_ENABLED_ROLLOUT_PERCENTAGE = "0";

    expect(isFeatureEnabledForUser("TRIAGE_MIRROR_ENABLED", "user_123")).toBe(
      false,
    );
  });

  it("should enable feature for all when rollout is 100%", () => {
    process.env.TRIAGE_MIRROR_ENABLED = "true";
    process.env.TRIAGE_MIRROR_ENABLED_ROLLOUT_PERCENTAGE = "100";

    expect(isFeatureEnabledForUser("TRIAGE_MIRROR_ENABLED", "user_123")).toBe(
      true,
    );
  });
});
```

### Manual Testing

1. **Test with Specific User IDs:**

   ```bash
   # Find users in each rollout bucket
   node -e "
   const hash = (id) => {
     let h = 0;
     for (let i = 0; i < id.length; i++) {
       h = ((h << 5) - h) + id.charCodeAt(i);
       h = h & h;
     }
     return Math.abs(h) % 100;
   };

   // Find users in 10% bucket
   for (let i = 0; i < 100; i++) {
     const userId = \`user_\${i}\`;
     const h = hash(userId);
     if (h < 10) console.log(\`10% bucket: \${userId} (hash: \${h})\`);
   }
   "
   ```

2. **Test Feature Access:**
   - Log in as user in 10% bucket → should see feature
   - Log in as user in 90% bucket → should not see feature
   - Verify 404 response for users without access

## Communication Templates

### Internal Announcement (Slack)

```
🚀 Triage Mirror Rollout - Phase 1 (10%)

We're rolling out the Triage Mirror feature to 10% of users starting now.

**What to watch:**
- Error rate: https://monitoring-dashboard.com
- Performance: https://monitoring-dashboard.com
- User feedback: #support channel

**Rollback trigger:** Error rate >2% for >1 hour

**Next phase:** 50% rollout in 48 hours if metrics look good

Questions? Ask in #engineering
```

### User Announcement (Optional)

```
📱 New Feature: Mirror View

We're excited to introduce Mirror View - a simplified daily plan interface designed for when plans break mid-day.

**What's new:**
- Real-time plan adaptation
- Quick state declaration
- Inline editing
- One-tap completion tracking

**How to access:**
Visit /daily-plan/mirror or look for "Mirror View" in the navigation.

**Feedback:**
We'd love to hear your thoughts! Reply to this email or contact support.
```

## Success Criteria Summary

### Phase 1 (10%) Success

- ✅ Error rate <1%
- ✅ Performance targets met
- ✅ Zero critical bugs
- ✅ Database stable

### Phase 2 (50%) Success

- ✅ Error rate <1%
- ✅ Performance targets met
- ✅ Zero critical bugs
- ✅ Inline editing working
- ✅ Database stable

### Phase 3 (100%) Success

- ✅ Error rate <1%
- ✅ Performance targets met
- ✅ Zero critical bugs
- ✅ Feature adoption >20%
- ✅ Positive user feedback

## Post-Rollout

### Week 1 Review

- [ ] Review all metrics
- [ ] Collect user feedback
- [ ] Identify optimization opportunities
- [ ] Plan next iteration

### Post-Mortem

- [ ] What went well?
- [ ] What could be improved?
- [ ] What did we learn?
- [ ] Action items for next rollout

## Additional Resources

- [Deployment Checklist](./DEPLOYMENT_CHECKLIST_TRIAGE_MIRROR.md)
- [Runbook](./RUNBOOK_TRIAGE_MIRROR.md)
- [Database Schema](./DATABASE_SCHEMA_TRIAGE_MIRROR.md)
- [Developer Guide](./MIRROR_UI_DEVELOPER_GUIDE.md)
