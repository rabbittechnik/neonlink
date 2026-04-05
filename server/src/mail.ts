import nodemailer from "nodemailer";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/** Setzt SMTP_HOST (und bei Bedarf SMTP_USER / SMTP_PASS), um Versand zu aktivieren. */
export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
}

function createSmtpTransport() {
  const host = process.env.SMTP_HOST?.trim()!;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? "";
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
    /** Gmail & viele Relays auf 587: STARTTLS */
    requireTLS: !secure && port === 587,
  });
}

/**
 * Umgebungsvariablen (Production):
 * - SMTP_HOST – z. B. smtp.example.com
 * - SMTP_PORT – Standard 587
 * - SMTP_SECURE – "true" für Port 465 (TLS direkt)
 * - SMTP_USER / SMTP_PASS – falls der Relay Auth braucht
 * - EMAIL_FROM – z. B. "NeonLink <noreply@deinedomain.de>"
 * - FRONTEND_ORIGIN – öffentliche App-URL (ohne Slash am Ende), für Links im Mailtext
 *
 * E-Mail-Verifizierung (Profil): sendEmailVerificationCode() – gleiche SMTP-Variablen.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  displayName?: string
): Promise<void> {
  if (!isMailConfigured()) {
    throw new Error("SMTP not configured");
  }

  const smtpUser = process.env.SMTP_USER?.trim();
  const transporter = createSmtpTransport();

  const fromRaw =
    process.env.EMAIL_FROM?.trim() ??
    (smtpUser ? `"NeonLink" <${smtpUser}>` : '"NeonLink" <noreply@neonlink.local>');

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

/** 6-stelliger Code, 10 Min gültig (Speicher serverseitig wie bisher). */
export async function sendEmailVerificationCode(
  to: string,
  code: string,
  displayName?: string
): Promise<void> {
  if (!isMailConfigured()) {
    throw new Error("SMTP not configured");
  }

  const smtpUser = process.env.SMTP_USER?.trim();
  const transporter = createSmtpTransport();

  const fromRaw =
    process.env.EMAIL_FROM?.trim() ??
    (smtpUser ? `"NeonLink" <${smtpUser}>` : '"NeonLink" <noreply@neonlink.local>');

  const greeting = displayName ? `Hallo ${displayName}` : "Hallo";

  await transporter.sendMail({
    from: fromRaw,
    to,
    subject: "NeonLink – E-Mail bestätigen",
    text: `${greeting},\n\ndein Bestätigungscode lautet:\n\n${code}\n\nDer Code ist 10 Minuten gültig. Wenn du das nicht angefordert hast, ignoriere diese E-Mail.\n`,
    html: `<p>${escapeHtml(greeting)},</p>
<p>dein Bestätigungscode lautet:</p>
<p style="font-size:1.5rem;letter-spacing:0.2em;font-weight:600;">${escapeHtml(code)}</p>
<p>Der Code ist 10&nbsp;Minuten gültig. Wenn du das nicht angefordert hast, ignoriere diese E-Mail.</p>`,
  });
}
