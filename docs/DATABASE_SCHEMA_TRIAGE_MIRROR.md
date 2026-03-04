# Database Schema Documentation: Triage Mirror Stateless

## Overview

The Triage Mirror Stateless feature extends MeshOS's existing database schema without requiring any migrations. All extensions use existing JSONB fields (`metadata` in `time_blocks`, `preferences` in `user_preferences`) to store feature-specific data.

## Schema Impact

**No migrations required.** This feature is fully backward-compatible and uses existing tables with metadata extensions.

## Table Extensions

### 1. time_blocks Table

**Existing Schema:**
```sql
CREATE TABLE time_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  daily_plan_id UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  activity_name TEXT NOT NULL,
  activity_id TEXT,
  block_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  skip_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Metadata JSONB Extensions:**

The `metadata` field is extended with the following structure for triage-mirror-stateless:

```typescript
interface TimeBlockMetadata {
  // Existing V2 fields (already in use)
  role?: {
    type: "anchor" | "chain-step" | "exit-gate" | "recovery";
    required: boolean;
    chain_id?: string;
    gate_conditions?: Array<{
      id: string;
      name: string;
      satisfied: boolean;
    }>;
  };
  chain_id?: string;
  step_id?: string;
  anchor_id?: string;
  location_state?: "at_home" | "not_home";
  commitment_envelope?: {
    envelope_id: string;
    envelope_type: "prep" | "travel_there" | "anchor" | "travel_back" | "recovery";
  };
  original_anchor_type?: "class" | "seminar" | "workshop" | "appointment" | "other";

  // New fields for triage-mirror-stateless
  visibility?: "visible" | "hidden";
  filter_reason?: string;
  completed_at?: string; // ISO 8601 timestamp
  completed_by?: string; // user_id
}
```

**New Fields Explanation:**

- `visibility`: Indicates whether the block should be shown in the filtered timeline based on state declaration
- `filter_reason`: Human-readable explanation of why the block is hidden (for debugging)
- `completed_at`: Timestamp when the block was marked as completed (supplements `status` field)
- `completed_by`: User ID who marked the block complete (for multi-user scenarios)

**Example Metadata:**

```json
{
  "role": {
    "type": "chain-step",
    "required": true,
    "chain_id": "chain_123"
  },
  "chain_id": "chain_123",
  "step_id": "step_456",
  "anchor_id": "anchor_789",
  "commitment_envelope": {
    "envelope_id": "env_abc",
    "envelope_type": "prep"
  },
  "original_anchor_type": "appointment",
  "visibility": "visible",
  "filter_reason": null,
  "completed_at": "2026-03-01T14:30:00Z",
  "completed_by": "user_xyz"
}
```

### 2. user_preferences Table

**Existing Schema:**
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  wake_time TIME,
  sleep_time TIME,
  energy_state TEXT DEFAULT 'medium',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Preferences JSONB Extensions:**

The `preferences` field is extended with the following structure:

```typescript
interface UserPreferences {
  // Existing fields (already in use)
  // ... other preferences ...

  // New fields for triage-mirror-stateless
  recalc_on_open?: boolean;
  last_state_declaration?: {
    state: "starting_day" | "ready_for_anchor" | "mid_chain" | "at_anchor" | "missed_it" | "just_checking";
    selected_step_id?: string;
    timestamp: string; // ISO 8601 timestamp
  };
  intent_signal_dismissed?: {
    timestamp: string; // ISO 8601 timestamp
    session_id: string;
  };
}
```

**New Fields Explanation:**

- `recalc_on_open`: Boolean flag indicating whether to auto-recalculate plan on Mirror UI load
- `last_state_declaration`: Most recent state declaration to prevent re-prompting within 30 minutes
- `intent_signal_dismissed`: Tracks when user dismissed the 7-day absence banner (session-scoped)

**Example Preferences:**

```json
{
  "recalc_on_open": false,
  "last_state_declaration": {
    "state": "ready_for_anchor",
    "timestamp": "2026-03-01T14:00:00Z"
  },
  "intent_signal_dismissed": {
    "timestamp": "2026-03-01T08:00:00Z",
    "session_id": "sess_abc123"
  }
}
```

## Data Access Patterns

### Reading Mirror Data

```typescript
// Fetch daily plan with time blocks
const { data: plan } = await supabase
  .from('daily_plans')
  .select(`
    *,
    time_blocks (*)
  `)
  .eq('user_id', userId)
  .eq('date', today)
  .single();

