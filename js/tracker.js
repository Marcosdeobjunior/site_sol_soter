/* ══════════════════════════════════════════
   Sól de Sóter — Tracker (Livros, Cinema, Mangás)
   js/tracker.js
══════════════════════════════════════════ */

const PER_PAGE = 20;
const TRACKER_PAGES = {};

// ─── TRACKER CONFIG ───────────────────────────────────────────────────────
const TRACKER_CFG = {
  livros: {
    key: 'livros', icon: '📚', emptyMsg: 'Adicione seu primeiro livro!',
    statusOpts: ['lendo','concluido','quero','pausado'],
    statusLabels: { lendo:'Lendo', concluido:'Concluído', quero:'Quero ler', pausado:'Pausado' },
    statusColors: { lendo:'#c8a96e', concluido:'#5ec4a8', quero:'#7c6fcd', pausado:'#7a7590' },
    ribbonColors: { lendo:'rgba(200,169,110,.8)', concluido:'rgba(94,196,168,.8)', quero:'rgba(124,111,205,.8)', pausado:'rgba(122,117,144,.6)' },
    progressFn: (item) => item.paginas ? Math.round((item.atual||0)/item.paginas*100) : null,
    progressLabel: (item) => item.paginas ? `Pág. ${item.atual||0}/${item.paginas}` : null,
  },
  cinema: {
    key: 'cinema', icon: '🎬', emptyMsg: 'Adicione um filme ou série!',
    statusOpts: ['assistindo','concluido','quero','pausado'],
    statusLabels: { assistindo:'Assistindo', concluido:'Concluído', quero:'Quero ver', pausado:'Pausado' },
    statusColors: { assistindo:'#e8864a', concluido:'#5ec4a8', quero:'#7c6fcd', pausado:'#7a7590' },
    ribbonColors: { assistindo:'rgba(232,134,74,.8)', concluido:'rgba(94,196,168,.8)', quero:'rgba(124,111,205,.8)', pausado:'rgba(122,117,144,.6)' },
    progressFn: () => null,
    progressLabel: () => null,
  },
  mangas: {
    key: 'mangas', icon: '📖', emptyMsg: 'Adicione seu primeiro mangá!',
    statusOpts: ['lendo','concluido','quero','pausado'],
    statusLabels: { lendo:'Lendo', concluido:'Concluído', quero:'Quero ler', pausado:'Pausado' },
    statusColors: { lendo:'#e06b8b', concluido:'#5ec4a8', quero:'#7c6fcd', pausado:'#7a7590' },
    ribbonColors: { lendo:'rgba(224,107,139,.8)', concluido:'rgba(94,196,168,.8)', quero:'rgba(124,111,205,.8)', pausado:'rgba(122,117,144,.6)' },
    progressFn: (item) => item.capTotal ? Math.round((item.capAtual||0)/item.capTotal*100) : null,
    progressLabel: (item) => item.capTotal ? `Cap. ${item.capAtual||0}/${item.capTotal}` : null,
  },
};

// ─── MODAL STATE ──────────────────────────────────────────────────────────
let modalTracker = null;
let modalEditId = null;
let modalImgData = '';
let modalStarVal = 0;

function openModal(key, id) {
  modalTracker = key;
  modalEditId = id || null;
  modalImgData = '';
  modalStarVal = 0;

  const cfg = TRACKER_CFG[key];
  const modal = document.getElementById('tracker-modal');
  const titleEl = document.getElementById('modal-title');

  // Set title
  titleEl.textContent = id ? `Editar ${cfg.icon}` : `Adicionar ${cfg.icon}`;

  // Reset fields
  ['m-titulo','m-autor','m-genero','m-obs'].forEach(f => { const el = document.getElementById(f); if(el) el.value=''; });
  ['m-paginas','m-atual-pag','m-cap-atual','m-cap-total'].forEach(f => { const el = document.getElementById(f); if(el) el.value=''; });
  document.getElementById('m-fav').checked = false;
  document.getElementById('m-fav').nextElementSibling.textContent = '🤍';

  // Reset image
  const zone = document.getElementById('img-zone');
  const preview = document.getElementById('modal-preview');
  zone.classList.remove('has-img');
  preview.src = '';

  // Set status options
  const statusSel = document.getElementById('m-status');
  statusSel.innerHTML = cfg.statusOpts.map(s => `<option value="${s}">${cfg.statusLabels[s]}</option>`).join('');

  // Show/hide extras
  document.getElementById('m-livros-extra').style.display = key==='livros' ? '' : 'none';
  document.getElementById('m-cinema-extra').style.display = key==='cinema' ? '' : 'none';
  document.getElementById('m-mangas-extra').style.display = key==='mangas' ? '' : 'none';

  resetModalStars();

  const delBtn = document.getElementById('modal-del-btn');

  if (id) {
    const item = S[key].find(x=>x.id===id);
    if (item) {
      document.getElementById('m-titulo').value = item.titulo || '';
      document.getElementById('m-autor').value = item.autor || '';
      document.getElementById('m-genero').value = item.genero || '';
      document.getElementById('m-obs').value = item.obs || '';
      statusSel.value = item.status || cfg.statusOpts[0];
      document.getElementById('m-fav').checked = !!item.fav;
      document.getElementById('m-fav').nextElementSibling.textContent = item.fav ? '❤️' : '🤍';
      if (item.nota) { setModalStar(item.nota); }
      if (item.img) { preview.src = item.img; zone.classList.add('has-img'); modalImgData = item.img; }
      if (key==='livros') {
        document.getElementById('m-paginas').value = item.paginas||'';
        document.getElementById('m-atual-pag').value = item.atual||'';
      }
      if (key==='cinema') {
        document.getElementById('m-tipo-cinema').value = item.tipo||'Filme';
      }
      if (key==='mangas') {
        document.getElementById('m-cap-atual').value = item.capAtual||'';
        document.getElementById('m-cap-total').value = item.capTotal||'';
      }
      if (delBtn) delBtn.classList.add('visible');
    }
  } else {
    if (delBtn) delBtn.classList.remove('visible');
  }

  modal.classList.add('open');
}

