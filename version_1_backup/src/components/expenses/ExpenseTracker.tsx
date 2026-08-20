'use client';

import React, { useState } from 'react';
import { Project, Expense } from '@/types';
import { Plus, Filter, AlertTriangle, Edit2, Trash2 } from 'lucide-react';

interface ExpenseTrackerProps {
  projects: Project[];
  expenses: Expense[];
  activeProjectFilter: string;
  onAddExpense?: () => void;
  onEditExpense?: (exp: Expense) => void;
  onDeleteExpense?: (id: string) => void;
}

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  projects,
  expenses,
  activeProjectFilter,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}) => {
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

  const totalIncome = filteredExpenses.filter(e => e.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
  const totalExpenses = filteredExpenses.filter(e => e.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Finanzas y Transacciones
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Registro de Entradas y Salidas con fechas totalmente editables
          </p>
        </div>

        <button
          onClick={onAddExpense}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Registro</span>
        </button>
      </div>

      {/* Summary Bar */}
      <div className="p-5 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs font-semibold">
          Ingresos Totales: <span className="text-emerald-500 font-bold">+${totalIncome.toLocaleString()} USD</span>
        </div>
        <div className="text-xs font-semibold">
          Gastos Totales: <span className="text-rose-500 font-bold">-${totalExpenses.toLocaleString()} USD</span>
        </div>
        <div className="text-xs font-bold">
          Balance Neto: <span className={netBalance >= 0 ? 'text-blue-500' : 'text-rose-500'}>{netBalance >= 0 ? '+' : ''}${netBalance.toLocaleString()} USD</span>
        </div>
      </div>

      {/* Budget Overview Cards per Project */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredProjects.map((p) => {
          const totalBudget = p.totalBudget ?? p.budget ?? 20000;
          const spentBudget = p.spentBudget ?? p.spent ?? 0;
          const pct = totalBudget > 0 ? Math.round((spentBudget / totalBudget) * 100) : 0;
          const isOver = pct >= 100;
          const isWarn = pct >= 80 && pct < 100;

          return (
            <div
              key={p.id}
              className="p-5 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {p.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isOver
                        ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                        : isWarn
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    }`}
                  >
                    {pct}% Ejecutado
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-lg font-extrabold text-neutral-900 dark:text-neutral-100">
                    ${spentBudget.toLocaleString()}
                  </span>
                  <span className="text-xs text-neutral-400">
                    de ${totalBudget.toLocaleString()} USD
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver
                        ? 'bg-red-500 animate-pulse'
                        : isWarn
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>

              {isOver && (
                <div className="flex items-center gap-1.5 mt-3 text-[11px] text-red-500 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Excedido por ${(spentBudget - totalBudget).toLocaleString()} USD</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
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
            <option value="Facturación / Cobro">Facturación / Cobro</option>
            <option value="Software">Software & Cloud</option>
            <option value="Diseño">Diseño UI/UX</option>
            <option value="Desarrollo">Desarrollo Frontend/Backend</option>
            <option value="Infraestructura">Infraestructura</option>
            <option value="Marketing">Marketing</option>
          </select>
        </div>
      </div>

      {/* Table with Edit and Delete Action Buttons */}
      <div className="rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
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
                    {isIncome ? '+' : '-'}${exp.amount.toLocaleString()} USD
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
  );
};
