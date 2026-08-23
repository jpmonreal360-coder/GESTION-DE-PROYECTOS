'use client';

import React, { useState, useEffect } from 'react';
import { BatchTable, Expense, Project } from '@/types';
import { ChevronDown, ChevronRight, Plus, Trash2, TrendingUp, TrendingDown, Layers, AlertTriangle } from 'lucide-react';

interface BatchTableAccordionProps {
  tables: BatchTable[];
  expenses: Expense[];
  projects: Project[];
  activeMode: 'income' | 'expense';
  activeProjectFilter: string;
  onToggleCollapse: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onFeedTable: (tableId: string, mode: 'income' | 'expense') => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onBulkDeleteExpenses?: (ids: string[]) => void;
}

export function BatchTableAccordion({
  tables,
  expenses,
  projects,
  activeMode,
  activeProjectFilter,
  onToggleCollapse,
  onDeleteTable,
  onFeedTable,
  onEditExpense,
  onDeleteExpense,
  onBulkDeleteExpenses
}: BatchTableAccordionProps) {
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);

  // Clear selection on context or mode change
  useEffect(() => {
    setSelectedIds([]);
  }, [activeMode, activeProjectFilter]);

  // Filter tables matching active mode & project filter
  const modeTables = tables.filter(t => {
    const matchesMode = t.mode === activeMode;
    const matchesProject = activeProjectFilter === 'all'
      || !t.projectId
      || t.projectId === activeProjectFilter
      || expenses.some(e => e.tableId === t.id && e.projectId === activeProjectFilter);
    return matchesMode && matchesProject;
  });

  const getProject = (projectId: string) => projects.find(p => p.id === projectId);

  const handleToggleSelectItem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectTable = (tableItemIds: string[], forceCheck: boolean) => {
    if (forceCheck) {
      const merged = Array.from(new Set([...selectedIds, ...tableItemIds]));
      setSelectedIds(merged);
    } else {
      setSelectedIds(prev => prev.filter(id => !tableItemIds.includes(id)));
    }
  };

  const handleConfirmBulkDelete = () => {
    if (onBulkDeleteExpenses && selectedIds.length > 0) {
      onBulkDeleteExpenses(selectedIds);
    }
    setSelectedIds([]);
    setIsBulkDeleteModalOpen(false);
  };

  return (
    <div className="space-y-4 min-w-0 w-full">
      
      {/* Top Bulk Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 sm:p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold">
              {selectedIds.length} seleccionadas
            </span>
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              en las tablas de {activeMode === 'income' ? 'Ingresos' : 'Gastos'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition"
            >
              Deseleccionar
            </button>
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar seleccionadas ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {modeTables.length === 0 ? (
        <div className="p-6 sm:p-8 text-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/40 min-w-0">
          <Layers className="w-9 h-9 sm:w-10 sm:h-10 text-neutral-400 mx-auto mb-3 opacity-60" />
          <h4 className="text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">
            No hay tablas creadas para {activeMode === 'income' ? 'Ingresos' : 'Gastos'}
          </h4>
          <p className="text-[11px] sm:text-xs text-neutral-500 mb-4 max-w-sm mx-auto">
            Crea tu primera tabla por período (ej. "Ingresos Julio 2026") para agrupar registros masivos.
          </p>
          <button
            onClick={() => onFeedTable('', activeMode)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Crear Nueva Tabla</span>
          </button>
        </div>
      ) : (
        modeTables.map((table) => {
          // Filter expenses belonging to this table
          const tableExpenses = expenses.filter(e => {
            const matchesTable = e.tableId === table.id;
            const matchesType = e.type === (activeMode === 'income' ? 'INCOME' : 'EXPENSE');
            const matchesProject = activeProjectFilter === 'all' || e.projectId === activeProjectFilter;
            return matchesTable && matchesType && matchesProject;
          });

          const totalSum = tableExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
          const isCollapsed = table.isCollapsed ?? false;
          const tableItemIds = tableExpenses.map(e => e.id);
          const isAllTableSelected = tableExpenses.length > 0 && tableExpenses.every(e => selectedIds.includes(e.id));

          return (
            <div
              key={table.id}
              className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-[#121215]/70 backdrop-blur-md shadow-sm overflow-hidden transition-all duration-200 min-w-0"
            >
              {/* Accordion Header */}
              <div
                onClick={() => onToggleCollapse(table.id)}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40 transition select-none min-w-0"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <button className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition shrink-0">
                    {isCollapsed ? (
                      <ChevronRight className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>

                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                    {activeMode === 'income' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {table.name}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-neutral-400 flex items-center gap-2 truncate">
                      <span>Período: {table.createdAt}</span>
                      <span>•</span>
                      <span>{tableExpenses.length} entradas</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-end min-w-0 shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-neutral-400 block font-medium">Acumulado Tabla</span>
                    <span
                      className={`text-xs sm:text-sm font-extrabold ${
                        activeMode === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-neutral-900 dark:text-neutral-100'
                      }`}
                    >
                      {activeMode === 'income' ? '+' : '-'}${totalSum.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onFeedTable(table.id, activeMode)}
                      className="px-2.5 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold transition flex items-center gap-1 shrink-0"
                      title="Alimentar datos a esta tabla"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline sm:inline">+ Alimentar</span>
                    </button>

                    <button
                      onClick={() => onDeleteTable(table.id)}
                      className="p-1.5 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition shrink-0"
                      title="Eliminar esta tabla"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Accordion Content Grid */}
              {!isCollapsed && (
                <div className="border-t border-neutral-200/60 dark:border-neutral-800/60 p-3 sm:p-4 bg-neutral-50/50 dark:bg-black/20 animate-in fade-in duration-150 min-w-0">
                  {tableExpenses.length === 0 ? (
                    <div className="py-6 text-center text-xs text-neutral-400">
                      Esta tabla no contiene registros aún. Haz clic en <strong>"+ Alimentar tabla"</strong> para agregar entradas masivas.
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                      <table className="w-full text-left text-xs min-w-[620px]">
                        <thead>
                          <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                            <th className="pb-2 pl-2 w-8">
                              <input
                                type="checkbox"
                                checked={isAllTableSelected}
                                onChange={e => handleToggleSelectTable(tableItemIds, e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 outline-none cursor-pointer"
                                title="Seleccionar/Deseleccionar todas las filas de esta tabla"
                              />
                            </th>
                            <th className="pb-2">Concepto</th>
                            <th className="pb-2">Proyecto</th>
                            <th className="pb-2">Categoría</th>
                            <th className="pb-2">Fecha</th>
                            <th className="pb-2 text-right pr-2">Monto ($ MXN)</th>
                            <th className="pb-2 text-center w-16">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200/50 dark:divide-neutral-800/50">
                          {tableExpenses.map((item) => {
                            const prj = getProject(item.projectId);
                            const isSelected = selectedIds.includes(item.id);

                            return (
                              <tr
                                key={item.id}
                                className={`transition group ${isSelected ? 'bg-purple-500/10 dark:bg-purple-950/30' : 'hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40'}`}
                              >
                                <td className="py-2.5 pl-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelectItem(item.id)}
                                    className="w-4 h-4 rounded text-blue-600 outline-none cursor-pointer"
                                  />
                                </td>
                                <td className="py-2.5 font-medium text-neutral-900 dark:text-neutral-100">
                                  {item.concept}
                                </td>
                                <td className="py-2.5">
                                  {prj ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: prj.color || '#007AFF' }}
                                      />
                                      <span>{prj.name}</span>
                                    </span>
                                  ) : (
                                    <span className="text-neutral-400">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 text-neutral-600 dark:text-neutral-400">
                                  {item.category}
                                </td>
                                <td className="py-2.5 text-neutral-500 font-mono text-[11px]">
                                  {item.date}
                                </td>
                                <td
                                  className={`py-2.5 pr-2 text-right font-bold font-mono ${
                                    item.type === 'INCOME'
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-neutral-900 dark:text-neutral-100'
                                  }`}
                                >
                                  {item.type === 'INCOME' ? '+' : '-'}${Number(item.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition">
                                    <button
                                      onClick={() => onEditExpense(item)}
                                      className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                                      title="Editar registro"
                                    >
                                      <span className="sr-only">Editar</span>
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => onDeleteExpense(item.id)}
                                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-neutral-400 hover:text-red-600"
                                      title="Eliminar registro"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
          <div className="relative w-[calc(100vw-1.5rem)] max-w-md bg-white dark:bg-[#16161a] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  ¿Eliminar {selectedIds.length} entradas seleccionadas?
                </h3>
                <p className="text-xs text-neutral-500">
                  Confirmación de eliminación múltiple
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Esta acción eliminará únicamente las <strong>{selectedIds.length} transacciones seleccionadas</strong>. Todos tus otros registros, proyectos, tareas y documentos permanecerán totalmente intactos.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmBulkDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 transition"
              >
                Confirmar Eliminación ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
