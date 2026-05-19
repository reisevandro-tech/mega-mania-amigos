
CREATE OR REPLACE FUNCTION public.validate_dezenas(d integer[])
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT array_length(d,1) = 9
    AND (SELECT bool_and(x BETWEEN 1 AND 60) FROM unnest(d) x)
    AND (SELECT count(DISTINCT x) FROM unnest(d) x) = 9;
$$;

DROP POLICY IF EXISTS "anyone_can_insert" ON public.palpites;
CREATE POLICY "anyone_can_insert" ON public.palpites
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(nome)) BETWEEN 2 AND 100
    AND length(cpf) = 11
    AND cpf ~ '^[0-9]{11}$'
  );
