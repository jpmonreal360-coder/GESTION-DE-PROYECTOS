const fs = require('fs');

const transcriptPath = 'C:\\Users\\Edmundo\\.gemini\\antigravity\\brain\\5fbef3ee-151a-4907-bb68-6db3239cd4b3\\.system_generated\\logs\\transcript.jsonl';
const text = fs.readFileSync(transcriptPath, 'utf8');

const targets = ['tbl-103', 'tbl-1787598124164', 'Gastos Desde Mayo'];

for (const target of targets) {
  console.log(`\n=================== OCCURRENCES FOR "${target}" ===================`);
  let pos = 0;
  let idx = 0;
  while ((pos = text.indexOf(target, pos + 1)) !== -1) {
    idx++;
    const snippet = text.substring(Math.max(0, pos - 400), Math.min(text.length, pos + 600));
    console.log(`\n--- Match ${idx} at pos ${pos} ---`);
    console.log(snippet);
  }
}
