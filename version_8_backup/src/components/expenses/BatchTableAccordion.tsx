'use client';

import React from 'react';
import { BatchTable, Expense, Project } from '@/types';
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, TrendingUp, TrendingDown, Layers, Calendar } from 'lucide-react';

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
}: BatchTableAccordionProps) {
  // Filter tables matching active mode
  const modeTables = tables.filter(t => t.mode === activeMode);

  // Helper to get project details
  const getProject = (projectId: string) => projects.find(p => p.id === projectId);

  return (
    <div className="space-y-4">
      {modeTables.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/40">
          <Layers className="w-10 h-10 text-neutral-400 mx-auto mb-3 opacity-60" />
          <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">
            No hay tablas creadas para {activeMode === 'income' ? 'Ingresos' : 'Gastos'}
          </h4>
          <p className="text-xs text-neutral-500 mb-4">
            Crea tu primera tabla por período (ej. "Ingresos Julio 2026") para agrupar registros masivos.
          </p>
          <button
            onClick={() => onFeedTable('', activeMode)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Crear Nueva Tabla / Período</span>
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

          return (
            <div
              key={table.id}
              className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-[#121215]/70 backdrop-blur-md shadow-sm overflow-hidden transition-all duration-200"
            >
              {/* Accordion Header */}
              <div
                onClick={() => onToggleCollapse(table.id)}
                className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40 transition select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition">
                    {isCollapsed ? (
                      <ChevronRight className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>

                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    {activeMode === 'income' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold truncate text-neutral-900 dark:text-neutral-100">
                        {table.name}
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 shrink-0">
                        {tableExpenses.length} registros
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>Creada el {table.createdAt}</span>
                    </p>
                  </div>
                </div>

                {/* Right Side: Total Badge & Actions */}
                <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-neutral-400 block uppercase tracking-wider">
                      Total Acumulado
                    </span>
                    <span
                      className={`text-sm font-extrabold ${
                        activeMode === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      ${totalSum.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                    </span>
                  </div>

                  <button
                    onClick={() => onFeedTable(table.id, activeMode)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    title="Alimentar esta tabla con nuevas filas masivas"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">+ Alimentar tabla</span>
                  </button>

                  <button
                    onClick={() => onDeleteTable(table.id)}
                    className="p-1.5 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                    title="Eliminar esta tabla"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Accordion Content Grid (Collapsed / Expanded) */}
              {!isCollapsed && (
                <div className="border-t border-neutral-200/60 dark:border-neutral-800/60 p-4 bg-neutral-50/50 dark:bg-black/20 animate-in fade-in duration-150">
                  {tableExpenses.length === 0 ? (
                    <div className="py-6 text-center text-xs text-neutral-400">
                      Esta tabla no contiene registros aún. Haz clic en <strong>"+ Alimentar tabla"</strong> para agregar entradas masivas.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                            <th className="pb-2 pl-2">Concepto</th>
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
                            return (
                              <tr
                                key={item.id}
                                className="hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40 transition group"
                              >
                                <td className="py-2.5 pl-2 font-medium text-neutral-900 dark:text-neutral-100">
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
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => onDeleteExpense(item.id)}
                                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/50 text-neutral-400 hover:text-red-600"
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
    </div>
  );
}
