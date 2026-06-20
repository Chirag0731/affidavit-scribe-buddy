-- Wipe existing template seeds and re-seed with canonical OSAP affidavit set.
-- Each body_template now contains ONLY the numbered facts; the renderer
-- assembles the title, "I/We ... MAKE OATH AND SAY AS FOLLOWS:" intro,
-- signature line(s), notary acknowledgement and three-column footer.

DELETE FROM public.templates;

INSERT INTO public.templates (name, description, category, merge_fields, body_template) VALUES
(
  'Affidavit of Dependants Clarification',
  'Clarifies dependant status for OSAP applications.',
  'osap',
  '[
    {"key":"affidavit_date","label":"Affidavit Date","type":"date","required":true},
    {"key":"city","label":"City of Deponent","type":"text","required":true,"placeholder":"Toronto"},
    {"key":"deponent_1_name","label":"Full Legal Name","type":"text","required":true},
    {"key":"deponent_1_dob","label":"Date of Birth","type":"date","required":true},
    {"key":"marital_status","label":"Current Marital Status","type":"text","required":true,"placeholder":"separated"},
    {"key":"children_count","label":"Number of Children","type":"text","required":true,"placeholder":"three"},
    {"key":"child_name","label":"Child Name (in Canada)","type":"text","required":true},
    {"key":"facts_extra","label":"Additional Context (one sentence)","type":"textarea","required":false}
  ]'::jsonb,
$tpl$My marital status is currently {{marital_status}} and I have {{children_count}} children.

My child, {{child_name}}, who is born in Canada, is from a seperate relationship. None of my children are in my custody, and they reside with the other parents.

When completing my OSAP application, I misunderstood the requirement and believed I had to list all my children regardless of custody. As a result, I incorrectly indicated that I was "separated with dependants."

This was an honest mistake and was not intended to misrepresent my situation. I confirm that I do not have any dependants in my custody for OSAP purposes.

I respectfully request that my OSAP application be reviewed and reassessed based on this correction.

This affidavit is made for the purpose of correcting my OSAP application.

I affirm that the information provided in this affidavit is true and accurate to the best of my knowledge and belief, and for all legal intents and purposes, it may serve.$tpl$
),
(
  'Affidavit of Academic Record',
  'Confirms loss/unavailability of post-secondary academic records.',
  'osap',
  '[
    {"key":"affidavit_date","label":"Affidavit Date","type":"date","required":true},
    {"key":"city","label":"City of Deponent","type":"text","required":true},
    {"key":"deponent_1_name","label":"Full Legal Name","type":"text","required":true},
    {"key":"deponent_1_dob","label":"Date of Birth","type":"date","required":true},
    {"key":"institution_name","label":"Institution Name","type":"text","required":true,"placeholder":"Devry Institute of Technology"},
    {"key":"graduation_year","label":"Year Completed","type":"text","required":true,"placeholder":"1996"},
    {"key":"degree_type","label":"Credential Type","type":"text","required":true,"placeholder":"degree"},
    {"key":"years_ago","label":"Approx. Years Since Completion","type":"text","required":true,"placeholder":"30"},
    {"key":"unavailability_reason","label":"Reason Records Are Unavailable","type":"textarea","required":true,"placeholder":"DeVry Institute of Technology permanently ceased its operations in Ontario in 2002, making it impossible to retrieve or obtain a replacement copy of my degree."}
  ]'::jsonb,
$tpl$I attended {{institution_name}} in {{graduation_year}} and successfully completed my {{degree_type}}.

My education was completed over {{years_ago}} years ago, and I no longer have the original copies of my {{degree_type}} or official transcripts in my possession.

I have made reasonable efforts to obtain copies of my academic records. However, {{unavailability_reason}}

This affidavit is made for the purpose of confirming the loss and unavailability of my post-secondary academic records for OSAP.

