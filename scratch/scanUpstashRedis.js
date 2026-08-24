const https = require('https');

// We can query our own Next.js API endpoint or check all endpoints
async function queryWorkspaceApi(id) {
  return new Promise((resolve) => {
    https.get(`https://gestion-de-proyectos-smoky.vercel.app/api/workspace/${id}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

async function main() {
  console.log('--- SCANNING WORKSPACE ENDPOINTS ---');
  
  const testIds = ['rc_ws_main', 'main', 'default', 'ws_main', 'w_main', 'PRJ-03', 'BRISARA'];
  for (const id of testIds) {
    const res = await queryWorkspaceApi(id);
    console.log(`\nWorkspace ID [${id}]: Status ${res.status}`);
    if (res.data) {
      if (res.data.notFound) {
        console.log('Result: NOT FOUND (Key does not exist in Redis)');
      } else if (res.data.error) {
        console.log('Result ERROR:', res.data.error);
      } else {
        console.log('Result FOUND!');
        console.log('  Projects:', res.data.projects ? res.data.projects.map(p => p.name) : []);
        console.log('  Expenses count:', res.data.expenses ? res.data.expenses.length : 0);
        console.log('  BatchTables count:', res.data.batchTables ? res.data.batchTables.length : 0);
        console.log('  UpdatedAt:', res.data.updatedAt ? new Date(res.data.updatedAt).toISOString() : 'N/A');
      }
    }
  }
}

main().catch(console.error);
