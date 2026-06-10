// Branded HTML email for the team-facing form notifications (contact, foster
// inquiry, newsletter). Design: an editorial "intake notice" — deep-slate
// masthead with a gold horizon rule (the lighthouse beam), a category tag, the
// person as the headline, tappable email/phone, and the message as a serif
// pull-quote. Table-based + inline styles for broad client support
// (Outlook/Gmail/Apple Mail); all interpolated values are HTML-escaped.

const esc = (s: string | number | null | undefined) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const telHref = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  return d.length === 10 ? `+1${d}` : d;
};

const HEAD = "Montserrat,'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";
const BODY = "'Source Sans 3','Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";
const SLATE = '#2f3848';
const GOLD = '#ffc700';
const CORAL = '#f78f8c';

export interface EmailModel {
  /** category/type, shown as the pill, e.g. "Recruitment: Foster Parents" */
  tag: string;
  tagAccent?: 'gold' | 'coral';
  /** the lead headline — usually the person's name */
  title: string;
  /** short human line under the title */
  subtitle?: string;
  /** hidden inbox-preview text */
  preheader?: string;
  email?: string;
  phone?: string;
  /** extra detail rows (e.g. Source) */
  rows?: { label: string; value: string }[];
  /** free-text message, rendered as a pull-quote */
  message?: string;
}

export function renderEmail(m: EmailModel): string {
  const pillBg = m.tagAccent === 'coral' ? CORAL : GOLD;

  const labelCell = (t: string) =>
    `<td width="74" valign="top" style="padding:14px 0 0;font-family:${BODY};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9aa3b2;line-height:1.6;">${t}</td>`;

  const contactRows =
    (m.email
      ? `<tr>${labelCell('Email')}<td style="padding:14px 0 0;font-family:${BODY};font-size:17px;line-height:1.4;"><a href="mailto:${esc(m.email)}" style="color:#c0392b;text-decoration:none;font-weight:600;">${esc(m.email)}</a></td></tr>`
      : '') +
    (m.phone
      ? `<tr>${labelCell('Phone')}<td style="padding:10px 0 0;font-family:${BODY};font-size:17px;line-height:1.4;"><a href="tel:${esc(telHref(m.phone))}" style="color:${SLATE};text-decoration:none;font-weight:600;">${esc(m.phone)}</a></td></tr>`
      : '') +
    (m.rows ?? [])
      .map(
        (r) =>
          `<tr>${labelCell(r.label)}<td style="padding:10px 0 0;font-family:${BODY};font-size:16px;line-height:1.5;color:${SLATE};">${esc(r.value)}</td></tr>`
      )
      .join('');

  const contactBlock = contactRows
    ? `<tr><td style="background:#ffffff;padding:6px 36px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #edeff3;">${contactRows}
            </table>
          </td></tr>`
    : '';

  const messageBlock = m.message
    ? `<tr><td style="background:#ffffff;padding:26px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="3" style="background:${GOLD};font-size:0;line-height:0;">&nbsp;</td>
              <td style="padding:1px 0 1px 18px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:17px;line-height:1.65;color:#3b4452;">${esc(m.message)}</td>
            </tr></table>
          </td></tr>`
    : '';

  const subtitle = m.subtitle
    ? `<p style="margin:10px 0 0;font-family:${BODY};font-size:15px;line-height:1.5;color:#6b7686;">${esc(m.subtitle)}</p>`
    : '';

  const preheader = m.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;height:0;width:0;">${esc(m.preheader)}</div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#eceef2;-webkit-font-smoothing:antialiased;">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eceef2;">
    <tr><td align="center" style="padding:30px 14px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

        <tr><td style="background:${SLATE};padding:26px 36px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-family:${HEAD};font-size:18px;font-weight:700;letter-spacing:3px;color:#ffffff;text-transform:uppercase;">Safe&nbsp;Harbours</td>
            <td align="right" style="font-family:${BODY};font-size:11px;letter-spacing:1.5px;color:#94a1b8;text-transform:uppercase;">Ontario&nbsp;Foster&nbsp;Care</td>
          </tr></table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td height="2" style="height:2px;background:${GOLD};font-size:0;line-height:0;margin-top:18px;">&nbsp;</td>
          </tr></table>
          <div style="height:22px;font-size:0;line-height:0;">&nbsp;</div>
        </td></tr>

        <tr><td style="background:#ffffff;padding:34px 36px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="background:${pillBg};border-radius:100px;padding:7px 15px;font-family:${BODY};font-size:11px;font-weight:700;letter-spacing:1.5px;color:${SLATE};text-transform:uppercase;">${esc(m.tag)}</td>
          </tr></table>
          <h1 style="margin:20px 0 0;font-family:${HEAD};font-size:30px;line-height:1.12;font-weight:700;color:${SLATE};">${esc(m.title)}</h1>
          ${subtitle}
        </td></tr>

        ${contactBlock}
        ${messageBlock}

        <tr><td style="background:#ffffff;padding:34px 36px 34px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <tr><td style="background:#f4f5f8;padding:20px 36px;border-top:1px solid #e6e9ef;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-family:${BODY};font-size:12px;line-height:1.6;color:#8a93a3;">Submitted through <a href="https://www.safeharbours.ca" style="color:#8a93a3;text-decoration:underline;">safeharbours.ca</a><br>517 Upper Sherman Ave., Hamilton, ON</td>
          </tr></table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
