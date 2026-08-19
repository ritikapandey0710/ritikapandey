// Final test to verify knowledge base parsing and matching
const fs = require('fs');
const path = require('path');

function generateId(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

function parseKnowledgeBase(content) {
  var entries = [];
  var lines = content.split('\n');

  var i = 0;
  while (i < lines.length) {
    // Look for a header line (starts with # followed by space and text)
    var headerMatch = lines[i].match(/^#{1,6}\s+(.+)$/);
    if (!headerMatch) {
      i++;
      continue;
    }

    // Extract title from header
    var title = headerMatch[1].trim();
    i++;

    // Skip empty lines after header
    while (i < lines.length && lines[i].trim() === '') {
      i++;
    }

    // Collect all lines for this section until next header or end
    var sectionLines = [];
    while (i < lines.length) {
      // Check if this line is a new header
      var isNewHeader = lines[i].match(/^#{1,6}\s+/);
      if (isNewHeader) {
        break;
      }
      sectionLines.push(lines[i]);
      i++;
    }

    if (sectionLines.length === 0) {
      continue;
    }

    var sectionContent = sectionLines.join('\n');
    var entry = {
      id: generateId(title),
      title: title,
      category: '',
      keywords: [],
      content: sectionContent
    };

    // Parse metadata from the section lines
    for (var j = 0; j < sectionLines.length; j++) {
      var trimmedLine = sectionLines[j].trim();
      if (trimmedLine.startsWith('**Category:**')) {
        entry.category = trimmedLine.replace('**Category:**', '').trim();
      } else if (trimmedLine.startsWith('**Keywords:**')) {
        var keywordsStr = trimmedLine.replace('**Keywords:**', '').trim();
        entry.keywords = keywordsStr
          .split(',')
          .map(function(k) { return k.trim().toLowerCase(); })
          .filter(Boolean);
      }
    }

    if (entry.title && entry.category) {
      entries.push(entry);
    }
  }

  return entries;
}

function findMatchingEntry(entries, ticketTitle, ticketDescription) {
  if (!entries.length) return null;

  var ticketText = (ticketTitle + ' ' + (ticketDescription || '')).toLowerCase();
  var ticketWords = ticketText
    .split(/\s+/)
    .map(function(word) { return word.replace(/[^\w]/g, ''); })
    .filter(function(word) { return word.length > 2; });

  var bestMatch = null;
  var highestScore = 0;

  for (var j = 0; j < entries.length; j++) {
    var entry = entries[j];
    var score = 0;

    // Check title match
    if (entry.title.toLowerCase().includes(ticketTitle.toLowerCase()) ||
        ticketTitle.toLowerCase().includes(entry.title.toLowerCase())) {
      score += 10;
    }

    // Check keyword matches
    for (var k = 0; k < entry.keywords.length; k++) {
      if (ticketText.includes(entry.keywords[k])) {
        score += 5;
      }
    }

    // Check word overlap
    var entryWords = entry.content
      .toLowerCase()
      .split(/\s+/)
      .map(function(word) { return word.replace(/[^\w]/g, ''); })
      .filter(function(word) { return word.length > 2; });

    var commonWords = ticketWords.filter(function(word) {
      return entryWords.indexOf(word) !== -1;
    });
    score += commonWords.length * 2;

    // Boost score for exact phrase matches
    for (var k = 0; k < entry.keywords.length; k++) {
      var keyword = entry.keywords[k];
      if (ticketText.includes(' ' + keyword + ' ') ||
          ticketText.startsWith(keyword + ' ') ||
          ticketText.endsWith(' ' + keyword)) {
        score += 3;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = entry;
    }
  }

  // Only return match if score is above threshold
  return highestScore >= 10 ? bestMatch : null;
}

function getResolutionSteps(entry) {
  // Extract troubleshooting steps and recommended resolution
  var lines = entry.content.split('\n');
  var inTroubleshooting = false;
  var inResolution = false;
  var resolutionParts = [];

  for (var j = 0; j < lines.length; j++) {
    var trimmed = lines[j].trim();

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
        ['Troubleshooting Steps', 'Recommended Resolution', 'Verification', 'Escalation', 'Category:', 'Keywords:', 'Common Ticket Symptoms:', 'Likely Causes:'].indexOf(trimmed.split(':')[0]) === -1) {
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
    return 'Based on similar issues, please refer to the knowledge base article: "' + entry.title + '"';
  }

  return resolutionParts.join(' ');
}

// Main test
var kbPath = path.join(process.cwd(), 'server', 'knowledge base.md');
console.log('Reading knowledge base from:', kbPath);

try {
  var content = fs.readFileSync(kbPath, 'utf8');
  console.log('File loaded successfully, length:', content.length);

  var entries = parseKnowledgeBase(content);
  console.log('Number of KB entries parsed:', entries.length);

  if (entries.length > 0) {
    console.log('\nFirst few entries:');
    for (var i = 0; i < Math.min(3, entries.length); i++) {
      console.log((i+1) + '. ' + entries[i].title + ' (' + entries[i].category + ')');
      console.log('   Keywords: ' + entries[i].keywords.slice(0, 5).join(', '));
    }
  }

  // Test cases
  var testCases = [
    { title: "I forgot my password", description: "I cannot log in because I forgot my password and need to reset it" },
    { title: "Password reset request", description: "I need to reset my password but I'm not receiving the reset email" },
    { title: "I need to update my payment method", description: "My credit card expired and I need to update my payment method on file for my subscription" },
    { title: "I want a refund for my order", description: "I'm not satisfied with the product and want to return it for a refund" },
    { title: "Cannot access account", description: "I'm unable to log into my account" },
    { title: "Website is slow", description: "The pages are taking too long to load" }
  ];

  console.log('\n=== TEST RESULTS ===');
  for (var i = 0; i < testCases.length; i++) {
    var testCase = testCases[i];
    var match = findMatchingEntry(entries, testCase.title, testCase.description);
    console.log('\nTesting: "' + testCase.title + '"');
    if (match) {
      console.log('✓ MATCHED: "' + match.title + '"');
      console.log('  Category: ' + match.category);
      var resolution = getResolutionSteps(match);
      console.log('  Resolution: ' + (resolution.length > 150 ? resolution.substring(0, 150) + '...' : resolution));
    } else {
      console.log('✗ NO MATCH FOUND');
    }
  }

} catch (error) {
  console.error('Error:', error.message);
}