'use client';

import React, { useState, useEffect } from 'react';
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

export default function Home() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [activeProjectFilter, setActiveProjectFilter] = useState<string>('all');
  
  // Modal States
  const [isSpotlightOpen, setIsSpotlightOpen] = useState<boolean>(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false);
  const [editType, setEditType] = useState<'expense' | 'task' | 'doc' | null>(null);
  const [editItem, setEditItem] = useState<any>(null);

  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [lightboxDoc, setLightboxDoc] = useState<Document | null>(null);

  // Projects State
  const [projects, setProjects] = useState<Project[]>([
    { id: 'PRJ-01', name: 'App iOS Redesign', code: 'IOS-01', budget: 25000, totalBudget: 25000, spent: 18450, spentBudget: 18450, color: '#007AFF', category: 'Mobile App', startDate: '2026-08-01', endDate: '2026-11-30' },
    { id: 'PRJ-02', name: 'SaaS Dashboard v2', code: 'SAAS-02', budget: 18500, totalBudget: 18500, spent: 19200, spentBudget: 19200, color: '#AF52DE', category: 'Web App', startDate: '2026-07-15', endDate: '2026-10-15' },
    { id: 'PRJ-03', name: 'Brand Identity 2026', code: 'BRAND-03', budget: 12000, totalBudget: 12000, spent: 7800, spentBudget: 7800, color: '#FF9500', category: 'Design', startDate: '2026-08-05', endDate: '2026-09-30' }
  ]);

  // Expenses State
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: 'exp-101', type: 'INCOME', concept: 'Anticipo 50% Proyecto Rediseño iOS', amount: 12500, category: 'Facturación / Cobro', projectId: 'PRJ-01', date: '2026-08-01', status: 'PAID' },
    { id: 'exp-102', type: 'INCOME', concept: 'Cobro Hito 1 SaaS Dashboard', amount: 9250, category: 'Facturación / Cobro', projectId: 'PRJ-02', date: '2026-08-05', status: 'PAID' },
    { id: 'exp-103', type: 'INCOME', concept: 'Pago Total Brand Identity 2026', amount: 12000, category: 'Facturación / Cobro', projectId: 'PRJ-03', date: '2026-08-08', status: 'PAID' },
    { id: 'exp-1', type: 'EXPENSE', concept: 'Suscripción Figma Enterprise', amount: 1440, category: 'Software', projectId: 'PRJ-01', date: '2026-08-15', status: 'PAID' },
    { id: 'exp-2', type: 'EXPENSE', concept: 'Servidores AWS & Cloudflare CDN', amount: 3200, category: 'Infraestructura', projectId: 'PRJ-02', date: '2026-08-14', status: 'PAID' }
  ]);

  // Tasks State
  const [tasks, setTasks] = useState<Task[]>([
    { id: 'tsk-1', title: 'Diseñar componentes esmerilados (Glassmorphism)', status: 'IN_PROGRESS', priority: 'HIGH', projectId: 'PRJ-01', assigneeName: 'Edmundo A.', assignee: 'Edmundo A.', dueDate: '2026-08-25', tags: ['UI/UX', 'Apple'] },
    { id: 'tsk-2', title: 'Implementar atajos de teclado Cmd+K para Spotlight', status: 'COMPLETED', priority: 'MEDIUM', projectId: 'PRJ-02', assigneeName: 'Sofia R.', assignee: 'Sofia R.', dueDate: '2026-08-18', tags: ['Frontend'] }
  ]);

  // Documents State
  const [documents, setDocuments] = useState<Document[]>([
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
  ]);

  // Wiki State
  const [wikiDocs] = useState<WikiDoc[]>([
    {
      id: 'doc-1',
      title: 'Guía de Estilo UI/UX - Apple Human Interface Guidelines',
      projectId: 'PRJ-01',
      updatedAt: '2026-08-19',
      content: '### Principios de Diseño\n1. Translucidez y Vidrio Esmerilado\n2. Jerarquía Tipográfica'
    }
  ]);

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

  // Project Handlers
  const handleOpenNewProjectModal = () => {
    setProjectToEdit(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProjectModal = (prj: Project) => {
    setProjectToEdit(prj);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = (data: Partial<Project>) => {
    if (data.id) {
      setProjects(prev => prev.map(p => p.id === data.id ? { ...p, ...data } as Project : p));
    } else {
      const newPrj: Project = {
        id: 'PRJ-' + Date.now(),
        name: data.name || 'Nuevo Proyecto',
        code: data.code || 'PRJ-04',
        budget: data.budget || 20000,
        totalBudget: data.budget || 20000,
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
  };

  const handleDeleteProject = (id: string) => {
    const prj = projects.find(p => p.id === id);
    if (!prj) return;

    if (confirm(`¿Eliminar el proyecto "${prj.name}"? Se borrarán sus transacciones, tareas y documentos.`)) {
      setProjects(prev => prev.filter(p => p.id !== id));
      setExpenses(prev => prev.filter(e => e.projectId !== id));
      setTasks(prev => prev.filter(t => t.projectId !== id));
      setDocuments(prev => prev.filter(d => d.projectId !== id));
      if (activeProjectFilter === id) setActiveProjectFilter('all');
    }
  };

  // Action Modal Handlers (Expenses, Tasks, Documents)
  const handleOpenNewActionModal = (type: 'expense' | 'task' | 'doc' = 'doc') => {
    setEditType(null);
    setEditItem(null);
    setIsActionModalOpen(true);
  };

  const handleSaveExpense = (data: Partial<Expense>) => {
    if (data.id) {
      setExpenses(prev => prev.map(e => e.id === data.id ? { ...e, ...data } as Expense : e));
    } else {
      const newExp: Expense = {
        id: 'exp-' + Date.now(),
        type: data.type || 'EXPENSE',
        concept: data.concept || 'Nuevo Gasto',
        amount: data.amount || 0,
        category: data.category || 'General',
        projectId: data.projectId || projects[0]?.id || 'PRJ-01',
        date: data.date || new Date().toISOString().split('T')[0],
        status: 'PAID'
      };
      setExpenses(prev => [newExp, ...prev]);
    }
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('¿Eliminar esta transacción financiera?')) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleSaveTask = (data: Partial<Task>) => {
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
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('¿Eliminar esta tarea?')) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleAdvanceTaskStatus = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const statuses: ('TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED')[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'];
      const curIndex = statuses.indexOf(t.status as any);
      const nextStatus = statuses[(curIndex + 1) % statuses.length];
      return { ...t, status: nextStatus };
    }));
  };

  const handleSaveDocument = (data: Partial<Document>) => {
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
  };

  const handleDeleteDocument = (id: string) => {
    if (confirm('¿Eliminar este documento?')) {
      setDocuments(prev => prev.filter(d => d.id !== id));
    }
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
          onShareLink={() => {}}
        />

        <main className="flex-1 p-7 overflow-y-auto">
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
            />
          )}
        </main>
      </div>

      {/* Project Modal */}
      {isProjectModalOpen && (
        <ProjectModal
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          projectToEdit={projectToEdit}
          onSave={handleSaveProject}
        />
      )}

      {/* Generic Action Modal (Finance, Tasks, Docs with Ctrl+V Paste) */}
      {isActionModalOpen && (
        <ActionModal
          isOpen={isActionModalOpen}
          onClose={() => setIsActionModalOpen(false)}
          projects={projects}
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
