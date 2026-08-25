'use client';

import React, { useState } from 'react';
import { Task, TaskStatus, Project, Responsible } from '@/types';
import {
  Plus,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Users,
  UserCheck,
  ChevronRight,
  GripVertical,
  ArrowLeftRight
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskManagerProps {
  tasks: Task[];
  projects?: Project[];
  responsibles?: Responsible[];
  activeProjectFilter: string;
  onAddTask?: () => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  onMoveTaskPhase?: (taskId: string, targetStatus: TaskStatus, newPosition?: number) => void;
  onOpenResponsibleManager?: () => void;
  onOpenLegacyMigration?: () => void;
  unmigratedTasksCount?: number;
}

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'TODO', title: 'Por Hacer', color: 'bg-amber-500' },
  { id: 'IN_PROGRESS', title: 'En Progreso', color: 'bg-blue-500' },
  { id: 'IN_REVIEW', title: 'En Revisión', color: 'bg-purple-500' },
  { id: 'COMPLETED', title: 'Completado', color: 'bg-emerald-500' },
];

// Sortable Task Card Component
function SortableTaskCard({
  task,
  responsibles,
  onEditTask,
  onDeleteTask,
  onMoveTaskPhase
}: {
  task: Task;
  responsibles: Responsible[];
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  onMoveTaskPhase?: (taskId: string, targetStatus: TaskStatus) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  };

  // Find assigned responsibles
  const assignedResponsibles = (task.assigneeIds && task.assigneeIds.length > 0)
    ? responsibles.filter(r => task.assigneeIds?.includes(r.id))
    : [];

  const legacyName = task.assigneeName || task.assignee;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 sm:p-3.5 rounded-xl bg-white/90 dark:bg-neutral-900/90 border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm hover:border-blue-500/50 transition space-y-2.5 group min-w-0 ${
        isDragging ? 'ring-2 ring-blue-500 shadow-xl' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="mt-0.5 p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-grab active:cursor-grabbing touch-none shrink-0"
            title="Arrastrar para mover de fase o reordenar"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 break-words">
            {task.title}
          </p>
        </div>

        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
          {onEditTask && (
            <button
              onClick={() => onEditTask(task)}
              className="action-btn-sm"
              title="Editar Tarea"
            >
              <Edit2 className="w-2.5 h-2.5 text-neutral-400" />
            </button>
          )}
          {onDeleteTask && (
            <button
              onClick={() => onDeleteTask(task.id)}
              className="action-btn-sm action-btn-danger"
              title="Eliminar Tarea"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Multi-Responsible Chips */}
      <div className="flex flex-wrap items-center gap-1 text-[11px]">
        {assignedResponsibles.length > 0 ? (
          assignedResponsibles.map(r => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs truncate max-w-[120px]"
              style={{ backgroundColor: r.color || '#007AFF' }}
            >
              <span className="truncate">{r.name}</span>
            </span>
          ))
        ) : (
          <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1 text-[11px]">
            <span>👤</span>
            <span className="truncate">{legacyName || 'Sin asignar'}</span>
          </span>
        )}
      </div>

      {/* Task Notes Field Preview */}
      {task.notes && task.notes.trim().length > 0 && (
        <div className="p-2 rounded-lg bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/50 dark:border-neutral-700/50 text-[11px] text-neutral-600 dark:text-neutral-300 break-words whitespace-pre-wrap">
          <span className="font-semibold text-neutral-500 dark:text-neutral-400 block text-[10px] uppercase tracking-wider mb-0.5">📝 Notas:</span>
          {task.notes}
        </div>
      )}

      {/* Footer & Accessible Phase Change Dropdown */}
      <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800/60 text-[11px] gap-2">
        <span className="font-mono text-neutral-400 shrink-0">📅 {task.dueDate || 'Sin fecha'}</span>

        {/* Accessible Phase Transition Selector */}
        {onMoveTaskPhase && (
          <select
            value={task.status}
            onChange={(e) => onMoveTaskPhase(task.id, e.target.value as TaskStatus)}
            className="p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[10px] font-semibold border border-neutral-200 dark:border-neutral-700 outline-none cursor-pointer max-w-[110px] truncate"
            title="Mover a fase (Acceso accesible sin arrastrar)"
          >
            <option value="TODO">Por Hacer</option>
            <option value="IN_PROGRESS">En Progreso</option>
            <option value="IN_REVIEW">En Revisión</option>
            <option value="COMPLETED">Completado</option>
          </select>
        )}
      </div>
    </div>
  );
}

