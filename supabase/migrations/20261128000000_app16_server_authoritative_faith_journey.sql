-- APP16: server-authoritative, idempotent daily faith journey rewards.

CREATE TABLE IF NOT EXISTS public.faith_task_completions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_date date NOT NULL,
  task_id text NOT NULL,
  points_awarded integer NOT NULL CHECK (points_awarded >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, task_date, task_id)
);

ALTER TABLE public.faith_task_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own faith task completions" ON public.faith_task_completions;
CREATE POLICY "Users can view own faith task completions"
  ON public.faith_task_completions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.complete_daily_faith_task(p_task_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_task_date date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_points integer;
  v_completion public.faith_task_completions%ROWTYPE;
  v_bonus_awarded boolean := false;
  v_task_awarded boolean := false;
  v_total integer;
  v_completed_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '42501';
  END IF;

  v_points := CASE p_task_id
    WHEN 'pray_cause' THEN 10
    WHEN 'read_gospel' THEN 15
    WHEN 'read_promise' THEN 10
    WHEN 'share_word' THEN 20
    WHEN 'share_promise' THEN 15
    WHEN 'send_invite' THEN 30
    WHEN 'pray_rosary' THEN 50
    WHEN 'live_prayer' THEN 25
    WHEN 'share_cause' THEN 15
    WHEN 'pray_novena' THEN 30
    ELSE NULL
  END;

  IF v_points IS NULL THEN
    RAISE EXCEPTION 'Unsupported faith task' USING errcode = '22023';
  END IF;

  INSERT INTO public.faith_task_completions (user_id, task_date, task_id, points_awarded)
  VALUES (v_user_id, v_task_date, p_task_id, v_points)
  ON CONFLICT (user_id, task_date, task_id) DO NOTHING
  RETURNING * INTO v_completion;

  IF v_completion.user_id IS NOT NULL THEN
    v_task_awarded := true;
    INSERT INTO public.user_xp (user_id, total_xp)
    VALUES (v_user_id, v_points)
    ON CONFLICT (user_id) DO UPDATE SET
      total_xp = public.user_xp.total_xp + EXCLUDED.total_xp,
      updated_at = now();
  END IF;

  SELECT count(*)::integer INTO v_completed_count
  FROM public.faith_task_completions
  WHERE user_id = v_user_id
    AND task_date = v_task_date
    AND task_id <> '__daily_bonus_5';

  IF v_completed_count >= 5 THEN
    INSERT INTO public.faith_task_completions (user_id, task_date, task_id, points_awarded)
    VALUES (v_user_id, v_task_date, '__daily_bonus_5', 100)
    ON CONFLICT (user_id, task_date, task_id) DO NOTHING
    RETURNING * INTO v_completion;

    IF v_completion.user_id IS NOT NULL THEN
      v_bonus_awarded := true;
      INSERT INTO public.user_xp (user_id, total_xp)
      VALUES (v_user_id, 100)
      ON CONFLICT (user_id) DO UPDATE SET
        total_xp = public.user_xp.total_xp + EXCLUDED.total_xp,
        updated_at = now();
    END IF;
  END IF;

  SELECT total_xp INTO v_total FROM public.user_xp WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'completed', EXISTS (
      SELECT 1 FROM public.faith_task_completions
      WHERE user_id = v_user_id AND task_date = v_task_date AND task_id = p_task_id
    ),
    'awarded', v_task_awarded,
    'points_awarded', CASE WHEN v_task_awarded THEN v_points ELSE 0 END,
    'bonus_awarded', v_bonus_awarded,
    'total_xp', COALESCE(v_total, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_daily_faith_tasks()
RETURNS TABLE(task_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.task_id
  FROM public.faith_task_completions c
  WHERE c.user_id = auth.uid()
    AND c.task_date = (now() AT TIME ZONE 'America/Sao_Paulo')::date
    AND c.task_id <> '__daily_bonus_5';
$$;

-- The legacy RPC remains available only for fixed, authenticated event rewards.
CREATE OR REPLACE FUNCTION public.add_xp(
  p_user_id uuid,
  p_xp_amount integer,
  p_action text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_expected integer;
  v_total integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '42501';
  END IF;

  v_expected := CASE p_action
    WHEN 'pray' THEN 10
    WHEN 'submit' THEN 20
    WHEN 'react' THEN 5
    ELSE NULL
  END;

  IF v_expected IS NULL OR p_xp_amount <> v_expected THEN
    RAISE EXCEPTION 'Invalid faith reward' USING errcode = '22023';
  END IF;

  INSERT INTO public.user_xp (user_id, total_xp, prayers_given, prayers_submitted, reactions_sent)
  VALUES (
    v_user_id,
    v_expected,
    CASE WHEN p_action = 'pray' THEN 1 ELSE 0 END,
    CASE WHEN p_action = 'submit' THEN 1 ELSE 0 END,
    CASE WHEN p_action = 'react' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = public.user_xp.total_xp + EXCLUDED.total_xp,
    prayers_given = public.user_xp.prayers_given + EXCLUDED.prayers_given,
    prayers_submitted = public.user_xp.prayers_submitted + EXCLUDED.prayers_submitted,
    reactions_sent = public.user_xp.reactions_sent + EXCLUDED.reactions_sent,
    updated_at = now()
  RETURNING total_xp INTO v_total;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_daily_faith_task(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_daily_faith_tasks() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_xp(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_daily_faith_task(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_faith_tasks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_xp(uuid, integer, text) TO authenticated;
