'use client';

import React from 'react';
import { Project, Expense, Task } from '@/types';

interface OverviewDashboardProps {
  projects: Project[];
  expenses: Expense[];
  tasks: Task[];
  activeProjectFilter: string;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  projects,
  expenses,
  tasks,
  activeProjectFilter
}) => {
  const filteredProjects = activeProjectFilter === 'all'
    ? projects
    : projects.filter(p => p.id === activeProjectFilter);

  const filteredExpenses = activeProjectFilter === 'all'
    ? expenses
    : expenses.filter(e => e.projectId === activeProjectFilter);

  const totalIncome = filteredExpenses
    .filter(e => e.type === 'INCOME')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalExpenses = filteredExpenses
    .filter(e => e.type === 'EXPENSE')
    .reduce((acc, e) => acc + e.amount, 0);

  const netBalance = totalIncome - totalExpenses;
  const isNetPositive = netBalance >= 0;

  const filteredTasks = activeProjectFilter === 'all'
    ? tasks
    : tasks.filter(t => t.projectId === activeProjectFilter);
  const pendingTasksCount = filteredTasks.filter(t => t.status !== 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard General</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Resumen ejecutivo y Balance Neto en Pesos Mexicanos (Entradas − Gastos)
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          isNetPositive 
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        }`}>
          {isNetPositive ? '🟢 Balance Positivo' : '🔴 Déficit Financiero'}
        </span>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Entradas */}
        <div className="p-5 rounded-2xl apple-glass apple-glass-hover">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
            Total Entradas (Ingresos)
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            +${totalIncome.toLocaleString()} <span className="text-xs text-neutral-400 font-normal">MXN</span>
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">Cobros y facturación acumulada</p>
        </div>

        {/* Total Gastos */}
        <div className="p-5 rounded-2xl apple-glass apple-glass-hover">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
            Total Salidas (Gastos)
          </p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            -${totalExpenses.toLocaleString()} <span className="text-xs text-neutral-400 font-normal">MXN</span>
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">Operaciones y licencias</p>
        </div>

        {/* Balance Neto */}
        <div className="p-5 rounded-2xl apple-glass apple-glass-hover">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
            Balance Neto (Entradas − Gastos)
          </p>
          <p className={`text-2xl font-bold ${isNetPositive ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isNetPositive ? '+' : ''}${netBalance.toLocaleString()} MXN
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            {isNetPositive ? 'Utilidad disponible' : 'Déficit temporal'}
          </p>
        </div>

        {/* Tareas Pendientes */}
        <div className="p-5 rounded-2xl apple-glass apple-glass-hover">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
            Tareas Pendientes
          </p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {pendingTasksCount}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            de {filteredTasks.length} tareas totales
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Health Progress */}
        <div className="lg:col-span-2 p-6 rounded-2xl apple-glass space-y-4">
          <h2 className="text-base font-bold">Salud Financiera por Proyecto</h2>
          <div className="space-y-4">
            {filteredProjects.map((p) => {
              const prjExpenses = expenses.filter(e => e.projectId === p.id);
              const prjIncome = prjExpenses.filter(e => e.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
              const prjSpent = prjExpenses.filter(e => e.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
              const prjNet = prjIncome - prjSpent;
              const budgetVal = p.budget ?? p.totalBudget ?? 450000;
              const pct = budgetVal > 0 ? Math.round((prjSpent / budgetVal) * 100) : 0;

              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold flex-wrap gap-2">
                    <span>{p.name}</span>
                    <span>
                      Balance: <strong className={prjNet >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                        {prjNet >= 0 ? '+' : ''}${prjNet.toLocaleString()} MXN
                      </strong>
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-400 flex-wrap gap-2">
                    <span>Entradas: +${prjIncome.toLocaleString()} MXN</span>
                    <span>Gastos: -${prjSpent.toLocaleString()} ({pct}% presup.)</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Latest Transactions List */}
        <div className="p-6 rounded-2xl apple-glass space-y-4">
          <h2 className="text-base font-bold">Últimas Transacciones</h2>
          <div className="space-y-3">
            {expenses.slice(0, 5).map((exp) => (
              <div key={exp.id} className="flex items-center justify-between pb-2 border-b border-neutral-200/40 dark:border-neutral-800/40 gap-2">
                <div>
                  <p className="text-xs font-semibold">{exp.concept}</p>
                  <p className="text-[10px] text-neutral-400">{exp.category} • {exp.date}</p>
                </div>
                <span className={`text-xs font-bold shrink-0 ${exp.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {exp.type === 'INCOME' ? '+' : '-'}${exp.amount.toLocaleString()} MXN
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
