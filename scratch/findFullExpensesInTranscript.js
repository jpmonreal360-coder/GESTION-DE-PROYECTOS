const fs = require('fs');

const transcriptPath = 'C:\\Users\\Edmundo\\.gemini\\antigravity\\brain\\5fbef3ee-151a-4907-bb68-6db3239cd4b3\\.system_generated\\logs\\transcript.jsonl';

const text = fs.readFileSync(transcriptPath, 'utf8');

// Find all matches for "tbl-103" or "tbl-102" or "tbl-1787598124164" or "6886.98" or "BRISARA"
console.log('--- SCANNING TRANSCRIPT FOR REAL DATA SNAPSHOTS ---');

const patterns = ['tbl-103', 'tbl-1787598124164', '6886.98', 'Gastos Desde Mayo', 'BRISARA'];
for (const pat of patterns) {
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(pat, pos + 1)) !== -1) {
    count++;
  }
  console.log(`Pattern "${pat}": ${count} occurrences`);
}

// Find large JSON substrings containing expenses
const expMatches = text.match(/\[\s*\{\s*"id"\s*:\s*"exp-[^\]]+\]/g);
console.log('Expenses array matches found:', expMatches ? expMatches.length : 0);

if (expMatches) {
  expMatches.forEach((m, i) => {
    console.log(`\n--- Array ${i+1} (Length: ${m.length}) ---`);
    console.log(m.substring(0, 300));
  });
}
