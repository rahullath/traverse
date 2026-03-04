# Runbook: Triage Mirror Stateless

## Overview

This runbook provides troubleshooting steps and solutions for common issues with the Triage Mirror Stateless feature.

## Quick Reference

| Issue | Severity | First Response |
|-------|----------|----------------|
| Mirror UI not loading | High | Check feature flags |
| Recalculation timeout | Medium | Check PlanBuilder performance |
| Completion not persisting | High | Check database connection |
| Triage mode not activating | Low | Verify runway calculation |
| State prompt not showing | Low | Check last_state_declaration timestamp |

## Common Issues

### 1. Mirror UI Not Loading

**Symptoms:**
- Users see 404 or blank page at `/daily-plan/mirror`
- Error in console: "Feature not enabled"

**Diagnosis:**

```bash
# Check feature flag status
curl https://your-app.vercel.app/api/feature-flags

# Check Vercel environment variables
vercel env ls
```

**Resolution:**

1. Verify `TRIAGE_MIRROR_ENABLED=true` in Vercel
2. Check user sampling logic in `src/lib/feature-flags.ts`
3. Clear browser cache and retry
4. Check if user is in rollout percentage

**Prevention:**
- Monitor feature flag status in deployment pipeline
- Add health check endpoint for feature flags

---

### 2. Recalculation Timeout

**Symptoms:**
- Users see "Recalculation failed" error
- Recalculation takes >4 seconds
- 408 Request Timeout in logs

**Diagnosis:**

```sql
-- Check for users with many anchors
SELECT user_id, COUNT(*) as anchor_count
FROM manual_anchors
WHERE date = CURRENT_DATE
GROUP BY user_id
HAVING COUNT(*) > 6;

-- Check PlanBuilder performance
SELECT 
  user_id,
  created_at,
  (SELECT COUNT(*) FROM time_blocks WHERE daily_plan_id = daily_plans.id) as block_count
FROM daily_plans
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
```

**Resolution:**

1. **Immediate:** Increase timeout temporarily
   ```bash
   # In Vercel, set:
   RECALC_TIMEOUT_MS=8000
   ```

2. **Short-term:** Optimize PlanBuilder queries
   - Check for N+1 queries
   - Add database indexes if needed
   - Profile slow queries

3. **Long-term:** Implement background job for recalculation
   - Move recalc to async queue
   - Return immediately with "Processing..." status
   - Poll for completion

**Prevention:**
- Monitor recalculation latency (p95, p99)
- Alert when p95 >3s
- Limit anchors per day to 10

---

### 3. Completion Status Not Persisting

**Symptoms:**
- User marks block complete, but status reverts on refresh
- Database shows status='pending' after update
- Error in logs: "Failed to update time_block"

**Diagnosis:**

```sql
-- Check recent completion updates
SELECT 
  id,
  user_id,
  status,
  metadata->>'completed_at' as completed_at,
  updated_at
FROM time_blocks
WHERE updated_at > NOW() - INTERVAL '1 hour'
AND status IN ('completed', 'skipped')
ORDER BY updated_at DESC
LIMIT 20;

-- Check for RLS policy issues
SELECT * FROM time_blocks WHERE id = 'block_id_here';
```

**Resolution:**

1. **Check authentication:**
   ```typescript
   // Verify serverAuth.requireAuth() is called
   const user = await serverAuth.requireAuth();
   ```

2. **Check RLS policies:**
   ```sql
   -- Verify user can update their blocks
   SELECT * FROM time_blocks 
   WHERE id = 'block_id' 
   AND user_id = 'user_id';
   ```

3. **Check for race conditions:**
   - Add optimistic locking with `updated_at` check
   - Implement retry logic with exponential backoff

4. **Check metadata structure:**
   ```typescript
   // Ensure metadata is valid JSON
   const metadata = {
     ...existingMetadata,
     completed_at: new Date().toISOString(),
     completed_by: userId
   };
   ```

**Prevention:**
- Add integration tests for completion persistence
- Monitor completion update success rate
- Add client-side retry logic

---

### 4. Triage Mode Not Activating

**Symptoms:**
- User has insufficient runway but no triage prompt
- Runway calculation returns null
- Triage state shows `active: false`

**Diagnosis:**

```typescript
// Check runway calculation
const runway = timePhysicsService.calculateRunway(timeBlocks, currentTime);
console.log('Runway:', runway);

// Check triage activation logic
const shouldActivate = triageService.shouldActivateTriage(runway);
console.log('Should activate:', shouldActivate);
```

