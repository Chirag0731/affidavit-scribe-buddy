// Master Data Models for Business Financing & Automatic Lender PDF Generation

export type ApplicationStatus =
  | "draft"
  | "in_progress"
  | "complete"
  | "submitted"
  | "documents_generated"
  | "under_review"
  | "offers_received";

export type EntityType =
  | "sole_proprietorship"
  | "partnership"
  | "limited_partnership"
  | "corporation"
  | "llc"
  | "llp";

export type IndustryType =
  | "retail"
  | "moto"
  | "wholesale"
  | "restaurant"
  | "construction"
  | "transportation"
  | "services"
  | "medical_healthcare"
  | "technology"
  | "other";

export type UseOfFunds =
  | "working_capital"
  | "equipment_purchase"
  | "business_expansion"
  | "inventory"
  | "marketing"
  | "payroll"
  | "debt_refinancing"
  | "renovation"
  | "other";

export type HousingStatus = "own" | "rent" | "lease";
export type OccupancyType = "own" | "rent" | "lease";

export interface AddressInfo {
  street: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface BusinessInfo {
  legalName: string;
  dba: string; // Doing business as
  tradeName?: string;
  businessNumber: string; // BIN / Business Identification Number
  federalTaxId?: string;
  entityType: EntityType;
  structureType?: string;
  industryType: IndustryType;
  industryTypeOther?: string;
  industry?: string;
  natureOfBusiness?: string;
  productServiceSold: string;
  businessDescription?: string;
  dateStarted: string; // YYYY-MM-DD
  dateEstablished?: string;
  lengthOfOwnershipYears: number;
  lengthOfOwnershipMonths: number;
  lengthOfOwnership?: string;
  provinceOfIncorporation: string;
  numberOfLocations: number;

  legalAddress: AddressInfo;
  physicalAddress: AddressInfo;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  physicalSameAsLegal: boolean;
  mailingAddressChoice: "legal" | "dba" | "physical";
  operatingAddress?: AddressInfo | any;

  phone: string;
  businessPhone?: string;
  fax?: string;
  email: string;
  businessEmail?: string;
  website?: string;
}

export interface FinancialsInfo {
  requestedAmount: number;
  amountRequested?: number;
  useOfFunds: UseOfFunds | string;
  useOfFundsOther?: string;
  preferredTerm?: string;
  grossMonthlySales: number;
  averageMonthlyRevenue?: number;
  grossAnnualSales: number;
  annualGrossRevenue?: number;
  averageBankBalance?: number;
  averageBankBalanceLast3Mos?: number;
  nonCardMonthlySales: number;

  // Seasonal business logic
  isSeasonal: boolean;
  peakSalesStartMonth?: string;
  peakSalesEndMonth?: string;

  // Franchise conditional logic
  isFranchise: boolean;
  franchisorName?: string;
  franchisorPhone?: string;
}

export interface OwnerInfo {
  id: string;
  isPrimary: boolean;
  firstName: string;
  lastName: string;
  title: string;
  ownershipPercentage: number;
  dob: string; // YYYY-MM-DD
  sin: string; // Social Insurance Number / SSN
  ssnOrSin?: string;
  dlNumber?: string; // Driver's license number
  housingStatus: HousingStatus;
  yearsAtResidence: number;
  address: AddressInfo;
  homeAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone: string;
  mobilePhone?: string;
  mobile?: string;
  email: string;
}

export interface FinancingFacility {
  id: string;
  lenderName: string;
  productType?: string;
  originalAmount?: number;
  currentBalance: number;
  paymentAmount?: number;
  paymentFrequency?: "daily" | "weekly" | "bi_weekly" | "monthly";
  startDate?: string;
}

export interface ExistingFinancingInfo {
  hasFinancing: boolean;
  hasExistingFinancing?: boolean;
  hasCashAdvanceBefore: boolean;
  cashAdvanceProvider?: string;
  cashAdvanceWhen?: string;
  lenderName?: string;
  approximateBalance?: number;
  dailyOrWeeklyPayment?: number;
  position?: string;
  facilities: FinancingFacility[];
}

export interface PropertyInfo {
  occupancyType: OccupancyType;
  locationType?: string;
  landlordOrMortgageBank: string;
  landlordOrMortgagee?: string;
  accountNumber?: string;
  contactName?: string;
  phone?: string;
  landlordPhone?: string;
  monthlyRentOrMortgage: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
}

export interface PaymentProcessingInfo {
  currentProcessor?: string;
  terminalSoftwareModel?: string;
  numberOfTerminals: number;
  averageMonthlyVolume: number;
  averageMonthlyProcessingVolume?: number;
  acceptsCreditCards?: boolean;
  visa?: boolean;
  mastercard?: boolean;
  amex?: boolean;
  debit?: boolean;
  highMonth?: string;
  lowMonth?: string;
  acceptedCards: {
    visaMastercard: boolean;
    amex: boolean;
    discover: boolean;
    debit: boolean;
    ebt: boolean;
  };
}

export interface TradeReference {
  id: string;
  businessName: string;
  companyName?: string;
  accountNumber: string;
  contactName: string;
  contactPerson?: string;
  contactPhone: string;
  phone?: string;
}

export interface SignatureAuditTrail {
  envelopeId: string;
  signerName: string;
  signerTitle: string;
  signerEmail?: string;
  signerPhone?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string; // ISO 8601
  formattedTimestamp: string;
  documentHash: string; // SHA-256 digest
  consentStatement: string;
  complianceStandard: string;
  secondSigner?: {
    signerName: string;
    signerTitle: string;
    signerEmail?: string;
    signerPhone?: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp?: string;
    formattedTimestamp?: string;
    documentHash?: string;
  };
}

export interface AuthorizationInfo {
  applicantName: string;
  signerName?: string;
  applicantTitle: string;
  signerTitle?: string;
  signatureDataUrl?: string; // PNG base64 from digital signature pad
  signatureDate: string;
  dateSigned?: string;
  creditCheckConsent?: boolean;