// Access metadata
const timeBlocks = plan.time_blocks.map(block => ({
  ...block,
  metadata: block.metadata as TimeBlockMetadata
}));
```

### Updating Completion Status

```typescript
// Mark block as completed
await supabase
  .from('time_blocks')
  .update({
    status: 'completed',
    metadata: {
      ...existingMetadata,
      completed_at: new Date().toISOString(),
      completed_by: userId
    }
  })
  .eq('id', blockId)
  .eq('user_id', userId);
```

### Storing State Declaration

```typescript
// Save state declaration to preferences
await supabase
  .from('user_preferences')
  .update({
    preferences: {
      ...existingPreferences,
      last_state_declaration: {
        state: 'ready_for_anchor',
        timestamp: new Date().toISOString()
      }
    }
  })
  .eq('user_id', userId);
```

### Filtering Timeline by Visibility

```typescript
// Filter visible blocks (application-level)
const visibleBlocks = timeBlocks.filter(block => 
  block.metadata?.visibility !== 'hidden'
);
```

## Indexing Considerations

**No new indexes required.** Existing indexes on `time_blocks` and `user_preferences` are sufficient:

- `time_blocks.user_id` (existing)
- `time_blocks.daily_plan_id` (existing)
- `time_blocks.start_time` (existing)
- `user_preferences.user_id` (existing, unique)

JSONB field queries are infrequent and scoped to single-user operations, so GIN indexes on metadata fields are not necessary.

## RLS Policies

**No changes required.** Existing RLS policies on `time_blocks` and `user_preferences` enforce user-level isolation:

```sql
-- time_blocks RLS (existing)
CREATE POLICY "Users can only access their own time blocks"
  ON time_blocks
  FOR ALL
  USING (user_id = auth.uid());

-- user_preferences RLS (existing)
CREATE POLICY "Users can only access their own preferences"
  ON user_preferences
  FOR ALL
  USING (user_id = auth.uid());
```

## Migration Verification

**Verification Steps:**

1. ✅ No new tables created
2. ✅ No new columns added
3. ✅ No schema changes to existing tables
4. ✅ All extensions use existing JSONB fields
5. ✅ Backward compatible with existing data
6. ✅ No breaking changes to existing queries

**Rollback Plan:**

Since no migrations are required, rollback is straightforward:
- Remove feature flag to disable UI
- Existing data remains intact
- No database changes to revert

## Data Validation

**Application-Level Validation:**

All metadata validation happens in the application layer:

```typescript
// Validate state declaration
const VALID_STATES = [
  'starting_day',
  'ready_for_anchor', 
  'mid_chain',
  'at_anchor',
  'missed_it',
  'just_checking'
] as const;

function isValidState(state: string): boolean {
  return VALID_STATES.includes(state as any);
}

// Validate visibility
function isValidVisibility(visibility: string): boolean {
  return visibility === 'visible' || visibility === 'hidden';
}
```

## Storage Impact

**Estimated Storage per User:**

- `time_blocks.metadata`: ~200 bytes per block (typical plan has 10-20 blocks)
- `user_preferences.preferences`: ~150 bytes for triage-mirror fields
- **Total per user per day**: ~2-4 KB

**Scaling Considerations:**

- 10,000 active users × 4 KB/day = 40 MB/day
- 30-day retention = 1.2 GB
- Negligible impact on PostgreSQL performance

## Monitoring Queries

**Check metadata usage:**

```sql
-- Count blocks with triage metadata
SELECT COUNT(*) 
FROM time_blocks 
WHERE metadata ? 'visibility';

-- Check recalc_on_open adoption
SELECT COUNT(*) 
FROM user_preferences 
WHERE preferences->>'recalc_on_open' = 'true';

-- Check state declaration usage
SELECT 
  preferences->'last_state_declaration'->>'state' as state,
  COUNT(*) as count
FROM user_preferences
WHERE preferences ? 'last_state_declaration'
GROUP BY state;
```

## Backup and Recovery

**No special considerations.** Standard PostgreSQL backup procedures apply:

- Daily automated backups via Supabase
- Point-in-time recovery available
- JSONB fields included in standard pg_dump

## Documentation References

- [MeshOS Database Schema](../README.md)
- [Triage Mirror Design Document](../.kiro/specs/triage-mirror-stateless/design.md)
- [Triage Mirror Requirements](../.kiro/specs/triage-mirror-stateless/requirements.md)
- [Supabase JSONB Documentation](https://supabase.com/docs/guides/database/json)

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-03-01 | 1.0.0 | Initial documentation for triage-mirror-stateless feature |
