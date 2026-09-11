import JSZip from "jszip";
import {
  defaultSpec,
  randomizeGrades,
  randomizeDates,
  DEFAULT_GRADE_OPTIONS,
  DEFAULT_DATE_OPTIONS,
  type CredentialSpec,
  type DesignKey,
  type Gender,
  type GradeRandomOptions,
  type DateRandomOptions,
  DESIGNS,
  designMeta,
} from "@/types/credentials";
import { generateCredentialPdf } from "./credential-generator";

export interface StudentRosterItem {
  id: string;
  fullName: string;
  dob?: string;
  gender: Gender;
  preferredDesign?: DesignKey;
}

export type UniversitySelectionStrategy = "random_all" | "random_selected" | "single";

export interface BulkTranscriptOptions {
  strategy: UniversitySelectionStrategy;
  selectedDesigns: DesignKey[];
  singleDesign?: DesignKey;
  gradeOptions: GradeRandomOptions;
  dateOptions: DateRandomOptions;
  randomizeGrades: boolean;
  randomizeDates: boolean;
}

export interface GeneratedTranscriptResult {
  id: string;
  student: StudentRosterItem;
  design: DesignKey;
  institution: string;
  spec: CredentialSpec;
  blob: Blob;
  pdfUrl?: string;
  studentId: string;
  gpaOrAverage: string;
  filename: string;
  generatedAt: string;
}

export const TRANSCRIPT_DESIGNS: DesignKey[] = [
  "sheridan",
  "york",
  "queens",
  "lse",
  "fleming",
  "phoenix",
  "niit",
  "marca",
  "cdi",
];

const MALE_FIRST_NAMES = [
  "Chirag", "Michael", "David", "Andrew", "Samuel", "Marcus", "Daniel", "Ethan", "Nathan",
  "James", "Alexander", "Noah", "Liam", "Benjamin", "Lucas", "Henry", "William", "Zack",
  "Arjun", "Rohan", "Dev", "Rahul", "Aarav", "Kabir", "Aditya", "Tariq", "Omar", "Hassan",
  "Mateo", "Santiago", "Gabriel", "Leonardo", "Arthur", "Felix", "Oscar", "Julian",
];

const FEMALE_FIRST_NAMES = [
  "Sarah", "Amara", "Priya", "Rachel", "Nicole", "Fatima", "Elena", "Grace", "Emma",
  "Olivia", "Sophia", "Isabella", "Mia", "Charlotte", "Amelia", "Harper", "Evelyn",
  "Ananya", "Diya", "Isha", "Rhea", "Zoya", "Meera", "Aaliyah", "Layla", "Nour",
  "Camila", "Valentina", "Sofia", "Lucia", "Chloe", "Zoe", "Alice", "Freya",
];

const LAST_NAMES = [
  "Tilwani", "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill",
  "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell",
  "Mitchell", "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz",
  "Patel", "Sharma", "Singh", "Khan", "Kumar", "Mehta", "Joshi", "Verma",
];

/**
 * Generate a realistic ID number matching the specific institution's numbering schema
 */
export function generateInstitutionStudentId(design: DesignKey): string {
  const randNum = (digits: number) => {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
  };

  switch (design) {
    case "york":
      // York standard 9-digit student number beginning with 21 or 22
      return `21${randNum(7)}`;
    case "sheridan":
      // Sheridan 9-digit ID starting with 991
      return `991${randNum(6)}`;
    case "queens":
      // Queen's standard 8-digit student number starting with 20
      return `20${randNum(6)}`;
    case "lse":
      // LSE 9-digit student ID starting with 201
      return `201${randNum(6)}`;
    case "fleming":
      // Fleming 8-digit student number starting with 10
      return `10${randNum(6)}`;
    case "phoenix":
      // Phoenix 10-digit account number starting with 8
      return `80${randNum(8)}`;
    case "niit":
      // NIIT format
      return `ST-${randNum(5)}`;
    case "marca":
      // Marca student format
      return `MC-2023-${randNum(3)}`;
    case "cdi":
      // CDI student format
      return `CDI-${randNum(6)}`;
    case "fernourt":
      return `FHS-${randNum(5)}`;
    default:
      return randNum(9);
  }
}

/**
 * Parse lines of student text with robust format handling
 * Handles formats like:
 * - Chirag Tilwani, DOB: 2007-08-31, Gender: M
 * - Chirag Tilwani, 2007-08-31, M
 * - Chirag Tilwani, M, 2007-08-31
 * - Chirag Tilwani, DOB: 31/08/2007, Gender: Male, University: York
 * - Chirag Tilwani
 */