I affirm that the information provided in this affidavit is true and accurate to the best of my knowledge and belief, and for all legal intents and purposes, it may serve.$tpl$
),
(
  'Affidavit of Highschool Record',
  'Confirms loss/unavailability of high-school academic records.',
  'osap',
  '[
    {"key":"affidavit_date","label":"Affidavit Date","type":"date","required":true},
    {"key":"city","label":"City of Deponent","type":"text","required":true},
    {"key":"deponent_1_name","label":"Full Legal Name","type":"text","required":true},
    {"key":"deponent_1_dob","label":"Date of Birth","type":"date","required":true},
    {"key":"highschool_name","label":"High School Name","type":"text","required":true,"placeholder":"SJ Willis Highschool"},
    {"key":"highschool_location","label":"High School Location","type":"text","required":true,"placeholder":"Victoria, British Columbia"},
    {"key":"graduation_year","label":"Year Completed","type":"text","required":true,"placeholder":"2002"},
    {"key":"credential","label":"Credential","type":"text","required":true,"placeholder":"OSSD"},
    {"key":"post_secondary_note","label":"Post-Secondary Note","type":"textarea","required":true,"placeholder":"After my high-school education, I did not attend any post-secondary institution."},
    {"key":"years_ago","label":"Approx. Years Since Completion","type":"text","required":true,"placeholder":"23"}
  ]'::jsonb,
$tpl$I attended {{highschool_name}} in {{highschool_location}}, in {{graduation_year}} and successfully completed the requirements for my {{credential}}.

{{post_secondary_note}}

My education was completed over {{years_ago}} years ago, and I no longer have the original copies of my diploma or official transcripts in my possession.

I have made reasonable efforts to obtain copies of my academic records. I received communication from {{highschool_name}} confirming that, due to the age of the records, my diploma is no longer available.

This affidavit is made for the purpose of confirming the loss and unavailability of my high school academic records for OSAP.

I affirm that the information provided in this affidavit is true and accurate to the best of my knowledge and belief, and for all legal intents and purposes, it may serve.$tpl$
),
(
  'Affidavit of Common-Law Relationship',
  'Joint affidavit confirming a common-law relationship for OSAP.',
  'osap',
  '[
    {"key":"affidavit_date","label":"Affidavit Date","type":"date","required":true},
    {"key":"city","label":"City of Deponents","type":"text","required":true},
    {"key":"deponent_1_name","label":"Partner 1 Full Name","type":"text","required":true},
    {"key":"deponent_1_dob","label":"Partner 1 Date of Birth","type":"date","required":true},
    {"key":"deponent_2_name","label":"Partner 2 Full Name","type":"text","required":true},
    {"key":"deponent_2_dob","label":"Partner 2 Date of Birth","type":"date","required":true},
    {"key":"relationship_start","label":"Common-Law Start Date","type":"text","required":true,"placeholder":"April 21st, 2020"},
    {"key":"shared_address","label":"Shared Address","type":"textarea","required":true,"placeholder":"325 Bleecker Street, Toronto, Ontario, M4X1M2"}
  ]'::jsonb,
$tpl$We have been in a common-law relationship since {{relationship_start}}, and have consistently cohabited at {{shared_address}} since that date and continue to reside there together as partners.

This affidavit is made for the purpose of confirming the common-law relationship between us for OSAP.

I affirm that the information provided in this affidavit is true and accurate to the best of my knowledge and belief, and for all legal intents and purposes, it may serve.$tpl$
),
(
  'Affidavit of Marriage',
  'Joint affidavit confirming a marriage where the marriage certificate is unavailable.',
  'osap',
  '[
    {"key":"affidavit_date","label":"Affidavit Date","type":"date","required":true},
    {"key":"city","label":"City of Deponents","type":"text","required":true},
    {"key":"deponent_1_name","label":"Spouse 1 Full Name","type":"text","required":true},
    {"key":"deponent_1_dob","label":"Spouse 1 Date of Birth","type":"date","required":true},
    {"key":"deponent_2_name","label":"Spouse 2 Full Name","type":"text","required":true},
    {"key":"deponent_2_dob","label":"Spouse 2 Date of Birth","type":"date","required":true},
    {"key":"marriage_date","label":"Marriage Date","type":"text","required":true,"placeholder":"September 15, 2007"},
    {"key":"marriage_location","label":"Country/Place of Marriage","type":"text","required":true,"placeholder":"Jamaica"},
    {"key":"shared_address","label":"Shared Address","type":"textarea","required":true,"placeholder":"54 Oakhaven Road, Brampton, ON, L6P 3B6"}
  ]'::jsonb,
$tpl$We are lawfully married to each other, and our marriage was solemnized on {{marriage_date}}, in {{marriage_location}}.

Since the said marriage, we have continuously lived together as husband and wife at {{shared_address}}.

We reside at {{shared_address}}, and are fully responsible for our care, support, and financial obligations.

