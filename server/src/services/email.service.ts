import { simpleParser } from 'mailparser';
import IMAP = require('imap-simple');
import { prisma } from '../lib/prisma';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { sendEmailWithRetry } from './resend.service';
import { knowledgeBaseService, type KnowledgeBaseEntry } from './knowledgeBaseService';
import { resolveTicketWithAI, type AIResolutionDecision } from '../controllers/ai.controller';
import { getOrCreateAIAgent } from './aiAgentService';

interface EmailOptions {
  imap?: {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
    authTimeout?: number;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
  from: string;
}

/**
 * Minimum Gemini confidence required before a ticket is auto-resolved with a
 * knowledge-base solution. Below this threshold the ticket stays OPEN and the
 * customer receives a professional "requires further assistance" response.
 */
export const AI_RESOLUTION_CONFIDENCE_THRESHOLD = 0.85;

/** Escape user/AI-provided text for safe embedding in an HTML email body. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Convert plain-text paragraphs into simple HTML blocks for email bodies. */
function textToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0)
    .map(
      (p) =>
        `<p style="color:#333;font-size:15px;line-height:1.6;">${escapeHtml(p.trim()).replace(/\n/g, '<br/>')}</p>`
    )
    .join('\n');
}

/**
 * Build the customer-facing solution email from the AI-generated resolution.
 * The AI is instructed to only use content from the knowledge base article,
 * so nothing here is invented at send time either.
 */
export function buildSolutionEmail(decision: AIResolutionDecision): string {
  const parts: string[] = [];
  parts.push('<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">');
  parts.push('<p style="color:#333;font-size:16px;">Hello,</p>');
  parts.push(
    '<p style="color:#333;font-size:15px;">Thank you for contacting Help Desk Support. Please try the following:</p>'
  );
  parts.push(textToHtml(decision.solution));
  if (decision.verification && decision.verification.trim().length > 0) {
    parts.push('<p style="color:#333;font-size:15px;"><strong>To confirm the issue is resolved:</strong></p>');
    parts.push(textToHtml(decision.verification));
  }
  parts.push(
    '<p style="color:#333;font-size:15px;">If you are still unable to resolve the issue after following these steps, please reply to this email and we will investigate further.</p>'
  );
  parts.push('<p style="color:#333;font-size:15px;">Best regards,<br/>Help Desk Support</p>');
  parts.push('</div>');
  return parts.join('\n');
}

/**
 * Build the professional fallback email used when the knowledge base does not
 * contain a reliable solution (or when AI verification fails). This response
 * never claims the issue has been resolved and never exposes internals.
 */
export function buildFallbackEmail(): string {
  return [
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">',
    '<p style="color:#333;font-size:16px;">Hello,</p>',
    '<p style="color:#333;font-size:15px;line-height:1.6;">Thank you for contacting Help Desk Support.</p>',
    '<p style="color:#333;font-size:15px;line-height:1.6;">We have reviewed your request, and it requires further assistance from our support team. A support agent will follow up with you as soon as possible.</p>',
    '<p style="color:#333;font-size:15px;line-height:1.6;">In the meantime, if you have any additional details that may help us assist you, please reply to this email.</p>',
    '<p style="color:#333;font-size:15px;">Best regards,<br/>Help Desk Support</p>',
    '</div>',
  ].join('\n');
}

interface ParsedEmail {
  from: { address: string; name?: string }[];
  /** All recipient addresses found in To / Cc / Delivered-To / X-Original-To. */
  recipients: string[];
  subject: string;
  text: string;
  html?: string;
  date: Date;
  messageId: string;
  inReplyTo?: string;
  references?: string;
  gmailThreadId?: string;
}

export class EmailService {
  private imapConfig: any;
  private smtpTransport: nodemailer.Transporter | null;
  private fromEmail: string;
  private resend: Resend | null;

  constructor(options: EmailOptions) {
    this.imapConfig = options.imap
      ? {
          user: options.imap.user,
          password: options.imap.password,
          host: options.imap.host,
          port: options.imap.port,
          tls: options.imap.tls,
          authTimeout: options.imap.authTimeout || 5000,
        }
      : null;

    this.fromEmail = options.from;

    this.resend = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null;

    if (options.smtp) {
      this.smtpTransport = nodemailer.createTransport({
        host: options.smtp.host,
        port: options.smtp.port,
        secure: options.smtp.secure, // true for 465, false for other ports
        auth: {
          user: options.smtp.user,
          pass: options.smtp.pass,
        },
      });
    } else {
      this.smtpTransport = null;
    }
  }

