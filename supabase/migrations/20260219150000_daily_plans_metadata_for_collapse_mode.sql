-- V2.2 Collapse Mode foundation.
-- Additive migration only: plan-level metadata for collapse-mode state.

ALTER TABLE IF EXISTS public.daily_plans
ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
