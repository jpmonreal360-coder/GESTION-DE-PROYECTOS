export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export type ExpenseStatus = 'PAID' | 'PENDING' | 'REJECTED';
export type TransactionType = 'INCOME' | 'EXPENSE';
export type DocType = 'PDF' | 'IMAGE' | 'GOOGLE_SHEETS' | 'CONTRACT' | 'PROPOSAL' | 'SPEC' | 'MINUTES' | 'GUIDE';
export type FileType = 'pdf' | 'image' | 'sheets' | 'link';

export interface Responsible {
  id: string;
  name: string;
  color?: string; // Hexadecimal o clase badge
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
}

export interface BatchTable {
  id: string;
  name: string; // ej: "Ingresos Julio 2026", "Gastos Agosto 2026"
  mode: 'expense' | 'income' | 'task' | 'doc';
  projectId?: string;
  createdAt: string;
  isCollapsed?: boolean;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  color?: string;
  status?: ProjectStatus;
  budget?: number;
  spent?: number;
  totalBudget?: number;
  spentBudget?: number;
  currency?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus | string;
  priority: TaskPriority | string;
  dueDate?: string;
  projectId: string;
  // Legacy string assignee fields preserved for 100% backwards compatibility:
  assignee?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  // New additive fields:
  assigneeIds?: string[];
  position?: number;
  updatedAt?: number;
  tags?: string[];
  tableId?: string;
}

export interface Expense {
  id: string;
  type: TransactionType | string;
  concept: string;
  amount: number;
  currency?: string;
  category: string;
  projectId: string;
  date: string;
  status?: ExpenseStatus | string;
  receiptUrl?: string;
  notes?: string;
  tableId?: string;
}

export interface Document {
  id: string;
  title: string;
  docType?: DocType;
  format?: FileType | string;
  typeLabel?: string;
  fileType?: FileType;
  fileUrl?: string;
  previewUrl?: string;
  icon?: string;
  content?: string;
  description?: string;
  projectId: string;
  parentId?: string | null;
  date?: string;
  updatedAt?: string;
  children?: Document[];
  tableId?: string;
}

export interface WikiDoc {
  id: string;
  title: string;
  projectId?: string;
  updatedAt: string;
  content: string;
}

export interface WorkspaceState {
  isCustomized: boolean;
  projects: Project[];
  expenses: Expense[];
  tasks: Task[];
  documents: Document[];
  wikiDocs: WikiDoc[];
  categories: string[];
  projectCategories: string[];
  batchTables: BatchTable[];
  responsibles?: Responsible[];
  migrationMetadata?: {
    legacyAssigneesMigratedAt?: number;
    migrationVersion?: number;
  };
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  projects: Project[];
}
