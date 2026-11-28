-- APP18: send a feedback reply and its notification atomically.

CREATE OR REPLACE FUNCTION public.reply_to_user_feedback(
  p_feedback_id uuid,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_message text := trim(p_message);
BEGIN
  IF NOT public.is_moderator_or_admin() THEN
    RAISE EXCEPTION 'Moderator access required' USING errcode = '42501';
  END IF;

  IF char_length(v_message) < 1 OR char_length(v_message) > 2000 THEN
    RAISE EXCEPTION 'Reply must contain between 1 and 2000 characters' USING errcode = '22023';
  END IF;

  SELECT user_id INTO v_user_id
  FROM public.user_feedback
  WHERE id = p_feedback_id
  FOR UPDATE;

  IF NOT FOUND OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'Feedback recipient not found' USING errcode = 'P0002';
  END IF;

  INSERT INTO public.notifications (user_id, message, type, is_read)
  SELECT
    v_user_id,
    'Resposta da equipe ao seu feedback: ' || v_message,
    'system',
    false;

  UPDATE public.user_feedback
  SET status = 'replied',
      reply_text = v_message,
      replied_by = auth.uid(),
      replied_at = now()
  WHERE id = p_feedback_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reply_to_user_feedback(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reply_to_user_feedback(uuid, text) TO authenticated;