// Droppable Column Component
function DroppableColumn({
  col,
  tasks,
  responsibles,
  onEditTask,
  onDeleteTask,
  onMoveTaskPhase
}: {
  col: { id: TaskStatus; title: string; color: string };
  tasks: Task[];
  responsibles: Responsible[];
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  onMoveTaskPhase?: (taskId: string, targetStatus: TaskStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div
      ref={setNodeRef}
      className={`p-3.5 sm:p-4 rounded-2xl apple-glass border transition-colors duration-150 min-h-[320px] sm:min-h-[480px] flex flex-col gap-3 min-w-0 ${
        isOver
          ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10'
          : 'border-neutral-200/50 dark:border-neutral-800/50'
      }`}
    >
      <div className="flex items-center justify-between pb-2 border-b border-neutral-200/40 dark:border-neutral-800/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.color}`} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 truncate">
            {col.title}
          </h3>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-neutral-200/60 dark:bg-neutral-800 text-[11px] font-bold text-neutral-500 shrink-0">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 flex-1">
          {tasks.map((t) => (
            <SortableTaskCard
              key={t.id}
              task={t}
              responsibles={responsibles}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onMoveTaskPhase={onMoveTaskPhase}
            />
          ))}
          {tasks.length === 0 && (
            <div className="h-24 flex items-center justify-center border-2 border-dashed border-neutral-200/60 dark:border-neutral-800/60 rounded-xl text-neutral-400 text-xs italic">
              Arrastra o mueve una tarea aquí
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
  responsibles = [],
  activeProjectFilter,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onMoveTaskPhase,
  onOpenResponsibleManager,
  onOpenLegacyMigration,
  unmigratedTasksCount = 0
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredTasks = tasks.filter(
    (t) => activeProjectFilter === 'all' || t.projectId === activeProjectFilter
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveDragTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragTask(null);

    if (!over) return;

    const activeTaskId = String(active.id);
    const overId = String(over.id);

    const activeTask = tasks.find(t => t.id === activeTaskId);
    if (!activeTask) return;

    // Check if dropped over a column directly or over another task
    let targetStatus: TaskStatus = activeTask.status as TaskStatus;
    const isOverColumn = COLUMNS.some(c => c.id === overId);

    if (isOverColumn) {
      targetStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status as TaskStatus;
      }
    }

    if (onMoveTaskPhase) {
      onMoveTaskPhase(activeTaskId, targetStatus);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 w-full">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 break-words">
            Gestión de Tareas
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Tablero Kanban arrastrable, asignación de responsables y transiciones de fase reversibles
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto shrink-0">
          {/* Responsible Manager Button */}
          {onOpenResponsibleManager && (
            <button
              onClick={onOpenResponsibleManager}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 font-semibold text-xs border border-purple-500/30 transition cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Gestionar responsables ({responsibles.length})</span>
            </button>
          )}

          {/* View Mode Switcher */}
          <div className="flex items-center justify-center p-1 rounded-xl bg-neutral-200/60 dark:bg-neutral-800 border border-neutral-300/40 dark:border-neutral-700/50 text-xs">
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
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      {/* Un-intrusive Legacy Migration Banner */}
      {unmigratedTasksCount > 0 && onOpenLegacyMigration && (
        <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>
              Existen <strong>{unmigratedTasksCount} asignaciones heredadas</strong> pendientes de vincular al catálogo.
            </span>
          </div>
          <button
            onClick={onOpenLegacyMigration}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
          >
            Migrar responsables heredados
          </button>
        </div>
      )}

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-start min-w-0">
            {COLUMNS.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.id);
              return (
                <DroppableColumn
                  key={col.id}
                  col={col}
                  tasks={colTasks}
                  responsibles={responsibles}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  onMoveTaskPhase={onMoveTaskPhase}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeDragTask ? (
              <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border-2 border-blue-500 shadow-2xl opacity-90">
                <p className="text-xs font-bold">{activeDragTask.title}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* Table View */
        <div className="rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden shadow-sm min-w-0">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="bg-neutral-100/60 dark:bg-neutral-800/40 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-200/50 dark:border-neutral-800/50">
                  <th className="px-4 sm:px-6 py-3.5">Título</th>
                  <th className="px-4 sm:px-6 py-3.5">Fase / Estado</th>
                  <th className="px-4 sm:px-6 py-3.5">Prioridad</th>
                  <th className="px-4 sm:px-6 py-3.5">Responsables</th>
                  <th className="px-4 sm:px-6 py-3.5">Fecha Límite</th>
                  <th className="px-4 sm:px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/50 dark:divide-neutral-800/50 text-xs">
                {filteredTasks.map((t) => {
                  const assignedResps = (t.assigneeIds && t.assigneeIds.length > 0)
                    ? responsibles.filter(r => t.assigneeIds?.includes(r.id))
                    : [];

                  return (
                    <tr key={t.id} className="hover:bg-white/40 dark:hover:bg-neutral-800/30 transition">
                      <td className="px-4 sm:px-6 py-4 font-semibold text-neutral-900 dark:text-neutral-100">
                        {t.title}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {onMoveTaskPhase ? (
                          <select
                            value={t.status}
                            onChange={(e) => onMoveTaskPhase(t.id, e.target.value as TaskStatus)}
                            className="p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold border border-neutral-200 dark:border-neutral-700 outline-none"
                          >
                            <option value="TODO">Por Hacer</option>
                            <option value="IN_PROGRESS">En Progreso</option>
                            <option value="IN_REVIEW">En Revisión</option>
                            <option value="COMPLETED">Completado</option>
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800">
                            {t.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500">
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {assignedResps.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assignedResps.map(r => (
                              <span
                                key={r.id}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                style={{ backgroundColor: r.color || '#007AFF' }}
                              >
                                {r.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-neutral-400">{t.assigneeName || t.assignee || 'Sin asignar'}</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-neutral-500 font-mono">📅 {t.dueDate || 'Sin fecha'}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