  /**
   * Initialize the email service (test connection)
   */
  public async initialize(): Promise<void> {
    try {
      // Test IMAP connection
      const connection = await this.connectIMAP();
      await new Promise((resolve, reject) => {
        connection.openBox('INBOX', (err: any) => {
          if (err) return reject(err);
          resolve(null);
        });
      });
      connection.end();
      console.log('IMAP connection test successful');
    } catch (error) {
      throw new Error(`Failed to initialize email service: ${error}`);
    }
  }

  /**
   * Connect to IMAP server
   */
  private async connectIMAP(): Promise<any> {
    // imap-simple v5 requires the node-imap config to be nested under an
    // `imap` key: IMAP.connect({ imap: { user, password, host, port, tls, ... } }).
    // Passing the flat object directly causes imap-simple to fall back to
    // node-imap defaults (localhost:143, no TLS).
    const connection = await IMAP.connect({ imap: this.imapConfig });
    return connection;
  }

  /**
   * Normalize mailparser's `from` field into a consistent address list.
   */
  private normalizeFrom(from: any): { address: string; name?: string }[] {
    if (!from) return [];
    const addresses = Array.isArray(from) ? from : [from];
    return addresses
      .map((addr) => addr?.value?.[0])
      .filter(
        (addr): addr is { address: string; name?: string } =>
          !!addr && typeof addr.address === 'string' && addr.address.length > 0
      );
  }

  /**
   * Collect every recipient address carried by the message: To, Cc, and
   * Delivered-To / X-Original-To headers (Gmail uses these when forwarding
   * into the polled mailbox). Returns bare, lowercased addresses.
   */
  private extractRecipients(parsed: any, headers: Map<string, any>): string[] {
    const addresses: string[] = [];

    const pushAddressList = (list: any) => {
      const arr = Array.isArray(list) ? list : [list];
      for (const entry of arr) {
        for (const v of entry?.value ?? []) {
          if (typeof v?.address === 'string' && v.address.length > 0) {
            addresses.push(v.address.toLowerCase());
          }
        }
      }
    };

    pushAddressList(parsed.to);
    if (parsed.cc) pushAddressList(parsed.cc);

    // Delivered-To / X-Original-To header values are raw "Name <a@b>" strings.
    const headerValueToAddress = (value: unknown): void => {
      if (typeof value !== 'string') return;
      const match = value.match(/<([^>]+)>/);
      const addr = (match ? match[1] : value).trim().toLowerCase();
      if (addr.includes('@')) addresses.push(addr);
    };
    headerValueToAddress(headers?.get('delivered-to'));
    headerValueToAddress(headers?.get('x-original-to'));

    return Array.from(new Set(addresses));
  }

  /**
   * The configured Help Desk receiving address(es). The IMAP mailbox being
   * polled (EMAIL_IMAP_USER) IS the Help Desk inbox. Optional extra aliases
   * can be listed (comma-separated) in HELPDESK_TO_ADDRESSES.
   */
  public getHelpdeskAddresses(): string[] {
    const primary = process.env.EMAIL_IMAP_USER
      ? this.bareAddress(process.env.EMAIL_IMAP_USER)
      : null;
    const aliases = (process.env.HELPDESK_TO_ADDRESSES || '')
      .split(',')
      .map((a) => this.bareAddress(a.trim()))
      .filter((a) => a.length > 0);
    return Array.from(new Set([...(primary ? [primary] : []), ...aliases]));
  }

  /** Reduce "Display Name <user@host>" (or a bare address) to lowercase user@host. */
  private bareAddress(value: string): string {
    const match = value.match(/<([^>]+)>/);
    return (match ? match[1] : value).trim().toLowerCase();
  }

