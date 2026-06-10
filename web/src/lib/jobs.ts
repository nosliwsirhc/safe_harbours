// Reads the public job board from D1 (populated by the jobs-sync worker). This is
// the ONLY way the public site sees jobs — it never touches SharePoint. Every read
// is wrapped so the careers page can never 500: on any error (missing binding, D1
// hiccup) it falls back to "no openings".
import { env } from 'cloudflare:workers';

/** The public projection shape (mirror of jobs-sync PublicPosting). */
export interface JobPosting {
  postingId: string;
  title: string;
  programDepartment: string | null;
  employmentType: string | null;
  scheduleShift: string[];
  numberOfOpenings: number | null;
  shortSummary: string | null;
  fullDescription: string | null;
  additionalDuties: string | null;
  standardDuties: string | null;
  screeningRequirement: string | null;
  reqBeforeHireCerts: string[];
  reqBeforeHireTraining: string[];
  providedAfterHireTraining: string[];
  educationPrograms: string[];
  wageMin: number | null;
  wageMax: number | null;
  payBasis: string | null;
  openDate: string | null;
  closingDate: string;
  languageRequirement: string | null;
  workEligibilityRequired: boolean;
  unionStatus: string | null;
  unionClassification: string | null;
  aiScreeningUsed: boolean;
  aiDisclosureStatement: string | null;
  accommodationStatement: string | null;
  howToApply: { url: string; label: string } | null;
  roleTemplate: string | null;
  home: string | null;
  city: string | null;
  region: string | null;
  publishedAt: string | null;
}

const ORG_TZ = 'America/Toronto';
function todayOrg(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ORG_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function db(): D1Database | null {
  const d = (env as unknown as { DB?: D1Database }).DB;
  return d ?? null;
}

/** All currently-open postings (past-closing hidden as a backstop), soonest-closing first. */
export async function listJobs(): Promise<JobPosting[]> {
  const d = db();
  if (!d) return [];
  try {
    const { results } = await d
      .prepare('SELECT data FROM postings WHERE closing_date >= ? ORDER BY closing_date ASC')
      .bind(todayOrg())
      .all<{ data: string }>();
    return results.map((r) => JSON.parse(r.data) as JobPosting);
  } catch (err) {
    console.error('[jobs] listJobs failed', err);
    return [];
  }
}

/** One open posting by its public id, or null (not found / closed / error). */
export async function getJob(postingId: string): Promise<JobPosting | null> {
  const d = db();
  if (!d) return null;
  try {
    const row = await d
      .prepare('SELECT data FROM postings WHERE posting_id = ? AND closing_date >= ?')
      .bind(postingId, todayOrg())
      .first<{ data: string }>();
    return row ? (JSON.parse(row.data) as JobPosting) : null;
  } catch (err) {
    console.error('[jobs] getJob failed', err);
    return null;
  }
}
