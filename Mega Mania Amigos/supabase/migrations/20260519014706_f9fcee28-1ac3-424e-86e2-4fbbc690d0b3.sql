-- Explicitly block public SELECT/UPDATE/DELETE on palpites.
-- Reads happen only server-side via service role (admin panel, password-gated).
CREATE POLICY "no_public_select" ON public.palpites
  AS RESTRICTIVE FOR SELECT
  TO anon, authenticated
  USING (false);

CREATE POLICY "no_public_update" ON public.palpites
  AS RESTRICTIVE FOR UPDATE
  TO anon, authenticated
  USING (false);

CREATE POLICY "no_public_delete" ON public.palpites
  AS RESTRICTIVE FOR DELETE
  TO anon, authenticated
  USING (false);