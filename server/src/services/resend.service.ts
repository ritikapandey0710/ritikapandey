import { Resend } from 'resend';

const DEFAULT_FROM = 'Help Desk <onboarding@resend.dev>';

/**
 * Get the configured sender email address.
 * Falls back to the default Resend onboarding address if EMAIL_FROM is not set.
 */
export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || DEFAULT_FROM;
}

/**
 * Send an email using Resend.
 *
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - HTML content of the email
 * @returns The Resend email ID on success, or null if RESEND_API_KEY is not configured
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  headers?: Record<string, string>
): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not configured, skipping email send');
    return null;
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: getEmailFrom(),
      to,
      subject,
      html,
      ...(headers && Object.keys(headers).length > 0 ? { headers } : {}),
    });

    if (error) {
      console.error('Failed to send email via Resend:', error);
      return null;
    }

    console.log(`Email sent via Resend: ${data?.id}`);
    return data?.id ?? null;
  } catch (error) {
    console.error('Error sending email via Resend:', error);
    return null;
  }
}