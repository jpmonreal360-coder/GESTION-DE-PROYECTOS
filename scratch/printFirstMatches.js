const fs = require('fs');
const transcriptPath = 'C:\\Users\\Edmundo\\.gemini\\antigravity\\brain\\5fbef3ee-151a-4907-bb68-6db3239cd4b3\\.system_generated\\logs\\transcript.jsonl';
const text = fs.readFileSync(transcriptPath, 'utf8');

const target = 'tbl-103';
let pos = 0;
let idx = 0;
while ((pos = text.indexOf(target, pos + 1)) !== -1) {
  idx++;
  if (idx <= 2) {
    const snippet = text.substring(Math.max(0, pos - 800), Math.min(text.length, pos + 800));
    console.log(`\n=================== MATCH ${idx} AT POS ${pos} ===================`);
    console.log(snippet);
  }
}
