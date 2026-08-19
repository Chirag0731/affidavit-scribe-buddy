import { type Template, DEFAULT_LAYOUT } from "@/types/neptora";

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "tpl-sole-support",
    name: "Affidavit of Sole Support Parent Status",
    description: "Sworn legal declaration confirming sole custody and financial responsibility for dependent child(ren).",
    category: "osap",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    layout: { ...DEFAULT_LAYOUT },
    merge_fields: [
      { key: "full_name", label: "Full Legal Name of Deponent", type: "text", required: true, placeholder: "e.g. Jane Doe" },
      { key: "city", label: "City of Residence", type: "text", required: true, placeholder: "e.g. Toronto" },
      { key: "province", label: "Province", type: "text", required: true, placeholder: "Ontario" },
      { key: "child_name", label: "Dependent Child's Full Legal Name", type: "text", required: true, placeholder: "e.g. John Doe" },
      { key: "child_dob", label: "Child Date of Birth", type: "date", required: true },
      { key: "separation_date", label: "Date of Separation / Sole Custody Inception", type: "date", required: true },
      { key: "financial_support", label: "Financial Support Details", type: "text", required: true, placeholder: "e.g. I receive no regular child support or financial contribution from the other parent." },
    ],
    body_template: `I, {{full_name}}, of the City of {{city}}, in the Province of {{province}}, MAKE OATH AND SAY AS FOLLOWS:

1. I am the parent and have sole physical and financial custody of my dependent child, {{child_name}}, born on {{child_dob}}.
2. I have had sole care, custody, and full responsibility for my child continuously since {{separation_date}}.
3. {{financial_support}}
4. I am solely responsible for all day-to-day living expenses, shelter, food, clothing, education, and medical needs of my child.
5. I make this solemn declaration conscientiously believing it to be true and knowing that it is of the same legal force and effect as if made under oath.`,
  },
  {
    id: "tpl-common-law",
    name: "Affidavit of Common-Law Relationship Status",
    description: "Sworn declaration verifying continuous cohabitation in a conjugal relationship for OSAP/legal requirements.",
    category: "osap",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    layout: { ...DEFAULT_LAYOUT },
    merge_fields: [
      { key: "full_name", label: "Full Legal Name of Deponent", type: "text", required: true, placeholder: "e.g. Alex Smith" },
      { key: "partner_name", label: "Partner's Full Legal Name", type: "text", required: true, placeholder: "e.g. Taylor Morgan" },
      { key: "city", label: "City of Residence", type: "text", required: true, placeholder: "e.g. Toronto" },
      { key: "province", label: "Province", type: "text", required: true, placeholder: "Ontario" },
      { key: "cohabitation_date", label: "Date Continuous Cohabitation Commenced", type: "date", required: true },
      { key: "residential_address", label: "Current Shared Residential Address", type: "text", required: true, placeholder: "e.g. 123 Main St, Apt 4B, Toronto, ON M4B 1B3" },
    ],
    body_template: `I, {{full_name}}, of the City of {{city}}, in the Province of {{province}}, MAKE OATH AND SAY AS FOLLOWS:

1. I am in a genuine, committed, continuous conjugal relationship with my partner, {{partner_name}}.
2. We have lived together continuously at {{residential_address}} since {{cohabitation_date}}.
3. We share mutual financial and household responsibilities and hold ourselves out to the community as spouses.
4. I make this affidavit to verify our common-law marital status for official administrative and legal purposes.
5. I make this solemn declaration conscientiously believing it to be true and knowing that it is of the same legal force and effect as if made under oath.`,
  },
  {
    id: "tpl-low-income",
    name: "Affidavit of Low Income & Living Expenses",
    description: "Sworn legal statement detailing financial circumstances and source of basic living support.",
    category: "osap",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    layout: { ...DEFAULT_LAYOUT },
    merge_fields: [
      { key: "full_name", label: "Full Legal Name of Deponent", type: "text", required: true, placeholder: "e.g. John Doe" },
      { key: "city", label: "City of Residence", type: "text", required: true, placeholder: "e.g. Mississauga" },
      { key: "province", label: "Province", type: "text", required: true, placeholder: "Ontario" },
      { key: "tax_year", label: "Applicable Tax / Calendar Year", type: "text", required: true, placeholder: "e.g. 2025" },
      { key: "total_income", label: "Total Gross Income in Stated Year", type: "text", required: true, placeholder: "e.g. $4,200 CAD" },
      { key: "living_support_source", label: "Source of Shelter & Basic Living Support", type: "text", required: true, placeholder: "e.g. Resided with family members who provided basic room and board." },
    ],
    body_template: `I, {{full_name}}, of the City of {{city}}, in the Province of {{province}}, MAKE OATH AND SAY AS FOLLOWS:

1. During the {{tax_year}} calendar year, my total worldwide gross income from all sources was {{total_income}}.
2. During this period, my basic living costs, shelter, and sustenance were supported as follows: {{living_support_source}}.
3. I had no other undisclosed sources of income, earnings, trust distributions, or financial assets during this period.
4. I make this solemn declaration conscientiously believing it to be true and knowing that it is of the same legal force and effect as if made under oath.`,
  },
  {
    id: "tpl-general-declaration",
    name: "General Sworn Legal Declaration & Statement",
    description: "Universal sworn affidavit suitable for formal statements of fact, name discrepancy verification, and legal proceedings.",
    category: "legal",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    layout: { ...DEFAULT_LAYOUT },
    merge_fields: [
      { key: "full_name", label: "Full Legal Name of Deponent", type: "text", required: true, placeholder: "e.g. Jane Doe" },
      { key: "city", label: "City of Residence", type: "text", required: true, placeholder: "e.g. Toronto" },
      { key: "province", label: "Province", type: "text", required: true, placeholder: "Ontario" },
      { key: "statement_purpose", label: "Purpose of Statement", type: "text", required: true, placeholder: "e.g. Clarification of government records and formal identity declaration" },
      { key: "facts_detail", label: "Statement of Facts", type: "text", required: true, placeholder: "Provide the detailed factual statements to be sworn..." },
    ],
    body_template: `I, {{full_name}}, of the City of {{city}}, in the Province of {{province}}, MAKE OATH AND SAY AS FOLLOWS:

1. I am the deponent herein and have personal knowledge of the matters herein deposed to.
2. This affidavit is made in respect of: {{statement_purpose}}.
3. {{facts_detail}}
4. I make this solemn declaration conscientiously believing it to be true and knowing that it is of the same legal force and effect as if made under oath.`,
  },
];
