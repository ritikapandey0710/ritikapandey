const fs = require('fs');
const path = require('path');

function parseKnowledgeBase(content) {
    const entries = [];
    // Split by headers (lines that start with # followed by space)
    const sections = content.split(/(^#{1,6}\s+.+$)/gm);

    // Process sections in pairs: [header, content, header, content, ...]
    for (let i = 1; i < sections.length; i += 2) {
        const header = sections[i].trim();
        const sectionContent = sections[i + 1] || '';

        if (!header || !sectionContent.trim()) {
            continue;
        }

        // Extract title from header (remove leading #s and space)
        const title = header.replace(/^#{1,6}\s+/, '');

        // Process the section content
        const lines = sectionContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        const entry = {
            id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50),
            title,
            category: '',
            keywords: [],
            content: sectionContent.trim()
        };

        // Parse metadata from the lines
        for (const line of lines) {
            if (line.startsWith('**Category:**')) {
                entry.category = line.replace('**Category:**', '').trim();
            } else if (line.startsWith('**Keywords:**')) {
                const keywordsStr = line.replace('**Keywords:**', '').trim();
                entry.keywords = keywordsStr
                    .split(',')
                    .map(k => k.trim().toLowerCase())
                    .filter(Boolean);
            }
        }

        if (entry.title && entry.category) {
            entries.push(entry);
        }
    }

    return entries;
}

const kbPath = path.join(process.cwd(), 'server', 'knowledge base.md');
console.log('Reading file from:', kbPath);
const content = fs.readFileSync(kbPath, 'utf8');
console.log('File length:', content.length);
const entries = parseKnowledgeBase(content);
console.log('Number of entries:', entries.length);
if (entries.length > 0) {
    console.log('First entry:', JSON.stringify(entries[0], null, 2));
} else {
    console.log('First 500 chars of file:');
    console.log(content.substring(0, 500));
}