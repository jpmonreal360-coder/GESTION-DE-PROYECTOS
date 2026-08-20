// Application State & Data Store
const state = {
  theme: localStorage.getItem('aura-theme') || 'light',
  currentView: 'dashboard', // 'dashboard' | 'expenses' | 'tasks' | 'docs' | 'wiki'
  activeProjectFilter: 'all',
  taskViewMode: 'kanban', // 'kanban' | 'table'
  financeFilter: 'all', // 'all' | 'INCOME' | 'EXPENSE'
  docFormatFilter: 'all', // 'all' | 'pdf' | 'image' | 'sheets'
  activeWikiDocId: 'doc-1',
  isProjectDropdownOpen: false,
  isMobileSidebarOpen: false,
  isCustomized: false,
  isSyncing: false,
  lastLocalTimestamp: 0,
  workspaceId: 'rc_ws_main',

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
  ],

  projects: [
    { id: 'PRJ-01', name: 'App iOS Redesign', code: 'IOS-01', budget: 450000, spent: 284500, color: 'var(--accent-blue)', category: 'Mobile App', startDate: '2026-08-01', endDate: '2026-11-30' },
    { id: 'PRJ-02', name: 'SaaS Dashboard v2', code: 'SAAS-02', budget: 350000, spent: 312000, color: 'var(--accent-purple)', category: 'Web App', startDate: '2026-07-15', endDate: '2026-10-15' },
    { id: 'PRJ-03', name: 'Brand Identity 2026', code: 'BRAND-03', budget: 220000, spent: 148000, color: 'var(--accent-orange)', category: 'Design', startDate: '2026-08-05', endDate: '2026-09-30' }
  ],

  expenses: [
    { id: 'exp-101', type: 'INCOME', concept: 'Anticipo 50% Proyecto Rediseño iOS', amount: 225000, category: 'Facturación / Cobro', projectId: 'PRJ-01', date: '2026-08-01', status: 'PAID' },
    { id: 'exp-102', type: 'INCOME', concept: 'Cobro Hito 1 SaaS Dashboard', amount: 175000, category: 'Facturación / Cobro', projectId: 'PRJ-02', date: '2026-08-05', status: 'PAID' },
    { id: 'exp-103', type: 'INCOME', concept: 'Pago Total Brand Identity 2026', amount: 220000, category: 'Facturación / Cobro', projectId: 'PRJ-03', date: '2026-08-08', status: 'PAID' },
    { id: 'exp-1', type: 'EXPENSE', concept: 'Suscripción Figma Enterprise', amount: 28400, category: 'Software & Cloud', projectId: 'PRJ-01', date: '2026-08-15', status: 'PAID' },
    { id: 'exp-2', type: 'EXPENSE', concept: 'Servidores AWS & Cloudflare CDN', amount: 64000, category: 'Infraestructura & Server', projectId: 'PRJ-02', date: '2026-08-14', status: 'PAID' },
    { id: 'exp-3', type: 'EXPENSE', concept: 'Tipografía Personalizada Font Lab', amount: 16450, category: 'Diseño UI/UX', projectId: 'PRJ-03', date: '2026-08-10', status: 'PAID' }
  ],

  projectDocs: [
    {
      id: 'pdoc-1',
      title: 'Contrato Marco de Desarrollo & NDA v1.2',
      format: 'pdf',
      typeLabel: 'Contrato PDF',
      projectId: 'PRJ-01',
      date: '2026-08-01',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      description: 'Documento legal en formato PDF firmado con acuerdo de confidencialidad.'
    },
    {
      id: 'pdoc-2',
      title: 'Foto / Captura de Maqueta UI Aprobada',
      format: 'image',
      typeLabel: 'Foto / Imagen',
      projectId: 'PRJ-01',
      date: '2026-08-12',
      previewUrl: 'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=800&auto=format&fit=crop&q=80',
      fileUrl: 'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=1600&auto=format&fit=crop&q=80',
      description: 'Fotografía / Render en alta resolución del diseño UI/UX validado por el cliente.'
    }
  ],

  tasks: [
    { id: 'tsk-1', title: 'Diseñar componentes esmerilados (Glassmorphism)', status: 'IN_PROGRESS', priority: 'HIGH', projectId: 'PRJ-01', assignee: 'Edmundo A.', dueDate: '2026-08-25', tags: ['UI/UX', 'Apple'] },
    { id: 'tsk-2', title: 'Implementar atajos de teclado Cmd+K para Spotlight', status: 'COMPLETED', priority: 'MEDIUM', projectId: 'PRJ-02', assignee: 'Sofia R.', dueDate: '2026-08-18', tags: ['Frontend'] }
  ],

  wikiDocs: [
    {
      id: 'doc-1',
      title: 'Guía de Estilo UI/UX - Apple Human Interface Guidelines',
      projectId: 'PRJ-01',
      updatedAt: '2026-08-19',
      content: `### Principios de Diseño\n1. Translucidez y Vidrio Esmerilado\n2. Jerarquía Tipográfica`
    }
  ]
};

let uploadedFileDataUrl = null;
let realtimeBroadcastChannel = null;

const getFirebaseUrl = (wsId) => `https://proyectos-rc-default-rtdb.firebaseio.com/workspaces/${encodeURIComponent(wsId)}.json`;
const getJsonbinUrl = () => 'https://api.jsonbin.io/v3/b/66c421e3acd3cb34a8764021';

// Currency Formatter Helper Function
function formatCurrencyAmount(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0';
  const num = Number(amount);
  if (num % 1 === 0) {
    return '$' + Math.round(num).toLocaleString('es-MX');
  } else {
    return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

// URL-SAFE ENCODER & DECODER
function urlSafeEncodeObj(obj) {
  const jsonStr = JSON.stringify(obj);
  const base64 = btoa(encodeURIComponent(jsonStr));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function urlSafeDecodeStr(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const jsonStr = decodeURIComponent(atob(base64));
  return JSON.parse(jsonStr);
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initRealtimeChannel();
  loadSharedStateFromUrl();
  setupEventListeners();
  setupMobileDrawer();
  setupProjectDropdownMenu();
  setupClipboardPasteAndDrop();
  setupLightboxEvents();
  setupCategorySelectListeners();
  populateFormProjectsDropdown();
  updateProjectCategoriesOptions();
  renderApp();
});

function getTodayIsoDate() {
  return new Date().toISOString().split('T')[0];
}

// Real-time BroadcastChannel & Active Cloud Polling (1.5-second interval)
function initRealtimeChannel() {
  if ('BroadcastChannel' in window) {
    realtimeBroadcastChannel = new BroadcastChannel('rc_proyectos_realtime_channel');
    realtimeBroadcastChannel.onmessage = (event) => {
      if (event.data && !state.isSyncing) {
        if (event.data.updatedAt > state.lastLocalTimestamp) {
          state.lastLocalTimestamp = event.data.updatedAt;
          applyIncomingData(event.data);
        }
      }
    };
  }

  // Active Cloud polling every 1.5 seconds for instant room sync
  setInterval(() => {
    if (!state.isSyncing) {
      fetchCloudState();
    }
  }, 1500);
}

async function fetchCloudState() {
  try {
    const firebaseUrl = getFirebaseUrl(state.workspaceId);
    let res = await fetch(firebaseUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.projects) && data.updatedAt > state.lastLocalTimestamp) {
        state.lastLocalTimestamp = data.updatedAt;
        applyIncomingData(data);
        return;
      }
    }

    res = await fetch(getJsonbinUrl(), {
      method: 'GET',
      headers: {
        'X-Bin-Meta': 'false',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      cache: 'no-store'
    });

    if (res.ok) {
      const payload = await res.json();
      const data = payload ? (payload.record || payload.data || payload) : null;
      if (data && Array.isArray(data.projects) && data.updatedAt > state.lastLocalTimestamp) {
        state.lastLocalTimestamp = data.updatedAt;
        applyIncomingData(data);
      }
    }
  } catch (err) {
    // Silent catch
  }
}

function applyIncomingData(data) {
  try {
    state.isSyncing = true;
    state.isCustomized = true;

    if (data.workspaceId) state.workspaceId = data.workspaceId;
    if (Array.isArray(data.projects)) state.projects = data.projects;
    if (Array.isArray(data.expenses)) state.expenses = data.expenses;
    if (Array.isArray(data.tasks)) state.tasks = data.tasks;
    if (Array.isArray(data.projectDocs)) state.projectDocs = data.projectDocs;
    if (Array.isArray(data.wikiDocs)) state.wikiDocs = data.wikiDocs;
    if (Array.isArray(data.categories)) state.categories = data.categories;
    if (Array.isArray(data.projectCategories)) state.projectCategories = data.projectCategories;

    populateFormProjectsDropdown();
    updateProjectCategoriesOptions();
    renderApp();

    showToast('⚡ ¡Cambios sincronizados en vivo en tu pantalla!');
  } finally {
    setTimeout(() => { state.isSyncing = false; }, 300);
  }
}

// Real-time Sync Publisher: Hash + BroadcastChannel + Cloud Push
function syncStateToUrlHash() {
  if (state.hydrated !== true) return;
  if (state.skipNextCloudSave) {
    state.skipNextCloudSave = false;
    return;
  }

  try {
    state.isCustomized = true;
    const now = Date.now();
    state.lastLocalTimestamp = now;

    const dataObj = {
      workspaceId: state.workspaceId,
      isCustomized: true,
      projects: state.projects,
      expenses: state.expenses,
      tasks: state.tasks,
      projectDocs: state.projectDocs,
      wikiDocs: state.wikiDocs,
      categories: state.categories,
      projectCategories: state.projectCategories,
      updatedAt: now
    };

    // Clean Room URL hash in address bar
    const newHash = `#w=${state.workspaceId}`;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', `${window.location.pathname}${newHash}`);
    }
    
    localStorage.setItem('rc_is_customized', 'true');
    localStorage.setItem('rc_projects', JSON.stringify(state.projects));
    localStorage.setItem('rc_expenses', JSON.stringify(state.expenses));
    localStorage.setItem('rc_tasks', JSON.stringify(state.tasks));
    localStorage.setItem('rc_docs', JSON.stringify(state.projectDocs));
    localStorage.setItem('rc_wiki', JSON.stringify(state.wikiDocs));
    localStorage.setItem('rc_categories', JSON.stringify(state.categories));
    localStorage.setItem('rc_prj_categories', JSON.stringify(state.projectCategories));

    // Multi-tab Local Broadcast
    if (realtimeBroadcastChannel && !state.isSyncing) {
      realtimeBroadcastChannel.postMessage(dataObj);
    }

    // Direct Cloud Write to Firebase RTDB Workspace URL (PUT)
    if (!state.isSyncing) {
      const firebaseUrl = getFirebaseUrl(state.workspaceId);
      fetch(firebaseUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataObj)
      }).catch(() => {
        fetch(getJsonbinUrl(), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataObj)
        }).catch(() => {});
      });
    }
  } catch (err) {
    console.warn('Error sincronizando estado:', err);
  }
}

