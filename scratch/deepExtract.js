const fs = require('fs');

const transcriptPath = 'C:\\Users\\Edmundo\\.gemini\\antigravity\\brain\\5fbef3ee-151a-4907-bb68-6db3239cd4b3\\.system_generated\\logs\\transcript.jsonl';

const content = fs.readFileSync(transcriptPath, 'utf8');

console.log('Total transcript length:', content.length);

// Search for mentions of BRISARA
const brisaraMatches = [];
let pos = 0;
while ((pos = content.indexOf('BRISARA', pos + 1)) !== -1) {
  const snippet = content.substring(Math.max(0, pos - 200), Math.min(content.length, pos + 500));
  brisaraMatches.push({ pos, snippet });
}

console.log('BRISARA occurrences count:', brisaraMatches.length);

// Print snippets
brisaraMatches.slice(0, 5).forEach((m, idx) => {
  console.log(`\n--- Snippet ${idx + 1} at pos ${m.pos} ---`);
  console.log(m.snippet);
});
