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
import { ImageLightboxModal } from '@/components/modals/ImageLightboxModal';
import { Project, Expense, Task, Document, WikiDoc } from '@/types';
import { realtimeSync, SyncPayload, SaveStatus, urlSafeEncodeObj, urlSafeDecodeStr } from '@/lib/firebaseSync';
import { X, Copy, CheckCircle } from 'lucide-react';

export default function Home() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [activeProjectFilter, setActiveProjectFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

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

  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [lightboxDoc, setLightboxDoc] = useState<Document | null>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareableUrl, setShareableUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isCustomized, setIsCustomized] = useState<boolean>(false);
  const [workspaceId, setWorkspaceId] = useState<string>('rc_ws_main');

  // Categories State
  const [categories, setCategories] = useState<string[]>([
    'Facturación / Cobro',
    'Software & Cloud',
    'Diseño UI/UX',
    'Desarrollo Frontend/Backend',
    'Infraestructura & Server',
    'Marketing & Ads'
  ]);

  const [projectCategories, setProjectCategories] = useState<string[]>([
    'Mobile App',
    'Web App',
    'Design',
    'Infrastructure',
    'Marketing'
  ]);

  // Default Mock Projects
  const defaultProjects: Project[] = [
    { id: 'PRJ-01', name: 'App iOS Redesign', code: 'IOS-01', budget: 450000, totalBudget: 450000, spent: 284500, spentBudget: 284500, color: '#007AFF', category: 'Mobile App', startDate: '2026-08-01', endDate: '2026-11-30' },
    { id: 'PRJ-02', name: 'SaaS Dashboard v2', code: 'SAAS-02', budget: 350000, totalBudget: 350000, spent: 312000, spentBudget: 312000, color: '#AF52DE', category: 'Web App', startDate: '2026-07-15', endDate: '2026-10-15' },
    { id: 'PRJ-03', name: 'Brand Identity 2026', code: 'BRAND-03', budget: 220000, totalBudget: 220000, spent: 148000, spentBudget: 148000, color: '#FF9500', category: 'Design', startDate: '2026-08-05', endDate: '2026-09-30' }
  ];

  // Default Expenses State
  const defaultExpenses: Expense[] = [
    { id: 'exp-101', type: 'INCOME', concept: 'Anticipo 50% Proyecto Rediseño iOS', amount: 225000, category: 'Facturación / Cobro', projectId: 'PRJ-01', date: '2026-08-01', status: 'PAID' },
    { id: 'exp-102', type: 'INCOME', concept: 'Cobro Hito 1 SaaS Dashboard', amount: 175000, category: 'Facturación / Cobro', projectId: 'PRJ-02', date: '2026-08-05', status: 'PAID' },
    { id: 'exp-103', type: 'INCOME', concept: 'Pago Total Brand Identity 2026', amount: 220000, category: 'Facturación / Cobro', projectId: 'PRJ-03', date: '2026-08-08', status: 'PAID' },
    { id: 'exp-1', type: 'EXPENSE', concept: 'Suscripción Figma Enterprise', amount: 28400, category: 'Software & Cloud', projectId: 'PRJ-01', date: '2026-08-15', status: 'PAID' },
    { id: 'exp-2', type: 'EXPENSE', concept: 'Servidores AWS & Cloudflare CDN', amount: 64000, category: 'Infraestructura & Server', projectId: 'PRJ-02', date: '2026-08-14', status: 'PAID' },
    { id: 'exp-3', type: 'EXPENSE', concept: 'Tipografía Personalizada Font Lab', amount: 16450, category: 'Diseño UI/UX', projectId: 'PRJ-03', date: '2026-08-10', status: 'PAID' }
  ];

  // Default Tasks State
  const defaultTasks: Task[] = [
    { id: 'tsk-1', title: 'Diseñar componentes esmerilados (Glassmorphism)', status: 'IN_PROGRESS', priority: 'HIGH', projectId: 'PRJ-01', assigneeName: 'Edmundo A.', assignee: 'Edmundo A.', dueDate: '2026-08-25', tags: ['UI/UX', 'Apple'] },
    { id: 'tsk-2', title: 'Implementar atajos de teclado Cmd+K para Spotlight', status: 'COMPLETED', priority: 'MEDIUM', projectId: 'PRJ-02', assigneeName: 'Sofia R.', assignee: 'Sofia R.', dueDate: '2026-08-18', tags: ['Frontend'] }
  ];

  // Default Documents State
  const defaultDocuments: Document[] = [
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

  // Default Wiki State
  const defaultWikiDocs: WikiDoc[] = [
    {
      id: 'doc-1',
      title: 'Guía de Estilo UI/UX - Apple Human Interface Guidelines',
      projectId: 'PRJ-01',
      updatedAt: '2026-08-19',
      content: '### Principios de Diseño\n1. Translucidez y Vidrio Esmerilado\n2. Jerarquía Tipográfica'
    }
  ];

  const [projects, setProjects] = useState<Project[]>(defaultProjects);
  const [expenses, setExpenses] = useState<Expense[]>(defaultExpenses);
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [documents, setDocuments] = useState<Document[]>(defaultDocuments);
  const [wikiDocs, setWikiDocs] = useState<WikiDoc[]>(defaultWikiDocs);

  // Serialized Save Queue to prevent concurrent PUT requests
  const queueSave = useCallback((snapshot: Omit<SyncPayload, 'workspaceId' | 'updatedAt'>) => {
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => realtimeSync.saveToCloud(snapshot));

    return saveQueue.current;
  }, []);

  // 2. Apply Workspace State without triggering an auto-save
  const applyWorkspaceState = useCallback((data: any) => {
    skipNextCloudSave.current = true;
    if (Array.isArray(data.projects)) setProjects(data.projects);
    if (Array.isArray(data.expenses)) setExpenses(data.expenses);
    if (Array.isArray(data.tasks)) setTasks(data.tasks);
    if (Array.isArray(data.documents)) setDocuments(data.documents);
    if (Array.isArray(data.wikiDocs)) setWikiDocs(data.wikiDocs);
    if (Array.isArray(data.categories)) setCategories(data.categories);
    if (Array.isArray(data.projectCategories)) setProjectCategories(data.projectCategories);
    const ts = Number(data.updatedAt ?? 0);
    lastRemoteTimestamp.current = ts;
    realtimeSync.setLastRemoteTimestamp(ts);
  }, []);

  const loadLocalFallbackOrEmptyState = useCallback(() => {
    skipNextCloudSave.current = true;
    const savedCustomized = localStorage.getItem('rc_is_customized');
    if (savedCustomized === 'true') {
      setIsCustomized(true);
      const savedProjects = localStorage.getItem('rc_projects');
      if (savedProjects) setProjects(JSON.parse(savedProjects));
      const savedExpenses = localStorage.getItem('rc_expenses');
      if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
      const savedTasks = localStorage.getItem('rc_tasks');
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      const savedDocs = localStorage.getItem('rc_docs');
      if (savedDocs) setDocuments(JSON.parse(savedDocs));
      const savedWiki = localStorage.getItem('rc_wiki');
      if (savedWiki) setWikiDocs(JSON.parse(savedWiki));
      const savedCategories = localStorage.getItem('rc_categories');
      if (savedCategories) setCategories(JSON.parse(savedCategories));
      const savedPrjCat = localStorage.getItem('rc_prj_categories');
      if (savedPrjCat) setProjectCategories(JSON.parse(savedPrjCat));
    } else {
      // Do NOT auto-publish seed data
      setProjects(defaultProjects);
      setExpenses(defaultExpenses);
      setTasks(defaultTasks);
      setDocuments(defaultDocuments);
      setWikiDocs(defaultWikiDocs);
    }
  }, [defaultProjects, defaultExpenses, defaultTasks, defaultDocuments, defaultWikiDocs]);

  // Subscribe to save status updates
  useEffect(() => {
    realtimeSync.onStatusChange((status) => {
      setSaveStatus(status);
    });
  }, []);

  // 3. Single asynchronous bootstrap useEffect on mount
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      let wsId = 'rc_ws_main';
      let stateFromUrl: any = null;

      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        const search = window.location.search;

        if (hash.includes('state=')) {
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
          wsId = params.get('w') || 'rc_ws_main';
        }
      }

      setWorkspaceId(wsId);
      realtimeSync.setWorkspaceId(wsId);

      try {
        if (stateFromUrl) {
          applyWorkspaceState(stateFromUrl);
          await queueSave(stateFromUrl);
        } else {
          const remote = await realtimeSync.fetchFromCloud();

          if (remote && Array.isArray(remote.projects) && !remote.notFound) {
            applyWorkspaceState(remote);
          } else {
            loadLocalFallbackOrEmptyState();
          }
        }
      } catch (error) {
        console.error("Error al hidratar el workspace", error);
        loadLocalFallbackOrEmptyState();
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void bootstrap();
    return () => { cancelled = true; };
  }, [applyWorkspaceState, loadLocalFallbackOrEmptyState, queueSave]);

  // 4. Centralized Automatic Persistence Effect (Executed ONLY AFTER hydrated === true)
  useEffect(() => {
    if (!hydrated) return;

    localStorage.setItem('rc_is_customized', 'true');
    localStorage.setItem('rc_projects', JSON.stringify(projects));
    localStorage.setItem('rc_expenses', JSON.stringify(expenses));
    localStorage.setItem('rc_tasks', JSON.stringify(tasks));
    localStorage.setItem('rc_docs', JSON.stringify(documents));
    localStorage.setItem('rc_wiki', JSON.stringify(wikiDocs));
    localStorage.setItem('rc_categories', JSON.stringify(categories));
    localStorage.setItem('rc_prj_categories', JSON.stringify(projectCategories));

    if (skipNextCloudSave.current) {
      skipNextCloudSave.current = false;
      return;
    }

    void queueSave({
      isCustomized: true,
      projects,
      expenses,
      tasks,
      documents,
      wikiDocs,
      categories,
      projectCategories,
    }).catch((error) => {
      console.error("Error al guardar en la nube", error);
      setSaveStatus("error");
    });
  }, [
    hydrated,
    projects,
    expenses,
    tasks,
    documents,
    wikiDocs,
    categories,
    projectCategories,
    queueSave,
  ]);

  // 5. Subscription/Polling installed ONLY AFTER hydrated === true with proper cleanup
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
      projects,
      expenses,
      tasks,
      documents,
      wikiDocs,
      categories,
      projectCategories,
    };

    const isSuccess = await queueSave(stateObj);
    if (isSuccess) {
      triggerToast('💾 ¡Todos tus cambios han sido GRABADOS en la Nube exitosamente!');
    } else {
      triggerToast('⚠️ No se pudo conectar al servidor remoto. Usa el enlace compartido para enviar los datos.');
    }
  }, [projects, expenses, tasks, documents, wikiDocs, categories, projectCategories, queueSave]);

  // Generate Shared Link with Full Base64 URL-Safe State (#state=encodedData)
  const handleShareLink = async () => {
    try {
      const baseUrl = window.location.origin + window.location.pathname;
      const stateObj = {
        workspaceId,
        isCustomized: true,
        projects,
        expenses,
        tasks,
        documents,
        wikiDocs,
        categories,
        projectCategories,
        updatedAt: Date.now()
      };

      const encodedState = urlSafeEncodeObj(stateObj);
      const fullUrl = `${baseUrl}#state=${encodedState}`;

      setShareableUrl(fullUrl);
      setIsCopied(false);
      setIsShareModalOpen(true);

      const isSaved = await queueSave(stateObj);

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl);
        setIsCopied(true);
        if (isSaved) {
          triggerToast('📋 ¡Enlace copiado con estado completo y respaldado en la Nube!');
        } else {
          triggerToast('📋 ¡Enlace copiado con estado completo codificado en la URL!');
        }
      }
    } catch (err) {
      console.error('Error al compartir link:', err);
    }
  };

  const copyShareableUrl = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareableUrl).then(() => {
        setIsCopied(true);
        triggerToast('📋 ¡Enlace copiado al portapapeles!');
      });
    } else {
      prompt('Copia este enlace compartible para enviar tus datos:', shareableUrl);
    }
  };

  // Single Path of Persistence: CRUD handlers ONLY mutate local React state!
  const handleOpenNewProjectModal = () => {
    setProjectToEdit(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProjectModal = (prj: Project) => {
    setProjectToEdit(prj);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = (data: Partial<Project>) => {
    setIsCustomized(true);

    if (data.category && !projectCategories.includes(data.category)) {
      setProjectCategories(prev => [...prev, data.category!]);
    }

    if (data.id) {
      setProjects(prev => prev.map(p => p.id === data.id ? { ...p, ...data } as Project : p));
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
      setProjects(prev => [...prev, newPrj]);
      setActiveProjectFilter(newPrj.id);
    }

    triggerToast('✅ Proyecto guardado exitosamente.');
  };

  const handleDeleteProject = (id: string) => {
    const prj = projects.find(p => p.id === id);
    if (!prj) return;

    if (confirm(`¿Eliminar el proyecto "${prj.name}"? Se borrarán sus transacciones, tareas y documentos en la nube.`)) {
      setIsCustomized(true);
      setProjects(prev => prev.filter(p => p.id !== id));
      setExpenses(prev => prev.filter(e => e.projectId !== id));
      setTasks(prev => prev.filter(t => t.projectId !== id));
      setDocuments(prev => prev.filter(d => d.projectId !== id));
      if (activeProjectFilter === id) setActiveProjectFilter('all');

      triggerToast(`🗑️ Proyecto "${prj.name}" y sus datos fueron ELIMINADOS.`);
    }
  };

  // Action Modal Handlers: Single Path of Persistence
  const handleOpenNewActionModal = (type: 'expense' | 'task' | 'doc' = 'doc') => {
    setEditType(null);
    setEditItem(null);
    setIsActionModalOpen(true);
  };

  const handleSaveExpense = (data: Partial<Expense>) => {
    setIsCustomized(true);

    if (data.category && !categories.includes(data.category)) {
      setCategories(prev => [...prev, data.category!]);
    }

    if (data.id) {
      setExpenses(prev => prev.map(e => e.id === data.id ? { ...e, ...data } as Expense : e));
    } else {
      const newExp: Expense = {
        id: 'exp-' + Date.now(),
        type: data.type || 'EXPENSE',
        concept: data.concept || 'Nuevo Registro',
        amount: data.amount || 0,
        category: data.category || 'General',
        projectId: data.projectId || projects[0]?.id || 'PRJ-01',
        date: data.date || new Date().toISOString().split('T')[0],
        status: 'PAID'
      };
      setExpenses(prev => [newExp, ...prev]);
    }

    triggerToast('✅ Transacción guardada exitosamente.');
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('¿Eliminar esta transacción financiera?')) {
      setIsCustomized(true);
      setExpenses(prev => prev.filter(e => e.id !== id));
      triggerToast('🗑️ Transacción eliminada.');
    }
  };

  const handleSaveTask = (data: Partial<Task>) => {
    setIsCustomized(true);

    if (data.id) {
      setTasks(prev => prev.map(t => t.id === data.id ? { ...t, ...data } as Task : t));
    } else {
      const newTask: Task = {
        id: 'tsk-' + Date.now(),
        title: data.title || 'Nueva Tarea',
        status: 'TODO',
        priority: data.priority || 'MEDIUM',
        projectId: data.projectId || projects[0]?.id || 'PRJ-01',
        assigneeName: data.assigneeName || 'Edmundo A.',
        assignee: data.assigneeName || 'Edmundo A.',
        dueDate: data.dueDate || new Date().toISOString().split('T')[0],
        tags: ['Asignado']
      };
      setTasks(prev => [newTask, ...prev]);
    }

    triggerToast('✅ Tarea guardada exitosamente.');
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('¿Eliminar esta tarea?')) {
      setIsCustomized(true);
      setTasks(prev => prev.filter(t => t.id !== id));
      triggerToast('🗑️ Tarea eliminada.');
    }
  };

  const handleAdvanceTaskStatus = (id: string) => {
    setIsCustomized(true);
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const statuses: ('TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED')[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'];
      const curIndex = statuses.indexOf(t.status as any);
      const nextStatus = statuses[(curIndex + 1) % statuses.length];
      return { ...t, status: nextStatus };
    }));
  };

  const handleSaveDocument = (data: Partial<Document>) => {
    setIsCustomized(true);

    if (data.id) {
      setDocuments(prev => prev.map(d => d.id === data.id ? { ...d, ...data } as Document : d));
    } else {
      const newDoc: Document = {
        id: 'pdoc-' + Date.now(),
        title: data.title || 'Nuevo Documento',
        format: data.format || 'image',
        docType: data.docType || 'IMAGE',
        typeLabel: data.typeLabel || 'Documento',
        projectId: data.projectId || projects[0]?.id || 'PRJ-01',
        date: data.date || new Date().toISOString().split('T')[0],
        updatedAt: data.date || new Date().toISOString().split('T')[0],
        fileUrl: data.fileUrl || '#',
        previewUrl: data.previewUrl,
        description: data.description || 'Documento adjunto'
      };
      setDocuments(prev => [newDoc, ...prev]);
    }

    setCurrentView('docs');
    triggerToast('✅ Documento guardado exitosamente.');
  };

  const handleDeleteDocument = (id: string) => {
    if (confirm('¿Eliminar este documento?')) {
      setIsCustomized(true);
      setDocuments(prev => prev.filter(d => d.id !== id));
      triggerToast('🗑️ Documento eliminado.');
    }
  };

  const handleSaveWikiDoc = (updatedWikiDoc: WikiDoc) => {
    setIsCustomized(true);
    setWikiDocs(prev => prev.map(w => w.id === updatedWikiDoc.id ? updatedWikiDoc : w));
    triggerToast('✅ Nota guardada exitosamente.');
  };

  const handleOpenLightbox = (doc: Document) => {
    setLightboxDoc(doc);
    setIsLightboxOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F2F2F7] dark:bg-[#0A0A0C] text-[#1C1C1E] dark:text-[#F2F2F7]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        activeProjectFilter={activeProjectFilter}
        setActiveProjectFilter={setActiveProjectFilter}
        projects={projects}
        onAddProject={handleOpenNewProjectModal}
        onEditProject={handleOpenEditProjectModal}
        onDeleteProject={handleDeleteProject}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          projects={projects}
          activeProjectFilter={activeProjectFilter}
          setActiveProjectFilter={setActiveProjectFilter}
          openSpotlight={() => setIsSpotlightOpen(true)}
          openActionModal={() => handleOpenNewActionModal('doc')}
          openProjectModal={handleOpenNewProjectModal}
          onShareLink={handleShareLink}
          onSaveToCloud={handleSaveToCloudManual}
          saveStatus={saveStatus}
        />

        <main className="flex-1 p-4 md:p-7 overflow-y-auto">
          {currentView === 'dashboard' && (
            <OverviewDashboard
              projects={projects}
              expenses={expenses}
              tasks={tasks}
              activeProjectFilter={activeProjectFilter}
            />
          )}

          {currentView === 'expenses' && (
            <ExpenseTracker
              expenses={expenses}
              projects={projects}
              activeProjectFilter={activeProjectFilter}
              onAddExpense={() => handleOpenNewActionModal('expense')}
              onEditExpense={(exp) => {
                setEditType('expense');
                setEditItem(exp);
                setIsActionModalOpen(true);
              }}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {currentView === 'tasks' && (
            <TaskManager
              tasks={tasks}
              projects={projects}
              activeProjectFilter={activeProjectFilter}
              onAddTask={() => handleOpenNewActionModal('task')}
              onEditTask={(task) => {
                setEditType('task');
                setEditItem(task);
                setIsActionModalOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onAdvanceTaskStatus={handleAdvanceTaskStatus}
            />
          )}

          {currentView === 'docs' && (
            <ProjectDocuments
              documents={documents}
              projects={projects}
              activeProjectFilter={activeProjectFilter}
              onAddDocument={() => handleOpenNewActionModal('doc')}
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
              wikiDocs={wikiDocs}
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsShareModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Compartir Workspace</h3>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Este enlace contiene el estado codificado de tu workspace. Cualquiera que lo abra verá el 100% de tus datos al instante.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareableUrl}
                className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono select-all outline-none"
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

      {/* Modals */}
      <SpotlightModal
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        tasks={tasks}
        expenses={expenses}
        documents={documents}
        onSelectResult={(view) => setCurrentView(view)}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
        projectToEdit={projectToEdit}
        projectCategories={projectCategories}
      />

      <ActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        projects={projects}
        onSaveExpense={handleSaveExpense}
        onSaveTask={handleSaveTask}
        onSaveDocument={handleSaveDocument}
        categories={categories}
        editType={editType}
        editItem={editItem}
      />

      {lightboxDoc && (
        <ImageLightboxModal
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          document={lightboxDoc}
          projects={projects}
        />
      )}
    </div>
  );
}
