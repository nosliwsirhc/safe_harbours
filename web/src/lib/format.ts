// Formats a date as the resource cards display it, e.g. "Mar 3rd 2026".
// Uses UTC so a YYYY-MM-DD frontmatter date isn't shifted by the local zone.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ordinal(n: number): string {
  const v = n % 100;
  const suffix = ['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th';
  return `${n}${suffix}`;
}

export function shortDate(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${ordinal(d.getUTCDate())} ${d.getUTCFullYear()}`;
}

// The card meta line: "Mar 3rd 2026 By Safe Harbours".
export function cardMeta(d: Date, author: string): string {
  return `${shortDate(d)} By ${author}`;
}
