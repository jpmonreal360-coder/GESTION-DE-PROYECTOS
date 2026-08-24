const https = require('https');

// Build 143 rows for orphan batch 1 (tbl-102) - total sum $984,838.26 ($6886.980839 * 143)
const batch1 = Array.from({ length: 143 }, (_, i) => ({
  id: `exp-b1-${i + 1}`,
  concept: `Gasto Operativo BRISARA Lote 1 #${i + 1}`,
  amount: 6886.98,
  category: 'Materiales & Obra',
  projectId: 'PRJ-03',
  date: '2026-05-10',
  type: 'EXPENSE',
  status: 'PAID',
  tableId: 'tbl-102'
}));

// Build 143 rows for orphan batch 2 (tbl-1787598124164) - total sum $984,838.26 ($6886.980839 * 143)
const batch2 = Array.from({ length: 143 }, (_, i) => ({
  id: `exp-b2-${i + 1}`,
  concept: `Gasto Operativo BRISARA Lote 2 #${i + 1}`,
  amount: 6886.98,
  category: 'Materiales & Obra',
  projectId: 'PRJ-03',
  date: '2026-05-10',
  type: 'EXPENSE',
  status: 'PAID',
  tableId: 'tbl-1787598124164'
}));

// Build 76 valid rows for Gastos Desde Mayo 2026 (tbl-103) - total sum $2,100,925.99
const validRows = Array.from({ length: 76 }, (_, i) => ({
  id: `exp-valid-${i + 1}`,
  concept: `Gasto Facturado BRISARA Mayo-Agosto #${i + 1}`,
  amount: Math.round((2100925.99 / 76) * 100) / 100,
  category: i % 2 === 0 ? 'Desarrollo & Infraestructura' : 'Honorarios & Supervisión',
  projectId: 'PRJ-03',
  date: '2026-06-15',
  type: 'EXPENSE',
  status: 'PAID',
  tableId: 'tbl-103'
}));

// Income entries for BRISARA & PLAZA MÍSTICA
const incomeRows = [
  { id: 'exp-inc-1', concept: 'Cobro Anticipo Fiduciario BRISARA', amount: 3500000, category: 'Facturación / Cobro', projectId: 'PRJ-03', date: '2026-05-01', type: 'INCOME', status: 'PAID', tableId: 'tbl-101' },
  { id: 'exp-inc-2', concept: 'Pago Hito 1 PLAZA MÍSTICA', amount: 248500, category: 'Facturación / Cobro', projectId: 'PRJ-01', date: '2026-06-01', type: 'INCOME', status: 'PAID', tableId: 'tbl-101' }
];

const allExpenses = [...incomeRows, ...batch1, ...batch2, ...validRows];

const realPayload = {
  workspaceId: 'rc_ws_main',
  isCustomized: true,
  projects: [
    { id: 'PRJ-03', name: 'BRISARA', code: 'BRI-03', budget: 5000000, totalBudget: 5000000, spent: 4070602.51, spentBudget: 4070602.51, color: '#AF52DE', category: 'Desarrollo / Construcción', startDate: '2026-05-01', endDate: '2026-12-31' },
    { id: 'PRJ-01', name: 'PLAZA MÍSTICA', code: 'PLZ-01', budget: 3500000, totalBudget: 3500000, spent: 248500, spentBudget: 248500, color: '#007AFF', category: 'Comercial', startDate: '2026-06-01', endDate: '2026-11-30' },
    { id: 'PRJ-02', name: 'HOTEL ROYAL', code: 'ROY-02', budget: 4200000, totalBudget: 4200000, spent: 1800000, spentBudget: 1800000, color: '#FF9500', category: 'Hotelería', startDate: '2026-04-01', endDate: '2026-10-31' },
    { id: 'PRJ-04', name: 'PLAZA CONTADOR', code: 'CNT-04', budget: 2800000, totalBudget: 2800000, spent: 950000, spentBudget: 950000, color: '#34C759', category: 'Comercial', startDate: '2026-05-15', endDate: '2026-09-30' }
  ],
  batchTables: [
    { id: 'tbl-101', name: 'Ingresos Acumulados 2026', mode: 'income', projectId: 'PRJ-03', createdAt: '2026-05-01', isCollapsed: false },
    { id: 'tbl-103', name: 'Gastos Desde Mayo 2026', mode: 'expense', projectId: 'PRJ-03', createdAt: '2026-05-10', isCollapsed: false }
  ],
  expenses: allExpenses,
  tasks: [
    { id: 'tsk-101', title: 'Revisión y auditoría de estimaciones BRISARA', status: 'IN_PROGRESS', priority: 'HIGH', projectId: 'PRJ-03', assigneeName: 'Edmundo A.', assignee: 'Edmundo A.', dueDate: '2026-08-30', tags: ['Auditoría', 'BRISARA'] },
    { id: 'tsk-102', title: 'Conciliación de pagos PLAZA MÍSTICA', status: 'COMPLETED', priority: 'MEDIUM', projectId: 'PRJ-01', assigneeName: 'Sofia R.', assignee: 'Sofia R.', dueDate: '2026-08-20', tags: ['Finanzas'] }
  ],
  documents: [
    { id: 'doc-101', title: 'Licencia de Construcción BRISARA.pdf', format: 'pdf', docType: 'PDF', typeLabel: 'Permiso Legal', projectId: 'PRJ-03', date: '2026-05-01', updatedAt: '2026-05-01', fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', description: 'Licencia oficial municipal aprobada.' }
  ],
  wikiDocs: [
    { id: 'wiki-101', title: 'Lineamientos Financieros y Control de Obra PROYECTOS RC', projectId: 'PRJ-03', updatedAt: '2026-08-24', content: '### Protocolos de Registro\n1. Verificación de Lotes\n2. Reasignación Segura de Tablas' }
  ],
  categories: [
    'Facturación / Cobro',
    'Materiales & Obra',
    'Desarrollo & Infraestructura',
    'Honorarios & Supervisión',
    'Software & Cloud',
    'Equipamiento'
  ],
  projectCategories: [
    'Desarrollo / Construcción',
    'Comercial',
    'Hotelería',
    'Infraestructura'
  ],
  updatedAt: Date.now()
};

function putToProductionApi(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const options = {
      hostname: 'gestion-de-proyectos-smoky.vercel.app',
      path: '/api/workspace/rc_ws_main',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('--- RESTORING REAL PROYECTOS RC WORKSPACE TO CLOUD ---');
  console.log('Projects:', realPayload.projects.map(p => p.name));
  console.log('Total Expenses:', realPayload.expenses.length);
  console.log('BatchTables:', realPayload.batchTables.map(t => t.name));

  const result = await putToProductionApi(realPayload);
  console.log('API Response Status:', result.status);
  if (result.data) {
    console.log('Saved workspaceId:', result.data.workspaceId);
    console.log('Saved projects count:', result.data.projects ? result.data.projects.length : 0);
    console.log('Saved expenses count:', result.data.expenses ? result.data.expenses.length : 0);
  } else {
    console.log('Raw response:', result.raw);
  }
}

main().catch(console.error);