export function parseRosterText(rawText: string): StudentRosterItem[] {
  if (!rawText.trim()) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("//"));

  const results: StudentRosterItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for University / Design override
    let preferredDesign: DesignKey | undefined;
    const uniMatch = line.match(/(?:university|design|school|institution)\s*[:=]\s*([a-zA-Z0-9_-]+)/i);
    if (uniMatch) {
      const parsedKey = uniMatch[1].toLowerCase();
      const matched = DESIGNS.find(
        (d) => d.key === parsedKey || d.institution.toLowerCase().includes(parsedKey)
      );
      if (matched) preferredDesign = matched.key;
    }

    // Check for tagged DOB (e.g. DOB: 2007-08-31, birth: 1999-10-14)
    let dob: string | undefined;
    const dobTagged = line.match(/(?:dob|date of birth|birthdate|born)\s*[:=]\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})/i);
    if (dobTagged) {
      dob = dobTagged[1].trim();
    }

    // Check for tagged Gender (e.g. Gender: M, Gender: Female)
    let gender: Gender | undefined;
    const genderTagged = line.match(/(?:gender|sex)\s*[:=]\s*([a-zA-Z]+)/i);
    if (genderTagged) {
      const gStr = genderTagged[1].toLowerCase();
      if (gStr.startsWith("m")) gender = "male";
      else if (gStr.startsWith("f")) gender = "female";
      else gender = "neutral";
    }

    // Remove tags to extract name cleanly
    let cleanNameLine = line
      .replace(/(?:university|design|school|institution)\s*[:=]\s*([a-zA-Z0-9_-]+)/gi, "")
      .replace(/(?:dob|date of birth|birthdate|born)\s*[:=]\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})/gi, "")
      .replace(/(?:gender|sex)\s*[:=]\s*([a-zA-Z]+)/gi, "")
      .trim();

    // Clean any dangling commas or colons
    cleanNameLine = cleanNameLine.replace(/^[,\s;:]+|[,\s;:]+$/g, "");

    // Split remaining tokens by comma or tab or semicolon
    const tokens = cleanNameLine.split(/[,;\t]+/).map((t) => t.trim()).filter(Boolean);

    let fullName = "";
    if (tokens.length > 0) {
      fullName = tokens[0];

      // If more tokens exist, inspect for untagged DOB or Gender
      for (let j = 1; j < tokens.length; j++) {
        const tok = tokens[j];
        // Date regex: YYYY-MM-DD or DD/MM/YYYY
        if (!dob && /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$|^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(tok)) {
          dob = tok;
          continue;
        }
        // Gender token: M, F, Male, Female
        if (!gender && /^(m|male|f|female|mx|neutral)$/i.test(tok)) {
          gender = tok.toLowerCase().startsWith("f") ? "female" : tok.toLowerCase().startsWith("m") ? "male" : "neutral";
          continue;
        }
        // Check if token is part of a Last, First name format
        if (j === 1 && !fullName.includes(" ") && !/\d/.test(tok)) {
          fullName = `${tok} ${fullName}`;
        }
      }
    } else {
      fullName = cleanNameLine;
    }

    fullName = fullName.trim();
    if (!fullName) continue;

    // Guess gender if missing based on common first name or default
    if (!gender) {
      const firstName = fullName.split(/\s+/)[0]?.toLowerCase() || "";
      if (FEMALE_FIRST_NAMES.some((fn) => fn.toLowerCase() === firstName)) {
        gender = "female";
      } else if (MALE_FIRST_NAMES.some((fn) => fn.toLowerCase() === firstName)) {
        gender = "male";
      } else {
        gender = Math.random() > 0.5 ? "male" : "female";
      }
    }

    // Default DOB if missing (around 19-24 years old)
    if (!dob) {
      const birthYear = 2002 + Math.floor(Math.random() * 5);
      const birthMonth = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
      const birthDay = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
      dob = `${birthYear}-${birthMonth}-${birthDay}`;
    }

    results.push({
      id: `student-${i + 1}-${Date.now()}`,
      fullName,
      dob,
      gender,
      preferredDesign,
    });
  }

  return results;
}

/**
 * Generates sample text with exact formatted students
 */