  secondApplicantName?: string;
  secondApplicantTitle?: string;
  secondSignatureDataUrl?: string;
  secondSignatureDate?: string;

  termsAccepted: boolean;
  ipAddress?: string;
  userAgent?: string;
  auditTrail?: SignatureAuditTrail;
}

export interface GeneratedDocumentRecord {
  id: string;
  lenderKey: string;
  lenderName: string;
  fileName: string;
  generatedAt: string;
  downloadUrl?: string;
  pdfBase64?: string;
}

export interface BusinessFinancingApplication {
  id: string; // e.g. "APP-10482"
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  status: ApplicationStatus;
  assignedAgent?: string;
  assignedSubagent?: string;

  business: BusinessInfo;
  financials: FinancialsInfo;
  owners: OwnerInfo[];
  existingFinancing: ExistingFinancingInfo;
  property: PropertyInfo;
  paymentProcessing: PaymentProcessingInfo;
  tradeReferences: TradeReference[];
  authorization: AuthorizationInfo;

  generatedDocuments?: GeneratedDocumentRecord[];
  notes?: string;
}

export interface LenderFieldAudit {
  fieldKey: string;
  label: string;
  satisfied: boolean;
  currentValue?: any;
  requirementNote?: string;
}

export interface LenderValidationReport {
  lenderKey: string;
  lenderName: string;
  isReady: boolean;
  isValid: boolean;
  completenessPercentage: number;
  missingRequiredFields: string[];
  missingFields: string[];
  warnings: string[];
  audits: LenderFieldAudit[];
}

export const CANADIAN_PROVINCES = [
  { code: "ON", name: "Ontario" },
  { code: "BC", name: "British Columbia" },
  { code: "AB", name: "Alberta" },
  { code: "QC", name: "Quebec" },
  { code: "MB", name: "Manitoba" },
  { code: "SK", name: "Saskatchewan" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "NT", name: "Northwest Territories" },
  { code: "YT", name: "Yukon" },
  { code: "NU", name: "Nunavut" },
];

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Helper to generate a blank application
export function createBlankFinancingApplication(customId?: string): BusinessFinancingApplication {
  const idNum = Math.floor(10000 + Math.random() * 90000);
  const id = customId || `APP-${idNum}`;
  const now = new Date().toISOString();

  return {
    id,
    createdAt: now,
    updatedAt: now,
    status: "draft",
    business: {
      legalName: "",
      dba: "",
      businessNumber: "",
      entityType: "corporation",
      industryType: "services",
      productServiceSold: "",
      dateStarted: "",
      lengthOfOwnershipYears: 0,
      lengthOfOwnershipMonths: 0,
      provinceOfIncorporation: "ON",
      numberOfLocations: 1,
      legalAddress: { street: "", city: "", province: "ON", postalCode: "" },
      physicalAddress: { street: "", city: "", province: "ON", postalCode: "" },
      physicalSameAsLegal: true,
      mailingAddressChoice: "legal",
      phone: "",
      fax: "",
      email: "",
      website: "",
    },
    financials: {
      requestedAmount: 75000,
      useOfFunds: "working_capital",
      grossMonthlySales: 35000,
      grossAnnualSales: 420000,
      nonCardMonthlySales: 15000,
      isSeasonal: false,
      isFranchise: false,
    },
    owners: [
      {
        id: "owner-1",
        isPrimary: true,
        firstName: "",
        lastName: "",
        title: "Owner / Director",
        ownershipPercentage: 100,
        dob: "",
        sin: "",
        housingStatus: "own",
        yearsAtResidence: 5,
        address: { street: "", city: "", province: "ON", postalCode: "" },
        phone: "",
        mobile: "",
        email: "",
      },
    ],
    existingFinancing: {
      hasFinancing: false,
      hasCashAdvanceBefore: false,
      facilities: [],
    },
    property: {
      occupancyType: "rent",
      landlordOrMortgageBank: "",
      accountNumber: "",
      contactName: "",
      phone: "",
      monthlyRentOrMortgage: 4500,
    },
    paymentProcessing: {
      currentProcessor: "Moneris",
      terminalSoftwareModel: "Ingenico Move 5000",
      numberOfTerminals: 2,
      averageMonthlyVolume: 20000,
      acceptedCards: {
        visaMastercard: true,
        amex: true,
        discover: false,
        debit: true,
        ebt: false,
      },
    },
    tradeReferences: [
      {
        id: "ref-1",
        businessName: "",
        accountNumber: "",
        contactName: "",
        contactPhone: "",
      },
      {
        id: "ref-2",
        businessName: "",
        accountNumber: "",
        contactName: "",
        contactPhone: "",
      },
    ],
    authorization: {
      applicantName: "",
      applicantTitle: "Owner",
      signatureDate: new Date().toISOString().split("T")[0],
      termsAccepted: false,
    },
  };
}

// Sample benchmark data for demonstration and instant testing
export function createSampleBenchmarkApplication(): BusinessFinancingApplication {
  const blank = createBlankFinancingApplication("APP-10482");
  const today = new Date().toISOString().split("T")[0];

  return {
    ...blank,
    status: "submitted",
    submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    assignedAgent: "QuickFlo Financial",
    assignedSubagent: "Direct Funding Desk",
    business: {
      legalName: "Apex Dynamics Auto Care Inc.",
      dba: "Apex Automotive Solutions",
      businessNumber: "784930129",
      entityType: "corporation",
      industryType: "retail",
      productServiceSold: "Automotive repair, diagnostics, and high-performance tire sales",
      businessDescription: "Full service auto repair center operating 6 service bays in central Toronto with consistent fleet contracts.",
      dateStarted: "2019-04-15",
      lengthOfOwnershipYears: 7,
      lengthOfOwnershipMonths: 5,
      provinceOfIncorporation: "ON",
      numberOfLocations: 2,
      legalAddress: {
        street: "880 Dundas Street East, Suite 204",
        city: "Mississauga",
        province: "ON",
        postalCode: "L4Y 4G6",
      },
      physicalAddress: {
        street: "1420 The Queensway",
        city: "Etobicoke",
        province: "ON",
        postalCode: "M8Z 1T5",
      },
      physicalSameAsLegal: false,
      mailingAddressChoice: "dba",
      phone: "416-555-8920",
      fax: "416-555-8921",
      email: "finance@apexautomotive.ca",
      website: "https://www.apexautomotive.ca",
    },
    financials: {
      requestedAmount: 125000,
      useOfFunds: "equipment_purchase",
      useOfFundsOther: "State-of-the-art EV diagnostic scanner and secondary alignment lift",
      grossMonthlySales: 68500,
      grossAnnualSales: 822000,
      nonCardMonthlySales: 18500,
      isSeasonal: true,
      peakSalesStartMonth: "April",
      peakSalesEndMonth: "November",
      isFranchise: false,
    },
    owners: [
      {
        id: "owner-1",
        isPrimary: true,
        firstName: "Marcus",
        lastName: "Vance",
        title: "President & CEO",
        ownershipPercentage: 70,
        dob: "1983-06-22",
        sin: "482-901-384",
        dlNumber: "V1849-30492-38401",
        housingStatus: "own",
        yearsAtResidence: 8,
        address: {
          street: "42 Sunnyside Avenue",
          city: "Toronto",
          province: "ON",
          postalCode: "M6R 2N8",
        },
        phone: "416-555-4019",
        mobile: "647-555-7832",
        email: "marcus.vance@apexautomotive.ca",
      },
      {
        id: "owner-2",
        isPrimary: false,
        firstName: "Elena",
        lastName: "Reyes-Vance",
        title: "Chief Operating Officer",
        ownershipPercentage: 30,
        dob: "1985-11-14",
        sin: "519-382-771",
        dlNumber: "R9021-48201-19402",
        housingStatus: "own",
        yearsAtResidence: 8,
        address: {
          street: "42 Sunnyside Avenue",
          city: "Toronto",
          province: "ON",
          postalCode: "M6R 2N8",
        },
        phone: "416-555-4019",
        mobile: "647-555-8819",
        email: "elena.reyes@apexautomotive.ca",
      },
    ],
    existingFinancing: {
      hasFinancing: true,
      hasCashAdvanceBefore: true,
      cashAdvanceProvider: "QuickBridge Capital",
      cashAdvanceWhen: "2024-03-10",
      facilities: [
        {
          id: "fac-1",
          lenderName: "Royal Bank Commercial Facility",
          productType: "Operating Line of Credit",
          originalAmount: 50000,
          currentBalance: 18400,
          paymentAmount: 850,
          paymentFrequency: "monthly",
          startDate: "2022-01-15",
        },
        {
          id: "fac-2",
          lenderName: "QuickBridge Capital",
          productType: "Revenue-Based Advance",
          originalAmount: 40000,
          currentBalance: 9200,
          paymentAmount: 420,
          paymentFrequency: "daily",
          startDate: "2024-03-10",
        },
      ],
    },
    property: {
      occupancyType: "lease",
      landlordOrMortgageBank: "Metropolis Commercial Properties REIT",
      accountNumber: "MCP-8849-01",
      contactName: "Arthur Pendelton",
      phone: "416-555-3000",
      monthlyRentOrMortgage: 6800,
      leaseStartDate: "2021-05-01",
      leaseEndDate: "2028-04-30",
    },
    paymentProcessing: {
      currentProcessor: "Global Payments Canada",
      terminalSoftwareModel: "Verifone V400c Countertop",
      numberOfTerminals: 3,
      averageMonthlyVolume: 49500,
      acceptedCards: {
        visaMastercard: true,
        amex: true,
        discover: true,
        debit: true,
        ebt: false,
      },
    },
    tradeReferences: [
      {
        id: "ref-1",
        businessName: "Worldpac Auto Parts Distribution",
        accountNumber: "WP-CAN-48201",
        contactName: "David Steinberg",
        contactPhone: "905-555-9102",
      },
      {
        id: "ref-2",
        businessName: "Continental Tire Canada Commercial",
        accountNumber: "CT-COMM-99321",
        contactName: "Gretchen Mueller",
        contactPhone: "905-555-8840",
      },
      {
        id: "ref-3",
        businessName: "Castrol Industrial Lubricants",
        accountNumber: "CAS-77401",
        contactName: "Trevor MacLeod",
        contactPhone: "416-555-6671",
      },
    ],
    authorization: {
      applicantName: "Marcus Vance",
      applicantTitle: "President & CEO",
      signatureDate: today,
      secondApplicantName: "Elena Reyes-Vance",
      secondApplicantTitle: "Chief Operating Officer",
      secondSignatureDate: today,
      termsAccepted: true,
    },
  };
}

export function createEmptyApplication(): BusinessFinancingApplication {
  const today = new Date().toISOString().split("T")[0];
  const id = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    business: {
      legalName: "",
      dba: "",
      tradeName: "",
      businessNumber: "",
      federalTaxId: "",
      entityType: "corporation",
      structureType: "corporation",
      industryType: "other",
      industry: "",
      natureOfBusiness: "",
      productServiceSold: "",
      businessDescription: "",
      dateStarted: today,
      dateEstablished: today,
      lengthOfOwnershipYears: 1,
      lengthOfOwnershipMonths: 0,
      lengthOfOwnership: "1 year",
      provinceOfIncorporation: "ON",
      numberOfLocations: 1,
      legalAddress: {
        street: "",
        city: "",
        province: "ON",
        postalCode: "",
      },
      physicalAddress: {
        street: "",
        city: "",
        province: "ON",
        postalCode: "",
      },
      city: "",
      province: "ON",
      postalCode: "",
      country: "Canada",
      physicalSameAsLegal: true,
      mailingAddressChoice: "legal",
      phone: "",
      businessPhone: "",
      email: "",
      businessEmail: "",
      website: "",
    },
    financials: {
      requestedAmount: 0,
      amountRequested: 0,
      useOfFunds: "working_capital",
      useOfFundsOther: "",
      preferredTerm: "12 months",
      grossMonthlySales: 0,
      averageMonthlyRevenue: 0,
      grossAnnualSales: 0,
      annualGrossRevenue: 0,
      averageBankBalance: 0,
      averageBankBalanceLast3Mos: 0,
      nonCardMonthlySales: 0,
      isSeasonal: false,
      isFranchise: false,
    },
    owners: [
      {
        id: "owner-1",
        isPrimary: true,
        firstName: "",
        lastName: "",
        title: "President / Owner",
        ownershipPercentage: 100,
        dob: "1980-01-01",
        sin: "",
        ssnOrSin: "",
        dlNumber: "",
        housingStatus: "rent",
        yearsAtResidence: 1,
        address: {
          street: "",
          city: "",
          province: "ON",
          postalCode: "",
        },
        homeAddress: "",
        city: "",
        province: "ON",
        postalCode: "",
        phone: "",
        mobilePhone: "",
        mobile: "",
        email: "",
      },
    ],
    existingFinancing: {
      hasFinancing: false,
      hasExistingFinancing: false,
      hasCashAdvanceBefore: false,
      lenderName: "",
      approximateBalance: 0,
      dailyOrWeeklyPayment: 0,
      position: "1st",
      facilities: [],
    },
    property: {
      occupancyType: "rent",
      locationType: "leased",
      landlordOrMortgageBank: "",
      landlordOrMortgagee: "",
      monthlyRentOrMortgage: 0,
      phone: "",
      landlordPhone: "",
    },
    paymentProcessing: {
      currentProcessor: "",
      numberOfTerminals: 1,
      averageMonthlyVolume: 0,
      averageMonthlyProcessingVolume: 0,
      acceptsCreditCards: false,
      visa: false,
      mastercard: false,
      amex: false,
      debit: false,
      highMonth: "",
      lowMonth: "",
      acceptedCards: {
        visaMastercard: false,
        amex: false,
        discover: false,
        debit: false,
        ebt: false,
      },
    },
    tradeReferences: [
      {
        id: "ref-1",
        businessName: "",
        companyName: "",
        accountNumber: "",
        contactName: "",
        contactPerson: "",
        contactPhone: "",
        phone: "",
      },
      {
        id: "ref-2",
        businessName: "",
        companyName: "",
        accountNumber: "",
        contactName: "",
        contactPerson: "",
        contactPhone: "",
        phone: "",
      },
    ],
    authorization: {
      applicantName: "",
      signerName: "",
      applicantTitle: "President",
      signerTitle: "President",
      signatureDate: today,
      dateSigned: today,
      creditCheckConsent: false,
      termsAccepted: false,
      signatureDataUrl: "",
    },
  };
}