function shareLinkWithData() {
  try {
    const dataObj = {
      workspaceId: state.workspaceId,
      isCustomized: true,
      projects: state.projects,
      expenses: state.expenses,
      tasks: state.tasks,
      projectDocs: state.projectDocs,
      wikiDocs: state.wikiDocs,
      categories: state.categories,
      projectCategories: state.projectCategories,
      updatedAt: Date.now()
    };

    const encodedState = urlSafeEncodeObj(dataObj);
    const currentUrl = `${window.location.origin}${window.location.pathname}#state=${encodedState}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentUrl).then(() => {
        showToast('📋 ¡Enlace copiado! Quien lo abra verá el 100% de tus datos al instante.');
      }).catch(() => {
        prompt('Copia este enlace compartible para enviar tus datos:', currentUrl);
      });
    } else {
      prompt('Copia este enlace compartible para enviar tus datos:', currentUrl);
    }

    syncStateToUrlHash();
  } catch (err) {
    console.error('Error al compartir link:', err);
  }
}

async function loadSharedStateFromUrl() {
  try {
    state.skipNextCloudSave = true;
    const hash = window.location.hash;
    const search = window.location.search;

    if (hash.includes('w=')) {
      state.workspaceId = hash.split('w=')[1].split('&')[0];
      await fetchCloudState();
    } else if (search.includes('w=')) {
      const params = new URLSearchParams(search);
      state.workspaceId = params.get('w') || 'rc_ws_main';
      await fetchCloudState();
    } else if (hash.includes('state=')) {
      const encoded = hash.split('state=')[1];
      const data = urlSafeDecodeStr(encoded);
      applyIncomingData(data);
      showToast('🔗 ¡Se cargaron y sincronizaron tus datos desde el enlace compartido!');
    } else {
      const isCustomized = localStorage.getItem('rc_is_customized');
      if (isCustomized === 'true') {
        state.isCustomized = true;
        const savedProjects = localStorage.getItem('rc_projects');
        if (savedProjects) state.projects = JSON.parse(savedProjects);

        const savedExpenses = localStorage.getItem('rc_expenses');
        if (savedExpenses) state.expenses = JSON.parse(savedExpenses);

        const savedTasks = localStorage.getItem('rc_tasks');
        if (savedTasks) state.tasks = JSON.parse(savedTasks);

        const savedDocs = localStorage.getItem('rc_docs');
        if (savedDocs) state.projectDocs = JSON.parse(savedDocs);

        const savedWiki = localStorage.getItem('rc_wiki');
        if (savedWiki) state.wikiDocs = JSON.parse(savedWiki);

        const savedCategories = localStorage.getItem('rc_categories');
        if (savedCategories) state.categories = JSON.parse(savedCategories);

        const savedPrjCat = localStorage.getItem('rc_prj_categories');
        if (savedPrjCat) state.projectCategories = JSON.parse(savedPrjCat);
      }
    }
  } catch (err) {
    console.warn('Error al cargar datos desde la URL:', err);
  } finally {
    state.hydrated = true;
  }
}

function showToast(message) {
  const toast = document.getElementById('toast-notification');
  const msgSpan = document.getElementById('toast-message');
  if (toast && msgSpan) {
    msgSpan.innerText = message;
    toast.style.display = 'flex';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 5000);
  }
}

// CATEGORY LISTENERS
function setupCategorySelectListeners() {
  const catSelect = document.getElementById('form-category');
  const customWrapper = document.getElementById('custom-category-wrapper');

  if (catSelect && customWrapper) {
    catSelect.addEventListener('change', (e) => {
      if (e.target.value === 'CUSTOM') {
        customWrapper.style.display = 'block';
        document.getElementById('form-custom-category-input').focus();
      } else {
        customWrapper.style.display = 'none';
      }
    });
  }

  const prjCatSelect = document.getElementById('form-prj-category');
  const customPrjWrapper = document.getElementById('custom-prj-category-wrapper');

  if (prjCatSelect && customPrjWrapper) {
    prjCatSelect.addEventListener('change', (e) => {
      if (e.target.value === 'CUSTOM') {
        customPrjWrapper.style.display = 'block';
        document.getElementById('form-custom-prj-category-input').focus();
      } else {
        customPrjWrapper.style.display = 'none';
      }
    });
  }
}

function updateProjectCategoriesOptions() {
  const select = document.getElementById('form-prj-category');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '';

  state.projectCategories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.innerText = cat;
    select.appendChild(opt);
  });

  const customOpt = document.createElement('option');
  customOpt.value = 'CUSTOM';
  customOpt.innerText = '➕ Agregar Nueva Categoría de Proyecto...';
  select.appendChild(customOpt);

  if (state.projectCategories.includes(currentVal)) {
    select.value = currentVal;
  }
}

function updateCategoryOptionsInForm() {
  const select = document.getElementById('form-category');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '';

  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.innerText = cat;
    select.appendChild(opt);
  });

  const customOpt = document.createElement('option');
  customOpt.value = 'CUSTOM';
  customOpt.innerText = '➕ Agregar Nueva Categoría...';
  select.appendChild(customOpt);

  if (state.categories.includes(currentVal)) {
    select.value = currentVal;
  }
}

// LIGHTBOX MODAL FOR HIGH-RES PHOTO PREVIEWING
function setupLightboxEvents() {
  const modal = document.getElementById('image-lightbox-modal');
  const closeBtn = document.getElementById('close-lightbox-btn');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeImageLightbox);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'image-lightbox-modal') {
        closeImageLightbox();
      }
    });
  }
}

function openImageLightbox(docId) {
  const doc = state.projectDocs.find(d => d.id === docId);
  if (!doc) return;

  const modal = document.getElementById('image-lightbox-modal');
  const img = document.getElementById('lightbox-img');
  const title = document.getElementById('lightbox-title');
  const subtitle = document.getElementById('lightbox-subtitle');
  const downloadBtn = document.getElementById('lightbox-download-btn');

  const prj = state.projects.find(p => p.id === doc.projectId);
  const imageUrl = doc.previewUrl || doc.fileUrl;

  if (img) img.src = imageUrl;
  if (title) title.innerText = doc.title;
  if (subtitle) subtitle.innerText = `${prj ? prj.name : 'Proyecto'} • 📅 ${doc.date}`;
  if (downloadBtn) {
    downloadBtn.href = imageUrl;
    downloadBtn.download = `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
  }

  modal.classList.add('active');
}

