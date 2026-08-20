// Transcript / Diploma generator — data model, built-in designs and randomisers.

export type CredentialKind = "transcript" | "diploma";

export type DesignKey =
  | "sheridan"
  | "niit"
  | "york"
  | "marca"
  | "fernourt"
  | "cdi"
  | "phoenix"
  | "queens"
  | "lse"
  | "fleming";

/** Rows whose `code` equals one of these act as section markers, not courses. */
export const TERM_ROW = "#TERM";
export const GPA_ROW = "#GPA";

export type GradeMode = "letter" | "percent" | "none";

export type Gender = "male" | "female" | "neutral";

export interface CourseRow {
  /** Subject code / phase / appraisal type depending on the design */
  code: string;
  /** Course number (Sheridan) — free text */
  num?: string;
  name: string;
  /** Letter grade or numeric mark (stored as string) */
  grade: string;
  /** Credits / hours / weightage */
  credits?: string;
  /** Extra column: class avg, weighted score, etc. */
  extra?: string;
}

export interface CredentialSpec {
  design: DesignKey;
  kind: CredentialKind;

  institution: string;
  addressLines: string[];

  studentName: string;
  gender: Gender;
  studentId: string;
  studentAddress: string[];

  program: string;
  plan: string;
  term: string;
  credential: string;

  startDate: string;
  endDate: string;
  issueDate: string;
  printDate: string;

  gradeMode: GradeMode;
  courses: CourseRow[];

  averageLabel: string;
  average: string;
  totalHours: string;

  officialName: string;
  officialTitle: string;
  secondOfficialName: string;
  secondOfficialTitle: string;

  notes: string[];
  extra: Record<string, string>;
}

export const LETTER_GRADES = [
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "F",
  "P",
];

export const GENDER_TITLE: Record<Gender, string> = {
  male: "Mr.",
  female: "Ms.",
  neutral: "Mx.",
};

export const GENDER_PRONOUN: Record<Gender, { subject: string; possessive: string }> = {
  male: { subject: "he", possessive: "his" },
  female: { subject: "she", possessive: "her" },
  neutral: { subject: "they", possessive: "their" },
};

export interface DesignMeta {
  key: DesignKey;
  label: string;
  institution: string;
  kind: CredentialKind;
  pageW: number;
  pageH: number;
  accent: string;
}

export const DESIGNS: DesignMeta[] = [
  {
    key: "sheridan",
    label: "Sheridan College — Grade Report",
    institution: "Sheridan College",
    kind: "transcript",
    pageW: 612,
    pageH: 792,
    accent: "#0b2d5b",
  },
  {
    key: "niit",
    label: "NIIT — Semester Performance Report",
    institution: "NIIT",
    kind: "transcript",
    pageW: 595,
    pageH: 842,
    accent: "#111111",
  },
  {
    key: "york",
    label: "York University — Official Transcript",
    institution: "York University",
    kind: "transcript",
    pageW: 612,
    pageH: 792,
    accent: "#8c1d34",
  },
  {
    key: "marca",
    label: "MARCA College — Student Transcript",
    institution: "MARCA College",
    kind: "transcript",
    pageW: 612,
    pageH: 792,
    accent: "#c8102e",
  },
  {
    key: "cdi",
    label: "CDI College — Transcript of Marks",
    institution: "CDI College",
    kind: "transcript",
    pageW: 612,
    pageH: 792,
    accent: "#1f3864",
  },
  {
    key: "fernourt",
    label: "Fernourt High School — Graduation Diploma",
    institution: "Fernourt High School",
    kind: "diploma",
    pageW: 792,
    pageH: 612,
    accent: "#5b1a32",
  },
];

export const designMeta = (key: DesignKey): DesignMeta =>
  DESIGNS.find((d) => d.key === key) ?? DESIGNS[0];

const base = (): CredentialSpec => ({
  design: "sheridan",
  kind: "transcript",
  institution: "",
  addressLines: [],
  studentName: "",
  gender: "male",
  studentId: "",
  studentAddress: [],
  program: "",
  plan: "",
  term: "",
  credential: "",
  startDate: "",
  endDate: "",
  issueDate: "",
  printDate: "",
  gradeMode: "letter",
  courses: [],
  averageLabel: "Average",
  average: "",
  totalHours: "",
  officialName: "",
  officialTitle: "",
  secondOfficialName: "",
  secondOfficialTitle: "",
  notes: [],
  extra: {},
});

