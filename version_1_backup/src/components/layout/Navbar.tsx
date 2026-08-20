'use client';

import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  ChevronDown, 
  Search, 
  Moon, 
  Sun, 
  Plus,
  Layers,
  Folder
} from 'lucide-react';
import { Project } from '@/types';

interface NavbarProps {
  projects: Project[];
  activeProjectFilter: string;
  setActiveProjectFilter: (id: string) => void;
  openSpotlight: () => void;
  openActionModal: () => void;
  openProjectModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  projects,
  activeProjectFilter,
  setActiveProjectFilter,
  openSpotlight,
  openActionModal,
  openProjectModal
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('aura-theme') as 'light' | 'dark' || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('aura-theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const activeProject = projects.find(p => p.id === activeProjectFilter);
  const labelText = activeProjectFilter === 'all'
    ? `Todos los Proyectos (${projects.length})`
    : activeProject ? activeProject.name : 'Proyecto';

  return (
    <header className="h-16 px-7 flex items-center justify-between z-20 relative glass-header backdrop-blur-2xl border-b border-neutral-200/50 dark:border-neutral-800/50">
      {/* Left Project Switcher Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-neutral-200/60 dark:bg-neutral-800/60 hover:bg-neutral-300/60 dark:hover:bg-neutral-700/60 border border-neutral-200/50 dark:border-neutral-700/50 text-xs font-semibold text-neutral-900 dark:text-neutral-100 transition-all select-none"
        >
          <Briefcase className="w-4 h-4 text-blue-500" />
          <span>{labelText}</span>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
        </button>

        {isDropdownOpen && (
          <div 
            className="absolute top-full left-0 mt-2 w-72 p-2 rounded-2xl glass-header shadow-2xl border border-neutral-200/80 dark:border-neutral-800/80 z-50 flex flex-col gap-1 backdrop-blur-3xl animate-in fade-in slide-in-from-top-2 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              <span>Seleccionar Proyecto</span>
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  openProjectModal();
                }}
                className="action-btn-sm"
                title="Nuevo Proyecto"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <button
              onClick={() => {
                setActiveProjectFilter('all');
                setIsDropdownOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeProjectFilter === 'all'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Todos los Proyectos</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">{projects.length}</span>
            </button>

            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setActiveProjectFilter(p.id);
                  setIsDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  activeProjectFilter === p.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-purple-400" />
                  <span>{p.name}</span>
                </div>
                <span className="text-[10px] opacity-70">{p.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Navbar Controls */}
      <div className="flex items-center gap-3">
        {/* Spotlight Trigger */}
        <button
          onClick={openSpotlight}
          className="flex items-center gap-3 px-4 py-2 rounded-xl bg-neutral-200/60 dark:bg-neutral-800/60 border border-neutral-200/50 dark:border-neutral-700/50 text-neutral-400 dark:text-neutral-500 text-xs hover:border-blue-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all"
        >
          <Search className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
          <span className="hidden sm:inline">Buscar tareas, PDF, fotos, Google Sheets...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-300/80 dark:bg-neutral-700/80 text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">⌘K</kbd>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-full border border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-200/60 dark:bg-neutral-800/60 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:scale-105 transition-all"
          title="Cambiar Tema Claro / Oscuro"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Quick Add Button */}
        <button
          onClick={openActionModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Registro</span>
        </button>
      </div>
    </header>
  );
};
