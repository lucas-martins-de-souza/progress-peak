CREATE TABLE public.workout_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_shares TO authenticated;
GRANT ALL ON public.workout_shares TO service_role;

ALTER TABLE public.workout_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone signed in can read shares"
  ON public.workout_shares FOR SELECT TO authenticated USING (true);

CREATE POLICY "users create own shares"
  ON public.workout_shares FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "users update own shares"
  ON public.workout_shares FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "users delete own shares"
  ON public.workout_shares FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE TRIGGER trg_workout_shares_updated
  BEFORE UPDATE ON public.workout_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_workout_shares_code ON public.workout_shares(code);

ALTER TABLE public.workouts ADD COLUMN source_share_code text;