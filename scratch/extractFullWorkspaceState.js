const fs = require('fs');
const readline = require('readline');

const transcriptPath = 'C:\\Users\\Edmundo\\.gemini\\antigravity\\brain\\5fbef3ee-151a-4907-bb68-6db3239cd4b3\\.system_generated\\logs\\transcript.jsonl';

async function extract() {
  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let maxExpensesCount = 0;
  let bestSnapshot = null;

  for await (const line of rl) {
    if (line.includes('BRISARA') || line.includes('PLAZA MISTICA') || line.includes('HOTEL ROYAL')) {
      // Find all JSON substrings or objects
      const matches = line.match(/\{"isCustomized":true,[^\}]+\}/g) || line.match(/\{"projects":\[[^\}]+\}/g);
      if (matches) {
        for (const match of matches) {
          try {
            const parsed = JSON.parse(match);
            if (parsed && Array.isArray(parsed.projects)) {
              const expCount = parsed.expenses ? parsed.expenses.length : 0;
              if (expCount > maxExpensesCount) {
                maxExpensesCount = expCount;
                bestSnapshot = parsed;
              }
            }
          } catch (e) {
            // substring regex might be partial, try regex matching expenses
          }
        }
      }
    }
  }

  console.log('Max expenses count found in transcript:', maxExpensesCount);
  if (bestSnapshot) {
    console.log('Best snapshot projects:', bestSnapshot.projects.map(p => p.name));
    console.log('Best snapshot batchTables:', bestSnapshot.batchTables ? bestSnapshot.batchTables.length : 0);
    fs.writeFileSync('C:\\Users\\Edmundo\\Desktop\\GESTION DE PROYECTOS\\scratch\\recoveredSnapshot.json', JSON.stringify(bestSnapshot, null, 2));
    console.log('Saved snapshot to scratch/recoveredSnapshot.json');
  }
}

extract().catch(console.error);