function closeImageLightbox() {
  const modal = document.getElementById('image-lightbox-modal');
  if (modal) modal.classList.remove('active');
}

// CLIPBOARD PASTE & DRAG-AND-DROP HANDLERS
function setupClipboardPasteAndDrop() {
  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    let imageItem = null;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        imageItem = items[i];
        break;
      }
    }

    if (imageItem) {
      const blob = imageItem.getAsFile();
      processImageBlob(blob, 'Captura Pegada');
    }
  });

  const dropzone = document.getElementById('doc-paste-dropzone');
  const fileInput = document.getElementById('form-doc-file');

  if (dropzone) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-active');
    });

    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-active'));

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-active');
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          processImageBlob(file, file.name);
        } else {
          fileInput.files = files;
          fileInput.dispatchEvent(new Event('change'));
        }
      }
    });
  }
}

function processImageBlob(blob, nameHint = 'Captura de Pantalla') {
  const reader = new FileReader();
  reader.onload = (event) => {
    uploadedFileDataUrl = event.target.result;
    openActionModal('doc');

    document.getElementById('form-doc-format').value = 'image';
    document.getElementById('form-doc-format').dispatchEvent(new Event('change'));

    const titleInput = document.getElementById('form-title');
    if (!titleInput.value) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      titleInput.value = `${nameHint} (${timeStr})`;
    }

    showPastedImagePreview(uploadedFileDataUrl);
  };
  reader.readAsDataURL(blob);
}

function showPastedImagePreview(dataUrl) {
  const container = document.getElementById('pasted-preview-container');
  const img = document.getElementById('pasted-preview-img');
  const label = document.getElementById('paste-dropzone-title');

  if (container && img) {
    img.src = dataUrl;
    container.style.display = 'flex';
    if (label) label.innerText = '✅ Foto / Screenshot Pegado Correctamente!';
  }
}

function hidePastedImagePreview() {
  const container = document.getElementById('pasted-preview-container');
  const label = document.getElementById('paste-dropzone-title');
  if (container) container.style.display = 'none';
  if (label) label.innerText = '📋 Presiona Ctrl+V para pegar una foto o screenshot';
}

// Mobile Drawer Setup
function setupMobileDrawer() {
  const toggleBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (!toggleBtn || !sidebar || !overlay) return;

  const toggleMobileSidebar = () => {
    state.isMobileSidebarOpen = !state.isMobileSidebarOpen;
    if (state.isMobileSidebarOpen) {
      sidebar.classList.add('mobile-open');
      overlay.classList.add('active');
    } else {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    }
  };

  toggleBtn.addEventListener('click', toggleMobileSidebar);
  overlay.addEventListener('click', () => {
    state.isMobileSidebarOpen = false;
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
  });
}

function closeMobileDrawerIfOpen() {
  if (state.isMobileSidebarOpen) {
    state.isMobileSidebarOpen = false;
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
  }
}

// Theme Management
function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('aura-theme', state.theme);
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.setAttribute('data-lucide', state.theme === 'light' ? 'moon' : 'sun');
    lucide.createIcons();
  }
}

// Project Switcher Dropdown Menu Setup
function setupProjectDropdownMenu() {
  const switcherBtn = document.getElementById('workspace-switcher');
  const dropdownMenu = document.getElementById('project-dropdown-menu');

  if (!switcherBtn || !dropdownMenu) return;

  switcherBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    state.isProjectDropdownOpen = !state.isProjectDropdownOpen;
    if (state.isProjectDropdownOpen) {
      renderProjectDropdownItems();
      dropdownMenu.classList.add('active');
    } else {
      dropdownMenu.classList.remove('active');
    }
  });

  window.addEventListener('click', (e) => {
    if (!switcherBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
      state.isProjectDropdownOpen = false;
      dropdownMenu.classList.remove('active');
    }
  });
}

function renderProjectDropdownItems() {
  const container = document.getElementById('dropdown-project-items');
  if (!container) return;

  container.innerHTML = '';

  const allItem = document.createElement('div');
  allItem.className = `dropdown-item ${state.activeProjectFilter === 'all' ? 'active' : ''}`;
  allItem.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <i data-lucide="layers" style="width: 15px; height: 15px; color: var(--accent-blue);"></i>
      <span>Todos los Proyectos</span>
    </div>
    <span class="item-badge" style="font-size: 11px; padding: 2px 6px; border-radius: 6px; background: var(--bg-input);">${state.projects.length}</span>
  `;
  allItem.addEventListener('click', () => selectProjectFromDropdown('all'));
  container.appendChild(allItem);

  state.projects.forEach(prj => {
    const item = document.createElement('div');
    item.className = `dropdown-item ${state.activeProjectFilter === prj.id ? 'active' : ''}`;
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; flex: 1;" onclick="selectProjectFromDropdown('${prj.id}')">
        <i data-lucide="folder" style="width: 15px; height: 15px; color: ${prj.color};"></i>
        <span style="font-weight: 600;">${prj.name}</span>
      </div>
      <div style="display: flex; items-center; gap: 4px;">
        <button class="action-btn-sm" title="Editar Proyecto" onclick="event.stopPropagation(); openProjectModal('${prj.id}')">
          <i data-lucide="edit-2" style="width: 11px; height: 11px;"></i>
        </button>
        <button class="action-btn-sm action-btn-danger" title="Eliminar Proyecto" onclick="event.stopPropagation(); deleteProject('${prj.id}')">
          <i data-lucide="trash-2" style="width: 11px; height: 11px;"></i>
        </button>
      </div>
    `;
    container.appendChild(item);
  });

  lucide.createIcons();
}

function selectProjectFromDropdown(projectId) {
  state.activeProjectFilter = projectId;
  state.isProjectDropdownOpen = false;
  
  const dropdownMenu = document.getElementById('project-dropdown-menu');
  if (dropdownMenu) dropdownMenu.classList.remove('active');

  closeMobileDrawerIfOpen();
  updateProjectSwitcherLabel();
  renderApp();
}

// PROJECT MANAGEMENT
function openProjectModal(projectId = null) {
  const modal = document.getElementById('project-modal');
  const title = document.getElementById('project-modal-title');
  const editingIdInput = document.getElementById('form-prj-editing-id');
  const nameInput = document.getElementById('form-prj-name');
  const codeInput = document.getElementById('form-prj-code');
  const budgetInput = document.getElementById('form-prj-budget');
  const categoryInput = document.getElementById('form-prj-category');
  const startDateInput = document.getElementById('form-prj-startdate');
  const endDateInput = document.getElementById('form-prj-enddate');

  updateProjectCategoriesOptions();
  document.getElementById('custom-prj-category-wrapper').style.display = 'none';

  if (projectId) {
    const prj = state.projects.find(p => p.id === projectId);
    if (prj) {
      title.innerText = 'Editar Proyecto & Categoría';
      editingIdInput.value = prj.id;
      nameInput.value = prj.name;
      codeInput.value = prj.code;
      budgetInput.value = prj.budget;
      categoryInput.value = prj.category || 'Mobile App';
      startDateInput.value = prj.startDate || getTodayIsoDate();
      endDateInput.value = prj.endDate || getTodayIsoDate();
    }
  } else {
    title.innerText = 'Nuevo Proyecto';
    editingIdInput.value = '';
    nameInput.value = '';
    codeInput.value = 'PRJ-0' + (state.projects.length + 1);
    budgetInput.value = '16450';
    categoryInput.value = 'Mobile App';
    startDateInput.value = getTodayIsoDate();
    endDateInput.value = getTodayIsoDate();
  }

  modal.classList.add('active');
}

function closeProjectModal() {
  document.getElementById('project-modal').classList.remove('active');
}

function deleteProject(projectId) {
  const prj = state.projects.find(p => p.id === projectId);
  if (!prj) return;

  if (confirm(`¿Estás seguro de que deseas eliminar el proyecto "${prj.name}"? Se borrarán sus transacciones, tareas y documentos asociados.`)) {
    state.projects = state.projects.filter(p => p.id !== projectId);
    state.expenses = state.expenses.filter(e => e.projectId !== projectId);
    state.tasks = state.tasks.filter(t => t.projectId !== projectId);
    state.projectDocs = state.projectDocs.filter(d => d.projectId !== projectId);

    if (state.activeProjectFilter === projectId) {
      state.activeProjectFilter = 'all';
    }

    populateFormProjectsDropdown();
    updateProjectSwitcherLabel();
    renderApp();
  }
}

