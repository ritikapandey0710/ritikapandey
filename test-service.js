const path = require('path');

// Copy the KnowledgeBaseService class here to test it
class KnowledgeBaseService {
  constructor() {
    this.kbPath = path.join(__dirname, 'server', 'knowledge base.md');
    console.log('KnowledgeBaseService: kbPath =', this.kbPath);
    this.loadKnowledgeBase();
  }

  loadKnowledgeBase() {
    const fs = require('fs');
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

  parseKnowledgeBase(content) {
    const entries = [];
    const sections = content.split(/^---$/gm);

    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;

      const lines = trimmed.split('\n');

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
        console.log(`KnowledgeBaseService: Loaded entry: "${entry.title}" (${entry.category})`);
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

    return highestScore >= 10 ? bestMatch : null;
  }

  getResolutionSteps(entry) {
    const lines = entry.content.split('\n');
    let inTroubleshooting = false;
    let inResolution = false;
    const resolutionParts = [];

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

    return resolutionParts.join(' ');
  }
}

// Test the service
console.log('=== Testing KnowledgeBaseService ===');
const kbService = new KnowledgeBaseService();

console.log(`\nNumber of entries loaded: ${kbService.entries.length}`);

if (kbService.entries.length > 0) {
  console.log('\nFirst entry:');
  console.log(JSON.stringify(kbService.entries[0], null, 2));
}

// Test matching
console.log('\n=== Testing Matching ===');
const testCases = [
  { title: "I forgot my password", description: "I cannot log in because I forgot my password and need to reset it" },
  { title: "Password reset request", description: "I need to reset my password but I'm not receiving the reset email" },
  { title: "I need to update my payment method", description: "My credit card expired and I need to update my payment method on file for my subscription" }
];

for (const testCase of testCases) {
  console.log(`\nTesting: "${testCase.title}"`);
  const match = kbService.findMatchingEntry(testCase.title, testCase.description);
  if (match) {
    console.log(`✓ MATCHED: "${match.title}"`);
    console.log(`  Category: ${match.category}`);
    const resolution = kbService.getResolutionSteps(match);
    console.log(`  Resolution: ${resolution.substring(0, 100)}...`);
  } else {
    console.log('✗ NO MATCH FOUND');
  }
}