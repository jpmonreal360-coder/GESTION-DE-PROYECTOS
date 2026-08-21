'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Layers, DollarSign, Calendar, FileText, CheckCircle2, AlertCircle, FolderPlus, FolderKanban } from 'lucide-react';
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
    targetProjectId?: string;
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

  // Table & Project Selection State
  const [selectedTableId, setSelectedTableId] = useState<string>(targetTableId || 'NEW');
  const [newTableName, setNewTableName] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || 'PRJ-01');

  const defaultCategory = categories[0] || 'Facturación / Cobro';
  const todayStr = new Date().toISOString().split('T')[0];

  const createNewRow = (prjId?: string): BatchRowData => ({
    id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    projectId: prjId || selectedProjectId || projects[0]?.id || 'PRJ-01',
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
      const initialPrj = projects[0]?.id || 'PRJ-01';
      setSelectedProjectId(initialPrj);
      setRows([createNewRow(initialPrj), createNewRow(initialPrj), createNewRow(initialPrj)]);
    }
  }, [isOpen, initialMode, targetTableId]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setRows(prev => [...prev, createNewRow(selectedProjectId)]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return; // Keep at least one row
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleTableProjectChange = (prjId: string) => {
    setSelectedProjectId(prjId);
    setRows(prev => prev.map(r => ({ ...r, projectId: prjId })));
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
          projectId: r.projectId || selectedProjectId,
          date: r.date || todayStr,
          status: 'PAID',
        });
      } else if (mode === 'task') {
        tasksToSave.push({
          title: r.concept.trim(),
          status: 'TODO',
          priority: r.priority || 'MEDIUM',
          projectId: r.projectId || selectedProjectId,
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
          projectId: r.projectId || selectedProjectId,
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
      targetProjectId: selectedProjectId,
      expenses: expensesToSave,
      tasks: tasksToSave,
      documents: documentsToSave,
      newCategories: newCategoriesToSave,
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#16161a] border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4 bg-neutral-50/50 dark:bg-black/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Captura Masiva & Gestión de Tablas
              </h2>
              <p className="text-xs text-neutral-500">
                Agrega múltiples registros de datos organizados por períodos o proyectos.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Table & Mode Selector Header Controls */}
        <div className="p-4 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-100/60 dark:bg-neutral-900/50 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Mode Switcher */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 mb-1">
              Tipo de Captura:
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setMode('income')}
                className={`py-1.5 rounded-lg text-xs font-bold transition ${
                  mode === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-300'
                }`}
              >
                📈 Ingreso
              </button>
              <button
                type="button"
                onClick={() => setMode('expense')}
                className={`py-1.5 rounded-lg text-xs font-bold transition ${
                  mode === 'expense' ? 'bg-rose-600 text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-300'
                }`}
              >
                📉 Gasto
              </button>
              <button
                type="button"
                onClick={() => setMode('task')}
                className={`py-1.5 rounded-lg text-xs font-bold transition ${
                  mode === 'task' ? 'bg-purple-600 text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-300'
                }`}
              >
                📋 Tareas
              </button>
              <button
                type="button"
                onClick={() => setMode('doc')}
                className={`py-1.5 rounded-lg text-xs font-bold transition ${
                  mode === 'doc' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-300'
                }`}
              >
                📄 Docs
              </button>
            </div>
          </div>

          {/* Table Target Selector */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 mb-1">
              Tabla / Período Destino:
            </label>
            <select
              value={selectedTableId}
              onChange={e => setSelectedTableId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 outline-none"
            >
              <option value="NEW">➕ Crear Nueva Tabla / Período...</option>
              {matchingTables.map(t => (
                <option key={t.id} value={t.id}>
                  📁 {t.name} ({t.createdAt})
                </option>
              ))}
            </select>
          </div>

          {/* Project & New Table Name Input */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-neutral-500">
              Proyecto Asignado a la Tabla:
            </label>
            <select
              value={selectedProjectId}
              onChange={e => handleTableProjectChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 outline-none"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  📌 {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* New Table Name Sub-Header when creating new table */}
        {selectedTableId === 'NEW' && (
          <div className="px-5 py-2.5 bg-blue-500/10 border-b border-blue-500/20 flex items-center gap-3">
            <FolderPlus className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 shrink-0">Nombre de la Nueva Tabla:</span>
            <input
              type="text"
              value={newTableName}
              onChange={e => setNewTableName(e.target.value)}
              placeholder="Ej. Ingresos Julio 2026, Gastos Licencias..."
              className="flex-1 px-3 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-blue-300 dark:border-blue-700 text-xs font-bold outline-none"
            />
          </div>
        )}

        {/* Dynamic Grid Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-5 overflow-y-auto space-y-3">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center hover:border-neutral-300 dark:hover:border-neutral-700 transition"
              >
                {/* Concept / Title Input */}
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1">
                    #{index + 1} Concepto / Descripción
                  </label>
                  <input
                    type="text"
                    value={row.concept}
                    onChange={e => handleRowChange(row.id, 'concept', e.target.value)}
                    placeholder={
                      mode === 'income'
                        ? 'Ej. Anticipo 50% Factura'
                        : mode === 'expense'
                        ? 'Ej. Servidores AWS'
                        : mode === 'task'
                        ? 'Ej. Rediseñar vista'
                        : 'Ej. NDA Firmado PDF'
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium outline-none focus:border-blue-500"
                    required={index === 0}
                  />
                </div>

                {/* Project Selector per Row */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1">
                    Proyecto
                  </label>
                  <select
                    value={row.projectId}
                    onChange={e => handleRowChange(row.id, 'projectId', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium outline-none"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category or Priority or DocFormat */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1">
                    {mode === 'task' ? 'Prioridad' : mode === 'doc' ? 'Formato' : 'Categoría'}
                  </label>
                  {mode === 'task' ? (
                    <select
                      value={row.priority}
                      onChange={e => handleRowChange(row.id, 'priority', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium outline-none"
                    >
                      <option value="LOW">Baja</option>
                      <option value="MEDIUM">Media</option>
                      <option value="HIGH">Alta</option>
                      <option value="URGENT font-bold">Urgente 🔥</option>
                    </select>
                  ) : mode === 'doc' ? (
                    <select
                      value={row.docFormat}
                      onChange={e => handleRowChange(row.id, 'docFormat', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium outline-none"
                    >
                      <option value="image">Foto / Imagen</option>
                      <option value="pdf">Documento PDF</option>
                      <option value="sheets">Google Sheets</option>
                    </select>
                  ) : (
                    <select
                      value={row.isCustomCategory ? 'CUSTOM' : row.category}
                      onChange={e => handleRowChange(row.id, 'category', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium outline-none"
                    >
                      {categories.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="CUSTOM">➕ Nueva Categoría...</option>
                    </select>
                  )}
                </div>

                {/* Custom Category Input if selected */}
                {row.isCustomCategory && (mode === 'income' || mode === 'expense') && (
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-purple-500 mb-1">
                      Nombre Nueva Cat.
                    </label>
                    <input
                      type="text"
                      value={row.customCategoryInput || ''}
                      onChange={e => handleRowChange(row.id, 'customCategoryInput', e.target.value)}
                      placeholder="Escribe categoría..."
                      className="w-full px-2.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-400 text-xs font-bold outline-none"
                    />
                  </div>
                )}

                {/* Amount / Doc URL / Assignee Input */}
                <div className={row.isCustomCategory ? 'md:col-span-2' : 'md:col-span-2'}>
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1">
                    {mode === 'task' ? 'Responsable' : mode === 'doc' ? 'URL Archivo' : 'Monto ($ MXN)'}
                  </label>
                  {mode === 'task' ? (
                    <input
                      type="text"
                      value={row.assignee}
                      onChange={e => handleRowChange(row.id, 'assignee', e.target.value)}
                      placeholder="Edmundo A."
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs outline-none"
                    />
                  ) : mode === 'doc' ? (
                    <input
                      type="text"
                      value={row.docUrl}
                      onChange={e => handleRowChange(row.id, 'docUrl', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs outline-none"
                    />
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      value={row.amount}
                      onChange={e => handleRowChange(row.id, 'amount', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold font-mono outline-none"
                    />
                  )}
                </div>

                {/* Date Input */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={row.date}
                    onChange={e => handleRowChange(row.id, 'date', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono outline-none"
                  />
                </div>

                {/* Remove Row Button */}
                <div className="md:col-span-1 flex justify-center pt-3 md:pt-0">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(row.id)}
                    disabled={rows.length <= 1}
                    className="p-1.5 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Eliminar esta fila"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddRow}
              className="w-full py-3 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-400 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 font-bold text-xs transition flex items-center justify-center gap-2 bg-white/40 dark:bg-neutral-900/40"
            >
              <Plus className="w-4 h-4" />
              <span>+ Agregar Otra Fila a la Tabla</span>
            </button>
          </div>

          {/* Modal Footer & Total Summary */}
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="px-3 py-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                {totalRowsCount} filas listas
              </span>

              {(mode === 'income' || mode === 'expense') && (
                <span className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
                  Suma Total:{' '}
                  <strong className={mode === 'income' ? 'text-emerald-500' : 'text-rose-500'}>
                    {mode === 'income' ? '+' : '-'}${totalAmountSum.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                  </strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Guardar Tabla e Historia ({totalRowsCount})</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
