-- Save Google OAuth tokens for the current user's organization.

CREATE OR REPLACE FUNCTION public.save_google_tokens(access_token text, refresh_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_id uuid;
  current_integrations jsonb;
BEGIN
  SELECT organization_id INTO org_id
  FROM public.users
  WHERE id = auth.uid();

  IF org_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT integrations INTO current_integrations
  FROM public.organizations
  WHERE id = org_id;

  UPDATE public.organizations
  SET
    integrations = COALESCE(current_integrations, '{}'::jsonb) || '{"google": true}'::jsonb,
    google_access_token = COALESCE(access_token, google_access_token),
    google_refresh_token = COALESCE(refresh_token, google_refresh_token)
  WHERE id = org_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_google_tokens(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_google_tokens(text, text) TO service_role;
