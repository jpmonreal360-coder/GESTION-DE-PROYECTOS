const fs = require('fs');

async function seed() {
  const payload = {
    workspaceId: 'rc_ws_main',
    isCustomized: true,
    updatedAt: Date.now() + 100000,
    projects: [
      { id: 'PRJ-01', name: 'App iOS Redesign', code: 'IOS-01', budget: 450000, totalBudget: 450000, spent: 284500, spentBudget: 284500, color: '#007AFF', category: 'Mobile App', startDate: '2026-08-01', endDate: '2026-11-30' },
      { id: 'PRJ-02', name: 'SaaS Dashboard v2', code: 'SAAS-02', budget: 350000, totalBudget: 350000, spent: 312000, spentBudget: 312000, color: '#AF52DE', category: 'Web App', startDate: '2026-07-15', endDate: '2026-10-15' },
      { id: 'PRJ-03', name: 'Brand Identity 2026', code: 'BRAND-03', budget: 220000, totalBudget: 220000, spent: 148000, spentBudget: 148000, color: '#FF9500', category: 'Design', startDate: '2026-08-05', endDate: '2026-09-30' }
    ],
    expenses: [
      { id: 'exp-101', type: 'INCOME', concept: 'Anticipo 50% Proyecto Rediseño iOS', amount: 225000, category: 'Facturación / Cobro', projectId: 'PRJ-01', date: '2026-08-01', status: 'PAID' },
      { id: 'exp-102', type: 'INCOME', concept: 'Cobro Hito 1 SaaS Dashboard', amount: 175000, category: 'Facturación / Cobro', projectId: 'PRJ-02', date: '2026-08-05', status: 'PAID' },
      { id: 'exp-103', type: 'INCOME', concept: 'Pago Total Brand Identity 2026', amount: 220000, category: 'Facturación / Cobro', projectId: 'PRJ-03', date: '2026-08-08', status: 'PAID' },
      { id: 'exp-1', type: 'EXPENSE', concept: 'Suscripción Figma Enterprise', amount: 28400, category: 'Software & Cloud', projectId: 'PRJ-01', date: '2026-08-15', status: 'PAID' },
      { id: 'exp-2', type: 'EXPENSE', concept: 'Servidores AWS & Cloudflare CDN', amount: 64000, category: 'Infraestructura & Server', projectId: 'PRJ-02', date: '2026-08-14', status: 'PAID' },
      { id: 'exp-3', type: 'EXPENSE', concept: 'Tipografía Personalizada Font Lab', amount: 16450, category: 'Diseño UI/UX', projectId: 'PRJ-03', date: '2026-08-10', status: 'PAID' }
    ],
    tasks: [
      { id: 'tsk-1', title: 'Diseñar componentes esmerilados (Glassmorphism)', status: 'IN_PROGRESS', priority: 'HIGH', projectId: 'PRJ-01', assigneeName: 'Edmundo A.', assignee: 'Edmundo A.', dueDate: '2026-08-25', tags: ['UI/UX', 'Apple'] },
      { id: 'tsk-2', title: 'Implementar atajos de teclado Cmd+K para Spotlight', status: 'COMPLETED', priority: 'MEDIUM', projectId: 'PRJ-02', assigneeName: 'Sofia R.', assignee: 'Sofia R.', dueDate: '2026-08-18', tags: ['Frontend'] }
    ],
    documents: [
      {
        id: 'pdoc-1',
        title: 'Contrato Marco de Desarrollo & NDA v1.2',
        format: 'pdf',
        docType: 'PDF',
        typeLabel: 'Contrato PDF',
        projectId: 'PRJ-01',
        date: '2026-08-01',
        updatedAt: '2026-08-01',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        description: 'Documento legal en formato PDF firmado con acuerdo de confidencialidad.'
      },
      {
        id: 'pdoc-2',
        title: 'Foto / Captura de Maqueta UI Aprobada',
        format: 'image',
        docType: 'IMAGE',
        typeLabel: 'Foto / Imagen',
        projectId: 'PRJ-01',
        date: '2026-08-12',
        updatedAt: '2026-08-12',
        previewUrl: 'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=800&auto=format&fit=crop&q=80',
        fileUrl: 'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=1600&auto=format&fit=crop&q=80',
        description: 'Fotografía / Render en alta resolución del diseño UI/UX validado por el cliente.'
      }
    ],
    wikiDocs: [
      {
        id: 'doc-1',
        title: 'Guía de Estilo UI/UX - Apple Human Interface Guidelines',
        projectId: 'PRJ-01',
        updatedAt: '2026-08-19',
        content: '### Principios de Diseño\n1. Translucidez y Vidrio Esmerilado\n2. Jerarquía Tipográfica'
      }
    ],
    categories: [
      'Facturación / Cobro',
      'Software & Cloud',
      'Diseño UI/UX',
      'Desarrollo Frontend/Backend',
      'Infraestructura & Server',
      'Marketing & Ads'
    ],
    projectCategories: [
      'Mobile App',
      'Web App',
      'Design',
      'Infrastructure',
      'Marketing'
    ]
  };

  const res = await fetch('https://glowing-shrimp-40243.upstash.io/set/ws_rc_ws_main', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer AZwzAAlgZWFlMmExYTE0OTk0NGU2YTk4NDQyMDY0YTRlOWRkMTBwNDAyNDM',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: 'rc_ws_main',
      workspaceId: 'rc_ws_main',
      state: payload,
      updatedAt: payload.updatedAt
    })
  });

  const text = await res.text();
  console.log('Direct Upstash Seed Response:', text);
}

seed();
