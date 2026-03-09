"use strict";

const DATA_KEY = "sonhosHub";
const S = { sonhos: [] };

function getAppState() {
  return window.SoterStorage && window.SoterStorage.getState
    ? window.SoterStorage.getState()
    : { data: {} };
}

function saveAppState(next) {
  if (window.SoterStorage && window.SoterStorage.save) window.SoterStorage.save(next);
}

function normalizeCategory(cat) {
  const m = {
    "pessoal": "pessoal",
    "profissional": "carreira",
    "carreira": "carreira",
    "financeiro": "financeiro",
    "saúde": "saude",
    "saude": "saude",
    "relacionamento": "familia",
    "família": "familia",
    "familia": "familia",
    "educação": "criativo",
    "educacao": "criativo",
    "viagem": "aventura",
    "hobby": "criativo",
    "espiritual": "espiritual"
  };
  const k = String(cat || "pessoal").trim().toLowerCase();
  return m[k] || "pessoal";
}

function load() {
  const app = getAppState();
  const raw = app.data && app.data[DATA_KEY];
  if (!raw || typeof raw !== "object") return;

  if (Array.isArray(raw.sonhos) && raw.sonhos.length && Array.isArray(raw.sonhos[0].metas)) {
    S.sonhos = raw.sonhos;
    return;
  }

  if (Array.isArray(raw.sonhos) && Array.isArray(raw.metas)) {
    const metasById = new Map(raw.metas.map((m) => [String(m.id), m]));
    S.sonhos = raw.sonhos.map((d) => {
      const ids = Array.isArray(d.metaIds) ? d.metaIds : [];
      const metas = ids.map((id) => metasById.get(String(id))).filter(Boolean).map((m) => ({
        id: Number(String(m.id).replace(/\D+/g, "")) || Date.now() + Math.floor(Math.random() * 999),
        texto: m.titulo || m.descricao || "Meta",
        feita: m.status === "concluida",
        prioridade: m.prioridade || "media",
        dataInicio: "",
        prazo: m.prazo || ""
      }));
      return {
        id: Number(String(d.id).replace(/\D+/g, "")) || Date.now() + Math.floor(Math.random() * 999),
        titulo: d.titulo || "Sonho",
        icon: "🌙",
        horizonte: "Longo prazo",
        categoria: normalizeCategory(d.categoria),
        desc: d.descricao || "",
        dataInicio: "",
        dataFim: d.prazo || "",
        img: d.imagem || "",
        metas,
        realizado: false
      };
    });
    return;
  }

  if (Array.isArray(raw.sonhos)) {
    S.sonhos = raw.sonhos;
  }
}

function save() {
  const app = getAppState();
  if (!app.data || typeof app.data !== "object") app.data = {};
  app.data[DATA_KEY] = { sonhos: S.sonhos };
  try {
    saveAppState(app);
  } catch (err) {
    const msg = String((err && err.message) || "");
    if (msg.toLowerCase().indexOf("quota") >= 0) {
      alert("Armazenamento do navegador cheio. Algumas imagens foram removidas automaticamente. Tente salvar novamente.");
      return;
    }
    throw err;
  }
}

function addNotif() {}

