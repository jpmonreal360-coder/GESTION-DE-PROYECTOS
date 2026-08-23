const initialExpenses = [
  { id: 'exp-101', concept: 'Vercel', amount: 120, projectId: 'PRJ-01' },
  { id: 'exp-102', concept: 'AWS', amount: 350, projectId: 'PRJ-01' },
  { id: 'exp-103', concept: 'Figma', amount: 45, projectId: 'PRJ-02' },
  { id: 'exp-104', concept: 'GitHub', amount: 20, projectId: 'PRJ-02' }
];

const selectedForDelete = ['exp-102', 'exp-103'];

const updatedExpenses = initialExpenses.filter(e => !selectedForDelete.includes(e.id));

console.log('Original count:', initialExpenses.length);
console.log('Deleted count:', selectedForDelete.length);
console.log('Remaining count:', updatedExpenses.length);
console.log('Remaining items:', updatedExpenses);
