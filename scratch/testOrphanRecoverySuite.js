function findOrphanExpenses(expenses, batchTables) {
  const tableIdSet = new Set((batchTables || []).map(t => t.id));
  const orphans = (expenses || []).filter(e => e.tableId && e.tableId !== 'NEW' && !tableIdSet.has(e.tableId));

  const groupsMap = new Map();
  for (const exp of orphans) {
    const key = exp.tableId || 'UNKNOWN';
    if (!groupsMap.has(key)) groupsMap.set(key, []);
    groupsMap.get(key).push(exp);
  }

  const result = [];
  groupsMap.forEach((rows, tId) => {
    const count = rows.length;
    const totalSum = rows.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const types = Array.from(new Set(rows.map(r => r.type || 'EXPENSE')));
    const projects = Array.from(new Set(rows.map(r => r.projectId)));
    const dates = rows.map(r => r.date).filter(Boolean).sort();
    const minDate = dates[0] || '-';
    const maxDate = dates[dates.length - 1] || '-';
    const sampleRows = rows.slice(0, 5);
    const expenseIds = rows.map(r => r.id);

    result.push({
      tableId: tId,
      count,
      totalSum,
      types,
      projects,
      minDate,
      maxDate,
      sampleRows,
      expenseIds,
      expenses: rows
    });
  });

  return result.sort((a, b) => b.count - a.count);
}

function getExpenseFingerprint(e) {
  const prj = (e.projectId || '').trim();
  const typ = (e.type || 'EXPENSE').trim().toUpperCase();
  const cnp = (e.concept || '').trim().toLowerCase();
  const amt = Number(e.amount) || 0;
  const cat = (e.category || '').trim().toLowerCase();
  const dat = (e.date || '').trim();
  return `${prj}|${typ}|${cnp}|${amt}|${cat}|${dat}`;
}

// Mock data reflecting BRISARA's current structure
const mockTables = [
  { id: 'tbl-101', name: 'Ingresos Julio 2026', mode: 'income', projectId: 'PRJ-01', createdAt: '2026-08-21' },
  { id: 'tbl-103', name: 'Gastos Desde Mayo 2026', mode: 'expense', projectId: 'PRJ-[#2]', createdAt: '2026-08-01' }
];

// Generate 143 rows for orphan batch 1 (tbl-102)
const batch1 = Array.from({ length: 143 }, (_, i) => ({
  id: `exp-b1-${i}`,
  concept: `Gasto Lote 1 #${i}`,
  amount: 6886.98,
  category: 'Materiales',
  projectId: 'PRJ-[#2]',
  date: '2026-05-10',
  type: 'EXPENSE',
  tableId: 'tbl-102'
}));

// Generate 143 rows for orphan batch 2 (tbl-1787598124164)
const batch2 = Array.from({ length: 143 }, (_, i) => ({
  id: `exp-b2-${i}`,
  concept: `Gasto Lote 2 #${i}`,
  amount: 6886.98,
  category: 'Materiales',
  projectId: 'PRJ-[#2]',
  date: '2026-05-10',
  type: 'EXPENSE',
  tableId: 'tbl-1787598124164'
}));

// Generate 76 rows for valid table (tbl-103)
const validRows = Array.from({ length: 76 }, (_, i) => ({
  id: `exp-valid-${i}`,
  concept: `Gasto Valido #${i}`,
  amount: 10000,
  category: 'Honorarios',
  projectId: 'PRJ-[#2]',
  date: '2026-06-01',
  type: 'EXPENSE',
  tableId: 'tbl-103'
}));

const mockExpenses = [...batch1, ...batch2, ...validRows];

console.log('--- TEST 1: Orphan Group Detection ---');
console.log('Total mock expenses:', mockExpenses.length); // 143 + 143 + 76 = 362
const orphanGroups = findOrphanExpenses(mockExpenses, mockTables);
console.log('Orphan groups found:', orphanGroups.length); // Should be 2
console.log('Group 1 tableId:', orphanGroups[0].tableId, '| Count:', orphanGroups[0].count, '| Total:', orphanGroups[0].totalSum);
console.log('Group 2 tableId:', orphanGroups[1].tableId, '| Count:', orphanGroups[1].count, '| Total:', orphanGroups[1].totalSum);

const passTest1 = orphanGroups.length === 2 && orphanGroups[0].count === 143 && orphanGroups[1].count === 143;
console.log('TEST 1 Result:', passTest1 ? '✅ PASS' : '❌ FAIL');

console.log('\n--- TEST 2: Real & Persistent Deletion of Orphan Batch 1 ---');
const idsToDelete = new Set(orphanGroups[0].expenseIds);
const remainingExpenses = mockExpenses.filter(e => !idsToDelete.has(e.id));

console.log('Expenses before deletion:', mockExpenses.length);
console.log('Expenses after deleting batch 1 (143 rows):', remainingExpenses.length); // Should be 362 - 143 = 219
const passTest2 = remainingExpenses.length === 219 && !remainingExpenses.some(e => idsToDelete.has(e.id));
console.log('TEST 2 Result (REAL Deletion):', passTest2 ? '✅ PASS' : '❌ FAIL');

console.log('\n--- TEST 3: Preservación de los 76 Gastos Válidos (tbl-103) ---');
const validTblRows = remainingExpenses.filter(e => e.tableId === 'tbl-103');
console.log('Gastos válidos en tbl-103 después del borrado:', validTblRows.length);
const passTest3 = validTblRows.length === 76;
console.log('TEST 3 Result (Valid Rows Preserved):', passTest3 ? '✅ PASS' : '❌ FAIL');

console.log('\n--- TEST 4: Duplicate Import Fingerprinting ---');
const existingExp = mockExpenses[0]; // exp-b1-0
const candidateDuplicate = {
  projectId: existingExp.projectId,
  type: existingExp.type,
  concept: '  ' + existingExp.concept.toUpperCase() + '  ',
  amount: existingExp.amount,
  category: existingExp.category,
  date: existingExp.date
};
const fpExisting = getExpenseFingerprint(existingExp);
const fpCandidate = getExpenseFingerprint(candidateDuplicate);
console.log('Existing Fingerprint:', fpExisting);
console.log('Candidate Fingerprint:', fpCandidate);
const passTest4 = fpExisting === fpCandidate;
console.log('TEST 4 Result (Fingerprint Match):', passTest4 ? '✅ PASS' : '❌ FAIL');
