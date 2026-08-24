const f = require('fs');

// ── Fix 1: ai.controller.ts — restore missing function-opener line ──
const aiPath = 'c:/Users/ritik/OneDrive/Desktop/help desk/server/src/controllers/ai.controller.ts';
let ai = f.readFileSync(aiPath, 'utf8');
const aiOld = '  kbEntry: KnowledgeBaseEntry\n  const apiKey = process.env.GEMINI_API_KEY;';
const aiNew = '  kbEntry: KnowledgeBaseEntry\n): Promise<AIResolutionDecision> {\n  const apiKey = process.env.GEMINI_API_KEY;';
if (ai.includes(aiOld)) {
  ai = ai.replace(aiOld, aiNew);
  f.writeFileSync(aiPath, ai);
  console.log('FIX1: ai.controller.ts patched');
} else {
  console.log('FIX1: pattern not found');
}

// ── Fix 2: ticketProcessing.service.ts — close catch before else ──
const tpPath = 'c:/Users/ritik/OneDrive/Desktop/help desk/server/src/services/ticketProcessing.service.ts';
let tp = f.readFileSync(tpPath, 'utf8');
// Find: "    });\r\n\r\n    } else {"  → "    });\r\n    }\r\n    } else {"
const tpOld = '    });\r\n\r\n    } else {';
const tpNew = '    });\r\n    }\r\n    } else {';
if (tp.includes(tpOld)) {
  tp = tp.replace(tpOld, tpNew);
  f.writeFileSync(tpPath, tp);
  console.log('FIX2: ticketProcessing.service.ts patched (CRLF)');
} else {
  const tpOldLf = '    });\n\n    } else {';
  const tpNewLf = '    });\n    }\n    } else {';
  if (tp.includes(tpOldLf)) {
    tp = tp.replace(tpOldLf, tpNewLf);
    f.writeFileSync(tpPath, tp);
    console.log('FIX2: ticketProcessing.service.ts patched (LF)');
  } else {
    console.log('FIX2: pattern not found');
  }
}