function closeModal() {
  document.getElementById('tracker-modal').classList.remove('open');
  modalTracker = null; modalEditId = null; modalImgData = ''; modalStarVal = 0;
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('tracker-modal')) closeModal();
}

function handleImgUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 300, maxH = 450;
      let { width, height } = img;
      if (width/height > maxW/maxH) { width = maxW; height = Math.round(maxW/img.width*img.height); }
      else { height = maxH; width = Math.round(maxH/img.height*img.width); }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      modalImgData = canvas.toDataURL('image/jpeg', 0.82);
      const preview = document.getElementById('modal-preview');
      preview.src = modalImgData;
      document.getElementById('img-zone').classList.add('has-img');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function setModalStar(n) {
  modalStarVal = n;
  document.querySelectorAll('.mstar').forEach(b => b.classList.toggle('on', +b.dataset.v <= n));
  const labels = ['','Ruim','Regular','Bom','Ótimo','Excelente'];
  document.getElementById('modal-star-label').textContent = labels[n] || 'Sem nota';
}

function resetModalStars() {
  modalStarVal = 0;
  document.querySelectorAll('.mstar').forEach(b => b.classList.remove('on'));
  const lbl = document.getElementById('modal-star-label');
  if (lbl) lbl.textContent = 'Sem nota';
}

function saveModalItem() {
  const titulo = document.getElementById('m-titulo').value.trim();
  if (!titulo) { document.getElementById('m-titulo').focus(); return; }

  const item = {
    id: modalEditId || Date.now(),
    titulo,
    autor: document.getElementById('m-autor').value.trim(),
    genero: document.getElementById('m-genero').value.trim(),
    obs: document.getElementById('m-obs').value.trim(),
    status: document.getElementById('m-status').value,
    nota: modalStarVal,
    fav: document.getElementById('m-fav').checked,
    img: modalImgData,
  };

  if (modalTracker === 'livros') {
    item.paginas = +document.getElementById('m-paginas').value || 0;
    item.atual = +document.getElementById('m-atual-pag').value || 0;
  }
  if (modalTracker === 'cinema') {
    item.tipo = document.getElementById('m-tipo-cinema').value;
  }
  if (modalTracker === 'mangas') {
    item.capAtual = +document.getElementById('m-cap-atual').value || 0;
    item.capTotal = +document.getElementById('m-cap-total').value || 0;
  }

  if (modalEditId) {
    const idx = S[modalTracker].findIndex(x=>x.id===modalEditId);
    if (idx >= 0) S[modalTracker][idx] = item;
  } else {
    S[modalTracker].push(item);
  }

  save();
  renderTracker(modalTracker);
  closeModal();
}

