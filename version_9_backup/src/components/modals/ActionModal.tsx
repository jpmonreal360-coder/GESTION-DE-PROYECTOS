'use client';

import React, { useState, useEffect } from 'react';
import { X, Clipboard } from 'lucide-react';
import { Project, Expense, Task, Document } from '@/types';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  categories?: string[];
  editType?: 'expense' | 'task' | 'doc' | null;
  editItem?: any;
  onSaveExpense: (expense: Partial<Expense>) => void;
  onSaveTask: (task: Partial<Task>) => void;
  onSaveDocument: (doc: Partial<Document>) => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({
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
  editType,
  editItem,
  onSaveExpense,
  onSaveTask,
  onSaveDocument,
}) => {
  const [formType, setFormType] = useState<'doc' | 'income' | 'expense' | 'task'>('doc');
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id || 'PRJ-01');

  // Finance Fields
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState(categories[0] || 'Facturación / Cobro');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [financeDate, setFinanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Task Fields
  const [assignee, setAssignee] = useState('Edmundo A.');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  // Document Fields
  const [docFormat, setDocFormat] = useState('image');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [docUrl, setDocUrl] = useState('');
  const [pastedDataUrl, setPastedDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  useEffect(() => {
    if (editItem && editType === 'expense') {
      setFormType(editItem.type === 'INCOME' ? 'income' : 'expense');
      setTitle(editItem.concept);
      setAmount(editItem.amount);
      setCategory(editItem.category);
      setIsCustomCategory(false);
      setProjectId(editItem.projectId);
      setFinanceDate(editItem.date || new Date().toISOString().split('T')[0]);
    } else if (editItem && editType === 'task') {
      setFormType('task');
      setTitle(editItem.title);
      setAssignee(editItem.assigneeName || editItem.assignee || 'Edmundo A.');
      setPriority(editItem.priority || 'MEDIUM');
      setProjectId(editItem.projectId);
      setDueDate(editItem.dueDate || new Date().toISOString().split('T')[0]);
    } else if (editItem && editType === 'doc') {
      setFormType('doc');
      setTitle(editItem.title);
      setDocFormat(editItem.format || 'image');
      setProjectId(editItem.projectId);
      setDocDate(editItem.date || editItem.updatedAt || new Date().toISOString().split('T')[0]);
      setPastedDataUrl(editItem.previewUrl || editItem.fileUrl || null);
    } else {
      setTitle('');
      setAmount('');
      setFormType('doc');
      setPastedDataUrl(null);
      setIsCustomCategory(false);
      setCustomCategoryInput('');
    }
  }, [editItem, editType, isOpen]);

  // Handle Clipboard Paste within the Modal (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const res = event.target?.result as string;
              setPastedDataUrl(res);
              setFormType('doc');
              setDocFormat('image');
              if (!title) {
                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setTitle(`Captura Pegada (${timeStr})`);
              }
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, title]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formType === 'income' || formType === 'expense') {
      let finalCategory = category;
      if (isCustomCategory && customCategoryInput.trim()) {
        finalCategory = customCategoryInput.trim();
      }

      onSaveExpense({
        id: editItem && editType === 'expense' ? editItem.id : undefined,
        type: formType === 'income' ? 'INCOME' : 'EXPENSE',
        concept: title,
        amount: Number(amount) || 0,
        category: finalCategory,
        projectId,
        date: financeDate,
        status: 'PAID',
      });
    } else if (formType === 'task') {
      onSaveTask({
        id: editItem && editType === 'task' ? editItem.id : undefined,
        title,
        status: editItem ? editItem.status : 'TODO',
        priority,
        projectId,
        assigneeName: assignee,
        assignee,
        dueDate,
        tags: ['Asignado'],
      });
    } else {
      let fileUrl = '#';
      let previewUrl = undefined;
      let typeLabel = 'Documento';

      if (docFormat === 'pdf') {
        typeLabel = 'Documento PDF';
        fileUrl = pastedDataUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
      } else if (docFormat === 'image') {
        typeLabel = 'Foto / Screenshot Pegado';
        fileUrl = pastedDataUrl || 'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=1600&auto=format&fit=crop&q=80';
        previewUrl = pastedDataUrl || 'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=800&auto=format&fit=crop&q=80';
      } else if (docFormat === 'sheets') {
        typeLabel = 'Google Sheets';
        fileUrl = docUrl || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMd1KtCwb45SZgLUnsM60uuDtf23693/edit';
      } else {
        typeLabel = 'Enlace Cloud';
        fileUrl = docUrl || 'https://drive.google.com';
      }

      onSaveDocument({
        id: editItem && editType === 'doc' ? editItem.id : undefined,
        title,
        format: docFormat,
        docType: docFormat === 'image' ? 'IMAGE' : docFormat === 'pdf' ? 'PDF' : 'GOOGLE_SHEETS',
        typeLabel,
        projectId,
        date: docDate,
        updatedAt: docDate,
        fileUrl,
        previewUrl,
        description: `Documento o captura pegada (${typeLabel}).`,
      });
    }

    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[85dvh] overflow-y-auto p-4 sm:p-6 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold">
            {editItem ? 'Editar Registro' : 'Nuevo Registro'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 text-neutral-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Tipo de Entrada
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as any)}
              className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
            >
              <option value="doc">📁 Documento / Foto / Screenshot Pegado</option>
              <option value="income">📈 Entrada / Ingreso (+)</option>
              <option value="expense">📉 Salida / Gasto (-)</option>
              <option value="task">📋 Tarea (con fecha límite editable)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Concepto / Título
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Captura de Maqueta UI o Factura en PDF"
              className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
            />
          </div>

          {/* Document Specific Fields */}
          {formType === 'doc' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                    Formato
                  </label>
                  <select
                    value={docFormat}
                    onChange={(e) => setDocFormat(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
                  >
                    <option value="image">🖼️ Foto / Screenshot Pegado (Ctrl+V)</option>
                    <option value="pdf">📕 Archivo PDF (.pdf)</option>
                    <option value="sheets">📊 Enlace a Google Sheets</option>
                    <option value="link">🔗 Enlace Cloud</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                    Fecha del Documento
                  </label>
                  <input
                    type="date"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
                  />
                </div>
              </div>

              {(docFormat === 'image' || docFormat === 'pdf') && (
                <div className="paste-dropzone border-2 border-dashed border-blue-500/50 bg-blue-500/5 p-4 rounded-xl text-center space-y-1">
                  <Clipboard className="w-6 h-6 text-purple-500 mx-auto" />
                  <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {pastedDataUrl ? '✅ Foto / Screenshot Pegado' : '📋 Presiona Ctrl+V para pegar una foto'}
                  </p>
                  <p className="text-[11px] text-neutral-400">o copia cualquier imagen al portapapeles y pégala directamente</p>
                </div>
              )}

              {pastedDataUrl && (
                <div className="w-full h-32 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-black flex items-center justify-center">
                  <img src={pastedDataUrl} alt="Preview" className="w-full h-full object-contain" />
                </div>
              )}

              {(docFormat === 'sheets' || docFormat === 'link') && (
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                    Enlace a Google Sheets / Drive
                  </label>
                  <input
                    type="url"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMd..."
                    className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Finance Specific Fields */}
          {(formType === 'income' || formType === 'expense') && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                    Monto ($ MXN)
                  </label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="25000.00"
                    className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                    Categoría
                  </label>
                  <select
                    value={isCustomCategory ? 'CUSTOM' : category}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM') {
                        setIsCustomCategory(true);
                      } else {
                        setIsCustomCategory(false);
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="CUSTOM">➕ Agregar Nueva Categoría...</option>
                  </select>
                </div>
              </div>

              {isCustomCategory && (
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-purple-500 mb-1">
                    Nombre de la Nueva Categoría
                  </label>
                  <input
                    type="text"
                    required
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="Ej. Viáticos, Licencias Especiales..."
                    className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-purple-500 text-neutral-900 dark:text-neutral-100 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                  Fecha de la Transacción
                </label>
                <input
                  type="date"
                  value={financeDate}
                  onChange={(e) => setFinanceDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
                />
              </div>
            </div>
          )}

          {/* Task Specific Fields */}
          {formType === 'task' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                    Responsable Asignado
                  </label>
                  <select
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
                  >
                    <option value="Edmundo A.">👤 Edmundo A.</option>
                    <option value="Sofia R.">👤 Sofia R.</option>
                    <option value="Carlos M.">👤 Carlos M.</option>
                    <option value="Lucia P.">👤 Lucia P.</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
                  >
                    <option value="LOW">Baja (LOW)</option>
                    <option value="MEDIUM">Media (MEDIUM)</option>
                    <option value="HIGH">Alta (HIGH)</option>
                    <option value="URGENT">Urgente (URGENT)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                  Fecha Límite de la Tarea
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Proyecto Asignado
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/30 transition text-xs mt-2"
          >
            Guardar Cambios
          </button>
        </form>
      </div>
    </div>
  );
};
