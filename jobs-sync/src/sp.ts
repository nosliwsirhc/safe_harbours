// SharePoint REST (_api) client for the HR site, app-only via the Writer cert.
// Reads use odata=verbose (predictable managed-metadata / lookup shapes — Graph
// handles MM poorly, per the FileDrop finding). Writes use validateUpdateListItem
// (the proven pattern: no form digest needed with a bearer token, per-field error
// reporting). Field normalizers tolerate the shape variants SP REST emits.
import type { Env, Labels } from './types';
import { getSpToken } from './spcert';

const webUrl = (env: Env) => `https://${env.SHAREPOINT_HOSTNAME}${env.HR_SITE_PATH}`;

interface ReadOpts {
  select?: string[];
  expand?: string[];
  filter?: string;
}

/** Read all items of a list (by display title) via SP REST, paging through __next. */
export async function readList(env: Env, listTitle: string, opts: ReadOpts = {}): Promise<Record<string, any>[]> {
  const token = await getSpToken(env);
  const params = new URLSearchParams();
  params.set('$top', '500');
  if (opts.select?.length) params.set('$select', opts.select.join(','));
  if (opts.expand?.length) params.set('$expand', opts.expand.join(','));
  if (opts.filter) params.set('$filter', opts.filter);

  let url: string | null =
    `${webUrl(env)}/_api/web/lists/getbytitle('${encodeURIComponent(listTitle)}')/items?${params}`;
  const out: Record<string, any>[] = [];
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;odata=verbose' },
    });
    if (!res.ok) throw new Error(`SP read '${listTitle}' ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = (await res.json()) as { d?: { results?: Record<string, any>[]; __next?: string } };
    for (const it of json.d?.results ?? []) out.push(it);
    url = json.d?.__next ?? null;
  }
  return out;
}

/** Write fields to a list item via validateUpdateListItem (cert token, per-field error check). */
export async function setItemFields(
  env: Env, listTitle: string, itemId: number, formValues: { FieldName: string; FieldValue: string }[],
): Promise<void> {
  const token = await getSpToken(env);
  const url = `${webUrl(env)}/_api/web/lists/getbytitle('${encodeURIComponent(listTitle)}')/items(${itemId})/validateUpdateListItem`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;odata=nometadata', 'Content-Type': 'application/json' },
    body: JSON.stringify({ formValues }),
  });
  if (!res.ok) throw new Error(`validateUpdateListItem('${listTitle}') ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { value?: { FieldName: string; HasException: boolean; ErrorMessage?: string }[] };
  const bad = body.value?.find((f) => f.HasException);
  if (bad) throw new Error(`field ${bad.FieldName} rejected: ${bad.ErrorMessage}`);
}

// ---- field normalizers (tolerant of SP REST shape variants) ----

/** Managed-metadata (single or multi) -> plain label[]. Drops GUIDs. */
export function mmLabels(v: any): Labels {
  if (v == null) return [];
  const arr = Array.isArray(v) ? v : Array.isArray(v?.results) ? v.results : [v];
  return arr
    .map((t: any) => (typeof t === 'string' ? t : t?.Label ?? t?.label))
    .filter((s: any): s is string => typeof s === 'string' && s.length > 0);
}

/** Multi-choice -> string[]. */
export function choiceMulti(v: any): Labels {
  if (v == null) return [];
  const arr = Array.isArray(v) ? v : Array.isArray(v?.results) ? v.results : [v];
  return arr.filter((s: any): s is string => typeof s === 'string' && s.length > 0);
}

export function text(v: any): string | null {
  if (typeof v !== 'string') return v == null ? null : String(v);
  const t = v.trim();
  return t.length ? t : null;
}

export function num(v: any): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function bool(v: any): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

/** SP date (ISO) -> calendar date YYYY-MM-DD (UTC), or null. */
export function dateOnly(v: any): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Hyperlink field { Url, Description } -> { url, label } | null. */
export function hyperlink(v: any): { url: string; label: string } | null {
  const url = text(v?.Url ?? v?.url);
  if (!url) return null;
  return { url, label: text(v?.Description ?? v?.description) ?? url };
}

/** True when a Person field is set (expanded { Title, Id } or a deferred ref). */
export function personPresent(v: any): boolean {
  if (v == null) return false;
  if (typeof v?.Title === 'string' && v.Title.length) return true;
  if (typeof v?.Id === 'number' || typeof v?.Id === 'string') return true;
  return false;
}

/** Expanded lookup -> its Title (label), or null. */
export function lookupTitle(v: any): string | null {
  return text(v?.Title);
}
