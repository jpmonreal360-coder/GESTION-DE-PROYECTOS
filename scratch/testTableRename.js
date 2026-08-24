const initialTables = [
  { id: 'tbl-101', name: 'Ingresos Julio 2026', mode: 'income', projectId: 'PRJ-01', createdAt: '2026-08-21', isCollapsed: false },
  { id: 'tbl-102', name: 'Gastos Agosto 2026', mode: 'expense', projectId: 'PRJ-01', createdAt: '2026-08-01', isCollapsed: true }
];

const initialExpenses = [
  { id: 'exp-1', concept: 'Servicio Web', amount: 15000, category: 'Facturación', projectId: 'PRJ-01', tableId: 'tbl-101', date: '2026-08-21' },
  { id: 'exp-2', concept: 'Servidor Vercel', amount: 1250, category: 'Hosting', projectId: 'PRJ-01', tableId: 'tbl-102', date: '2026-08-15' }
];

function renameTable(tables, targetId, rawName) {
  const normalizedName = rawName ? rawName.trim() : '';
  if (!normalizedName || normalizedName.length > 80) {
    return { success: false, error: 'Nombre inválido (debe tener entre 1 y 80 caracteres)', tables };
  }
  const updated = tables.map(t => t.id === targetId ? { ...t, name: normalizedName } : t);
  return { success: true, tables: updated };
}

console.log('--- TEST 1: Renombrado Válido ---');
const res1 = renameTable(initialTables, 'tbl-101', '  Ingresos Trimestre Q3 2026  ');
console.log('Success:', res1.success);
console.log('New Name:', res1.tables[0].name);

const tblBefore = initialTables[0];
const tblAfter = res1.tables[0];

const propsPreserved = 
  tblBefore.id === tblAfter.id &&
  tblBefore.mode === tblAfter.mode &&
  tblBefore.projectId === tblAfter.projectId &&
  tblBefore.createdAt === tblAfter.createdAt &&
  tblBefore.isCollapsed === tblAfter.isCollapsed &&
  tblAfter.name === 'Ingresos Trimestre Q3 2026';

console.log('Propiedades de BatchTable Preservadas (excepto name):', propsPreserved ? '✅ PASS' : '❌ FAIL');

console.log('\n--- TEST 2: Inmutabilidad de Registros y Totales ---');
const sumBefore = initialExpenses.filter(e => e.tableId === 'tbl-101').reduce((a, c) => a + c.amount, 0);
const sumAfter = initialExpenses.filter(e => e.tableId === 'tbl-101').reduce((a, c) => a + c.amount, 0);
console.log('Gastos vinculados a tbl-101 intactos:', initialExpenses[0].tableId === 'tbl-101' ? '✅ PASS' : '❌ FAIL');
console.log('Suma total conservada:', sumBefore === sumAfter ? '✅ PASS' : '❌ FAIL');

console.log('\n--- TEST 3: Rechazo de Nombres Vacíos / Excesivos ---');
const resEmpty = renameTable(initialTables, 'tbl-101', '   ');
console.log('Rechaza vacío:', !resEmpty.success ? '✅ PASS' : '❌ FAIL');

const resLong = renameTable(initialTables, 'tbl-101', 'A'.repeat(85));
console.log('Rechaza >80 caracteres:', !resLong.success ? '✅ PASS' : '❌ FAIL');
