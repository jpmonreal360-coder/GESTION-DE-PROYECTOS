'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { OverviewDashboard } from '@/components/dashboard/OverviewDashboard';
import { ExpenseTracker } from '@/components/expenses/ExpenseTracker';
import { TaskManager } from '@/components/tasks/TaskManager';
import { ProjectDocuments } from '@/components/documents/ProjectDocuments';
import { KnowledgeBase } from '@/components/wiki/KnowledgeBase';
import { SpotlightModal } from '@/components/spotlight/SpotlightModal';
import { ProjectModal } from '@/components/modals/ProjectModal';
import { ActionModal } from '@/components/modals/ActionModal';
import { BatchEntryModal, BatchMode } from '@/components/modals/BatchEntryModal';
import { ImageLightboxModal } from '@/components/modals/ImageLightboxModal';
import { ResponsibleManagerModal } from '@/components/modals/ResponsibleManagerModal';
import { LegacyMigrationModal } from '@/components/modals/LegacyMigrationModal';
import { Project, Expense, Task, Document, WikiDoc, BatchTable, Responsible, TaskStatus } from '@/types';
import { realtimeSync, SyncPayload, SaveStatus, urlSafeEncodeObj, urlSafeDecodeStr } from '@/lib/firebaseSync';
import { X, Copy, CheckCircle, AlertTriangle, RefreshCw, Download, Cloud } from 'lucide-react';

interface WorkspaceState {
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

// Module-level stable constants
const DEFAULT_PROJECTS: Project[] = [
  { id: 'PRJ-03', name: 'BRISARA', code: 'BRI-03', budget: 5000000, totalBudget: 5000000, spent: 4070602.51, spentBudget: 4070602.51, color: '#AF52DE', category: 'Desarrollo / Construcción', startDate: '2026-05-01', endDate: '2026-12-31' },
  { id: 'PRJ-01', name: 'PLAZA MÍSTICA', code: 'PLZ-01', budget: 3500000, totalBudget: 3500000, spent: 248500, spentBudget: 248500, color: '#007AFF', category: 'Comercial', startDate: '2026-06-01', endDate: '2026-11-30' },
  { id: 'PRJ-02', name: 'HOTEL ROYAL', code: 'ROY-02', budget: 4200000, totalBudget: 4200000, spent: 1800000, spentBudget: 1800000, color: '#FF9500', category: 'Hotelería', startDate: '2026-04-01', endDate: '2026-10-31' },
  { id: 'PRJ-04', name: 'PLAZA CONTADOR', code: 'CNT-04', budget: 2800000, totalBudget: 2800000, spent: 950000, spentBudget: 950000, color: '#34C759', category: 'Comercial', startDate: '2026-05-15', endDate: '2026-09-30' }
];

const DEFAULT_BATCH_TABLES: BatchTable[] = [
  { id: 'tbl-101', name: 'Ingresos Acumulados 2026', mode: 'income', projectId: 'PRJ-03', createdAt: '2026-05-01', isCollapsed: false },
  { id: 'tbl-103', name: 'Gastos Desde Mayo 2026', mode: 'expense', projectId: 'PRJ-03', createdAt: '2026-05-10', isCollapsed: false },
];

const DEFAULT_EXPENSES: Expense[] = [
  { id: 'exp-inc-1', type: 'INCOME', concept: 'Cobro Anticipo Fiduciario BRISARA', amount: 3500000, category: 'Facturación / Cobro', projectId: 'PRJ-03', date: '2026-05-01', status: 'PAID', tableId: 'tbl-101' },
  { id: 'exp-inc-2', type: 'INCOME', concept: 'Pago Hito 1 PLAZA MÍSTICA', amount: 248500, category: 'Facturación / Cobro', projectId: 'PRJ-01', date: '2026-06-01', status: 'PAID', tableId: 'tbl-101' },
];

const DEFAULT_TASKS: Task[] = [
  { id: 'tsk-1', title: 'Diseñar componentes esmerilados (Glassmorphism)', status: 'IN_PROGRESS', priority: 'HIGH', projectId: 'PRJ-01', assigneeName: 'Edmundo A.', assignee: 'Edmundo A.', dueDate: '2026-08-25', tags: ['UI/UX', 'Apple'] },
  { id: 'tsk-2', title: 'Implementar atajos de teclado Cmd+K para Spotlight', status: 'COMPLETED', priority: 'MEDIUM', projectId: 'PRJ-02', assigneeName: 'Sofia R.', assignee: 'Sofia R.', dueDate: '2026-08-18', tags: ['Frontend'] }
];

const DEFAULT_DOCUMENTS: Document[] = [
  {
    id: 'pdoc-1',
    title: 'Contrato Marco de Desarrollo & NDA v1.2',
    format: 'pdf',
    docType: 'PDF',
    typeLabel: 'Contrato PDF',
    projectId: 'PRJ-01',
    date: '2026-08-01',
    updatedAt: '2026-08-01',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Documento legal en formato PDF firmado con acuerdo de confidencialidad.'
  },
  {
    id: 'pdoc-2',
    title: 'Foto / Captura de Maqueta UI Aprobada',
    format: 'image',
    docType: 'IMAGE',
    typeLabel: 'Foto / Imagen',
    projectId: 'PRJ-01',
    date: '2026-08-12',
    updatedAt: '2026-08-12',
    previewUrl: 'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=800&auto=format&fit=crop&q=80',
    fileUrl: 'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=1600&auto=format&fit=crop&q=80',
    description: 'Fotografía / Render en alta resolución del diseño UI/UX validado por el cliente.'
  }
];

const DEFAULT_WIKI_DOCS: WikiDoc[] = [
  {
    id: 'doc-1',
    title: 'Guía de Estilo UI/UX - Apple Human Interface Guidelines',
    projectId: 'PRJ-01',
    updatedAt: '2026-08-19',
    content: '### Principios de Diseño\n1. Translucidez y Vidrio Esmerilado\n2. Jerarquía Tipográfica'
  }
];

const DEFAULT_CATEGORIES = [
  'Facturación / Cobro',
  'Software & Cloud',
  'Diseño UI/UX',
  'Desarrollo Frontend/Backend',
  'Infraestructura & Server',
  'Marketing & Ads'
];

const DEFAULT_PROJECT_CATEGORIES = [
  'Mobile App',
  'Web App',
  'Design',
  'Infrastructure',
  'Marketing'
];

export default function Home() {
  const [currentView, setCurrentView] = useState<string>('expenses');
  const [activeProjectFilter, setActiveProjectFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Mobile Drawer State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Control state and refs for strict hydration
  const [hydrated, setHydrated] = useState<boolean>(false);
  const skipNextCloudSave = useRef<boolean>(true);
  const lastRemoteTimestamp = useRef<number>(0);
  const saveQueue = useRef<Promise<any>>(Promise.resolve(undefined));

  // Modal States
  const [isSpotlightOpen, setIsSpotlightOpen] = useState<boolean>(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false);
  const [editType, setEditType] = useState<'expense' | 'task' | 'doc' | null>(null);
  const [editItem, setEditItem] = useState<any>(null);

  // Batch Entry Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [batchInitialMode, setBatchInitialMode] = useState<BatchMode>('expense');
  const [batchTargetTableId, setBatchTargetTableId] = useState<string>('');

  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [lightboxDoc, setLightboxDoc] = useState<Document | null>(null);

  const [isResponsibleManagerOpen, setIsResponsibleManagerOpen] = useState<boolean>(false);
  const [isLegacyMigrationOpen, setIsLegacyMigrationOpen] = useState<boolean>(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareableUrl, setShareableUrl] = useState<string>('');
  const [readOnlyShareableUrl, setReadOnlyShareableUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isReadOnlyCopied, setIsReadOnlyCopied] = useState<boolean>(false);
  const [isReadOnlyMode, setIsReadOnlyMode] = useState<boolean>(false);

  const resolveDefaultWorkspace = () => {
    const isPreviewOrTest =
      process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' ||
      process.env.NODE_ENV === 'test' ||
      (typeof window !== 'undefined' && (window.location.host.includes('-test') || window.location.hash.includes('rc_ws_test')));

    const defaultWs = isPreviewOrTest ? 'rc_ws_test' : 'rc_ws_main';

    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;

      let parsedWs = '';
      if (path.startsWith('/w/')) {
        parsedWs = path.split('/w/')[1].split('/')[0];
      } else if (hash.includes('w=')) {
        parsedWs = hash.split('w=')[1].split('&')[0];
      } else if (search.includes('w=')) {
        const params = new URLSearchParams(search);
        parsedWs = params.get('w') || '';
      }

      if (parsedWs) {
        if (isPreviewOrTest && (parsedWs === 'rc_ws_main' || parsedWs === 'ws_rc_ws_main')) {
          return 'rc_ws_test';
        }
        return parsedWs;
      }
    }
    return defaultWs;
  };

  const [workspaceId, setWorkspaceId] = useState<string>(resolveDefaultWorkspace);
  const [conflictDetails, setConflictDetails] = useState<any>(null);

  // Single Unified Workspace State
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>({
    isCustomized: false,
    projects: DEFAULT_PROJECTS,
    expenses: DEFAULT_EXPENSES,
    tasks: DEFAULT_TASKS,
    documents: DEFAULT_DOCUMENTS,
    wikiDocs: DEFAULT_WIKI_DOCS,
    categories: DEFAULT_CATEGORIES,
    projectCategories: DEFAULT_PROJECT_CATEGORIES,
    batchTables: DEFAULT_BATCH_TABLES,
    responsibles: []
  });

  // Serialized Save Queue to prevent concurrent PUT requests
  const queueSave = useCallback((snapshot: Omit<SyncPayload, 'workspaceId' | 'updatedAt'>) => {
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => realtimeSync.saveToCloud(snapshot));

    return saveQueue.current;
  }, []);

