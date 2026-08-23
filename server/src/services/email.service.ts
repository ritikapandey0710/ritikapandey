import { simpleParser } from 'mailparser';
import IMAP = require('imap-simple');
import { prisma } from '../lib/prisma';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { sendEmail } from './resend.service';

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

interface ParsedEmail {
  from: { address: string; name?: string }[];
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
      await prisma.emailMessage.create({ data });
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
    });

    return ticket;
  }

  /**
   * Send auto-response email
   */
  private async sendAutoResponse(
    to: string,
    subject: string,
    ticketId: string
  ): Promise<void> {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Thank you for your submission</h2>
          <p>Your ticket has been created with ID: <strong>${ticketId}</strong></p>
          <p>We will respond to your inquiry shortly.</p>
        </div>
      `;

      const emailSubject = `Re: ${subject} (Ticket #${ticketId})`;

      if (!this.resend) {
        console.log('RESEND_API_KEY not configured, skipping auto-response email');
        return;
      }

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject: emailSubject,
        html,
      });

      if (error) {
        console.error('Failed to send auto-response via Resend:', error);
        throw new Error(`Resend failed to send auto-response: ${error.message}`);
      }

      console.log(`Auto-response sent via Resend: ${data?.id}`);
    } catch (error) {
      console.error('Failed to send auto-response:', error);
      throw error;
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
   * Reuses the existing Resend integration in ./resend.service (sendEmail).
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

    try {
      const emailId = await sendEmail(
        senderEmail,
        'Help Desk - Ticket Created',
        html
      );
      if (emailId) {
        console.log(`Ticket-created email sent for ticket ${ticket.id} (email id: ${emailId})`);
        return;
      }
      // sendEmail already logged the failure; just ensure we don't proceed silently
      console.log(`Ticket-created email not sent for ticket ${ticket.id} (Resend unavailable or failed)`);
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
    email: any
  ): Promise<void> {
    try {
      // Parse the email
      const parsedEmail = await this.parseEmail(email);

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

      // Search for unseen emails
      const searchCriteria = ['UNSEEN'];
      const fetchOptions = { bodies: ['HEADER', 'TEXT'] };

      const messages = await connection.search(searchCriteria, fetchOptions);

      if (messages.length === 0) {
        return 0;
      }

      console.log(`Found ${messages.length} new email(s)`);

      // Process each email
      for (const message of messages) {
        try {
          await this.processEmail(connection, message);
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