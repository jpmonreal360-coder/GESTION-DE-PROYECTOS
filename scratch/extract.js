const fs = require('fs');

const transcriptPath = 'C:\\Users\\Edmundo\\.gemini\\antigravity\\brain\\5fbef3ee-151a-4907-bb68-6db3239cd4b3\\.system_generated\\logs\\transcript.jsonl';
const outPath = 'C:\\Users\\Edmundo\\Desktop\\GESTION DE PROYECTOS\\scratch\\found_payloads.json';

try {
  const content = fs.readFileSync(transcriptPath, 'utf8');
  const lines = content.split('\n');
  const results = [];
  
  for (const line of lines) {
    if (line.includes('workspaceState') && line.includes('BRISARA') && line.includes('HOTEL ROYAL')) {
      results.push(JSON.parse(line));
    }
  }
  
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log('Saved to found_payloads.json. Count:', results.length);
} catch (e) {
  console.error(e);
}
