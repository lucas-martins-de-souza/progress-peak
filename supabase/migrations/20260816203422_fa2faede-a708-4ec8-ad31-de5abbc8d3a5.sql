ALTER TABLE public.exercise_performance
  ADD CONSTRAINT exercise_performance_session_exercise_key UNIQUE (session_id, workout_exercise_id);