-- Migration: Mirror V2 Analytics Tables
-- Description: Add optional usage analytics tables and preferences for Mirror V2
-- Requirements: 14.1, 14.2

-- Create mirror_telemetry_events table for opt-in usage analytics
CREATE TABLE IF NOT EXISTS mirror_telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_mirror_telemetry_user_time 
  ON mirror_telemetry_events(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_mirror_telemetry_event_type 
  ON mirror_telemetry_events(event_type);

CREATE INDEX IF NOT EXISTS idx_mirror_telemetry_user_event 
  ON mirror_telemetry_events(user_id, event_type);

-- Enable RLS on mirror_telemetry_events
ALTER TABLE mirror_telemetry_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only insert their own telemetry events
CREATE POLICY "Users can insert their own telemetry events"
  ON mirror_telemetry_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only read their own telemetry events
CREATE POLICY "Users can read their own telemetry events"
  ON mirror_telemetry_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Add enable_usage_analytics preference to user_preferences table
-- Default is FALSE - analytics are opt-in only
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS enable_usage_analytics BOOLEAN DEFAULT FALSE;

-- Comment on the column to document the opt-in nature
COMMENT ON COLUMN user_preferences.enable_usage_analytics IS 
  'Opt-in flag for usage analytics. Default FALSE. Users must explicitly enable.';

COMMENT ON TABLE mirror_telemetry_events IS 
  'Optional usage analytics events for Mirror V2. Only populated when user enables analytics.';