export function defaultSpec(design: DesignKey): CredentialSpec {
  const s = base();
  s.design = design;
  s.kind = designMeta(design).kind;
  s.institution = designMeta(design).institution;

  switch (design) {
    case "sheridan":
      return {
        ...s,
        addressLines: [
          "Issued By",
          "Office of the Registrar",
          "Sheridan College Institute of Technology",
          "and Advanced Learning",
          "1430 Trafalgar Road",
          "Oakville, ON L6H 1L1 Canada",
          "(905) 845-9430",
        ],
        studentName: "Armah, Patrick",
        studentId: "902203021",
        studentAddress: ["75, Simmons St.", "Woodbridge, ON, L4L 1A7, CAN"],
        program: "Electromechanical Engineering",
        plan: "Electromech Eng Technician",
        term: "Winter 2015",
        printDate: "May 23, 2017 18:26:47 PM",
        gradeMode: "letter",
        courses: [
          { code: "ENGI", num: "15592", name: "Applied Electricity", grade: "B+", credits: "3.00" },
          { code: "MATH", num: "17688", name: "Mathematics 1", grade: "B", credits: "3.00" },
          { code: "HEAL", num: "27485", name: "Health, Work and Safety", grade: "B", credits: "3.00" },
          { code: "ENGI", num: "15064", name: "Industrial Practices", grade: "A", credits: "3.00" },
          { code: "ENGI", num: "10025", name: "Exploring Engineering Tech", grade: "A", credits: "2.00" },
          { code: "CULT", num: "10001", name: "Impact of Culture on Workplace", grade: "A", credits: "3.00" },
          { code: "ENGI", num: "10146", name: "Engineering Graphics", grade: "A", credits: "4.00" },
        ],
        notes: [
          "Grading system details can be found at",
          "http://academicinformation.sheridaninstitute.ca",
          "If you have a query regarding any grade — contact",
          "your professor or the coordinator for your program",
        ],
      };

    case "niit":
      return {
        ...s,
        studentName: "LINA CYR",
        gender: "female",
        studentId: "R163016400106",
        program: "Diploma in Web Development",
        term: "Diploma in Web Development",
        endDate: "17/02/2017",
        issueDate: "30/3/2021",
        gradeMode: "percent",
        averageLabel: "Semester Weighted Average Performance(SWAP)",
        average: "83.33",
        courses: [
          { code: "Module  Test", name: "Programming Logic and Technique", grade: "92.00", credits: "25.00", extra: "23.00" },
          { code: "Module Test", name: "Introduction to Web Content Development", grade: "77.00", credits: "25.00", extra: "19.25" },
          { code: "Module  Test", name: "Working with Graphics using Photoshop", grade: "75.00", credits: "25.00", extra: "18.75" },
          { code: "Module  Test", name: "Developing Websites using Dreamweaver", grade: "85.00", credits: "25.00", extra: "21.25" },
          { code: "Module  Test", name: "Database development using MySQL", grade: "80.00", credits: "25.00", extra: "20.00" },
          { code: "Module Test", name: "Developing Web Applications using PHP", grade: "91.00", credits: "25.00", extra: "22.75" },
        ],
        notes: [
          "A student is said to have cleared the semester if SWAP >= 45%.",
          "CWAP is calculated as the weighted average of all semesters completed by the student.",
          "Student can avail the facility of Supplementary Exam for Performance improvement and it replaces the Module Test scores.",
          "",
          "Students are requested to notify the Centre Head of any discrepancy in the statement within 7 days .",
          "This is an electronically generated document and does not require a signature.",
        ],
        extra: {
          version: "Ver No. : 0.26",
          batchCode: "BTC11123",
          sprId: "",
          footerLeft: "GIAAN TOWER COMMUNITY 11",
          footerRight: "eNCORE/1.0",
          cwap: "83.33",
        },
      };

    case "york":
      return {
        ...s,
        addressLines: ["4700 Keele St.", "Toronto ON", "Canada M3J 1P3", "www.yorku.ca"],
        studentName: "Thompson, Ian",
        studentId: "220093778",
        program: "Lassonde School of Engineering, B.Sc., Hons. Computer Science",
        plan: "Lassonde School of Engineering, B.Sc., Computer Science",
        term: "Fall/Winter 2015",
        issueDate: "April 2020",
        printDate: "June 11, 2026",
        gradeMode: "letter",
        officialName: "Keshia Gray",
        officialTitle: "University Registrar\n& Assistant Vice Provost",
        courses: [
          { code: "AP ECON 1000", num: "N", name: "Introduction  to   Microeconomics", grade: "D", credits: "3.00", extra: "417   4.1  (C)" },
          { code: "LE EECS 1001", num: "A", name: "Research  Directions  in  Computing", grade: "P", credits: "1.00", extra: "2   0.0  (F)" },
          { code: "LE EECS 1012", num: "C", name: "Introduction  to  Computer  Science", grade: "A", credits: "3.00", extra: "425   6.0  (B)" },
          { code: "LE EECS 1019", num: "C", name: "Discrete Math for Computer Science", grade: "B", credits: "3.00", extra: "169   3.8  (C)" },
          { code: "LE EECS 1022", num: "P", name: "Introduction to Software Development", grade: "C", credits: "3.00", extra: "132   4.9  (C+)" },
          { code: "SC MATH 1300", num: "A", name: "Differential Calculus with Applications", grade: "B", credits: "3.00", extra: "178   4.8  (C+)" },
          { code: "SC MATH 1310", num: "M", name: "Integral Calculus with Applications", grade: "D+", credits: "3.00", extra: "159   3.7  (C)" },
          { code: "SC PHYS 1410", num: "A", name: "Physical Science", grade: "D", credits: "6.00", extra: "150   4.8  (C+)" },
        ],
        notes: [
          "Fall/Winter  2015  York University Automatic Entrance Scholarship",
          "Fall/Winter 2015   York University Student Life Award",
        ],
        extra: {
          degreeLine: "April 2020      Lassonde School of Engineering, B.Sc., Computer Science",
          pageLabel: "Page 1 of4",
        },
      };

    case "marca":
      return {
        ...s,
        addressLines: ["Mississauga", "4141 Dixie Road, Rockwood Mall", "Mississauga, Ontario L4W 2V5", "Tel: 833-627-2248"],
        studentName: "Joshua Fajingbesi",
        studentId: "61425",
        studentAddress: ["71 Central Park Dr", "Brampton, Ontario L6S3J3 Canada"],
        program: "Hairstyling FT",
        credential: "Diploma",
        startDate: "Jul 07, 2025",
        endDate: "Apr 24, 2026",
        printDate: "July 12, 2026",
        totalHours: "1500:04 / 1500:00",
        gradeMode: "percent",
        officialName: "",
        officialTitle: "School Official",
        courses: [
          { code: "", name: "HD: Fundamentals 1", grade: "84.50%" },
          { code: "", name: "HD: Fundamentals 2 (1 week)", grade: "92.00%" },
          { code: "", name: "HD: Guest Services", grade: "76.00%" },
          { code: "", name: "HD: Colour", grade: "78.50%" },
          { code: "", name: "HD: Business", grade: "90.00%" },
          { code: "", name: "HD: Long Hair and Additions", grade: "80.00%" },
          { code: "", name: "HD: Perm", grade: "83.00%" },
          { code: "", name: "HD: Relaxer", grade: "89.00%" },
          { code: "", name: "HD: Salon Pro", grade: "95.00%" },
          { code: "", name: "HD: Final Exam Theory", grade: "88.00%" },
          { code: "", name: "HD: Final Exam Practical", grade: "80.00%" },
          { code: "", name: "HD: Mid Term", grade: "82.83%" },
        ],
        extra: { status: "Alumni" },
      };

    case "cdi":
      return {
        ...s,
        addressLines: ["5734 Yonge Street", "North York, Ontario, M2M 4E7", "Telephone:  (416) 221-4386"],
        studentName: "CHARLES SHANNON",
        studentId: "NY2019",
        program: "BUSINESS ADMINISTRATION",
        startDate: "March 26, 2007",
        endDate: "November 09, 2007",
        issueDate: "Issued this 20th day of May, 2008.",
        gradeMode: "percent",
        averageLabel: "Final Program Average",
        average: "69%",
        totalHours: "825",
        officialTitle: "Campus Director",
        courses: [
          { code: "Introductory Phase", name: "Student Success Strategies", grade: "Complete", credits: "25" },
          { code: "", name: "Introduction to Computers", grade: "86%", credits: "50" },
          { code: "", name: "Windows Fundamentals", grade: "87%", credits: "25" },
          { code: "Applications Phase", name: "Microsoft Word", grade: "72%", credits: "50" },
          { code: "", name: "Microsoft Excel", grade: "69%", credits: "50" },
          { code: "Accounting Phase", name: "Bookkeeping and Financial Accounting – Level 1", grade: "60%", credits: "50" },
          { code: "", name: "Computerized Accounting with Simply", grade: "62%", credits: "50" },
          { code: "Business Administration", name: "Business Essentials", grade: "68%", credits: "50" },
          { code: "Phase", name: "Business Law", grade: "67%", credits: "50" },
          { code: "", name: "Economics", grade: "60%", credits: "75" },
          { code: "", name: "Marketing", grade: "78%", credits: "50" },
          { code: "", name: "Effective Business Writing", grade: "61%", credits: "50" },
          { code: "Advanced Business", name: "Human Resources", grade: "65%", credits: "50" },
          { code: "Administration Phase", name: "Finance", grade: "61%", credits: "50" },
          { code: "", name: "Preparing a Business Plan", grade: "65%", credits: "50" },
          { code: "", name: "Project Management", grade: "64%", credits: "50" },
          { code: "", name: "Professional Skills", grade: "78%", credits: "25" },
          { code: "Workplace Skills", name: "Career and Employment Strategies", grade: "Complete", credits: "25" },
        ],
        notes: [
          "To successfully meet the program outcomes, the student must:",
          "Achieve a minimum final program average of 60%, with no course mark lower than 60%",
        ],
        extra: { formCode: "CDI-TR-0000-00E", network: "Member of the Corinthian Colleges, Inc. Global Network" },
      };

    case "fernourt":
    default:
      return {
        ...s,
        design: "fernourt",
        kind: "diploma",
        institution: "FERNOURT HIGH SCHOOL",
        studentName: "Fitria Alhadar",
        gender: "female",
        gradeMode: "none",
        term: "2010",
        officialName: "Lenworth Sterling",
        officialTitle: "School Principal",
        secondOfficialName: "Sheldon Thomas",
        secondOfficialTitle: "Vice Principal",
        extra: {
          title: "GRADUATION DIPLOMA",
          awardedTo: "This Certificate is proudly awarded to:",
          body1: "has completed the necessary course of study for",
          body2: "class of {{year}} high school graduation",
        },
      };
  }
}

