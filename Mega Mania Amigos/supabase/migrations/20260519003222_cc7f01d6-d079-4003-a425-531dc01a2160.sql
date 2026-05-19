
CREATE OR REPLACE FUNCTION public.validate_dezenas(d integer[])
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT array_length(d,1) = 9
    AND (SELECT bool_and(x BETWEEN 1 AND 60) FROM unnest(d) x)
    AND (SELECT count(DISTINCT x) FROM unnest(d) x) = 9;
$$;

CREATE TABLE public.palpites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text NOT NULL UNIQUE,
  dezenas integer[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dezenas_valid CHECK (public.validate_dezenas(dezenas))
);

CREATE INDEX palpites_cpf_idx ON public.palpites(cpf);
ALTER TABLE public.palpites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_insert" ON public.palpites
  FOR INSERT TO anon, authenticated WITH CHECK (true);
