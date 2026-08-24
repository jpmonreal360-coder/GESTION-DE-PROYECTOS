const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const data = await fetchJson('https://gestion-de-proyectos-smoky.vercel.app/api/workspace/rc_ws_main');
  console.log('--- PRODUCTION WORKSPACE API: rc_ws_main ---');
  console.log('workspaceId:', data.workspaceId);
  console.log('updatedAt:', new Date(data.updatedAt).toISOString());
  console.log('isCustomized:', data.isCustomized);
  console.log('Projects count:', data.projects ? data.projects.length : 0);
  console.log('Projects:', data.projects ? data.projects.map(p => `${p.name} (${p.id})`) : []);
  console.log('Expenses count:', data.expenses ? data.expenses.length : 0);
  console.log('BatchTables count:', data.batchTables ? data.batchTables.length : 0);
  console.log('BatchTables:', data.batchTables ? data.batchTables.map(t => `${t.name} (${t.id})`) : []);
}

main().catch(console.error);