**Resolution:**

1. **Verify anchors exist:**
   ```sql
   SELECT * FROM time_blocks
   WHERE user_id = 'user_id'
   AND date = CURRENT_DATE
   AND metadata->>'role'->>'type' = 'anchor'
   AND start_time > NOW();
   ```

2. **Check commitment envelope:**
   ```sql
   SELECT * FROM time_blocks
   WHERE metadata->>'anchor_id' = 'anchor_id'
   ORDER BY start_time;
   ```

3. **Verify runway calculation:**
   - Check that `next_anchor_start > current_time`
   - Check that `required_duration` is calculated correctly
   - Check for timezone issues

4. **Check triage activation condition:**
   ```typescript
   // Should activate when runway < required_duration
   if (runway.runway !== null && 
       runway.required_duration !== null &&
       runway.runway < runway.required_duration) {
     // Activate triage
   }
   ```

**Prevention:**
- Add unit tests for edge cases (no anchors, past anchors)
- Monitor triage activation rate
- Alert if activation rate <5% or >50%

---

### 5. State Declaration Prompt Not Showing

**Symptoms:**
- User opens Mirror UI but no state prompt appears
- State prompt should show but doesn't
- `showStatePrompt: false` in API response

**Diagnosis:**

```sql
-- Check last state declaration
SELECT 
  user_id,
  preferences->'last_state_declaration'->>'state' as last_state,
  preferences->'last_state_declaration'->>'timestamp' as last_timestamp
FROM user_preferences
WHERE user_id = 'user_id';

-- Check for nearby anchors
SELECT * FROM time_blocks
WHERE user_id = 'user_id'
AND date = CURRENT_DATE
AND metadata->>'role'->>'type' = 'anchor'
AND start_time BETWEEN NOW() - INTERVAL '30 minutes' AND NOW() + INTERVAL '2 hours';
```

**Resolution:**

1. **Check last declaration timestamp:**
   ```typescript
   // Should show if >30 minutes since last declaration
   const minutesSince = (now - lastDeclaration.timestamp) / 60000;
   if (minutesSince < 30) {
     // Don't show prompt
   }
   ```

2. **Check anchor proximity:**
   ```typescript
   // Should show if within 2 hours of anchor
   const nearbyAnchors = timeBlocks.filter(block => {
     const minutesUntil = (block.startTime - now) / 60000;
     return minutesUntil >= -30 && minutesUntil <= 120;
   });
   ```

3. **Clear last declaration (if stuck):**
   ```sql
   UPDATE user_preferences
   SET preferences = preferences - 'last_state_declaration'
   WHERE user_id = 'user_id';
   ```

**Prevention:**
- Add debug logging for state prompt logic
- Monitor state prompt show rate
- Add manual "Declare State" button as fallback

---

### 6. Inline Editing Not Working

**Symptoms:**
- Edit button not visible
- Edit form doesn't open
- Changes don't save
- Error: "Feature not enabled"

**Diagnosis:**

```bash
# Check feature flag
echo $INLINE_EDITING_ENABLED

# Check edit mode state
# In browser console:
console.log('Edit mode:', editMode);
```

**Resolution:**

1. **Check feature flag:**
   ```bash
   # In Vercel, verify:
   INLINE_EDITING_ENABLED=true
   ```

2. **Check edit mode toggle:**
   ```typescript
   // Verify edit mode is enabled in UI
   const [editMode, setEditMode] = useState(false);
   ```

3. **Check edit API endpoint:**
   ```bash
   curl -X PATCH https://your-app.vercel.app/api/time-blocks/block_id/edit \
     -H "Content-Type: application/json" \
     -d '{"start_time": "2026-03-01T14:00:00Z"}'
   ```

4. **Check for validation errors:**
   - Verify time format is ISO 8601
   - Verify duration is 5-480 minutes
   - Verify end_time > start_time

**Prevention:**
- Add client-side validation before API call
- Show validation errors in UI
- Add integration tests for edit endpoint

---

### 7. Performance Degradation

**Symptoms:**
- Mirror UI loads slowly (>2s)
- Runway calculation takes >100ms
- Recalculation takes >4s
- High database CPU usage

**Diagnosis:**