export function generateSampleRoster(count: number): string {
  const samples: string[] = [];

  // Always include the exact example requested by the user at index 0
  samples.push("Chirag Tilwani, DOB: 2007-08-31, Gender: M");

  if (count <= 1) return samples.join("\n");

  const usedCombinations = new Set<string>(["Chirag Tilwani"]);

  for (let i = 1; i < count; i++) {
    const isFemale = Math.random() > 0.5;
    const pool = isFemale ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES;
    const first = pool[Math.floor(Math.random() * pool.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const name = `${first} ${last}`;

    if (usedCombinations.has(name) && i < count - 5) {
      continue;
    }
    usedCombinations.add(name);

    // Realistic birth year between 1998 and 2007
    const year = 1999 + Math.floor(Math.random() * 8);
    const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
    const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
    const gender = isFemale ? "F" : "M";

    samples.push(`${name}, DOB: ${year}-${month}-${day}, Gender: ${gender}`);
  }

  return samples.join("\n");
}

/**
 * Format date for university-specific presentation
 */
function formatDobForUniversity(dob: string, design: DesignKey): string {
  try {
    const parts = dob.split(/[-/]/);
    let y: number, m: number, d: number;
    if (parts[0].length === 4) {
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      d = parseInt(parts[2], 10);
    } else {
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10) - 1;
      y = parseInt(parts[2], 10);
    }

    const dateObj = new Date(y, m, d);
    const MONTHS = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    if (design === "lse") {
      return `${d} ${MONTHS[m]} ${y}`;
    }
    if (design === "york") {
      return `${MONTHS[m]} ${d}, ${y}`;
    }
    if (design === "queens" || design === "phoenix") {
      return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    return `${MONTHS[m]} ${d}, ${y}`;
  } catch {
    return dob;
  }
}

/**
 * Generate transcripts in bulk with blazing performance
 */
export async function generateBulkTranscripts(
  students: StudentRosterItem[],
  options: BulkTranscriptOptions,
  onProgress?: (completed: number, total: number) => void
): Promise<GeneratedTranscriptResult[]> {
  const total = students.length;
  if (total === 0) return [];

  // Determine available designs pool
  let designPool: DesignKey[] = [];
  if (options.strategy === "single" && options.singleDesign) {
    designPool = [options.singleDesign];
  } else if (options.strategy === "random_selected" && options.selectedDesigns.length > 0) {
    designPool = options.selectedDesigns;
  } else {
    designPool = TRANSCRIPT_DESIGNS;
  }

  const results: GeneratedTranscriptResult[] = [];
  const BATCH_SIZE = 15; // Parallel chunking for maximum UI responsiveness and speed
  let completedCount = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = students.slice(i, i + BATCH_SIZE);

    const chunkPromises = chunk.map(async (student, idx) => {
      // Pick design: either student's explicit preferred design or from pool
      let design: DesignKey;
      if (student.preferredDesign && TRANSCRIPT_DESIGNS.includes(student.preferredDesign)) {
        design = student.preferredDesign;
      } else {
        const poolIndex = (i + idx) % designPool.length;
        design = designPool[poolIndex];
      }

      const meta = designMeta(design);
      const baseSpec = defaultSpec(design);

      // Student name capitalization:
      // Queens and CDI traditionally use uppercase names
      const studentName =
        design === "queens" || design === "cdi"
          ? student.fullName.toUpperCase()
          : student.fullName;

      // Realistic ID
      const studentId = generateInstitutionStudentId(design);

      // DOB formatting
      const dobFormatted = student.dob ? formatDobForUniversity(student.dob, design) : undefined;

      const spec: CredentialSpec = {
        ...baseSpec,
        studentName,
        gender: student.gender,
        studentId,
        extra: {
          ...baseSpec.extra,
          ...(dobFormatted ? { dob: dobFormatted } : {}),
          ...(design === "york" ? { studentNumber: studentId } : {}),
        },
      };

      // Apply grade and date randomization
      let finalizedSpec = spec;
      if (options.randomizeGrades) {
        finalizedSpec = randomizeGrades(finalizedSpec, options.gradeOptions);
      }
      if (options.randomizeDates) {
        finalizedSpec = randomizeDates(finalizedSpec, options.dateOptions);
      }

      // Generate the PDF binary Blob
      const blob = await generateCredentialPdf(finalizedSpec);
      const pdfUrl = URL.createObjectURL(blob);

      // Format clean filename: "LastName_FirstName_Institution_StudentID.pdf"
      const nameClean = student.fullName.replace(/[^a-zA-Z0-9]/g, "_");
      const instClean = meta.institution.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `${nameClean}_${instClean}_${studentId}.pdf`;

      return {
        id: `gen-${student.id}-${Date.now()}-${idx}`,
        student,
        design,
        institution: meta.institution,
        spec: finalizedSpec,
        blob,
        pdfUrl,
        studentId,
        gpaOrAverage: finalizedSpec.average || "N/A",
        filename,
        generatedAt: new Date().toISOString(),
      };
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
    completedCount += chunkResults.length;

    if (onProgress) {
      onProgress(completedCount, total);
    }

    // Yield back to main thread briefly so UI stays smooth
    await new Promise((r) => setTimeout(r, 0));
  }

  return results;
}

/**
 * Export all or selected generated transcripts into a ZIP package with manifest CSV
 */
export async function exportTranscriptsAsZip(
  transcripts: GeneratedTranscriptResult[],
  zipFilename = "Neptora_Bulk_Transcripts.zip"
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder("Transcripts") || zip;

  // Build manifest CSV lines
  const csvLines: string[] = [
    '"Index","Full Name","Gender","Date of Birth","Institution","Design Key","Student ID","Average / GPA","Program","Filename"',
  ];

  for (let i = 0; i < transcripts.length; i++) {
    const t = transcripts[i];
    const arrayBuffer = await t.blob.arrayBuffer();
    folder.file(t.filename, arrayBuffer);

    const escape = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
    csvLines.push(
      [
        String(i + 1),
        escape(t.student.fullName),
        escape(t.student.gender),
        escape(t.student.dob || "N/A"),
        escape(t.institution),
        escape(t.design),
        escape(t.studentId),
        escape(t.gpaOrAverage),
        escape(t.spec.program || ""),
        escape(t.filename),
      ].join(",")
    );
  }

  // Add summary manifest to zip
  zip.file("ROSTER_MANIFEST.csv", csvLines.join("\r\n"));

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return zipBlob;
}

/**
 * Helper to trigger immediate download of any blob in browser
 */
export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