// ---------------------------------------------------------------- randomisers

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export interface GradeRandomOptions {
  min: number;
  max: number;
  decimals: 0 | 2;
  letterPool: string[];
}

export const DEFAULT_GRADE_OPTIONS: GradeRandomOptions = {
  min: 65,
  max: 95,
  decimals: 2,
  letterPool: ["A+", "A", "A-", "B+", "B", "B-", "C+"],
};

export function randomGrade(spec: CredentialSpec, current: string, opts: GradeRandomOptions): string {
  if (spec.gradeMode === "none") return current;
  if (spec.gradeMode === "letter") return pick(opts.letterPool.length ? opts.letterPool : LETTER_GRADES);
  if (/^complete$/i.test(current.trim())) return current;
  const hasPercent = current.includes("%");
  const value = rnd(opts.min, opts.max);
  const text = opts.decimals === 0 ? String(Math.round(value)) : value.toFixed(2);
  return hasPercent ? `${text}%` : text;
}

export function randomizeGrades(spec: CredentialSpec, opts: GradeRandomOptions): CredentialSpec {
  const courses = spec.courses.map((c) => ({ ...c, grade: randomGrade(spec, c.grade, opts) }));
  const next = { ...spec, courses };
  return { ...next, average: computeAverage(next) };
}

