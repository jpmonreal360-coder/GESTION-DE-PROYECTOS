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
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Gestión de Tareas
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Asignación de responsables y fechas límite completamente editables
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-neutral-200/60 dark:bg-neutral-800 border border-neutral-300/40 dark:border-neutral-700/50 text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="p-4 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 min-h-[480px] flex flex-col gap-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200/40 dark:border-neutral-800/40">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      {col.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-200/50 dark:bg-neutral-800 text-neutral-500">
                    {colTasks.length}
                  </span>
                </div>

                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl apple-glass border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm hover:shadow-md transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p 
                        onClick={() => onAdvanceTaskStatus && onAdvanceTaskStatus(task.id)}
                        className="text-xs font-bold leading-snug text-neutral-900 dark:text-neutral-100 flex-1 cursor-pointer hover:text-blue-500 transition"
                        title="Haz clic para avanzar estado"
                      >
                        {task.title}
                      </p>

                      <div className="flex items-center gap-1 shrink-0">
                        {onEditTask && (
                          <button
                            onClick={() => onEditTask(task)}
                            className="action-btn-sm"
                            title="Editar Tarea & Fecha"
                          >
                            <Edit2 className="w-3 h-3 text-neutral-400" />
                          </button>
                        )}
                        {onDeleteTask && (
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="action-btn-sm action-btn-danger"
                            title="Eliminar Tarea"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                        {task.priority}
                      </span>
                      {(task.tags || []).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full bg-neutral-200/60 dark:bg-neutral-800 text-neutral-500 text-[10px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800/40 text-[10px] text-neutral-400">
                      <span className="font-semibold text-blue-500">👤 {task.assigneeName || task.assignee || 'Edmundo A.'}</span>
                      <span>📅 Límite: {task.dueDate || 'Sin fecha'}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-100/60 dark:bg-neutral-800/40 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-200/50 dark:border-neutral-800/50">
                <th className="px-6 py-3.5">Título</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5">Prioridad</th>
                <th className="px-6 py-3.5">Asignado</th>
                <th className="px-6 py-3.5">Fecha Límite (Editable)</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/50 dark:divide-neutral-800/50 text-xs">
              {filteredTasks.map((t) => (
                <tr key={t.id} className="hover:bg-white/40 dark:hover:bg-neutral-800/30 transition">
                  <td className="px-6 py-4 font-semibold text-neutral-900 dark:text-neutral-100">
                    {t.title}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold text-[11px]">
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[11px]">
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400 font-semibold">
                    👤 {t.assigneeName || t.assignee || 'Edmundo A.'}
                  </td>
                  <td className="px-6 py-4 text-neutral-500 font-medium">📅 {t.dueDate || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      {onEditTask && (
                        <button
                          onClick={() => onEditTask(t)}
                          className="action-btn-sm"
                          title="Editar Tarea & Fecha"
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
      )}
    </div>
  );
};
