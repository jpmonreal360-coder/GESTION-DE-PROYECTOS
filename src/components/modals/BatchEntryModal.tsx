'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Layers, DollarSign, Calendar, FileText, CheckCircle2, AlertCircle, FolderPlus, Clipboard, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { Project, Expense, Task, Document, BatchTable } from '@/types';
import { parseImportText, ParseImportResult } from '@/lib/parseImportText';

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

  // Paste Panel State
  const [isPastePanelOpen, setIsPastePanelOpen] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');
  const [parseResult, setParseResult] = useState<ParseImportResult | null>(null);

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
      setIsPastePanelOpen(false);
      setPasteText('');
      setParseResult(null);
    }
  }, [isOpen, initialMode, targetTableId]);

  // Sync rows' projectId when user changes the table project selector
  const handleTableProjectChange = (newPrjId: string) => {
    setSelectedProjectId(newPrjId);
    setRows(prevRows => prevRows.map(r => ({ ...r, projectId: newPrjId })));
  };

  const handleAddRow = () => {
    setRows([...rows, createNewRow(selectedProjectId)]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(rows.filter(r => r.id !== id));
  };

  const handleRowChange = (id: string, field: keyof BatchRowData, value: any) => {
    setRows(rows.map(r => {
      if (r.id !== id) return r;
      if (field === 'category' && value === 'NEW_CUSTOM') {
        return { ...r, category: 'NEW_CUSTOM', isCustomCategory: true };
      }
      return { ...r, [field]: value };
    }));
  };

  // Open Paste Panel
  const handleOpenPastePanel = () => {
    setIsPastePanelOpen(true);
    setPasteText('');
    setParseResult(null);
  };

  // Parse paste text in real-time
  const handlePasteTextChange = (text: string) => {
    setPasteText(text);
    if (!text.trim()) {
      setParseResult(null);
      return;
    }
    const res = parseImportText(text, defaultCategory);
    setParseResult(res);
  };

  // Confirm Paste & Append Rows in memory (no cloud save yet)
  const handleConfirmPaste = () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    const newInsertedRows: BatchRowData[] = parseResult.validRows.map(vr => ({
      id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      projectId: selectedProjectId,
      concept: vr.concept,
      category: vr.category,
      isCustomCategory: false,
      customCategoryInput: '',
      amount: vr.amount,
      date: vr.date,
      assignee: 'Edmundo A.',
      priority: 'MEDIUM',
      docFormat: 'image',
      docUrl: '',
    }));

    // If current table has 1 empty row, replace it; otherwise append
    const isSingleEmptyRow = rows.length === 1 && !rows[0].concept.trim() && rows[0].amount === '';
    if (isSingleEmptyRow) {
      setRows(newInsertedRows);
    } else {
      setRows([...rows, ...newInsertedRows]);
    }

    setIsPastePanelOpen(false);
    setPasteText('');
    setParseResult(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Filter valid rows with non-empty concept
    const validRows = rows.filter(r => r.concept.trim().length > 0);
    if (validRows.length === 0) {
      alert('Por favor completa al menos una fila con un concepto válido.');
      return;
    }

    // Collect custom categories
    const newCategories: string[] = [];
    validRows.forEach(r => {
      if (r.isCustomCategory && r.customCategoryInput && r.customCategoryInput.trim()) {
        const customCat = r.customCategoryInput.trim();
        if (!categories.includes(customCat) && !newCategories.includes(customCat)) {
          newCategories.push(customCat);
        }
      }
    });

    const activePrj = projects.find(p => p.id === selectedProjectId);

    if (mode === 'expense' || mode === 'income') {
      const expensesPayload: Partial<Expense>[] = validRows.map(r => {
        const finalCategory = r.isCustomCategory && r.customCategoryInput?.trim()
          ? r.customCategoryInput.trim()
          : r.category;

        return {
          concept: r.concept.trim(),
          category: finalCategory,
          amount: typeof r.amount === 'number' ? r.amount : 0,
          date: r.date || todayStr,
          type: mode === 'income' ? 'INCOME' : 'EXPENSE',
          status: 'PAID',
          projectId: selectedProjectId,
        };
      });

      onSaveBatch({
        mode,
        targetTableId: selectedTableId,
        newTableName: selectedTableId === 'NEW' ? (newTableName.trim() || (mode === 'income' ? 'Ingresos Julio 2026' : 'Gastos Agosto 2026')) : undefined,
        targetProjectId: selectedProjectId,
        expenses: expensesPayload,
        newCategories: newCategories.length > 0 ? newCategories : undefined,
      });
    } else if (mode === 'task') {
      const tasksPayload: Partial<Task>[] = validRows.map(r => ({
        title: r.concept.trim(),
        category: r.category,
        projectId: selectedProjectId,
        assigneeName: r.assignee || 'Edmundo A.',
        priority: (r.priority as any) || 'MEDIUM',
        status: 'TODO',
        dueDate: r.date || todayStr,
      }));

      onSaveBatch({
        mode: 'task',
        targetTableId: selectedTableId,
        newTableName: selectedTableId === 'NEW' ? (newTableName.trim() || 'Nuevas Tareas') : undefined,
        targetProjectId: selectedProjectId,
        tasks: tasksPayload,
      });
    } else if (mode === 'doc') {
      const docsPayload: Partial<Document>[] = validRows.map(r => ({
        title: r.concept.trim(),
        category: r.category,
        projectId: selectedProjectId,
        format: (r.docFormat as any) || 'image',
        url: r.docUrl.trim() || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&auto=format&fit=crop&q=80',
        uploadedAt: r.date || todayStr,
      }));

      onSaveBatch({
        mode: 'doc',
        targetTableId: selectedTableId,
        newTableName: selectedTableId === 'NEW' ? (newTableName.trim() || 'Nuevos Documentos') : undefined,
        targetProjectId: selectedProjectId,
        documents: docsPayload,
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  const totalAmountSum = rows.reduce((acc, r) => acc + (typeof r.amount === 'number' ? r.amount : 0), 0);
  const totalRowsCount = rows.filter(r => r.concept.trim().length > 0).length;
  const currentProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-[calc(100vw-1.5rem)] max-w-5xl max-h-[90dvh] bg-white dark:bg-[#16161a] rounded-3xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 bg-neutral-50/80 dark:bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Captura Masiva por Lotes & Períodos
              </h3>
              <p className="text-xs text-neutral-500">
                Alimenta múltiples filas en tablas agrupadas por período de forma atómica.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* Top Controls: Mode & Table Selector */}
          <div className="p-4 sm:p-5 bg-neutral-100/60 dark:bg-neutral-900/40 border-b border-neutral-200 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Capture Mode Selector */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-500 mb-1">
                Tipo de Captura:
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-neutral-200/60 dark:bg-neutral-800">
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

            {/* Project Assigned to Table */}
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

          {/* New Table Name Input when creating new table */}
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

          {/* Dynamic Table Input Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-[220px]">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
              >
                {/* Index badge */}
                <div className="md:col-span-1 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 text-[11px] font-bold text-neutral-600 dark:text-neutral-400 flex items-center justify-center">
                    {index + 1}
                  </span>
                </div>

                {/* Concept input */}
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1 md:hidden">Concepto:</label>
                  <input
                    type="text"
                    value={row.concept}
                    onChange={e => handleRowChange(row.id, 'concept', e.target.value)}
                    placeholder={
                      mode === 'income' ? 'Ej. Anticipo cliente...' :
                      mode === 'expense' ? 'Ej. Pago servidores Vercel...' :
                      mode === 'task' ? 'Ej. Diseñar prototipo Figma...' :
                      'Ej. Factura A-102.pdf...'
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold outline-none focus:border-blue-500"
                  />
                </div>

                {/* Category Selector */}
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1 md:hidden">Categoría:</label>
                  {!row.isCustomCategory ? (
                    <select
                      value={row.category}
                      onChange={e => handleRowChange(row.id, 'category', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium outline-none"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="NEW_CUSTOM">✨ + Otra Categoría...</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={row.customCategoryInput}
                        onChange={e => handleRowChange(row.id, 'customCategoryInput', e.target.value)}
                        placeholder="Nueva categoría..."
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-purple-500 text-xs font-bold text-purple-600 dark:text-purple-400 outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleRowChange(row.id, 'isCustomCategory', false)}
                        className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Amount / Task Priority / Doc Format */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1 md:hidden">
                    {mode === 'income' || mode === 'expense' ? 'Monto ($):' : mode === 'task' ? 'Prioridad:' : 'Formato:'}
                  </label>

                  {mode === 'income' || mode === 'expense' ? (
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">$</span>
                      <input
                        type="number"
                        step="any"
                        value={row.amount}
                        onChange={e => handleRowChange(row.id, 'amount', e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="0.00"
                        className="w-full pl-6 pr-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold outline-none"
                      />
                    </div>
                  ) : mode === 'task' ? (
                    <select
                      value={row.priority}
                      onChange={e => handleRowChange(row.id, 'priority', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold outline-none"
                    >
                      <option value="LOW">🟢 Baja</option>
                      <option value="MEDIUM">🟡 Media</option>
                      <option value="HIGH">🔴 Alta</option>
                      <option value="URGENT">🔥 Urgente</option>
                    </select>
                  ) : (
                    <select
                      value={row.docFormat}
                      onChange={e => handleRowChange(row.id, 'docFormat', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold outline-none"
                    >
                      <option value="image">🖼️ Imagen</option>
                      <option value="pdf">📄 PDF</option>
                      <option value="figma">🎨 Figma</option>
                      <option value="doc">📝 Doc</option>
                    </select>
                  )}
                </div>

                {/* Date picker */}
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1 md:hidden">Fecha:</label>
                  <input
                    type="date"
                    value={row.date}
                    onChange={e => handleRowChange(row.id, 'date', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono outline-none"
                  />
                </div>

                {/* Remove Row Button */}
                <div className="md:col-span-1 flex justify-center pt-2 md:pt-0">
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

            {/* Action Buttons: Add Row & Paste Data */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddRow}
                className="flex-1 w-full py-3 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-400 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 font-bold text-xs transition flex items-center justify-center gap-2 bg-white/40 dark:bg-neutral-900/40"
              >
                <Plus className="w-4 h-4" />
                <span>+ Agregar Otra Fila a la Tabla</span>
              </button>

              <button
                type="button"
                onClick={handleOpenPastePanel}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-purple-300 dark:border-purple-700/60 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs transition flex items-center justify-center gap-2 bg-purple-500/10 shrink-0"
              >
                <Clipboard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>📋 Pegar datos</span>
              </button>
            </div>
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

      {/* SUB-MODAL / PANEL DE PEGAR DATOS (TSV / CSV) */}
      {isPastePanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md">
          <div className="relative w-[calc(100vw-1.5rem)] max-w-2xl max-h-[85dvh] bg-white dark:bg-[#18181c] rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Importar por Pegado de Datos (Google Sheets / Excel / CSV)
                </h4>
              </div>
              <button
                onClick={() => setIsPastePanelOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              
              {mode === 'task' || mode === 'doc' ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Formato de pegado pendiente para {mode === 'task' ? 'Tareas' : 'Documentos'}</span>
                  </div>
                  <p className="text-xs">
                    El pegado masivo automático por columnas actualmente está habilitado para <strong>Ingresos</strong> y <strong>Gastos</strong>. Por favor agrega las filas manualmente usando el botón <strong>+ Agregar Otra Fila</strong>.
                  </p>
                </div>
              ) : (
                <>
                  {/* Context Info Banner */}
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-800 dark:text-purple-300 flex items-center gap-2">
                    <span className="font-bold">Hereda automáticamente:</span>
                    <span>📌 {currentProject?.name}</span>
                    <span>•</span>
                    <span>{mode === 'income' ? '📈 Ingresos' : '📉 Gastos'}</span>
                  </div>

                  {/* Format Guide */}
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 space-y-1">
                    <p className="font-bold text-neutral-700 dark:text-neutral-300">
                      Formato de columnas aceptado (copia celdas de Excel/Sheets o texto tabulado):
                    </p>
                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 font-mono text-[10px] border border-neutral-200 dark:border-neutral-800">
                      Concepto [TAB] Categoría [TAB] Monto [TAB] Fecha (YYYY-MM-DD o DD/MM/YYYY)
                    </div>
                    <p className="text-[10px]">
                      Ejemplo: <code className="bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded">Anticipo cliente \t Facturación / Cobro \t 25000 \t 2026-08-23</code>
                    </p>
                  </div>

                  {/* Textarea */}
                  <div>
                    <textarea
                      value={pasteText}
                      onChange={e => handlePasteTextChange(e.target.value)}
                      placeholder="Pega aquí tus datos copiados directamente de Google Sheets o Excel..."
                      rows={5}
                      className="w-full p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-mono text-xs outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Live Validation Preview Panel */}
                  {parseResult && (
                    <div className="space-y-3 pt-1">
                      {/* Summary Badges */}
                      <div className="flex items-center gap-3 text-xs font-bold">
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          ✓ {parseResult.validRows.length} filas válidas a importar
                        </span>
                        {parseResult.invalidRows.length > 0 && (
                          <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            ⚠ {parseResult.invalidRows.length} filas con errores (no se importarán)
                          </span>
                        )}
                      </div>

                      {/* Invalid Rows Errors Breakdown */}
                      {parseResult.invalidRows.length > 0 && (
                        <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1.5 max-h-32 overflow-y-auto">
                          <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            Detalle de errores por fila:
                          </p>
                          {parseResult.invalidRows.map((inv, idx) => (
                            <div key={idx} className="text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-2">
                              <span className="font-mono font-bold shrink-0">Fila {inv.rowIndex}:</span>
                              <span>{inv.concept ? `"${inv.concept}" - ` : ''}{inv.errors.join(', ')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPastePanelOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                Cancelar
              </button>

              {(mode === 'income' || mode === 'expense') && (
                <button
                  type="button"
                  onClick={handleConfirmPaste}
                  disabled={!parseResult || parseResult.validRows.length === 0}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Confirmar e Insertar ({parseResult?.validRows.length || 0}) Filas
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
