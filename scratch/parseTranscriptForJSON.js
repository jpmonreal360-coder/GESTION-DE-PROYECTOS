const fs = require('fs');
const readline = require('readline');

const transcriptPath = 'C:\\Users\\Edmundo\\.gemini\\antigravity\\brain\\5fbef3ee-151a-4907-bb68-6db3239cd4b3\\.system_generated\\logs\\transcript.jsonl';

async function scanTranscript() {
  const rl = readline.createInterface({
    input: fs.createReadStream(transcriptPath),
    crlfDelay: Infinity
  });

  let lineNum = 0;
  const candidates = [];

  for await (const line of rl) {
    lineNum++;
    // Look for expenses arrays or workspaceState JSON
    if (line.includes('"expenses"') || line.includes('expenses: [')) {
      candidates.push({ lineNum, length: line.length, snippet: line.substring(0, 300) });
    }
  }

  console.log(`Found ${candidates.length} candidate lines containing "expenses".`);
  // Print top 15 candidate lines by length
  candidates.sort((a, b) => b.length - a.length);
  candidates.slice(0, 15).forEach((c, idx) => {
    console.log(`\n--- Candidate ${idx + 1} at line ${c.lineNum} (Length: ${c.length}) ---`);
    console.log(c.snippet);
  });
}

scanTranscript().catch(console.error);
