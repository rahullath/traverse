-- Migration: Mirror V2 User Preferences
-- Date: 2026-03-05
-- Requirements: 4.2, 21.1, 9.4
-- 
-- Adds user preference columns for Mirror V2 cognitive prosthetic features:
-- - show_completion_controls: Optional completion tracking (default: false)
-- - show_recovery_blocks: Optional recovery time display (default: true)
-- - keystone_activity: User's primary keystone activity
-- - enable_usage_analytics: Opt-in usage analytics (default: false)

-- Add new columns to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS show_completion_controls BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS show_recovery_blocks BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS keystone_activity TEXT,
ADD COLUMN IF NOT EXISTS enable_usage_analytics BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN user_preferences.show_completion_controls IS 
  'Mirror V2: Whether to show completion checkboxes and tracking controls. Default false - timeline serves as visual scaffold first, completion tracker second.';

COMMENT ON COLUMN user_preferences.show_recovery_blocks IS 
  'Mirror V2: Whether to show recovery time blocks after anchors. Default true - users can hide if they find it unhelpful.';

COMMENT ON COLUMN user_preferences.keystone_activity IS 
  'Mirror V2: User-defined primary keystone activity that unlocks the day (e.g., "shower", "meds", "coffee").';

COMMENT ON COLUMN user_preferences.enable_usage_analytics IS 
  'Mirror V2: Opt-in usage analytics for app improvement. Default false - app works perfectly without tracking. Requires explicit user consent.';
