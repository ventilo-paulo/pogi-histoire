DROP POLICY IF EXISTS "Media credits are viewable by everyone" ON public.media_credits;
DROP POLICY IF EXISTS "Public can view media credits" ON public.media_credits;
DROP POLICY IF EXISTS "Anyone can view media credits" ON public.media_credits;
DROP POLICY IF EXISTS "media_credits_select_public" ON public.media_credits;

CREATE POLICY "Admins can view media credits"
ON public.media_credits
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));