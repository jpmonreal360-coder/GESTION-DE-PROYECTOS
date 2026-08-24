import { Expense, BatchTable } from '@/types';

export interface OrphanGroup {
  tableId: string;
  count: number;
  totalSum: number;
  types: string[];
  projects: string[];
  minDate: string;
  maxDate: string;
  sampleRows: Expense[];
  expenseIds: string[];
  expenses: Expense[];
}

/**
 * Pure helper function to detect expenses whose tableId does NOT exist in batchTables.
 * Excludes tableId === 'NEW' or undefined/empty strings.
 */
export function findOrphanExpenses(expenses: Expense[], batchTables: BatchTable[]): OrphanGroup[] {
  const tableIdSet = new Set((batchTables || []).map(t => t.id));
  const orphans = (expenses || []).filter(e => e.tableId && e.tableId !== 'NEW' && !tableIdSet.has(e.tableId));

  const groupsMap = new Map<string, Expense[]>();
  for (const exp of orphans) {
    const key = exp.tableId || 'UNKNOWN';
    if (!groupsMap.has(key)) groupsMap.set(key, []);
    groupsMap.get(key)!.push(exp);
  }

  const result: OrphanGroup[] = [];
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

  // Sort groups by count descending
  return result.sort((a, b) => b.count - a.count);
}

/**
 * Pure helper to compute a normalized duplicate fingerprint:
 * projectId|type|concept normalized|amount|category normalized|date
 */
export function getExpenseFingerprint(e: {
  projectId?: string;
  type?: string;
  concept?: string;
  amount?: number;
  category?: string;
  date?: string;
}): string {
  const prj = (e.projectId || '').trim();
  const typ = (e.type || 'EXPENSE').trim().toUpperCase();
  const cnp = (e.concept || '').trim().toLowerCase();
  const amt = Number(e.amount) || 0;
  const cat = (e.category || '').trim().toLowerCase();
  const dat = (e.date || '').trim();
  return `${prj}|${typ}|${cnp}|${amt}|${cat}|${dat}`;
}