function handleProjectFormSubmit(e) {
  e.preventDefault();
  const editingId = document.getElementById('form-prj-editing-id').value;
  const name = document.getElementById('form-prj-name').value;
  const code = document.getElementById('form-prj-code').value;
  const budget = parseFloat(document.getElementById('form-prj-budget').value) || 0;
  let category = document.getElementById('form-prj-category').value;
  const startDate = document.getElementById('form-prj-startdate').value || getTodayIsoDate();
  const endDate = document.getElementById('form-prj-enddate').value || getTodayIsoDate();

  if (category === 'CUSTOM') {
    const customPrjCat = document.getElementById('form-custom-prj-category-input').value.trim();
    if (customPrjCat) {
      category = customPrjCat;
      if (!state.projectCategories.includes(customPrjCat)) {
        state.projectCategories.push(customPrjCat);
      }
    } else {
      category = 'General';
    }
  }

  if (editingId) {
    const prj = state.projects.find(p => p.id === editingId);
    if (prj) {
      prj.name = name;
      prj.code = code;
      prj.budget = budget;
      prj.category = category;
      prj.startDate = startDate;
      prj.endDate = endDate;
    }
  } else {
    const newPrj = {
      id: 'PRJ-' + Date.now(),
      name: name,
      code: code,
      budget: budget,
      spent: 0,
      color: 'var(--accent-blue)',
      category: category,
      startDate: startDate,
      endDate: endDate
    };
    state.projects.push(newPrj);
    state.activeProjectFilter = newPrj.id;
  }

  closeProjectModal();
  populateFormProjectsDropdown();
  updateProjectSwitcherLabel();
  renderApp();
}

function populateFormProjectsDropdown() {
  const select = document.getElementById('form-project');
  if (!select) return;

  select.innerHTML = '';
  state.projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.innerText = `${p.name} (${p.code})`;
    select.appendChild(opt);
  });

  renderSidebarProjectsList();
}

function renderSidebarProjectsList() {
  const container = document.getElementById('sidebar-projects-list');
  if (!container) return;

  container.innerHTML = `
    <li>
      <a class="nav-item ${state.activeProjectFilter === 'all' ? 'active' : ''}" data-project-filter="all" onclick="selectProjectFromDropdown('all')">
        <i data-lucide="layers" style="color: var(--accent-blue);"></i>
        <span>Todos los Proyectos</span>
      </a>
    </li>
    ${state.projects.map(p => `
      <li>
        <a class="nav-item ${state.activeProjectFilter === p.id ? 'active' : ''}" data-project-filter="${p.id}" onclick="selectProjectFromDropdown('${p.id}')">
          <i data-lucide="folder" style="color: ${p.color};"></i>
          <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.name}</span>
          <button class="action-btn-sm" style="width: 20px; height: 20px; border: none;" title="Editar Categoría & Datos" onclick="event.stopPropagation(); openProjectModal('${p.id}')">
            <i data-lucide="edit-2" style="width: 10px; height: 10px;"></i>
          </button>
        </a>
      </li>
    `).join('')}
  `;

  lucide.createIcons();
}

// Event Listeners Setup
function setupEventListeners() {
  document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
  document.getElementById('share-link-btn').addEventListener('click', shareLinkWithData);

  document.getElementById('sidebar-add-project-btn').addEventListener('click', () => openProjectModal());
  document.getElementById('dropdown-add-project-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openProjectModal();
  });
  document.getElementById('close-project-modal').addEventListener('click', closeProjectModal);
  document.getElementById('project-form').addEventListener('submit', handleProjectFormSubmit);

  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item[data-view]').forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      state.currentView = item.getAttribute('data-view');
      closeMobileDrawerIfOpen();
      renderApp();
    });
  });

  document.getElementById('spotlight-btn').addEventListener('click', openSpotlight);
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSpotlight();
    }
    if (e.key === 'Escape') {
      closeSpotlight();
      closeActionModal();
      closeProjectModal();
      closeImageLightbox();
      closeMobileDrawerIfOpen();
    }
  });

  document.getElementById('spotlight-modal').addEventListener('click', (e) => {
    if (e.target.id === 'spotlight-modal') closeSpotlight();
  });

  document.getElementById('spotlight-search-input').addEventListener('input', handleSpotlightSearch);

  document.getElementById('quick-add-btn').addEventListener('click', () => openActionModal());
  document.getElementById('close-action-modal').addEventListener('click', closeActionModal);
  document.getElementById('action-modal').addEventListener('click', (e) => {
    if (e.target.id === 'action-modal') closeActionModal();
  });

  document.getElementById('form-type').addEventListener('change', (e) => {
    const val = e.target.value;
    const financeFields = document.getElementById('form-finance-fields');
    const docFields = document.getElementById('form-doc-fields');
    const taskFields = document.getElementById('form-task-fields');
    
    financeFields.style.display = (val === 'income' || val === 'expense') ? 'block' : 'none';
    docFields.style.display = (val === 'doc') ? 'block' : 'none';
    taskFields.style.display = (val === 'task') ? 'block' : 'none';
  });

  document.getElementById('form-doc-format').addEventListener('change', (e) => {
    const fmt = e.target.value;
    const dropzone = document.getElementById('doc-paste-dropzone');
    const urlWrapper = document.getElementById('doc-url-wrapper');

    if (fmt === 'sheets' || fmt === 'link') {
      dropzone.style.display = 'none';
      urlWrapper.style.display = 'block';
    } else {
      dropzone.style.display = 'flex';
      urlWrapper.style.display = 'none';
    }
  });

  document.getElementById('form-doc-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        uploadedFileDataUrl = event.target.result;
        if (file.type.startsWith('image/')) {
          showPastedImagePreview(uploadedFileDataUrl);
        } else {
          document.getElementById('paste-dropzone-title').innerText = `📄 PDF seleccionado: ${file.name}`;
        }
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('action-form').addEventListener('submit', handleFormSubmit);
}

// Spotlight Functions
function openSpotlight() {
  const modal = document.getElementById('spotlight-modal');
  modal.classList.add('active');
  const input = document.getElementById('spotlight-search-input');
  input.value = '';
  input.focus();
  renderSpotlightResults('');
}

function closeSpotlight() {
  document.getElementById('spotlight-modal').classList.remove('active');
}

function handleSpotlightSearch(e) {
  renderSpotlightResults(e.target.value.toLowerCase().trim());
}

function renderSpotlightResults(query) {
  const container = document.getElementById('spotlight-results-container');
  container.innerHTML = '';

  const results = [];

  state.tasks.forEach(t => {
    if (!query || t.title.toLowerCase().includes(query)) {
      results.push({ type: `Tarea (${t.assignee})`, title: t.title, desc: `${t.priority} • 📅 ${t.dueDate}`, icon: 'check-square', action: () => { state.currentView = 'tasks'; renderApp(); closeSpotlight(); } });
    }
  });

  state.expenses.forEach(e => {
    if (!query || e.concept.toLowerCase().includes(query)) {
      results.push({ type: e.type === 'INCOME' ? 'Entrada (Ingreso)' : 'Salida (Gasto)', title: e.concept, desc: `${formatCurrencyAmount(e.amount)} • 📅 ${e.date}`, icon: 'dollar-sign', action: () => { state.currentView = 'expenses'; renderApp(); closeSpotlight(); } });
    }
  });

  state.projectDocs.forEach(d => {
    if (!query || d.title.toLowerCase().includes(query)) {
      results.push({ type: 'Documento / Foto / Sheets', title: d.title, desc: `${d.typeLabel} • 📅 ${d.date}`, icon: 'file-text', action: () => { state.currentView = 'docs'; renderApp(); closeSpotlight(); } });
    }
  });

  if (results.length === 0) {
    container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13.5px;">No se encontraron resultados para "${query}"</div>`;
    return;
  }

  results.slice(0, 8).forEach(res => {
    const div = document.createElement('div');
    div.className = 'spotlight-item';
    div.innerHTML = `
      <i data-lucide="${res.icon}" style="width: 18px; height: 18px; color: var(--accent-blue);"></i>
      <div>
        <div style="font-weight: 500;">${res.title}</div>
        <div style="font-size: 11.5px; color: var(--text-muted);">${res.type}</div>
      </div>
      <span class="item-desc">${res.desc}</span>
    `;
    div.addEventListener('click', res.action);
    container.appendChild(div);
  });

  lucide.createIcons();
}