export function computeAverage(spec: CredentialSpec): string {
  if (spec.gradeMode !== "percent") return spec.average;
  const nums = spec.courses
    .map((c) => parseFloat(c.grade.replace("%", "")))
    .filter((n) => !Number.isNaN(n));
  if (!nums.length) return spec.average;
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  const usesPercent = spec.courses.some((c) => c.grade.includes("%"));
  return usesPercent ? `${avg.toFixed(0)}%` : avg.toFixed(2);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");

export type DateStyle = "long" | "short" | "slash" | "iso";

export function formatDate(d: Date, style: DateStyle): string {
  switch (style) {
    case "short":
      return `${MONTHS[d.getMonth()].slice(0, 3)} ${pad(d.getDate())}, ${d.getFullYear()}`;
    case "slash":
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    case "iso":
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    default:
      return `${MONTHS[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()}`;
  }
}

export function detectDateStyle(value: string): DateStyle {
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) return "slash";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "iso";
  if (/^[A-Z][a-z]{2} \d{1,2}, \d{4}/.test(value)) return "short";
  return "long";
}

export interface DateRandomOptions {
  yearFrom: number;
  yearTo: number;
  /** Program length in months used to derive the end date */
  months: number;
}

export const DEFAULT_DATE_OPTIONS: DateRandomOptions = {
  yearFrom: 2018,
  yearTo: 2025,
  months: 10,
};

