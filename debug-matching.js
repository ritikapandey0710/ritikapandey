const path = require('path');
const fs = require('fs');

// Copy the parsing logic from knowledgeBaseService to debug
function parseKnowledgeBase(content) {
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
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50),
      title,
      category: '',
      keywords: [],
      content: trimmed
    };

    // Parse metadata from the lines - look for Category and Keywords and get values from NEXT line
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

function generateId(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

function findMatchingEntry(entries, ticketTitle, ticketDescription) {
  if (!entries.length) return null;

  const ticketText = `${ticketTitle} ${ticketDescription || ''}`.toLowerCase();
  const ticketWords = ticketText
    .split(/\s+/)
    .map(word => word.replace(/[^\w]/g, ''))
    .filter(word => word.length > 2);

  let bestMatch = null;
  let highestScore = 0;

  console.log('Ticket text:', ticketText);
  console.log('Ticket words:', ticketWords);

  for (const entry of entries) {
    let score = 0;
    console.log(`\nChecking entry: "${entry.title}"`);

    // Check title match
    if (entry.title.toLowerCase().includes(ticketTitle.toLowerCase()) ||
        ticketTitle.toLowerCase().includes(entry.title.toLowerCase())) {
      score += 10;
      console.log(`  Title match: +10 (score: ${score})`);
    }

    // Check keyword matches
    for (const keyword of entry.keywords) {
      if (ticketText.includes(keyword)) {
        score += 5;
        console.log(`  Keyword "${keyword}" match: +5 (score: ${score})`);
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
    if (commonWords.length > 0) {
      console.log(`  Word overlap (${commonWords.length} words): +${commonWords.length * 2} (score: ${score})`);
      console.log(`    Common words: ${commonWords}`);
    }

    // Boost score for exact phrase matches
    for (const keyword of entry.keywords) {
      if (ticketText.includes(` ${keyword} `) ||
          ticketText.startsWith(`${keyword} `) ||
          ticketText.endsWith(` ${keyword}`)) {
        score += 3;
        console.log(`  Exact phrase "${keyword}" match: +3 (score: ${score})`);
      }
    }

    console.log(`  Final score for "${entry.title}": ${score}`);

    if (score > highestScore) {
      highestScore = score;
      bestMatch = entry;
    }
  }

  console.log(`\nHighest score: ${highestScore}`);
  console.log(`Best match: ${bestMatch ? bestMatch.title : 'none'}`);
  return highestScore >= 70 ? bestMatch : null;
}

// Load and test
const kbPath = path.join(__dirname, 'server', 'knowledge base.md');
console.log('Loading knowledge base from:', kbPath);

const content = fs.readFileSync(kbPath, 'utf8');
const entries = parseKnowledgeBase(content);
console.log(`Loaded ${entries.length} entries`);

entries.forEach((entry, index) => {
  console.log(`${index + 1}. "${entry.title}" (${entry.category})`);
  console.log(`   Keywords: ${entry.keywords.join(', ')}`);
});

// Test cases
console.log('\n=== TEST CASE 1: Password Reset ===');
const result1 = findMatchingEntry(entries, "Password Reset Issues", "I forgot my password and need to reset it. I'm unable to log in to my account.");
console.log('Result:', result1 ? result1.title : 'No match');

console.log('\n=== TEST CASE 2: API Integration ===');
const result2 = findMatchingEntry(entries, "API and Integration Issues", "I'm having trouble using the API. I keep getting authentication errors when trying to access the endpoints.");
console.log('Result:', result2 ? result2.title : 'No match');

console.log('\n=== TEST CASE 3: Unknown Issue ===');
const result3 = findMatchingEntry(entries, "Unknown Issue with Zebra Printing", "The zebra printer is not working properly and prints blank labels.");
console.log('Result:', result3 ? result3.title : 'No match');