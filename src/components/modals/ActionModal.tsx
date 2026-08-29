'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Clipboard, Upload, CheckCircle, AlertCircle, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import { Project, Expense, Task, Document, Responsible, AttachmentRef } from '@/types';
import { upload } from '@vercel/blob/client';
import { realtimeSync } from '@/lib/firebaseSync';

export interface PendingFileUpload {
  id: string;
  file: File;
  previewUrl: string; // Transient in-memory URL (URL.createObjectURL)
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  errorMessage?: string;
  attachmentRef?: AttachmentRef;
}

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  categories?: string[];
  responsibles?: Responsible[];
  editType?: 'expense' | 'task' | 'doc' | null;
  editItem?: any;
  onSaveExpense: (expense: Partial<Expense>) => void;
  onSaveTask: (task: Partial<Task>) => void;
  onSaveDocument: (doc: Partial<Document>) => void;
}

async function computeClientSha256(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
  responsibles = [],
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
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [respSearchQuery, setRespSearchQuery] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Document Fields
  const [docFormat, setDocFormat] = useState('image');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [docUrl, setDocUrl] = useState('');

  // Pending File Upload Queue State (0 Base64, 0 Data URLs)
  const [uploadQueue, setUploadQueue] = useState<PendingFileUpload[]>([]);
  const isUploadingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke in-memory Object URLs on cleanup
  const revokeObjectUrls = useCallback((queue: PendingFileUpload[]) => {
    queue.forEach(item => {
      if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(item.previewUrl); } catch (e) {}
      }
    });
  }, []);

  useEffect(() => {
    if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  useEffect(() => {
    if (editType === 'task') {
      setFormType('task');
      setTitle(editItem ? editItem.title : '');
      setAssignee(editItem ? (editItem.assigneeName || editItem.assignee || 'Edmundo A.') : 'Edmundo A.');
      setSelectedAssigneeIds(editItem?.assigneeIds || []);
      setPriority(editItem?.priority || 'MEDIUM');
      setProjectId(editItem ? editItem.projectId : projects[0]?.id || 'PRJ-01');
      setDueDate(editItem?.dueDate || new Date().toISOString().split('T')[0]);
      setNotes(editItem?.notes || '');
    } else if (editType === 'expense' || (editItem && editItem.concept)) {
      setFormType(editItem?.type === 'INCOME' ? 'income' : 'expense');
      setTitle(editItem ? editItem.concept : '');
      setAmount(editItem ? editItem.amount : '');
      setCategory(editItem ? editItem.category : categories[0] || 'Facturación / Cobro');
      setIsCustomCategory(false);
      setProjectId(editItem ? editItem.projectId : projects[0]?.id || 'PRJ-01');
      setFinanceDate(editItem?.date || new Date().toISOString().split('T')[0]);
    } else if (editType === 'doc' || (editItem && editItem.format)) {
      setFormType('doc');
      setTitle(editItem ? editItem.title : '');
      setDocFormat(editItem?.format || 'image');
      setProjectId(editItem ? editItem.projectId : projects[0]?.id || 'PRJ-01');
      setDocDate(editItem?.date || editItem?.updatedAt || new Date().toISOString().split('T')[0]);
    } else {
      setTitle('');
      setAmount('');
      setSelectedAssigneeIds([]);
      setRespSearchQuery('');
      setNotes('');
      setFormType('task');
      setIsCustomCategory(false);
      setCustomCategoryInput('');
    }
    setUploadQueue(prev => {
      revokeObjectUrls(prev);
      return [];
    });
  }, [editItem, editType, isOpen, projects, categories, revokeObjectUrls]);

  // Clean up object URLs on modal unmount
  useEffect(() => {
    return () => {
      setUploadQueue(prev => {
        revokeObjectUrls(prev);
        return [];
      });
    };
  }, [revokeObjectUrls]);

  // Add raw File objects to upload queue (NO FileReader, NO Base64)
  const addFilesToQueue = useCallback((files: File[]) => {
    if (!files || files.length === 0) return;

    const MAX_DOC_SIZE = 500 * 1024 * 1024; // 500 MB max

    const newItems: PendingFileUpload[] = files.map(file => {
      const isTooLarge = file.size > MAX_DOC_SIZE;
      return {
        id: `upl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
        status: isTooLarge ? 'failed' : 'pending',
        progress: 0,
        errorMessage: isTooLarge ? 'Excede el límite de 500 MB' : undefined
      };
    });

    setFormType('doc');
    setDocFormat(files[0].type.includes('pdf') ? 'pdf' : 'image');

    if (!title && files.length === 1) {
      setTitle(files[0].name.replace(/\.[^/.]+$/, ''));
    } else if (!title && files.length > 1) {
      setTitle(`Lote de ${files.length} Documentos`);
    }

    setUploadQueue(prev => [...prev, ...newItems]);
  }, [title]);

  // Upload runner queue with concurrency limit = 3
  useEffect(() => {
    if (uploadQueue.length === 0 || isUploadingRef.current) return;

    const pendingItems = uploadQueue.filter(i => i.status === 'pending');
    if (pendingItems.length === 0) return;

    const processQueue = async () => {
      isUploadingRef.current = true;
      try {
        const CONCURRENCY_LIMIT = 3;

        const rawWsId = realtimeSync.getWorkspaceId();
        if (!rawWsId || typeof rawWsId !== 'string' || rawWsId.trim() === '') {
          throw new Error('WORKSPACE_ID_REQUIRED: No existe un workspaceId activo en la sesión.');
        }
        const activeWorkspaceId = rawWsId.trim();

        const itemsToProcess = pendingItems.slice(0, CONCURRENCY_LIMIT);

        await Promise.all(itemsToProcess.map(async (item) => {
          setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading', progress: 20 } : q));

          try {
            // 1. Client SHA-256 calculation
            const sha256 = await computeClientSha256(item.file);
            const timestamp = Date.now();
            const safeName = item.file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
            const uploadId = `att_${timestamp}_${Math.random().toString(36).substring(2, 6)}`;
            const storageKey = `workspaces/${activeWorkspaceId}/projects/${projectId}/attachments/${uploadId}_${safeName}`;

            // 2. Client SDK Upload via POST /api/attachments/upload
            const blobResult = await upload(storageKey, item.file, {
              access: 'private',
              handleUploadUrl: '/api/attachments/upload',
              clientPayload: JSON.stringify({
                workspaceId: activeWorkspaceId,
                projectId,
                mimeType: item.file.type || 'application/octet-stream'
              })
            });

            setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 70 } : q));

            // 3. Complete Server Verification POST /api/attachments/complete
            const completeRes = await fetch('/api/attachments/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uploadId,
                storageKey,
                workspaceId: activeWorkspaceId,
                projectId,
                mimeType: item.file.type || 'application/octet-stream',
                byteSize: item.file.size,
                sha256,
                fileName: item.file.name
              })
            });

            if (!completeRes.ok) {
              const errData = await completeRes.json().catch(() => ({}));
              throw new Error(errData.message || `Complete falló con status HTTP ${completeRes.status}`);
            }

            const completeJson = await completeRes.json();
            const attachmentRef: AttachmentRef = completeJson.attachment;

            setUploadQueue(prev => prev.map(q => q.id === item.id ? {
              ...q,
              status: 'completed',
              progress: 100,
              attachmentRef
            } : q));

          } catch (err: any) {
            console.error(`[ACTION MODAL UPLOAD ERROR] File ${item.file.name}:`, err);
            setUploadQueue(prev => prev.map(q => q.id === item.id ? {
              ...q,
              status: 'failed',
              progress: 0,
              errorMessage: err.message || 'Error en la subida'
            } : q));
          }
        }));
      } finally {
        isUploadingRef.current = false;
      }
    };

    processQueue();
  }, [uploadQueue, projectId]);

  // Handle Clipboard Paste (Ctrl+V) using raw File/Blob (0 FileReader, 0 Base64)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('pdf') !== -1) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        addFilesToQueue(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, addFilesToQueue]);

  if (!isOpen) return null;

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

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
      const selectedNames = responsibles
        .filter(r => selectedAssigneeIds.includes(r.id))
        .map(r => r.name);

      const finalAssigneeName = selectedNames.length > 0 ? selectedNames.join(', ') : assignee;

      onSaveTask({
        id: editItem && editType === 'task' ? editItem.id : undefined,
        title,
        status: editItem ? editItem.status : 'TODO',
        priority,
        projectId,
        assigneeName: finalAssigneeName,
        assignee: finalAssigneeName,
        assigneeIds: selectedAssigneeIds,
        dueDate,
        notes: notes.trim() || undefined,
        tags: ['Asignado'],
      });
    } else {
      // Document / Upload Mode: Save only items with confirmed AttachmentRef
      const completedItems = uploadQueue.filter(i => i.status === 'completed' && i.attachmentRef);

      if (completedItems.length > 0) {
        completedItems.forEach((item, idx) => {
          const ref = item.attachmentRef!;
          const itemTitle = completedItems.length === 1 ? title || item.file.name : `${title || 'Documento'} (${idx + 1})`;
          const isPdf = item.file.type.includes('pdf');

          onSaveDocument({
            id: editItem && editType === 'doc' && idx === 0 ? editItem.id : undefined,
            title: itemTitle,
            format: isPdf ? 'pdf' : 'image',
            docType: isPdf ? 'PDF' : 'IMAGE',
            typeLabel: isPdf ? 'Documento PDF' : 'Foto / Captura',
            projectId,
            date: docDate,
            updatedAt: docDate,
            fileUrl: `/api/attachments/${ref.id}`,
            previewUrl: `/api/attachments/${ref.id}`,
            attachment: ref,
            description: `Adjunto Vercel Blob en ${projectId} (SHA-256: ${ref.sha256.substring(0, 12)}...).`,
          });
        });
      } else if (docFormat === 'sheets' || docFormat === 'link') {
        const typeLabel = docFormat === 'sheets' ? 'Google Sheets' : 'Enlace Cloud';
        const fileUrl = docUrl || (docFormat === 'sheets' ? 'https://docs.google.com/spreadsheets' : 'https://drive.google.com');

        onSaveDocument({
          id: editItem && editType === 'doc' ? editItem.id : undefined,
          title,
          format: docFormat,
          docType: docFormat === 'sheets' ? 'GOOGLE_SHEETS' : 'PDF',
          typeLabel,
          projectId,
          date: docDate,
          updatedAt: docDate,
          fileUrl,
          previewUrl: fileUrl,
          description: `Enlace externo (${typeLabel}).`,
        });
      } else if (editItem && (editType === 'doc' || editItem.format)) {
        // Edit existing document metadata (title, date, project) when no new file upload is queued
        onSaveDocument({
          ...editItem,
          title: title.trim() || editItem.title,
          projectId,
          date: docDate,
          updatedAt: docDate,
          format: docFormat || editItem.format || 'image',
        });
      }
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
              <option value="doc">📄 Documento / Archivo Adjunto</option>
              <option value="expense">💸 Gasto (Egreso)</option>
              <option value="income">💰 Ingreso (Cobro)</option>
              <option value="task">📋 Tarea / Compromiso</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Título / Concepto
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Factura de Servidor / Cotización Obra..."
              className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
            />
          </div>

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
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
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
                    <option value="image">🖼️ Fotos / Screenshots</option>
                    <option value="pdf">📕 Documento PDF</option>
                    <option value="sheets">📊 Google Sheets</option>
                    <option value="link">🔗 Enlace Cloud (Drive/Dropbox)</option>
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
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="paste-dropzone border-2 border-dashed border-blue-500/50 bg-blue-500/5 p-4 rounded-xl text-center space-y-1 cursor-pointer hover:bg-blue-500/10 transition"
                  >
                    <Upload className="w-6 h-6 text-blue-500 mx-auto" />
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                      📋 Pega con Ctrl+V o haz clic para seleccionar archivos
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Soporta selección múltiple (10+ imágenes). Carga directa a Vercel Blob (0 Base64).
                    </p>
                  </div>
                </div>
              )}

              {/* Upload Queue Progress Panel */}
              {uploadQueue.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-neutral-900/60 rounded-xl border border-neutral-800">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1">
                    Cola de Carga Vercel Blob ({uploadQueue.filter(q => q.status === 'completed').length} / {uploadQueue.length} completados)
                  </p>
                  {uploadQueue.map((item) => (
                    <div key={item.id} className="p-2 rounded-lg bg-neutral-800/80 flex items-center justify-between gap-3 text-[11px]">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.previewUrl ? (
                          <img src={item.previewUrl} alt="Thumb" className="w-8 h-8 object-cover rounded shrink-0 border border-white/10" />
                        ) : (
                          <FileText className="w-6 h-6 text-neutral-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold truncate text-white">{item.file.name}</p>
                          <p className="text-[10px] text-neutral-400">{(item.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {item.status === 'pending' && <span className="text-neutral-400">En cola...</span>}
                        {item.status === 'uploading' && (
                          <span className="text-blue-400 flex items-center gap-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> {item.progress}%
                          </span>
                        )}
                        {item.status === 'completed' && (
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" /> Listo
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="text-red-400 flex items-center gap-1 font-medium" title={item.errorMessage}>
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[150px]">{item.errorMessage || 'Error'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
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
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="CUSTOM">+ Otra categoría...</option>
                  </select>
                </div>
              </div>

              {isCustomCategory && (
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                    Nombre de la Nueva Categoría
                  </label>
                  <input
                    type="text"
                    required
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="Ej. Material de Construcción"
                    className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                  Fecha del Registro
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
              <div>
                <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                  Prioridad
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
                >
                  <option value="LOW">🔵 Baja</option>
                  <option value="MEDIUM">🟡 Media</option>
                  <option value="HIGH">🔴 Alta</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                  Fecha Límite
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                  Notas / Detalles
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles adicionales de la tarea..."
                  className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none h-20 resize-none"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200/40 dark:border-neutral-800/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-200/60 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formType === 'doc' && (docFormat === 'image' || docFormat === 'pdf') && uploadQueue.length > 0 && uploadQueue.some(q => q.status === 'uploading')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold shadow-md shadow-blue-600/30 transition cursor-pointer"
            >
              {uploadQueue.some(q => q.status === 'uploading') ? 'Subiendo Archivos...' : 'Guardar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
