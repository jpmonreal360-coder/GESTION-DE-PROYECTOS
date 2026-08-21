'use client';

import React from 'react';
import { Project } from '@/types';
import { Search, Plus, Share2, Folder, Save, Cloud, Check, Loader2, Layers } from 'lucide-react';
import { SaveStatus } from '@/lib/firebaseSync';

interface NavbarProps {
  projects: Project[];
  activeProjectFilter: string;
  setActiveProjectFilter: (id: string) => void;
  openSpotlight: () => void;
  openActionModal: () => void;
  openBatchModal?: () => void;
  openProjectModal: () => void;
  onShareLink: () => void;
  onSaveToCloud?: () => void;
  saveStatus?: SaveStatus;
}

export function Navbar({
  projects,
  activeProjectFilter,
  setActiveProjectFilter,
  openSpotlight,
  openActionModal,
  openBatchModal,
  openProjectModal,
  onShareLink,
  onSaveToCloud,
  saveStatus = 'idle'
}: NavbarProps) {
  const activeProject = projects.find(p => p.id === activeProjectFilter);
  const handlePrimaryNewAction = openBatchModal || openActionModal;

  return (
    <header className="h-16 px-4 md:px-7 border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white/70 dark:bg-[#121215]/70 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Active Project Switcher / Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/60 text-xs font-semibold">
          <Folder className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <select
            value={activeProjectFilter}
            onChange={(e) => setActiveProjectFilter(e.target.value)}
            className="bg-transparent text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer font-medium"
          >
            <option value="all">Todos los Proyectos ({projects.length})</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>
        </div>

        {/* Live Cloud Save Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all duration-300">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 px-2.5 py-0.5 rounded-full">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Guardando en la Nube...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 px-2.5 py-0.5 rounded-full">
              <Check className="w-3.5 h-3.5" />
              <span>✅ Guardado en Nube</span>
            </span>
          )}
          {saveStatus === 'idle' && (
            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60 px-2.5 py-0.5 rounded-full">
              <Cloud className="w-3.5 h-3.5" />
              <span>⚡ Nube Sincronizada</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 px-2.5 py-0.5 rounded-full">
              <span>⚠️ Error de red</span>
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Spotlight Search (⌘K) */}
        <button
          onClick={openSpotlight}
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200/80 dark:hover:bg-neutral-700/80 text-neutral-500 dark:text-neutral-400 text-xs font-medium border border-neutral-200/80 dark:border-neutral-700/60 transition"
        >
          <Search className="w-3.5 h-3.5 text-purple-600" />
          <span>Buscar...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-neutral-200 dark:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-300">⌘K</kbd>
        </button>

        {/* Manual Cloud Save Button */}
        <button
          onClick={onSaveToCloud}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 shrink-0"
          title="Guardar todos los cambios en la Nube inmediatamente"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Guardar en Nube</span>
        </button>

        {/* Share Link Button */}
        <button
          onClick={onShareLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 shrink-0"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Compartir Link</span>
        </button>

        {/* Primary Mass Batch Capture Button */}
        <button
          onClick={handlePrimaryNewAction}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition active:scale-95 shrink-0 cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>+ Nuevo Registro (Captura Masiva)</span>
        </button>
      </div>
    </header>
  );
}
