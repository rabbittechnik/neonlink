import nodemailer from "nodemailer";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/** Setzt SMTP_HOST (und bei Bedarf SMTP_USER / SMTP_PASS), um Versand zu aktivieren. */
export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
}

/**
 * Umgebungsvariablen (Production):
 * - SMTP_HOST – z. B. smtp.example.com
 * - SMTP_PORT – Standard 587
 * - SMTP_SECURE – "true" für Port 465 (TLS direkt)
 * - SMTP_USER / SMTP_PASS – falls der Relay Auth braucht
 * - EMAIL_FROM – z. B. "NeonLink <noreply@deinedomain.de>"
 * - FRONTEND_ORIGIN – öffentliche App-URL (ohne Slash am Ende), für Links im Mailtext
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  displayName?: string
): Promise<void> {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    throw new Error("SMTP not configured");
  }

  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? "";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });

  const fromRaw =
    process.env.EMAIL_FROM?.trim() ??
    (user ? `"NeonLink" <${user}>` : '"NeonLink" <noreply@neonlink.local>');

  const greeting = displayName ? `Hallo ${displayName}` : "Hallo";

  await transporter.sendMail({
    from: fromRaw,
    to,
    subject: "NeonLink – Passwort zurücksetzen",
    text: `${greeting},\n\num ein neues Passwort zu setzen, öffne diesen Link (1 Stunde gültig):\n\n${resetLink}\n\nWenn du das nicht angefordert hast, ignoriere diese E-Mail.\n`,
    html: `<p>${escapeHtml(greeting)},</p>
<p>Um ein neues Passwort zu setzen, folge diesem Link (1&nbsp;Stunde gültig):</p>
<p><a href="${escapeHtml(resetLink)}">Passwort zurücksetzen</a></p>
<p>Wenn du das nicht angefordert hast, ignoriere diese E-Mail.</p>`,
  });
}
