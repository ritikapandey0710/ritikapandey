import fs from 'fs';
import path from 'path';

export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  content: string;
}

class KnowledgeBaseService {
  private entries: KnowledgeBaseEntry[] = [];
  private kbPath: string;

  constructor() {
    // Use __dirname to get the directory of this file, then go up two levels to project root, then into knowledge base.md
    this.kbPath = path.join(__dirname, '..', '..', 'knowledge base.md');
    console.log('KnowledgeBaseService: kbPath =', this.kbPath);
    this.loadKnowledgeBase();
  }

  private loadKnowledgeBase(): void {
    try {
      if (!fs.existsSync(this.kbPath)) {
        console.warn('Knowledge base file not found:', this.kbPath);
        return;
      }

      const content = fs.readFileSync(this.kbPath, 'utf8');
      this.entries = this.parseKnowledgeBase(content);
      console.log(`Loaded ${this.entries.length} knowledge base entries`);
    } catch (error) {
      console.error('Error loading knowledge base:', error);
    }
  }

  private parseKnowledgeBase(content: string): KnowledgeBaseEntry[] {
    const entries: KnowledgeBaseEntry[] = [];

    // Split by '---' separator (with optional whitespace and newlines)
    const sections = content.split(/^---$/gm);

    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;

      // Split into lines
      const lines = trimmed.split('\n');

      // Find the title (first line that starts with #)
      let title = '';
      let titleIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('# ')) {
          title = lines[i].trim().substring(2).trim();
          titleIndex = i;
          break;
        }
      }

      if (!title) continue;

      // Initialize entry
      const entry: KnowledgeBaseEntry = {
        id: this.generateId(title),
        title,
        category: '',
        keywords: [],
        content: trimmed
      };

      // Parse metadata from the lines - look for Category and Keywords and get values from NEXT line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('**Category:**')) {
          // Category value is on the next line
          if (i + 1 < lines.length) {
            entry.category = lines[i + 1].trim();
          }
        } else if (line.startsWith('**Keywords:**')) {
          // Keywords value is on the next line
          if (i + 1 < lines.length) {
            const keywordsStr = lines[i + 1].trim();
            entry.keywords = keywordsStr
              .split(',')
              .map(k => k.trim().toLowerCase())
              .filter(Boolean);
          }
        }
      }

      // Only add entry if we have both title and category
      if (entry.title && entry.category) {
        entries.push(entry);
        console.log(`KnowledgeBaseService: Loaded entry: "${entry.title}" (${entry.category})`);
      }
    }

    return entries;
  }

  private generateId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  public findMatchingEntry(ticketTitle: string, ticketDescription: string | null): KnowledgeBaseEntry | null {
    if (!this.entries.length) return null;

    const ticketText = `${ticketTitle} ${ticketDescription || ''}`.toLowerCase();
    const ticketWords = ticketText
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length > 2);

    let bestMatch: KnowledgeBaseEntry | null = null;
    let highestScore = 0;

    for (const entry of this.entries) {
      let score = 0;

      // Check title match
      if (entry.title.toLowerCase().includes(ticketTitle.toLowerCase()) ||
          ticketTitle.toLowerCase().includes(entry.title.toLowerCase())) {
        score += 10;
      }

      // Check keyword matches
      for (const keyword of entry.keywords) {
        if (ticketText.includes(keyword)) {
          score += 5;
        }
      }

      // Check word overlap
      const entryWords = entry.content
        .toLowerCase()
        .split(/\s+/)
        .map(word => word.replace(/[^\w]/g, ''))
        .filter(word => word.length > 2);

      const commonWords = ticketWords.filter(word => entryWords.includes(word));
      score += commonWords.length * 2;

      // Boost score for exact phrase matches
      for (const keyword of entry.keywords) {
        if (ticketText.includes(` ${keyword} `) ||
            ticketText.startsWith(`${keyword} `) ||
            ticketText.endsWith(` ${keyword}`)) {
          score += 3;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = entry;
      }
    }

    // Only return match if score is above threshold
    return highestScore >= 35 ? bestMatch : null;
  }

    /** Returns all loaded KB entries (read-only view for testing/debugging). */
  public getEntries(): KnowledgeBaseEntry[] {
    return [...this.entries];
  }

  /** Look up a single KB entry by its generated id. */
  public getEntryById(id: string): KnowledgeBaseEntry | null {
    return this.entries.find((e) => e.id === id) ?? null;
  }

  public getResolutionSteps(entry: KnowledgeBaseEntry): string {
    // Extract troubleshooting steps and recommended resolution
    const lines = entry.content.split('\n');
    let inTroubleshooting = false;
    let inResolution = false;
    const resolutionParts: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '## Troubleshooting Steps') {
        inTroubleshooting = true;
        inResolution = false;
        continue;
      }

      if (trimmed === '## Recommended Resolution') {
        inTroubleshooting = false;
        inResolution = true;
        continue;
      }

      if (trimmed.startsWith('## ') &&
          !['Troubleshooting Steps', 'Recommended Resolution', 'Verification', 'Escalation', 'Category:', 'Keywords:', 'Common Ticket Symptoms:', 'Likely Causes:'].includes(trimmed.split(':')[0].trim())) {
        inTroubleshooting = false;
        inResolution = false;
      }

      if ((inTroubleshooting || inResolution) &&
          trimmed &&
          !trimmed.startsWith('**') &&
          !trimmed.startsWith('#')) {
        resolutionParts.push(trimmed);
      }
    }

    if (resolutionParts.length === 0) {
      return `Based on similar issues, please refer to the knowledge base article: "${entry.title}"`;
    }

    return resolutionParts.join('\n');
  }

  private troubleshootingKeywords = [
    'Troubleshooting Steps',
    'Recommended Resolution',
    'Verification',
    'Escalation',
    'Category:',
    'Keywords:',
    'Common Ticket Symptoms:',
    'Likely Causes:'
  ];
}

export const knowledgeBaseService = new KnowledgeBaseService();
// Test comment to verify edits work