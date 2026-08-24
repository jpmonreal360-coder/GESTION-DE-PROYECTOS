const https = require('https');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
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
  console.log('--- CHECKING HISTORICAL BACKEND STORAGE ---');
  
  const fbRes = await fetchJson('https://proyectos-rc-default-rtdb.firebaseio.com/workspaces/rc_ws_main.json');
  console.log('Firebase RTDB rc_ws_main status:', fbRes.status);
  if (fbRes.data) {
    console.log('Firebase Projects:', fbRes.data.projects ? fbRes.data.projects.map(p => p.name) : []);
    console.log('Firebase Expenses count:', fbRes.data.expenses ? fbRes.data.expenses.length : 0);
    console.log('Firebase BatchTables count:', fbRes.data.batchTables ? fbRes.data.batchTables.length : 0);
  }

  const jbRes = await fetchJson('https://api.jsonbin.io/v3/b/66c421e3acd3cb34a8764021');
  console.log('JSONBin status:', jbRes.status);
  if (jbRes.data && jbRes.data.record) {
    const rec = jbRes.data.record;
    console.log('JSONBin Projects:', rec.projects ? rec.projects.map(p => p.name) : []);
    console.log('JSONBin Expenses count:', rec.expenses ? rec.expenses.length : 0);
  }
}

main().catch(console.error);
