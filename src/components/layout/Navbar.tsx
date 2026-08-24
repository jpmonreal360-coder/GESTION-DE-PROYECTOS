'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Project } from '@/types';
import { Search, Share2, Folder, Save, Cloud, Check, Loader2, Layers, Menu, ChevronDown } from 'lucide-react';
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
  onOpenMobileMenu?: () => void;
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
  saveStatus = 'idle',
  onOpenMobileMenu
}: NavbarProps) {
  const activeProject = projects.find(p => p.id === activeProjectFilter);
  const handlePrimaryNewAction = openBatchModal || openActionModal;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 sm:h-16 px-3 sm:px-4 md:px-7 border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white/70 dark:bg-[#121215]/70 backdrop-blur-md flex items-center justify-between gap-2 sticky top-0 z-30 min-w-0">
      {/* Left Group: Mobile Menu Toggle & Project Switcher */}
      <div className="flex items-center gap-2 min-w-0 shrink">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="p-1.5 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 md:hidden transition shrink-0"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Custom Apple Glass Popover Dropdown Switcher */}
        <div className="relative min-w-0" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/60 text-xs font-semibold text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer min-w-0 max-w-[calc(100vw-11rem)] sm:max-w-xs hover:bg-neutral-200/50 dark:hover:bg-neutral-700/60 transition"
          >
            <Folder className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="truncate">
              {activeProjectFilter === 'all'
                ? `Todos los Proyectos (${projects.length})`
                : activeProject?.name || activeProjectFilter}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 max-h-64 overflow-y-auto bg-white/95 dark:bg-[#16161a]/95 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl shadow-2xl backdrop-blur-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  setActiveProjectFilter('all');
                  setIsDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  activeProjectFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <Layers className="w-4 h-4 shrink-0 text-blue-400" />
                  <span className="truncate">Todos los Proyectos ({projects.length})</span>
                </div>
                {activeProjectFilter === 'all' && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>

              <div className="h-px bg-neutral-200/60 dark:bg-neutral-800 my-1" />

              {projects.map((p) => {
                const isSelected = activeProjectFilter === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveProjectFilter(p.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-purple-600 text-white'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || '#007AFF' }} />
                      <span className="truncate">{p.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Cloud Save Status Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all duration-300 shrink-0">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 px-2.5 py-0.5 rounded-full">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Guardando...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 px-2.5 py-0.5 rounded-full">
              <Check className="w-3.5 h-3.5" />
              <span>Guardado</span>
            </span>
          )}
          {(saveStatus === 'idle' || saveStatus === 'ready') && (
            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60 px-2.5 py-0.5 rounded-full">
              <Cloud className="w-3.5 h-3.5" />
              <span>Sincronizado</span>
            </span>
          )}
          {saveStatus === 'offline-readonly' && (
            <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 px-2.5 py-0.5 rounded-full">
              <span>⚠️ Sin Conexión (Lectura)</span>
            </span>
          )}
          {saveStatus === 'conflict' && (
            <span className="flex items-center gap-1.5 text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 px-2.5 py-0.5 rounded-full">
              <span>⚠️ Conflicto</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 px-2.5 py-0.5 rounded-full">
              <span>⚠️ Error</span>
            </span>
          )}
        </div>
      </div>

      {/* Right Group: Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
        {/* Spotlight Search (⌘K) */}
        <button
          onClick={openSpotlight}
          className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200/80 dark:hover:bg-neutral-700/80 text-neutral-500 dark:text-neutral-400 text-xs font-medium border border-neutral-200/80 dark:border-neutral-700/60 transition"
        >
          <Search className="w-3.5 h-3.5 text-purple-600" />
          <span>Buscar...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-neutral-200 dark:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-300">⌘K</kbd>
        </button>

        {/* Manual Cloud Save Button */}
        <button
          onClick={onSaveToCloud}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 shrink-0"
          title="Guardar todos los cambios en la Nube inmediatamente"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Guardar</span>
        </button>

        {/* Share Link Button */}
        <button
          onClick={onShareLink}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 shrink-0"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Compartir</span>
        </button>

        {/* Primary Mass Batch Capture Button */}
        <button
          onClick={handlePrimaryNewAction}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition active:scale-95 shrink-0 cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden xs:inline sm:hidden">+ Captura</span>
          <span className="hidden sm:inline">+ Nuevo Registro</span>
        </button>
      </div>
    </header>
  );
}
