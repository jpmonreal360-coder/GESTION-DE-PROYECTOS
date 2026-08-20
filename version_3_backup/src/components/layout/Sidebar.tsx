'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  Kanban, 
  FolderArchive, 
  BookOpen, 
  Layers, 
  Folder, 
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import { Project } from '@/types';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  activeProjectFilter: string;
  setActiveProjectFilter: (id: string) => void;
  projects?: Project[];
  onAddProject?: () => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  activeProjectFilter,
  setActiveProjectFilter,
  projects = [
    { id: 'PRJ-01', name: 'App iOS Redesign', code: 'IOS-01', color: '#007AFF' },
    { id: 'PRJ-02', name: 'SaaS Dashboard v2', code: 'SAAS-02', color: '#AF52DE' },
    { id: 'PRJ-03', name: 'Brand Identity 2026', code: 'BRAND-03', color: '#FF9500' }
  ],
  onAddProject,
  onEditProject,
  onDeleteProject
}) => {
  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'expenses', label: 'Finanzas y Balance', icon: Wallet },
    { id: 'tasks', label: 'Tareas y Kanban', icon: Kanban },
    { id: 'docs', label: 'Documentos Proyecto', icon: FolderArchive },
    { id: 'wiki', label: 'Base de Conocimiento', icon: BookOpen },
  ];

  return (
    <aside className="w-64 min-w-[256px] flex flex-col justify-between p-5 glass-sidebar border-r border-neutral-200/50 dark:border-neutral-800/50 backdrop-blur-3xl z-30">
      <div>
        {/* Sidebar Header */}
        <div className="flex items-center gap-3 px-3 py-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-blue-500/30">
            RC
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">PROYECTOS RC</h1>
            <p className="text-[10px] text-neutral-400">Workspace Studio Pro</p>
          </div>
        </div>

        {/* General Navigation */}
        <nav className="space-y-4">
          <div>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              General
            </p>
            <ul className="space-y-1">
              {mainNav.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setCurrentView(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Active Projects Navigation */}
          <div>
            <div className="flex items-center justify-between px-3 mb-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Proyectos Activos
              </p>
              {onAddProject && (
                <button
                  onClick={onAddProject}
                  className="action-btn-sm"
                  title="Nuevo Proyecto"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>

            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setActiveProjectFilter('all')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    activeProjectFilter === 'all'
                      ? 'bg-neutral-200 dark:bg-neutral-800 text-blue-600 dark:text-blue-400'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  <Layers className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="truncate">Todos los Proyectos</span>
                </button>
              </li>

              {projects.map((p) => {
                const isActive = activeProjectFilter === p.id;
                return (
                  <li key={p.id} className="group flex items-center justify-between">
                    <button
                      onClick={() => setActiveProjectFilter(p.id)}
                      className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-left transition truncate ${
                        isActive
                          ? 'bg-neutral-200 dark:bg-neutral-800 text-purple-600 dark:text-purple-400'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40'
                      }`}
                    >
                      <Folder className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </button>

                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 pr-1 transition">
                      {onEditProject && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditProject(p);
                          }}
                          className="action-btn-sm"
                          title="Editar Proyecto"
                        >
                          <Edit2 className="w-2.5 h-2.5 text-neutral-400" />
                        </button>
                      )}
                      {onDeleteProject && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(p.id);
                          }}
                          className="action-btn-sm action-btn-danger"
                          title="Eliminar Proyecto"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>

      {/* Sidebar Footer User Profile */}
      <div className="pt-4 border-t border-neutral-200/50 dark:border-neutral-800/50">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40 transition cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white font-bold text-xs">
            EA
          </div>
          <div>
            <p className="text-xs font-semibold">Edmundo A.</p>
            <p className="text-[10px] text-neutral-400">Lead Architect</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
