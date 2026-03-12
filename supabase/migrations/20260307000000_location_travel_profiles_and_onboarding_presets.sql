-- Mirror/Daily Plan Recovery v2:
-- - Label-based travel profiles
-- - Per-anchor lateness overrides
-- - Progressive onboarding preset storage

ALTER TABLE public.manual_anchors
ADD COLUMN IF NOT EXISTS location_label text,
ADD COLUMN IF NOT EXISTS max_late_minutes integer NOT NULL DEFAULT 0;

ALTER TABLE public.manual_anchors
DROP CONSTRAINT IF EXISTS manual_anchors_max_late_minutes_check;

ALTER TABLE public.manual_anchors
ADD CONSTRAINT manual_anchors_max_late_minutes_check
CHECK (max_late_minutes >= 0 AND max_late_minutes <= 240);

CREATE TABLE IF NOT EXISTS public.location_travel_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  normalized_label text NOT NULL,
  travel_minutes integer NOT NULL,
  departure_slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  strict_by_default boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT location_travel_profiles_travel_minutes_check
    CHECK (travel_minutes >= 0 AND travel_minutes <= 480),
  CONSTRAINT location_travel_profiles_slots_array_check
    CHECK (jsonb_typeof(departure_slots) = 'array'),
  CONSTRAINT location_travel_profiles_user_label_unique
    UNIQUE (user_id, normalized_label)
);

CREATE INDEX IF NOT EXISTS location_travel_profiles_user_idx
  ON public.location_travel_profiles (user_id, active, normalized_label);

ALTER TABLE public.location_travel_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own location travel profiles"
  ON public.location_travel_profiles;
CREATE POLICY "Users can view own location travel profiles"
ON public.location_travel_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own location travel profiles"
  ON public.location_travel_profiles;
CREATE POLICY "Users can insert own location travel profiles"
ON public.location_travel_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own location travel profiles"
  ON public.location_travel_profiles;
CREATE POLICY "Users can update own location travel profiles"
ON public.location_travel_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own location travel profiles"
  ON public.location_travel_profiles;
CREATE POLICY "Users can delete own location travel profiles"
ON public.location_travel_profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.onboarding_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phase smallint NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  derived_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT onboarding_presets_phase_check
    CHECK (phase IN (1, 2)),
  CONSTRAINT onboarding_presets_answers_object_check
    CHECK (jsonb_typeof(answers) = 'object'),
  CONSTRAINT onboarding_presets_defaults_object_check
    CHECK (jsonb_typeof(derived_defaults) = 'object'),
  CONSTRAINT onboarding_presets_user_phase_unique
    UNIQUE (user_id, phase)
);

CREATE INDEX IF NOT EXISTS onboarding_presets_user_phase_idx
  ON public.onboarding_presets (user_id, phase);

ALTER TABLE public.onboarding_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own onboarding presets"
  ON public.onboarding_presets;
CREATE POLICY "Users can view own onboarding presets"
ON public.onboarding_presets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own onboarding presets"
  ON public.onboarding_presets;
CREATE POLICY "Users can insert own onboarding presets"
ON public.onboarding_presets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own onboarding presets"
  ON public.onboarding_presets;
CREATE POLICY "Users can update own onboarding presets"
ON public.onboarding_presets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own onboarding presets"
  ON public.onboarding_presets;
CREATE POLICY "Users can delete own onboarding presets"
ON public.onboarding_presets
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