We have made this affidavit as we are unable to locate our original marriage certificate, and as its replacement can only be retrieved in person in our country of origin, we are presently unable to travel there to obtain it.

This affidavit is made for the purpose of confirming our marital status for OSAP purposes.

We hereby affirm that the information provided in this affidavit is true and accurate to the best of our knowledge, and for all legal intents and purposes, it may serve.$tpl$
),
(
  'Affidavit of Single Status',
  'Confirms single status and parentage for OSAP.',
  'osap',
  '[
    {"key":"affidavit_date","label":"Affidavit Date","type":"date","required":true},
    {"key":"city","label":"City of Deponent","type":"text","required":true},
    {"key":"deponent_1_name","label":"Full Legal Name","type":"text","required":true},
    {"key":"deponent_1_dob","label":"Date of Birth","type":"date","required":true},
    {"key":"home_address","label":"Current Address","type":"textarea","required":true,"placeholder":"122 Malden Street, Woodbridge, Ontario, L4L8J9"},
    {"key":"child_clause","label":"Child Statement","type":"textarea","required":false,"placeholder":"I am the biological and custodial parent of my daughter, Penelope Salinas, who is born on November 20th, 2019."},
    {"key":"purpose_statement","label":"Purpose Statement","type":"textarea","required":true,"placeholder":"I am providing this affidavit to verify my single status as well as my custody over my child as part of the OSAP application process."}
  ]'::jsonb,
$tpl$I currently reside at {{home_address}}.

I am not currently in a common-law relationship and have not been in one in the past.

I have never been legally married in Canada or any other country.

{{child_clause}}

{{purpose_statement}}

I affirm that the information provided in this affidavit is true and accurate to the best of my knowledge and belief, and for all legal intents and purposes, it may serve.$tpl$
),
(
  'Affidavit of Separation',
  'Confirms marital separation and dependant arrangements for OSAP.',
  'osap',
  '[
    {"key":"affidavit_date","label":"Affidavit Date","type":"date","required":true},
    {"key":"city","label":"City of Deponent","type":"text","required":true},
    {"key":"deponent_1_name","label":"Full Legal Name","type":"text","required":true},
    {"key":"deponent_1_dob","label":"Date of Birth","type":"date","required":true},
    {"key":"current_address","label":"Current Residence","type":"textarea","required":true,"placeholder":"98 Hillcroft Dr, Markham, Ontario, L3S 3Y2"},
    {"key":"spouse_name","label":"Spouse / Former Partner Name","type":"text","required":false,"placeholder":"Melchor Cerezo"},
    {"key":"marriage_date","label":"Marriage Date (if applicable)","type":"text","required":false,"placeholder":"January 26th, 2005"},
    {"key":"separation_date","label":"Date of Separation","type":"text","required":true,"placeholder":"November 15th, 2024"},
    {"key":"dependant_block","label":"Dependant Information","type":"textarea","required":true,"placeholder":"I am the sole support parent of my child mentioned below:\n  • Dashielle Savanna Cerezo, DOB: 2017-07-17"}
  ]'::jsonb,
$tpl$I am presently residing at {{current_address}}.

I have been lawfully married to {{spouse_name}} since {{marriage_date}}.

We separated on {{separation_date}} and have not lived together since then.

{{dependant_block}}

My child depends on me for care, support, and financial assistance, and will reside with me full-time during my study period and thereafter.

I am submitting this affidavit to confirm my separation from my partner as part of the OSAP application process.

I affirm that the information provided in this affidavit is true and accurate to the best of my knowledge and for all legal intents and purposes it may serve.$tpl$
),
(
  'Affidavit of Mature Student',
  'Confirms mature-student status for OSAP applications.',
  'osap',
  '[
    {"key":"affidavit_date","label":"Affidavit Date","type":"date","required":true},
    {"key":"city","label":"City of Deponent","type":"text","required":true},
    {"key":"deponent_1_name","label":"Full Legal Name","type":"text","required":true},
    {"key":"deponent_1_dob","label":"Date of Birth","type":"date","required":true}
  ]'::jsonb,
$tpl$I am applying for financial assistance through the Ontario Student Assistance Program (OSAP) as a mature student.

I have not attended or been enrolled in any secondary school (high school), college, or university prior to this application.

My current application is based on my status as a mature student, as defined by OSAP guidelines.

This affidavit is made in support of my OSAP application to confirm my academic history and mature student status, and the information provided is true and accurate to the best of my knowledge.$tpl$
);