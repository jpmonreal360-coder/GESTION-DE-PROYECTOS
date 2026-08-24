const fs = require('fs');
const path = require('path');

const rootDir = 'C:\\Users\\Edmundo\\Desktop\\GESTION DE PROYECTOS';

function searchInDir(dir, pattern) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '.git' && entry.name !== 'node_modules' && entry.name !== '.next') {
        searchInDir(fullPath, pattern);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.json') || entry.name.endsWith('.html') || entry.name.endsWith('.md'))) {
      try {
        const text = fs.readFileSync(fullPath, 'utf8');
        if (pattern.test(text)) {
          console.log(`Found match in: ${fullPath}`);
          // Print matching line
          const lines = text.split('\n');
          lines.forEach((line, i) => {
            if (pattern.test(line)) {
              console.log(`  L${i+1}: ${line.trim().substring(0, 150)}`);
            }
          });
        }
      } catch (e) {}
    }
  }
}

console.log('--- SEARCHING FOR PROJECT NAMES IN FILES ---');
searchInDir(rootDir, /BRISARA|PLAZA|HOTEL/i);
