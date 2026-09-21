-- Migration: Business Financing Applications Schema
CREATE TABLE IF NOT EXISTS public.financing_applications (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  requested_amount NUMERIC NOT NULL DEFAULT 0,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.financing_applications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users and public submissions
CREATE POLICY "Allow public insert and read for financing_applications"
  ON public.financing_applications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for speedy listing
CREATE INDEX IF NOT EXISTS idx_financing_applications_status ON public.financing_applications(status);
CREATE INDEX IF NOT EXISTS idx_financing_applications_created ON public.financing_applications(created_at DESC);