// GENERIC ACTION MODAL: EDIT / CREATE WITH CLIPBOARD PASTE
function openActionModal(editType = null, editId = null) {
  const modal = document.getElementById('action-modal');
  const title = document.getElementById('modal-form-title');
  const editingIdInput = document.getElementById('form-editing-id');
  const typeSelect = document.getElementById('form-type');
  const titleInput = document.getElementById('form-title');
  const amountInput = document.getElementById('form-amount');
  const prjSelect = document.getElementById('form-project');
  
  const financeDateInput = document.getElementById('form-finance-date');
  const taskDueDateInput = document.getElementById('form-task-duedate');
  const docDateInput = document.getElementById('form-doc-date');

  editingIdInput.value = editId || '';
  hidePastedImagePreview();
  updateCategoryOptionsInForm();
  document.getElementById('custom-category-wrapper').style.display = 'none';

  if (editType === 'expense' && editId) {
    const item = state.expenses.find(e => e.id === editId);
    if (item) {
      title.innerText = 'Editar Transacción Financiera';
      typeSelect.value = item.type === 'INCOME' ? 'income' : 'expense';
      titleInput.value = item.concept;
      amountInput.value = item.amount;
      prjSelect.value = item.projectId;
      document.getElementById('form-category').value = item.category;
      financeDateInput.value = item.date || getTodayIsoDate();
    }
  } else if (editType === 'task' && editId) {
    const task = state.tasks.find(t => t.id === editId);
    if (task) {
      title.innerText = 'Editar Tarea & Fecha Límite';
      typeSelect.value = 'task';
      titleInput.value = task.title;
      prjSelect.value = task.projectId;
      document.getElementById('form-task-assignee').value = task.assignee;
      document.getElementById('form-task-priority').value = task.priority;
      taskDueDateInput.value = task.dueDate || getTodayIsoDate();
    }
  } else if (editType === 'doc' && editId) {
    const doc = state.projectDocs.find(d => d.id === editId);
    if (doc) {
      title.innerText = 'Editar Documento & Fecha';
      typeSelect.value = 'doc';
      titleInput.value = doc.title;
      prjSelect.value = doc.projectId;
      document.getElementById('form-doc-format').value = doc.format;
      docDateInput.value = doc.date || getTodayIsoDate();
      if (doc.format === 'image' && (doc.previewUrl || doc.fileUrl)) {
        uploadedFileDataUrl = doc.previewUrl || doc.fileUrl;
        showPastedImagePreview(uploadedFileDataUrl);
      }
    }
  } else {
    title.innerText = 'Nuevo Registro';
    typeSelect.value = 'doc';
    titleInput.value = '';
    amountInput.value = '';
    financeDateInput.value = getTodayIsoDate();
    taskDueDateInput.value = getTodayIsoDate();
    docDateInput.value = getTodayIsoDate();
  }

  typeSelect.dispatchEvent(new Event('change'));
  modal.classList.add('active');
}

function closeActionModal() {
  document.getElementById('action-modal').classList.remove('active');
  hidePastedImagePreview();
}

function handleFormSubmit(e) {
  e.preventDefault();
  const editingId = document.getElementById('form-editing-id').value;
  const type = document.getElementById('form-type').value;
  const title = document.getElementById('form-title').value;
  const prjId = document.getElementById('form-project').value;

  if (type === 'income' || type === 'expense') {
    const amount = parseFloat(document.getElementById('form-amount').value) || 0;
    let category = document.getElementById('form-category').value;
    
    if (category === 'CUSTOM') {
      const customCategoryName = document.getElementById('form-custom-category-input').value.trim();
      if (customCategoryName) {
        category = customCategoryName;
        if (!state.categories.includes(customCategoryName)) {
          state.categories.push(customCategoryName);
        }
      } else {
        category = 'General';
      }
    }

    const transactionType = type === 'income' ? 'INCOME' : 'EXPENSE';
    const date = document.getElementById('form-finance-date').value || getTodayIsoDate();

    if (editingId) {
      const exp = state.expenses.find(e => e.id === editingId);
      if (exp) {
        exp.type = transactionType;
        exp.concept = title;
        exp.amount = amount;
        exp.category = category;
        exp.projectId = prjId;
        exp.date = date;
      }
    } else {
      state.expenses.unshift({
        id: 'exp-' + Date.now(),
        type: transactionType,
        concept: title,
        amount: amount,
        category: category,
        projectId: prjId,
        date: date,
        status: 'PAID'
      });
    }

  } else if (type === 'doc') {
    const format = document.getElementById('form-doc-format').value;
    const docDate = document.getElementById('form-doc-date').value || getTodayIsoDate();
    let fileUrl = '#';
    let previewUrl = null;
    let typeLabel = 'Documento';

    if (format === 'pdf') {
      typeLabel = 'Documento PDF';
      fileUrl = uploadedFileDataUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    } else if (format === 'image') {
      typeLabel = 'Foto / Captura Pegada';
      fileUrl = uploadedFileDataUrl || 'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=1600&auto=format&fit=crop&q=80';
      previewUrl = uploadedFileDataUrl || 'https://images.unsplash.com/photo-1616469829941-c7200edec809?w=800&auto=format&fit=crop&q=80';
    } else if (format === 'sheets') {
      typeLabel = 'Google Sheets';
      fileUrl = document.getElementById('form-doc-sheets-url').value || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMd1KtCwb45SZgLUnsM60uuDtf23693/edit';
    } else {
      typeLabel = 'Enlace Cloud';
      fileUrl = document.getElementById('form-doc-sheets-url').value || 'https://drive.google.com';
    }

    if (editingId) {
      const doc = state.projectDocs.find(d => d.id === editingId);
      if (doc) {
        doc.title = title;
        doc.format = format;
        doc.typeLabel = typeLabel;
        doc.projectId = prjId;
        doc.date = docDate;
        if (previewUrl) doc.previewUrl = previewUrl;
      }
    } else {
      state.projectDocs.unshift({
        id: 'pdoc-' + Date.now(),
        title: title,
        format: format,
        typeLabel: typeLabel,
        projectId: prjId,
        date: docDate,
        fileUrl: fileUrl,
        previewUrl: previewUrl,
        description: `Documento o captura pegada (${typeLabel}).`
      });
    }

    state.currentView = 'docs';
    uploadedFileDataUrl = null;

  } else if (type === 'task') {
    const assignee = document.getElementById('form-task-assignee').value;
    const priority = document.getElementById('form-task-priority').value;
    const dueDate = document.getElementById('form-task-duedate').value || getTodayIsoDate();

    if (editingId) {
      const task = state.tasks.find(t => t.id === editingId);
      if (task) {
        task.title = title;
        task.assignee = assignee;
        task.priority = priority;
        task.projectId = prjId;
        task.dueDate = dueDate;
      }
    } else {
      state.tasks.unshift({
        id: 'tsk-' + Date.now(),
        title: title,
        status: 'TODO',
        priority: priority,
        projectId: prjId,
        assignee: assignee,
        dueDate: dueDate,
        tags: ['Asignado']
      });
    }

    state.currentView = 'tasks';
  }

  closeActionModal();
  renderApp();
}

// DELETE HANDLERS
function deleteTransaction(id) {
  if (confirm('¿Eliminar esta transacción financiera?')) {
    state.expenses = state.expenses.filter(e => e.id !== id);
    renderApp();
  }
}

function deleteTask(id) {
  if (confirm('¿Eliminar esta tarea?')) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    renderApp();
  }
}

function deleteProjectDoc(id) {
  if (confirm('¿Eliminar este documento de proyecto?')) {
    state.projectDocs = state.projectDocs.filter(d => d.id !== id);
    renderApp();
  }
}

function updateProjectSwitcherLabel() {
  const label = document.getElementById('current-project-label');
  if (!label) return;

  if (state.activeProjectFilter === 'all') {
    label.innerText = `Todos los Proyectos (${state.projects.length})`;
  } else {
    const prj = state.projects.find(p => p.id === state.activeProjectFilter);
    label.innerText = prj ? prj.name : 'Proyecto';
  }
}

// Master Render Router (Auto-syncs URL hash on every render!)
function renderApp() {
  syncStateToUrlHash();
  const viewport = document.getElementById('app-viewport');
  viewport.innerHTML = '';

  switch (state.currentView) {
    case 'dashboard':
      renderDashboardView(viewport);
      break;
    case 'expenses':
      renderExpensesView(viewport);
      break;
    case 'tasks':
      renderTasksView(viewport);
      break;
    case 'docs':
      renderProjectDocsView(viewport);
      break;
    case 'wiki':
      renderWikiView(viewport);
      break;
  }

  lucide.createIcons();
}

function getFilteredProjects() {
  if (state.activeProjectFilter === 'all') return state.projects;
  return state.projects.filter(p => p.id === state.activeProjectFilter);
}

