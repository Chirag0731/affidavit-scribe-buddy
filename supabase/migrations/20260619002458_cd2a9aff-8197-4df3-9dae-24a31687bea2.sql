
-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  firm_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles: select own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: insert own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, firm_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'firm_name'
  );
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- templates
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  body_template TEXT NOT NULL,
  merge_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.templates TO authenticated;
GRANT ALL ON public.templates TO service_role;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates: authenticated read active" ON public.templates
  FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE TRIGGER templates_set_updated_at BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- affidavits
CREATE TABLE public.affidavits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  template_name TEXT,
  client_name TEXT NOT NULL,
  matter_reference TEXT,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('draft','generated','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affidavits TO authenticated;
GRANT ALL ON public.affidavits TO service_role;
ALTER TABLE public.affidavits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affidavits: select own" ON public.affidavits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Affidavits: insert own" ON public.affidavits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Affidavits: update own" ON public.affidavits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Affidavits: delete own" ON public.affidavits FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER affidavits_set_updated_at BEFORE UPDATE ON public.affidavits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- seed templates
INSERT INTO public.templates (name, description, category, merge_fields, body_template) VALUES
(
  'Affidavit of Service',
  'Used to confirm that a legal document has been served on a party.',
  'service',
  '[
    {"key":"deponent_name","label":"Deponent Full Name","type":"text","required":true},
    {"key":"deponent_address","label":"Deponent Address","type":"textarea","required":true},
    {"key":"served_party_name","label":"Party Served","type":"text","required":true},
    {"key":"served_party_address","label":"Address of Party Served","type":"textarea","required":true},
    {"key":"document_served","label":"Document(s) Served","type":"text","required":true},
    {"key":"date_of_service","label":"Date of Service","type":"date","required":true},
    {"key":"method_of_service","label":"Method of Service","type":"select","required":true,"options":["Personal Service","Substituted Service","Mail","Email","Courier"]},
    {"key":"court_file_number","label":"Court File Number","type":"text","required":true},
    {"key":"court_location","label":"Court Location","type":"text","required":true},
    {"key":"lawyer_name","label":"Lawyer Name","type":"text","required":false},
    {"key":"notes","label":"Additional Notes","type":"textarea","required":false}
  ]'::jsonb,
$tpl$AFFIDAVIT OF SERVICE

Court File Number: {{court_file_number}}
Court Location: {{court_location}}

I, {{deponent_name}}, of {{deponent_address}}, MAKE OATH AND SAY:

1. On {{date_of_service}}, I served {{served_party_name}} at {{served_party_address}} with the following document(s): {{document_served}}.

2. Service was effected by {{method_of_service}}.

Additional notes:
{{notes}}

SWORN BEFORE ME at {{court_location}}
on {{date_of_service}}.

_________________________
{{deponent_name}} (Deponent)

_________________________
{{lawyer_name}} (Commissioner for Taking Affidavits)
$tpl$
),
(
  'Affidavit of Applicant',
  'General affidavit sworn by an applicant in support of their application.',
  'application',
  '[
    {"key":"applicant_name","label":"Applicant Full Name","type":"text","required":true},
    {"key":"applicant_address","label":"Applicant Address","type":"textarea","required":true},
    {"key":"applicant_phone","label":"Phone Number","type":"text","required":false},
    {"key":"applicant_email","label":"Email Address","type":"email","required":false},
    {"key":"respondent_name","label":"Respondent Name","type":"text","required":true},
    {"key":"court_file_number","label":"Court File Number","type":"text","required":true},
    {"key":"province","label":"Province","type":"select","required":true,"options":["Ontario","British Columbia","Alberta","Quebec","Manitoba","Saskatchewan","Nova Scotia","New Brunswick","Newfoundland","Prince Edward Island"]},
    {"key":"city","label":"City","type":"text","required":true},
    {"key":"affidavit_facts","label":"Facts of Affidavit","type":"textarea","required":true},
    {"key":"lawyer_name","label":"Lawyer Name","type":"text","required":false},
    {"key":"date_sworn","label":"Date Sworn","type":"date","required":true}
  ]'::jsonb,
$tpl$AFFIDAVIT OF APPLICANT

Court File Number: {{court_file_number}}
Province: {{province}}
City: {{city}}

BETWEEN: {{applicant_name}} (Applicant)
AND:     {{respondent_name}} (Respondent)

I, {{applicant_name}}, of {{applicant_address}}
Phone: {{applicant_phone}}
Email: {{applicant_email}}

MAKE OATH AND SAY AS FOLLOWS:

{{affidavit_facts}}

SWORN BEFORE ME at the City of {{city}},
in the Province of {{province}}, on {{date_sworn}}.

_________________________
{{applicant_name}} (Applicant)

_________________________
{{lawyer_name}} (Commissioner for Taking Affidavits)
$tpl$
),
(
  'Affidavit of Execution',
  'Confirms that a will or legal document was properly executed.',
  'execution',
  '[
    {"key":"witness_name","label":"Witness Full Name","type":"text","required":true},
    {"key":"witness_address","label":"Witness Address","type":"textarea","required":true},
    {"key":"testator_name","label":"Testator/Signatory Full Name","type":"text","required":true},
    {"key":"document_type","label":"Document Type","type":"text","required":true},
    {"key":"date_of_execution","label":"Date of Execution","type":"date","required":true},
    {"key":"place_of_execution","label":"Place of Execution","type":"text","required":true},
    {"key":"second_witness_name","label":"Second Witness Name (if applicable)","type":"text","required":false},
    {"key":"lawyer_name","label":"Commissioner/Lawyer Name","type":"text","required":true}
  ]'::jsonb,
$tpl$AFFIDAVIT OF EXECUTION

I, {{witness_name}}, of {{witness_address}}, MAKE OATH AND SAY:

1. I was personally present and did see {{testator_name}} duly sign and execute the {{document_type}} dated {{date_of_execution}}.

2. The execution took place at {{place_of_execution}}.

3. The second witness, {{second_witness_name}}, was also present (if applicable).

4. I know {{testator_name}} and they are, in my belief, of the full age of majority.

SWORN BEFORE ME at {{place_of_execution}}
on {{date_of_execution}}.

_________________________
{{witness_name}} (Witness)

_________________________
{{lawyer_name}} (Commissioner for Taking Affidavits)
$tpl$
);
