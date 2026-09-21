import {
  BusinessInfo,
  FinancialsInfo,
  OwnerInfo,
  PaymentProcessingInfo,
  AuthorizationInfo,
} from "@/types/financing";

export function validateEmail(email?: string): boolean {
  if (!email || !email.trim()) return false;
  // RFC 5322 simplified pattern requiring user, domain, and TLD of at least 2 chars
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

export function validatePhone(phone?: string): boolean {
  if (!phone || !phone.trim()) return false;
  const digits = phone.replace(/\D/g, "");
  // Canadian and US phone numbers must have 10 digits (or 11 if leading with country code 1)
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

export function formatPhone(raw?: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  const clean = digits.startsWith("1") && digits.length === 11 ? digits.slice(1) : digits;
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 3)}) ${clean.slice(3)}`;
  return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6, 10)}`;
}

export function validatePostalCode(code?: string): boolean {
  if (!code || !code.trim()) return false;
  const clean = code.trim().toUpperCase();
  // Canadian Postal code: A1A 1A1 or A1A1A1
  const isCa = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/.test(clean);
  // US ZIP code: 5 digits or 5+4
  const isUs = /^\d{5}(-\d{4})?$/.test(clean);
  return isCa || isUs;
}

export function formatPostalCode(raw?: string): string {
  if (!raw) return "";
  const clean = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  // If Canadian 6 chars
  if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(clean)) {
    return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  }
  return raw.trim().toUpperCase();
}

export function validateSinOrSsn(id?: string): boolean {
  if (!id || !id.trim()) return true; // Optional field
  const digits = id.replace(/\D/g, "");
  return digits.length === 9;
}

export function formatSinOrSsn(raw?: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
}

export function validateDateNotFuture(dateStr?: string): boolean {
  if (!dateStr || !dateStr.trim()) return false;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return d <= today;
}

export function validateAge18Plus(dobStr?: string): boolean {
  if (!dobStr || !dobStr.trim()) return false;
  const dob = new Date(dobStr + "T00:00:00");
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 18;
}

// Step 0 validation: Business Details
export function validateStep0(business: BusinessInfo): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!business.legalName || !business.legalName.trim()) {
    errors.legalName = "Legal Corporate Name is required";
  }

  const phone = business.businessPhone || business.phone;
  if (!phone || !phone.trim()) {
    errors.businessPhone = "Business phone number is required";
  } else if (!validatePhone(phone)) {
    errors.businessPhone = "Enter a valid 10-digit phone number (e.g. 555-000-0000)";
  }

  const email = business.businessEmail || business.email;
  if (email && email.trim() && !validateEmail(email)) {
    errors.businessEmail = "Enter a valid business email address (e.g. contact@domain.com)";
  }

  const street =
    typeof business.physicalAddress === "string"
      ? business.physicalAddress
      : business.physicalAddress?.street;
  if (!street || !street.trim()) {
    errors.physicalAddress = "Physical operating street address is required";
  }

  if (business.postalCode && business.postalCode.trim() && !validatePostalCode(business.postalCode)) {
    errors.postalCode = "Enter a valid postal code (e.g. M5V 2T6 or 10001)";
  }

  if (business.dateEstablished && !validateDateNotFuture(business.dateEstablished)) {
    errors.dateEstablished = "Date established cannot be in the future";
  }

  return errors;
}

// Step 1 validation: Financial Profile
export function validateStep1(
  financials: FinancialsInfo,
  paymentProcessing: PaymentProcessingInfo
): Record<string, string> {
  const errors: Record<string, string> = {};

  const req = financials.amountRequested || financials.requestedAmount || 0;
  if (!req || req <= 0) {
    errors.amountRequested = "Requested financing amount must be greater than $0";
  }

  const annual = financials.annualGrossRevenue || financials.grossAnnualSales || 0;
  if (!annual || annual <= 0) {
    errors.annualGrossRevenue = "Gross annual sales must be greater than $0";
  }

  if (paymentProcessing.acceptsCreditCards) {
    const vol = paymentProcessing.averageMonthlyProcessingVolume || 0;
    if (vol < 0) {
      errors.cardVolume = "Monthly processing volume cannot be negative";
    }
  }

  return errors;
}

// Step 2 validation: Owners
export function validateStep2(owners: OwnerInfo[]): {
  general?: string;
  fieldErrors: Record<number, Record<string, string>>;
} {
  const fieldErrors: Record<number, Record<string, string>> = {};
  let general: string | undefined;

  if (!owners || owners.length === 0) {
    return { general: "At least one principal owner must be registered", fieldErrors: {} };
  }

  let totalEquity = 0;

  owners.forEach((owner, idx) => {
    const errs: Record<string, string> = {};

    if (!owner.firstName || !owner.firstName.trim()) {
      errs.firstName = "First name is required";
    }

    if (!owner.lastName || !owner.lastName.trim()) {
      errs.lastName = "Last name is required";
    }

    const pct = Number(owner.ownershipPercentage) || 0;
    totalEquity += pct;
    if (pct <= 0 || pct > 100) {
      errs.ownershipPercentage = "Ownership must be between 1% and 100%";
    }

    const phone = owner.mobilePhone || owner.phone;
    if (phone && phone.trim() && !validatePhone(phone)) {
      errs.mobilePhone = "Enter a valid 10-digit mobile phone number";
    }

    if (owner.email && owner.email.trim() && !validateEmail(owner.email)) {
      errs.email = "Enter a valid personal email address";
    }

    if (owner.ssnOrSin && owner.ssnOrSin.trim() && !validateSinOrSsn(owner.ssnOrSin)) {
      errs.ssnOrSin = "SSN or SIN must be 9 digits";
    }

    if (owner.dob && owner.dob.trim()) {
      if (!validateDateNotFuture(owner.dob)) {
        errs.dob = "Date of birth cannot be in the future";
      } else if (!validateAge18Plus(owner.dob)) {
        errs.dob = "Principal must be at least 18 years of age";
      }
    }

    if (Object.keys(errs).length > 0) {
      fieldErrors[idx] = errs;
    }
  });

  if (totalEquity <= 0) {
    general = "Please allocate ownership equity among principals";
  } else if (totalEquity > 100) {
    general = `Total allocated equity (${totalEquity}%) cannot exceed 100%`;
  }

  return { general, fieldErrors };
}

// Step 5 validation: Authorization & Signature
export function validateStep5(authorization: AuthorizationInfo): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!authorization.creditCheckConsent) {
    errors.creditCheckConsent = "You must acknowledge and consent to the credit & records verification";
  }

  if (!authorization.signatureDataUrl || !authorization.signatureDataUrl.trim()) {
    errors.signatureDataUrl = "Please provide your digital e-signature before completing submission";
  }

  return errors;
}
