// =========================================================
// FRELUX transactional email kit
//
// One layout for every Frelux email: welcome, owner
// notifications, digests. Table based, inline styles only,
// 600px card, light scheme pinned so dark clients do not
// invert the brand. No external CSS, no web fonts, no
// images that carry meaning: the wordmark is text so the
// email still reads correctly with images blocked.
//
// Everything a caller passes is escaped here. Callers never
// inject raw HTML, so a stored name or address can not break
// the layout or smuggle markup into an email.
// =========================================================

export const EMAIL = {
  purple: "#6D28D9",
  ink: "#0A0A1A",
  body: "#3F3F46",
  muted: "#71717A",
  line: "#E4E4E7",
  canvas: "#F4F4F5",
  card: "#FFFFFF",
  site: "https://freluxtools.com",
  logo: "https://freluxtools.com/logo-mark.png",
} as const;

export function escapeHtml(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Long dashes are not used in Frelux copy; a hyphen reads the
 * same and passes the house style check. */
function clean(value: string): string {
  return (value ?? "")
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u2212/g, "-");
}

export interface EmailLink {
  label: string;
  href: string;
}

export interface EmailDetail {
  label: string;
  value: string;
}

export interface EmailContent {
  /** Inbox preview line. Hidden in the body. */
  preheader: string;
  heading: string;
  /** Opening lines, in order. Plain text only. */
  paragraphs?: string[];
  /** Short bullet list, plain text. */
  bullets?: string[];
  /** Label/value rows for facts: plan, amount, date. */
  details?: EmailDetail[];
  /** One primary action. Ignored when href is not https. */
  cta?: EmailLink;
  /** Secondary links rendered as a list under the body. */
  links?: EmailLink[];
  /** Small print before the footer, e.g. why this was sent. */
  note?: string;
  /** Footer line. Defaults to the Frelux sign-off. */
  footer?: string;
}

function safeHref(href: string): string | null {
  const trimmed = (href ?? "").trim();
  return /^https:\/\/[^\s]+$/i.test(trimmed) ? trimmed : null;
}

function button(cta: EmailLink): string {
  const href = safeHref(cta.href);
  if (!href) return "";
  return `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 6px;">
              <tr>
                <td align="center" bgcolor="${EMAIL.purple}" style="border-radius:8px;">
                  <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:1;color:#FFFFFF;text-decoration:none;border-radius:8px;">${escapeHtml(clean(cta.label))}</a>
                </td>
              </tr>
            </table>`;
}

function bullets(items: string[]): string {
  if (!items.length) return "";
  const rows = items
    .map(
      (item) =>
        `              <tr>
                <td valign="top" style="padding:0 10px 10px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:${EMAIL.purple};">&#8226;</td>
                <td valign="top" style="padding:0 0 10px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:${EMAIL.body};">${escapeHtml(clean(item))}</td>
              </tr>`,
    )
    .join("\n");
  return `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:6px 0 4px;">
${rows}
            </table>`;
}

function details(rows: EmailDetail[]): string {
  if (!rows.length) return "";
  const body = rows
    .map(
      (row, index) => `              <tr>
                <td style="padding:11px 0;border-top:${index === 0 ? "0" : `1px solid ${EMAIL.line}`};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:${EMAIL.muted};">${escapeHtml(clean(row.label))}</td>
                <td align="right" style="padding:11px 0;border-top:${index === 0 ? "0" : `1px solid ${EMAIL.line}`};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;font-weight:600;color:${EMAIL.ink};">${escapeHtml(clean(row.value))}</td>
              </tr>`,
    )
    .join("\n");
  return `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0 6px;border:1px solid ${EMAIL.line};border-radius:10px;border-collapse:separate;">
              <tr>
                <td style="padding:4px 16px 6px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${body}
                  </table>
                </td>
              </tr>
            </table>`;
}

function linkList(links: EmailLink[]): string {
  const usable = links.filter((link) => safeHref(link.href));
  if (!usable.length) return "";
  const rows = usable
    .map(
      (link) =>
        `              <tr>
                <td style="padding:2px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:22px;">
                  <a href="${escapeHtml(safeHref(link.href)!)}" style="color:${EMAIL.purple};text-decoration:none;font-weight:600;">${escapeHtml(clean(link.label))}</a>
                </td>
              </tr>`,
    )
    .join("\n");
  return `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:18px 0 4px;">
${rows}
            </table>`;
}

export function renderEmailHtml(content: EmailContent): string {
  const paragraphs = (content.paragraphs ?? [])
    .map(
      (text) =>
        `            <p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:${EMAIL.body};">${escapeHtml(clean(text))}</p>`,
    )
    .join("\n");

  const footer =
    content.footer ?? "Frelux, construction estimation for every trade.";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(clean(content.heading))}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${EMAIL.canvas};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(clean(content.preheader))}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${EMAIL.canvas};">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background-color:${EMAIL.card};border:1px solid ${EMAIL.line};border-radius:14px;">
            <tr>
              <td style="padding:22px 28px 18px;border-bottom:1px solid ${EMAIL.line};">
                <a href="${EMAIL.site}" style="text-decoration:none;">
                  <img src="${EMAIL.logo}" width="26" height="26" alt="" style="vertical-align:middle;border:0;outline:none;" />
                  <span style="padding-left:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.14em;color:${EMAIL.ink};vertical-align:middle;">FRELUX</span>
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 26px;">
            <h1 style="margin:0 0 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;line-height:30px;font-weight:700;color:${EMAIL.ink};">${escapeHtml(clean(content.heading))}</h1>
${paragraphs}${bullets(content.bullets ?? [])}${details(content.details ?? [])}${content.cta ? button(content.cta) : ""}${linkList(content.links ?? [])}${
    content.note
      ? `
            <p style="margin:22px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:${EMAIL.muted};">${escapeHtml(clean(content.note))}</p>`
      : ""
  }
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 24px;border-top:1px solid ${EMAIL.line};">
                <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:${EMAIL.muted};">${escapeHtml(clean(footer))}</p>
                <p style="margin:6px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:${EMAIL.muted};"><a href="${EMAIL.site}" style="color:${EMAIL.muted};">freluxtools.com</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Plain text twin of the same content, for clients that strip
 * HTML and for the spam score. */
export function renderEmailText(content: EmailContent): string {
  const lines: string[] = [clean(content.heading), ""];
  for (const paragraph of content.paragraphs ?? []) {
    lines.push(clean(paragraph), "");
  }
  for (const bullet of content.bullets ?? []) {
    lines.push(`- ${clean(bullet)}`);
  }
  if ((content.bullets ?? []).length) lines.push("");
  for (const row of content.details ?? []) {
    lines.push(`${clean(row.label)}: ${clean(row.value)}`);
  }
  if ((content.details ?? []).length) lines.push("");
  if (content.cta) {
    const href = safeHref(content.cta.href);
    if (href) lines.push(`${clean(content.cta.label)}: ${href}`, "");
  }
  for (const link of content.links ?? []) {
    const href = safeHref(link.href);
    if (href) lines.push(`${clean(link.label)}: ${href}`);
  }
  if ((content.links ?? []).length) lines.push("");
  if (content.note) lines.push(clean(content.note), "");
  lines.push(
    clean(content.footer ?? "Frelux, construction estimation for every trade."),
  );
  lines.push(EMAIL.site);
  return lines.join("\n");
}

export function renderEmail(content: EmailContent): {
  html: string;
  text: string;
} {
  return {
    html: renderEmailHtml(content),
    text: renderEmailText(content),
  };
}