// Bidirectional Normalizer: Ensures 100% of fields and aliases across Journey Capital, CanaCap, and QuickFlo are in sync
export function normalizeApplicationData(
  rawApp: BusinessFinancingApplication
): BusinessFinancingApplication {
  if (!rawApp) return createEmptyApplication();
  const base = { ...rawApp };

  // 1. Business
  const b = { ...(base.business || {}) } as any;
  const legalName = (b.legalName || "").trim();
  const dba = (b.dba || b.tradeName || "").trim();
  const tradeName = (b.tradeName || b.dba || "").trim();
  const phone = (b.phone || b.businessPhone || "").trim();
  const businessPhone = (b.businessPhone || b.phone || "").trim();
  const fax = (b.fax || "").trim();
  const email = (b.email || b.businessEmail || "").trim();
  const businessEmail = (b.businessEmail || b.email || "").trim();
  const website = (b.website || "").trim();
  const businessNumber = (b.businessNumber || b.federalTaxId || "").trim();
  const federalTaxId = (b.federalTaxId || b.businessNumber || "").trim();
  const dateStarted = (b.dateStarted || b.dateEstablished || "").trim();
  const dateEstablished = (b.dateEstablished || b.dateStarted || "").trim();
  const provinceOfIncorporation = (b.provinceOfIncorporation || b.province || "ON").trim();
  const numberOfLocations = Number(b.numberOfLocations) || 1;

  // Address
  const physStreet = typeof b.physicalAddress === "string" ? b.physicalAddress : (b.physicalAddress?.street || b.street || "");
  const physCity = (b.city || (typeof b.physicalAddress === "object" ? b.physicalAddress?.city : "") || "").trim();
  const physProv = (b.province || (typeof b.physicalAddress === "object" ? b.physicalAddress?.province : "") || "ON").trim();
  const physPostal = (b.postalCode || (typeof b.physicalAddress === "object" ? b.physicalAddress?.postalCode : "") || "").trim();

  const physicalAddress = {
    street: physStreet,
    city: physCity,
    province: physProv,
    postalCode: physPostal,
  };

  const legStreet = typeof b.legalAddress === "string" ? b.legalAddress : (b.legalAddress?.street || physStreet);
  const legCity = (typeof b.legalAddress === "object" && b.legalAddress?.city) || physCity;
  const legProv = (typeof b.legalAddress === "object" && b.legalAddress?.province) || physProv;
  const legPostal = (typeof b.legalAddress === "object" && b.legalAddress?.postalCode) || physPostal;

  const legalAddress = {
    street: legStreet,
    city: legCity,
    province: legProv,
    postalCode: legPostal,
  };

  let years = Number(b.lengthOfOwnershipYears) || 0;
  let months = Number(b.lengthOfOwnershipMonths) || 0;
  if (!years && !months && b.lengthOfOwnership) {
    const match = String(b.lengthOfOwnership).match(/(\d+)\s*(?:yr|year)/i);
    if (match) years = parseInt(match[1], 10);
  }
  const lengthOfOwnership = years > 0 ? `${years} yrs ${months || 0} mos` : (months > 0 ? `${months} mos` : (b.lengthOfOwnership || "1 yr"));

  let entityType = (b.entityType || b.structureType || "corporation").toLowerCase();
  if (entityType.includes("sole")) entityType = "sole_proprietorship";
  else if (entityType.includes("partnership") && !entityType.includes("limited")) entityType = "partnership";
  else if (entityType.includes("limited") && entityType.includes("partnership")) entityType = "limited_partnership";
  else if (entityType.includes("llc")) entityType = "llc";
  else if (entityType.includes("llp")) entityType = "llp";
  else entityType = "corporation";

  const industryType = (b.industryType || "services").toLowerCase();
  const productServiceSold = b.productServiceSold || b.industry || b.natureOfBusiness || "Commercial Products & Services";

  const business = {
    ...b,
    legalName,
    dba,
    tradeName,
    phone,
    businessPhone,
    fax,
    email,
    businessEmail,
    website,
    businessNumber,
    federalTaxId,
    dateStarted,
    dateEstablished,
    lengthOfOwnershipYears: years,
    lengthOfOwnershipMonths: months,
    lengthOfOwnership,
    provinceOfIncorporation,
    numberOfLocations,
    physicalAddress,
    legalAddress,
    city: physCity,
    province: physProv,
    postalCode: physPostal,
    country: b.country || "Canada",
    physicalSameAsLegal: b.physicalSameAsLegal !== false,
    mailingAddressChoice: b.mailingAddressChoice || "legal",
    entityType,
    structureType: entityType,
    industryType,
    industryTypeOther: b.industryTypeOther || "",
    productServiceSold,
    industry: b.industry || productServiceSold,
    natureOfBusiness: b.natureOfBusiness || productServiceSold,
  };

  // 2. Financials
  const f = { ...(base.financials || {}) } as any;
  const requestedAmount = Number(f.requestedAmount) || Number(f.amountRequested) || 0;
  const grossMonthlySales = Number(f.grossMonthlySales) || Number(f.averageMonthlyRevenue) || 0;
  const grossAnnualSales = Number(f.grossAnnualSales) || Number(f.annualGrossRevenue) || (grossMonthlySales ? grossMonthlySales * 12 : 0);
  const averageBankBalance = Number(f.averageBankBalance) || Number(f.averageBankBalanceLast3Mos) || 0;
  const nonCardMonthlySales = Number(f.nonCardMonthlySales) || (grossMonthlySales > 0 ? Math.round(grossMonthlySales * 0.4) : 0);

  const financials = {
    ...f,
    requestedAmount,
    amountRequested: requestedAmount,
    grossMonthlySales,
    averageMonthlyRevenue: grossMonthlySales,
    grossAnnualSales,
    annualGrossRevenue: grossAnnualSales,
    averageBankBalance,
    averageBankBalanceLast3Mos: averageBankBalance,
    nonCardMonthlySales,
    useOfFunds: f.useOfFunds || "working_capital",
    useOfFundsOther: f.useOfFundsOther || "",
    preferredTerm: f.preferredTerm || "12 months",
    isSeasonal: Boolean(f.isSeasonal),
    peakSalesStartMonth: f.peakSalesStartMonth || "",
    peakSalesEndMonth: f.peakSalesEndMonth || "",
    isFranchise: Boolean(f.isFranchise),
    franchisorName: f.franchisorName || "",
    franchisorPhone: f.franchisorPhone || "",
  };

  // 3. Owners
  const rawOwners = Array.isArray(base.owners) && base.owners.length > 0 ? base.owners : [createEmptyApplication().owners[0]];
  const owners = rawOwners.map((o: any, idx: number) => {
    const firstName = (o.firstName || "").trim();
    const lastName = (o.lastName || "").trim();
    const title = (o.title || (idx === 0 ? "President / Owner" : "Vice President / Partner")).trim();
    const sin = (o.sin || o.ssnOrSin || "").trim();
    const ssnOrSin = (o.ssnOrSin || o.sin || "").trim();
    const dlNumber = (o.dlNumber || "").trim();
    const dob = (o.dob || "1985-01-01").trim();
    const housingStatus = (o.housingStatus || "rent").toLowerCase();
    const yearsAtResidence = Number(o.yearsAtResidence) || 1;
    const phone = (o.phone || o.homePhone || o.mobile || o.mobilePhone || "").trim();
    const homePhone = (o.homePhone || o.phone || "").trim();
    const mobile = (o.mobile || o.mobilePhone || o.phone || "").trim();
    const mobilePhone = (o.mobilePhone || o.mobile || o.phone || "").trim();
    const email = (o.email || "").trim();

    const homeStreet = o.homeAddress || (typeof o.address === "object" ? o.address?.street : "") || "";
    const homeCity = o.city || (typeof o.address === "object" ? o.address?.city : "") || "";
    const homeProv = o.province || (typeof o.address === "object" ? o.address?.province : "") || "ON";
    const homePostal = o.postalCode || (typeof o.address === "object" ? o.address?.postalCode : "") || "";

    const address = {
      street: homeStreet,
      city: homeCity,
      province: homeProv,
      postalCode: homePostal,
    };

    return {
      ...o,
      id: o.id || `owner-${idx + 1}`,
      isPrimary: idx === 0,
      firstName,
      lastName,
      title,
      ownershipPercentage: Number(o.ownershipPercentage) || (idx === 0 ? 100 : 0),
      dob,
      sin,
      ssnOrSin,
      dlNumber,
      housingStatus,
      yearsAtResidence,
      address,
      homeAddress: homeStreet,
      city: homeCity,
      province: homeProv,
      postalCode: homePostal,
      phone,
      homePhone,
      mobile,
      mobilePhone,
      email,
    };
  });

  // 4. Property
  const p = { ...(base.property || {}) } as any;
  const landlordOrMortgageBank = (p.landlordOrMortgageBank || p.landlordOrMortgagee || "").trim();
  const landlordOrMortgagee = (p.landlordOrMortgagee || p.landlordOrMortgageBank || "").trim();
  const landlordPhone = (p.landlordPhone || p.phone || "").trim();
  const propertyPhone = (p.phone || p.landlordPhone || "").trim();
  const accountNumber = (p.accountNumber || "").trim();
  const contactName = (p.contactName || p.contactPerson || "").trim();
  const contactPerson = (p.contactPerson || p.contactName || "").trim();
  const locationType = (p.locationType || (p.occupancyType === "own" ? "owned" : "leased")).toLowerCase();
  const occupancyType = (p.occupancyType || (locationType === "owned" ? "own" : "rent")).toLowerCase();

  const property = {
    ...p,
    landlordOrMortgageBank,
    landlordOrMortgagee,
    phone: propertyPhone,
    landlordPhone,
    accountNumber,
    contactName,
    contactPerson,
    locationType,
    occupancyType,
    monthlyRentOrMortgage: Number(p.monthlyRentOrMortgage) || 0,
    leaseStartDate: p.leaseStartDate || "",
    leaseEndDate: p.leaseEndDate || "",
  };

  // 5. Existing Financing
  const ef = { ...(base.existingFinancing || {}) } as any;
  const hasExistingFinancing = Boolean(ef.hasExistingFinancing || ef.hasFinancing);
  const existingFinancing = {
    ...ef,
    hasFinancing: hasExistingFinancing,
    hasExistingFinancing,
    hasCashAdvanceBefore: Boolean(ef.hasCashAdvanceBefore),
    cashAdvanceProvider: ef.cashAdvanceProvider || "",
    cashAdvanceWhen: ef.cashAdvanceWhen || "",
    lenderName: ef.lenderName || "",
    approximateBalance: Number(ef.approximateBalance) || 0,
    dailyOrWeeklyPayment: Number(ef.dailyOrWeeklyPayment) || 0,
    position: ef.position || "1st",
    facilities: Array.isArray(ef.facilities) ? ef.facilities : [],
  };

  // 6. Payment Processing
  const pp = { ...(base.paymentProcessing || {}) } as any;
  const avgVol = Number(pp.averageMonthlyVolume) || Number(pp.averageMonthlyProcessingVolume) || 0;
  const acceptedCards = pp.acceptedCards || {
    visaMastercard: Boolean(pp.visa || pp.mastercard || true),
    amex: Boolean(pp.amex),
    discover: Boolean(pp.discover),
    debit: Boolean(pp.debit || true),
    ebt: Boolean(pp.ebt),
  };

  const paymentProcessing = {
    ...pp,
    currentProcessor: pp.currentProcessor || "",
    terminalSoftwareModel: pp.terminalSoftwareModel || "",
    numberOfTerminals: Number(pp.numberOfTerminals) || 1,
    averageMonthlyVolume: avgVol,
    averageMonthlyProcessingVolume: avgVol,
    acceptsCreditCards: pp.acceptsCreditCards !== false,
    visa: Boolean(pp.visa || acceptedCards.visaMastercard),
    mastercard: Boolean(pp.mastercard || acceptedCards.visaMastercard),
    amex: Boolean(pp.amex || acceptedCards.amex),
    debit: Boolean(pp.debit || acceptedCards.debit),
    highMonth: pp.highMonth || "",
    lowMonth: pp.lowMonth || "",
    acceptedCards,
  };

  // 7. Trade References (Ensure at least 2)
  const rawRefs = Array.isArray(base.tradeReferences) ? base.tradeReferences : [];
  const ref1 = rawRefs[0] || {};
  const ref2 = rawRefs[1] || {};

  const tradeReferences = [
    {
      id: ref1.id || "ref-1",
      businessName: ref1.businessName || ref1.companyName || "",
      companyName: ref1.companyName || ref1.businessName || "",
      accountNumber: ref1.accountNumber || "",
      contactName: ref1.contactName || ref1.contactPerson || "",
      contactPerson: ref1.contactPerson || ref1.contactName || "",
      contactPhone: ref1.contactPhone || ref1.phone || "",
      phone: ref1.phone || ref1.contactPhone || "",
    },
    {
      id: ref2.id || "ref-2",
      businessName: ref2.businessName || ref2.companyName || "",
      companyName: ref2.companyName || ref2.businessName || "",
      accountNumber: ref2.accountNumber || "",
      contactName: ref2.contactName || ref2.contactPerson || "",
      contactPerson: ref2.contactPerson || ref2.contactName || "",
      contactPhone: ref2.contactPhone || ref2.phone || "",
      phone: ref2.phone || ref2.contactPhone || "",
    },
  ];

  // 8. Authorization & Audit Trail
  const auth = { ...(base.authorization || {}) } as any;
  const p1 = owners[0];
  const p2 = owners[1];
  const signerName = auth.signerName || auth.applicantName || (p1 ? `${p1.firstName} ${p1.lastName}`.trim() : "");
  const signerTitle = auth.signerTitle || auth.applicantTitle || (p1?.title || "President");
  const dateSigned = auth.dateSigned || auth.signatureDate || new Date().toISOString().split("T")[0];

  const authorization = {
    ...auth,
    applicantName: signerName,
    signerName,
    applicantTitle: signerTitle,
    signerTitle,
    dateSigned,
    signatureDate: dateSigned,
    signatureDataUrl: auth.signatureDataUrl || "",
    creditCheckConsent: Boolean(auth.creditCheckConsent),
    termsAccepted: Boolean(auth.termsAccepted),
    secondApplicantName: auth.secondApplicantName || (p2 ? `${p2.firstName} ${p2.lastName}`.trim() : ""),
    secondApplicantTitle: auth.secondApplicantTitle || (p2?.title || "Vice President"),
    secondSignatureDataUrl: auth.secondSignatureDataUrl || "",
    secondSignatureDate: auth.secondSignatureDate || (auth.secondApplicantName ? dateSigned : ""),
    ipAddress: auth.ipAddress || (auth.auditTrail?.ipAddress || ""),
    userAgent: auth.userAgent || (auth.auditTrail?.userAgent || ""),
    auditTrail: auth.auditTrail || undefined,
  };

  return {
    ...base,
    business,
    financials,
    owners,
    property,
    existingFinancing,
    paymentProcessing,
    tradeReferences,
    authorization,
  };
}


