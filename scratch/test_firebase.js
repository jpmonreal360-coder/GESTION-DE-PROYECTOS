const payload = {
  workspaceId: 'rc_ws_main',
  isCustomized: true,
  updatedAt: 1787285000000,
  projects: [
    { id: 'PRJ-01', name: 'App iOS Redesign', code: 'IOS-01', budget: 450000, totalBudget: 450000, spent: 284500, spentBudget: 284500, color: '#007AFF', category: 'Mobile App', startDate: '2026-08-01', endDate: '2026-11-30' },
    { id: 'PRJ-02', name: 'SaaS Dashboard v2', code: 'SAAS-02', budget: 350000, totalBudget: 350000, spent: 312000, spentBudget: 312000, color: '#AF52DE', category: 'Web App', startDate: '2026-07-15', endDate: '2026-10-15' },
    { id: 'PRJ-03', name: 'Brand Identity 2026', code: 'BRAND-03', budget: 220000, totalBudget: 220000, spent: 148000, spentBudget: 148000, color: '#FF9500', category: 'Design', startDate: '2026-08-05', endDate: '2026-09-30' }
  ]
};

const urls = [
  'https://gestion-de-proyectos-rc-default-rtdb.firebaseio.com/rc_ws_main.json',
  'https://gestion-proyectos-rc.firebaseio.com/rc_ws_main.json',
  'https://rc-proyectos-studio.firebaseio.com/rc_ws_main.json',
  'https://kv-store-rest.vercel.app/api/ws_rc_ws_main'
];

async function check() {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log(url, '=> Status:', res.status);
    } catch (e) {
      console.log(url, '=> Error:', e.message);
    }
  }
}

check();
