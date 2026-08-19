// Test candidate topics against the knowledge base to ensure they score below the threshold (35)
const fs = require('fs');
const path = require('path');

// Copy the exact scoring logic from the knowledge base service
class KnowledgeBaseService {
  constructor() {
    this.kbPath = path.join(__dirname, 'server', 'knowledge base.md');
    this.loadKnowledgeBase();
  }

  loadKnowledgeBase() {
    if (!fs.existsSync(this.kbPath)) {
      console.warn('Knowledge base file not found:', this.kbPath);
      return;
    }
    const content = fs.readFileSync(this.kbPath, 'utf8');
    this.entries = this.parseKnowledgeBase(content);
    console.log(`Loaded ${this.entries.length} knowledge base entries`);
  }

  parseKnowledgeBase(content) {
    const entries = [];
    const sections = content.split(/^---$/gm);

    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;

      const lines = trimmed.split('\n');

      let title = '';
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('# ')) {
          title = lines[i].trim().substring(2).trim();
          break;
        }
      }

      if (!title) continue;

      const entry = {
        id: this.generateId(title),
        title,
        category: '',
        keywords: [],
        content: trimmed
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('**Category:**')) {
          if (i + 1 < lines.length) {
            entry.category = lines[i + 1].trim();
          }
        } else if (line.startsWith('**Keywords:**')) {
          if (i + 1 < lines.length) {
            const keywordsStr = lines[i + 1].trim();
            entry.keywords = keywordsStr
              .split(',')
              .map(k => k.trim().toLowerCase())
              .filter(Boolean);
          }
        }
      }

      if (entry.title && entry.category) {
        entries.push(entry);
      }
    }
    return entries;
  }

  generateId(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  findMatchingEntry(ticketTitle, ticketDescription) {
    if (!this.entries.length) return null;

    const ticketText = `${ticketTitle} ${ticketDescription || ''}`.toLowerCase();
    const ticketWords = ticketText
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length > 2);

    let bestMatch = null;
    let highestScore = 0;

    for (const entry of this.entries) {
      let score = 0;

      if (entry.title.toLowerCase().includes(ticketTitle.toLowerCase()) ||
          ticketTitle.toLowerCase().includes(entry.title.toLowerCase())) {
        score += 10;
      }

      for (const keyword of entry.keywords) {
        if (ticketText.includes(keyword)) {
          score += 5;
        }
      }

      const entryWords = entry.content
        .toLowerCase()
        .split(/\s+/)
        .map(word => word.replace(/[^\w]/g, ''))
        .filter(word => word.length > 2);

      const commonWords = ticketWords.filter(word => entryWords.includes(word));
      score += commonWords.length * 2;

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

    return { entry: bestMatch, score: highestScore };
  }
}

const kb = new KnowledgeBaseService();

// Test candidate topics that should NOT be in the knowledge base
const candidates = [
  {
    title: "Satellite communication gateway configuration",
    description: "I need to configure the satellite uplink gateway for our remote location. The transceiver firmware version is outdated and I'm looking for guidance on updating the satellite modem firmware to the latest supported release for our geographic region.",
    expected: "NOT IN KB",
    comment: "Completely unrelated to help desk topics"
  },
  {
    title: "Crypto currency merchant settlement",
    description: "We are setting up a cryptocurrency payment gateway for our e-commerce store and need to understand how the daily settlement process works for Bitcoin and Ethereum transactions in the merchant dashboard.",
    expected: "NOT IN KB",
    comment: "No overlap with existing KB (billing is about payment methods/invoices, not crypto)"
  },
  {
    title: "Fleet vehicle GPS tracking report",
    description: "Our logistics department uses GPS trackers installed in delivery vehicles. The tracking dashboard shows inconsistent mileage data for some trucks and we need to troubleshoot the telemetry sensor calibration for the most recent fleet update.",
    expected: "NOT IN KB",
    comment: "Completely unrelated to software support topics"
  }
];

for (const candidate of candidates) {
  const result = kb.findMatchingEntry(candidate.title, candidate.description);
  console.log(`\n=== Testing: "${candidate.title}"`);
  console.log(`Comment: ${candidate.comment}`);
  if (result.entry) {
    console.log(`Matched: "${result.entry.title}" (score: ${result.score})`);
    if (result.score >= 35) {
      console.log(`RESULT: ❌ WOULD AUTO-RESOLVE (score ${result.score} >= 35)`);
    } else {
      console.log(`RESULT: ✅ NOT MATCHED (score ${result.score} < 35) - becomes OPEN ticket`);
    }
  } else {
    console.log(`RESULT: ✅ NO MATCH - becomes OPEN ticket`);
  }
}