// 1. DASHBOARD VIEW RENDERER
function renderDashboardView(container) {
  const filteredPrjs = getFilteredProjects();

  const filteredTransactions = state.expenses.filter(e =>
    state.activeProjectFilter === 'all' || e.projectId === state.activeProjectFilter
  );

  const totalIncome = filteredTransactions
    .filter(e => e.type === 'INCOME')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(e => e.type === 'EXPENSE')
    .reduce((acc, e) => acc + e.amount, 0);

  const netBalance = totalIncome - totalExpenses;

  const filteredTasks = state.tasks.filter(t =>
    state.activeProjectFilter === 'all' || t.projectId === state.activeProjectFilter
  );
  const pendingTasks = filteredTasks.filter(t => t.status !== 'COMPLETED').length;

  const isNetPositive = netBalance >= 0;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard General</h1>
        <p class="page-subtitle">Resumen ejecutivo y Balance Neto (Entradas − Gastos)</p>
      </div>
      <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
        <span class="badge badge-green" style="font-size: 11px;">
          ⚡ Sincronizado en Vivo (Nube & Multiusuario)
        </span>
        <span class="badge ${isNetPositive ? 'badge-green' : 'badge-red'}">
          ${isNetPositive ? '🟢 Balance Positivo' : '🔴 Déficit Financiero'}
        </span>
      </div>
    </div>

    <!-- Cards Grid -->
    <div class="grid-4">
      <div class="card glass apple-glass-hover">
        <div class="card-title-sm">Total Entradas (Ingresos)</div>
        <div class="card-value" style="color: var(--accent-green);">+${formatCurrencyAmount(totalIncome)}</div>
        <div class="card-subtext">Cobros y facturación acumulada</div>
      </div>

      <div class="card glass apple-glass-hover">
        <div class="card-title-sm">Total Salidas (Gastos)</div>
        <div class="card-value" style="color: var(--accent-red);">-${formatCurrencyAmount(totalExpenses)}</div>
        <div class="card-subtext">Operaciones, licencias y desarrollo</div>
      </div>

      <div class="card glass apple-glass-hover">
        <div class="card-title-sm">Balance Neto (Ingresos − Gastos)</div>
        <div class="card-value" style="color: ${isNetPositive ? 'var(--accent-blue)' : 'var(--accent-red)'};">
          ${isNetPositive ? '+' : '-'}${formatCurrencyAmount(Math.abs(netBalance))}
        </div>
        <div class="card-subtext">${isNetPositive ? 'Utilidad neta disponible' : 'Pérdida temporal'}</div>
      </div>

      <div class="card glass apple-glass-hover">
        <div class="card-title-sm">Tareas Pendientes</div>
        <div class="card-value">${pendingTasks}</div>
        <div class="card-subtext">de ${filteredTasks.length} tareas totales</div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="grid-2">
      <div class="card glass">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">Salud Financiera por Proyecto</h3>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${filteredPrjs.map(p => {
            const prjTransactions = state.expenses.filter(e => e.projectId === p.id);
            const prjIncome = prjTransactions.filter(e => e.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
            const prjSpent = prjTransactions.filter(e => e.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
            const prjNet = prjIncome - prjSpent;
            const pct = p.budget > 0 ? Math.round((prjSpent / p.budget) * 100) : 0;
            
            return `
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 600; margin-bottom: 4px; flex-wrap: wrap; gap: 6px;">
                  <span style="display: flex; align-items: center; gap: 6px;">
                    ${p.name} <span class="badge badge-purple" style="font-size: 10px; padding: 2px 6px;">${p.category || 'Proyecto'}</span>
                    <button class="action-btn-sm" title="Editar Categoría & Datos" onclick="openProjectModal('${p.id}')"><i data-lucide="edit-2" style="width: 10px; height: 10px;"></i></button>
                  </span>
                  <span>Balance: <strong style="color: ${prjNet >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">${prjNet >= 0 ? '+' : '-'}${formatCurrencyAmount(Math.abs(prjNet))}</strong></span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px; display: flex; gap: 10px;">
                  <span>📅 ${p.startDate || 'Inicio'} → ${p.endDate || 'Fin'}</span>
                </div>
                <div style="font-size: 11.5px; color: var(--text-muted); display: flex; justify-content: space-between; margin-bottom: 4px; flex-wrap: wrap;">
                  <span>Entradas: +${formatCurrencyAmount(prjIncome)}</span>
                  <span>Gastos: -${formatCurrencyAmount(prjSpent)} (${pct}% presup. de ${formatCurrencyAmount(p.budget)})</span>
                </div>
                <div class="progress-container">
                  <div class="progress-fill ${pct >= 100 ? 'fill-red' : pct >= 80 ? 'fill-orange' : 'fill-blue'}" style="width: ${Math.min(pct, 100)}%;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="card glass">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">Últimas Transacciones</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${state.expenses.slice(0, 4).map(exp => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--border-subtle);">
              <div>
                <div style="font-size: 13.5px; font-weight: 600;">${exp.concept}</div>
                <div style="font-size: 11.5px; color: var(--text-muted);">${exp.category} • 📅 ${exp.date}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 700; font-size: 13.5px; color: ${exp.type === 'INCOME' ? 'var(--accent-green)' : 'var(--accent-red)'};">
                  ${exp.type === 'INCOME' ? '+' : '-'}${formatCurrencyAmount(exp.amount)}
                </span>
                <button class="action-btn-sm" title="Editar Fecha & Transacción" onclick="openActionModal('expense', '${exp.id}')"><i data-lucide="edit-2" style="width: 10px; height: 10px;"></i></button>
                <button class="action-btn-sm action-btn-danger" title="Eliminar" onclick="deleteTransaction('${exp.id}')"><i data-lucide="trash-2" style="width: 10px; height: 10px;"></i></button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// 2. EXPENSES & FINANCE BALANCE VIEW RENDERER
function renderExpensesView(container) {
  const filteredProjects = getFilteredProjects();
  let filteredExp = state.expenses.filter(e => state.activeProjectFilter === 'all' || e.projectId === state.activeProjectFilter);

  if (state.financeFilter !== 'all') {
    filteredExp = filteredExp.filter(e => e.type === state.financeFilter);
  }

  const totalIncome = filteredExp.filter(e => e.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
  const totalExpenses = filteredExp.filter(e => e.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Finanzas y Transacciones</h1>
        <p class="page-subtitle">Registro de Entradas y Salidas</p>
      </div>

      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <div style="display: flex; background: var(--bg-input); padding: 3px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <button class="icon-btn" style="width: auto; padding: 0 12px; height: 32px; border: none; background: ${state.financeFilter === 'all' ? 'var(--bg-card)' : 'transparent'}; border-radius: var(--radius-sm); font-size: 12px; font-weight: 600;" onclick="filterFinanceType('all')">
            Todas
          </button>
          <button class="icon-btn" style="width: auto; padding: 0 12px; height: 32px; border: none; background: ${state.financeFilter === 'INCOME' ? 'var(--bg-card)' : 'transparent'}; border-radius: var(--radius-sm); font-size: 12px; font-weight: 600; color: var(--accent-green);" onclick="filterFinanceType('INCOME')">
            📈 Entradas
          </button>
          <button class="icon-btn" style="width: auto; padding: 0 12px; height: 32px; border: none; background: ${state.financeFilter === 'EXPENSE' ? 'var(--bg-card)' : 'transparent'}; border-radius: var(--radius-sm); font-size: 12px; font-weight: 600; color: var(--accent-red);" onclick="filterFinanceType('EXPENSE')">
            📉 Gastos
          </button>
        </div>

        <button class="btn-primary" onclick="openActionModal()">
          <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
          <span>Nuevo Registro</span>
        </button>
      </div>
    </div>

    <!-- Summary Bar -->
    <div class="card glass" style="margin-bottom: 20px; padding: 16px 24px; flex-direction: row; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
      <div style="font-size: 13.5px; font-weight: 600;">
        Ingresos Totales: <span style="color: var(--accent-green);">+${formatCurrencyAmount(totalIncome)}</span>
      </div>
      <div style="font-size: 13.5px; font-weight: 600;">
        Gastos Totales: <span style="color: var(--accent-red);">-${formatCurrencyAmount(totalExpenses)}</span>
      </div>
      <div style="font-size: 14px; font-weight: 700;">
        Balance Neto: <span style="color: ${netBalance >= 0 ? 'var(--accent-blue)' : 'var(--accent-red)'};">${netBalance >= 0 ? '+' : '-'}${formatCurrencyAmount(Math.abs(netBalance))}</span>
      </div>
    </div>

    <!-- Budget Overview Cards per Project -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 20px;">
      ${filteredProjects.map(p => {
        const prjExpenses = state.expenses.filter(e => e.projectId === p.id && e.type === 'EXPENSE');
        const spentBudget = prjExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const totalBudget = p.totalBudget || p.budget || 16450;
        const pct = totalBudget > 0 ? Math.round((spentBudget / totalBudget) * 100) : 0;
        const isOver = pct >= 100;
        const isWarn = pct >= 80 && pct < 100;

        return `
          <div class="card glass apple-glass-hover" style="padding: 16px 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: 700;">${p.name}</span>
              <span class="badge ${isOver ? 'badge-red' : isWarn ? 'badge-orange' : 'badge-green'}" style="font-size: 10px;">
                ${pct}% Ejecutado
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
              <span style="font-size: 18px; font-weight: 800;">${formatCurrencyAmount(spentBudget)}</span>
              <span style="font-size: 12px; color: var(--text-muted);">de ${formatCurrencyAmount(totalBudget)}</span>
            </div>
            <div class="progress-container">
              <div class="progress-fill ${isOver ? 'fill-red' : isWarn ? 'fill-orange' : 'fill-blue'}" style="width: ${Math.min(pct, 100)}%;"></div>
            </div>
            ${isOver ? `<div style="font-size: 11px; color: var(--accent-red); font-weight: 600; margin-top: 8px;">⚠️ Excedido por ${formatCurrencyAmount(spentBudget - totalBudget)}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>

    <!-- Table Container Apple Glass -->
    <div class="table-container glass">
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Concepto</th>
            <th>Categoría</th>
            <th>Proyecto</th>
            <th>Fecha (Editable)</th>
            <th>Monto</th>
            <th style="text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filteredExp.map(e => {
            const prj = state.projects.find(p => p.id === e.projectId);
            const isIncome = e.type === 'INCOME';
            return `
              <tr>
                <td>
                  <span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">
                    ${isIncome ? '📈 Entrada' : '📉 Gasto'}
                  </span>
                </td>
                <td style="font-weight: 600;">${e.concept}</td>
                <td><span class="badge badge-blue">${e.category}</span></td>
                <td>${prj ? prj.name : e.projectId}</td>
                <td style="color: var(--text-main); font-weight: 500; font-size: 13px;">📅 ${e.date}</td>
                <td style="font-weight: 700; color: ${isIncome ? 'var(--accent-green)' : 'var(--accent-red)'};">
                  ${isIncome ? '+' : '-'}${formatCurrencyAmount(e.amount)}
                </td>
                <td style="text-align: right;">
                  <div style="display: flex; gap: 6px; justify-content: flex-end;">
                    <button class="action-btn-sm" title="Editar Fecha & Datos" onclick="openActionModal('expense', '${e.id}')">
                      <i data-lucide="edit-2" style="width: 12px; height: 12px;"></i>
                    </button>
                    <button class="action-btn-sm action-btn-danger" title="Eliminar Transacción" onclick="deleteTransaction('${e.id}')">
                      <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function filterFinanceType(type) {
  state.financeFilter = type;
  renderApp();
}

// 3. PROJECT DOCUMENTS MODULE RENDERER
function renderProjectDocsView(container) {
  let filteredDocs = state.projectDocs.filter(d =>
    state.activeProjectFilter === 'all' || d.projectId === state.activeProjectFilter
  );

  if (state.docFormatFilter !== 'all') {
    filteredDocs = filteredDocs.filter(d => d.format === state.docFormatFilter);
  }

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Documentos del Proyecto</h1>
        <p class="page-subtitle">Pega capturas (Ctrl+V), sube PDF o fotos y visualízalas en HD en 1 clic</p>
      </div>

      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <div style="display: flex; background: var(--bg-input); padding: 3px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <button class="icon-btn" style="width: auto; padding: 0 10px; height: 32px; border: none; background: ${state.docFormatFilter === 'all' ? 'var(--bg-card)' : 'transparent'}; border-radius: var(--radius-sm); font-size: 11.5px; font-weight: 600;" onclick="filterDocFormat('all')">
            Todos
          </button>
          <button class="icon-btn" style="width: auto; padding: 0 10px; height: 32px; border: none; background: ${state.docFormatFilter === 'pdf' ? 'var(--bg-card)' : 'transparent'}; border-radius: var(--radius-sm); font-size: 11.5px; font-weight: 600; color: var(--accent-red);" onclick="filterDocFormat('pdf')">
            📕 PDF
          </button>
          <button class="icon-btn" style="width: auto; padding: 0 10px; height: 32px; border: none; background: ${state.docFormatFilter === 'image' ? 'var(--bg-card)' : 'transparent'}; border-radius: var(--radius-sm); font-size: 11.5px; font-weight: 600; color: var(--accent-purple);" onclick="filterDocFormat('image')">
            🖼️ Fotos / Screenshots
          </button>
          <button class="icon-btn" style="width: auto; padding: 0 10px; height: 32px; border: none; background: ${state.docFormatFilter === 'sheets' ? 'var(--bg-card)' : 'transparent'}; border-radius: var(--radius-sm); font-size: 11.5px; font-weight: 600; color: var(--accent-green);" onclick="filterDocFormat('sheets')">
            📊 Google Sheets
          </button>
        </div>

        <button class="btn-primary" onclick="openActionModal()">
          <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
          <span>Nuevo Documento</span>
        </button>
      </div>
    </div>

    <!-- Quick Paste Banner -->
    <div class="card glass" style="margin-bottom: 20px; padding: 14px 20px; border-left: 4px solid var(--accent-purple); display: flex; flex-direction: row; justify-content: space-between; align-items: center; cursor: pointer;" onclick="openActionModal('doc')">
      <div style="display: flex; align-items: center; gap: 12px;">
        <i data-lucide="clipboard" style="width: 20px; height: 20px; color: var(--accent-purple);"></i>
        <div>
          <div style="font-size: 13.5px; font-weight: 600;">📋 Pega capturas o fotos directamente con Ctrl+V</div>
          <div style="font-size: 11.5px; color: var(--text-muted);">Copia cualquier imagen o captura al portapapeles y presiona Ctrl+V en esta pantalla</div>
        </div>
      </div>
      <button class="btn-primary" style="padding: 6px 12px; font-size: 12px;">
        <span>Pegar Foto</span>
      </button>
    </div>

    <div class="docs-grid">
      ${filteredDocs.map(doc => {
        const prj = state.projects.find(p => p.id === doc.projectId);
        
        let formatBadge = `<span class="badge badge-red">📕 PDF</span>`;
        if (doc.format === 'image') formatBadge = `<span class="badge badge-purple">🖼️ Foto / Screenshot</span>`;
        else if (doc.format === 'sheets') formatBadge = `<span class="badge badge-green">📊 Google Sheets</span>`;
        else if (doc.format === 'link') formatBadge = `<span class="badge badge-blue">🔗 Enlace Cloud</span>`;

        return `
          <div class="doc-card glass apple-glass-hover">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                ${formatBadge}
                <div style="display: flex; items-center; gap: 4px;">
                  <button class="action-btn-sm" title="Editar Fecha & Documento" onclick="openActionModal('doc', '${doc.id}')"><i data-lucide="edit-2" style="width: 10px; height: 10px;"></i></button>
                  <button class="action-btn-sm action-btn-danger" title="Eliminar Documento" onclick="deleteProjectDoc('${doc.id}')"><i data-lucide="trash-2" style="width: 10px; height: 10px;"></i></button>
                </div>
              </div>
              
              ${doc.format === 'image' && (doc.previewUrl || doc.fileUrl) ? `
                <div style="width: 100%; height: 140px; border-radius: var(--radius-md); overflow: hidden; margin-bottom: 12px; border: 1px solid var(--border-color); background: #000; display: flex; align-items: center; justify-content: center; cursor: pointer;" onclick="openImageLightbox('${doc.id}')" title="Haz clic para previsualizar en HD">
                  <img src="${doc.previewUrl || doc.fileUrl}" alt="${doc.title}" style="width: 100%; height: 100%; object-fit: contain; transition: transform 0.3s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                </div>
              ` : ''}

              <h3 style="font-size: 15px; font-weight: 700; line-height: 1.3; margin-bottom: 6px;">${doc.title}</h3>
              <p style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">${doc.description}</p>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">📅 Fecha: ${doc.date}</div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--border-subtle); margin-top: 10px;">
              <span style="font-size: 11.5px; font-weight: 600; color: var(--accent-blue);">📁 ${prj ? prj.name : doc.projectId}</span>
              ${doc.format === 'image' ? `
                <button class="btn-primary" style="padding: 4px 10px; font-size: 11px;" onclick="openImageLightbox('${doc.id}')">
                  <i data-lucide="eye" style="width: 12px; height: 12px;"></i>
                  <span>Ver Foto</span>
                </button>
              ` : `
                <a href="${doc.fileUrl}" target="_blank" class="btn-primary" style="padding: 4px 10px; font-size: 11px;">
                  <i data-lucide="external-link" style="width: 12px; height: 12px;"></i>
                  <span>${doc.format === 'sheets' ? 'Abrir Sheets' : 'Ver PDF'}</span>
                </a>
              `}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function filterDocFormat(fmt) {
  state.docFormatFilter = fmt;
  renderApp();
}

// 4. TASKS & KANBAN VIEW RENDERER
function renderTasksView(container) {
  const filteredTasks = state.tasks.filter(t => state.activeProjectFilter === 'all' || t.projectId === state.activeProjectFilter);

  const columns = [
    { id: 'TODO', title: 'Por Hacer', color: 'var(--accent-orange)' },
    { id: 'IN_PROGRESS', title: 'En Progreso', color: 'var(--accent-blue)' },
    { id: 'IN_REVIEW', title: 'En Revisión', color: 'var(--accent-purple)' },
    { id: 'COMPLETED', title: 'Completado', color: 'var(--accent-green)' }
  ];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Gestión de Tareas</h1>
        <p class="page-subtitle">Asignación de responsables y fechas límite completamente editables</p>
      </div>

      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <div style="display: flex; background: var(--bg-input); padding: 3px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <button class="icon-btn" style="width: 32px; height: 32px; border: none; background: ${state.taskViewMode === 'kanban' ? 'var(--bg-card)' : 'transparent'}; border-radius: var(--radius-sm);" onclick="switchTaskViewMode('kanban')" title="Vista Kanban">
            <i data-lucide="kanban" style="width: 15px; height: 15px;"></i>
          </button>
          <button class="icon-btn" style="width: 32px; height: 32px; border: none; background: ${state.taskViewMode === 'table' ? 'var(--bg-card)' : 'transparent'}; border-radius: var(--radius-sm);" onclick="switchTaskViewMode('table')" title="Vista Tabla">
            <i data-lucide="list" style="width: 15px; height: 15px;"></i>
          </button>
        </div>

        <button class="btn-primary" onclick="openActionModal()">
          <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
          <span>Nueva Tarea</span>
        </button>
      </div>
    </div>

    ${state.taskViewMode === 'kanban' ? `
      <div class="kanban-board">
        ${columns.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return `
            <div class="kanban-column glass" data-col-id="${col.id}" ondragover="handleDragOver(event)" ondrop="handleDrop(event, '${col.id}')">
              <div class="column-header">
                <div class="column-title">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: ${col.color}; inline-block;"></span>
                  <span>${col.title}</span>
                </div>
                <span class="column-count">${colTasks.length}</span>
              </div>

              ${colTasks.map(t => `
                <div class="kanban-card glass apple-glass-hover" draggable="true" ondragstart="handleDragStart(event, '${t.id}')">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div class="card-title" onclick="advanceTaskStatus('${t.id}')" style="cursor: pointer; flex: 1;">${t.title}</div>
                    <div style="display: flex; gap: 4px; margin-left: 6px;">
                      <button class="action-btn-sm" title="Editar Tarea & Fecha" onclick="event.stopPropagation(); openActionModal('task', '${t.id}')"><i data-lucide="edit-2" style="width: 10px; height: 10px;"></i></button>
                      <button class="action-btn-sm action-btn-danger" title="Eliminar Tarea" onclick="event.stopPropagation(); deleteTask('${t.id}')"><i data-lucide="trash-2" style="width: 10px; height: 10px;"></i></button>
                    </div>
                  </div>
                  <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
                    <span class="badge badge-blue" style="font-size: 10px;">${t.priority}</span>
                    ${t.tags.map(tag => `<span class="badge" style="background: var(--bg-input); font-size: 10px;">${tag}</span>`).join('')}
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 11.5px; color: var(--text-muted);">
                    <span style="font-weight: 600; color: var(--accent-blue);">👤 ${t.assignee}</span>
                    <span>📅 Límite: ${t.dueDate}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }).join('')}
      </div>
    ` : `
      <div class="table-container glass">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Estado</th>
              <th>Prioridad</th>
              <th>Responsable Asignado</th>
              <th>Fecha Límite (Editable)</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTasks.map(t => `
              <tr>
                <td style="font-weight: 600;">${t.title}</td>
                <td><span class="badge badge-blue">${t.status}</span></td>
                <td><span class="badge badge-orange">${t.priority}</span></td>
                <td style="font-weight: 600; color: var(--accent-blue);">👤 ${t.assignee}</td>
                <td style="color: var(--text-main); font-weight: 500; font-size: 13px;">📅 ${t.dueDate}</td>
                <td style="text-align: right;">
                  <div style="display: flex; gap: 6px; justify-content: flex-end;">
                    <button class="action-btn-sm" title="Editar Tarea & Fecha" onclick="openActionModal('task', '${t.id}')"><i data-lucide="edit-2" style="width: 11px; height: 11px;"></i></button>
                    <button class="action-btn-sm action-btn-danger" title="Eliminar Tarea" onclick="deleteTask('${t.id}')"><i data-lucide="trash-2" style="width: 11px; height: 11px;"></i></button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;
}

function switchTaskViewMode(mode) {
  state.taskViewMode = mode;
  renderApp();
}

let draggedTaskId = null;
function handleDragStart(e, taskId) {
  draggedTaskId = taskId;
  e.dataTransfer.setData('text/plain', taskId);
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e, targetStatus) {
  e.preventDefault();
  if (!draggedTaskId) return;
  const task = state.tasks.find(t => t.id === draggedTaskId);
  if (task) {
    task.status = targetStatus;
    renderApp();
  }
  draggedTaskId = null;
}

function advanceTaskStatus(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'];
  const currentIndex = statuses.indexOf(task.status);
  task.status = statuses[(currentIndex + 1) % statuses.length];
  renderApp();
}

// 5. WIKI & KNOWLEDGE BASE VIEW RENDERER
function renderWikiView(container) {
  const activeDoc = state.wikiDocs.find(d => d.id === state.activeWikiDocId) || state.wikiDocs[0];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Base de Conocimientos</h1>
        <p class="page-subtitle">Documentación técnica y notas de proyecto estilo Apple Notes / Notion</p>
      </div>
      <button class="btn-primary" onclick="createNewWikiDoc()">
        <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
        <span>Nueva Nota</span>
      </button>
    </div>

    <div class="wiki-container">
      <!-- Tree Sidebar -->
      <div class="wiki-tree glass">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">Documentos</div>
        ${state.wikiDocs.map(doc => `
          <div class="tree-item ${doc.id === activeDoc.id ? 'active' : ''}" onclick="selectWikiDoc('${doc.id}')" style="justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
              <i data-lucide="file-text" style="width: 16px; height: 16px;"></i>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${doc.title}</span>
            </div>
            <button class="action-btn-sm action-btn-danger" style="width: 18px; height: 18px; border: none;" title="Eliminar" onclick="event.stopPropagation(); deleteWikiDoc('${doc.id}')">
              <i data-lucide="trash-2" style="width: 10px; height: 10px;"></i>
            </button>
          </div>
        `).join('')}
      </div>

      <!-- Editor Canvas -->
      <div class="wiki-editor glass">
        <input type="text" class="editor-title" value="${activeDoc ? activeDoc.title : ''}" oninput="updateDocTitle('${activeDoc ? activeDoc.id : ''}', this.value)">
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Última edición: ${activeDoc ? activeDoc.updatedAt : ''}</div>
        <textarea class="editor-body" oninput="updateDocContent('${activeDoc ? activeDoc.id : ''}', this.value)">${activeDoc ? activeDoc.content : ''}</textarea>
      </div>
    </div>
  `;
}

function selectWikiDoc(id) {
  state.activeWikiDocId = id;
  renderApp();
}

function createNewWikiDoc() {
  const newDoc = {
    id: 'doc-' + Date.now(),
    title: 'Nueva Nota de Proyecto',
    projectId: state.activeProjectFilter === 'all' ? (state.projects[0]?.id || 'PRJ-01') : state.activeProjectFilter,
    updatedAt: getTodayIsoDate(),
    content: 'Escribe aquí el contenido...'
  };
  state.wikiDocs.unshift(newDoc);
  state.activeWikiDocId = newDoc.id;
  renderApp();
}

function deleteWikiDoc(id) {
  if (confirm('¿Eliminar esta nota de la base de conocimiento?')) {
    state.wikiDocs = state.wikiDocs.filter(d => d.id !== id);
    if (state.wikiDocs.length > 0) {
      state.activeWikiDocId = state.wikiDocs[0].id;
    }
    renderApp();
  }
}

function updateDocTitle(id, val) {
  const doc = state.wikiDocs.find(d => d.id === id);
  if (doc) doc.title = val;
}

function updateDocContent(id, val) {
  const doc = state.wikiDocs.find(d => d.id === id);
  if (doc) doc.content = val;
}