  /**
   * True when the email was actually addressed TO the configured Help Desk
   * receiving address (To / Cc / Delivered-To), regardless of who sent it.
   */
  public isAddressedToHelpdesk(email: ParsedEmail): boolean {
    const helpdesk = this.getHelpdeskAddresses();
    if (helpdesk.length === 0) {
      // No configured receiving address — fail open so ingestion is not broken.
      console.warn('No Help Desk receiving address configured (EMAIL_IMAP_USER); accepting email');
      return true;
    }
    return email.recipients.some(
      (r) => helpdesk.includes(r.toLowerCase())
    );
  }

  /**
   * Parse raw email into structured format
   */
  private async parseEmail(rawEmail: any): Promise<ParsedEmail> {
    const parsed = await simpleParser(rawEmail);

    // mailparser exposes raw headers via a Map keyed by lowercased header names.
    // Note: mailparser returns the References header as an array of Message-IDs,
    // so both string and array forms must be handled (joined with spaces).
    const headers = parsed.headers as unknown as Map<string, any>;
    const inReplyTo = headers?.get('in-reply-to');
    const rawReferences = headers?.get('references');
    const references = Array.isArray(rawReferences)
      ? rawReferences.filter((r: any) => typeof r === 'string').join(' ')
      : rawReferences;

    return {
      from: this.normalizeFrom(parsed.from),
      recipients: this.extractRecipients(parsed, headers),
      subject: parsed.subject || '(No Subject)',
      text: parsed.text || '',
      html: parsed.html || undefined,
      date: parsed.date || new Date(),
      messageId: parsed.messageId || '',
      inReplyTo:
        typeof inReplyTo === 'string' && inReplyTo.trim().length > 0
          ? inReplyTo.trim()
          : undefined,
      references:
        typeof references === 'string' && references.trim().length > 0
          ? references.trim()
          : undefined,
    };
  }

  /**
   * Extract the Gmail thread ID (X-GM-THRID) from an IMAP message when it is
   * reliably available. This is best-effort: depending on server capabilities
   * and how imap-simple structures the response, the value may be absent, in
   * which case threading falls back to In-Reply-To / References matching.
   */
  private extractGmailThreadId(email: any): string | undefined {
    const attrs = email?.attributes;
    if (!attrs) return undefined;
    const candidates = [attrs.xGmThrid, attrs.threadId, attrs['x-gm-thrid']];
    for (const candidate of candidates) {
      if (candidate !== undefined && candidate !== null) {
        const value = String(candidate).trim();
        if (value.length > 0) return value;
      }
    }
    return undefined;
  }

  /**
   * Normalize a Message-ID by stripping surrounding angle brackets so that
   * comparisons between Message-ID / In-Reply-To / References values are
   * consistent regardless of formatting.
   */
  private normalizeMessageId(value: string): string {
    let v = value.trim();
    if (v.startsWith('<') && v.endsWith('>')) {
      v = v.slice(1, -1);
    }
    return v.toLowerCase();
  }

  /**
   * Split a References header into normalized individual Message-IDs.
   */
  private parseReferences(references?: string): string[] {
    if (!references) return [];
    return references
      .split(/\s+/)
      .map((id) => this.normalizeMessageId(id))
      .filter((id) => id.length > 0);
  }

  /**
   * Find an existing EmailMessage row whose stored threading data matches the
   * incoming email. Match order:
   *   1. In-Reply-To  -> stored messageId
   *   2. References   -> any stored messageId
   *   3. Gmail thread ID
   */
  private async findThreadMatch(
    email: ParsedEmail
  ): Promise<{ ticketId: string } | null> {
    // 1. In-Reply-To
    if (email.inReplyTo) {
      const inReplyToId = this.normalizeMessageId(email.inReplyTo);
      const match = await prisma.emailMessage.findFirst({
        where: { messageId: inReplyToId },
        select: { ticketId: true },
      });
      if (match) return match;
    }

    // 2. References (any referenced Message-ID we have seen before)
    const referenceIds = this.parseReferences(email.references);
    if (referenceIds.length > 0) {
      const match = await prisma.emailMessage.findFirst({
        where: { messageId: { in: referenceIds } },
        orderBy: { createdAt: 'desc' },
        select: { ticketId: true },
      });
      if (match) return match;
    }

    // 3. Gmail thread ID
    if (email.gmailThreadId) {
      const match = await prisma.emailMessage.findFirst({
        where: { gmailThreadId: email.gmailThreadId },
        orderBy: { createdAt: 'desc' },
        select: { ticketId: true },
      });
      if (match) return match;
    }

    return null;
  }

