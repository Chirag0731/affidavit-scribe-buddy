CREATE TABLE IF NOT EXISTS public.financing_applications (
  id text PRIMARY KEY,
  business_name text NOT NULL DEFAULT 'Commercial Applicant',
  status text NOT NULL DEFAULT 'submitted',
  requested_amount numeric NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financing_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.financing_applications TO anon;
GRANT ALL ON public.financing_applications TO service_role;

ALTER TABLE public.financing_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Financing: public can submit" ON public.financing_applications
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Financing: public can update own draft by id" ON public.financing_applications
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Financing: staff read all" ON public.financing_applications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Financing: staff insert" ON public.financing_applications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Financing: staff update" ON public.financing_applications
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Financing: staff delete" ON public.financing_applications
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER financing_applications_set_updated_at
  BEFORE UPDATE ON public.financing_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.financing_applications;