// Branded HTML email for the team-facing form notifications (contact, foster
// inquiry, newsletter). Table-based + inline styles for broad email-client
// support (Outlook/Gmail/Apple Mail). All interpolated values are HTML-escaped.

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export interface NotificationEmail {
  heading: string;
  rows: Array<{ label: string; value: string }>;
  message?: string;
  /** small grey line under the heading, e.g. the page it came from */
  intro?: string;
}

/** Render the branded HTML body. Pair it with a plain-text fallback. */
export function renderEmail({ heading, rows, message, intro }: NotificationEmail): string {
  const rowsHtml = rows
    .map(
      (r) => `
            <tr>
              <td style="padding:7px 16px 7px 0;color:#6b7280;font-size:13px;line-height:1.4;vertical-align:top;white-space:nowrap;">${esc(r.label)}</td>
              <td style="padding:7px 0;color:#394254;font-size:15px;line-height:1.5;">${esc(r.value)}</td>
            </tr>`
    )
    .join('');

  const messageHtml = message
    ? `
          <tr><td style="padding:4px 32px 0;">
            <div style="margin-top:6px;padding:16px 18px;background:#f7f8fa;border-left:3px solid #ffc700;border-radius:6px;color:#394254;font-size:15px;line-height:1.6;white-space:pre-wrap;">${esc(message)}</div>
          </td></tr>`
    : '';

  const introHtml = intro
    ? `<p style="margin:6px 0 0;color:#6b7280;font-size:13px;">${esc(intro)}</p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef0f3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f3;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e6eb;font-family:Helvetica,Arial,sans-serif;">
        <tr><td style="background:#394254;padding:22px 32px;">
          <span style="color:#ffffff;font-size:21px;font-weight:bold;letter-spacing:0.3px;">Safe Harbours</span>
          <div style="height:3px;width:46px;background:#ffc700;margin-top:9px;border-radius:2px;"></div>
        </td></tr>
        <tr><td style="padding:26px 32px 6px;">
          <h1 style="margin:0;font-size:18px;font-weight:bold;color:#394254;">${esc(heading)}</h1>
          ${introHtml}
        </td></tr>
        <tr><td style="padding:10px 32px 6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}
          </table>
        </td></tr>${messageHtml}
        <tr><td style="padding:22px 32px 26px;">
          <div style="border-top:1px solid #eceef1;padding-top:16px;color:#9aa1ad;font-size:12px;line-height:1.5;">
            Sent from the Safe Harbours website &middot; <a href="https://www.safeharbours.ca" style="color:#9aa1ad;">safeharbours.ca</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