```sql
-- Check slow queries
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check database connections
SELECT COUNT(*) FROM pg_stat_activity;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Resolution:**

1. **Optimize queries:**
   - Add indexes on frequently queried fields
   - Reduce N+1 queries
   - Use `select()` to limit returned fields

2. **Add caching:**
   ```typescript
   // Cache runway calculation for 30 seconds
   const cachedRunway = useMemo(
     () => calculateRunway(timeBlocks, currentTime),
     [timeBlocks, Math.floor(currentTime.getTime() / 30000)]
   );
   ```

3. **Implement pagination:**
   - Limit time blocks to current day only
   - Lazy load past/future blocks

4. **Optimize bundle size:**
   ```bash
   # Analyze bundle
   npm run build
   npx vite-bundle-visualizer
   ```

**Prevention:**
- Monitor query performance
- Set up performance budgets
- Regular performance audits

---

### 8. Database Connection Issues

**Symptoms:**
- Error: "Connection pool exhausted"
- Error: "Too many connections"
- Intermittent 500 errors

**Diagnosis:**

```sql
-- Check active connections
SELECT 
  datname,
  COUNT(*) as connections
FROM pg_stat_activity
GROUP BY datname;

-- Check connection pool settings
SHOW max_connections;
```

**Resolution:**

1. **Increase connection pool size:**
   ```typescript
   // In Supabase client config
   const supabase = createClient(url, key, {
     db: {
       pool: {
         min: 2,
         max: 10
       }
     }
   });
   ```

2. **Close idle connections:**
   ```sql
   -- Kill idle connections
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
   AND state_change < NOW() - INTERVAL '5 minutes';
   ```

3. **Implement connection pooling:**
   - Use Supabase connection pooler
   - Configure pgBouncer if self-hosted

**Prevention:**
- Monitor connection pool usage
- Alert when >80% of pool used
- Implement connection retry logic

---

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Error Rate**
   - Target: <1%
   - Alert: >2%
   - Dashboard: Vercel Analytics

2. **Performance**
   - Runway calc p95: <100ms (alert >150ms)
   - Recalc p95: <4s (alert >6s)
   - API response p95: <500ms (alert >1s)

3. **User Engagement**
   - Triage activation rate: 10-30% (alert <5% or >50%)
   - Completion tracking usage: >50% (alert <20%)
   - State declaration usage: >30% (alert <10%)

4. **Database**
   - Connection pool usage: <80% (alert >90%)
   - Query latency p95: <100ms (alert >200ms)
   - Table size growth: <10MB/day (alert >50MB/day)

### Alert Configuration

```yaml
# Example alert config (adjust for your monitoring service)
alerts:
  - name: High Error Rate
    condition: error_rate > 0.02
    severity: critical
    notification: pagerduty

  - name: Slow Recalculation
    condition: recalc_p95 > 6000
    severity: warning
    notification: slack

  - name: Low Triage Activation
    condition: triage_activation_rate < 0.05
    severity: info
    notification: slack
```

## Escalation

### Level 1: On-Call Engineer
- Investigate using this runbook
- Attempt resolution within 30 minutes
- Escalate if unresolved or critical

### Level 2: Engineering Lead
- Review diagnosis and attempted solutions
- Coordinate with team for complex issues
- Decide on rollback if necessary

### Level 3: CTO
- Critical production issues
- Rollback decisions
- Customer communication

## Post-Incident

### Incident Report Template

```markdown
# Incident Report: [Title]

**Date:** YYYY-MM-DD
**Duration:** X hours
**Severity:** Critical/High/Medium/Low
**Impact:** X users affected

## Summary
Brief description of what happened.

## Timeline
- HH:MM - Issue detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Issue resolved

## Root Cause
Technical explanation of what caused the issue.

## Resolution
What was done to fix the issue.

## Prevention
What will be done to prevent this in the future.

## Action Items
- [ ] Action 1 (Owner: Name, Due: Date)
- [ ] Action 2 (Owner: Name, Due: Date)
```

## Additional Resources

- [Deployment Checklist](./DEPLOYMENT_CHECKLIST_TRIAGE_MIRROR.md)
- [Database Schema Documentation](./DATABASE_SCHEMA_TRIAGE_MIRROR.md)
- [Developer Guide](./MIRROR_UI_DEVELOPER_GUIDE.md)
- [User Guide](./MIRROR_UI_USER_GUIDE.md)
- [Monitoring Dashboard](https://your-monitoring-service.com)
- [Supabase Dashboard](https://app.supabase.com)
- [Vercel Dashboard](https://vercel.com/dashboard)
