import { escapeHtml } from '../../common/mail.service.js';

export type MergeContext = Record<string, string | undefined | null>;

/** Remplace {{clé}} dans un template. */
export function applyMergeTags(input: string, context: MergeContext): string {
  return String(input || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = context[key];
    return value == null ? '' : String(value);
  });
}

export function htmlToPlainText(html: string): string {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function wrapBanyLayout(opts: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  unsubscribeUrl: string;
}): string {
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(opts.preheader)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#050505;color:#f0f0f0;font-family:Arial,Helvetica,sans-serif">
  ${preheader}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#111;border:1px solid rgba(255,255,255,0.08)">
        <tr>
          <td style="padding:28px 28px 12px;border-bottom:1px solid rgba(255,255,255,0.06)">
            <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#ef3b3b;font-weight:700">Bany Official</p>
            <h1 style="margin:10px 0 0;font-size:22px;line-height:1.3;color:#ffffff;font-weight:700">${escapeHtml(opts.title)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;color:#d0d0d0;font-size:15px;line-height:1.65">
            ${opts.bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px 28px;border-top:1px solid rgba(255,255,255,0.06);color:#777;font-size:12px;line-height:1.5">
            Vous recevez cet email car vous êtes abonné à la newsletter Bany Talks.<br/>
            <a href="${opts.unsubscribeUrl}" style="color:#999;text-decoration:underline">Se désabonner</a>
            · Bany Official · Kinshasa
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
