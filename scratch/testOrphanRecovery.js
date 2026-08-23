// Test 1: Active table ID normalization
function normalizeTargetTableId(payloadTargetTableId) {
  return (payloadTargetTableId === 'NEW' || !payloadTargetTableId) ? undefined : payloadTargetTableId;
}

console.log('--- TEST 1: Table ID Normalization ---');
console.log('targetTableId="NEW" ->', normalizeTargetTableId('NEW')); // undefined
console.log('targetTableId="" ->', normalizeTargetTableId('')); // undefined
console.log('targetTableId="tbl-101" ->', normalizeTargetTableId('tbl-101')); // tbl-101

// Test 2: Orphan Reassignment Immutability Test
const initialExpenses = [
  { id: 'exp-1', concept: 'PAGO 1', amount: 100, category: 'General', type: 'EXPENSE', projectId: 'PRJ-01', date: '2026-08-22', status: 'PAID', tableId: 'NEW' },
  { id: 'exp-2', concept: 'PAGO 2', amount: 250, category: 'Software', type: 'EXPENSE', projectId: 'PRJ-01', date: '2026-08-22', status: 'PAID', tableId: 'NEW' },
  { id: 'exp-3', concept: 'PAGO OK', amount: 500, category: 'Infra', type: 'EXPENSE', projectId: 'PRJ-02', date: '2026-08-20', status: 'PAID', tableId: 'tbl-101' }
];

const targetTableId = 'tbl-' + Date.now();

const updatedExpenses = initialExpenses.map(e => {
  if (e.tableId === 'NEW') {
    return { ...e, tableId: targetTableId };
  }
  return e;
});

console.log('\n--- TEST 2: Orphan Reassignment Immutability ---');
console.log('Target Real Table ID:', targetTableId);
console.log('Orphan count before:', initialExpenses.filter(e => e.tableId === 'NEW').length);
console.log('Orphan count after:', updatedExpenses.filter(e => e.tableId === 'NEW').length);
console.log('Reassigned item 1:', updatedExpenses[0]);

// Verify property preservation
const item1Before = initialExpenses[0];
const item1After = updatedExpenses[0];

const matchesAllPropsExceptTableId = 
  item1Before.id === item1After.id &&
  item1Before.concept === item1After.concept &&
  item1Before.amount === item1After.amount &&
  item1Before.category === item1After.category &&
  item1Before.type === item1After.type &&
  item1Before.projectId === item1After.projectId &&
  item1Before.date === item1After.date &&
  item1Before.status === item1After.status &&
  item1After.tableId === targetTableId;

console.log('Property Integrity Check (All props preserved except tableId):', matchesAllPropsExceptTableId ? '✅ PASS' : '❌ FAIL');
console.log('Existing table record (exp-3) untouched:', updatedExpenses[2].tableId === 'tbl-101' ? '✅ PASS' : '❌ FAIL');
