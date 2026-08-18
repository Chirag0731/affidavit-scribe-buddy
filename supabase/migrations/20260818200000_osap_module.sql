-- =====================================================================
-- OSAP MODULE MIGRATION
-- =====================================================================

-- 1. OSAP Clients Table
CREATE TABLE IF NOT EXISTS public.osap_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  oan TEXT,
  school TEXT,
  program TEXT,
  study_period TEXT,
  application_year TEXT,
  batch_name TEXT,
  assigned_staff TEXT,
  notes TEXT,
  credential_status TEXT NOT NULL DEFAULT 'missing' CHECK (credential_status IN ('connected', 'missing', 'requires_verification')),
  application_status TEXT NOT NULL DEFAULT 'not_started' CHECK (application_status IN (
    'not_started', 'in_progress', 'submitted', 'processing', 'approved',
    'partially_approved', 'denied', 'action_required', 'documents_required',
    'documents_under_review', 'information_required', 'completed',
    'manual_review_required', 'audit_failed'
  )),
  funding_status TEXT,
  msfaa_status TEXT NOT NULL DEFAULT 'not_started' CHECK (msfaa_status IN (
    'not_started', 'in_progress', 'required', 'submitted', 'completed', 'action_required'
  )),
  document_status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (document_status IN (
    'not_submitted', 'submitted', 'received', 'under_review', 'approved', 'rejected', 'additional_information_required'
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  action_required BOOLEAN NOT NULL DEFAULT FALSE,
  action_required_summary TEXT,
  last_audit_at TIMESTAMPTZ,
  next_audit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.osap_clients TO authenticated;
GRANT ALL ON public.osap_clients TO service_role;
ALTER TABLE public.osap_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OSAP Clients: select own" ON public.osap_clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "OSAP Clients: insert own" ON public.osap_clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "OSAP Clients: update own" ON public.osap_clients FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "OSAP Clients: delete own" ON public.osap_clients FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER osap_clients_set_updated_at BEFORE UPDATE ON public.osap_clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_osap_clients_user_id ON public.osap_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_osap_clients_oan ON public.osap_clients(oan);
CREATE INDEX IF NOT EXISTS idx_osap_clients_app_status ON public.osap_clients(application_status);
CREATE INDEX IF NOT EXISTS idx_osap_clients_action_req ON public.osap_clients(action_required);


-- 2. OSAP Applications Table
CREATE TABLE IF NOT EXISTS public.osap_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.osap_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  status TEXT NOT NULL,
  funding_calculated NUMERIC,
  grant_amount NUMERIC,
  loan_amount NUMERIC,
  application_number TEXT,
  submission_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.osap_applications TO authenticated;
GRANT ALL ON public.osap_applications TO service_role;
ALTER TABLE public.osap_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OSAP Applications: select own" ON public.osap_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "OSAP Applications: insert own" ON public.osap_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "OSAP Applications: update own" ON public.osap_applications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "OSAP Applications: delete own" ON public.osap_applications FOR DELETE USING (auth.uid() = user_id);


-- 3. OSAP Documents Table
CREATE TABLE IF NOT EXISTS public.osap_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.osap_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'not_submitted',
  submission_date DATE,
  rejection_reason TEXT,
  instructions TEXT,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.osap_documents TO authenticated;
GRANT ALL ON public.osap_documents TO service_role;
ALTER TABLE public.osap_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OSAP Documents: select own" ON public.osap_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "OSAP Documents: insert own" ON public.osap_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "OSAP Documents: update own" ON public.osap_documents FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "OSAP Documents: delete own" ON public.osap_documents FOR DELETE USING (auth.uid() = user_id);


-- 4. OSAP Audits Table
CREATE TABLE IF NOT EXISTS public.osap_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.osap_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audit_type TEXT NOT NULL DEFAULT 'single',
  status TEXT NOT NULL,
  summary TEXT,
  changes_detected JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  conducted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.osap_audits TO authenticated;
GRANT ALL ON public.osap_audits TO service_role;
ALTER TABLE public.osap_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OSAP Audits: select own" ON public.osap_audits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "OSAP Audits: insert own" ON public.osap_audits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "OSAP Audits: update own" ON public.osap_audits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "OSAP Audits: delete own" ON public.osap_audits FOR DELETE USING (auth.uid() = user_id);


-- 5. OSAP Audit Changes Table
CREATE TABLE IF NOT EXISTS public.osap_audit_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.osap_audits(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.osap_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_category TEXT NOT NULL,
  field_name TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.osap_audit_changes TO authenticated;
GRANT ALL ON public.osap_audit_changes TO service_role;
ALTER TABLE public.osap_audit_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OSAP Audit Changes: select own" ON public.osap_audit_changes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "OSAP Audit Changes: insert own" ON public.osap_audit_changes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "OSAP Audit Changes: update own" ON public.osap_audit_changes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "OSAP Audit Changes: delete own" ON public.osap_audit_changes FOR DELETE USING (auth.uid() = user_id);


-- 6. OSAP Action Items Table
CREATE TABLE IF NOT EXISTS public.osap_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.osap_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_on_client', 'completed', 'dismissed')),
  assigned_to TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.osap_action_items TO authenticated;
GRANT ALL ON public.osap_action_items TO service_role;
ALTER TABLE public.osap_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OSAP Action Items: select own" ON public.osap_action_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "OSAP Action Items: insert own" ON public.osap_action_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "OSAP Action Items: update own" ON public.osap_action_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "OSAP Action Items: delete own" ON public.osap_action_items FOR DELETE USING (auth.uid() = user_id);


-- 7. OSAP Notes Table
CREATE TABLE IF NOT EXISTS public.osap_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.osap_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.osap_notes TO authenticated;
GRANT ALL ON public.osap_notes TO service_role;
ALTER TABLE public.osap_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OSAP Notes: select own" ON public.osap_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "OSAP Notes: insert own" ON public.osap_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "OSAP Notes: update own" ON public.osap_notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "OSAP Notes: delete own" ON public.osap_notes FOR DELETE USING (auth.uid() = user_id);


-- 8. OSAP Imports Table
CREATE TABLE IF NOT EXISTS public.osap_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  new_clients INTEGER NOT NULL DEFAULT 0,
  updated_clients INTEGER NOT NULL DEFAULT 0,
  duplicates INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.osap_imports TO authenticated;
GRANT ALL ON public.osap_imports TO service_role;
ALTER TABLE public.osap_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OSAP Imports: select own" ON public.osap_imports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "OSAP Imports: insert own" ON public.osap_imports FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 9. OSAP Credentials (Isolated, Encrypted Storage)
CREATE TABLE IF NOT EXISTS public.osap_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.osap_clients(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_data TEXT NOT NULL,
  iv TEXT NOT NULL,
  tag TEXT,
  status TEXT NOT NULL DEFAULT 'connected',
  last_verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.osap_credentials TO authenticated;
GRANT ALL ON public.osap_credentials TO service_role;
ALTER TABLE public.osap_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OSAP Credentials: select own" ON public.osap_credentials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "OSAP Credentials: insert own" ON public.osap_credentials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "OSAP Credentials: update own" ON public.osap_credentials FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "OSAP Credentials: delete own" ON public.osap_credentials FOR DELETE USING (auth.uid() = user_id);
