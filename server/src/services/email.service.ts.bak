import { simpleParser } from 'mailparser';
import IMAP, { Box } from 'imap-simple';
import { prisma } from '../prisma';
import nodemailer from 'nodemailer';

interface EmailOptions {
  imap: {
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
}

export class EmailService {
  private imapConfig: any;
  private smtpTransport: nodemailer.Transporter | null;
  private fromEmail: string;

  constructor(options: EmailOptions) {
    this.imapConfig = {
      user: options.imap.user,
      password: options.imap.password,
      host: options.imap.host,
      port: options.imap.port,
      tls: options.imap.tls,
      authTimeout: options.imap.authTimeout || 5000,
    };

    this.fromEmail = options.from;

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
    const connection = await IMAP.connect(this.imapConfig);
    return connection;
  }

  /**
   * Parse raw email into structured format
   */
  private async parseEmail(rawEmail: any): Promise<ParsedEmail> {
    const parsed = await simpleParser(rawEmail);

    return {
      from: parsed.from || [],
      subject: parsed.subject || '(No Subject)',
      text: parsed.text || '',
      html: parsed.html,
      date: parsed.date || new Date(),
      messageId: parsed.messageId || '',
    };
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
   * Create a ticket from parsed email data
   */
  private async createTicketFromEmail(
    email: ParsedEmail,
    userId: string
  ) {
    const title = email.subject.substring(0, 200); // Limit title length
    const description = this.extractEmailBody(email);

    // Determine priority based on subject keywords (simple heuristic)
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

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        status: 'OPEN',
        priority,
        reporterId: userId,
      },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
      },
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
    if (!this.smtpTransport) {
      console.log('SMTP not configured, skipping auto-response');
      return;
    }

    try {
      await this.smtpTransport.sendMail({
        from: this.fromEmail,
        to,
        subject: `Re: ${subject} (Ticket #${ticketId})`,
        text: `Thank you for your submission. Your ticket has been created with ID: ${ticketId}\n\nWe will respond to your inquiry shortly.`,
      });
    } catch (error) {
      console.error('Failed to send auto-response:', error);
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

      // Find or create user
      const userId = await this.findOrCreateUser(senderEmail, senderName);

      // Create ticket
      const ticket = await this.createTicketFromEmail(parsedEmail, userId);

      console.log(`Created ticket ${ticket.id} from email by ${senderEmail}`);

      // Send auto-response if configured
      await this.sendAutoResponse(senderEmail, parsedEmail.subject, ticket.id);

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