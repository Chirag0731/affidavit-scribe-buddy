export interface ParsedAddress {
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

const PROVINCE_MAP: Record<string, string> = {
  ontario: "ON",
  quebec: "QC",
  "british columbia": "BC",
  alberta: "AB",
  manitoba: "MB",
  saskatchewan: "SK",
  "nova scotia": "NS",
  "new brunswick": "NB",
  newfoundland: "NL",
  "prince edward island": "PE",
  "northwest territories": "NT",
  yukon: "YT",
  nunavut: "NU",
};

const US_STATES_MAP: Record<string, string> = {
  california: "CA",
  newyork: "NY",
  "new york": "NY",
  texas: "TX",
  florida: "FL",
  illinois: "IL",
  washington: "WA",
  pennsylvania: "PA",
  ohio: "OH",
  georgia: "GA",
  michigan: "MI",
  "north carolina": "NC",
  "new jersey": "NJ",
  virginia: "VA",
};

/**
 * Intelligent address string parser supporting Canadian and US formats.
 * Handles single-line comma-separated, multi-line, and raw clipboard strings.
 */
export function parseAddressString(rawInput: string): ParsedAddress {
  const result: ParsedAddress = {
    street: "",
    city: "",
    province: "",
    postalCode: "",
    country: "Canada",
  };

  if (!rawInput || !rawInput.trim()) return result;

  let text = rawInput.trim();

  // Detect Country
  if (/\b(canada|can)\b/i.test(text)) {
    result.country = "Canada";
    text = text.replace(/,?\s*\b(canada|can)\b/i, "");
  } else if (/\b(usa|united states|us)\b/i.test(text)) {
    result.country = "USA";
    text = text.replace(/,?\s*\b(usa|united states|us)\b/i, "");
  }

  // Detect Postal Code / ZIP Code
  // Canadian Postal Code: A1A 1A1 or A1A-1A1 or A1A1A1
  const caPostalMatch = text.match(/\b([A-Za-z]\d[A-Za-z])[ -]?(\d[A-Za-z]\d)\b/);
  if (caPostalMatch) {
    result.postalCode = `${caPostalMatch[1].toUpperCase()} ${caPostalMatch[2].toUpperCase()}`;
    result.country = "Canada";
    text = text.replace(caPostalMatch[0], "").trim();
  } else {
    // US ZIP Code: 5 digits optionally followed by -4 digits
    const usZipMatch = text.match(/\b(\d{5}(?:-\d{4})?)\b/);
    if (usZipMatch) {
      result.postalCode = usZipMatch[1];
      if (result.country !== "Canada") result.country = "USA";
      text = text.replace(usZipMatch[0], "").trim();
    }
  }

  // Normalize multi-lines into comma separated
  text = text.replace(/[\r\n]+/g, ", ");

  // Split by comma
  const parts = text
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return result;

  if (parts.length === 1) {
    result.street = parts[0];
    return result;
  }

  // The first 1 or 2 parts usually comprise the Street Address
  if (parts.length === 2) {
    result.street = parts[0];
    // Check if parts[1] contains City & Province
    const subParts = parts[1].split(/\s+/).filter(Boolean);
    if (subParts.length >= 2) {
      result.province = subParts.pop()?.toUpperCase() || "";
      result.city = subParts.join(" ");
    } else {
      result.city = parts[1];
    }
    return result;
  }

  // For 3+ parts:
  // e.g. "450 Front St W", "Unit 1204", "Toronto", "ON"
  // or "450 Front St W", "Toronto", "ON"
  const lastPart = parts[parts.length - 1];
  const secondLastPart = parts[parts.length - 2];

  // Check if lastPart is province/state code (2 letters) or spelled out name
  const provClean = lastPart.toLowerCase().trim();
  if (PROVINCE_MAP[provClean]) {
    result.province = PROVINCE_MAP[provClean];
    result.city = secondLastPart;
    result.street = parts.slice(0, parts.length - 2).join(", ");
    return result;
  }
  if (US_STATES_MAP[provClean]) {
    result.province = US_STATES_MAP[provClean];
    result.city = secondLastPart;
    result.street = parts.slice(0, parts.length - 2).join(", ");
    return result;
  }
  if (/^[A-Za-z]{2}$/.test(lastPart)) {
    result.province = lastPart.toUpperCase();
    result.city = secondLastPart;
    result.street = parts.slice(0, parts.length - 2).join(", ");
    return result;
  }

  // Check if secondLastPart or lastPart contains City + Province: e.g. "Toronto ON"
  const cityProvMatch = lastPart.match(/^([A-Za-z\s.-]+)\s+([A-Za-z]{2})$/);
  if (cityProvMatch) {
    result.city = cityProvMatch[1].trim();
    result.province = cityProvMatch[2].toUpperCase();
    result.street = parts.slice(0, parts.length - 1).join(", ");
    return result;
  }

  // Standard fallback assignment
  result.province = lastPart.toUpperCase();
  result.city = secondLastPart;
  result.street = parts.slice(0, parts.length - 2).join(", ");

  return result;
}
