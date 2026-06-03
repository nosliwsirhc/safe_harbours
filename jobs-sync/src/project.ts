// The projection: read SharePoint, resolve sparse overrides against the role
// template, apply the publish gate, and build the sanitized public record.
// Field-level mapping only — internal HR columns are never read into PublicPosting.
import type { Env, PublicPosting } from './types';
import { readList, mmLabels, choiceMulti, text, num, bool, dateOnly, hyperlink, personPresent, lookupTitle } from './sp';
import { sanitizeHtml } from './sanitize';

/** Posting override field -> template (Job Titles) source field. 8 identity, 1 rename. */
const OVERRIDE_MAP: Record<string, string> = {
  StandardDuties: 'StandardDuties',
  ReqBeforeHireCerts: 'ReqBeforeHireCerts',
  ReqBeforeHireTraining: 'ReqBeforeHireTraining',
  ProvidedAfterHireTraining: 'ProvidedAfterHireTraining',
  EducationPrograms: 'EducationPrograms',
  ScreeningRequirement: 'ScreeningLevel', // <- the one renamed field
  WageMin: 'WageMin',
  WageMax: 'WageMax',
  PayBasis: 'PayBasis',
};

const POSTING_SELECT = [
  'Id', 'Title', 'PostingID', 'PostingStatus', 'ProgramDepartment', 'EmploymentType',
  'ScheduleShift', 'NumberOfOpenings', 'ShortSummary', 'FullDescription', 'AdditionalDuties',
  'StandardDuties', 'ScreeningRequirement', 'ReqBeforeHireCerts', 'ReqBeforeHireTraining',
  'ProvidedAfterHireTraining', 'EducationPrograms', 'WageMin', 'WageMax', 'PayBasis',
  'OpenDate', 'ClosingDate', 'AIScreeningUsed', 'AIDisclosureStatement', 'AccommodationStatement',
  'WorkEligibilityRequired', 'LanguageRequirement', 'UnionStatus', 'UnionClassification',
  'HowToApply', 'PublishedAt', 'ApprovalDate',
  'RoleTemplate/Id', 'RoleTemplate/Title', 'Home/Title', 'Home/HomeCity', 'Home/HomeRegion', 'ApprovedBy/Title', 'ApprovedBy/Id',
];
const TITLE_SELECT = [
  'Id', 'Title', 'StandardDuties', 'ReqBeforeHireCerts', 'ReqBeforeHireTraining',
  'ProvidedAfterHireTraining', 'EducationPrograms', 'ScreeningLevel', 'WageMin', 'WageMax', 'PayBasis',
];

export type Raw = Record<string, any>;

export async function loadTemplates(env: Env): Promise<Map<number, Raw>> {
  const rows = await readList(env, env.TITLES_LIST, { select: TITLE_SELECT });
  return new Map(rows.map((r) => [Number(r.Id), r]));
}

/** Candidate postings = status Open (full gate still applied per-row in code). */
export function loadPostings(env: Env): Promise<Raw[]> {
  return readList(env, env.POSTINGS_LIST, {
    select: POSTING_SELECT,
    expand: ['RoleTemplate', 'Home', 'ApprovedBy'],
    filter: "PostingStatus eq 'Open'",
  });
}

function isEmpty(v: any): boolean {
  if (v == null || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (Array.isArray(v?.results)) return v.results.length === 0;
  return false;
}

/** Today's calendar date (YYYY-MM-DD) in the org timezone. */
export function todayInOrg(env: Env): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: env.ORG_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/** The publish gate — ALL must hold. Reads internal gate fields but never projects them. */
export function gatePasses(p: Raw, env: Env): boolean {
  if (text(p.PostingStatus) !== 'Open') return false;
  if (!personPresent(p.ApprovedBy)) return false;
  if (isEmpty(p.ApprovalDate)) return false;
  const closing = dateOnly(p.ClosingDate);
  if (!closing || closing < todayInOrg(env)) return false; // end-of-day: closes today still open today
  if (bool(p.AIScreeningUsed) && isEmpty(p.AIDisclosureStatement)) return false;
  return true;
}

/** Build the public record. `postingId` is resolved/assigned by the caller. */
export async function buildPublic(p: Raw, template: Raw | undefined, postingId: string): Promise<PublicPosting> {
  const pick = (field: string): any => (isEmpty(p[field]) ? template?.[OVERRIDE_MAP[field]!] : p[field]);
  const aiUsed = bool(p.AIScreeningUsed);
  const summary = text(p.ShortSummary);
  return {
    postingId,
    spItemId: Number(p.Id),
    title: text(p.Title) ?? 'Untitled posting',
    status: 'Open',
    programDepartment: text(p.ProgramDepartment),
    employmentType: text(p.EmploymentType),
    scheduleShift: choiceMulti(p.ScheduleShift),
    numberOfOpenings: num(p.NumberOfOpenings),
    shortSummary: summary ? summary.slice(0, 300) : null,
    fullDescription: await sanitizeHtml(text(p.FullDescription)),
    additionalDuties: await sanitizeHtml(text(p.AdditionalDuties)),
    standardDuties: await sanitizeHtml(text(pick('StandardDuties'))),
    screeningRequirement: text(pick('ScreeningRequirement')),
    reqBeforeHireCerts: mmLabels(pick('ReqBeforeHireCerts')),
    reqBeforeHireTraining: mmLabels(pick('ReqBeforeHireTraining')),
    providedAfterHireTraining: mmLabels(pick('ProvidedAfterHireTraining')),
    educationPrograms: mmLabels(pick('EducationPrograms')),
    wageMin: num(pick('WageMin')),
    wageMax: num(pick('WageMax')),
    payBasis: text(pick('PayBasis')),
    openDate: dateOnly(p.OpenDate),
    closingDate: dateOnly(p.ClosingDate)!,
    languageRequirement: text(p.LanguageRequirement),
    workEligibilityRequired: bool(p.WorkEligibilityRequired),
    unionStatus: text(p.UnionStatus),
    unionClassification: text(p.UnionClassification),
    aiScreeningUsed: aiUsed,
    aiDisclosureStatement: aiUsed ? text(p.AIDisclosureStatement) : null,
    accommodationStatement: text(p.AccommodationStatement),
    howToApply: hyperlink(p.HowToApply),
    roleTemplate: lookupTitle(p.RoleTemplate),
    home: lookupTitle(p.Home),
    city: text(p.Home?.HomeCity),
    region: text(p.Home?.HomeRegion),
    publishedAt: dateOnly(p.PublishedAt) ? new Date(p.PublishedAt).toISOString() : null,
  };
}
