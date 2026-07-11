
REVOKE SELECT ON public.profile FROM anon, authenticated;
DROP POLICY "Anyone can view profile" ON public.profile;
