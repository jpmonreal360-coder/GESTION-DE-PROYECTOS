'use client';

import React, { useState, useEffect } from 'react';
import { Project, Expense, BatchTable } from '@/types';
import { Plus, Filter, AlertTriangle, Edit2, Trash2, Layers, ListFilter, FolderKanban, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { BatchTableAccordion } from './BatchTableAccordion';

interface ExpenseTrackerProps {
  projects: Project[];
  expenses: Expense[];
  tables?: BatchTable[];
  activeProjectFilter: string;
  onAddExpense?: () => void;
  onEditExpense?: (exp: Expense) => void;
  onDeleteExpense?: (id: string) => void;
  onBulkDeleteExpenses?: (ids: string[]) => void;
  onToggleTableCollapse?: (tableId: string) => void;
  onDeleteTable?: (tableId: string) => void;
  onFeedTable?: (tableId: string, mode: 'income' | 'expense') => void;
}

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  projects,
  expenses,
  tables = [],
  activeProjectFilter,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onBulkDeleteExpenses,
  onToggleTableCollapse = () => {},
  onDeleteTable = () => {},
  onFeedTable = () => {},
}) => {
  const [activeTab, setActiveTab] = useState<'accordions' | 'list'>('accordions');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Multi-select state for general list view
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);

  // Clear selection on context change (project filter, category, type filter, or tab change)
  useEffect(() => {
    setSelectedExpenseIds([]);
  }, [activeProjectFilter, selectedCategory, typeFilter, activeTab]);

  const filteredProjects = projects.filter(
    (p) => activeProjectFilter === 'all' || p.id === activeProjectFilter
  );

  const filteredExpenses = expenses.filter((e) => {
    const matchesProject =
      activeProjectFilter === 'all' || e.projectId === activeProjectFilter;
    const matchesCategory =
      selectedCategory === 'all' || e.category === selectedCategory;
    const matchesType =
      typeFilter === 'all' || e.type === typeFilter;
    return matchesProject && matchesCategory && matchesType;
  });

  // Calculate totals
  const totalIncome = filteredExpenses
    .filter((e) => e.type === 'INCOME')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalExpense = filteredExpenses
    .filter((e) => e.type === 'EXPENSE')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const netBalance = totalIncome - totalExpense;

  const categories = Array.from(
    new Set(expenses.map((e) => e.category).filter(Boolean))
  );

  const formatCurrency = (val: number) => {
    return `$${(val || 0).toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedExpenseIds(filteredExpenses.map(e => e.id));
    } else {
      setSelectedExpenseIds([]);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedExpenseIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleConfirmBulkDelete = () => {
    if (onBulkDeleteExpenses && selectedExpenseIds.length > 0) {
      onBulkDeleteExpenses(selectedExpenseIds);
    }
    setSelectedExpenseIds([]);
    setIsBulkDeleteModalOpen(false);
  };

  const isAllSelected = filteredExpenses.length > 0 && filteredExpenses.every(e => selectedExpenseIds.includes(e.id));

  return (
    <div className="space-y-6 animate-in fade-in duration-200 min-w-0 w-full">
      {/* Financial Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 min-w-0">
        <div className="p-4 sm:p-5 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 flex items-center justify-between shadow-sm min-w-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Entradas Acumuladas
            </p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(totalIncome)}
            </h3>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 flex items-center justify-between shadow-sm min-w-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Salidas / Gastos
            </p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              -{formatCurrency(totalExpense)}
            </h3>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 shrink-0">
            <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 flex items-center justify-between shadow-sm min-w-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Balance Neto Global
            </p>
            <h3 className={`text-xl sm:text-2xl font-extrabold ${netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
            </h3>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Tabs & Top Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-200/60 dark:bg-neutral-800/80 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('accordions')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'accordions'
                ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>Tablas por Período</span>
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'list'
                ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Lista General ({filteredExpenses.length})</span>
          </button>
        </div>

        {onAddExpense && (
          <button
            onClick={onAddExpense}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Captura Masiva / Nuevo Registro</span>
          </button>
        )}
      </div>

      {/* Main View Area: Accordions vs List */}
      {activeTab === 'accordions' ? (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Tablas de Entradas / Ingresos</span>
              </h3>
            </div>
            <BatchTableAccordion
              tables={tables}
              expenses={expenses}
              projects={projects}
              activeMode="income"
              activeProjectFilter={activeProjectFilter}
              onToggleCollapse={onToggleTableCollapse}
              onDeleteTable={onDeleteTable}
              onFeedTable={onFeedTable}
              onEditExpense={onEditExpense || (() => {})}
              onDeleteExpense={onDeleteExpense || (() => {})}
              onBulkDeleteExpenses={onBulkDeleteExpenses}
            />
          </div>

          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                <span>Tablas de Salidas / Gastos</span>
              </h3>
            </div>
            <BatchTableAccordion
              tables={tables}
              expenses={expenses}
              projects={projects}
              activeMode="expense"
              activeProjectFilter={activeProjectFilter}
              onToggleCollapse={onToggleTableCollapse}
              onDeleteTable={onDeleteTable}
              onFeedTable={onFeedTable}
              onEditExpense={onEditExpense || (() => {})}
              onDeleteExpense={onDeleteExpense || (() => {})}
              onBulkDeleteExpenses={onBulkDeleteExpenses}
            />
          </div>
        </div>
      ) : (
        /* GENERAL LIST VIEW WITH MULTI-SELECT */
        <div className="space-y-4 min-w-0 w-full">
          {/* Filters & Bulk Delete Action Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                Filtros:
              </span>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 outline-none"
              >
                <option value="all">Todas las Transacciones</option>
                <option value="INCOME">📈 Entradas (Ingresos)</option>
                <option value="EXPENSE">📉 Salidas (Gastos)</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 outline-none"
              >
                <option value="all">Todas las Categorías</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Bulk Action Controls */}
            {selectedExpenseIds.length > 0 && (
              <div className="flex items-center gap-2 justify-end">
                <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold border border-purple-500/20">
                  {selectedExpenseIds.length} seleccionadas
                </span>
                <button
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 transition flex items-center gap-1.5 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar seleccionadas ({selectedExpenseIds.length})</span>
                </button>
              </div>
            )}
          </div>

          {/* Isolated Horizontal Scroll Table Container */}
          <div className="rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden shadow-sm min-w-0">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="bg-neutral-100/60 dark:bg-neutral-800/40 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-200/50 dark:border-neutral-800/50">
                    <th className="px-4 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 outline-none cursor-pointer"
                        title="Seleccionar/Deseleccionar todas las transacciones visibles"
                      />
                    </th>
                    <th className="px-4 sm:px-6 py-3.5">Tipo</th>
                    <th className="px-4 sm:px-6 py-3.5">Concepto</th>
                    <th className="px-4 sm:px-6 py-3.5">Categoría</th>
                    <th className="px-4 sm:px-6 py-3.5">Proyecto</th>
                    <th className="px-4 sm:px-6 py-3.5">Fecha</th>
                    <th className="px-4 sm:px-6 py-3.5">Monto</th>
                    <th className="px-4 sm:px-6 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/50 dark:divide-neutral-800/50 text-xs">
                  {filteredExpenses.map((exp) => {
                    const prj = projects.find((p) => p.id === exp.projectId);
                    const isIncome = exp.type === 'INCOME';
                    const isSelected = selectedExpenseIds.includes(exp.id);

                    return (
                      <tr
                        key={exp.id}
                        className={`transition ${isSelected ? 'bg-purple-500/10 dark:bg-purple-950/30' : 'hover:bg-white/40 dark:hover:bg-neutral-800/30'}`}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(exp.id)}
                            className="w-4 h-4 rounded text-blue-600 outline-none cursor-pointer"
                          />
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isIncome ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {isIncome ? '📈 Entrada' : '📉 Gasto'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 font-semibold text-neutral-900 dark:text-neutral-100">
                          {exp.concept}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
                            {exp.category}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-neutral-600 dark:text-neutral-400">
                          {prj ? prj.name : exp.projectId}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-neutral-500 font-medium">📅 {exp.date}</td>
                        <td className={`px-4 sm:px-6 py-4 font-bold ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isIncome ? '+' : '-'}{formatCurrency(exp.amount)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            {onEditExpense && (
                              <button
                                onClick={() => onEditExpense(exp)}
                                className="action-btn-sm"
                                title="Editar Fecha & Datos"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteExpense && (
                              <button
                                onClick={() => onDeleteExpense(exp.id)}
                                className="action-btn-sm action-btn-danger"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* Bulk Delete Confirmation Modal for List View */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
          <div className="relative w-[calc(100vw-1.5rem)] max-w-md bg-white dark:bg-[#16161a] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  ¿Eliminar {selectedExpenseIds.length} transacciones seleccionadas?
                </h3>
                <p className="text-xs text-neutral-500">
                  Confirmación de eliminación múltiple
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Esta acción eliminará únicamente las <strong>{selectedExpenseIds.length} transacciones seleccionadas</strong>. Todos tus otros registros, proyectos, tareas y documentos permanecerán totalmente intactos.
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
                Confirmar Eliminación ({selectedExpenseIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