export function randomizeDates(spec: CredentialSpec, opts: DateRandomOptions): CredentialSpec {
  const year = Math.floor(rnd(opts.yearFrom, opts.yearTo + 1));
  const start = new Date(year, Math.floor(rnd(0, 12)), Math.floor(rnd(1, 28)));
  const end = new Date(start);
  end.setMonth(end.getMonth() + opts.months);
  const issued = new Date(end);
  issued.setMonth(issued.getMonth() + 1);
  const printed = new Date(issued);
  printed.setDate(printed.getDate() + Math.floor(rnd(3, 60)));

  const keep = (value: string, d: Date) =>
    value ? formatDate(d, detectDateStyle(value)) : value;

  const termSeason = pick(["Winter", "Spring", "Summer", "Fall"]);

  return {
    ...spec,
    startDate: keep(spec.startDate, start),
    endDate: keep(spec.endDate, end),
    issueDate: spec.issueDate.startsWith("Issued this")
      ? `Issued this ${issued.getDate()}${ordinal(issued.getDate())} day of ${MONTHS[issued.getMonth()]}, ${issued.getFullYear()}.`
      : keep(spec.issueDate, issued),
    printDate: keep(spec.printDate, printed),
    term: /^(Winter|Spring|Summer|Fall)\s+\d{4}$/.test(spec.term)
      ? `${termSeason} ${year}`
      : spec.term,
  };
}

function ordinal(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "st";
  if (n % 10 === 2 && n % 100 !== 12) return "nd";
  if (n % 10 === 3 && n % 100 !== 13) return "rd";
  return "th";
}

const MALE_NAMES = ["Michael", "David", "Andrew", "Samuel", "Marcus", "Daniel", "Ethan", "Nathan"];
const FEMALE_NAMES = ["Sarah", "Amara", "Priya", "Rachel", "Nicole", "Fatima", "Elena", "Grace"];

/** Swap the given name for one matching the selected gender, keeping the surname. */
export function applyGenderToName(name: string, gender: Gender): string {
  if (!name.trim()) return name;
  const commaStyle = name.includes(",");
  const parts = commaStyle
    ? name.split(",").map((p) => p.trim())
    : name.trim().split(/\s+/);
  const pool = gender === "female" ? FEMALE_NAMES : MALE_NAMES;
  const isUpper = name === name.toUpperCase();
  let first = pick(pool);
  if (isUpper) first = first.toUpperCase();
  if (commaStyle) return `${parts[0]}, ${first}`;
  const rest = parts.slice(1).join(" ");
  return rest ? `${first} ${rest}` : first;
}
