-- Diagnostics for user/org linkage.

SELECT 'auth.users without profile' AS check, count(*) AS count
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;

SELECT 'profiles without organization' AS check, count(*) AS count
FROM public.users
WHERE organization_id IS NULL;

SELECT 'organizations count' AS check, count(*) AS count
FROM public.organizations;

SELECT 'profiles count' AS check, count(*) AS count
FROM public.users;

SELECT 'on_auth_user_created trigger' AS check,
       EXISTS (
         SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
       ) AS enabled;

SELECT 'users policies' AS check, policyname
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

SELECT 'organizations policies' AS check, policyname
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'organizations'
ORDER BY policyname;