  // Stable function to apply workspace state without triggering an auto-save
  const applyWorkspaceState = useCallback((data: any) => {
    skipNextCloudSave.current = true;
    setWorkspaceState({
      isCustomized: true,
      projects: Array.isArray(data.projects) ? data.projects : [],
      expenses: Array.isArray(data.expenses) ? data.expenses : [],
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      documents: Array.isArray(data.documents) ? data.documents : [],
      wikiDocs: Array.isArray(data.wikiDocs) ? data.wikiDocs : [],
      categories: Array.isArray(data.categories) ? data.categories : DEFAULT_CATEGORIES,
      projectCategories: Array.isArray(data.projectCategories) ? data.projectCategories : DEFAULT_PROJECT_CATEGORIES,
      batchTables: Array.isArray(data.batchTables) ? data.batchTables : DEFAULT_BATCH_TABLES,
      responsibles: Array.isArray(data.responsibles) ? data.responsibles : [],
      migrationMetadata: data.migrationMetadata
    });
    const ts = Number(data.updatedAt ?? 0);
    lastRemoteTimestamp.current = ts;
    realtimeSync.setLastRemoteTimestamp(ts);
  }, []);

  // Stable fallback function with 0 dependencies outside scope
  const loadLocalFallbackOrEmptyState = useCallback(() => {
    skipNextCloudSave.current = true;
    const savedCustomized = localStorage.getItem('rc_is_customized');
    if (savedCustomized === 'true') {
      const savedProjects = localStorage.getItem('rc_projects');
      const savedExpenses = localStorage.getItem('rc_expenses');
      const savedTasks = localStorage.getItem('rc_tasks');
      const savedDocs = localStorage.getItem('rc_docs');
      const savedWiki = localStorage.getItem('rc_wiki');
      const savedCategories = localStorage.getItem('rc_categories');
      const savedPrjCat = localStorage.getItem('rc_prj_categories');
      const savedBatchTables = localStorage.getItem('rc_batch_tables');

      setWorkspaceState({
        isCustomized: true,
        projects: savedProjects ? JSON.parse(savedProjects) : DEFAULT_PROJECTS,
        expenses: savedExpenses ? JSON.parse(savedExpenses) : DEFAULT_EXPENSES,
        tasks: savedTasks ? JSON.parse(savedTasks) : DEFAULT_TASKS,
        documents: savedDocs ? JSON.parse(savedDocs) : DEFAULT_DOCUMENTS,
        wikiDocs: savedWiki ? JSON.parse(savedWiki) : DEFAULT_WIKI_DOCS,
        categories: savedCategories ? JSON.parse(savedCategories) : DEFAULT_CATEGORIES,
        projectCategories: savedPrjCat ? JSON.parse(savedPrjCat) : DEFAULT_PROJECT_CATEGORIES,
        batchTables: savedBatchTables ? JSON.parse(savedBatchTables) : DEFAULT_BATCH_TABLES
      });
    } else {
      setWorkspaceState({
        isCustomized: false,
        projects: DEFAULT_PROJECTS,
        expenses: DEFAULT_EXPENSES,
        tasks: DEFAULT_TASKS,
        documents: DEFAULT_DOCUMENTS,
        wikiDocs: DEFAULT_WIKI_DOCS,
        categories: DEFAULT_CATEGORIES,
        projectCategories: DEFAULT_PROJECT_CATEGORIES,
        batchTables: DEFAULT_BATCH_TABLES
      });
    }
  }, []);