  /**
   * Record threading metadata for a processed email. Duplicate-safe: if the
   * same Message-ID is somehow processed concurrently, the unique constraint
   * prevents a second row and the error is swallowed (the first write wins).
   */
  private async recordEmailMessage(data: {
    messageId: string;
    inReplyTo?: string;
    references?: string;
    gmailThreadId?: string;
    ticketId: string;
    replyId?: string;
  }): Promise<void> {
    try {
      await prisma.emailMessage.create({
        data: {
          ...data,
          direction: 'INBOUND',
        },
      });
    } catch (error: any) {
      // P2002 = unique constraint violation on messageId: already recorded
      if (error?.code !== 'P2002') {
        console.error('Failed to record email threading metadata:', error);
      }
    }
  }

  /**
   * Extract plain text from email (prefer text, fallback to HTML-to-text conversion)
   */
  private extractEmailBody(email: ParsedEmail): string {
    // Prefer plain text
    if (email.text && email.text.trim().length > 0) {
      return email.text.trim();
    }

    // If only HTML is available, we could convert it to text
    // For simplicity, we'll just return the HTML as-is or a note
    if (email.html) {
      return `[HTML Content]${email.html.substring(0, 200)}...`;
    }

    return '(No content available)';
  }

  /**
   * Find or create a user by email address
   */
  private async findOrCreateUser(email: string, name: string | undefined): Promise<string> {
    // Try to find existing user by email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return existingUser.id;
    }

