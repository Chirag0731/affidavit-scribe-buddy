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