  // Subscribe to save status updates
  useEffect(() => {
    realtimeSync.onStatusChange((status, conflict) => {
      setSaveStatus(status);
      if (conflict) {
        setConflictDetails(conflict);
      }
    });
  }, []);

  // Export local state JSON backup handler
  const handleExportBackupJson = () => {
    const backupObj = {
      workspaceId,
      revision: realtimeSync.getRevision(),
      updatedAt: Date.now(),
      state: workspaceState
    };
    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rc_ws_${workspaceId}_rev${realtimeSync.getRevision()}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('📥 Snapshot exportado como archivo JSON.');
  };

  // Single asynchronous bootstrap useEffect on mount (CLOUD-FIRST)
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      let wsId = resolveDefaultWorkspace();
      let stateFromUrl: any = null;

      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const hash = window.location.hash;
        const search = window.location.search;

        if (path.startsWith('/w/')) {
          const slug = path.split('/w/')[1].split('/')[0];
          if (slug) wsId = slug;
        } else if (hash.includes('state=')) {
          try {
            const encoded = hash.split('state=')[1].split('&')[0];
            stateFromUrl = urlSafeDecodeStr(encoded);
            if (stateFromUrl?.workspaceId) wsId = stateFromUrl.workspaceId;
          } catch (e) {
            console.warn('Error al parsear stateFromUrl:', e);
          }
        } else if (hash.includes('w=')) {
          wsId = hash.split('w=')[1].split('&')[0];
        } else if (search.includes('w=')) {
          const params = new URLSearchParams(search);
          wsId = params.get('w') || resolveDefaultWorkspace();
        }