    // Create new user with AGENT role (default)
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || email.split('@')[0], // Use email prefix as name if no name provided
        role: 'AGENT', // Default role for email-created users
      },
    });

    return newUser.id;
  }

  /**
   * Create a ticket from parsed email data using the SHARED ticket-processing
   * pipeline (same as API/webhook creation): NEW → PROCESSING → KB auto-resolve
   * check → background AI classification, with OPEN+unassigned fallback on AI failure.
   */
  private async createTicketFromEmail(
    email: ParsedEmail,
    userId: string
  ) {
    const title = email.subject.substring(0, 200); // Limit title length
    const description = this.extractEmailBody(email);

    // Derive sender info from the parsed email (sender is validated before tickets are created)
    const sender = email.from[0];
    const senderEmail = sender?.address ?? '';
    const senderName = sender?.name ?? senderEmail;

    // Determine initial priority based on subject keywords (simple heuristic).
    // AI classification may refine this later in the shared pipeline.
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM';
    const lowerSubject = email.subject.toLowerCase();
    if (lowerSubject.includes('urgent') || lowerSubject.includes('asap') ||
        lowerSubject.includes('critical') || lowerSubject.includes('emergency')) {
      priority = 'URGENT';
    } else if (lowerSubject.includes('high') || lowerSubject.includes('important')) {
      priority = 'HIGH';
    } else if (lowerSubject.includes('low') || lowerSubject.includes('minor')) {
      priority = 'LOW';
    }

    const { processNewTicket } = await import('./ticketProcessing.service');

    const ticket = await processNewTicket({
      title,
      description,
      priority,
      senderName,
      senderEmail,
      reporterId: userId,
      // The email flow performs AI-verified, email-aware resolution in
      // sendAutoResponse (below); skip the KB auto-resolve here so the ticket
      // is never marked RESOLVED before the customer's solution is emailed.
      skipAutoResolve: true,
    });

    return ticket;
  }

  /**
   * Send the "ticket created" auto-response to the sender of an inbound email.
   *
   * Phase 5: this is now a fully tracked outbound email — recorded as an
   * OUTBOUND EmailMessage row (QUEUED -> SENT/FAILED) with a full send
   * snapshot so the delivery worker can retry it if Resend fails. Threading
   * headers are set so customer replies thread onto the same ticket.
   *
   * Best-effort: never throws into the inbound processing path.
   */
  private async sendAutoResponse(
    to: string,
    subject: string,
    ticketId: string
  ): Promise<void> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.log('RESEND_API_KEY not configured, skipping auto-response email');
        return;
      }

      // Load the freshly created ticket — its title/description feed the
      // knowledge-base lookup and the AI verification step.
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        console.warn(`sendAutoResponse: ticket ${ticketId} not found, skipping`);
        return;
      }
      const title = ticket.title;
      const description = ticket.description || '';

      // ── Knowledge base match + AI verification ─────────────────────
      let html: string | null = null;
      let canResolve = false;
      let kbEntry: KnowledgeBaseEntry | null = null;
      let decision: AIResolutionDecision | null = null;

      try {
        kbEntry = knowledgeBaseService.findMatchingEntry(title, description);
        if (kbEntry) {
          decision = await resolveTicketWithAI(title, description, kbEntry);
          if (
            decision.canResolve &&
            decision.confidence >= AI_RESOLUTION_CONFIDENCE_THRESHOLD &&
            decision.solution.trim().length > 0
          ) {
            canResolve = true;
            html = buildSolutionEmail(decision);
          }
        }
      } catch (aiError) {
        // Gemini failure / timeout / quota error: log safely, keep the
        // ticket OPEN, and never crash email ingestion.
        console.error(`AI auto-resolution check failed for ticket ${ticketId}:`, aiError);
      }

      if (!html) {
        // No reliable knowledge-base solution — send the professional
        // fallback. The ticket intentionally stays OPEN.
        html = buildFallbackEmail();
      }

      const emailSubject = `Re: ${subject}`;

      // Threading headers: reply to the latest inbound email on this ticket.
      const lastEmail = await prisma.emailMessage.findFirst({
        where: { ticketId },
        orderBy: { createdAt: 'desc' },
      });
      const headers: Record<string, string> = {};
      if (lastEmail?.messageId && !lastEmail.messageId.startsWith('pending-')) {
        const wrapped = `<${lastEmail.messageId}>`;
        headers['In-Reply-To'] = wrapped;
        headers['References'] = lastEmail.references
          ? `${lastEmail.references} ${wrapped}`
          : wrapped;
      }

      // Record QUEUED with a full snapshot for the delivery worker.
      const pendingMessageId = `pending-autoresponse-${ticketId}`;
      let outboundRowId: string | null = null;
      try {
        const existing = await prisma.emailMessage.findUnique({
          where: { messageId: pendingMessageId },
          select: { id: true },
        });
        if (existing) {
          outboundRowId = existing.id;
        } else {
          const queued = await prisma.emailMessage.create({
            data: {
              messageId: pendingMessageId,
              inReplyTo: headers['In-Reply-To'],
              references: headers['References'],
              ticketId,
              direction: 'OUTBOUND',
              deliveryStatus: 'QUEUED',
              toAddress: to,
              subject: emailSubject,
              bodyHtml: html,
            },
          });
          outboundRowId = queued.id;
        }
      } catch (error) {
        console.error(`Failed to record QUEUED auto-response EmailMessage for ticket ${ticketId}:`, error);
      }

      const result = await sendEmailWithRetry(to, emailSubject, html,
        Object.keys(headers).length > 0 ? headers : undefined);

      if (result.emailId && outboundRowId) {
        await prisma.emailMessage.update({
          where: { id: outboundRowId },
          data: {
            messageId: result.emailId,
            deliveryStatus: 'SENT',
            lastError: null,
            retryCount: result.attempts,
          },
        }).catch((err) => {
          console.error(`Failed to mark auto-response EmailMessage SENT for ticket ${ticketId}:`, err);
        });
        console.log(`Auto-response sent via Resend for ticket ${ticketId} (email id: ${result.emailId})`);

        // The email was delivered: only NOW store the customer-facing reply
        // and mark the ticket RESOLVED. This only happens when the knowledge
        // base contained a verified solution (canResolve === true).
        if (canResolve && decision && kbEntry) {
          try {
            const aiAgent = await getOrCreateAIAgent();
            await prisma.reply.create({
              data: {
                body: [decision.solution, decision.verification]
                  .filter((s) => s && s.trim().length > 0)
                  .join('\n\n'),
                ticketId,
                authorId: aiAgent.id,
                senderType: 'AGENT',
              },
            });
            await prisma.ticket.update({
              where: { id: ticketId },
              data: {
                status: 'RESOLVED',
                resolvedByAI: true,
                resolvedAt: new Date(),
                assigneeId: aiAgent.id, // Assign to the existing AI agent
              },
            });
            console.log(`Ticket ${ticketId} auto-resolved using knowledge base: ${kbEntry.title}`);
          } catch (dbError) {
            // Never crash email ingestion on reply/status persistence issues.
            console.error(`Failed to record AI resolution for ticket ${ticketId}:`, dbError);
          }
        }
        return;
      }
      if (!result.emailId) {
        console.error(`Failed to send auto-response for ticket ${ticketId}: ${result.error ?? 'unknown error'}`);
        if (outboundRowId) {
          await prisma.emailMessage.update({
            where: { id: outboundRowId },
            data: {
              deliveryStatus: 'FAILED',
              lastError: result.error ?? 'Resend unavailable or failed',
              retryCount: result.attempts,
            },
          }).catch((err) => {
            console.error(`Failed to mark auto-response EmailMessage FAILED for ticket ${ticketId}:`, err);
          });
        }
      }
    } catch (error) {
      // Never propagate into inbound email processing.
      console.error('Failed to send auto-response:', error);
    }
  }

  /**
   * Send a "Ticket Created" email notification to the ticket sender.
   *
   * This is a best-effort, non-blocking notification. It never throws and
   * never affects ticket creation. If anything goes wrong (missing/invalid
   * sender email, missing RESEND_API_KEY, or a Resend failure), the error is
   * simply logged and processing continues.
   *
   * Reuses the existing Resend integration in ./resend.service
   * (sendEmailWithRetry) and records delivery status on an OUTBOUND
   * EmailMessage row (QUEUED -> SENT/FAILED).
   */
  static async sendTicketCreatedNotification(ticket: {
    id: string;
    ticketNumber: number;
    title: string;
    senderEmail: string;
  }): Promise<void> {
    const senderEmail = (ticket.senderEmail || '').trim();

    // Escape HTML special characters in the title to prevent HTML injection
    // (uses unicode escapes to avoid ambiguity with HTML entities)
    const escapedTitle = (ticket.title || '')
      .replace(/\u0026/g, '\u0026amp;')
      .replace(/</g, '\u0026lt;')
      .replace(/>/g, '\u0026gt;')
      .replace(/"/g, '\u0026quot;')
      .replace(/'/g, '\u0026#39;');

    // Do not send if senderEmail is missing or empty
    if (!senderEmail) {
      console.log(`Skipping ticket-created email: no sender email for ticket ${ticket.id}`);
      return;
    }

    // Do not send if RESEND_API_KEY is not configured
    if (!process.env.RESEND_API_KEY) {
      console.log('RESEND_API_KEY not configured, skipping ticket-created email');
      return;
    }

    // Basic email format sanity check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail)) {
      console.warn(`Skipping ticket-created email: invalid sender email "${senderEmail}" for ticket ${ticket.id}`);
      return;
    }

    // Professional HTML body - no internal DB info, no secrets
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1a56db; margin-bottom: 8px;">Help Desk</h2>
        <p style="color: #333; font-size: 16px;">Dear customer,</p>
        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          Thank you for contacting our Help Desk. Your request has been received and a ticket has been created.
        </p>
        <table style="border-collapse: collapse; margin: 16px 0; font-size: 14px;">
          <tr>
            <td style="padding: 6px 12px; font-weight: bold; color: #333;">Ticket Number:</td>
            <td style="padding: 6px 12px; color: #333;"><strong>#${ticket.ticketNumber}</strong></td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; font-weight: bold; color: #333;">Ticket Title:</td>
            <td style="padding: 6px 12px; color: #333;">${escapedTitle}</td>
          </tr>
        </table>
        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          Our support team will review your request and get back to you as soon as possible.
          Thank you for your patience.
        </p>
        <p style="color: #666; font-size: 13px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 12px;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    `;

    // Record the outbound email as QUEUED before sending, using a clearly
    // marked pending placeholder messageId (the Resend API does not return an
    // RFC Message-ID). Duplicate-safe: reuse the row if it already exists.
    const pendingMessageId = `pending-created-${ticket.id}`;
    let outboundRowId: string | null = null;
    try {
      const existing = await prisma.emailMessage.findUnique({
        where: { messageId: pendingMessageId },
        select: { id: true },
      });
      if (existing) {
        outboundRowId = existing.id;
      } else {
        const queued = await prisma.emailMessage.create({
          data: {
            messageId: pendingMessageId,
            ticketId: ticket.id,
            direction: 'OUTBOUND',
            deliveryStatus: 'QUEUED',
            toAddress: senderEmail,
            subject: 'Help Desk - Ticket Created',
            bodyHtml: html,
          },
        });
        outboundRowId = queued.id;
      }
    } catch (error) {
      console.error(`Failed to record QUEUED ticket-created EmailMessage for ticket ${ticket.id}:`, error);
    }

    try {
      const result = await sendEmailWithRetry(
        senderEmail,
        'Help Desk - Ticket Created',
        html
      );
      if (result.emailId && outboundRowId) {
        await prisma.emailMessage.update({
          where: { id: outboundRowId },
          data: {
            messageId: result.emailId,
            deliveryStatus: 'SENT',
            lastError: null,
            retryCount: result.attempts,
          },
        }).catch((err) => {
          console.error(`Failed to mark ticket-created EmailMessage SENT for ticket ${ticket.id}:`, err);
        });
        console.log(`Ticket-created email sent for ticket ${ticket.id} (email id: ${result.emailId})`);
        return;
      }
      if (!result.emailId) {
        console.log(`Ticket-created email not sent for ticket ${ticket.id} (Resend unavailable or failed): ${result.error ?? 'unknown error'}`);
        if (outboundRowId) {
          await prisma.emailMessage.update({
            where: { id: outboundRowId },
            data: {
              deliveryStatus: 'FAILED',
              lastError: result.error ?? 'Resend unavailable or failed',
              retryCount: result.attempts,
            },
          }).catch((err) => {
            console.error(`Failed to mark ticket-created EmailMessage FAILED for ticket ${ticket.id}:`, err);
          });
        }
      }
    } catch (error) {
      console.error(`Failed to send ticket-created email for ticket ${ticket.id}:`, error);
    }
  }

  /**
   * Mark email as seen (read)
   */
  private async markAsSeen(connection: any, uid: string): Promise<void> {
    try {
      await connection.addFlags(uid, ['\\Seen']);
    } catch (error) {
      console.warn(`Failed to mark email as seen: ${error}`);
    }
  }

  /**
   * Process a single email
   */
  private async processEmail(
    connection: any,
    email: any,
    rawEmail?: Buffer | string
  ): Promise<void> {
    try {
      // Parse the email (raw RFC822 content fetched via bodies: [''])
      if (!rawEmail) {
        console.warn('No raw email content available, skipping');
        return;
      }
      const parsedEmail = await this.parseEmail(rawEmail);

      // Extract sender info
      const from = parsedEmail.from[0];
      if (!from) {
        console.warn('Email has no sender, skipping');
        return;
      }

      const senderEmail = from.address;
      const senderName = from.name;

      // Gmail thread ID is best-effort (may be unavailable)
      parsedEmail.gmailThreadId = this.extractGmailThreadId(email);

      // Duplicate prevention: skip emails whose Message-ID was already processed
      if (parsedEmail.messageId) {
        const existing = await prisma.emailMessage.findUnique({
          where: { messageId: this.normalizeMessageId(parsedEmail.messageId) },
          select: { id: true },
        });
        if (existing) {
          console.log(
            `Skipping duplicate email (already processed): ${parsedEmail.messageId}`
          );
          if (email.attributes && email.attributes.uid) {
            await this.markAsSeen(connection, email.attributes.uid);
          }
          return;
        }
      }

      // Find or create user
      const userId = await this.findOrCreateUser(senderEmail, senderName);

      // Thread matching: does this email belong to an existing conversation?
      const threadMatch = await this.findThreadMatch(parsedEmail);

      // Recipient filter: ignore unrelated emails that merely arrived UNSEEN
      // in the polled mailbox (security notifications, newsletters, etc.).
      // Existing threaded conversations are always accepted.
      if (!threadMatch && !this.isAddressedToHelpdesk(parsedEmail)) {
        console.log('Ignoring email: not addressed to configured Help Desk address');
        if (email.attributes && email.attributes.uid) {
          await this.markAsSeen(connection, email.attributes.uid);
        }
        return;
      }

      if (threadMatch) {
        // Customer reply to an existing ticket - do NOT create a new ticket
        // and do NOT run new-ticket AI/KB processing.
        const reply = await prisma.reply.create({
          data: {
            body: this.extractEmailBody(parsedEmail),
            ticketId: threadMatch.ticketId,
            authorId: userId,
            senderType: 'CUSTOMER',
          },
        });

        console.log(
          `Added customer reply ${reply.id} to ticket ${threadMatch.ticketId} from email by ${senderEmail}`
        );

        if (parsedEmail.messageId) {
          await this.recordEmailMessage({
            messageId: this.normalizeMessageId(parsedEmail.messageId),
            inReplyTo: parsedEmail.inReplyTo,
            references: parsedEmail.references,
            gmailThreadId: parsedEmail.gmailThreadId,
            ticketId: threadMatch.ticketId,
            replyId: reply.id,
          });
        }
      } else {
        // New conversation - use the Phase 1 pipeline unchanged
        const ticket = await this.createTicketFromEmail(parsedEmail, userId);

        console.log(`Created ticket ${ticket.id} from email by ${senderEmail}`);

        if (parsedEmail.messageId) {
          await this.recordEmailMessage({
            messageId: this.normalizeMessageId(parsedEmail.messageId),
            inReplyTo: parsedEmail.inReplyTo,
            references: parsedEmail.references,
            gmailThreadId: parsedEmail.gmailThreadId,
            ticketId: ticket.id,
          });
        }

        // Send auto-response only for newly created tickets
        await this.sendAutoResponse(senderEmail, parsedEmail.subject, ticket.id);
      }

      // Mark email as seen
      // Note: We need to get the UID from the email object
      // This depends on how imap-simple structures the email object
      if (email.attributes && email.attributes.uid) {
        await this.markAsSeen(connection, email.attributes.uid);
      }

    } catch (error) {
      console.error('Error processing email:', error);
      // Don't mark as seen if there was an error, so we can retry
    }
  }

  /**
   * Check for new emails and process them
   */
  public async checkForNewEmails(): Promise<number> {
    let connection: any = null;
    let processedCount = 0;

    try {
      // Connect to IMAP
      connection = await this.connectIMAP();

      // Open inbox
      await new Promise((resolve, reject) => {
        connection.openBox('INBOX', (err: any) => {
          if (err) return reject(err);
          resolve(null);
        });
      });

      // Search for unseen emails.
      // bodies: [''] fetches the complete raw RFC822 message, which is what
      // mailparser's simpleParser() expects (a Buffer/string/stream). Fetching
      // 'HEADER'/'TEXT' returns structured objects that cause
      // "TypeError: input.once is not a function" inside mailparser.
      const searchCriteria = ['UNSEEN'];
      const fetchOptions = { bodies: [''] };

      const messages = await connection.search(searchCriteria, fetchOptions);

      if (messages.length === 0) {
        return 0;
      }

      console.log(`Found ${messages.length} new email(s)`);

      // Process each email
      for (const message of messages) {
        try {
          // Extract the raw full-message body part returned by imap-simple
          const rawPart = message.parts?.find(
            (part: any) => part.which === ''
          );
          // imap-simple exposes the fetched body as `part.body`
          const rawEmail: Buffer | string | undefined = rawPart?.body;
          await this.processEmail(connection, message, rawEmail);
          processedCount++;
        } catch (error) {
          console.error('Error processing individual email:', error);
        }
      }

      return processedCount;
    } catch (error) {
      console.error('Error checking for new emails:', error);
      return 0;
    } finally {
      // Close connection
      if (connection) {
        try {
          connection.end();
        } catch (error) {
          console.error('Error closing IMAP connection:', error);
        }
      }
    }
  }

  /**
   * Start polling for emails at regular intervals
   */
  public startPolling(intervalSeconds: number = 300): NodeJS.Timeout {
    console.log(`Starting email polling every ${intervalSeconds} seconds`);

    // Run immediately, then at intervals
    this.checkForNewEmails().then(count => {
      if (count > 0) {
        console.log(`Processed ${count} email(s) on initial run`);
      }
    });

    const interval = setInterval(async () => {
      try {
        await this.checkForNewEmails();
      } catch (error) {
        console.error('Error in email polling interval:', error);
      }
    }, intervalSeconds * 1000);

    return interval;
  }
}