// ─── RENDER TRACKER ───────────────────────────────────────────────────────
function renderTracker(key) {
  const cfg = TRACKER_CFG[key];
  const searchIds = { livros:'lv-search', cinema:'ci-search', mangas:'mg-search' };
  const sq = (document.getElementById(searchIds[key]) || {value:''}).value.toLowerCase();

  let items = S[key].filter(x =>
    !sq || x.titulo.toLowerCase().includes(sq) ||
    (x.autor||'').toLowerCase().includes(sq) ||
    (x.genero||'').toLowerCase().includes(sq)
  );

  if (key==='livros') {
    document.getElementById('lv-total').textContent = S.livros.length;
    document.getElementById('lv-lendo').textContent = S.livros.filter(x=>x.status==='lendo').length;
    document.getElementById('lv-done').textContent = S.livros.filter(x=>x.status==='concluido').length;
    document.getElementById('lv-fav').textContent = S.livros.filter(x=>x.fav).length;
    const lbl = document.getElementById('lv-count-label');
    if(lbl) lbl.textContent = `${items.length} ${items.length===1?'livro':'livros'}${sq?' encontrados':''}`;
  }
  if (key==='cinema') {
    document.getElementById('ci-total').textContent = S.cinema.length;
    document.getElementById('ci-watch').textContent = S.cinema.filter(x=>x.status==='assistindo').length;
    document.getElementById('ci-done').textContent = S.cinema.filter(x=>x.status==='concluido').length;
    document.getElementById('ci-fav').textContent = S.cinema.filter(x=>x.fav).length;
    const lbl = document.getElementById('ci-count-label');
    if(lbl) lbl.textContent = `${items.length} ${items.length===1?'título':'títulos'}${sq?' encontrados':''}`;
  }
  if (key==='mangas') {
    document.getElementById('mg-total').textContent = S.mangas.length;
    document.getElementById('mg-lendo').textContent = S.mangas.filter(x=>x.status==='lendo').length;
    document.getElementById('mg-done').textContent = S.mangas.filter(x=>x.status==='concluido').length;
    document.getElementById('mg-fav').textContent = S.mangas.filter(x=>x.fav).length;
    const lbl = document.getElementById('mg-count-label');
    if(lbl) lbl.textContent = `${items.length} ${items.length===1?'mangá':'mangás'}${sq?' encontrados':''}`;
  }

  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  if (!TRACKER_PAGES[key]) TRACKER_PAGES[key] = 1;
  if (TRACKER_PAGES[key] > totalPages) TRACKER_PAGES[key] = totalPages;
  const curPage = TRACKER_PAGES[key];

  const tabsEl = document.getElementById(key+'-tabs');
  if (tabsEl) {
    if (totalPages <= 1) {
      tabsEl.innerHTML = '';
    } else {
      tabsEl.innerHTML = Array.from({length:totalPages}, (_,i) => {
        const start = i*PER_PAGE+1, end = Math.min((i+1)*PER_PAGE, items.length);
        return `<button class="ttab ${curPage===i+1?'active':''}" onclick="goTrackerPage('${key}',${i+1})">
          Página ${i+1} <span style="font-size:9px;opacity:.6">(${start}–${end})</span>
        </button>`;
      }).join('');
    }
  }

  const pageItems = items.slice((curPage-1)*PER_PAGE, curPage*PER_PAGE);
  const gridEl = document.getElementById(key+'-grid');
  if (!gridEl) return;

  if (!items.length) {
    gridEl.innerHTML = `<div class="empty" style="grid-column:span 5"><div class="empty-icon">${cfg.icon}</div>${sq ? 'Nenhum resultado para "'+sq+'"' : cfg.emptyMsg}</div>`;
    return;
  }

  gridEl.innerHTML = pageItems.map(item => buildCard(item, cfg)).join('');
}

function goTrackerPage(key, page) {
  TRACKER_PAGES[key] = page;
  renderTracker(key);
}

function modalDeleteItem() {
  if (!modalTracker || !modalEditId) return;
  if (!confirm('Tem certeza que deseja excluir este item?')) return;
  S[modalTracker] = S[modalTracker].filter(x => x.id !== modalEditId);
  save();
  renderTracker(modalTracker);
  closeModal();
}

function buildCard(item, cfg) {
  const pct = cfg.progressFn(item);
  const progressLabel = cfg.progressLabel(item);
  const statusColor = cfg.statusColors[item.status] || '#7a7590';
  const ribbonColor = cfg.ribbonColors[item.status] || 'rgba(122,117,144,.6)';
  const statusLabel = cfg.statusLabels[item.status] || item.status;
  const stars = item.nota ? '★'.repeat(item.nota)+'☆'.repeat(5-item.nota) : '';

  const imgSection = item.img
    ? `<img class="mc-img" src="${item.img}" alt="${item.titulo}" loading="lazy">`
    : `<div class="mc-img-placeholder">
        <div class="ph-icon">${cfg.icon}</div>
        <div class="ph-title">${item.titulo}</div>
       </div>`;

  const progressSection = pct !== null
    ? `<div class="mc-progress-bar"><div class="mc-progress-fill" style="width:${pct}%"></div></div>`
    : '';

  return `<div class="mc ${item.fav?'fav':''}" onclick="openModal('${cfg.key}',${item.id})">
    ${imgSection}
    <div class="mc-ribbon" style="background:${ribbonColor};color:#fff">${statusLabel}</div>
    ${item.fav ? '<div class="mc-fav-badge">⭐</div>' : ''}
    <div class="mc-body">
      <div class="mc-title">${item.titulo}</div>
      ${item.autor ? `<div class="mc-author">${item.autor}</div>` : ''}
      ${stars ? `<div class="mc-stars">${stars}</div>` : ''}
      ${progressSection}
      <div class="mc-bottom">
        <span class="mc-status-pill" style="color:${statusColor};border-color:${statusColor}40;background:${statusColor}18">${statusLabel}</span>
        ${progressLabel ? `<span class="mc-pct">${progressLabel}</span>` : ''}
      </div>
    </div>
  </div>`;
}

// Legacy aliases
function renderLivros() { renderTracker('livros'); }
function renderCinema() { renderTracker('cinema'); }
function renderMangas() { renderTracker('mangas'); }
