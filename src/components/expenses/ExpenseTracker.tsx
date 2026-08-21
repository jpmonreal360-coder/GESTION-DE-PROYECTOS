'use client';

import React, { useState } from 'react';
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
  onToggleTableCollapse = () => {},
  onDeleteTable = () => {},
  onFeedTable = () => {},
}) => {
  const [activeTab, setActiveTab] = useState<'accordions' | 'list'>('accordions');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

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

  const categories = Array.from(new Set(expenses.map(e => e.category)));

  const totalIncome = filteredExpenses.filter(e => e.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
  const totalExpenses = filteredExpenses.filter(e => e.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  const formatCurrency = (val: number) => {
    if (val === null || val === undefined || isNaN(val)) return '$0';
    if (val % 1 === 0) {
      return '$' + Math.round(val).toLocaleString('es-MX');
    }
    return '$' + val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Finanzas y Transacciones por Períodos
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Gestión por Tablas e Historial agrupados por períodos con acordeones plegables
          </p>
        </div>

        {/* Action Buttons & Tab Switcher */}
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-xl bg-neutral-200/80 dark:bg-neutral-800 flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('accordions')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeTab === 'accordions'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Tablas por Período (Acordeón)</span>
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeTab === 'list'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Lista General</span>
            </button>
          </div>

          <button
            onClick={onAddExpense}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Captura Masiva / Nueva Tabla</span>
          </button>
        </div>
      </div>

      {/* Global Summary Bar */}
      <div className="p-5 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>Ingresos Totales:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">+{formatCurrency(totalIncome)} MXN</span>
        </div>
        <div className="text-xs font-semibold flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-500" />
          <span>Gastos Totales:</span>
          <span className="text-rose-600 dark:text-rose-400 font-extrabold text-sm">-{formatCurrency(totalExpenses)} MXN</span>
        </div>
        <div className="text-xs font-bold flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-blue-500" />
          <span>Balance Neto:</span>
          <span className={`font-black text-base ${netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {netBalance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netBalance))} MXN
          </span>
        </div>
      </div>

      {/* Budget & Revenue Cards per Project */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredProjects.map((p) => {
          const prjExpenses = expenses.filter(e => e.projectId === p.id);
          const incomeSum = prjExpenses.filter(e => e.type === 'INCOME').reduce((acc, curr) => acc + (curr.amount || 0), 0);
          const expenseSum = prjExpenses.filter(e => e.type === 'EXPENSE').reduce((acc, curr) => acc + (curr.amount || 0), 0);
          const prjNet = incomeSum - expenseSum;

          const totalBudget = p.totalBudget ?? p.budget ?? 16450;
          const pctExpense = totalBudget > 0 ? Math.round((expenseSum / totalBudget) * 100) : 0;
          const pctIncome = totalBudget > 0 ? Math.round((incomeSum / totalBudget) * 100) : 0;

          const isOver = pctExpense >= 100;
          const isWarn = pctExpense >= 80 && pctExpense < 100;

          return (
            <div
              key={p.id}
              className="p-5 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col justify-between space-y-3"
            >
              <div>
                {/* Title & Project Badge */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || '#007AFF' }} />
                    <span>{p.name}</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      prjNet >= 0
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {prjNet >= 0 ? '🟢 Balance Positivo' : '🔴 Déficit'}
                  </span>
                </div>

                {/* Financial Totals Breakdown */}
                <div className="grid grid-cols-2 gap-2 my-2 p-2.5 rounded-xl bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200/40 dark:border-neutral-800/40">
                  <div>
                    <span className="text-[10px] font-semibold text-neutral-400 block uppercase tracking-wider">
                      Ingresos (Entradas)
                    </span>
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(incomeSum)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-neutral-400 block uppercase tracking-wider">
                      Gastos (Salidas)
                    </span>
                    <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                      -{formatCurrency(expenseSum)}
                    </span>
                  </div>
                </div>

                {/* Net Balance Row */}
                <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-neutral-200/40 dark:border-neutral-800/40">
                  <span className="text-[11px] font-bold text-neutral-500">Balance Neto:</span>
                  <span className={`text-base font-black ${prjNet >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {prjNet >= 0 ? '+' : '-'}{formatCurrency(Math.abs(prjNet))} MXN
                  </span>
                </div>

                {/* Progress Bar (Spent vs Budget) */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-neutral-400">
                    <span>Ejecución de Gastos ({pctExpense}%)</span>
                    <span>Presupuesto: {formatCurrency(totalBudget)}</span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver
                          ? 'bg-red-500 animate-pulse'
                          : isWarn
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(pctExpense, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {isOver && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-500 font-semibold pt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Excedido por {formatCurrency(expenseSum - totalBudget)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main View Area: Accordion View vs General List View */}
      {activeTab === 'accordions' ? (
        <div className="space-y-8">
          {/* Section 1: Ingresos por Período */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>📈 Tablas de Entradas / Ingresos</span>
              </h2>
              <button
                onClick={() => onFeedTable('', 'income')}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Nueva Tabla de Ingresos</span>
              </button>
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
            />
          </div>

          {/* Section 2: Gastos por Período */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>📉 Tablas de Salidas / Gastos</span>
              </h2>
              <button
                onClick={() => onFeedTable('', 'expense')}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-sm transition inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Nueva Tabla de Gastos</span>
              </button>
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
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="w-4 h-4 text-neutral-400" />
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
          </div>

          {/* Table with Edit and Delete Action Buttons */}
          <div className="rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse min-w-[620px]">
              <thead>
                <tr className="bg-neutral-100/60 dark:bg-neutral-800/40 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-200/50 dark:border-neutral-800/50">
                  <th className="px-6 py-3.5">Tipo</th>
                  <th className="px-6 py-3.5">Concepto</th>
                  <th className="px-6 py-3.5">Categoría</th>
                  <th className="px-6 py-3.5">Proyecto</th>
                  <th className="px-6 py-3.5">Fecha (Editable)</th>
                  <th className="px-6 py-3.5">Monto</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/50 dark:divide-neutral-800/50 text-xs">
                {filteredExpenses.map((exp) => {
                  const prj = projects.find((p) => p.id === exp.projectId);
                  const isIncome = exp.type === 'INCOME';

                  return (
                    <tr key={exp.id} className="hover:bg-white/40 dark:hover:bg-neutral-800/30 transition">
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isIncome ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {isIncome ? '📈 Entrada' : '📉 Gasto'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-neutral-900 dark:text-neutral-100">
                        {exp.concept}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">
                        {prj ? prj.name : exp.projectId}
                      </td>
                      <td className="px-6 py-4 text-neutral-500 font-medium">📅 {exp.date}</td>
                      <td className={`px-6 py-4 font-bold ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(exp.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          {onEditExpense && (
                            <button
                              onClick={() => onEditExpense(exp)}
                              className="action-btn-sm"
                              title="Editar Fecha & Datos"
                            >
                              <Edit2 className="w-3 h-3 text-neutral-400" />
                            </button>
                          )}
                          {onDeleteExpense && (
                            <button
                              onClick={() => onDeleteExpense(exp.id)}
                              className="action-btn-sm action-btn-danger"
                              title="Eliminar Transacción"
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