        if (search.includes('mode=readonly') || search.includes('readonly=true') || hash.includes('mode=readonly') || hash.includes('readonly=true')) {
          setIsReadOnlyMode(true);
          setSaveStatus('offline-readonly');
        }
      }

      const isPreviewOrTest =
        process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' ||
        process.env.NODE_ENV === 'test' ||
        (typeof window !== 'undefined' && (window.location.host.includes('-test') || window.location.hash.includes('rc_ws_test')));

      if (isPreviewOrTest && (wsId === 'rc_ws_main' || wsId === 'ws_rc_ws_main')) {
        wsId = 'rc_ws_test';
      }

      setWorkspaceId(wsId);
      realtimeSync.setWorkspaceId(wsId);

      try {
        if (stateFromUrl) {
          applyWorkspaceState(stateFromUrl);
          await queueSave(stateFromUrl);
        } else {
          const remote = await realtimeSync.fetchFromCloud();

          if (remote && Array.isArray(remote.projects)) {
            applyWorkspaceState(remote);
          } else {
            // NO PUT DEFAULTS ON FAILURE: strictly load local fallback without triggering cloud write
            skipNextCloudSave.current = true;
            loadLocalFallbackOrEmptyState();
          }
        }
      } catch (error) {
        console.error("Error al hidratar el workspace", error);
        skipNextCloudSave.current = true;
        loadLocalFallbackOrEmptyState();
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void bootstrap();
    return () => { cancelled = true; };
  }, [applyWorkspaceState, loadLocalFallbackOrEmptyState, queueSave]);

  // Centralized Automatic Persistence Effect (BLOCKED ON OFFLINE/CONFLICT)
  useEffect(() => {
    if (!hydrated || saveStatus === 'offline-readonly' || saveStatus === 'conflict') return;

    localStorage.setItem('rc_is_customized', 'true');
    localStorage.setItem('rc_projects', JSON.stringify(workspaceState.projects));
    localStorage.setItem('rc_expenses', JSON.stringify(workspaceState.expenses));
    localStorage.setItem('rc_tasks', JSON.stringify(workspaceState.tasks));
    localStorage.setItem('rc_docs', JSON.stringify(workspaceState.documents));
    localStorage.setItem('rc_wiki', JSON.stringify(workspaceState.wikiDocs));
    localStorage.setItem('rc_categories', JSON.stringify(workspaceState.categories));
    localStorage.setItem('rc_prj_categories', JSON.stringify(workspaceState.projectCategories));
    localStorage.setItem('rc_batch_tables', JSON.stringify(workspaceState.batchTables));

    if (skipNextCloudSave.current) {
      skipNextCloudSave.current = false;
      return;
    }

    void queueSave({
      isCustomized: true,
      projects: workspaceState.projects,
      expenses: workspaceState.expenses,
      tasks: workspaceState.tasks,
      documents: workspaceState.documents,
      wikiDocs: workspaceState.wikiDocs,
      categories: workspaceState.categories,
      projectCategories: workspaceState.projectCategories,
      batchTables: workspaceState.batchTables,
    }).catch((error) => {
      console.error("Error al guardar en la nube", error);
      setSaveStatus("error");
    });
  }, [hydrated, workspaceState, queueSave, saveStatus]);

  // Subscription/Polling installed ONLY AFTER hydrated === true
  useEffect(() => {
    if (!hydrated) return;

    const unsubscribe = realtimeSync.subscribe((remote) => {
      const remoteTimestamp = Number(remote.updatedAt ?? 0);
      if (remoteTimestamp <= lastRemoteTimestamp.current) return;

      applyWorkspaceState(remote);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [hydrated, applyWorkspaceState]);

  // Global Clipboard Paste Event Listener (Ctrl+V)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          setEditType(null);
          setEditItem(null);
          setIsActionModalOpen(true);
          break;
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Explicit Cloud Save Button Trigger
  const handleSaveToCloudManual = useCallback(async () => {
    const stateObj = {
      isCustomized: true,
      projects: workspaceState.projects,
      expenses: workspaceState.expenses,
      tasks: workspaceState.tasks,
      documents: workspaceState.documents,
      wikiDocs: workspaceState.wikiDocs,
      categories: workspaceState.categories,
      projectCategories: workspaceState.projectCategories,
      batchTables: workspaceState.batchTables,
      responsibles: workspaceState.responsibles || [],
      migrationMetadata: workspaceState.migrationMetadata
    };

    const isSuccess = await queueSave(stateObj);
    if (isSuccess) {
      triggerToast('💾 ¡Todos tus cambios han sido GRABADOS en la Nube exitosamente!');
    } else {
      triggerToast('⚠️ No se pudo conectar al servidor remoto. Usa el enlace compartido para enviar los datos.');
    }
  }, [workspaceState, queueSave]);

  // Shared link generator pointing directly to active workspaceId
  const handleShareLink = async () => {
    try {
      const baseUrl = window.location.origin;
      const targetWs = workspaceId || resolveDefaultWorkspace();
      const editUrl = `${baseUrl}/w/${targetWs}`;
      const readOnlyUrl = `${baseUrl}/w/${targetWs}?mode=readonly`;

      setShareableUrl(editUrl);
      setReadOnlyShareableUrl(readOnlyUrl);
      setIsCopied(false);
      setIsReadOnlyCopied(false);
      setIsShareModalOpen(true);

      // Save active workspace state to cloud without mutating session workspaceId
      await handleSaveToCloudManual();

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(editUrl);
        setIsCopied(true);
        triggerToast(`📋 Enlace directo del Workspace (${targetWs}) copiado al portapapeles.`);
      }
    } catch (err) {
      console.error('Error al compartir link:', err);
    }
  };

  const copyShareableUrl = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareableUrl).then(() => {
        setIsCopied(true);
        triggerToast('📋 ¡Enlace corto copiado al portapapeles!');
      });
    } else {
      prompt('Copia este enlace corto para compartir tus datos:', shareableUrl);
    }
  };

  // Single Path of Persistence: CRUD handlers ONLY mutate local workspaceState!
  const handleOpenNewProjectModal = () => {
    setProjectToEdit(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProjectModal = (prj: Project) => {
    setProjectToEdit(prj);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = (data: Partial<Project>) => {
    setWorkspaceState(prev => {
      const newPrjCategories = data.category && !prev.projectCategories.includes(data.category)
        ? [...prev.projectCategories, data.category]
        : prev.projectCategories;

      let newProjects: Project[];
      if (data.id) {
        newProjects = prev.projects.map(p => p.id === data.id ? { ...p, ...data } as Project : p);
      } else {
        const newPrj: Project = {
          id: 'PRJ-' + Date.now(),
          name: data.name || 'Nuevo Proyecto',
          code: data.code || 'PRJ-04',
          budget: data.budget || 16450,
          totalBudget: data.budget || 16450,
          spent: 0,
          spentBudget: 0,
          category: data.category || 'Mobile App',
          startDate: data.startDate,
          endDate: data.endDate,
          color: '#007AFF'
        };
        newProjects = [...prev.projects, newPrj];
        setActiveProjectFilter(newPrj.id);
      }

      return {
        ...prev,
        isCustomized: true,
        projects: newProjects,
        projectCategories: newPrjCategories
      };
    });

    triggerToast('✅ Proyecto guardado exitosamente.');
  };

  const handleDeleteProject = async (id: string) => {
    const prj = workspaceState.projects.find(p => p.id === id);
    if (!prj) return;

    if (confirm(`¿Eliminar el proyecto "${prj.name}"? Se borrarán sus transacciones, tareas y documentos asociados.`)) {
      await realtimeSync.createPreMutationBackup('DELETE_PROJECT');
      setWorkspaceState(prev => ({
        ...prev,
        isCustomized: true,
        projects: prev.projects.filter(p => p.id !== id),
        expenses: prev.expenses.filter(e => e.projectId !== id),
        tasks: prev.tasks.filter(t => t.projectId !== id),
        documents: prev.documents.filter(d => d.projectId !== id)
      }));

      if (activeProjectFilter === id) setActiveProjectFilter('all');
      triggerToast(`🗑️ Proyecto "${prj.name}" y sus datos fueron ELIMINADOS.`);
    }
  };

  const handleOpenBatchModal = (initialMode: BatchMode = 'expense', targetTableId: string = '') => {
    setBatchInitialMode(initialMode);
    setBatchTargetTableId(targetTableId);
    setIsBatchModalOpen(true);
  };

  // Collapsible Accordion Table Handlers
  const handleToggleTableCollapse = (tableId: string) => {
    setWorkspaceState(prev => ({
      ...prev,
      batchTables: prev.batchTables.map(t =>
        t.id === tableId ? { ...t, isCollapsed: !t.isCollapsed } : t
      )
    }));
  };

  const handleDeleteTable = (tableId: string) => {
    const tbl = workspaceState.batchTables.find(t => t.id === tableId);
    if (!tbl) return;

    if (confirm(`¿Eliminar la tabla "${tbl.name}"? Sus registros asociados quedarán archivados.`)) {
      setWorkspaceState(prev => ({
        ...prev,
        batchTables: prev.batchTables.filter(t => t.id !== tableId)
      }));
      triggerToast(`🗑️ Tabla "${tbl.name}" eliminada.`);
    }
  };

  // Mass Batch Save Handler with Atomic Append & Period Table Link & Project Link
  const handleSaveBatch = useCallback(async (payload: {
    mode: BatchMode;
    targetTableId?: string;
    newTableName?: string;
    targetProjectId?: string;
    expenses?: Partial<Expense>[];
    tasks?: Partial<Task>[];
    documents?: Partial<Document>[];
    newCategories?: string[];
    newResponsibles?: Responsible[];
  }) => {
    await realtimeSync.createPreMutationBackup('MASS_BATCH_IMPORT');
    setWorkspaceState(prev => {
      let currentTables = prev.batchTables || DEFAULT_BATCH_TABLES;
      // Normalize targetTableId: NEVER persist literal string "NEW" as tableId
      let activeTableId = (payload.targetTableId === 'NEW' || !payload.targetTableId) ? undefined : payload.targetTableId;

      const fallbackProjectId = payload.targetProjectId || (activeProjectFilter !== 'all' ? activeProjectFilter : prev.projects[0]?.id || 'PRJ-01');

      // Create new table if targetTableId is missing or "NEW"
      if (!activeTableId && (payload.newTableName || payload.targetTableId === 'NEW')) {
        const newTbl: BatchTable = {
          id: 'tbl-' + Date.now(),
          name: payload.newTableName?.trim() || (payload.mode === 'income' ? 'Ingresos Julio 2026' : 'Gastos Agosto 2026'),
          mode: payload.mode,
          projectId: fallbackProjectId,
          createdAt: new Date().toISOString().split('T')[0],
          isCollapsed: false, // Expanded so newly imported rows are visible immediately
        };
        currentTables = [newTbl, ...currentTables];
        activeTableId = newTbl.id;
      } else if (activeTableId) {
        // Expand existing target table so newly imported rows are visible immediately
        currentTables = currentTables.map(t => t.id === activeTableId ? { ...t, isCollapsed: false } : t);
      }

      let newCategories = prev.categories;
      if (payload.newCategories && payload.newCategories.length > 0) {
        const added = payload.newCategories.filter(c => !newCategories.includes(c));
        newCategories = [...newCategories, ...added];
      }

      let newExpenses = prev.expenses;
      if (payload.expenses && payload.expenses.length > 0) {
        const prepared = payload.expenses.map((e, idx) => ({
          id: 'exp-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substr(2, 4),
          type: e.type || 'EXPENSE',
          concept: e.concept || 'Nuevo Registro',
          amount: e.amount || 0,
          category: e.category || 'General',
          projectId: e.projectId || fallbackProjectId,
          date: e.date || new Date().toISOString().split('T')[0],
          status: 'PAID' as const,
          tableId: activeTableId || e.tableId
        }));
        // ATOMIC APPEND: append new rows without deleting or overwriting previous items!
        newExpenses = [...prepared, ...prev.expenses];
      }

      let newTasks = prev.tasks;
      if (payload.tasks && payload.tasks.length > 0) {
        const prepared = payload.tasks.map((t, idx) => ({
          id: 'tsk-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substr(2, 4),
          title: t.title || 'Nueva Tarea',
          status: 'TODO' as const,
          priority: t.priority || 'MEDIUM',
          projectId: t.projectId || fallbackProjectId,
          assigneeName: t.assigneeName || t.assignee,
          assignee: t.assigneeName || t.assignee,
          assigneeIds: t.assigneeIds || [],
          notes: t.notes,
          dueDate: t.dueDate || new Date().toISOString().split('T')[0],
          tags: t.tags || ['Captura Masiva'],
          tableId: activeTableId || t.tableId
        }));
        newTasks = [...prepared, ...prev.tasks];
      }

      let newDocs = prev.documents;
      if (payload.documents && payload.documents.length > 0) {
        const prepared = payload.documents.map((d, idx) => ({
          id: 'pdoc-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substr(2, 4),
          title: d.title || 'Nuevo Documento',
          format: d.format || 'image',
          docType: d.docType || 'IMAGE',
          typeLabel: d.typeLabel || 'Documento',
          projectId: d.projectId || fallbackProjectId,
          date: d.date || new Date().toISOString().split('T')[0],
          updatedAt: d.date || new Date().toISOString().split('T')[0],
          fileUrl: d.fileUrl || '#',
          previewUrl: d.previewUrl,
          description: d.description || 'Documento en captura masiva',
          tableId: activeTableId || d.tableId
        }));
        newDocs = [...prepared, ...prev.documents];
      }

      let newResponsibles = prev.responsibles || [];
      if (payload.newResponsibles && payload.newResponsibles.length > 0) {
        const existingIds = new Set(newResponsibles.map(r => r.id));
        const existingNames = new Set(newResponsibles.map(r => r.name.trim().toLowerCase()));
        const added = payload.newResponsibles.filter(r => !existingIds.has(r.id) && !existingNames.has(r.name.trim().toLowerCase()));
        newResponsibles = [...newResponsibles, ...added];
      }

      return {
        ...prev,
        isCustomized: true,
        batchTables: currentTables,
        categories: newCategories,
        responsibles: newResponsibles,
        expenses: newExpenses,
        tasks: newTasks,
        documents: newDocs
      };
    });

    const count = (payload.expenses?.length || 0) + (payload.tasks?.length || 0) + (payload.documents?.length || 0);
    triggerToast(`⚡ Carga masiva procesada: ${count} registros anexados exitosamente.`);
  }, [activeProjectFilter]);

  const handleReassignOrphanGroup = useCallback(async (payload: {
    groupTableId: string;
    targetProjectId: string;
    targetTableId?: string;
    newTableName?: string;
  }) => {
    await realtimeSync.createPreMutationBackup('REASSIGN_ORPHAN_GROUP');
    let count = 0;
    setWorkspaceState(prev => {
      let currentTables = prev.batchTables || DEFAULT_BATCH_TABLES;
      let finalTableId = (payload.targetTableId === 'NEW' || !payload.targetTableId) ? undefined : payload.targetTableId;

      if (!finalTableId) {
        const newTbl: BatchTable = {
          id: 'tbl-' + Date.now(),
          name: payload.newTableName?.trim() || 'Gastos Reasignados',
          mode: 'expense',
          projectId: payload.targetProjectId,
          createdAt: new Date().toISOString().split('T')[0],
          isCollapsed: false,
        };
        currentTables = [newTbl, ...currentTables];
        finalTableId = newTbl.id;
      } else {
        currentTables = currentTables.map(t => t.id === finalTableId ? { ...t, isCollapsed: false } : t);
      }

      const updatedExpenses = prev.expenses.map(e => {
        if (e.tableId === payload.groupTableId) {
          count++;
          return {
            ...e,
            projectId: payload.targetProjectId,
            tableId: finalTableId
          };
        }
        return e;
      });

      return {
        ...prev,
        isCustomized: true,
        batchTables: currentTables,
        expenses: updatedExpenses
      };
    });

    triggerToast(`✅ Lote de ${count} registros reasignado exitosamente.`);
  }, []);

  const handleDeleteOrphanGroup = useCallback(async (groupTableId: string, expenseIds: string[]) => {
    if (!expenseIds || expenseIds.length === 0) return;
    await realtimeSync.createPreMutationBackup('DELETE_ORPHAN_GROUP');
    const idsToDelete = new Set(expenseIds);

    setWorkspaceState(prev => ({
      ...prev,
      isCustomized: true,
      expenses: prev.expenses.filter(e => !idsToDelete.has(e.id))
    }));

    triggerToast(`🗑️ Lote de ${expenseIds.length} registros huérfanos eliminado definitivamente.`);
  }, []);

  const handleDeleteTableWithOptions = useCallback(async (payload: {
    tableId: string;
    action: 'delete_all' | 'reassign';
    targetProjectId?: string;
    targetTableId?: string;
    newTableName?: string;
  }) => {
    const tbl = workspaceState.batchTables.find(t => t.id === payload.tableId);
    if (!tbl) return;
    await realtimeSync.createPreMutationBackup('DELETE_TABLE_WITH_OPTIONS');

    setWorkspaceState(prev => {
      let currentTables = (prev.batchTables || []).filter(t => t.id !== payload.tableId);
      let updatedExpenses = prev.expenses;

      if (payload.action === 'delete_all') {
        // REAL deletion of both table and its rows
        updatedExpenses = prev.expenses.filter(e => e.tableId !== payload.tableId);
      } else if (payload.action === 'reassign') {
        let finalTableId = (payload.targetTableId === 'NEW' || !payload.targetTableId) ? undefined : payload.targetTableId;

        if (!finalTableId && payload.newTableName) {
          const newTbl: BatchTable = {
            id: 'tbl-' + Date.now(),
            name: payload.newTableName.trim(),
            mode: tbl.mode,
            projectId: payload.targetProjectId || tbl.projectId,
            createdAt: new Date().toISOString().split('T')[0],
            isCollapsed: false,
          };
          currentTables = [newTbl, ...currentTables];
          finalTableId = newTbl.id;
        }

        updatedExpenses = prev.expenses.map(e => {
          if (e.tableId === payload.tableId) {
            return {
              ...e,
              projectId: payload.targetProjectId || e.projectId,
              tableId: finalTableId || e.tableId
            };
          }
          return e;
        });
      }

      return {
        ...prev,
        isCustomized: true,
        batchTables: currentTables,
        expenses: updatedExpenses
      };
    });

    triggerToast(`🗑️ Tabla "${tbl.name}" procesada correctamente.`);
  }, [workspaceState.batchTables]);

  const handleRenameTable = useCallback((tableId: string, rawName: string) => {
    const normalizedName = rawName ? rawName.trim() : '';
    if (!normalizedName || normalizedName.length > 80) return;

    setWorkspaceState(prev => ({
      ...prev,
      isCustomized: true,
      batchTables: (prev.batchTables || DEFAULT_BATCH_TABLES).map(table =>
        table.id === tableId ? { ...table, name: normalizedName } : table
      )
    }));

    triggerToast(`✏️ Tabla renombrada a "${normalizedName}" exitosamente.`);
  }, []);

  const handleSaveExpense = (data: Partial<Expense>) => {
    setWorkspaceState(prev => {
      const newCategories = data.category && !prev.categories.includes(data.category)
        ? [...prev.categories, data.category]
        : prev.categories;

      let newExpenses: Expense[];
      if (data.id) {
        newExpenses = prev.expenses.map(e => e.id === data.id ? { ...e, ...data } as Expense : e);
      } else {
        const newExp: Expense = {
          id: 'exp-' + Date.now(),
          type: data.type || 'EXPENSE',
          concept: data.concept || 'Nuevo Registro',
          amount: data.amount || 0,
          category: data.category || 'General',
          projectId: data.projectId || prev.projects[0]?.id || 'PRJ-01',
          date: data.date || new Date().toISOString().split('T')[0],
          status: 'PAID'
        };
        newExpenses = [newExp, ...prev.expenses];
      }

      return {
        ...prev,
        isCustomized: true,
        expenses: newExpenses,
        categories: newCategories
      };
    });

    triggerToast('✅ Transacción guardada exitosamente.');
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('¿Eliminar esta transacción financiera?')) {
      setWorkspaceState(prev => ({
        ...prev,
        isCustomized: true,
        expenses: prev.expenses.filter(e => e.id !== id)
      }));
      triggerToast('🗑️ Transacción eliminada.');
    }
  };

  const handleBulkDeleteExpenses = useCallback((expenseIds: string[]) => {
    if (!expenseIds || expenseIds.length === 0) return;

    setWorkspaceState(prev => ({
      ...prev,
      isCustomized: true,
      expenses: prev.expenses.filter(e => !expenseIds.includes(e.id))
    }));

    triggerToast(`🗑️ ${expenseIds.length} transacciones eliminadas correctamente.`);
  }, []);

  const handleSaveTask = (data: Partial<Task>) => {
    setWorkspaceState(prev => {
      let newTasks: Task[];
      if (data.id) {
        newTasks = prev.tasks.map(t => t.id === data.id ? { ...t, ...data } as Task : t);
      } else {
        const newTask: Task = {
          id: 'tsk-' + Date.now(),
          title: data.title || 'Nueva Tarea',
          status: 'TODO',
          priority: data.priority || 'MEDIUM',
          projectId: data.projectId || prev.projects[0]?.id || 'PRJ-01',
          assigneeName: data.assigneeName || 'Sin asignar',
          assignee: data.assigneeName || 'Sin asignar',
          assigneeIds: data.assigneeIds || [],
          position: Date.now(),
          updatedAt: Date.now(),
          dueDate: data.dueDate || new Date().toISOString().split('T')[0],
          notes: data.notes || '',
          tags: ['Asignado']
        };
        newTasks = [newTask, ...prev.tasks];
      }

      return {
        ...prev,
        isCustomized: true,
        tasks: newTasks
      };
    });

    triggerToast('✅ Tarea guardada exitosamente.');
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('¿Eliminar esta tarea?')) {
      setWorkspaceState(prev => ({
        ...prev,
        isCustomized: true,
        tasks: prev.tasks.filter(t => t.id !== id)
      }));
      triggerToast('🗑️ Tarea eliminada.');
    }
  };

  const handleAdvanceTaskStatus = (id: string) => {
    setWorkspaceState(prev => ({
      ...prev,
      isCustomized: true,
      tasks: prev.tasks.map(t => {
        if (t.id !== id) return t;
        const statuses: ('TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED')[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'];
        const curIndex = statuses.indexOf(t.status as any);
        const nextStatus = statuses[(curIndex + 1) % statuses.length];
        return { ...t, status: nextStatus, updatedAt: Date.now() };
      })
    }));
  };

  const handleMoveTaskPhase = useCallback((taskId: string, targetStatus: TaskStatus, newPosition?: number) => {
    setWorkspaceState(prev => ({
      ...prev,
      isCustomized: true,
      tasks: prev.tasks.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            status: targetStatus,
            position: newPosition !== undefined ? newPosition : t.position,
            updatedAt: Date.now()
          };
        }
        return t;
      })
    }));
    const statusLabel = targetStatus === 'TODO' ? 'Por Hacer' : targetStatus === 'IN_PROGRESS' ? 'En Progreso' : targetStatus === 'IN_REVIEW' ? 'En Revisión' : 'Completado';
    triggerToast(`📋 Tarea movida a "${statusLabel}".`);
  }, []);

  const handleSaveResponsible = useCallback((data: Partial<Responsible>) => {
    setWorkspaceState(prev => {
      const list = prev.responsibles || [];
      let next: Responsible[];
      if (data.id) {
        next = list.map(r => r.id === data.id ? { ...r, ...data, updatedAt: Date.now() } as Responsible : r);
      } else {
        const newResp: Responsible = {
          id: 'resp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: data.name?.trim() || 'Nuevo Responsable',
          color: data.color || '#007AFF',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        next = [...list, newResp];
      }
      return { ...prev, isCustomized: true, responsibles: next };
    });
    triggerToast('👤 Responsable guardado exitosamente.');
  }, []);

  const handleDeleteResponsible = useCallback(async (id: string, forceUnassign: boolean) => {
    if (forceUnassign) {
      await realtimeSync.createPreMutationBackup('BULK_UNASSIGN_RESPONSIBLE');
    }
    setWorkspaceState(prev => {
      const updatedTasks = prev.tasks.map(t => {
        if (t.assigneeIds && t.assigneeIds.includes(id)) {
          return { ...t, assigneeIds: t.assigneeIds.filter(x => x !== id), updatedAt: Date.now() };
        }
        return t;
      });
      const updatedResps = (prev.responsibles || []).filter(r => r.id !== id);
      return {
        ...prev,
        isCustomized: true,
        tasks: updatedTasks,
        responsibles: updatedResps
      };
    });
    triggerToast('🗑️ Responsable eliminado del catálogo.');
  }, []);

  const handleArchiveResponsible = useCallback((id: string) => {
    setWorkspaceState(prev => {
      const updatedResps = (prev.responsibles || []).map(r => {
        if (r.id === id) {
          return {
            ...r,
            archivedAt: r.archivedAt ? undefined : Date.now(),
            updatedAt: Date.now()
          };
        }
        return r;
      });
      return { ...prev, isCustomized: true, responsibles: updatedResps };
    });
    triggerToast('📦 Estado de archivado actualizado.');
  }, []);

  const handleExecuteLegacyMigration = useCallback(async () => {
    await realtimeSync.createPreMutationBackup('LEGACY_RESPONSIBLE_MIGRATION');
    setWorkspaceState(prev => {
      const currentResps = prev.responsibles || [];
      const existingNames = new Map(currentResps.map(r => [r.name.trim().toLowerCase(), r]));
      const newResps: Responsible[] = [];

      const updatedTasks = prev.tasks.map(t => {
        const legacyName = (t.assigneeName || t.assignee || '').trim();
        if (!legacyName) return t;

        // Skip if task already has assigneeIds
        if (t.assigneeIds && t.assigneeIds.length > 0) return t;

        const normalizedKey = legacyName.toLowerCase();
        let resp = existingNames.get(normalizedKey);

        if (!resp) {
          resp = {
            id: 'resp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            name: legacyName,
            color: '#007AFF',
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          existingNames.set(normalizedKey, resp);
          newResps.push(resp);
        }

        return {
          ...t,
          assigneeIds: [resp.id],
          updatedAt: Date.now()
        };
      });

      return {
        ...prev,
        isCustomized: true,
        responsibles: [...currentResps, ...newResps],
        tasks: updatedTasks,
        migrationMetadata: {
          legacyAssigneesMigratedAt: Date.now(),
          migrationVersion: 1
        }
      };
    });
    triggerToast('✨ Migración de responsables heredados completada con éxito.');
  }, []);

  const handleSaveDocument = (data: Partial<Document>) => {
    setWorkspaceState(prev => {
      let newDocs: Document[];
      if (data.id) {
        newDocs = prev.documents.map(d => d.id === data.id ? { ...d, ...data } as Document : d);
      } else {
        const newDoc: Document = {
          id: 'pdoc-' + Date.now(),
          title: data.title || 'Nuevo Documento',
          format: data.format || 'image',
          docType: data.docType || 'IMAGE',
          typeLabel: data.typeLabel || 'Documento',
          projectId: data.projectId || prev.projects[0]?.id || 'PRJ-01',
          date: data.date || new Date().toISOString().split('T')[0],
          updatedAt: data.date || new Date().toISOString().split('T')[0],
          fileUrl: data.fileUrl || '#',
          previewUrl: data.previewUrl,
          description: data.description || 'Documento adjunto'
        };
        newDocs = [newDoc, ...prev.documents];
      }

      return {
        ...prev,
        isCustomized: true,
        documents: newDocs
      };
    });

    setCurrentView('docs');
    triggerToast('✅ Documento guardado exitosamente.');
  };

  const handleDeleteDocument = (id: string) => {
    if (confirm('¿Eliminar este documento?')) {
      setWorkspaceState(prev => ({
        ...prev,
        isCustomized: true,
        documents: prev.documents.filter(d => d.id !== id)
      }));
      triggerToast('🗑️ Documento eliminado.');
    }
  };

  const handleSaveWikiDoc = (updatedWikiDoc: WikiDoc) => {
    setWorkspaceState(prev => ({
      ...prev,
      isCustomized: true,
      wikiDocs: prev.wikiDocs.map(w => w.id === updatedWikiDoc.id ? updatedWikiDoc : w)
    }));
    triggerToast('✅ Nota guardada exitosamente.');
  };

  const handleOpenLightbox = (doc: Document) => {
    setLightboxDoc(doc);
    setIsLightboxOpen(true);
  };

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden bg-[#F2F2F7] dark:bg-[#0A0A0C] text-[#1C1C1E] dark:text-[#F2F2F7] relative">
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation Drawer */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        activeProjectFilter={activeProjectFilter}
        setActiveProjectFilter={setActiveProjectFilter}
        projects={workspaceState.projects}
        onAddProject={handleOpenNewProjectModal}
        onEditProject={handleOpenEditProjectModal}
        onDeleteProject={handleDeleteProject}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main View Area Container */}
      <div className="min-w-0 flex-1 flex flex-col w-full min-h-[100dvh]">
        <Navbar
          projects={workspaceState.projects}
          activeProjectFilter={activeProjectFilter}
          setActiveProjectFilter={setActiveProjectFilter}
          openSpotlight={() => setIsSpotlightOpen(true)}
          openActionModal={() => handleOpenBatchModal('expense')}
          openBatchModal={() => handleOpenBatchModal('expense')}
          openProjectModal={handleOpenNewProjectModal}
          onShareLink={handleShareLink}
          onSaveToCloud={handleSaveToCloudManual}
          saveStatus={saveStatus}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        />

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-7">
          {currentView === 'dashboard' && (
            <OverviewDashboard
              projects={workspaceState.projects}
              expenses={workspaceState.expenses}
              tasks={workspaceState.tasks}
              activeProjectFilter={activeProjectFilter}
            />
          )}

          {currentView === 'expenses' && (
            <ExpenseTracker
              expenses={workspaceState.expenses}
              projects={workspaceState.projects}
              tables={workspaceState.batchTables}
              activeProjectFilter={activeProjectFilter}
              onAddExpense={() => handleOpenBatchModal('expense')}
              onEditExpense={(exp) => {
                setEditType('expense');
                setEditItem(exp);
                setIsActionModalOpen(true);
              }}
              onDeleteExpense={handleDeleteExpense}
              onBulkDeleteExpenses={handleBulkDeleteExpenses}
              onToggleTableCollapse={handleToggleTableCollapse}
              onDeleteTable={handleDeleteTable}
              onFeedTable={(tableId, mode) => handleOpenBatchModal(mode, tableId)}
              onRenameTable={handleRenameTable}
              onReassignOrphanGroup={handleReassignOrphanGroup}
              onDeleteOrphanGroup={handleDeleteOrphanGroup}
              onDeleteTableWithOptions={handleDeleteTableWithOptions}
            />
          )}

          {currentView === 'tasks' && (
            <TaskManager
              tasks={workspaceState.tasks}
              projects={workspaceState.projects}
              responsibles={workspaceState.responsibles || []}
              activeProjectFilter={activeProjectFilter}
              onAddTask={() => {
                setEditType('task');
                setEditItem(null);
                setIsActionModalOpen(true);
              }}
              onEditTask={(task) => {
                setEditType('task');
                setEditItem(task);
                setIsActionModalOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onMoveTaskPhase={handleMoveTaskPhase}
              onOpenResponsibleManager={() => setIsResponsibleManagerOpen(true)}
              onOpenLegacyMigration={() => setIsLegacyMigrationOpen(true)}
              unmigratedTasksCount={
                workspaceState.tasks.filter(t => (t.assigneeName || t.assignee) && (!t.assigneeIds || t.assigneeIds.length === 0)).length
              }
            />
          )}

          {currentView === 'docs' && (
            <ProjectDocuments
              documents={workspaceState.documents}
              projects={workspaceState.projects}
              activeProjectFilter={activeProjectFilter}
              onAddDocument={() => handleOpenBatchModal('doc')}
              onEditDocument={(doc) => {
                setEditType('doc');
                setEditItem(doc);
                setIsActionModalOpen(true);
              }}
              onDeleteDocument={handleDeleteDocument}
              onOpenLightbox={handleOpenLightbox}
            />
          )}

          {currentView === 'wiki' && (
            <KnowledgeBase
              wikiDocs={workspaceState.wikiDocs}
              documents={workspaceState.documents}
              activeProjectFilter={activeProjectFilter}
              onSaveDoc={handleSaveWikiDoc}
            />
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-purple-600 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold z-50 animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2 max-w-[90vw]">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Share Link Modal Dialog */}
      {isShareModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
          onClick={() => setIsShareModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 w-[calc(100vw-1.5rem)] max-w-md shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-bold">Compartir Enlace Corto</h3>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Este enlace corto (/w/{workspaceId}) consulta tus datos en tiempo real desde la nube sin requerir URLs extensas.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareableUrl}
                className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono select-all outline-none min-w-0"
              />
              <button
                onClick={copyShareableUrl}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 transition"
              >
                {isCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Read-Only Top Banner */}
      {saveStatus === 'offline-readonly' && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>⚠️ Modo Lectura Sin Conexión - Las escrituras remotas están deshabilitadas para proteger la base de datos.</span>
          </div>
          <button
            onClick={() => void realtimeSync.fetchFromCloud()}
            className="px-3 py-1 bg-black/30 hover:bg-black/40 rounded-lg text-white font-bold transition"
          >
            Reintentar Conexión
          </button>
        </div>
      )}

      {/* 409 Conflict Resolution Modal */}
      {saveStatus === 'conflict' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1C1E] border border-red-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-7 h-7 shrink-0" />
              <div>
                <h3 className="text-lg font-bold">Conflicto de Concurrencia Detectado</h3>
                <p className="text-xs text-neutral-500">
                  Revisión en Servidor: Rev. {conflictDetails?.serverRevision || 'N/A'} | Tu Versión Intentada: Rev. {conflictDetails?.expectedRevision || 'N/A'}
                </p>
              </div>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Otra sesión o dispositivo ha actualizado los datos en la nube. Para prevenir reversiones accidentales, se ha pausado el guardado automático de tu sesión.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={async () => {
                  const remote = await realtimeSync.fetchFromCloud();
                  if (remote && remote.revision) {
                    realtimeSync.setLastRemoteRevision(remote.revision);
                    realtimeSync.setLastRemoteTimestamp(Number(remote.updatedAt || Date.now()));
                  } else if (conflictDetails?.serverRevision) {
                    realtimeSync.setLastRemoteRevision(conflictDetails.serverRevision);
                  }
                  setSaveStatus('ready');
                  setConflictDetails(null);
                  await queueSave({
                    isCustomized: true,
                    projects: workspaceState.projects,
                    expenses: workspaceState.expenses,
                    tasks: workspaceState.tasks,
                    documents: workspaceState.documents,
                    wikiDocs: workspaceState.wikiDocs,
                    categories: workspaceState.categories,
                    projectCategories: workspaceState.projectCategories,
                    batchTables: workspaceState.batchTables,
                  });
                  triggerToast('☁️ Cambios locales guardados en la nube con éxito.');
                }}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
              >
                <Cloud className="w-4 h-4" />
                <span>Guardar Mis Cambios Locales</span>
              </button>
              <button
                onClick={async () => {
                  const remote = await realtimeSync.fetchFromCloud();
                  if (remote) {
                    applyWorkspaceState(remote);
                    setSaveStatus('ready');
                    setConflictDetails(null);
                    triggerToast('🔄 Datos actualizados desde la nube.');
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recargar datos de la nube</span>
              </button>
              <button
                onClick={handleExportBackupJson}
                className="px-4 py-2.5 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Exportar JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <SpotlightModal
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        tasks={workspaceState.tasks}
        expenses={workspaceState.expenses}
        documents={workspaceState.documents}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        projectToEdit={projectToEdit}
        onSaveProject={handleSaveProject}
        existingCategories={workspaceState.projectCategories}
      />

      <ActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        projects={workspaceState.projects}
        categories={workspaceState.categories}
        responsibles={workspaceState.responsibles || []}
        editType={editType}
        editItem={editItem}
        onSaveExpense={handleSaveExpense}
        onSaveTask={handleSaveTask}
        onSaveDocument={handleSaveDocument}
      />

      <BatchEntryModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        projects={workspaceState.projects}
        categories={workspaceState.categories}
        responsibles={workspaceState.responsibles || []}
        tables={workspaceState.batchTables}
        targetTableId={batchTargetTableId}
        initialMode={batchInitialMode}
        existingExpenses={workspaceState.expenses}
        onSaveBatch={handleSaveBatch}
      />

      <ImageLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        document={lightboxDoc}
        projects={workspaceState.projects}
      />

      <ResponsibleManagerModal
        isOpen={isResponsibleManagerOpen}
        onClose={() => setIsResponsibleManagerOpen(false)}
        responsibles={workspaceState.responsibles || []}
        tasks={workspaceState.tasks}
        onSaveResponsible={handleSaveResponsible}
        onDeleteResponsible={handleDeleteResponsible}
        onArchiveResponsible={handleArchiveResponsible}
      />

      <LegacyMigrationModal
        isOpen={isLegacyMigrationOpen}
        onClose={() => setIsLegacyMigrationOpen(false)}
        responsibles={workspaceState.responsibles || []}
        tasks={workspaceState.tasks}
        onExecuteMigration={handleExecuteLegacyMigration}
      />
    </div>
  );
}