function snMigrateData() {
  S.sonhos = (S.sonhos || []).map(s => {
    if (!s.metas)     s.metas     = [];
    if (!s.categoria) s.categoria = 'pessoal';
    if (!s.icon)      s.icon      = '🌙';
    s.metas = s.metas.map(m => {
      if (!m.prioridade) m.prioridade = 'media';
      if (!m.dataInicio) m.dataInicio = '';
      if (!m.prazo)      m.prazo      = '';
      return m;
    });
    return s;
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────
const SN_CAT_COLORS = {
  pessoal:'#7c6fcd', carreira:'#4ab0e8', financeiro:'#c8a96e',
  saude:'#5ec4a8',   familia:'#e06b8b',  aventura:'#e8864a',
  criativo:'#b06be8', espiritual:'#c8a96e',
};
const SN_CAT_LABELS = {
  pessoal:'🧠 Pessoal', carreira:'💼 Carreira', financeiro:'💰 Financeiro',
  saude:'💪 Saúde',     familia:'🏡 Família',   aventura:'🌍 Aventura',
  criativo:'🎨 Criativo', espiritual:'✨ Espiritual',
};

function snFmtDate(ds) {
  if (!ds) return null;
  const d = new Date(ds + 'T00:00:00');
  if (isNaN(d)) return null;
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
}
function snFmtDateShort(ds) {
  if (!ds) return null;
  const d = new Date(ds + 'T00:00:00');
  if (isNaN(d)) return null;
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
}
function snDaysDiff(ds) {
  if (!ds) return null;
  const d = new Date(ds + 'T00:00:00');
  const n = new Date(); n.setHours(0,0,0,0);
  return Math.round((d - n) / 86400000);
}
function snIsLate(prazo, feita) {
  if (feita || !prazo) return false;
  return snDaysDiff(prazo) < 0;
}

// ══════════════════════════════════════════════════════════════════════════
// HUB STATE
// ══════════════════════════════════════════════════════════════════════════
let hubSonhoId   = null;
let hubEditImg   = '';   // image data during inline edit
let hubEditOpen  = false;

// ── Open / Close ──────────────────────────────────────────────────────────
function snOpenHub(id) {
  hubSonhoId = id;
  const s = S.sonhos.find(x => x.id === id);
  if (!s) return;
  const hub = document.getElementById('sn-hub');
  hub.scrollTop = 0;
  hub.classList.add('open');
  document.body.style.overflow = 'hidden';
  const header = document.querySelector('.site-header');
  if (header) header.style.zIndex = '1';
  // close edit panel if was open
  hubEditOpen = false;
  const ep = document.getElementById('hub-edit-panel');
  if (ep) ep.classList.remove('open');
  document.getElementById('hub-edit-btn-lbl').textContent = 'Editar';
  document.getElementById('hub-edit-toggle-btn').classList.remove('editing');
  hubRender(s);
}

function snHubClose() {
  document.getElementById('sn-hub').classList.remove('open');
  document.body.style.overflow = '';
  const header = document.querySelector('.site-header');
  if (header) header.style.zIndex = '';
  hubSonhoId  = null;
  hubEditOpen = false;
}

// ── Drawer de edição ──────────────────────────────────────────────────────
let _drawerImg = '';

function hubDrawerOpen() {
  if (!hubSonhoId) return;
  const s = S.sonhos.find(x => x.id === hubSonhoId); if (!s) return;
  document.getElementById('hd-titulo').value    = s.titulo      || '';
  document.getElementById('hd-icon').value      = s.icon        || '🌙';
  document.getElementById('hd-categoria').value = s.categoria   || 'pessoal';
  document.getElementById('hd-horizonte').value = s.horizonte   || '1 ano';
  document.getElementById('hd-inicio').value    = s.dataInicio  || '';
  document.getElementById('hd-fim').value       = s.dataFim     || '';
  document.getElementById('hd-desc').value      = s.desc        || '';
  document.getElementById('hd-intencao').value  = s.intencao    || '';
  document.getElementById('hd-nota').value      = s.nota        || '';
  document.getElementById('hd-head-title').textContent = s.titulo || 'Editar sonho';
  _drawerImg = s.img || '';
  const zone = document.getElementById('hd-cover-zone');
  const img  = document.getElementById('hd-cover-img');
  img.src = _drawerImg; zone.classList.toggle('hci', !!_drawerImg);
  document.getElementById('hub-drawer').classList.add('open');
  document.getElementById('hub-drawer-bd').classList.add('open');
  setTimeout(() => document.getElementById('hd-titulo').focus(), 180);
}

function hubDrawerClose() {
  document.getElementById('hub-drawer').classList.remove('open');
  document.getElementById('hub-drawer-bd').classList.remove('open');
}

function hubDrawerRemoveImg() {
  _drawerImg = '';
  document.getElementById('hd-cover-img').src = '';
  document.getElementById('hd-cover-zone').classList.remove('hci');
  document.getElementById('hd-img-input').value = '';
}

function hubDrawerHandleImg(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const im = new Image();
    im.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW=1200, maxH=675; let w=im.width, h=im.height;
      const r = w/h;
      if (r>maxW/maxH){w=maxW;h=Math.round(w/r);}else{h=maxH;w=Math.round(h*r);}
      canvas.width=w; canvas.height=h;
      canvas.getContext('2d').drawImage(im,0,0,w,h);
      _drawerImg = canvas.toDataURL('image/jpeg',.87);
      document.getElementById('hd-cover-img').src = _drawerImg;
      document.getElementById('hd-cover-zone').classList.add('hci');
    };
    im.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function hubDrawerSalvar() {
  const titulo = document.getElementById('hd-titulo').value.trim();
  if (!titulo) {
    const el = document.getElementById('hd-titulo');
    el.focus(); el.style.borderColor='rgba(224,107,139,.65)';
    setTimeout(()=>el.style.borderColor='',1400); return;
  }
  const idx = S.sonhos.findIndex(x => x.id === hubSonhoId); if (idx<0) return;
  S.sonhos[idx] = Object.assign({}, S.sonhos[idx], {
    titulo,
    icon:       document.getElementById('hd-icon').value.trim() || '🌙',
    categoria:  document.getElementById('hd-categoria').value,
    horizonte:  document.getElementById('hd-horizonte').value,
    dataInicio: document.getElementById('hd-inicio').value,
    dataFim:    document.getElementById('hd-fim').value,
    desc:       document.getElementById('hd-desc').value.trim(),
    intencao:   document.getElementById('hd-intencao').value.trim(),
    nota:       document.getElementById('hd-nota').value.trim(),
    img:        document.getElementById('hd-cover-zone').classList.contains('hci') ? (_drawerImg || S.sonhos[idx].img) : '',
  });
  save(); hubDrawerClose(); hubRender(S.sonhos[idx]); renderSonhos();
}

function hubDrawerDeletar() {
  const s = S.sonhos.find(x=>x.id===hubSonhoId);
  if (!confirm('Excluir "' + (s ? s.titulo : 'este sonho') + '"? Esta ação não pode ser desfeita.')) return;
  S.sonhos = S.sonhos.filter(x=>x.id!==hubSonhoId);
  save(); renderSonhos(); hubDrawerClose(); snHubClose();
}

function hubToggleEditPanel() { hubDrawerOpen(); }

// ── Main render ───────────────────────────────────────────────────────────
function hubRender(s) {
  const isReal   = s.realizado;
  const catColor = SN_CAT_COLORS[s.categoria] || '#7c6fcd';
  const catLabel = SN_CAT_LABELS[s.categoria]  || s.categoria;
  const metas    = s.metas || [];

  // Hero image
  const hero = document.getElementById('hub-hero');
  const heroImg = document.getElementById('hub-hero-img');
  heroImg.src = s.img || '';
  hero.classList.toggle('has-img', !!s.img);

  // Icon & title
  document.getElementById('hub-icon').textContent  = s.icon || '🌙';
  document.getElementById('hub-title').textContent = s.titulo;

  // Cat badge
  const badge = document.getElementById('hub-cat-badge');
  badge.textContent = catLabel;
  badge.style.cssText = `background:${catColor}18;border-color:${catColor}44;color:${catColor}`;

  // Hero meta chips
  const metaRow = document.getElementById('hub-hero-meta');
  if (metaRow) {
    const chips = [];
    if (s.dataInicio) chips.push(`<div class="hub-hero-chip">📅 ${snFmtDateShort(s.dataInicio)}</div>`);
    if (s.dataFim) {
      const diff = snDaysDiff(s.dataFim);
      const cls  = !isReal && diff < 0 ? 'warning' : isReal ? 'success' : '';
      const txt  = isReal ? '✓ ' + snFmtDateShort(s.dataFim)
                 : diff < 0  ? '⚠ ' + Math.abs(diff) + 'd atrasado'
                 : diff === 0 ? '✦ Vence hoje!'
                 : '🏁 ' + diff + 'd restantes';
      chips.push(`<div class="hub-hero-chip ${cls}">${txt}</div>`);
    }
    if (s.horizonte) chips.push(`<div class="hub-hero-chip">⏳ ${s.horizonte}</div>`);
    metaRow.innerHTML = chips.join('');
  }

  // Realizado buttons
  const navDoneBtn  = document.getElementById('hub-nav-done-btn');
  const navDoneIcon = document.getElementById('hub-nav-done-icon');
  const navDoneLbl  = document.getElementById('hub-nav-done-lbl');
  if (navDoneBtn) { navDoneBtn.classList.toggle('realizado', isReal); navDoneIcon.textContent = isReal ? '✅' : '○'; navDoneLbl.textContent = 'Realizado'; }
  const doneBtn  = document.getElementById('hub-done-btn');
  const doneIcon = document.getElementById('hub-done-icon');
  const doneLbl  = document.getElementById('hub-done-lbl');
  if (doneBtn) { doneBtn.className = 'hub-done-btn ' + (isReal ? 'done-state' : 'pending'); doneIcon.textContent = isReal ? '✅' : '○'; doneLbl.textContent = isReal ? 'Realizado! (clique para desfazer)' : 'Marcar como realizado'; }

  // Description
  const descEl = document.getElementById('hub-desc-text');
  if (descEl) {
    if (s.desc) { descEl.className = 'hub-desc-text'; descEl.textContent = s.desc; }
    else { descEl.className = 'hub-desc-empty'; descEl.textContent = 'Sem descrição. Clique em Editar para adicionar.'; }
  }

  // Progress ring (r=44, circumference=276.46)
  const total  = metas.length;
  const done   = metas.filter(m => m.feita).length;
  const late   = metas.filter(m => snIsLate(m.prazo, m.feita)).length;
  const pct    = total > 0 ? Math.round(done / total * 100) : 0;
  const circum = 2 * Math.PI * 44;
  const ringFill = document.getElementById('hub-ring-fill');
  if (ringFill) { ringFill.style.strokeDasharray = circum; setTimeout(() => { ringFill.style.strokeDashoffset = circum * (1 - pct / 100); }, 80); }
  const ringPct = document.getElementById('hub-ring-pct'); if (ringPct) ringPct.textContent = pct + '%';
  const ringSub = document.getElementById('hub-ring-sub'); if (ringSub) ringSub.textContent = done + '/' + total + ' metas';
  const ringStats = document.getElementById('hub-ring-stats');
  if (ringStats) ringStats.innerHTML =
    `<div class="hub-ring-stat"><span class="hub-ring-stat-lbl">Total</span><span class="hub-ring-stat-val">${total}</span></div>` +
    `<div class="hub-ring-stat"><span class="hub-ring-stat-lbl">Concluídas</span><span class="hub-ring-stat-val" style="color:var(--accent3)">${done}</span></div>` +
    (late > 0 ? `<div class="hub-ring-stat"><span class="hub-ring-stat-lbl">Atrasadas</span><span class="hub-ring-stat-val" style="color:var(--accent4)">${late}</span></div>` : '');

  // Priority bars
  const pCount = {alta:0,media:0,baixa:0};
  metas.forEach(m => { pCount[m.prioridade||'media']++; });
  const maxP = Math.max(...Object.values(pCount), 1);
  const pColorMap = {alta:'var(--accent4)',media:'var(--accent1)',baixa:'var(--accent3)'};
  const pLblMap   = {alta:'🔴 Alta',media:'🟡 Média',baixa:'🟢 Baixa'};
  const prioRows = document.getElementById('hub-prio-rows');
  if (prioRows) prioRows.innerHTML = ['alta','media','baixa'].map(p =>
    `<div class="hub-prio-row">
      <div class="hub-prio-info"><span class="hub-prio-lbl">${pLblMap[p]}</span><span class="hub-prio-val">${pCount[p]} meta${pCount[p]!==1?'s':''}</span></div>
      <div class="hub-prio-track"><div class="hub-prio-fill" style="width:${pCount[p]/maxP*100}%;background:${pColorMap[p]}"></div></div>
    </div>`
  ).join('');

  hubRenderDates(s);
  hubRenderMetaList(s);
  hubRenderTips(s);
  hubRenderExtras(s);
}

function hubRenderExtras(s) {
  // ── Intenção do dia ──────────────────────────────────────────────
  const intEl = document.getElementById('hub-intencao-display');
  if (intEl) intEl.textContent = s.intencao || '';

  // ── Nota rápida ──────────────────────────────────────────────────
  const notaSection = document.getElementById('hub-nota-section');
  const notaEl      = document.getElementById('hub-nota-display');
  if (notaSection && notaEl) {
    const hasNota = !!(s.nota && s.nota.trim());
    notaSection.style.display = hasNota ? '' : 'none';
    if (hasNota) notaEl.textContent = s.nota.trim();
  }

  // ── Jornada (dias desde início) ──────────────────────────────────
  const jorSection = document.getElementById('hub-jornada-section');
  const jorContent = document.getElementById('hub-jornada-content');
  if (jorSection && jorContent && s.dataInicio) {
    jorSection.style.display = '';
    const ini   = new Date(s.dataInicio + 'T00:00:00');
    const hoje  = new Date(); hoje.setHours(0,0,0,0);
    const dias  = Math.max(0, Math.round((hoje - ini) / 86400000));
    let pct = 0, totalDias = 0, restam = null;
    if (s.dataFim) {
      const fim = new Date(s.dataFim + 'T00:00:00');
      totalDias = Math.max(1, Math.round((fim - ini) / 86400000));
      pct = Math.min(100, Math.round(dias / totalDias * 100));
      restam = Math.max(0, Math.round((fim - hoje) / 86400000));
    }
    jorContent.innerHTML =
      `<div class="hub-jornada-dias">
        <span class="hub-jornada-num">${dias}</span>
        <span class="hub-jornada-unit">dias de jornada</span>
      </div>` +
      (s.dataFim ? `<div class="hub-jornada-bar"><div class="hub-jornada-fill" style="width:0%" id="hub-jornada-fill"></div></div>
        <div class="hub-jornada-sub">${restam === 0 ? '🏁 Prazo final hoje!' : restam > 0 ? `Faltam ${restam} dias para o prazo` : `${Math.abs(restam)}d além do prazo`}</div>` : '');
    // anima a barra
    if (s.dataFim) setTimeout(() => {
      const fill = document.getElementById('hub-jornada-fill');
      if (fill) fill.style.width = pct + '%';
    }, 200);
  } else if (jorSection) { jorSection.style.display = 'none'; }
}

function hubRenderDates(s) {
  const grid = document.getElementById('hub-dates-grid'); if (!grid) return;
  const ini  = snFmtDate(s.dataInicio), fim = snFmtDate(s.dataFim);
  const iniDiff = snDaysDiff(s.dataInicio), fimDiff = snDaysDiff(s.dataFim);
  grid.innerHTML =
    `<div class="hub-date-card"><div class="hub-date-lbl">📅 Início</div><div class="hub-date-val">${ini||'—'}</div>${ini&&iniDiff!==null?`<div class="hub-date-sub">${iniDiff<0?Math.abs(iniDiff)+'d atrás':'daqui '+iniDiff+'d'}</div>`:''}</div>` +
    `<div class="hub-date-card"><div class="hub-date-lbl">🏁 Conclusão</div><div class="hub-date-val" style="${fimDiff!==null&&fimDiff<0&&!s.realizado?'color:var(--accent4)':''}">${fim||'—'}</div>${fim&&fimDiff!==null&&!s.realizado?`<div class="hub-date-sub" style="${fimDiff<0?'color:var(--accent4)':''}">${fimDiff<0?Math.abs(fimDiff)+'d atrasado':fimDiff===0?'Vence hoje':'Faltam '+fimDiff+'d'}</div>`:''}</div>`;
  const tlWrap = document.getElementById('hub-tl-wrap');
  const tlFill = document.getElementById('hub-tl-fill');
  const tlToday = document.getElementById('hub-tl-today');
  const tlLbls  = document.getElementById('hub-tl-labels');
  if (s.dataInicio && s.dataFim && tlWrap) {
    const dStart = new Date(s.dataInicio+'T00:00:00').getTime();
    const dEnd   = new Date(s.dataFim  +'T00:00:00').getTime();
    const span   = dEnd - dStart;
    if (span > 0) {
      const todayPct = Math.min(100, Math.max(0, (Date.now() - dStart) / span * 100));
      tlWrap.style.display = '';
      setTimeout(() => { tlFill.style.width = todayPct+'%'; tlToday.style.left = todayPct+'%'; }, 120);
      if (tlLbls) tlLbls.innerHTML = `<span>${ini}</span><span style="color:var(--accent4)">Hoje</span><span>${fim}</span>`;
    } else { tlWrap.style.display = 'none'; }
  } else if (tlWrap) { tlWrap.style.display = 'none'; }
}

function hubRenderMetaList(s) {
  const list  = document.getElementById('hub-meta-list'); if (!list) return;
  const metas = s.metas || [];
  if (!metas.length) {
    list.innerHTML = `<div class="hub-meta-empty"><span class="hub-meta-empty-icon">◈</span>Nenhuma meta adicionada ainda.<br>Clique em <strong>+ Nova meta</strong> para começar.</div>`;
    return;
  }
  const order = {alta:0,media:1,baixa:2};
  const sorted = [...metas].sort((a,b) => {
    if (a.feita !== b.feita) return a.feita ? 1 : -1;
    const po = (order[a.prioridade||'media']||1) - (order[b.prioridade||'media']||1);
    if (po !== 0) return po;
    if (a.prazo && b.prazo) return a.prazo < b.prazo ? -1 : 1;
    return 0;
  });
  const pColorMap = {alta:'prio-alta',media:'prio-media',baixa:'prio-baixa'};
  const pLblMap   = {alta:'🔴 Alta',media:'🟡 Média',baixa:'🟢 Baixa'};
  list.innerHTML = sorted.map((m, i) => {
    const isLate = snIsLate(m.prazo, m.feita);
    const diff   = snDaysDiff(m.prazo);
    const checkCls = m.feita ? 'done' : isLate ? 'late' : '';
    const chips = [];
    if (m.dataInicio) chips.push(`<span class="hub-meta-chip date">📅 ${snFmtDateShort(m.dataInicio)}</span>`);
    if (m.prazo) {
      let cls = 'date', lbl = '🏁 ' + snFmtDateShort(m.prazo);
      if      (m.feita)   { cls='ondone'; lbl='✓ '+snFmtDateShort(m.prazo); }
      else if (isLate)    { cls='late';   lbl='⚠ '+Math.abs(diff)+'d atrasada'; }
      else if (diff===0)  { cls='soon';   lbl='🔥 Vence hoje'; }
      else if (diff<=3)   { cls='soon';   lbl='⏰ '+diff+'d'; }
      chips.push(`<span class="hub-meta-chip ${cls}">${lbl}</span>`);
    }
    chips.push(`<span class="hub-meta-chip ${pColorMap[m.prioridade||'media']}">${pLblMap[m.prioridade||'media']}</span>`);
    return `<div class="hub-meta-item" style="animation-delay:${i*0.035}s">
      <button class="hub-meta-check ${checkCls}" onclick="hubToggleMeta(${m.id})" title="${m.feita?'Desmarcar':'Concluir'}">${m.feita?'✓':''}</button>
      <div class="hub-meta-body">
        <div class="hub-meta-name ${m.feita?'done':''}">${m.texto}</div>
        ${chips.length ? `<div class="hub-meta-chips">${chips.join('')}</div>` : ''}
      </div>
      <div class="hub-meta-side">
        <button class="hub-meta-side-btn" onclick="hubDelMeta(${m.id})" title="Remover">✕</button>
      </div>
    </div>`;
  }).join('');
}

function hubRenderTips(s) {
  const metas  = s.metas||[], total=metas.length;
  const done   = metas.filter(m=>m.feita).length;
  const late   = metas.filter(m=>snIsLate(m.prazo,m.feita)).length;
  const noDate = metas.filter(m=>!m.prazo&&!m.feita).length;
  const pct    = total>0?Math.round(done/total*100):0;
  const CG='rgba(200,169,110,.6)',CP='rgba(124,111,205,.6)',
        CT='rgba(94,196,168,.6)', CR='rgba(224,107,139,.6)',CB='rgba(74,176,232,.6)';
  const dyn=[];
  if(!s.img)      dyn.push({e:'🖼️',n:'Adicione uma imagem de capa',d:'Sonhos com imagem são visualmente mais poderosos. Abra "Editar" e faça upload de uma foto inspiradora.',t:'Visual',c:CG,p:9});
  if(!s.desc)     dyn.push({e:'📝',n:'Escreva seu "porquê"',d:'A motivação por trás de um sonho é mais forte que o próprio sonho. Descreva o que este objetivo significa para você.',t:'Clareza',c:CP,p:9});
  if(total===0)   dyn.push({e:'🎯',n:'Quebre em metas menores',d:'Adicione 3 a 7 metas concretas e mensuráveis. Cada pequena conquista gera momentum para a próxima.',t:'Planejamento',c:CT,p:8});
  if(late>0)      dyn.push({e:'⚠️',n:late+' meta'+(late>1?'s':'')+' atrasada'+(late>1?'s':''),d:'Revise os prazos ou divida em passos menores para voltar ao ritmo.',t:'Urgente',c:CR,p:10});
  if(noDate>0)    dyn.push({e:'📅',n:'Defina prazos para as metas',d:noDate+' meta'+(noDate>1?'s':'')+' sem prazo. Metas com data têm 2× mais chance de serem concluídas.',t:'Urgência',c:CG,p:7});
  if(!s.dataFim)  dyn.push({e:'🏁',n:'Defina um prazo final',d:'Sonhos sem data vivem no "algum dia". Escolha uma data e comprometa-se com você mesmo.',t:'Foco',c:CB,p:7});
  if(pct>=70&&pct<100) dyn.push({e:'🔥',n:'Quase lá! '+pct+'% concluído',d:'Você está na fase final — onde a maioria desiste. Revise o que falta e termine o que começou.',t:'Momentum',c:CT,p:9});
  if(pct===100&&total>0&&!s.realizado) dyn.push({e:'🎉',n:'100% das metas concluídas!',d:'Parabéns! Clique em "Marcar como realizado" e celebre esta conquista — você merece.',t:'Conquista',c:CT,p:10});
  if(total>=6&&!metas.find(m=>m.prioridade==='alta')) dyn.push({e:'🔴',n:'Defina prioridades claras',d:'Com '+total+' metas, marque as mais críticas como Alta para focar sua energia onde importa.',t:'Estratégia',c:CP,p:6});
  const fix=[
    {e:'🌙',n:'Revisão semanal de 10 min',d:'Todo domingo: revise metas, atualize progresso, defina o próximo passo. Consistência supera intensidade — sempre.',t:'Hábito',c:CG,p:5},
    {e:'✨',n:'Visualização ativa diária',d:'5 min pela manhã visualizando este sonho já realizado. Ativa o sistema de ativação reticular — seu cérebro começa a buscar oportunidades.',t:'Mentalidade',c:CP,p:4},
    {e:'🤝',n:'Declare seu sonho',d:'Compartilhar um objetivo com alguém de confiança aumenta em 65% a chance de realizá-lo. Tem alguém que pode te acompanhar?',t:'Accountability',c:CR,p:4},
    {e:'⚡',n:'Próxima ação em 2 minutos',d:'Qual a menor ação possível que você pode fazer hoje? Identifique agora — não amanhã.',t:'Ação imediata',c:CT,p:5},
    {e:'📊',n:'Retrospectiva mensal',d:'No último dia do mês: o que avançou, o que travou, o que muda. Ajuste o plano sem abandonar o sonho.',t:'Processo',c:CB,p:3},
    {e:'🆕',n:'Mais recursos chegando',d:'Notas diárias, gráfico de consistência, conquistas desbloqueáveis e integração com tarefas estão sendo desenvolvidos.',t:'Novidade',c:CP,p:1},
  ];
  const final=[...dyn,...fix].sort((a,b)=>b.p-a.p).slice(0,6);
  document.getElementById('hub-tips-grid').innerHTML=final.map(t=>
    `<div class="hub-tip-card" style="--tip-color:${t.c}">
      <div class="hub-tip-top">
        <div class="hub-tip-emoji">${t.e}</div>
        <span class="hub-tip-badge">${t.t}</span>
      </div>
      <div class="hub-tip-title">${t.n}</div>
      <div class="hub-tip-desc">${t.d}</div>
    </div>`
  ).join('');
}


// ── Meta actions ──────────────────────────────────────────────────────────
function hubToggleMetaForm() {
  const form = document.getElementById('hub-meta-form');
  const open = form.classList.toggle('open');
  if (open) {
    document.getElementById('hub-meta-texto').value   = '';
    document.getElementById('hub-meta-prazo').value   = '';
    document.getElementById('hub-meta-inicio').value  = '';
    document.getElementById('hub-meta-prioridade').value = 'media';
    setTimeout(() => document.getElementById('hub-meta-texto').focus(), 60);
  }
}

function hubAddMeta() {
  const texto = document.getElementById('hub-meta-texto').value.trim();
  if (!texto || !hubSonhoId) return;
  const s = S.sonhos.find(x => x.id === hubSonhoId);
  if (!s) return;
  if (!s.metas) s.metas = [];
  s.metas.push({
    id:         Date.now(),
    texto,
    feita:      false,
    prioridade: document.getElementById('hub-meta-prioridade').value,
    dataInicio: document.getElementById('hub-meta-inicio').value,
    prazo:      document.getElementById('hub-meta-prazo').value,
  });
  save();
  document.getElementById('hub-meta-form').classList.remove('open');
  hubRender(s);
  renderSonhos();
}

function hubToggleMeta(metaId) {
  const s = S.sonhos.find(x => x.id === hubSonhoId); if (!s) return;
  const m = (s.metas||[]).find(x => x.id === metaId); if (!m) return;
  m.feita = !m.feita;
  save(); hubRender(s); renderSonhos();
}

function hubDelMeta(metaId) {
  const s = S.sonhos.find(x => x.id === hubSonhoId); if (!s) return;
  s.metas = (s.metas||[]).filter(x => x.id !== metaId);
  save(); hubRender(s); renderSonhos();
}

function hubToggleRealizado() {
  const s = S.sonhos.find(x => x.id === hubSonhoId); if (!s) return;
  s.realizado = !s.realizado;
  if (s.realizado) addNotif('Sonho realizado! 🎉', '"'+s.titulo+'"', 'sonho');
  save(); hubRender(s); renderSonhos();
}

// ── Modal (criar/editar via card) — mantido para + Novo Sonho ─────────────
let snEditId   = null;
let snImgData  = '';
let snModalMetas = [];

function snOpenModal(editId) {
  editId = editId || null;
  snEditId  = editId; snImgData = ''; snModalMetas = [];
  const modal     = document.getElementById('sn-modal');
  const label     = document.getElementById('sn-modal-label');
  const delBtn    = document.getElementById('sn-del-btn');
  const coverZone = document.getElementById('sn-modal-cover-zone');
  const coverImg  = document.getElementById('sn-modal-cover-img');

  ['sn-m-titulo','sn-m-icon','sn-m-desc','sn-m-data-inicio','sn-m-data-fim']
    .forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('sn-m-horizonte').value = '1 ano';
  document.getElementById('sn-m-categoria').value = 'pessoal';
  coverZone.classList.remove('has-img'); coverImg.src='';
  document.getElementById('sn-img-input').value='';

  if (editId) {
    const s = S.sonhos.find(x => x.id === editId); if(!s) return;
    label.innerHTML = 'Editar <em>Sonho</em>';
    delBtn.style.display = 'block';
    document.getElementById('sn-m-titulo').value    = s.titulo    || '';
    document.getElementById('sn-m-icon').value      = s.icon      || '🌙';
    document.getElementById('sn-m-horizonte').value = s.horizonte || '1 ano';
    document.getElementById('sn-m-categoria').value = s.categoria || 'pessoal';
    document.getElementById('sn-m-desc').value      = s.desc      || '';
    const di=document.getElementById('sn-m-data-inicio'); if(di) di.value=s.dataInicio||'';
    const df=document.getElementById('sn-m-data-fim');    if(df) df.value=s.dataFim||'';
    snModalMetas = (s.metas||[]).map(m=>Object.assign({},m));
    if(s.img){ snImgData=s.img; coverImg.src=s.img; coverZone.classList.add('has-img'); }
  } else {
    label.innerHTML = 'Novo <em>Sonho</em>';
    delBtn.style.display = 'none';
  }
  snRenderModalMetas();
  modal.classList.add('open');
  setTimeout(()=>document.getElementById('sn-m-titulo').focus(),100);
}

function snCloseModal() { document.getElementById('sn-modal').classList.remove('open'); }
function snCloseModalOutside(e) { if(e.target.id==='sn-modal') snCloseModal(); }

function snHandleImg(e) {
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{
    const im=new Image();
    im.onload=()=>{
      const canvas=document.createElement('canvas');
      const maxW=640,maxH=360; let w=im.width,h=im.height;
      const ratio=w/h;
      if(ratio>maxW/maxH){w=maxW;h=Math.round(w/ratio);}else{h=maxH;w=Math.round(h*ratio);}
      canvas.width=w; canvas.height=h;
      canvas.getContext('2d').drawImage(im,0,0,w,h);
      snImgData=canvas.toDataURL('image/jpeg',.7);
      document.getElementById('sn-modal-cover-img').src=snImgData;
      document.getElementById('sn-modal-cover-zone').classList.add('has-img');
    };
    im.src=ev.target.result;
  };
  reader.readAsDataURL(file);
}

function snModalAddMeta() {
  const inp=document.getElementById('sn-m-nova-meta');
  const t=inp.value.trim(); if(!t) return;
  snModalMetas.push({id:Date.now(),texto:t,feita:false,prioridade:'media',dataInicio:'',prazo:''});
  inp.value=''; snRenderModalMetas();
}
function snModalToggleMeta(id){const m=snModalMetas.find(x=>x.id===id);if(m){m.feita=!m.feita;snRenderModalMetas();}}
function snModalDelMeta(id){snModalMetas=snModalMetas.filter(x=>x.id!==id);snRenderModalMetas();}
function snRenderModalMetas(){
  const list=document.getElementById('sn-modal-metas-list');if(!list)return;
  if(!snModalMetas.length){list.innerHTML='';return;}
  list.innerHTML=snModalMetas.map(m=>
    '<div class="sn-meta-item">'+
    '<button class="sn-meta-check '+(m.feita?'done':'')+'" onclick="snModalToggleMeta('+m.id+')">'+(m.feita?'✓':'')+'</button>'+
    '<span class="sn-meta-text '+(m.feita?'done':'')+'">'+m.texto+'</span>'+
    '<button class="sn-meta-del" onclick="snModalDelMeta('+m.id+')">✕</button>'+
    '</div>'
  ).join('');
}

function snSalvar() {
  const titulo=document.getElementById('sn-m-titulo').value.trim();
  if(!titulo){document.getElementById('sn-m-titulo').focus();return;}
  const di=document.getElementById('sn-m-data-inicio');
  const df=document.getElementById('sn-m-data-fim');
  const item={
    id:snEditId||Date.now(), titulo,
    icon:document.getElementById('sn-m-icon').value.trim()||'🌙',
    horizonte:document.getElementById('sn-m-horizonte').value,
    categoria:document.getElementById('sn-m-categoria').value,
    desc:document.getElementById('sn-m-desc').value.trim(),
    dataInicio:di?di.value:'', dataFim:df?df.value:'',
    img:snImgData,
    metas:snModalMetas.map(m=>Object.assign({},m)),
    realizado:snEditId?(S.sonhos.find(x=>x.id===snEditId)||{}).realizado||false:false,
  };
  if(snEditId){const idx=S.sonhos.findIndex(x=>x.id===snEditId);if(idx>=0)S.sonhos[idx]=item;else S.sonhos.push(item);}
  else{S.sonhos.push(item);addNotif('Sonho adicionado','"'+titulo+'"','sonho');}
  save(); renderSonhos(); snCloseModal();
  if(hubSonhoId===item.id) hubRender(item);
}

function snDeletar(){
  if(!snEditId)return;
  const s=S.sonhos.find(x=>x.id===snEditId);
  if(!confirm('Excluir "'+(s?s.titulo:'este sonho')+'"?'))return;
  S.sonhos=S.sonhos.filter(x=>x.id!==snEditId);
  save();renderSonhos();snCloseModal();
  if(hubSonhoId===snEditId)snHubClose();
}

function snToggleRealizado(id,e){
  e.stopPropagation();
  const s=S.sonhos.find(x=>x.id===id);if(!s)return;
  s.realizado=!s.realizado;
  if(s.realizado)addNotif('Sonho realizado! 🎉','"'+s.titulo+'"','sonho');
  save();snMigrateData();renderSonhos();
}
function snToggleMeta(sonhoId,metaId,e){
  e.stopPropagation();
  const s=S.sonhos.find(x=>x.id===sonhoId);if(!s)return;
  const m=(s.metas||[]).find(x=>x.id===metaId);if(!m)return;
  m.feita=!m.feita;save();renderSonhos();
}

// ── Render cards ──────────────────────────────────────────────────────────
function renderSonhos() {
  snMigrateData();
  const grid=document.getElementById('sonhos-grid');if(!grid)return;
  const total    =S.sonhos.length;
  const feitos   =S.sonhos.filter(s=>s.realizado).length;
  const allMetas =S.sonhos.reduce((a,s)=>a+(s.metas||[]).length,0);
  const doneMetas=S.sonhos.reduce((a,s)=>a+(s.metas||[]).filter(m=>m.feita).length,0);
  const pctGeral =allMetas>0?Math.round(doneMetas/allMetas*100):0;
  const setEl=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  setEl('sn-stat-total',total);setEl('sn-stat-feitos',feitos);
  setEl('sn-stat-metas',doneMetas+' / '+allMetas);setEl('sn-stat-pct',pctGeral+'%');

  if(!total){
    grid.innerHTML='<div class="empty" style="grid-column:span 3"><div class="empty-icon">🌙</div>Adicione seu primeiro sonho!</div>';
    return;
  }

  grid.innerHTML=S.sonhos.map(s=>{
    const metas=s.metas||[];
    const totalM=metas.length,doneM=metas.filter(m=>m.feita).length;
    const pct=totalM>0?Math.round(doneM/totalM*100):0;
    const catColor=SN_CAT_COLORS[s.categoria]||'var(--accent2)';
    const isReal=s.realizado;
    const metaRows=metas.slice(0,3).map(m=>
      '<div class="sn-meta-item">'+
      '<button class="sn-meta-check '+(m.feita?'done':'')+'" onclick="snToggleMeta('+s.id+','+m.id+',event)">'+(m.feita?'✓':'')+'</button>'+
      '<span class="sn-meta-text '+(m.feita?'done':'')+'">'+m.texto+'</span>'+
      '</div>'
    ).join('');
    const moreLabel=totalM>3?'<div style="font-size:10px;font-family:var(--font-mono);color:var(--muted);padding:3px 0 0 24px">+'+(totalM-3)+' mais…</div>':'';
    return '<div class="sn-card '+(isReal?'realizado':'')+'" onclick="snOpenHub('+s.id+')">'+
      '<div class="sn-cover '+(s.img?'has-img':'')+'" style="border-bottom:2px solid '+catColor+'22">'+
        (s.img?'<img class="sn-cover-img" src="'+s.img+'" alt="">':'')+
        '<div class="sn-cover-placeholder"><div class="sn-cover-placeholder-icon">'+(s.icon||'🌙')+'</div><div class="sn-cover-placeholder-label">Sem imagem</div></div>'+
        '<div class="sn-cover-overlay" style="background:linear-gradient(180deg,rgba(0,0,0,.05) 0%,'+(isReal?'rgba(10,30,24,.93)':'rgba(12,11,26,.93)')+' 100%)"></div>'+
        '<span class="sn-horizonte-badge">⏳ '+(s.horizonte||'—')+'</span>'+
        (isReal?'<span class="sn-realizado-badge">✓ Realizado</span>':'')+
      '</div>'+
      '<div class="sn-body">'+
        '<div class="sn-top">'+
          '<div class="sn-titulo">'+s.titulo+'</div>'+
          '<div class="sn-actions" onclick="event.stopPropagation()">'+
            '<button class="sn-action-btn done-btn" onclick="snToggleRealizado('+s.id+',event)" title="'+(isReal?'Pendente':'Realizado')+'">'+(isReal?'✅':'○')+'</button>'+
          '</div>'+
        '</div>'+
        (s.desc?'<div class="sn-desc">'+s.desc+'</div>':'')+
        (totalM>0?
          '<div class="sn-metas-section">'+
            '<div class="sn-metas-header"><span class="sn-metas-label">Metas</span><span class="sn-metas-pct">'+pct+'%</span></div>'+
            '<div class="sn-progress-bar"><div class="sn-progress-fill" style="width:'+pct+'%"></div></div>'+
            metaRows+moreLabel+
          '</div>'
        :'<div style="font-size:11px;font-family:var(--font-mono);color:rgba(122,117,144,.35);letter-spacing:.5px;margin-top:4px">Clique para ver detalhes</div>')+
      '</div>'+
      '<div class="sn-footer">'+
        '<span class="sn-footer-horizonte">'+(s.icon||'🌙')+' '+(s.horizonte||'—')+'</span>'+
        (totalM>0?'<span class="sn-footer-metas-count">'+doneM+'/'+totalM+'</span>':'')+
      '</div>'+
    '</div>';
  }).join('');
}

(function initSonhosPage() {
  const app = getAppState();
  if (app && app.data) {
    app.data.lastVisitedPage = "sonhos";
    app.data.lastVisitedAt = new Date().toISOString();
    saveAppState(app);
  }

  load();
  renderSonhos();

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      snCloseModal();
      hubDrawerClose();
    }
  });
}());

Object.assign(globalThis, {
  snOpenModal: snOpenModal,
  snCloseModal: snCloseModal,
  snCloseModalOutside: snCloseModalOutside,
  snHandleImg: snHandleImg,
  snModalAddMeta: snModalAddMeta,
  snModalToggleMeta: snModalToggleMeta,
  snModalDelMeta: snModalDelMeta,
  snSalvar: snSalvar,
  snDeletar: snDeletar,
  snOpenHub: snOpenHub,
  snHubClose: snHubClose,
  snToggleRealizado: snToggleRealizado,
  snToggleMeta: snToggleMeta,
  hubDrawerOpen: hubDrawerOpen,
  hubDrawerClose: hubDrawerClose,
  hubDrawerRemoveImg: hubDrawerRemoveImg,
  hubDrawerHandleImg: hubDrawerHandleImg,
  hubDrawerSalvar: hubDrawerSalvar,
  hubDrawerDeletar: hubDrawerDeletar,
  hubToggleMetaForm: hubToggleMetaForm,
  hubAddMeta: hubAddMeta,
  hubToggleMeta: hubToggleMeta,
  hubDelMeta: hubDelMeta,
  hubToggleRealizado: hubToggleRealizado
});



