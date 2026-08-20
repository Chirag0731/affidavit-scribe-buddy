CREATE TABLE IF NOT EXISTS public.credential_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'transcript',
  design TEXT NOT NULL,
  spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credential_templates TO authenticated;
GRANT ALL ON public.credential_templates TO service_role;
ALTER TABLE public.credential_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own credential templates" ON public.credential_templates;
CREATE POLICY "Users manage own credential templates" ON public.credential_templates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);