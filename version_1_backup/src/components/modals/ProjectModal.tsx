'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Project } from '@/types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: Project | null;
  onSave: (projectData: Partial<Project>) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  projectToEdit,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [budget, setBudget] = useState(20000);
  const [category, setCategory] = useState('Mobile App');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (projectToEdit) {
      setName(projectToEdit.name);
      setCode(projectToEdit.code);
      setBudget(projectToEdit.budget ?? projectToEdit.totalBudget ?? 20000);
      setCategory(projectToEdit.category || 'Mobile App');
      setStartDate(projectToEdit.startDate || new Date().toISOString().split('T')[0]);
      setEndDate(projectToEdit.endDate || new Date().toISOString().split('T')[0]);
    } else {
      setName('');
      setCode('PRJ-0' + Math.floor(Math.random() * 10 + 4));
      setBudget(20000);
      setCategory('Mobile App');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
    }
  }, [projectToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: projectToEdit ? projectToEdit.id : undefined,
      name,
      code,
      budget: Number(budget),
      totalBudget: Number(budget),
      category,
      startDate,
      endDate,
    });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[480px] max-w-[95vw] p-6 rounded-2xl apple-glass border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {projectToEdit ? 'Editar Proyecto' : 'Nuevo Proyecto'}
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
              Nombre del Proyecto
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Rediseño App iOS u Portal Clientes"
              className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Código / ID
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="PRJ-04"
                className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Presupuesto ($ USD)
              </label>
              <input
                type="number"
                required
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                placeholder="20000"
                className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Fecha Inicio (Editable)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Fecha Término (Editable)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Categoría
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 outline-none"
            >
              <option value="Mobile App">Mobile App</option>
              <option value="Web App">Web App / SaaS</option>
              <option value="Design">Diseño UI/UX & Branding</option>
              <option value="Infrastructure">Infraestructura Cloud</option>
              <option value="Marketing">Marketing & Launch</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/30 transition text-xs mt-2"
          >
            Guardar Proyecto
          </button>
        </form>
      </div>
    </div>
  );
};
