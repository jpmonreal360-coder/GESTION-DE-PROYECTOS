'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { realtimeSync, SyncPayload, SaveStatus } from '@/lib/firebaseSync';
import { X, Copy, CheckCircle } from 'lucide-react';

// URL-Safe Encoder & Decoder
const urlSafeEncodeObj = (obj: any): string => {
  const jsonStr = JSON.stringify(obj);
  const base64 = btoa(encodeURIComponent(jsonStr));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const urlSafeDecodeStr = (str: string): any => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const jsonStr = decodeURIComponent(atob(base64));
  return JSON.parse(jsonStr);
};

export default function Home() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [activeProjectFilter, setActiveProjectFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

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
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
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

  // Subscribe to Realtime Engine Status & Incoming State
  useEffect(() => {
    realtimeSync.onStatusChange((status) => {
      setSaveStatus(status);
    });

    realtimeSync.subscribe((data: SyncPayload) => {
      if (!isSyncing && data) {
        setIsSyncing(true);
        setIsCustomized(true);

        if (Array.isArray(data.projects)) setProjects(data.projects);
        if (Array.isArray(data.expenses)) setExpenses(data.expenses);
        if (Array.isArray(data.tasks)) setTasks(data.tasks);
        if (Array.isArray(data.documents)) setDocuments(data.documents);
        if (Array.isArray(data.wikiDocs)) setWikiDocs(data.wikiDocs);
        if (Array.isArray(data.categories)) setCategories(data.categories);
        if (Array.isArray(data.projectCategories)) setProjectCategories(data.projectCategories);

        triggerToast('⚡ ¡Cambios sincronizados en vivo en tu pantalla!');
        setTimeout(() => setIsSyncing(false), 300);
      }
    });
  }, [isSyncing]);

  // Read Workspace Room ID or Hash on initial mount (Bypasses localStorage when URL contains room ID)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        let wsId = 'rc_ws_main';
        let legacyData: any = null;
        let isUrlRoomProvided = false;

        const hash = window.location.hash;
        const search = window.location.search;

        if (hash.includes('w=')) {
          wsId = hash.split('w=')[1].split('&')[0];
          isUrlRoomProvided = true;
        } else if (search.includes('w=')) {
          const params = new URLSearchParams(search);
          wsId = params.get('w') || 'rc_ws_main';
          isUrlRoomProvided = true;
        } else if (hash.includes('state=')) {
          const encoded = hash.split('state=')[1];
          legacyData = urlSafeDecodeStr(encoded);
          if (legacyData && legacyData.workspaceId) {
            wsId = legacyData.workspaceId;
          }
          isUrlRoomProvided = true;
        }

        setWorkspaceId(wsId);
        realtimeSync.setWorkspaceId(wsId);

        if (legacyData) {
          setIsCustomized(true);
          if (Array.isArray(legacyData.projects)) setProjects(legacyData.projects);
          if (Array.isArray(legacyData.expenses)) setExpenses(legacyData.expenses);
          if (Array.isArray(legacyData.tasks)) setTasks(legacyData.tasks);
          if (Array.isArray(legacyData.documents)) setDocuments(legacyData.documents);
          if (Array.isArray(legacyData.wikiDocs)) setWikiDocs(legacyData.wikiDocs);
          if (Array.isArray(legacyData.categories)) setCategories(legacyData.categories);
          if (Array.isArray(legacyData.projectCategories)) setProjectCategories(legacyData.projectCategories);

          window.history.replaceState(null, '', `${window.location.pathname}#w=${wsId}`);
          triggerToast('🔗 ¡Sala de workspace sincronizada desde la URL!');
        } else {
          // Fetch latest Cloud State directly from DB Server (Strict anti-cache)
          realtimeSync.fetchFromCloud().then(cloudData => {
            if (cloudData) {
              setIsCustomized(true);
              if (Array.isArray(cloudData.projects)) setProjects(cloudData.projects);
              if (Array.isArray(cloudData.expenses)) setExpenses(cloudData.expenses);
              if (Array.isArray(cloudData.tasks)) setTasks(cloudData.tasks);
              if (Array.isArray(cloudData.documents)) setDocuments(cloudData.documents);
              if (Array.isArray(cloudData.wikiDocs)) setWikiDocs(cloudData.wikiDocs);
              if (Array.isArray(cloudData.categories)) setCategories(cloudData.categories);
              if (Array.isArray(cloudData.projectCategories)) setProjectCategories(cloudData.projectCategories);
            } else if (!isUrlRoomProvided) {
              // ONLY check localStorage if NO URL room parameter was provided!
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
              }
            }
          });
        }
      }
    } catch (err) {
      console.warn('Error al cargar datos:', err);
    }
  }, []);

  // Save state to LocalStorage & Publish to Realtime Engine!
  useEffect(() => {
    localStorage.setItem('rc_is_customized', 'true');
    localStorage.setItem('rc_projects', JSON.stringify(projects));
    localStorage.setItem('rc_expenses', JSON.stringify(expenses));
    localStorage.setItem('rc_tasks', JSON.stringify(tasks));
    localStorage.setItem('rc_docs', JSON.stringify(documents));
    localStorage.setItem('rc_wiki', JSON.stringify(wikiDocs));
    localStorage.setItem('rc_categories', JSON.stringify(categories));
    localStorage.setItem('rc_prj_categories', JSON.stringify(projectCategories));

    try {
      if (typeof window !== 'undefined' && !isSyncing) {
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

        // Publish live updates to Cloud DB under workspaceId
        realtimeSync.saveToCloud(stateObj);

        // Keep clean Room URL in address bar
        const newHash = `#w=${workspaceId}`;
        if (window.location.hash !== newHash) {
          window.history.replaceState(null, '', `${window.location.pathname}${newHash}`);
        }
      }
    } catch (err) {
      console.warn('Error publicando estado:', err);
    }
  }, [projects, expenses, tasks, documents, wikiDocs, categories, projectCategories, isSyncing, workspaceId]);

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

    const isSuccess = await realtimeSync.saveToCloud(stateObj);
    if (isSuccess) {
      triggerToast('💾 ¡Todos tus cambios han sido GRABADOS en la Nube exitosamente!');
    } else {
      triggerToast('⚠️ No se pudo conectar al servidor remoto. Usa el enlace compartido para enviar los datos.');
    }
  }, [projects, expenses, tasks, documents, wikiDocs, categories, projectCategories]);

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

      const isSaved = await realtimeSync.saveToCloud(stateObj);

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

  // Project Handlers with Mandatory Cloud Save
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
    let updatedProjects: Project[];

    if (data.category && !projectCategories.includes(data.category)) {
      setProjectCategories(prev => [...prev, data.category!]);
    }

    if (data.id) {
      updatedProjects = projects.map(p => p.id === data.id ? { ...p, ...data } as Project : p);
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
      updatedProjects = [...projects, newPrj];
      setActiveProjectFilter(newPrj.id);
    }

    setProjects(updatedProjects);

    // Immediate Explicit Cloud Save
    realtimeSync.saveToCloud({
      isCustomized: true,
      projects: updatedProjects,
      expenses,
      tasks,
      documents,
      wikiDocs,
      categories,
      projectCategories,
    });

    triggerToast('✅ Proyecto grabado exitosamente en la Nube.');
  };

  const handleDeleteProject = (id: string) => {
    const prj = projects.find(p => p.id === id);
    if (!prj) return;

    if (confirm(`¿Eliminar el proyecto "${prj.name}"? Se borrarán sus transacciones, tareas y documentos en la nube.`)) {
      setIsCustomized(true);
      const updatedProjects = projects.filter(p => p.id !== id);
      const updatedExpenses = expenses.filter(e => e.projectId !== id);
      const updatedTasks = tasks.filter(t => t.projectId !== id);
      const updatedDocs = documents.filter(d => d.projectId !== id);

      setProjects(updatedProjects);
      setExpenses(updatedExpenses);
      setTasks(updatedTasks);
      setDocuments(updatedDocs);
      if (activeProjectFilter === id) setActiveProjectFilter('all');

      // Immediate Explicit Cloud Save for Deletion!
      realtimeSync.saveToCloud({
        isCustomized: true,
        projects: updatedProjects,
        expenses: updatedExpenses,
        tasks: updatedTasks,
        documents: updatedDocs,
        wikiDocs,
        categories,
        projectCategories,
      });

      triggerToast(`🗑️ Proyecto "${prj.name}" y sus datos fueron ELIMINADOS y GRABADOS en la Nube.`);
    }
  };

  // Action Modal Handlers
  const handleOpenNewActionModal = (type: 'expense' | 'task' | 'doc' = 'doc') => {
    setEditType(null);
    setEditItem(null);
    setIsActionModalOpen(true);
  };

  const handleSaveExpense = (data: Partial<Expense>) => {
    setIsCustomized(true);
    let updatedExpenses: Expense[];

    if (data.category && !categories.includes(data.category)) {
      setCategories(prev => [...prev, data.category!]);
    }

    if (data.id) {
      updatedExpenses = expenses.map(e => e.id === data.id ? { ...e, ...data } as Expense : e);
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
      updatedExpenses = [newExp, ...expenses];
    }

    setExpenses(updatedExpenses);

    realtimeSync.saveToCloud({
      isCustomized: true,
      projects,
      expenses: updatedExpenses,
      tasks,
      documents,
      wikiDocs,
      categories,
      projectCategories,
    });

    triggerToast('✅ Transacción grabada exitosamente en la Nube.');
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('¿Eliminar esta transacción financiera?')) {
      setIsCustomized(true);
      const updated = expenses.filter(e => e.id !== id);
      setExpenses(updated);

      realtimeSync.saveToCloud({
        isCustomized: true,
        projects,
        expenses: updated,
        tasks,
        documents,
        wikiDocs,
        categories,
        projectCategories,
      });

      triggerToast('🗑️ Transacción eliminada y grabada en la Nube.');
    }
  };

  const handleSaveTask = (data: Partial<Task>) => {
    setIsCustomized(true);
    let updatedTasks: Task[];

    if (data.id) {
      updatedTasks = tasks.map(t => t.id === data.id ? { ...t, ...data } as Task : t);
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
      updatedTasks = [newTask, ...tasks];
    }

    setTasks(updatedTasks);

    realtimeSync.saveToCloud({
      isCustomized: true,
      projects,
      expenses,
      tasks: updatedTasks,
      documents,
      wikiDocs,
      categories,
      projectCategories,
    });

    triggerToast('✅ Tarea grabada exitosamente en la Nube.');
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('¿Eliminar esta tarea?')) {
      setIsCustomized(true);
      const updated = tasks.filter(t => t.id !== id);
      setTasks(updated);

      realtimeSync.saveToCloud({
        isCustomized: true,
        projects,
        expenses,
        tasks: updated,
        documents,
        wikiDocs,
        categories,
        projectCategories,
      });

      triggerToast('🗑️ Tarea eliminada y grabada en la Nube.');
    }
  };

  const handleAdvanceTaskStatus = (id: string) => {
    setIsCustomized(true);
    const updatedTasks = tasks.map(t => {
      if (t.id !== id) return t;
      const statuses: ('TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED')[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'];
      const curIndex = statuses.indexOf(t.status as any);
      const nextStatus = statuses[(curIndex + 1) % statuses.length];
      return { ...t, status: nextStatus };
    });

    setTasks(updatedTasks);

    realtimeSync.saveToCloud({
      isCustomized: true,
      projects,
      expenses,
      tasks: updatedTasks,
      documents,
      wikiDocs,
      categories,
      projectCategories,
    });
  };

  const handleSaveDocument = (data: Partial<Document>) => {
    setIsCustomized(true);
    let updatedDocs: Document[];

    if (data.id) {
      updatedDocs = documents.map(d => d.id === data.id ? { ...d, ...data } as Document : d);
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
      updatedDocs = [newDoc, ...documents];
    }

    setDocuments(updatedDocs);
    setCurrentView('docs');

    realtimeSync.saveToCloud({
      isCustomized: true,
      projects,
      expenses,
      tasks,
      documents: updatedDocs,
      wikiDocs,
      categories,
      projectCategories,
    });

    triggerToast('✅ Documento grabado exitosamente en la Nube.');
  };

  const handleDeleteDocument = (id: string) => {
    if (confirm('¿Eliminar este documento?')) {
      setIsCustomized(true);
      const updated = documents.filter(d => d.id !== id);
      setDocuments(updated);

      realtimeSync.saveToCloud({
        isCustomized: true,
        projects,
        expenses,
        tasks,
        documents: updated,
        wikiDocs,
        categories,
        projectCategories,
      });

      triggerToast('🗑️ Documento eliminado y grabado en la Nube.');
    }
  };

  const handleSaveWikiDoc = (updatedWikiDoc: WikiDoc) => {
    setIsCustomized(true);
    const updatedWiki = wikiDocs.map(w => w.id === updatedWikiDoc.id ? updatedWikiDoc : w);
    setWikiDocs(updatedWiki);

    realtimeSync.saveToCloud({
      isCustomized: true,
      projects,
      expenses,
      tasks,
      documents,
      wikiDocs: updatedWiki,
      categories,
      projectCategories,
    });

    triggerToast('✅ Nota grabada exitosamente en la Nube.');
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
          onClick={() => setIsShareModalOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[540px] max-w-[95vw] p-6 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span>🔗 Compartir Sala de Trabajo Sincronizada</span>
              </h3>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Este enlace te conecta a una <strong>Sala de Trabajo en Vivo</strong>. Cualquier persona que tenga este enlace verá todos tus cambios presentes y futuros en tiempo real, incluso si hacen refresh o si tú editas después de enviar el link.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareableUrl}
                className="flex-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono text-neutral-800 dark:text-neutral-200 outline-none truncate"
              />
              <button
                onClick={copyShareableUrl}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition shrink-0"
              >
                {isCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? '¡Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Modal */}
      {isProjectModalOpen && (
        <ProjectModal
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          projectToEdit={projectToEdit}
          projectCategories={projectCategories}
          onSave={handleSaveProject}
        />
      )}

      {/* Generic Action Modal */}
      {isActionModalOpen && (
        <ActionModal
          isOpen={isActionModalOpen}
          onClose={() => setIsActionModalOpen(false)}
          projects={projects}
          categories={categories}
          editType={editType}
          editItem={editItem}
          onSaveExpense={handleSaveExpense}
          onSaveTask={handleSaveTask}
          onSaveDocument={handleSaveDocument}
        />
      )}

      {/* Image Lightbox HD Modal Viewer */}
      {isLightboxOpen && (
        <ImageLightboxModal
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          document={lightboxDoc}
          projects={projects}
        />
      )}

      {/* Global Command Palette Spotlight (⌘K) */}
      {isSpotlightOpen && (
        <SpotlightModal
          isOpen={isSpotlightOpen}
          onClose={() => setIsSpotlightOpen(false)}
          tasks={tasks}
          expenses={expenses}
          documents={documents}
          onSelectResult={(view) => {
            setCurrentView(view);
            setIsSpotlightOpen(false);
          }}
        />
      )}
    </div>
  );
}
