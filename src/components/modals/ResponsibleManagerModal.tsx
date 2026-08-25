'use client';

import React, { useState } from 'react';
import { Responsible, Task } from '@/types';
import { X, UserPlus, Edit2, Trash2, Archive, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ResponsibleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  responsibles: Responsible[];
  tasks: Task[];
  onSaveResponsible: (resp: Partial<Responsible>) => void;
  onDeleteResponsible: (id: string, forceUnassign: boolean) => Promise<void>;
  onArchiveResponsible: (id: string) => void;
}

const PRESET_COLORS = [
  '#007AFF', // Apple Blue
  '#AF52DE', // Apple Purple
  '#34C759', // Apple Green
  '#FF9500', // Apple Orange
  '#FF3B30', // Apple Red
  '#5856D6', // Apple Indigo
  '#00C7BE', // Apple Teal
  '#FF2D55'  // Apple Pink
];

export const ResponsibleManagerModal: React.FC<ResponsibleManagerModalProps> = ({
  isOpen,
  onClose,
  responsibles,
  tasks,
  onSaveResponsible,
  onDeleteResponsible,
  onArchiveResponsible
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Safety deletion state
  const [deletingResp, setDeletingResp] = useState<{ resp: Responsible; affectedCount: number } | null>(null);
  const [confirmUnassignCheckbox, setConfirmUnassignCheckbox] = useState(false);

  if (!isOpen) return null;

  const handleStartEdit = (resp: Responsible) => {
    setEditingId(resp.id);
    setName(resp.name);
    setColor(resp.color || PRESET_COLORS[0]);
    setErrorMsg('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setColor(PRESET_COLORS[0]);
    setErrorMsg('');
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('El nombre del responsable es obligatorio.');
      return;
    }

    // Check duplicate name ignoring case
    const isDuplicate = responsibles.some(
      r => r.id !== editingId && r.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      setErrorMsg(`Ya existe un responsable con el nombre "${trimmedName}".`);
      return;
    }

    onSaveResponsible({
      id: editingId || undefined,
      name: trimmedName,
      color
    });

    handleCancelEdit();
  };

  const handleInitiateDelete = (resp: Responsible) => {
    // Count tasks assigned to this responsible (by assigneeIds or matching assigneeName)
    const affectedTasks = tasks.filter(t => 
      (t.assigneeIds && t.assigneeIds.includes(resp.id)) ||
      (t.assigneeName && t.assigneeName.trim().toLowerCase() === resp.name.trim().toLowerCase())
    );

    const affectedCount = affectedTasks.length;

    if (affectedCount === 0) {
      if (confirm(`¿Eliminar al responsable "${resp.name}"?`)) {
        void onDeleteResponsible(resp.id, false);
      }
    } else {
      setDeletingResp({ resp, affectedCount });
      setConfirmUnassignCheckbox(false);
    }
  };

  const handleConfirmUnassignDelete = async () => {
    if (!deletingResp || !confirmUnassignCheckbox) return;
    await onDeleteResponsible(deletingResp.resp.id, true);
    setDeletingResp(null);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[85dvh] overflow-y-auto p-4 sm:p-6 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl space-y-5 text-neutral-900 dark:text-neutral-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200/40 dark:border-neutral-800/40 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-500" />
            <h3 className="text-base sm:text-lg font-bold">Catálogo de Responsables</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-neutral-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delete Safety Warning Dialog Overlay */}
        {deletingResp ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Advertencia de Borrado Seguro</span>
            </div>

            <p className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
              El responsable <strong>«{deletingResp.resp.name}»</strong> tiene{' '}
              <span className="font-bold text-red-600 dark:text-red-400">
                {deletingResp.affectedCount} tarea(s) asignada(s)
              </span>. 
              El borrado silencioso está bloqueado. Elige una acción:
            </p>

            <div className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 space-y-2">
              <label className="flex items-start gap-2 text-xs font-semibold cursor-pointer text-neutral-800 dark:text-neutral-200">
                <input
                  type="checkbox"
                  checked={confirmUnassignCheckbox}
                  onChange={(e) => setConfirmUnassignCheckbox(e.target.checked)}
                  className="mt-0.5 rounded text-red-600 focus:ring-red-500"
                />
                <span>
                  Confirmo que deseo desasignar a «{deletingResp.resp.name}» de las {deletingResp.affectedCount} tareas y eliminar su registro del catálogo sin borrar las tareas.
                </span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingResp(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  onArchiveResponsible(deletingResp.resp.id);
                  setDeletingResp(null);
                }}
                className="py-2 px-3 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 transition flex items-center justify-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archivar responsable</span>
              </button>

              <button
                type="button"
                disabled={!confirmUnassignCheckbox}
                onClick={handleConfirmUnassignDelete}
                className={`py-2 px-3 rounded-xl text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                  confirmUnassignCheckbox
                    ? 'bg-red-600 hover:bg-red-500 cursor-pointer'
                    : 'bg-neutral-400 opacity-50 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Desasignar ({deletingResp.affectedCount}) y Eliminar</span>
              </button>
            </div>
          </div>
        ) : (
          /* Form for Add/Edit */
          <form onSubmit={handleSubmitForm} className="space-y-3 p-3.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              {editingId ? 'Editar Responsable' : 'Agregar Nuevo Responsable'}
            </h4>

            {errorMsg && (
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre completo (ej. Edmundo A. / Sofía R.)"
                className="flex-1 p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs outline-none"
              />

              <div className="flex items-center gap-1.5 shrink-0">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border transition ${
                      color === c ? 'border-black dark:border-white scale-110 shadow-sm' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-700 transition"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition"
              >
                {editingId ? 'Guardar Cambios' : 'Agregar Responsable'}
              </button>
            </div>
          </form>
        )}

        {/* List of Responsibles */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Responsibles en Catálogo ({responsibles.length})
          </h4>

          {responsibles.length === 0 ? (
            <p className="text-xs text-neutral-400 italic py-2">
              No hay responsables en el catálogo. Puedes agregar uno arriba o migrar los asignados heredados.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {responsibles.map((r) => {
                const isArchived = Boolean(r.archivedAt);
                const assignedCount = tasks.filter(t => 
                  (t.assigneeIds && t.assigneeIds.includes(r.id)) ||
                  (t.assigneeName && t.assigneeName.trim().toLowerCase() === r.name.trim().toLowerCase())
                ).length;

                return (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                      isArchived
                        ? 'bg-neutral-100/40 dark:bg-neutral-900/40 border-neutral-200/40 dark:border-neutral-800/40 opacity-60'
                        : 'bg-white/80 dark:bg-neutral-900/80 border-neutral-200/60 dark:border-neutral-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: r.color || '#007AFF' }}
                      />
                      <span className="text-xs font-semibold truncate">
                        {r.name}
                      </span>
                      {isArchived && (
                        <span className="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-[10px] font-bold text-neutral-500">
                          Archivado
                        </span>
                      )}
                      <span className="text-[11px] text-neutral-400 font-mono">
                        ({assignedCount} tareas)
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isArchived && (
                        <button
                          onClick={() => handleStartEdit(r)}
                          className="p-1 rounded.lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => onArchiveResponsible(r.id)}
                        className="p-1 rounded-lg text-neutral-400 hover:text-purple-600 transition"
                        title={isArchived ? 'Desarchivar' : 'Archivar'}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleInitiateDelete(r)}
                        className="p-1 rounded-lg text-neutral-400 hover:text-red-600 transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
