-- Close the remaining tables that had RLS disabled. All are legacy
-- gamification/analytics tables the app no longer reads or writes, but
-- without RLS the public anon key could read them through the REST API.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cross_module_correlations',
    'habit_query_performance',
    'life_optimization_scores',
    'progress_summaries',
    'user_achievements'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "Users manage own rows" ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY "Users manage own rows" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
        t
      );
    END IF;
  END LOOP;

  -- achievements is a shared catalog (no user_id): readable, not writable.
  IF to_regclass('public.achievements') IS NOT NULL THEN
    ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Anyone signed in can read achievements" ON public.achievements;
    CREATE POLICY "Anyone signed in can read achievements" ON public.achievements
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
