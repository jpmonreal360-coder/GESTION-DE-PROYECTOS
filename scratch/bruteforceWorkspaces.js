const https = require('https');

// Array de posibles identificadores de workspaces que podrían estar guardados en Redis
const possibleIds = [
  'rc_ws_main',
  'ws_rc_ws_main',
  'w_main',
  'ws_main',
  'main',
  'default',
  'brisara',
  'BRISARA',
  'ws_brisara',
  'ws_BRISARA',
  'proyecto_brisara',
  'w_xxxx',
  'ws_w_xxxx',
  'test',
  'demo'
];

async function queryWorkspaceApi(id) {
  return new Promise((resolve) => {
    // Consulta a la API de Next.js en producción (que a su vez consulta Upstash Redis)
    const url = `https://gestion-de-proyectos-smoky.vercel.app/api/workspace/${encodeURIComponent(id)}`;
    
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ id, status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ id, status: res.statusCode, raw: body });
        }
      });
    }).on('error', (err) => resolve({ id, error: err.message }));
  });
}

async function main() {
  console.log('--- BUSCANDO WORKSPACES EN UPSTASH REDIS (vía API Vercel) ---');
  console.log('Debido a que las credenciales directas de UPSTASH no están en el código fuente (se inyectan en Vercel),');
  console.log('este script consulta el endpoint de producción para identificar llaves existentes.\n');

  for (const id of possibleIds) {
    const res = await queryWorkspaceApi(id);
    console.log(`[🔎] Evaluando Workspace ID: "${id}"`);
    if (res.error) {
      console.log(`   ❌ Error de conexión: ${res.error}`);
      continue;
    }

    if (res.status === 200) {
      if (res.data && res.data.notFound) {
        console.log('   🔸 Resultado: NOT FOUND (No existe en Redis)');
      } else {
        console.log('   ✅ Resultado: ¡ENCONTRADO!');
        console.log('   📊 Proyectos:', res.data.projects ? res.data.projects.map(p => p.name).join(', ') : 'Ninguno');
        console.log('   💰 Gastos registrados:', res.data.expenses ? res.data.expenses.length : 0);
        console.log('   🕒 Última actualización:', res.data.updatedAt ? new Date(res.data.updatedAt).toLocaleString() : 'Desconocida');
      }
    } else {
      console.log(`   ⚠️ Respuesta Inesperada: HTTP ${res.status}`);
      if (res.data && res.data.error) {
        console.log(`   📝 Mensaje: ${res.data.error}`);
      }
    }
    console.log('----------------------------------------------------');
  }
}

main().catch(console.error);
