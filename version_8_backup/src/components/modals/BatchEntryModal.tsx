'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Layers, DollarSign, Calendar, FileText, CheckCircle2, AlertCircle, FolderPlus } from 'lucide-react';
import { Project, Expense, Task, Document, BatchTable } from '@/types';

export type BatchMode = 'doc' | 'income' | 'expense' | 'task';

export interface BatchRowData {
  id: string;
  projectId: string;
  concept: string;
  category: string;
  isCustomCategory?: boolean;
  customCategoryInput?: string;
  amount: number | '';
  date: string;
  assignee: string;
  priority: string;
  docFormat: string;
  docUrl: string;
}

interface BatchEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  categories?: string[];
  tables?: BatchTable[];
  targetTableId?: string;
  initialMode?: BatchMode;
  onSaveBatch: (payload: {
    mode: BatchMode;
    targetTableId?: string;
    newTableName?: string;
    expenses?: Partial<Expense>[];
    tasks?: Partial<Task>[];
    documents?: Partial<Document>[];
    newCategories?: string[];
  }) => void;
}

export const BatchEntryModal: React.FC<BatchEntryModalProps> = ({
  isOpen,
  onClose,
  projects,
  categories = [
    'Facturación / Cobro',
    'Software & Cloud',
    'Diseño UI/UX',
    'Desarrollo Frontend/Backend',
    'Infraestructura & Server',
    'Marketing & Ads'
  ],
  tables = [],
  targetTableId = '',
  initialMode = 'expense',
  onSaveBatch,
}) => {
  const [mode, setMode] = useState<BatchMode>(initialMode);
  const [rows, setRows] = useState<BatchRowData[]>([]);

  // Table Selection State
  const [selectedTableId, setSelectedTableId] = useState<string>(targetTableId || 'NEW');
  const [newTableName, setNewTableName] = useState<string>('');

  const defaultProjectId = projects[0]?.id || 'PRJ-01';
  const defaultCategory = categories[0] || 'Facturación / Cobro';
  const todayStr = new Date().toISOString().split('T')[0];

  const createNewRow = (): BatchRowData => ({
    id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    projectId: defaultProjectId,
    concept: '',
    category: defaultCategory,
    isCustomCategory: false,
    customCategoryInput: '',
    amount: '',
    date: todayStr,
    assignee: 'Edmundo A.',
    priority: 'MEDIUM',
    docFormat: 'image',
    docUrl: '',
  });

  // Filter matching tables for current mode
  const matchingTables = tables.filter(t => t.mode === mode);

  // Reset or initialize 3 empty rows when opened or mode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setSelectedTableId(targetTableId || (matchingTables.length > 0 ? matchingTables[0].id : 'NEW'));
      setNewTableName(initialMode === 'income' ? 'Ingresos Julio 2026' : initialMode === 'expense' ? 'Gastos Agosto 2026' : 'Nuevas Tareas');
      setRows([createNewRow(), createNewRow(), createNewRow()]);
    }
  }, [isOpen, initialMode, targetTableId]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setRows(prev => [...prev, createNewRow()]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return; // Keep at least one row
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleRowChange = (id: string, field: keyof BatchRowData, value: any) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        if (field === 'category') {
          if (value === 'CUSTOM') {
            return { ...r, category: 'CUSTOM', isCustomCategory: true };
          } else {
            return { ...r, category: value, isCustomCategory: false, customCategoryInput: '' };
          }
        }
        return { ...r, [field]: value };
      })
    );
  };

  // Calculations for Footer Summary
  const validRows = rows.filter(r => r.concept.trim().length > 0);
  const totalRowsCount = validRows.length;
  
  const totalAmountSum = rows.reduce((sum, r) => {
    const val = typeof r.amount === 'number' ? r.amount : Number(r.amount) || 0;
    return sum + val;
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const activeRows = rows.filter(r => r.concept.trim().length > 0);
    if (activeRows.length === 0) {
      alert('Por favor agrega al menos un concepto en la tabla para guardar.');
      return;
    }

    const newCategoriesToSave: string[] = [];
    const expensesToSave: Partial<Expense>[] = [];
    const tasksToSave: Partial<Task>[] = [];
    const documentsToSave: Partial<Document>[] = [];

    activeRows.forEach(r => {
      let finalCategory = r.category;
      if (r.isCustomCategory && r.customCategoryInput?.trim()) {
        finalCategory = r.customCategoryInput.trim();
        if (!newCategoriesToSave.includes(finalCategory) && !categories.includes(finalCategory)) {
          newCategoriesToSave.push(finalCategory);
        }
      }

      if (mode === 'income' || mode === 'expense') {
        expensesToSave.push({
          type: mode === 'income' ? 'INCOME' : 'EXPENSE',
          concept: r.concept.trim(),
          amount: Number(r.amount) || 0,
          category: finalCategory,
          projectId: r.projectId,
          date: r.date || todayStr,
          status: 'PAID',
        });
      } else if (mode === 'task') {
        tasksToSave.push({
          title: r.concept.trim(),
          status: 'TODO',
          priority: r.priority || 'MEDIUM',
          projectId: r.projectId,
          assigneeName: r.assignee,
          assignee: r.assignee,
          dueDate: r.date || todayStr,
          tags: ['Captura Masiva'],
        });
      } else if (mode === 'doc') {
        let typeLabel = 'Documento';
        let docType: 'IMAGE' | 'PDF' | 'GOOGLE_SHEETS' = 'IMAGE';
        let fileUrl = r.docUrl.trim() || '#';

        if (r.docFormat === 'pdf') {
          typeLabel = 'Documento PDF';
          docType = 'PDF';
        } else if (r.docFormat === 'image') {
          typeLabel = 'Foto / Screenshot';
          docType = 'IMAGE';
        } else if (r.docFormat === 'sheets') {
          typeLabel = 'Google Sheets';
          docType = 'GOOGLE_SHEETS';
        }

        documentsToSave.push({
          title: r.concept.trim(),
          format: r.docFormat,
          docType,
          typeLabel,
          projectId: r.projectId,
          date: r.date || todayStr,
          updatedAt: r.date || todayStr,
          fileUrl,
          description: `Documento registrado en captura masiva.`,
        });
      }
    });

    onSaveBatch({
      mode,
      targetTableId: selectedTableId === 'NEW' ? undefined : selectedTableId,
      newTableName: selectedTableId === 'NEW' ? (newTableName.trim() || `${mode === 'income' ? 'Ingresos' : 'Gastos'} ${todayStr}`) : undefined,
      expenses: expensesToSave,
      tasks: tasksToSave,
      documents: documentsToSave,
      newCategories: newCategoriesToSave,
    });

    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-[1100px] max-w-[98vw] max-h-[92vh] flex flex-col rounded-3xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl overflow-hidden bg-white/80 dark:bg-neutral-900/90 text-neutral-900 dark:text-neutral-100"
      >
        {/* Header Bar */}
        <div className="p-5 border-b border-neutral-200/50 dark:border-neutral-800/50 flex flex-wrap items-center justify-between gap-4 bg-neutral-100/50 dark:bg-neutral-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Captura Masiva de Datos por Tabla/Período</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Crea o alimenta tablas masivas por período (ej. Ingresos Julio) sin sobrescribir información previa
              </p>
            </div>
          </div>

          {/* Mode Selector & Table Target Selection */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Modo:
              </label>
              <select
                value={mode}
                onChange={e => {
                  const newMode = e.target.value as BatchMode;
                  setMode(newMode);
                  const modeTabs = tables.filter(t => t.mode === newMode);
                  setSelectedTableId(modeTabs.length > 0 ? modeTabs[0].id : 'NEW');
                }}
                className="p-2 px-3 rounded-xl bg-white dark:bg-neutral-800 border-2 border-blue-500/40 text-neutral-900 dark:text-neutral-100 font-semibold text-xs shadow-sm outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
              >
                <option value="expense">📉 Salida / Gasto (-)</option>
                <option value="income">📈 Entrada / Ingreso (+)</option>
                <option value="task">📋 Tarea (Kanban / Equipo)</option>
                <option value="doc">📁 Documento / Enlace Cloud</option>
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Target Table Selector Banner */}
        <div className="px-6 py-3 bg-blue-50/60 dark:bg-blue-950/30 border-b border-blue-200/40 dark:border-blue-900/40 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <FolderPlus className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 shrink-0">
              Tabla de Destino / Período:
            </label>
            <select
              value={selectedTableId}
              onChange={e => setSelectedTableId(e.target.value)}
              className="p-2 px-3 rounded-xl bg-white dark:bg-neutral-800 border border-blue-300 dark:border-blue-700 text-xs font-bold text-neutral-800 dark:text-neutral-100 outline-none flex-1 max-w-xs cursor-pointer"
            >
              <option value="NEW">➕ Crear Nueva Tabla / Período...</option>
              {matchingTables.map(t => (
                <option key={t.id} value={t.id}>
                  📊 {t.name}
                </option>
              ))}
            </select>
          </div>

          {selectedTableId === 'NEW' && (
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <label className="text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                Nombre de la Tabla:
              </label>
              <input
                type="text"
                required
                value={newTableName}
                onChange={e => setNewTableName(e.target.value)}
                placeholder={mode === 'income' ? 'Ej. Ingresos Julio 2026' : 'Ej. Gastos Agosto 2026'}
                className="w-full p-2 px-3 rounded-xl bg-white dark:bg-neutral-800 border-2 border-blue-500 text-xs font-bold text-neutral-900 dark:text-neutral-100 outline-none"
              />
            </div>
          )}
        </div>

        {/* Batch Entry Table Body */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6 space-y-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase tracking-wider text-[11px] font-bold">
                <th className="py-2.5 px-2 w-12 text-center">#</th>
                <th className="py-2.5 px-2 w-48">Proyecto</th>
                <th className="py-2.5 px-2 min-w-[200px]">
                  {mode === 'task' ? 'Título de la Tarea' : mode === 'doc' ? 'Título del Documento' : 'Concepto'}
                </th>
                {(mode === 'income' || mode === 'expense') && (
                  <>
                    <th className="py-2.5 px-2 w-48">Categoría</th>
                    <th className="py-2.5 px-2 w-36">Monto ($ MXN)</th>
                    <th className="py-2.5 px-2 w-36">Fecha</th>
                  </>
                )}
                {mode === 'task' && (
                  <>
                    <th className="py-2.5 px-2 w-40">Asignado a</th>
                    <th className="py-2.5 px-2 w-32">Prioridad</th>
                    <th className="py-2.5 px-2 w-36">Fecha Límite</th>
                  </>
                )}
                {mode === 'doc' && (
                  <>
                    <th className="py-2.5 px-2 w-36">Formato</th>
                    <th className="py-2.5 px-2 min-w-[180px]">Enlace / URL (opcional)</th>
                    <th className="py-2.5 px-2 w-36">Fecha</th>
                  </>
                )}
                <th className="py-2.5 px-2 w-12 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="hover:bg-neutral-100/40 dark:hover:bg-neutral-800/30 transition group"
                >
                  {/* Index */}
                  <td className="py-2 px-2 text-center text-neutral-400 font-mono font-semibold">
                    {index + 1}
                  </td>

                  {/* Project */}
                  <td className="py-2 px-2">
                    <select
                      value={row.projectId}
                      onChange={e => handleRowChange(row.id, 'projectId', e.target.value)}
                      className="w-full p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 text-neutral-900 dark:text-neutral-100 font-medium outline-none focus:border-blue-500"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Concept / Title */}
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={row.concept}
                      onChange={e => handleRowChange(row.id, 'concept', e.target.value)}
                      placeholder={
                        mode === 'task'
                          ? 'Ej. Diseñar pantallas Kanban'
                          : mode === 'doc'
                          ? 'Ej. Contrato NDA v2'
                          : 'Ej. Factura o Pago de Licencias'
                      }
                      className="w-full p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                    />
                  </td>

                  {/* Finance Mode Columns */}
                  {(mode === 'income' || mode === 'expense') && (
                    <>
                      <td className="py-2 px-2">
                        {row.isCustomCategory ? (
                          <input
                            type="text"
                            value={row.customCategoryInput || ''}
                            onChange={e => handleRowChange(row.id, 'customCategoryInput', e.target.value)}
                            placeholder="Nombre de nueva categoría..."
                            className="w-full p-2 rounded-xl bg-purple-500/10 border border-purple-500 text-purple-900 dark:text-purple-200 outline-none"
                          />
                        ) : (
                          <select
                            value={row.category}
                            onChange={e => handleRowChange(row.id, 'category', e.target.value)}
                            className="w-full p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                            <option value="CUSTOM">➕ Nueva categoría...</option>
                          </select>
                        )}
                      </td>

                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={row.amount}
                          onChange={e => handleRowChange(row.id, 'amount', e.target.value)}
                          placeholder="0.00"
                          className="w-full p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 text-neutral-900 dark:text-neutral-100 font-mono font-semibold text-right outline-none focus:border-blue-500"
                        />
                      </td>

                      <td className="py-2 px-2">
                        <input
                          type="date"
                          value={row.date}
                          onChange={e => handleRowChange(row.id, 'date', e.target.value)}
                          className="w-full p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                        />
                      </td>
                    </>
                  )}

                  {/* Task Mode Columns */}
                  {mode === 'task' && (
                    <>
                      <td className="py-2 px-2">
                        <select
                          value={row.assignee}
                          onChange={e => handleRowChange(row.id, 'assignee', e.target.value)}
                          className="w-full p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                        >
                          <option value="Edmundo A.">👤 Edmundo A.</option>
                          <option value="Sofia R.">👤 Sofia R.</option>
                          <option value="Carlos M.">👤 Carlos M.</option>
                          <option value="Lucia P.">👤 Lucia P.</option>
                        </select>
                      </td>

                      <td className="py-2 px-2">
                        <select
                          value={row.priority}
                          onChange={e => handleRowChange(row.id, 'priority', e.target.value)}
                          className="w-full p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 text-neutral-900 dark:text-neutral-100 font-semibold outline-none focus:border-blue-500"
                        >
                          <option value="LOW">Baja</option>
                          <option value="MEDIUM">Media</option>
                          <option value="HIGH">Alta</option>
                          <option value="URGENT">Urgente</option>
                        </select>
                      </td>

                      <td className="py-2 px-2">
                        <input
                          type="date"
                          value={row.date}
                          onChange={e => handleRowChange(row.id, 'date', e.target.value)}
                          className="w-full p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                        />
                      </td>
                    </>
                  )}

                  {/* Document Mode Columns */}
                  {mode === 'doc' && (
                    <>
                      <td className="py-2 px-2">
                        <select
                          value={row.docFormat}
                          onChange={e => handleRowChange(row.id, 'docFormat', e.target.value)}
                          className="w-full p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                        >
                          <option value="image">🖼️ Foto / Screenshot</option>
                          <option value="pdf">📕 PDF Documento</option>
                          <option value="sheets">📊 Google Sheets</option>
                          <option value="link">🔗 Enlace Cloud</option>
                        </select>
                      </td>

                      <td className="py-2 px-2">
                        <input
                          type="url"
                          value={row.docUrl}
                          onChange={e => handleRowChange(row.id, 'docUrl', e.target.value)}
                          placeholder="https://..."
                          className="w-full p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                        />
                      </td>

                      <td className="py-2 px-2">
                        <input
                          type="date"
                          value={row.date}
                          onChange={e => handleRowChange(row.id, 'date', e.target.value)}
                          className="w-full p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                        />
                      </td>
                    </>
                  )}

                  {/* Remove Row Action */}
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      disabled={rows.length <= 1}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition"
                      title="Eliminar fila"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/30 transition text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Agregar otra fila</span>
          </button>
        </div>

        {/* Footer Summary & Action Bar */}
        <div className="p-4 sm:p-5 border-t border-neutral-200/50 dark:border-neutral-800/50 bg-neutral-100/60 dark:bg-neutral-800/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold">
            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
              <span>
                Total de registros: <strong className="text-neutral-900 dark:text-neutral-100 font-mono text-sm">{totalRowsCount}</strong> ({rows.length} filas en grilla)
              </span>
            </div>

            {(mode === 'income' || mode === 'expense') && (
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span>
                  Suma Total: <strong className={`font-mono text-sm ${mode === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    ${totalAmountSum.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                  </strong>
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 font-semibold transition text-xs"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30 transition text-xs flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Cambios ({totalRowsCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
