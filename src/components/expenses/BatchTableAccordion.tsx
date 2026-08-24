'use client';

import React, { useState, useEffect } from 'react';
import { BatchTable, Expense, Project } from '@/types';
import { ChevronDown, ChevronRight, Plus, Trash2, TrendingUp, TrendingDown, Layers, AlertTriangle, Edit3, X, Check, RefreshCw } from 'lucide-react';
import { findOrphanExpenses, OrphanGroup } from '@/lib/orphanHelpers';

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
  onReassignOrphans?: (payload: { targetTableId?: string; newTableName?: string }) => void;
  onRenameTable?: (tableId: string, newName: string) => void;
  onReassignOrphanGroup?: (payload: {
    groupTableId: string;
    targetProjectId: string;
    targetTableId?: string;
    newTableName?: string;
  }) => void;
  onDeleteOrphanGroup?: (groupTableId: string, expenseIds: string[]) => void;
  onDeleteTableWithOptions?: (payload: {
    tableId: string;
    action: 'delete_all' | 'reassign';
    targetProjectId?: string;
    targetTableId?: string;
    newTableName?: string;
  }) => void;
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
  onBulkDeleteExpenses,
  onReassignOrphans,
  onRenameTable,
  onReassignOrphanGroup,
  onDeleteOrphanGroup,
  onDeleteTableWithOptions
}: BatchTableAccordionProps) {
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);

  // Rename Table Modal state
  const [tableToRename, setTableToRename] = useState<BatchTable | null>(null);
  const [renameInputName, setRenameInputName] = useState<string>('');
  const [renameError, setRenameError] = useState<string | null>(null);

  // Orphan Group Modal States
  const [reassignModalGroup, setReassignModalGroup] = useState<OrphanGroup | null>(null);
  const [reassignTargetProjectId, setReassignTargetProjectId] = useState<string>('');
  const [reassignTargetTableId, setReassignTargetTableId] = useState<string>('');
  const [reassignNewTableName, setReassignNewTableName] = useState<string>('');
  const [isReassignCheckboxConfirmed, setIsReassignCheckboxConfirmed] = useState<boolean>(false);

  const [deleteModalGroup, setDeleteModalGroup] = useState<OrphanGroup | null>(null);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState<string>('');

  // Safe Table Deletion Modal State
  const [tableToDeleteSafe, setTableToDeleteSafe] = useState<{ table: BatchTable; rowsCount: number; totalSum: number } | null>(null);
  const [safeDeleteAction, setSafeDeleteAction] = useState<'delete_all' | 'reassign'>('reassign');
  const [safeDeleteTargetProjectId, setSafeDeleteTargetProjectId] = useState<string>('');
  const [safeDeleteTargetTableId, setSafeDeleteTargetTableId] = useState<string>('');
  const [safeDeleteNewTableName, setSafeDeleteNewTableName] = useState<string>('');
  const [safeDeleteConfirmCountInput, setSafeDeleteConfirmCountInput] = useState<string>('');

  // Clear selection on context or mode change
  useEffect(() => {
    setSelectedIds([]);
  }, [activeMode, activeProjectFilter]);

  // Keyboard shortcut listener to close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tableToRename) setTableToRename(null);
        if (reassignModalGroup) setReassignModalGroup(null);
        if (deleteModalGroup) setDeleteModalGroup(null);
        if (tableToDeleteSafe) setTableToDeleteSafe(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tableToRename, reassignModalGroup, deleteModalGroup, tableToDeleteSafe]);

  // Detect orphaned expenses grouped by tableId using pure helper
  const orphanGroups = findOrphanExpenses(expenses, tables);

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

  const handleOpenRenameModal = (table: BatchTable) => {
    setTableToRename(table);
    setRenameInputName(table.name);
    setRenameError(null);
  };

  const handleSaveRenameModal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = renameInputName.trim();
    if (!trimmed) {
      setRenameError('El nombre de la tabla no puede estar vacío.');
      return;
    }
    if (trimmed.length > 80) {
      setRenameError('El nombre de la tabla no puede exceder los 80 caracteres.');
      return;
    }

    if (onRenameTable && tableToRename) {
      onRenameTable(tableToRename.id, trimmed);
    }

    setTableToRename(null);
    setRenameInputName('');
    setRenameError(null);
  };

  // Safe Table Deletion trigger
  const handleInitiateDeleteTable = (table: BatchTable) => {
    const tableRows = expenses.filter(e => e.tableId === table.id);
    if (tableRows.length === 0) {
      // Empty table: delete directly
      onDeleteTable(table.id);
    } else {
      // Non-empty table: open safe delete modal
      const totalSum = tableRows.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      setTableToDeleteSafe({ table, rowsCount: tableRows.length, totalSum });
      setSafeDeleteAction('reassign');
      setSafeDeleteTargetProjectId(table.projectId || projects[0]?.id || 'PRJ-01');
      setSafeDeleteTargetTableId('');
      setSafeDeleteNewTableName('');
      setSafeDeleteConfirmCountInput('');
    }
  };

  const handleConfirmSafeDeleteTable = () => {
    if (!tableToDeleteSafe || !onDeleteTableWithOptions) return;

    if (safeDeleteAction === 'delete_all') {
      if (safeDeleteConfirmCountInput.trim() !== String(tableToDeleteSafe.rowsCount)) return;
      onDeleteTableWithOptions({
        tableId: tableToDeleteSafe.table.id,
        action: 'delete_all'
      });
    } else if (safeDeleteAction === 'reassign') {
      const isValidTarget = safeDeleteTargetTableId === 'NEW'
        ? safeDeleteNewTableName.trim().length > 0
        : safeDeleteTargetTableId.length > 0;
      if (!isValidTarget) return;

      onDeleteTableWithOptions({
        tableId: tableToDeleteSafe.table.id,
        action: 'reassign',
        targetProjectId: safeDeleteTargetProjectId,
        targetTableId: safeDeleteTargetTableId,
        newTableName: safeDeleteNewTableName
      });
    }

    setTableToDeleteSafe(null);
  };

  const formatCurrency = (val: number) => {
    return `$${(val || 0).toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-4 min-w-0 w-full">

      {/* WARNING BANNER CARD FOR ORPHANED GROUPS ("Registros sin tabla asociada") */}
      {orphanGroups.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 dark:border-amber-500/30 shadow-lg space-y-4 animate-in fade-in duration-200 min-w-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/30 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-amber-900 dark:text-amber-200">
                ⚠️ Registros sin tabla asociada ({orphanGroups.reduce((a, b) => a + b.count, 0)} transacciones huérfanas)
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Se detectaron {orphanGroups.length} lote(s) de transacciones cuyo identificador de tabla ya no existe. Tus datos están 100% seguros. Elige si deseas reasignar el lote a una tabla existente/nueva o eliminarlo de forma explícita.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {orphanGroups.map((group) => (
              <div
                key={group.tableId}
                className="p-4 rounded-2xl bg-white/90 dark:bg-neutral-900/90 border border-amber-300 dark:border-amber-900/50 space-y-3 text-xs shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono text-[11px] font-bold mr-2">
                      tableId: {group.tableId}
                    </span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {group.count} filas • Total: <strong className="text-rose-600 dark:text-rose-400">-{formatCurrency(group.totalSum)} MXN</strong>
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 font-medium">
                    📅 Fechas: {group.minDate} al {group.maxDate}
                  </div>
                </div>

                {/* Sample Rows Preview */}
                <div className="space-y-1 bg-neutral-50 dark:bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Muestra de registros (5 de {group.count}):
                  </p>
                  {group.sampleRows.map((row, idx) => (
                    <div key={row.id || idx} className="flex items-center justify-between text-[11px] text-neutral-700 dark:text-neutral-300">
                      <span className="truncate max-w-[280px]">🔹 {row.concept} ({row.category})</span>
                      <span className="font-mono font-bold text-rose-500">-{formatCurrency(Number(row.amount) || 0)}</span>
                    </div>
                  ))}
                  {group.count > 5 && (
                    <p className="text-[10px] text-neutral-400 italic">... y {group.count - 5} registros más en este lote.</p>
                  )}
                </div>

                {/* Action Buttons for this Orphan Group */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => {
                      setReassignModalGroup(group);
                      setReassignTargetProjectId(group.projects[0] || projects[0]?.id || 'PRJ-01');
                      setReassignTargetTableId('');
                      setReassignNewTableName('');
                      setIsReassignCheckboxConfirmed(false);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reasignar lote ({group.count} filas)</span>
                  </button>

                  <button
                    onClick={() => {
                      setDeleteModalGroup(group);
                      setConfirmDeleteInput('');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar lote ({group.count} filas)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRenameModal(table);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold transition flex items-center gap-1 shrink-0"
                      title="Renombrar tabla"
                      aria-label={`Renombrar tabla ${table.name}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline sm:inline">Renombrar</span>
                    </button>

                    <button
                      onClick={() => onFeedTable(table.id, activeMode)}
                      className="px-2.5 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold transition flex items-center gap-1 shrink-0"
                      title="Alimentar datos a esta tabla"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline sm:inline">+ Alimentar</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInitiateDeleteTable(table);
                      }}
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

      {/* REASSIGN ORPHAN GROUP MODAL */}
      {reassignModalGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md"
          onClick={() => setReassignModalGroup(null)}
        >
          <div
            className="relative w-[calc(100vw-1.5rem)] max-w-lg bg-white dark:bg-[#16161a] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90dvh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Reasignar Lote Huérfano ({reassignModalGroup.count} filas)
                </h3>
              </div>
              <button
                onClick={() => setReassignModalGroup(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl space-y-1 text-xs text-neutral-800 dark:text-neutral-200">
              <p><strong>tableId Original:</strong> <code className="font-mono text-purple-600 font-bold">{reassignModalGroup.tableId}</code></p>
              <p><strong>Total Filas:</strong> {reassignModalGroup.count} transacciones | <strong>Monto:</strong> -{formatCurrency(reassignModalGroup.totalSum)} MXN</p>
              <p><strong>Rango Fechas:</strong> {reassignModalGroup.minDate} al {reassignModalGroup.maxDate}</p>
            </div>

            {/* Target Selectors */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  1. Proyecto Destino Obligatorio:
                </label>
                <select
                  value={reassignTargetProjectId}
                  onChange={e => setReassignTargetProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-bold"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      📁 {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  2. Tabla / Período Destino Obligatorio:
                </label>
                <select
                  value={reassignTargetTableId}
                  onChange={e => setReassignTargetTableId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-bold"
                >
                  <option value="">-- Selecciona o crea una tabla destino --</option>
                  <option value="NEW">➕ Crear Nueva Tabla de Período...</option>
                  {tables.filter(t => t.mode === 'expense').map(t => (
                    <option key={t.id} value={t.id}>
                      📁 {t.name} ({t.createdAt})
                    </option>
                  ))}
                </select>
              </div>

              {reassignTargetTableId === 'NEW' && (
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Nombre de la Nueva Tabla:
                  </label>
                  <input
                    type="text"
                    value={reassignNewTableName}
                    onChange={e => setReassignNewTableName(e.target.value)}
                    placeholder="Ej. Gastos Reasignados 2026..."
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-bold"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer pt-2 select-none">
                <input
                  type="checkbox"
                  checked={isReassignCheckboxConfirmed}
                  onChange={e => setIsReassignCheckboxConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600"
                />
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Confirmación: Entiendo que esta acción cambiará únicamente projectId y tableId de estas {reassignModalGroup.count} filas.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setReassignModalGroup(null)}
                className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                disabled={!isReassignCheckboxConfirmed || (!reassignTargetTableId || (reassignTargetTableId === 'NEW' && !reassignNewTableName.trim()))}
                onClick={() => {
                  if (onReassignOrphanGroup && reassignModalGroup) {
                    onReassignOrphanGroup({
                      groupTableId: reassignModalGroup.tableId,
                      targetProjectId: reassignTargetProjectId,
                      targetTableId: reassignTargetTableId,
                      newTableName: reassignNewTableName
                    });
                  }
                  setReassignModalGroup(null);
                }}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition"
              >
                Confirmar Reasignación de Lote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ORPHAN GROUP MODAL (REAL DELETION WITH COUNT CONFIRMATION) */}
      {deleteModalGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md"
          onClick={() => setDeleteModalGroup(null)}
        >
          <div
            className="relative w-[calc(100vw-1.5rem)] max-w-lg bg-white dark:bg-[#16161a] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90dvh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  ⚠️ Confirmación Destructiva: Eliminar Lote ({deleteModalGroup.count} filas)
                </h3>
                <p className="text-xs text-neutral-500">
                  tableId: <code className="font-mono font-bold text-red-500">{deleteModalGroup.tableId}</code>
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-1.5 text-xs text-red-900 dark:text-red-200">
              <p className="font-bold">⚠️ ADVERTENCIA DE ELIMINACIÓN REAL EN LA NUBE:</p>
              <p>
                Esta acción **ELIMINARÁ DEFINITIVAMENTE** las <strong>{deleteModalGroup.count} transacciones</strong> de este lote por un monto acumulado de <strong>-{formatCurrency(deleteModalGroup.totalSum)} MXN</strong> de la base de datos de forma permanente.
              </p>
              <p className="italic text-[11px]">
                Esta operación no es un ocultamiento visual. Los {deleteModalGroup.count} registros desaparecerán del dashboard, lista general, acordeones y base de datos remota.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label htmlFor="confirm-delete-count-input" className="block font-bold text-neutral-800 dark:text-neutral-200">
                Para confirmar la eliminación, escribe la cantidad exacta de filas: <strong className="text-red-600 font-mono text-sm">{deleteModalGroup.count}</strong>
              </label>
              <input
                id="confirm-delete-count-input"
                type="text"
                value={confirmDeleteInput}
                onChange={e => setConfirmDeleteInput(e.target.value)}
                placeholder={`Escribe ${deleteModalGroup.count} aquí...`}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteModalGroup(null)}
                className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                disabled={confirmDeleteInput.trim() !== String(deleteModalGroup.count)}
                onClick={() => {
                  if (onDeleteOrphanGroup && deleteModalGroup) {
                    onDeleteOrphanGroup(deleteModalGroup.tableId, deleteModalGroup.expenseIds);
                  }
                  setDeleteModalGroup(null);
                }}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-red-600/30 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Lote Definitivamente ({deleteModalGroup.count})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAFE TABLE DELETION MODAL (Prevents silent orphan creation) */}
      {tableToDeleteSafe && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md"
          onClick={() => setTableToDeleteSafe(null)}
        >
          <div
            className="relative w-[calc(100vw-1.5rem)] max-w-lg bg-white dark:bg-[#16161a] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90dvh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Eliminar Tabla "{tableToDeleteSafe.table.name}"
                </h3>
                <p className="text-xs text-neutral-500">
                  Esta tabla contiene <strong>{tableToDeleteSafe.rowsCount} registros asociados</strong> ({formatCurrency(tableToDeleteSafe.totalSum)})
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              No es posible eliminar únicamente la tabla dejando sus registros huérfanos. Elige la acción que deseas realizar con los {tableToDeleteSafe.rowsCount} registros:
            </p>

            <div className="space-y-3 text-xs">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition">
                <input
                  type="radio"
                  name="safeDeleteAction"
                  checked={safeDeleteAction === 'reassign'}
                  onChange={() => setSafeDeleteAction('reassign')}
                  className="mt-0.5"
                />
                <div>
                  <strong className="block font-bold text-neutral-900 dark:text-neutral-100">Reasignar registros a otra tabla / proyecto</strong>
                  <span className="text-[11px] text-neutral-500">Conserva los {tableToDeleteSafe.rowsCount} registros y los mueve a la tabla y proyecto elegidos.</span>
                </div>
              </label>

              {safeDeleteAction === 'reassign' && (
                <div className="pl-6 space-y-2.5 pt-1">
                  <div>
                    <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">Proyecto Destino:</label>
                    <select
                      value={safeDeleteTargetProjectId}
                      onChange={e => setSafeDeleteTargetProjectId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-bold"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>📁 {p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">Tabla Destino:</label>
                    <select
                      value={safeDeleteTargetTableId}
                      onChange={e => setSafeDeleteTargetTableId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-bold"
                    >
                      <option value="">-- Selecciona tabla --</option>
                      <option value="NEW">➕ Crear Nueva Tabla...</option>
                      {tables.filter(t => t.id !== tableToDeleteSafe.table.id && t.mode === tableToDeleteSafe.table.mode).map(t => (
                        <option key={t.id} value={t.id}>📁 {t.name}</option>
                      ))}
                    </select>
                  </div>

                  {safeDeleteTargetTableId === 'NEW' && (
                    <div>
                      <input
                        type="text"
                        value={safeDeleteNewTableName}
                        onChange={e => setSafeDeleteNewTableName(e.target.value)}
                        placeholder="Nombre de la nueva tabla..."
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-bold"
                      />
                    </div>
                  )}
                </div>
              )}

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-red-200 dark:border-red-950/60 bg-red-500/5 cursor-pointer hover:bg-red-500/10 transition">
                <input
                  type="radio"
                  name="safeDeleteAction"
                  checked={safeDeleteAction === 'delete_all'}
                  onChange={() => setSafeDeleteAction('delete_all')}
                  className="mt-0.5 text-red-600"
                />
                <div>
                  <strong className="block font-bold text-red-600 dark:text-red-400">Eliminar la tabla Y sus {tableToDeleteSafe.rowsCount} registros definitivamente</strong>
                  <span className="text-[11px] text-neutral-500">Borra de forma permanente la tabla y todos sus registros asociados de la base de datos.</span>
                </div>
              </label>

              {safeDeleteAction === 'delete_all' && (
                <div className="pl-6 pt-1 space-y-1.5">
                  <label className="block text-[11px] font-bold text-red-600">
                    Escribe la cantidad exacta ({tableToDeleteSafe.rowsCount}) para confirmar:
                  </label>
                  <input
                    type="text"
                    value={safeDeleteConfirmCountInput}
                    onChange={e => setSafeDeleteConfirmCountInput(e.target.value)}
                    placeholder={`Escribe ${tableToDeleteSafe.rowsCount} aquí...`}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-red-300 dark:border-red-800 font-mono font-bold text-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTableToDeleteSafe(null)}
                className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                disabled={
                  safeDeleteAction === 'delete_all'
                    ? safeDeleteConfirmCountInput.trim() !== String(tableToDeleteSafe.rowsCount)
                    : (!safeDeleteTargetTableId || (safeDeleteTargetTableId === 'NEW' && !safeDeleteNewTableName.trim()))
                }
                onClick={handleConfirmSafeDeleteTable}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-red-600/30 transition"
              >
                Confirmar Acción
              </button>
            </div>
          </div>
        </div>
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

      {/* RENAME TABLE MODAL */}
      {tableToRename && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md"
          onClick={() => {
            setTableToRename(null);
            setRenameError(null);
          }}
        >
          <div
            className="relative w-[calc(100vw-1.5rem)] max-w-md bg-white dark:bg-[#16161a] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Renombrar Tabla por Período
                </h3>
              </div>
              <button
                onClick={() => {
                  setTableToRename(null);
                  setRenameError(null);
                }}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                aria-label="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRenameModal} className="space-y-4">
              <div>
                <label htmlFor="rename-table-input" className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Nuevo nombre de la tabla (1 a 80 caracteres):
                </label>
                <input
                  id="rename-table-input"
                  type="text"
                  value={renameInputName}
                  onChange={e => {
                    setRenameInputName(e.target.value);
                    if (renameError) setRenameError(null);
                  }}
                  placeholder="Ej. Ingresos Julio 2026, Gastos Operativos..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  autoFocus
                  maxLength={80}
                />
                {renameError && (
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1.5 animate-in fade-in">
                    ⚠️ {renameError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTableToRename(null);
                    setRenameError(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar nombre</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
