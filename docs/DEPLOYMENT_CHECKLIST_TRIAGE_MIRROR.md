# Deployment Checklist: Triage Mirror Stateless

## Pre-Deployment Verification

### 1. Environment Variables

**Vercel Environment Variables to Set:**

```bash
# Performance Timeouts
RECALC_TIMEOUT_MS=4000
RUNWAY_CALC_TIMEOUT_MS=100
TRIAGE_KEYSTONE_TIMEOUT_MS=50

# Feature Flags (set to 'false' initially for staged rollout)
TRIAGE_MIRROR_ENABLED=false
STATE_DECLARATION_ENABLED=false
INLINE_EDITING_ENABLED=false
STATELESS_RECALC_ENABLED=false

# Monitoring (if using external service)
MONITORING_ENDPOINT=https://your-monitoring-service.com/api/events
MONITORING_API_KEY=your_api_key_here

# Existing Variables (verify these are set)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Verification Steps:**

- [ ] Log into Vercel dashboard
- [ ] Navigate to Project Settings → Environment Variables
- [ ] Verify all variables listed above are set for Production environment
- [ ] Verify variables are also set for Preview environment (for testing)
- [ ] Test variable access in staging deployment

### 2. Feature Flags Configuration

**Feature Flag Status:**

| Flag | Initial State | Rollout Phase | Final State |
|------|---------------|---------------|-------------|
| `TRIAGE_MIRROR_ENABLED` | `false` | Enable at 10% → 50% → 100% | `true` |
| `STATE_DECLARATION_ENABLED` | `false` | Enable with TRIAGE_MIRROR | `true` |
| `INLINE_EDITING_ENABLED` | `false` | Enable after 50% rollout | `true` |
| `STATELESS_RECALC_ENABLED` | `false` | Enable after 50% rollout | `true` |

**Verification Steps:**

- [ ] Confirm feature flags are read from environment variables in `src/lib/feature-flags.ts`
- [ ] Test flag toggling in staging environment
- [ ] Verify graceful degradation when flags are disabled
- [ ] Document flag dependencies (e.g., STATE_DECLARATION requires TRIAGE_MIRROR)

### 3. Monitoring and Logging

**Monitoring Endpoints to Verify:**

- [ ] Performance metrics collection active
  - Runway calculation latency (p50, p95, p99)
  - Recalculation success rate and latency
  - API endpoint response times
- [ ] Error tracking configured
  - API endpoint errors logged with context
  - React error boundaries reporting to monitoring service
  - Retry failures tracked
- [ ] User engagement tracking active
  - Triage mode activation rate
  - State declaration usage by type
  - Completion tracking usage
  - Inline edit usage
  - Recalculation frequency

**Verification Steps:**

- [ ] Trigger test events in staging and verify they appear in monitoring dashboard
- [ ] Verify error logs include user_id, endpoint, and error context
- [ ] Confirm PII is not logged (only user_id, no names/emails)
- [ ] Test alert thresholds (error rate >5%, p95 latency >500ms)

### 4. Database Verification

**Schema Verification:**

- [ ] Confirm no migrations are required
- [ ] Verify `time_blocks.metadata` JSONB field exists
- [ ] Verify `user_preferences.preferences` JSONB field exists
- [ ] Test JSONB read/write operations in staging
- [ ] Verify RLS policies are active on both tables

**Data Integrity:**

- [ ] Run test queries to ensure existing data is not affected
- [ ] Verify backward compatibility with existing time_blocks
- [ ] Test with users who have no metadata fields (graceful fallback)

### 5. Testing Verification

**Test Suite Status:**

- [ ] All unit tests passing (npm test)
- [ ] All integration tests passing
- [ ] All e2e tests passing
- [ ] Performance tests meeting targets:
  - Runway calculation <100ms
  - Recalculation <4s
  - Keystone identification <50ms
- [ ] Accessibility tests passing (WCAG 2.1 AA)
- [ ] Security audit completed with no critical issues

**Manual Testing:**

- [ ] Tested on iOS Safari (iPhone)
- [ ] Tested on Android Chrome
- [ ] Tested on desktop Chrome, Firefox, Safari, Edge
- [ ] Tested responsive breakpoints (320px, 640px, 1024px, 1920px)
- [ ] Tested keyboard navigation
- [ ] Tested screen reader (VoiceOver/NVDA)

### 6. Documentation Verification

**Documentation Complete:**

- [ ] User-facing guide published (docs/MIRROR_UI_USER_GUIDE.md)
- [ ] Developer documentation published (docs/MIRROR_UI_DEVELOPER_GUIDE.md)
- [ ] Database schema documentation published (docs/DATABASE_SCHEMA_TRIAGE_MIRROR.md)
- [ ] API endpoint documentation complete
- [ ] Deployment checklist (this document) reviewed

### 7. Security Verification

**Security Checklist:**

- [ ] All API endpoints call `serverAuth.requireAuth()`
- [ ] User ID derived from session, never from request body
- [ ] All database queries filter by `user_id`
- [ ] Input validation on all user-provided data
- [ ] Rate limiting configured on expensive operations
- [ ] No PII in logs (user_id only)
- [ ] HTTPS enforced (Vercel default)
- [ ] CORS configured correctly
- [ ] SQL injection testing passed
- [ ] XSS testing passed

## Deployment Steps

### Phase 1: Staging Deployment

**Timeline: Day 1**

1. **Deploy to Staging:**
   ```bash
   # Merge feature branch to staging
   git checkout staging
   git merge feature/triage-mirror-stateless
   git push origin staging
   ```

2. **Verify Staging Deployment:**
   - [ ] Check Vercel deployment logs for errors
   - [ ] Verify environment variables loaded correctly
   - [ ] Test Mirror UI at `/daily-plan/mirror` (should show feature disabled message)
   - [ ] Enable `TRIAGE_MIRROR_ENABLED=true` in staging environment
   - [ ] Test full user flow in staging

3. **Internal Testing:**
   - [ ] Share staging URL with internal team (3-5 users)
   - [ ] Collect feedback on UX, performance, bugs
   - [ ] Monitor error rates and performance metrics
   - [ ] Fix any critical issues before production

**Success Criteria:**
- Zero critical bugs
- Performance targets met (runway <100ms, recalc <4s)
- Positive feedback from internal testers

### Phase 2: Production Deployment (10% Rollout)

**Timeline: Day 3-5**

1. **Deploy to Production:**
   ```bash
   # Merge staging to main
   git checkout main
   git merge staging
   git push origin main
   ```

2. **Enable Feature for 10% of Users:**
   - [ ] Set `TRIAGE_MIRROR_ENABLED=true` in Vercel production environment
   - [ ] Implement user sampling in `src/lib/feature-flags.ts`:
     ```typescript
     export function isTriageMirrorEnabled(userId: string): boolean {
       const envEnabled = process.env.TRIAGE_MIRROR_ENABLED === 'true';
       if (!envEnabled) return false;
       
       // Enable for 10% of users (deterministic hash)
       const hash = hashUserId(userId);
       return hash % 100 < 10;
     }
     ```
   - [ ] Deploy sampling logic

3. **Monitor 10% Rollout:**
   - [ ] Monitor error rates (target: <1%)
   - [ ] Monitor performance metrics (runway <100ms, recalc <4s)
   - [ ] Monitor user engagement (triage activation rate, completion tracking)
   - [ ] Check for unexpected database load
   - [ ] Review user feedback/support tickets

**Success Criteria:**
- Error rate <1%
- Performance targets met
- No critical bugs reported
- Database performance stable

**Duration: 48 hours minimum**

### Phase 3: Production Deployment (50% Rollout)

**Timeline: Day 7-10**

1. **Increase Rollout to 50%:**
   - [ ] Update sampling logic to 50%:
     ```typescript
     return hash % 100 < 50;
     ```
   - [ ] Deploy updated sampling logic

2. **Enable Additional Features:**
   - [ ] Set `INLINE_EDITING_ENABLED=true`
   - [ ] Set `STATELESS_RECALC_ENABLED=true`
   - [ ] Deploy feature flag updates

3. **Monitor 50% Rollout:**
   - [ ] Monitor error rates (target: <1%)
   - [ ] Monitor performance metrics
   - [ ] Monitor database query performance
   - [ ] Check for increased support tickets
   - [ ] Review user engagement metrics

**Success Criteria:**
- Error rate <1%
- Performance targets met
- No critical bugs reported
- Positive user feedback

**Duration: 72 hours minimum**

### Phase 4: Production Deployment (100% Rollout)

**Timeline: Day 12-14**

1. **Enable for All Users:**
   - [ ] Update sampling logic to 100%:
     ```typescript
     return envEnabled; // No sampling
     ```
   - [ ] Deploy updated sampling logic

2. **Final Verification:**
   - [ ] Monitor error rates for 24 hours
   - [ ] Monitor performance metrics
   - [ ] Check database performance
   - [ ] Review user feedback
   - [ ] Verify all features working as expected

3. **Post-Deployment:**
   - [ ] Update documentation with final deployment date
   - [ ] Archive staging branch
   - [ ] Schedule post-mortem meeting
   - [ ] Document lessons learned

**Success Criteria:**
- Error rate <1%
- Performance targets met
- No critical bugs reported
- Feature adoption >20% within first week

## Rollback Plan

### Immediate Rollback (Critical Issues)

**Trigger Conditions:**
- Error rate >5%
- Database performance degradation
- Critical security vulnerability
- Data corruption detected

**Rollback Steps:**

1. **Disable Feature Flags (Fastest - 30 seconds):**
   ```bash
   # In Vercel dashboard, set:
   TRIAGE_MIRROR_ENABLED=false
   STATE_DECLARATION_ENABLED=false
   INLINE_EDITING_ENABLED=false
   STATELESS_RECALC_ENABLED=false
   ```
   - This immediately disables the feature for all users
   - No code deployment required
   - Users see existing daily plan view

2. **Revert Deployment (If needed - 5 minutes):**
   ```bash
   # In Vercel dashboard:
   # 1. Go to Deployments
   # 2. Find last stable deployment before feature
   # 3. Click "..." → "Promote to Production"
   ```

3. **Verify Rollback:**
   - [ ] Check error rates return to baseline
   - [ ] Verify users can access existing features
   - [ ] Confirm no data loss
   - [ ] Test critical user flows

### Partial Rollback (Non-Critical Issues)

**Trigger Conditions:**
- Error rate 2-5%
- Performance degradation (not critical)
- User feedback indicates UX issues

**Rollback Steps:**

1. **Reduce Rollout Percentage:**
   - Decrease from 100% → 50% → 10%
   - Monitor if issues persist at lower percentage
   - Identify if issue is load-related or logic-related

2. **Disable Specific Features:**
   - Keep `TRIAGE_MIRROR_ENABLED=true`
   - Disable `INLINE_EDITING_ENABLED=false` (if editing causes issues)
   - Disable `STATELESS_RECALC_ENABLED=false` (if recalc causes issues)

### Data Recovery

**No data loss expected** because:
- No schema changes
- All writes are to existing tables
- Metadata fields are additive only

**If data issues occur:**

1. **Identify Affected Users:**
   ```sql
   SELECT user_id, COUNT(*) 
   FROM time_blocks 
   WHERE metadata ? 'visibility' 
   AND updated_at > '2026-03-01'
   GROUP BY user_id;
   ```

2. **Restore from Backup:**
   - Supabase provides point-in-time recovery
   - Restore to timestamp before deployment
   - Contact Supabase support if needed

3. **Clean Up Metadata:**
   ```sql
   -- Remove triage metadata fields (if needed)
   UPDATE time_blocks 
   SET metadata = metadata - 'visibility' - 'filter_reason' - 'completed_at' - 'completed_by'
   WHERE metadata ? 'visibility';
   ```

## Post-Deployment Monitoring

### Week 1 Monitoring

**Daily Checks:**
- [ ] Error rate <1%
- [ ] Performance metrics within targets
- [ ] User engagement metrics trending up
- [ ] Support ticket volume normal
- [ ] Database performance stable

**Metrics to Track:**

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Error Rate | <1% | >2% |
| Runway Calc Latency (p95) | <100ms | >150ms |
| Recalc Latency (p95) | <4s | >6s |
| Triage Activation Rate | 10-30% | <5% or >50% |
| Completion Tracking Usage | >50% of users | <20% |
| API Response Time (p95) | <500ms | >1s |

### Week 2-4 Monitoring

**Weekly Checks:**
- [ ] Review error trends
- [ ] Review performance trends
- [ ] Review user engagement trends
- [ ] Review support ticket themes
- [ ] Identify optimization opportunities

### Long-Term Monitoring

**Monthly Reviews:**
- [ ] Feature adoption rate
- [ ] User retention impact
- [ ] Performance optimization opportunities
- [ ] User feedback themes
- [ ] Technical debt assessment

## Communication Plan

### Internal Communication

**Before Deployment:**
- [ ] Notify engineering team of deployment schedule
- [ ] Notify support team of new feature and common issues
- [ ] Notify product team of rollout plan

**During Deployment:**
- [ ] Post updates in #engineering Slack channel
- [ ] Update status page if issues occur
- [ ] Notify support team of any known issues

**After Deployment:**
- [ ] Send deployment summary to stakeholders
- [ ] Share metrics dashboard with product team
- [ ] Document lessons learned

### User Communication

**Announcement:**
- [ ] In-app announcement banner (optional)
- [ ] Email to active users (optional)
- [ ] Blog post or changelog entry

**Support Resources:**
- [ ] Update help documentation
- [ ] Create FAQ for common questions
- [ ] Train support team on new feature

## Success Metrics

### Technical Success

- [ ] Error rate <1%
- [ ] Performance targets met (runway <100ms, recalc <4s)
- [ ] Zero critical bugs
- [ ] Zero data loss incidents
- [ ] Rollback not required

### User Success

- [ ] Feature adoption >20% within first week
- [ ] Completion tracking usage >50% of users
- [ ] Positive user feedback (>4/5 rating)
- [ ] Support ticket volume normal
- [ ] User retention stable or improved

### Business Success

- [ ] No negative impact on core metrics
- [ ] Improved user engagement with daily planning
- [ ] Reduced support tickets for "plan broke" issues
- [ ] Positive feedback from users with executive dysfunction

## Contacts

**Deployment Lead:** [Name]
**Engineering Lead:** [Name]
**Product Lead:** [Name]
**Support Lead:** [Name]

**Escalation Path:**
1. Engineering Lead (technical issues)
2. Product Lead (user impact decisions)
3. CTO (critical rollback decisions)

## Sign-Off

- [ ] Engineering Lead approval
- [ ] Product Lead approval
- [ ] Security review completed
- [ ] QA sign-off
- [ ] Documentation complete

**Deployment Approved By:** _____________________ Date: _____

**Deployment Executed By:** _____________________ Date: _____

## Appendix

### A. Environment Variable Reference

See `.env.example` for complete list of required variables.

### B. Feature Flag Implementation

See `src/lib/feature-flags.ts` for feature flag logic.

### C. Monitoring Dashboard

Access monitoring dashboard at: [URL]

### D. Runbook

For common issues and resolutions, see: `docs/RUNBOOK_TRIAGE_MIRROR.md`
