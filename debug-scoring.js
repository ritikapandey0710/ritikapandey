import { knowledgeBaseService } from './server/src/services/knowledgeBaseService.js';

async function debugScoring() {
  const kbService = knowledgeBaseService;

  const ticketTitle = "Password Reset Issues";
  const ticketDescription = "I forgot my password and need to reset it. I'm unable to log in to my account.";

  console.log('Testing scoring for:');
  console.log('Title:', ticketTitle);
  console.log('Description:', ticketDescription);
  console.log('');

  const ticketText = `${ticketTitle} ${ticketDescription || ''}`.toLowerCase();
  const ticketWords = ticketText
    .split(/\s+/)
    .map(word => word.replace(/[^\w]/g, ''))
    .filter(word => word.length > 2);

  console.log('Ticket text:', ticketText);
  console.log('Ticket words:', ticketWords);
  console.log('');

  let bestMatch = null;
  let highestScore = 0;

  for (const entry of kbService.entries) {
    let score = 0;

    // Check title match
    if (entry.title.toLowerCase().includes(ticketTitle.toLowerCase()) ||
        ticketTitle.toLowerCase().includes(entry.title.toLowerCase())) {
      score += 10;
      console.log(`Entry "${entry.title}": +10 for title match`);
    }

    // Check keyword matches
    for (const keyword of entry.keywords) {
      if (ticketText.includes(keyword)) {
        score += 5;
        console.log(`Entry "${entry.title}": +5 for keyword "${keyword}"`);
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
      console.log(`Entry "${entry.title}": +${commonWords.length * 2} for ${commonWords.length} common words:`, commonWords);
    }

    // Boost score for exact phrase matches
    for (const keyword of entry.keywords) {
      if (ticketText.includes(` ${keyword} `) ||
          ticketText.startsWith(`${keyword} `) ||
          ticketText.endsWith(` ${keyword}`)) {
        score += 3;
        console.log(`Entry "${entry.title}": +3 for exact phrase match of "${keyword}"`);
      }
    }

    console.log(`Entry "${entry.title}": Total score = ${score}`);
    console.log('---');

    if (score > highestScore) {
      highestScore = score;
      bestMatch = entry;
    }
  }

  console.log('');
  console.log('Best match:', bestMatch ? bestMatch.title : 'None');
  console.log('Highest score:', highestScore);
  console.log('Threshold: 35');
  console.log('Match result:', highestScore >= 35 ? bestMatch : null);
}

debugScoring();