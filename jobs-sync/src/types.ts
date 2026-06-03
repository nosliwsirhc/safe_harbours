/** Worker bindings + config (wrangler.toml [vars] + secrets). */
export interface Env {
  DB: D1Database;
  // Entra / SharePoint (FileDrop "Writer" app, certificate auth).
  TENANT_ID: string;
  WRITER_CLIENT_ID: string;
  WRITER_CERT_THUMBPRINT: string;
  WRITER_CERT_PRIVATE_KEY: string; // secret (PKCS#8 PEM)
  SHAREPOINT_HOSTNAME: string;
  HR_SITE_PATH: string;
  POSTINGS_LIST: string;
  TITLES_LIST: string;
  ORG_TZ: string;
  // Shared secret the Power Automate flow sends to POST /refresh.
  REFRESH_SECRET: string; // secret
}

/** A managed-metadata or multi-choice value, normalized to plain labels. */
export type Labels = string[];

/** The public projection of a posting — exactly what reaches D1 / the board.
 * NO internal HR fields ever appear here (enforced by field-level mapping). */
export interface PublicPosting {
  postingId: string;
  spItemId: number;
  title: string;
  status: string; // always "Open" once published
  programDepartment: string | null;
  employmentType: string | null;
  scheduleShift: Labels;
  numberOfOpenings: number | null;
  shortSummary: string | null; // plain, <= 300 chars
  fullDescription: string | null; // sanitized HTML
  additionalDuties: string | null; // sanitized HTML
  standardDuties: string | null; // sanitized HTML (override-resolved)
  screeningRequirement: string | null; // override-resolved
  reqBeforeHireCerts: Labels; // override-resolved
  reqBeforeHireTraining: Labels; // override-resolved
  providedAfterHireTraining: Labels; // override-resolved
  educationPrograms: Labels; // override-resolved
  wageMin: number | null; // override-resolved
  wageMax: number | null; // override-resolved
  payBasis: string | null; // override-resolved
  openDate: string | null; // YYYY-MM-DD
  closingDate: string; // YYYY-MM-DD
  languageRequirement: string | null;
  workEligibilityRequired: boolean;
  unionStatus: string | null;
  unionClassification: string | null;
  aiScreeningUsed: boolean;
  aiDisclosureStatement: string | null; // only present when aiScreeningUsed
  accommodationStatement: string | null;
  howToApply: { url: string; label: string } | null;
  roleTemplate: string | null; // label
  home: string | null; // label
  city: string | null;
  region: string | null;
  publishedAt: string | null;
}
