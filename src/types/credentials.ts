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
  {
    key: "phoenix",
    label: "University of Phoenix — Official Transcript",
    institution: "University of Phoenix",
    kind: "transcript",
    pageW: 612,
    pageH: 792,
    accent: "#1a3a5c",
  },
  {
    key: "queens",
    label: "Queen's University — Official Transcript",
    institution: "Queen's University",
    kind: "transcript",
    pageW: 792,
    pageH: 612,
    accent: "#b90e31",
  },
  {
    key: "lse",
    label: "LSE — Academic Transcript",
    institution: "The London School of Economics and Political Science",
    kind: "transcript",
    pageW: 595,
    pageH: 842,
    accent: "#e02020",
  },
  {
    key: "fleming",
    label: "Fleming College — Unofficial Transcript",
    institution: "Fleming College",
    kind: "transcript",
    pageW: 612,
    pageH: 792,
    accent: "#1f5c45",
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

    case "phoenix":
      return {
        ...s,
        addressLines: [
          "Registrar's Office",
          "3201 E. Elwood Street",
          "Phoenix, AZ  85034",
          "1-800-866-3919",
        ],
        studentName: "DAVID L. HUDGINGS",
        studentId: "9029381654 / ***-**-****",
        studentAddress: ["DAVID HUDGINGS", "3419 HEATHERWOOD TRCE", "CLARKSVILLE, TN 37040-5736", "US"],
        issueDate: "07/17/2013",
        gradeMode: "letter",
        officialName: "Audra McQuarie, Registrar",
        notes: [
          "AARTS - MILITARY CREDITS|50.00|",
          "AUSTIN PEAY STATE UNIVERSITY|6.00|",
          "CENTRAL TEXAS COLLEGE|3.00|",
          "KAPLAN UNIVERSITY - DAVENPORT|40.65|",
          "PIERCE COLLEGE|6.66|",
          "TROY UNIVERSITY|10.00|",
        ],
        courses: [
          { code: "", num: "BSA/375", name: "FUNDAMENTALS OF BUSINESS SYSTEMS DEVELOPMENT", grade: "WC", credits: "0.00", extra: "0.00|0.00" },
          { code: "", num: "CMGT/410", name: "PROJECT PLANNING & IMPLEMENTATION", grade: "WC", credits: "0.00", extra: "0.00|0.00" },
          { code: "", num: "NTC/240", name: "INTRO TO LAN TECHNOLOGIES", grade: "WC", credits: "0.00", extra: "0.00|0.00" },
          { code: "07/2011", num: "GEN/200", name: "FOUNDATIONS FOR GENERAL EDUCATION AND PROFESSIONAL SUCCESS", grade: "A-", credits: "3.00", extra: "3.00|11.01" },
          { code: "08/2011", num: "ENG/221", name: "TECHNICAL WRITING FUNDAMENTALS", grade: "A-", credits: "3.00", extra: "3.00|11.01" },
          { code: "10/2011", num: "CIS/319", name: "COMPUTERS AND INFORMATION PROCESSING", grade: "A", credits: "3.00", extra: "3.00|12.00" },
          { code: "11/2011", num: "POS/371", name: "PROGRAMMING CONCEPTS", grade: "A", credits: "3.00", extra: "3.00|12.00" },
          { code: "01/2012", num: "WEB/236", name: "WEB DESIGN I", grade: "A", credits: "3.00", extra: "3.00|12.00" },
          { code: "03/2012", num: "WEB/237", name: "WEB DESIGN II", grade: "A", credits: "3.00", extra: "3.00|12.00" },
          { code: "04/2012", num: "BSA/310", name: "BUSINESS SYSTEMS", grade: "B+", credits: "3.00", extra: "3.00|9.99" },
          { code: "05/2012", num: "NTC/247", name: "WIRELESS NETWORKING CONCEPTS", grade: "B+", credits: "3.00", extra: "3.00|9.99" },
          { code: "07/2012", num: "CMGT/441", name: "INTRODUCTION TO INFORMATION SYSTEMS SECURITY MANAGEMENT", grade: "A-", credits: "3.00", extra: "3.00|11.01" },
          { code: "08/2012", num: "NTC/249", name: "WIDE AREA NETWORKING CONCEPTS", grade: "W", credits: "0.00", extra: "0.00|0.00" },
          { code: "09/2012", num: "NTC/362", name: "FUNDAMENTALS OF NETWORKING", grade: "B-", credits: "3.00", extra: "3.00|8.01" },
          { code: "10/2012", num: "NTC/249", name: "WIDE AREA NETWORKING CONCEPTS", grade: "B-", credits: "3.00", extra: "3.00|8.01" },
          { code: "11/2012", num: "DBM/380", name: "DATABASE CONCEPTS", grade: "A", credits: "3.00", extra: "3.00|12.00" },
          { code: "01/2013", num: "POS/410", name: "SQL FOR BUSINESS", grade: "A-", credits: "3.00", extra: "3.00|11.01" },
          { code: "02/2013", num: "PRG/420", name: "JAVA PROGRAMMING I", grade: "B-", credits: "3.00", extra: "3.00|8.01" },
          { code: "03/2013", num: "POS/420", name: "INTRODUCTION TO UNIX", grade: "A-", credits: "3.00", extra: "3.00|11.01" },
          { code: "04/2013", num: "MTH/233", name: "STATISTICS", grade: "B", credits: "3.00", extra: "3.00|9.00" },
          { code: "04/2013", num: "PRG/421", name: "JAVA PROGRAMMING II", grade: "B-", credits: "3.00", extra: "3.00|8.01" },
        ],
        extra: {
          birthdate: "03/19/1969",
          schoolHeading: "UNIVERSITY OF PHOENIX",
          pageLabel: "Page 1 of 2",
          bannerLeft: "AN OFFICIAL SIGNATURE IS WHITE WITH A BLUE BACKGROUND",
          bannerRight: "A RAISED SEAL IS NOT REQUIRED",
          bottomBanner: "THE NAME OF THE UNIVERSITY APPEARS ACROSS THE FACE OF THIS DOCUMENT",
          security:
            "This officially sealed and signed transcript is printed on blue SCRIP-SAFE security paper with the name of the university printed in white type across the face of the document. When photocopied, the name of the institution appears on one line and the word \"COPY\" appears on the next. A BLACK ON WHITE OR A COLOR COPY SHOULD NOT BE ACCEPTED!",
        },
      };

    case "queens":
      return {
        ...s,
        addressLines: ["Office of the University Registrar", "Kingston, Canada", "K7L 3N6"],
        studentName: "MacLean,Cole",
        studentId: "05917180",
        printDate: "11/4/2015",
        gradeMode: "percent",
        officialName: "JOHN METCALFE",
        officialTitle: "UNIVERSITY REGISTRAR",
        courses: [
          { code: "CHEE", num: "310", name: "Innovation & Entrepreneurship", credits: "3.50", grade: "81", extra: "13.0" },
          { code: "CHEE", num: "311", name: "Phase And Reaction Equilibrium", credits: "3.50", grade: "78", extra: "11.6" },
          { code: "CHEE", num: "315", name: "Laboratory Projects II", credits: "4.00", grade: "73", extra: "12.0" },
          { code: "CHEE", num: "321", name: "Chemical Reaction Engineering", credits: "3.50", grade: "78", extra: "11.6" },
          { code: "CHEE", num: "330", name: "Heat And Mass Transfer", credits: "3.50", grade: "73", extra: "10.5" },
          { code: "CHEE", num: "360A", name: "Technical Communications II", credits: "0.00", grade: "NG", extra: "0.0" },
          { code: "CHEE", num: "380", name: "Biochemical Engineering", credits: "3.50", grade: "69", extra: "8.0" },
          { code: GPA_ROW, name: "3.10", credits: "21.50", grade: "21.50", extra: "66.6" },
          { code: TERM_ROW, name: "2011 Winter", grade: "" },
          { code: "APSC", num: "381", name: "Fundamentals Of Design Eng", credits: "3.50", grade: "79", extra: "11.6" },
          { code: "CHEE", num: "319", name: "Process Dynamics & Control", credits: "3.50", grade: "74", extra: "10.5" },
          { code: "CHEE", num: "331", name: "Design & Scaleup Of Unit Opera", credits: "3.50", grade: "69", extra: "8.0" },
          { code: "CHEE", num: "360B", name: "Technical Communications II", credits: "1.50", grade: "77", extra: "5.0" },
          { code: "CHEM", num: "326", name: "Environmental&Green Chemistry", credits: "3.00", grade: "67", extra: "6.9" },
          { code: "CLST", num: "214", name: "Ancient Science", credits: "3.00", grade: "90", extra: "12.9" },
          { code: GPA_ROW, name: "3.05", credits: "18.00", grade: "18.00", extra: "54.8" },
          { code: TERM_ROW, name: "2011 Fall", grade: "" },
          { code: "APSC", num: "400A", name: "Tech Eng And Mgmt Team", credits: "0.00", grade: "NG", extra: "0.0" },
          { code: "CHEE", num: "418", name: "Strategies Proc Investigations", credits: "3.50", grade: "C", extra: "7.0" },
          { code: "CHEE", num: "420", name: "Laboratory Projects III", credits: "4.00", grade: "B+", extra: "13.2" },
          { code: "CHEE", num: "470", name: "Design Of Manuf Process", credits: "6.25", grade: "A-", extra: "23.1" },
          { code: "CHEE", num: "481", name: "Air Quality Management", credits: "3.00", grade: "A-", extra: "11.1" },
          { code: GPA_ROW, name: "3.25", credits: "16.75", grade: "16.75", extra: "54.4" },
          { code: TERM_ROW, name: "2012 Winter", grade: "" },
          { code: "APSC", num: "400B", name: "Tech Eng And Mgmt Team", credits: "6.50", grade: "A", extra: "26.0" },
          { code: "CHEE", num: "370", name: "Waste Treatment Processes", credits: "3.50", grade: "B+", extra: "11.6" },
          { code: "CHEE", num: "412", name: "Transport Phen. In Chem. Eng.", credits: "3.50", grade: "C", extra: "7.0" },
          { code: "CHEE", num: "440", name: "Pharmaceutical Technology", credits: "3.50", grade: "C-", extra: "6.0" },
          { code: "COMM", num: "200", name: "Introduction To Business", credits: "3.00", grade: "A-", extra: "11.1" },
          { code: "MECH", num: "480", name: "Aerospace Engineering", credits: "3.50", grade: "A+", extra: "15.0" },
          { code: GPA_ROW, name: "3.26", credits: "23.50", grade: "23.50", extra: "76.6" },
        ],
        notes: [
          "Transcript valid only if bearing embossed seal and official signature, printed on watermarked security paper with invisible fibers.",
        ],
        extra: {
          pageLabel: "Page 2 of 2",
          careerTotalsLabel: "Undergraduate Career Totals",
          cumTotals: "169.50|163.50|541.4",
          endLine: "----- End of Transcript -----",
          stamp: "ISSUED TO STUDENT",
        },
      };

    case "lse":
      return {
        ...s,
        institution: "The London School of Economics and Political Science",
        studentName: "Krystal Lee NORMAN",
        gender: "female",
        studentId: "201429978",
        program: "MSc in History of International Relations",
        credential: "MSc in History of International Relations",
        startDate: "01 October 2014",
        endDate: "30 September 2015",
        issueDate: "24 November 2015",
        printDate: "11 November 2015",
        gradeMode: "percent",
        officialName: "Hannah Bannister",
        officialTitle: "Head of Student Services",
        courses: [
          { code: "2014/5", num: "HY442", name: "Secret Intelligence in the 20th century", credits: "1.0", grade: "66", extra: "V|M" },
          { code: "2014/5", num: "HY411", name: "European Integration in the Twentieth Century", credits: "1.0", grade: "59", extra: "V|P" },
          { code: "2014/5", num: "HY499", name: "Dissertation", credits: "1.0", grade: "55", extra: "V|P" },
          { code: "2014/5", num: "LL475", name: "Terrorism and the Rule of Law", credits: "0.5", grade: "61", extra: "V|M" },
          { code: "2014/5", num: "IR439", name: "Diplomacy", credits: "0.5", grade: "60", extra: "V|M" },
        ],
        notes: [],
        extra: {
          dob: "30 April 1982",
          ukHeId: "1411370035065",
          pageLabel: "PAGE 1 OF 3",
          banner: "VALID ONLY FOR ONLINE VIEWING AT https://verify.lse.ac.uk",
          statement:
            "The above named was a student at the London School of Economics and Political Science and followed a programme which is 1 year in length when studied in full-time mode",
          awardingBody: "London School of Economics and Political Science",
          class: "Pass",
          language: "English",
        },
      };

    case "fleming":
      return {
        ...s,
        institution: "Fleming College",
        studentName: "Navjinder Singh",
        studentId: "10153550",
        studentAddress: ["31-1837 Lansdowne Street W", "Peterborough, Ontario, K9K 1R4"],
        printDate: "19/06/2020",
        program: "International Business Mgmt",
        plan: "International Business Management",
        credential: "Ontario College Graduate Certificate",
        endDate: "06/06/2017",
        gradeMode: "percent",
        average: "3.051",
        averageLabel: "Program GPA",
        courses: [
          { code: TERM_ROW, name: "2016 Winter (11/01/2016 - 22/04/2016)", grade: "" },
          { code: "ACCT", num: "88", name: "Int Trade Financing & Acct", credits: "45.000", grade: "71" },
          { code: "COMP", num: "494", name: "Computer App International Bus", credits: "45.000", grade: "78" },
          { code: "INTL", num: "3", name: "Importing & Exporting Regs", credits: "45.000", grade: "66" },
          { code: "MGMT", num: "171", name: "Innovation Global Marketplace", credits: "45.000", grade: "67" },
          { code: "MGMT", num: "226", name: "Corp Social Resp in Global Env", credits: "45.000", grade: "72" },
          { code: GPA_ROW, name: "2.600", grade: "" },
          { code: TERM_ROW, name: "2016 Spring (09/05/2016 - 12/08/2016)", grade: "" },
          { code: "APST", num: "108", name: "Applied Projects", credits: "175.000", grade: "86" },
          { code: "LAWS", num: "252", name: "Role of Intl Law in Business", credits: "45.000", grade: "71" },
          { code: "MGMT", num: "170", name: "Leadership Globalized Envr.", credits: "45.000", grade: "78" },
          { code: "MKTG", num: "119", name: "International Marketing", credits: "45.000", grade: "71" },
          { code: "MKTG", num: "120", name: "International Market Research", credits: "45.000", grade: "69" },
          { code: "MTRL", num: "42", name: "Global Supply Chain Mgmt", credits: "45.000", grade: "82" },
          { code: GPA_ROW, name: "3.305", grade: "" },
        ],
        extra: {
          tagline: "LEARN  |  BELONG  |  BECOME",
          title: "Unofficial Transcript",
          pageLabel: "Page 1 of 1",
          endLine: "End of Unofficial Transcript",
        },
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

export const isMarkerRow = (c: { code: string }) => c.code === TERM_ROW || c.code === GPA_ROW;

export function randomizeGrades(spec: CredentialSpec, opts: GradeRandomOptions): CredentialSpec {
  const courses = spec.courses.map((c) =>
    isMarkerRow(c) ? c : { ...c, grade: randomGrade(spec, c.grade, opts) },
  );
  const next = { ...spec, courses };
  return { ...next, average: computeAverage(next) };
}

/** Designs whose "average" field is a GPA that must not be recomputed from marks. */
const GPA_DESIGNS: DesignKey[] = ["queens", "fleming", "lse", "phoenix"];

export function computeAverage(spec: CredentialSpec): string {
  if (spec.gradeMode !== "percent" || GPA_DESIGNS.includes(spec.design)) return spec.average;
  const nums = spec.courses
    .filter((c) => !isMarkerRow(c))
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
