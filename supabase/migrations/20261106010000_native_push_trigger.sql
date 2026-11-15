CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.amens_notify_native_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  webhook_secret text;
  function_url text;
BEGIN
  IF NEW.is_read THEN RETURN NEW; END IF;
  SELECT decrypted_secret INTO webhook_secret FROM vault.decrypted_secrets WHERE name = 'amens_push_webhook_secret';
  SELECT decrypted_secret INTO function_url FROM vault.decrypted_secrets WHERE name = 'amens_push_function_url';
  IF webhook_secret IS NULL OR function_url IS NULL THEN
    RAISE WARNING 'Amens native push delivery is not configured';
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url := function_url,
    headers := pg_catalog.jsonb_build_object('Content-Type', 'application/json', 'x-push-webhook-secret', webhook_secret),
    -- Do not place private message content in the HTTP queue.
    body := pg_catalog.jsonb_build_object('type', 'INSERT', 'schema', TG_TABLE_SCHEMA, 'table', TG_TABLE_NAME,
      'record', pg_catalog.jsonb_build_object('id', NEW.id)),
    timeout_milliseconds := 10000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Delivery outages must not prevent saving an in-app notification.
  RAISE WARNING 'Amens native push could not be queued';
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.amens_notify_native_push() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS amens_native_push_on_insert ON public.notifications;
CREATE TRIGGER amens_native_push_on_insert
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.amens_notify_native_push();
