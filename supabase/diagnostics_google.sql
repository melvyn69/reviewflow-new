-- Diagnostics for Google token storage and RPC availability.

select id, name, google_access_token, google_refresh_token
from public.organizations
where id = '<org_id>';

select proname
from pg_proc
where proname = 'save_google_tokens';
