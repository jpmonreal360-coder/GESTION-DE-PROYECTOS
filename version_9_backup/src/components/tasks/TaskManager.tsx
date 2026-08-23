'use client';

import React, { useState } from 'react';
import { Task, TaskStatus, Project } from '@/types';
import { Plus, LayoutGrid, List, Edit2, Trash2 } from 'lucide-react';

interface TaskManagerProps {
  tasks: Task[];
  projects?: Project[];
  activeProjectFilter: string;
  onAddTask?: () => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  onAdvanceTaskStatus?: (id: string) => void;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
  activeProjectFilter,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onAdvanceTaskStatus,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  const filteredTasks = tasks.filter(
    (t) => activeProjectFilter === 'all' || t.projectId === activeProjectFilter
  );

  const columns: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'TODO', title: 'Por Hacer', color: 'bg-amber-500' },
    { id: 'IN_PROGRESS', title: 'En Progreso', color: 'bg-blue-500' },
    { id: 'IN_REVIEW', title: 'En Revisión', color: 'bg-purple-500' },
    { id: 'COMPLETED', title: 'Completado', color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 w-full">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 break-words">
            Gestión de Tareas
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Asignación de responsables y fechas límite completamente editables
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto shrink-0">
          {/* View Mode Toggle */}
          <div className="flex items-center justify-center p-1 rounded-xl bg-neutral-200/60 dark:bg-neutral-800 border border-neutral-300/40 dark:border-neutral-700/50 text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabla</span>
            </button>
          </div>

          <button
            onClick={onAddTask}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-start min-w-0">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="p-3.5 sm:p-4 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 min-h-[300px] sm:min-h-[480px] flex flex-col gap-3 min-w-0"
              >
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200/40 dark:border-neutral-800/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.color}`} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 truncate">
                      {col.title}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-neutral-200/60 dark:bg-neutral-800 text-[11px] font-bold text-neutral-500 shrink-0">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {colTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 sm:p-3.5 rounded-xl bg-white/90 dark:bg-neutral-900/90 border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm hover:border-blue-500/50 transition space-y-2 group min-w-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2">
                          {t.title}
                        </p>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                          {onEditTask && (
                            <button
                              onClick={() => onEditTask(t)}
                              className="action-btn-sm"
                              title="Editar Tarea"
                            >
                              <Edit2 className="w-2.5 h-2.5 text-neutral-400" />
                            </button>
                          )}
                          {onDeleteTask && (
                            <button
                              onClick={() => onDeleteTask(t.id)}
                              className="action-btn-sm action-btn-danger"
                              title="Eliminar Tarea"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 flex-wrap gap-1">
                        <span>👤 {t.assigneeName || t.assignee || 'Sin asignar'}</span>
                        <span className="font-mono">📅 {t.dueDate}</span>
                      </div>

                      {onAdvanceTaskStatus && col.id !== 'COMPLETED' && (
                        <button
                          onClick={() => onAdvanceTaskStatus(t.id)}
                          className="w-full mt-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-500 hover:text-white text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 transition text-center"
                        >
                          Avanzar Estado ➔
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden shadow-sm min-w-0">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <table className="w-full text-left border-collapse min-w-[620px]">
              <thead>
                <tr className="bg-neutral-100/60 dark:bg-neutral-800/40 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-200/50 dark:border-neutral-800/50">
                  <th className="px-4 sm:px-6 py-3.5">Título</th>
                  <th className="px-4 sm:px-6 py-3.5">Estado</th>
                  <th className="px-4 sm:px-6 py-3.5">Prioridad</th>
                  <th className="px-4 sm:px-6 py-3.5">Responsable</th>
                  <th className="px-4 sm:px-6 py-3.5">Fecha Límite</th>
                  <th className="px-4 sm:px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/50 dark:divide-neutral-800/50 text-xs">
                {filteredTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-white/40 dark:hover:bg-neutral-800/30 transition">
                    <td className="px-4 sm:px-6 py-4 font-semibold text-neutral-900 dark:text-neutral-100">
                      {t.title}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500">
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-neutral-600 dark:text-neutral-400">
                      {t.assigneeName || t.assignee || 'Sin asignar'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-neutral-500 font-mono">📅 {t.dueDate}</td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        {onEditTask && (
                          <button
                            onClick={() => onEditTask(t)}
                            className="action-btn-sm"
                            title="Editar Tarea"
                          >
                            <Edit2 className="w-3 h-3 text-neutral-400" />
                          </button>
                        )}
                        {onDeleteTask && (
                          <button
                            onClick={() => onDeleteTask(t.id)}
                            className="action-btn-sm action-btn-danger"
                            title="Eliminar Tarea"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
