"use strict";

var appState = null;
var S = {};

function ensureState() {
  if (appState && typeof appState === "object") {
    return appState;
  }
  if (window.SoterStorage && window.SoterStorage.getState) {
    appState = window.SoterStorage.getState();
  }
  if (!appState || typeof appState !== "object") {
    appState = { profile: { name: "Usuário", avatar: "" }, data: {} };
  }
  if (!appState.profile || typeof appState.profile !== "object") appState.profile = { name: "Usuário", avatar: "" };
  if (!appState.data || typeof appState.data !== "object") appState.data = {};
  if (!Array.isArray(appState.data.tasks)) appState.data.tasks = [];
  return appState;
}

Object.defineProperty(S, "tasks", {
  get: function () {
    ensureState();
    return appState.data.tasks;
  },
  set: function (value) {
    ensureState();
    appState.data.tasks = Array.isArray(value) ? value : [];
  }
});

function touchPageMeta() {
  ensureState();
  appState.data.lastVisitedPage = "tarefas";
  appState.data.lastVisitedAt = new Date().toISOString();
}

function save() {
  touchPageMeta();
  if (window.SoterStorage && window.SoterStorage.save) {
    window.SoterStorage.save(appState);
  }
}

function load() {
  appState = null;
  ensureState();
  touchPageMeta();
  save();
}

const TK_COLORS = [
  '#c8a96e','#7c6fcd','#5ec4a8','#e06b8b','#e8864a',
  '#4ab0e8','#b06be8','#e8d44a'
];
const TK_PRIOR_COLOR  = { alta:'#e06b8b', media:'#c8a96e', baixa:'#5ec4a8' };
const TK_PRIOR_LABEL  = { alta:'🔴 Alta', media:'🟡 Média', baixa:'🟢 Baixa' };
const TK_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const TK_MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ── Helpers ──────────────────────────────────────────────────────────
function tkToday() { return new Date().toISOString().slice(0,10); }
function tkFmtDate(ds) {
  if (!ds) return '—';
  const [y,m,d] = ds.split('-');
  return `${d}/${m}/${y}`;
}
function tkFmtDateLong(ds) {
  if (!ds) return '';
  const d = new Date(ds + 'T00:00:00');
  return d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
}
function tkDaysFromNow(ds) {
  const d = new Date(ds + 'T00:00:00'), n = new Date(); n.setHours(0,0,0,0);
  return Math.round((d - n) / 86400000);
}

// ── Migrar dados antigos ─────────────────────────────────────────────
function tkMigrate() {
  S.tasks = (S.tasks || []).map(t => {
    if (!t.subtarefas) t.subtarefas = [];
    if (!t.data) t.data = tkToday();
    if (!t.cor)  t.cor  = TK_COLORS[0];
    if (!t.nota) t.nota = '';
    if (!t.hora) t.hora = '';
    return t;
  });
}

// ── KPIs ────────────────────────────────────────────────────────────
function renderTasks() {
  tkMigrate();
  const tk    = S.tasks;
  const today = tkToday();
  const done  = tk.filter(x => x.done).length;
  const pct   = tk.length ? Math.round(done / tk.length * 100) : 0;
  const g = id => document.getElementById(id);
  if (g('tk-total')) g('tk-total').textContent = tk.length;
  if (g('tk-pend'))  g('tk-pend').textContent  = tk.filter(x=>!x.done).length;
  if (g('tk-done'))  g('tk-done').textContent  = done;
  if (g('tk-pct'))   g('tk-pct').textContent   = pct + '%';
  // Contadores das abas
  const counts = {
    pendentes:  tk.filter(t => !t.done && t.data && tkDaysFromNow(t.data) >= 0).length,
    hoje:       tk.filter(t => t.data === today).length,
    vencidas:   tk.filter(t => !t.done && t.data && tkDaysFromNow(t.data) < 0).length,
    'sem-data': tk.filter(t => !t.data || t.data === '').length,
    concluidas: tk.filter(t => t.done).length,
    todas:      tk.length,
  };
  Object.entries(counts).forEach(([tab, n]) => {
    const el = g('tktc-' + tab);
    if (el) el.textContent = n > 0 ? n : '';
  });
  tkRenderFocus();
  tkRenderList();
  tkCalRender();
}

// ══════════════════════════════════════════════════════════════════════
// FOCO DE HOJE
// ══════════════════════════════════════════════════════════════════════
function tkRenderFocus() {
  const today   = tkToday();
  const tasks   = S.tasks.filter(t => t.data === today)
                         .sort((a,b) => {
                           if (a.done !== b.done) return a.done ? 1 : -1;
                           return (a.hora||'99:99').localeCompare(b.hora||'99:99');
                         });
  const listEl  = document.getElementById('tk-focus-list');
  const subEl   = document.getElementById('tk-focus-sub');
  if (!listEl) return;

  const pending = tasks.filter(t => !t.done).length;
  const total   = tasks.length;
  if (subEl) {
    if (!total) subEl.textContent = 'Nenhuma tarefa hoje — aproveite! 🎉';
    else subEl.textContent = `${pending} pendente${pending!==1?'s':''} · ${total-pending} concluída${(total-pending)!==1?'s':''} hoje`;
  }

  if (!tasks.length) {
    listEl.innerHTML = '<div class="tk-focus-empty">Nenhuma tarefa para hoje 🎉 <br><small style="opacity:.5">Use o botão acima para adicionar.</small></div>';
    return;
  }

  listEl.innerHTML = tasks.map(t => {
    const color = t.cor || TK_PRIOR_COLOR[t.prior] || '#c8a96e';
    const subs  = t.subtarefas || [];
    const sDone = subs.filter(s=>s.done).length;
    const sPct  = subs.length ? Math.round(sDone/subs.length*100) : (t.done?100:0);
    return `<div class="tk-focus-card ${t.done?'done-card':''}" style="--tk-color:${color}"
        onclick="taskHubOpen(${t.id})">
      <div class="tk-focus-card-top">
        <div class="tk-focus-card-check ${t.done?'checked':''}"
          onclick="event.stopPropagation();tkQuickToggle(${t.id})">
          ${t.done?'✓':''}
        </div>
        <div class="tk-focus-card-nome">${t.nome}</div>
      </div>
      <div class="tk-focus-card-meta">
        ${t.hora ? `<span class="tk-focus-card-hora">🕐 ${t.hora}</span>` : ''}
        <span class="tk-focus-card-pill">${TK_PRIOR_LABEL[t.prior]||'—'}</span>
        ${t.cat ? `<span class="tk-focus-card-pill" style="background:rgba(255,255,255,.06);color:var(--muted);border-color:rgba(255,255,255,.1)">${t.cat}</span>` : ''}
      </div>
      ${subs.length>0||t.done ? `<div class="tk-focus-card-prog">
        <div class="tk-focus-card-prog-fill" style="width:${sPct}%"></div>
      </div>` : ''}
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════════════
// LISTA COM ABAS
// ══════════════════════════════════════════════════════════════════════
let tkListTab = 'pendentes';

function tkListSetTab(tab) {
  tkListTab = tab;
  document.querySelectorAll('.tk-list-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  tkRenderList();
}

function tkRenderList() {
  const today  = tkToday();
  const all    = S.tasks;
  let items;
  switch (tkListTab) {
    case 'pendentes':  items = all.filter(t => !t.done && t.data && tkDaysFromNow(t.data) >= 0); break;
    case 'hoje':       items = all.filter(t => t.data === today); break;
    case 'vencidas':   items = all.filter(t => !t.done && t.data && tkDaysFromNow(t.data) < 0); break;
    case 'sem-data':   items = all.filter(t => !t.data || t.data === ''); break;
    case 'concluidas': items = all.filter(t => t.done); break;
    default:           items = [...all];
  }
  // sort: vencidas por data asc, resto por data asc depois done
  items.sort((a,b) => {
    if (tkListTab === 'todas') {
      if (a.done !== b.done) return a.done ? 1 : -1;
    }
    if (a.data && b.data) return a.data.localeCompare(b.data);
    if (a.data) return -1;
    if (b.data) return 1;
    return 0;
  });

  const grid  = document.getElementById('tk-list-grid');
  const count = document.getElementById('tk-list-count');
  if (!grid) return;
  if (count) count.textContent = `${items.length} tarefa${items.length!==1?'s':''}`;

  if (!items.length) {
    const msgs = {
      pendentes:'Nenhuma tarefa pendente! 🎉',hoje:'Nenhuma tarefa para hoje.',
      vencidas:'Nenhuma tarefa vencida! ✅',
      'sem-data':'Todas as tarefas têm data definida.',
      concluidas:'Nenhuma tarefa concluída ainda.',todas:'Nenhuma tarefa cadastrada.'
    };
    grid.innerHTML = `<div class="tk-list-empty">
      <div class="tk-list-empty-icon">${tkListTab==='vencidas'?'✅':tkListTab==='concluidas'?'🏆':'📋'}</div>
      ${msgs[tkListTab]||'Nenhuma tarefa.'}
    </div>`;
    return;
  }

  grid.innerHTML = items.map(t => {
    const color  = t.cor || TK_PRIOR_COLOR[t.prior] || '#c8a96e';
    const pColor = TK_PRIOR_COLOR[t.prior] || color;
    const subs   = t.subtarefas || [];
    const sDone  = subs.filter(s=>s.done).length;
    const sPct   = subs.length ? Math.round(sDone/subs.length*100) : (t.done?100:0);
    const diff   = t.data ? tkDaysFromNow(t.data) : null;
    const dateCls = diff===null?'': diff<0&&!t.done?'late': diff===0?'today-date':'';
    const dateLbl = diff===null?'Sem data': diff===0?'Hoje': diff===1?'Amanhã': diff===-1?'Ontem':
                    diff<0?`${Math.abs(diff)}d atrás`:`em ${diff}d`;
    return `<div class="tk-task-card ${t.done?'done-card':''}" style="--tk-color:${color}"
        onclick="taskHubOpen(${t.id})">
      <div class="tk-task-card-top">
        <div class="tk-task-card-check ${t.done?'checked':''}"
          onclick="event.stopPropagation();tkQuickToggle(${t.id})">
          ${t.done?'✓':''}
        </div>
        <div class="tk-task-card-nome">${t.nome}</div>
      </div>
      ${t.nota ? `<div class="tk-task-card-nota">${t.nota}</div>` : ''}
      <div class="tk-task-card-footer">
        <span class="tk-task-card-pill" style="background:${pColor}1a;color:${pColor};border:1px solid ${pColor}33">
          ${TK_PRIOR_LABEL[t.prior]||'—'}
        </span>
        ${t.cat ? `<span class="tk-task-card-pill" style="background:rgba(255,255,255,.05);color:var(--muted);border:1px solid rgba(255,255,255,.08)">${t.cat}</span>` : ''}
        <span class="tk-task-card-date ${dateCls}">${dateLbl}</span>
      </div>
      ${subs.length>0 ? `<div class="tk-task-card-sub-prog">
        <div class="tk-task-card-sub-track">
          <div class="tk-task-card-sub-fill" style="width:${sPct}%"></div>
        </div>
        <span class="tk-task-card-sub-lbl">${sDone}/${subs.length}</span>
      </div>` : ''}
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════════════
// CALENDÁRIO FULL-WIDTH COM MINI-CARDS
// ══════════════════════════════════════════════════════════════════════
const tkCalState = { year: new Date().getFullYear(), month: new Date().getMonth(), selected: tkToday() };

function tkCalPrev() { tkCalState.month--; if (tkCalState.month<0){tkCalState.month=11;tkCalState.year--;} tkCalRender(); }
function tkCalNext() { tkCalState.month++; if (tkCalState.month>11){tkCalState.month=0;tkCalState.year++;} tkCalRender(); }
function tkCalGoToday() {
  const n=new Date(); tkCalState.year=n.getFullYear(); tkCalState.month=n.getMonth(); tkCalState.selected=tkToday();
  tkCalRender();
}

function tkCalRender() {
  const titleEl = document.getElementById('tk-cal-title');
  if (titleEl) titleEl.textContent = TK_MONTHS[tkCalState.month]+' '+tkCalState.year;

  const { year, month, selected } = tkCalState;
  const today     = tkToday();
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMo  = new Date(year, month+1, 0).getDate();
  const daysInPrev= new Date(year, month, 0).getDate();
  const MAX_CARDS = 3; // mini-cards por célula antes do "+N mais"

  // index tasks by day
  const byDay = {};
  S.tasks.forEach(t => {
    if (!t.data) return;
    const [ty,tm,td] = t.data.split('-').map(Number);
    if (ty===year && tm===month+1) { if(!byDay[td])byDay[td]=[]; byDay[td].push(t); }
  });

  const grid  = document.getElementById('tk-cal-days');
  if (!grid) return;
  const cells = [];

  // dias do mês anterior (placeholder)
  for (let i=firstDay-1;i>=0;i--) {
    cells.push(`<div class="tk-day other-month"><span class="tk-day-num">${daysInPrev-i}</span></div>`);
  }

  // dias do mês atual
  for (let d=1;d<=daysInMo;d++) {
    const ds  = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const tks = byDay[d] || [];
    const isToday = ds===today, isSel = ds===selected;
    const cls = ['tk-day', isToday?'today':'', isSel?'selected':''].filter(Boolean).join(' ');

    // sort: pendentes antes, depois por hora
    const sorted = [...tks].sort((a,b)=>{
      if(a.done!==b.done) return a.done?1:-1;
      return (a.hora||'99:99').localeCompare(b.hora||'99:99');
    });
    const visible = sorted.slice(0,MAX_CARDS);
    const extra   = sorted.length - MAX_CARDS;

    const miniCards = visible.map(t => {
      const col = t.cor || TK_PRIOR_COLOR[t.prior] || '#c8a96e';
      return `<div class="tk-cal-task-card ${t.done?'done-mini':''}"
          style="--tk-color:${col}"
          onclick="event.stopPropagation();taskHubOpen(${t.id})"
          title="${t.nome}">
        ${t.hora?`<span style="opacity:.6;margin-right:3px">${t.hora}</span>`:''}${t.nome}
      </div>`;
    }).join('');
    const moreTag = extra>0 ? `<div class="tk-cal-more">+${extra} mais</div>` : '';

    cells.push(`<div class="${cls}"
        onclick="tkCalSelectDay('${ds}')"
        ondblclick="tkModalOpenForDate('${ds}')"
        title="Clique para selecionar · Duplo clique para adicionar tarefa">
      <span class="tk-day-num">${d}</span>
      ${miniCards}${moreTag}
    </div>`);
  }

  // completar última linha
  const rem = cells.length%7===0 ? 0 : 7-(cells.length%7);
  for (let d=1;d<=rem;d++) cells.push(`<div class="tk-day other-month"><span class="tk-day-num">${d}</span></div>`);

  grid.innerHTML = cells.join('');
}

function tkCalSelectDay(ds) {
  tkCalState.selected = ds;
  tkCalRender();
  // Double-click abre modal; single click só seleciona e scroll
  const listEl = document.getElementById('tk-list-section') || document.querySelector('.tk-list-section');
  if (listEl) listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ══════════════════════════════════════════════════════════════════════
// ANALYTICS DE TAREFAS
// ══════════════════════════════════════════════════════════════════════
function tkOpenAnalytics() {
  const el = document.getElementById('tk-analytics');
  if (!el) return;
  tkRenderAnalytics();
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function tkCloseAnalytics() {
  document.getElementById('tk-analytics').classList.remove('open');
  document.body.style.overflow = '';
}

function tkRenderAnalytics() {
  const el = document.getElementById('tk-analytics');
  if (!el) return;
  tkMigrate();
  const tasks  = S.tasks;
  const today  = tkToday();
  const total  = tasks.length;
  const done   = tasks.filter(t => t.done).length;
  const pend   = total - done;
  const pct    = total ? Math.round(done / total * 100) : 0;
  const venc   = tasks.filter(t => !t.done && t.data && tkDaysFromNow(t.data) < 0).length;
  const hoje   = tasks.filter(t => t.data === today).length;
  const hojeD  = tasks.filter(t => t.data === today && t.done).length;
  const semData= tasks.filter(t => !t.data).length;
  const subTotal = tasks.reduce((a,t) => a + (t.subtarefas||[]).length, 0);
  const subDone  = tasks.reduce((a,t) => a + (t.subtarefas||[]).filter(s=>s.done).length, 0);

  // ── Agrupamentos ─────────────────────────────────────────────────
  const byCat   = {}, byPrior = {alta:0,media:0,baixa:0};
  const byCatD  = {}, byColor = {};
  tasks.forEach(t => {
    const cat = t.cat || 'Outros';
    byCat[cat]  = (byCat[cat]  || 0) + 1;
    byCatD[cat] = (byCatD[cat] || 0) + (t.done ? 1 : 0);
    if (byPrior[t.prior] !== undefined) byPrior[t.prior]++;
    const col = t.cor || '#c8a96e';
    byColor[col] = (byColor[col] || 0) + 1;
  });

  // ── Atividade mensal (6 meses) ────────────────────────────────────
  const monthly = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    monthly[key] = { label: TK_MONTHS_SHORT[d.getMonth()], done:0, total:0 };
  }
  tasks.forEach(t => {
    if (!t.data) return;
    const key = t.data.slice(0,7);
    if (monthly[key]) { monthly[key].total++; if (t.done) monthly[key].done++; }
  });
  const maxMonth = Math.max(1, ...Object.values(monthly).map(m => m.total));

  // ── Donut por categoria ───────────────────────────────────────────
  const cats = Object.entries(byCat).sort((a,b) => b[1] - a[1]);
  const catColors = ['#c8a96e','#7c6fcd','#5ec4a8','#e06b8b','#e8864a','#4ab0e8','#b06be8'];
  const totalCats = cats.reduce((s,[,v]) => s + v, 0);
  let cumAngle = -90;
  const donutPaths = cats.map(([name, count], i) => {
    const angle = (count / Math.max(1, totalCats)) * 360;
    const color = catColors[i % catColors.length];
    const r = 44, cx = 65, cy = 65;
    const sA = cumAngle * Math.PI/180, eA = (cumAngle+angle) * Math.PI/180;
    const x1=cx+r*Math.cos(sA), y1=cy+r*Math.sin(sA);
    const x2=cx+r*Math.cos(eA), y2=cy+r*Math.sin(eA);
    const path = `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${angle>180?1:0},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${color}" opacity=".88"/>`;
    cumAngle += angle;
    return path;
  }).join('');

  // ── Taxa de conclusão por prioridade ──────────────────────────────
  const priorRate = ['alta','media','baixa'].map(k => {
    const tot = tasks.filter(t => t.prior === k).length;
    const dn  = tasks.filter(t => t.prior === k && t.done).length;
    return { k, tot, dn, pct: tot ? Math.round(dn/tot*100) : 0 };
  });

  // ── Top tarefas com mais subtarefas ──────────────────────────────
  const topSub = [...tasks]
    .filter(t => (t.subtarefas||[]).length > 0)
    .sort((a,b) => (b.subtarefas||[]).length - (a.subtarefas||[]).length)
    .slice(0,5);

  // ── Próximas (não vencidas, não concluídas) ───────────────────────
  const proximas = [...tasks]
    .filter(t => !t.done && t.data && tkDaysFromNow(t.data) >= 0)
    .sort((a,b) => a.data.localeCompare(b.data))
    .slice(0,5);

  // ── Score de saúde ────────────────────────────────────────────────
  let healthScore = 0;
  if (pct >= 50) healthScore += 25;
  if (venc === 0) healthScore += 25;
  if (tasks.filter(t => t.nota).length / Math.max(1,total) > 0.5) healthScore += 15;
  if (tasks.filter(t => (t.subtarefas||[]).length > 0).length / Math.max(1,total) > 0.3) healthScore += 15;
  if (tasks.filter(t => t.data).length / Math.max(1,total) > 0.7) healthScore += 20;
  const healthLabel = healthScore >= 80 ? 'Excelente' : healthScore >= 60 ? 'Bom' : healthScore >= 40 ? 'Regular' : 'Atenção';
  const healthColor = healthScore >= 80 ? '#5ec4a8' : healthScore >= 60 ? '#c8a96e' : healthScore >= 40 ? '#e8864a' : '#e06b8b';
  const ringC = 2 * Math.PI * 32;

  el.innerHTML = `
    <div class="san-header">
      <button class="san-back-btn" onclick="tkCloseAnalytics()">← Planejamento</button>
      <div>
        <div class="san-header-title">Analytics de <em>Tarefas</em></div>
        <div class="san-header-sub">Visão completa do seu planejamento pessoal</div>
      </div>
    </div>
    <div class="san-body">

      <!-- KPIs -->
      <div class="san-kpi-row">
        <div class="san-kpi" style="--kpi-color:#c8a96e">
          <div class="san-kpi-icon">📋</div><div class="san-kpi-val">${total}</div>
          <div class="san-kpi-lbl">Total de tarefas</div>
        </div>
        <div class="san-kpi" style="--kpi-color:#e8864a">
          <div class="san-kpi-icon">⏳</div><div class="san-kpi-val">${pend}</div>
          <div class="san-kpi-lbl">Pendentes</div>
        </div>
        <div class="san-kpi" style="--kpi-color:#5ec4a8">
          <div class="san-kpi-icon">✅</div><div class="san-kpi-val">${done}</div>
          <div class="san-kpi-lbl">Concluídas</div>
          <div class="san-kpi-sub">${pct}% do total</div>
        </div>
        <div class="san-kpi" style="--kpi-color:#e06b8b">
          <div class="san-kpi-icon">⚡</div><div class="san-kpi-val">${venc}</div>
          <div class="san-kpi-lbl">Vencidas</div>
        </div>
        <div class="san-kpi" style="--kpi-color:#4ab0e8">
          <div class="san-kpi-icon">📅</div><div class="san-kpi-val">${hoje}</div>
          <div class="san-kpi-lbl">Para hoje</div>
          <div class="san-kpi-sub">${hojeD} concluídas</div>
        </div>
      </div>

      <!-- Row 1: Atividade mensal + Donut categoria -->
      <div class="san-charts-row">
        <div class="san-card" style="flex:2">
          <div class="san-card-title"><span class="san-card-title-icon">📈</span>Atividade mensal — últimos 6 meses</div>
          <div class="san-bar-chart">
            ${Object.values(monthly).map(m => {
              const pTot  = Math.round(m.total / maxMonth * 100);
              const pDone = m.total > 0 ? Math.round(m.done / m.total * 100) : 0;
              return `<div class="san-bar-item">
                <div class="san-bar-label">${m.label}</div>
                <div class="san-bar-track" style="position:relative">
                  <div class="san-bar-fill" style="background:rgba(124,111,205,.2);width:0" data-w="${pTot}"></div>
                  <div class="san-bar-fill" style="position:absolute;top:0;left:0;height:100%;border-radius:6px;background:var(--accent3);width:0;transition:width 1.1s .1s cubic-bezier(.22,1,.36,1)" data-w="${Math.round(m.done/maxMonth*100)}"></div>
                </div>
                <div class="san-bar-val">${m.total}</div>
              </div>`;
            }).join('')}
          </div>
          <div style="display:flex;gap:16px;margin-top:12px">
            <div style="display:flex;align-items:center;gap:6px;font-size:10px;font-family:var(--font-mono);color:var(--muted)">
              <div style="width:10px;height:10px;border-radius:3px;background:rgba(124,111,205,.2)"></div>Total
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:10px;font-family:var(--font-mono);color:var(--muted)">
              <div style="width:10px;height:10px;border-radius:3px;background:var(--accent3)"></div>Concluídas
            </div>
          </div>
        </div>
        <div class="san-card" style="flex:1">
          <div class="san-card-title"><span class="san-card-title-icon">🎯</span>Por categoria</div>
          <div class="san-donut-wrap">
            <svg class="san-donut-svg" viewBox="0 0 130 130">
              ${donutPaths}
              <circle cx="65" cy="65" r="28" fill="#05040f"/>
              <text x="65" y="61" text-anchor="middle" fill="var(--text)" font-family="var(--font-display)" font-size="16" font-weight="700">${total}</text>
              <text x="65" y="75" text-anchor="middle" fill="var(--muted)" font-family="var(--font-mono)" font-size="7">tarefas</text>
            </svg>
            <div class="san-donut-legend">
              ${cats.slice(0,6).map(([name,count],i) => {
                const rate = byCatD[name] ? Math.round(byCatD[name]/count*100) : 0;
                return `<div class="san-legend-item">
                  <div class="san-legend-dot" style="background:${catColors[i%catColors.length]}"></div>
                  <span class="san-legend-lbl">${name}</span>
                  <span class="san-legend-val">${count} <span style="opacity:.5;font-size:9px">${rate}%✓</span></span>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Row 2: Prioridade + Score saúde + Próximas -->
      <div class="san-charts-row-3">
        <div class="san-card">
          <div class="san-card-title"><span class="san-card-title-icon">🔴</span>Taxa por prioridade</div>
          <div class="san-bar-chart" style="gap:12px">
            ${priorRate.map(({k,tot,dn,pct:p}) => {
              const col = TK_PRIOR_COLOR[k];
              const lbl = {alta:'🔴 Alta',media:'🟡 Média',baixa:'🟢 Baixa'}[k];
              return `<div class="san-bar-item">
                <div class="san-bar-label">${lbl}</div>
                <div class="san-bar-track">
                  <div class="san-bar-fill" data-w="${p}" style="background:${col};width:0"></div>
                </div>
                <div class="san-bar-val">${dn}/${tot}</div>
              </div>`;
            }).join('')}
          </div>
          <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;justify-content:space-between;font-size:11px;font-family:var(--font-mono)">
              <span style="color:var(--muted)">Subtarefas totais</span>
              <span style="color:var(--text);font-weight:700">${subTotal}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;font-family:var(--font-mono)">
              <span style="color:var(--muted)">Subtarefas concluídas</span>
              <span style="color:var(--accent3);font-weight:700">${subDone}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;font-family:var(--font-mono)">
              <span style="color:var(--muted)">Sem data definida</span>
              <span style="color:var(--accent5);font-weight:700">${semData}</span>
            </div>
          </div>
        </div>

        <div class="san-card">
          <div class="san-card-title"><span class="san-card-title-icon">💚</span>Score de saúde</div>
          <div class="san-health-ring-wrap">
            <svg width="120" height="120" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="8"/>
              <circle cx="40" cy="40" r="32" fill="none" stroke="${healthColor}" stroke-width="8"
                stroke-dasharray="${ringC.toFixed(2)}"
                stroke-dashoffset="${(ringC*(1-healthScore/100)).toFixed(2)}"
                transform="rotate(-90 40 40)" stroke-linecap="round"
                style="transition:stroke-dashoffset 1.4s cubic-bezier(.22,1,.36,1)"/>
              <text x="40" y="37" text-anchor="middle" fill="${healthColor}" font-family="var(--font-display)" font-size="16" font-weight="700">${healthScore}</text>
              <text x="40" y="50" text-anchor="middle" fill="var(--muted)" font-family="var(--font-mono)" font-size="7">/100</text>
            </svg>
            <div class="san-score-lbl" style="color:${healthColor}">${healthLabel}</div>
          </div>
          <div class="san-health-factors">
            ${[
              ['Taxa conclusão ≥50%',   pct>=50,    pct+'%'],
              ['Sem tarefas vencidas',  venc===0,   venc===0?'✓':''+venc+' venc.'],
              ['>50% com detalhes',     tasks.filter(t=>t.nota).length/Math.max(1,total)>0.5, Math.round(tasks.filter(t=>t.nota).length/Math.max(1,total)*100)+'%'],
              ['>30% com subtarefas',   tasks.filter(t=>(t.subtarefas||[]).length>0).length/Math.max(1,total)>0.3, Math.round(tasks.filter(t=>(t.subtarefas||[]).length>0).length/Math.max(1,total)*100)+'%'],
              ['>70% com data',         tasks.filter(t=>t.data).length/Math.max(1,total)>0.7, Math.round(tasks.filter(t=>t.data).length/Math.max(1,total)*100)+'%'],
            ].map(([lbl,ok,val]) => `
              <div class="san-health-factor">
                <div class="san-health-factor-row">
                  <span class="san-health-factor-lbl">${lbl}</span>
                  <span class="san-health-factor-val" style="color:${ok?'var(--accent3)':'var(--accent4)'}">${val}</span>
                </div>
                <div class="san-health-bar">
                  <div class="san-health-fill" style="background:${ok?'var(--accent3)':'var(--accent4)'};width:${ok?'100':'30'}%"></div>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <div class="san-card">
          <div class="san-card-title"><span class="san-card-title-icon">📅</span>Próximas tarefas</div>
          ${proximas.length === 0
            ? '<div style="font-size:12px;color:var(--muted);font-family:var(--font-mono);font-style:italic;padding:12px 0">Nenhuma tarefa futura pendente</div>'
            : `<div class="san-rank-list">
              ${proximas.map((t,i) => {
                const diff = tkDaysFromNow(t.data);
                const urgColor = diff === 0 ? '#e8864a' : diff <= 2 ? '#e06b8b' : '#5ec4a8';
                const urgLabel = diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : `em ${diff}d`;
                const pColor = TK_PRIOR_COLOR[t.prior] || '#c8a96e';
                return `<div class="san-rank-item" onclick="taskHubOpen(${t.id})" style="cursor:pointer">
                  <div class="san-rank-pos" style="background:${t.cor||pColor}22;color:${t.cor||pColor}">${i+1}</div>
                  <div class="san-rank-info">
                    <div class="san-rank-name">${t.nome}</div>
                    <div class="san-rank-meta">${t.cat} · ${TK_PRIOR_LABEL[t.prior]||''}</div>
                  </div>
                  <div style="font-size:10px;font-family:var(--font-mono);font-weight:700;color:${urgColor};flex-shrink:0">${urgLabel}</div>
                </div>`;
              }).join('')}
            </div>`}
        </div>
      </div>

      <!-- Row 3: Top subtarefas + vencidas por prioridade -->
      <div class="san-charts-row">
        <div class="san-card" style="flex:1">
          <div class="san-card-title"><span class="san-card-title-icon">◈</span>Mais complexas (subtarefas)</div>
          ${topSub.length === 0
            ? '<div style="font-size:12px;color:var(--muted);font-family:var(--font-mono);font-style:italic">Nenhuma tarefa com subtarefas</div>'
            : `<div class="san-rank-list">
              ${topSub.map((t,i) => {
                const subD = (t.subtarefas||[]).filter(s=>s.done).length;
                const subT = (t.subtarefas||[]).length;
                const sp   = Math.round(subD/subT*100);
                const col  = t.cor || TK_PRIOR_COLOR[t.prior] || '#c8a96e';
                return `<div class="san-rank-item" onclick="taskHubOpen(${t.id})" style="cursor:pointer">
                  <div class="san-rank-pos" style="background:${col}22;color:${col}">${i+1}</div>
                  <div class="san-rank-info">
                    <div class="san-rank-name">${t.nome}</div>
                    <div class="san-rank-meta">${subD}/${subT} subtarefas · ${sp}%</div>
                  </div>
                  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
                    <div style="font-size:11px;font-weight:700;color:${col}">${sp}%</div>
                    <div style="width:60px;height:4px;border-radius:3px;background:rgba(255,255,255,.06)">
                      <div style="height:100%;border-radius:3px;background:${col};width:${sp}%;transition:width 1s"></div>
                    </div>
                  </div>
                </div>`;
              }).join('')}
            </div>`}
        </div>

        <div class="san-card" style="flex:1">
          <div class="san-card-title"><span class="san-card-title-icon">🔴</span>Tarefas vencidas por prioridade</div>
          ${(() => {
            const vencTasks = tasks.filter(t => !t.done && t.data && tkDaysFromNow(t.data) < 0)
              .sort((a,b) => a.data.localeCompare(b.data)).slice(0,6);
            if (!vencTasks.length) return '<div style="font-size:12px;color:var(--accent3);font-family:var(--font-mono);font-style:italic;padding:12px 0">✓ Nenhuma tarefa vencida!</div>';
            return `<div class="san-rank-list">
              ${vencTasks.map(t => {
                const diff = Math.abs(tkDaysFromNow(t.data));
                const col  = TK_PRIOR_COLOR[t.prior] || '#e06b8b';
                return `<div class="san-rank-item" onclick="taskHubOpen(${t.id})" style="cursor:pointer">
                  <div class="san-rank-pos" style="background:${col}22;color:${col}">!</div>
                  <div class="san-rank-info">
                    <div class="san-rank-name">${t.nome}</div>
                    <div class="san-rank-meta">${t.cat} · ${tkFmtDate(t.data)}</div>
                  </div>
                  <div style="font-size:10px;font-family:var(--font-mono);font-weight:700;color:var(--accent4);flex-shrink:0">${diff}d atrás</div>
                </div>`;
              }).join('')}
            </div>`;
          })()}
        </div>
      </div>

    </div>`;

  // animar barras
  setTimeout(() => {
    el.querySelectorAll('[data-w]').forEach(bar => {
      bar.style.width = bar.dataset.w + '%';
    });
  }, 120);
}

function tkQuickToggle(id) {
  const t = S.tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  save(); renderTasks();
  // se o hub estiver aberto para este item, atualiza
  if (taskHubState.id === id) taskHubRender(t);
}

// ══════════════════════════════════════════════════════════════════════
// MODAL NOVA TAREFA
// ══════════════════════════════════════════════════════════════════════
let tkModalDate = '';
let tkModalColor = TK_COLORS[0];

function tkBuildColorPicker(containerId, selectedColor, onPickFn) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = TK_COLORS.map(col =>
    `<div class="tk-color-opt ${col===selectedColor?'sel':''}"
      style="background:${col}"
      onclick="(${onPickFn})('${col}')"></div>`
  ).join('');
}

function tkModalOpenForDate(ds) {
  tkModalDate = ds || tkToday();
  tkModalColor = TK_COLORS[0];
  document.getElementById('tkm-nome').value  = '';
  document.getElementById('tkm-nota').value  = '';
  document.getElementById('tkm-hora').value  = '';
  document.getElementById('tkm-prior').value = 'media';
  document.getElementById('tkm-cat').value   = 'Pessoal';
  document.getElementById('tk-modal-date-label').textContent = tkFmtDateLong(tkModalDate);
  tkBuildColorPicker('tkm-colors', tkModalColor, 'tkModalPickColor');
  document.getElementById('tk-modal-bd').classList.add('open');
  setTimeout(() => document.getElementById('tkm-nome').focus(), 150);
}

function tkModalPickColor(col) {
  tkModalColor = col;
  tkBuildColorPicker('tkm-colors', tkModalColor, 'tkModalPickColor');
}

function tkModalClose() { document.getElementById('tk-modal-bd').classList.remove('open'); }
function tkModalCloseOutside(e) { if (e.target.id === 'tk-modal-bd') tkModalClose(); }

function tkModalSave() {
  const nome = document.getElementById('tkm-nome').value.trim();
  if (!nome) { document.getElementById('tkm-nome').focus(); return; }
  const task = {
    id:         Date.now(),
    nome,
    nota:       document.getElementById('tkm-nota').value.trim(),
    prior:      document.getElementById('tkm-prior').value,
    cat:        document.getElementById('tkm-cat').value,
    hora:       document.getElementById('tkm-hora').value,
    data:       tkModalDate,
    cor:        tkModalColor,
    done:       false,
    subtarefas: [],
  };
  S.tasks.push(task);
  save(); renderTasks();
  tkModalClose();
}

// Compatibilidade com código antigo
function addTask() { tkModalOpenForDate(tkCalState.selected); }
function toggleTask(id) { tkQuickToggle(id); }
function delTask(id) { S.tasks = S.tasks.filter(x => x.id !== id); save(); renderTasks(); }

// ══════════════════════════════════════════════════════════════════════
// TASK HUB FULLSCREEN
// ══════════════════════════════════════════════════════════════════════
const taskHubState = { id: null };
let taskHubDrawerColor = TK_COLORS[0];

function taskHubOpen(id) {
  const t = S.tasks.find(x => x.id === id); if (!t) return;
  taskHubState.id = id;
  const hub = document.getElementById('task-hub');
  hub.scrollTop = 0;
  hub.classList.add('open');
  document.body.style.overflow = 'hidden';
  const header = document.querySelector('.site-header');
  if (header) header.style.zIndex = '1';
  taskHubRender(t);
}

function taskHubClose() {
  document.getElementById('task-hub').classList.remove('open');
  document.body.style.overflow = '';
  const header = document.querySelector('.site-header');
  if (header) header.style.zIndex = '';
  taskHubState.id = null;
}

function taskHubRender(t) {
  const pColor = TK_PRIOR_COLOR[t.prior] || '#c8a96e';
  const color  = t.cor || pColor;

  // Hero — cor dinâmica no mesh
  const heroEl = document.getElementById('taskh-hero');
  heroEl.style.background = `linear-gradient(160deg, ${color}22 0%, #06051a 60%, #100820 100%)`;
  document.getElementById('taskh-accent-bar').style.background =
    `linear-gradient(90deg, transparent 0%, ${color}aa 30%, ${color} 60%, transparent 100%)`;
  document.getElementById('taskh-hero-img').src = '';
  heroEl.classList.remove('has-img');

  // Ícone, badge, título
  const priorEmojis = { alta:'🔴', media:'🟡', baixa:'🟢' };
  document.getElementById('taskh-icon').textContent = priorEmojis[t.prior] || '✅';
  const badgeEl = document.getElementById('taskh-badge');
  badgeEl.textContent = t.cat || 'Tarefa';
  badgeEl.style.color = color; badgeEl.style.borderColor = color+'44'; badgeEl.style.background = color+'18';
  document.getElementById('taskh-title').textContent = t.nome;

  // Meta chips
  const chips = [];
  chips.push(`<div class="hub-hero-chip" style="color:${pColor}">${TK_PRIOR_LABEL[t.prior]||'—'}</div>`);
  if (t.data) {
    const diff = tkDaysFromNow(t.data);
    const cls = diff < 0 && !t.done ? 'warning' : diff === 0 ? 'success' : '';
    const lbl = diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : diff < 0 ? `${Math.abs(diff)}d atrasada` : `em ${diff}d`;
    chips.push(`<div class="hub-hero-chip ${cls}">📅 ${tkFmtDate(t.data)} · ${lbl}</div>`);
  }
  if (t.hora) chips.push(`<div class="hub-hero-chip">🕐 ${t.hora}</div>`);
  const subTotal = (t.subtarefas||[]).length;
  const subDone  = (t.subtarefas||[]).filter(s=>s.done).length;
  if (subTotal > 0) chips.push(`<div class="hub-hero-chip">◈ ${subDone}/${subTotal} subtarefas</div>`);
  document.getElementById('taskh-meta').innerHTML = chips.join('');

  // Nota/detalhes
  const notaEl = document.getElementById('taskh-nota-display');
  if (t.nota && t.nota.trim()) {
    notaEl.className = 'taskh-nota-text'; notaEl.textContent = t.nota;
  } else {
    notaEl.className = 'taskh-nota-empty'; notaEl.textContent = 'Sem detalhes. Edite para adicionar contexto.';
  }

  // Subtarefas
  taskHubRenderSubs(t);

  // Ring de progresso
  taskHubRenderRing(t);

  // Cronograma
  const schedEl = document.getElementById('taskh-sched-content');
  const diff = t.data ? tkDaysFromNow(t.data) : null;
  schedEl.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;justify-content:space-between">
        <span style="font-size:11px;font-family:var(--font-mono);color:var(--muted)">Data</span>
        <span style="font-size:13px;font-weight:700;color:var(--text)">${t.data ? tkFmtDate(t.data) : '—'}</span>
      </div>
      ${t.hora ? `<div style="display:flex;justify-content:space-between">
        <span style="font-size:11px;font-family:var(--font-mono);color:var(--muted)">Hora</span>
        <span style="font-size:13px;font-weight:700;color:var(--text)">${t.hora}</span>
      </div>` : ''}
      ${diff !== null ? `<div style="display:flex;justify-content:space-between">
        <span style="font-size:11px;font-family:var(--font-mono);color:var(--muted)">Status</span>
        <span style="font-size:12px;font-weight:700;color:${diff<0&&!t.done?'var(--accent4)':diff===0?'var(--accent3)':'var(--muted)'}">
          ${t.done?'✓ Concluída':diff===0?'Hoje':diff<0?Math.abs(diff)+'d atrasada':'em '+diff+'d'}
        </span>
      </div>` : ''}
    </div>`;

  // Classificação
  document.getElementById('taskh-class-content').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;font-family:var(--font-mono);color:var(--muted)">Prioridade</span>
        <span style="font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;
          color:${pColor};border:1px solid ${pColor}44;background:${pColor}18">
          ${TK_PRIOR_LABEL[t.prior]||'—'}
        </span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;font-family:var(--font-mono);color:var(--muted)">Categoria</span>
        <span style="font-size:12px;font-weight:700;color:var(--text)">${t.cat||'—'}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;font-family:var(--font-mono);color:var(--muted)">Cor</span>
        <div style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,.2)"></div>
      </div>
    </div>`;

  // Botão concluir
  taskHubRenderDoneBtn(t);

  // Tips
  taskHubRenderTips(t);
}

function taskHubRenderSubs(t) {
  const subs = t.subtarefas || [];
  const listEl = document.getElementById('taskh-sub-list');
  const pctEl  = document.getElementById('taskh-sub-pct');
  if (!listEl) return;
  const done = subs.filter(s=>s.done).length;
  if (pctEl) pctEl.textContent = subs.length ? `${done}/${subs.length}` : '';
  listEl.innerHTML = subs.length
    ? subs.map((s,i) => `
        <div class="taskh-sub-item">
          <div class="taskh-sub-check ${s.done?'done':''}" onclick="taskHubToggleSub(${i})">
            ${s.done?'✓':''}
          </div>
          <div class="taskh-sub-text ${s.done?'done':''}">${s.texto}</div>
          <button class="taskh-sub-del" onclick="taskHubDelSub(${i})">✕</button>
        </div>`).join('')
    : '<div style="font-size:12px;color:rgba(122,117,144,.4);font-family:var(--font-mono);font-style:italic;padding:4px 0">Nenhuma subtarefa. Adicione passos menores abaixo.</div>';
}

function taskHubRenderRing(t) {
  const subs = t.subtarefas || [];
  const total = subs.length, done = subs.filter(s=>s.done).length;
  const pct = total > 0 ? Math.round(done/total*100) : (t.done ? 100 : 0);
  const circum = 2 * Math.PI * 40; // r=40
  const fill = document.getElementById('taskh-ring-fill');
  const pctEl = document.getElementById('taskh-ring-pct');
  const subEl = document.getElementById('taskh-ring-sub');
  const statsEl = document.getElementById('taskh-ring-stats');
  if (pctEl) pctEl.textContent = pct + '%';
  if (subEl) subEl.textContent = total > 0 ? 'subtarefas' : (t.done ? 'concluída' : 'pendente');
  if (fill) setTimeout(() => fill.style.strokeDashoffset = circum * (1 - pct/100), 80);
  if (statsEl) statsEl.innerHTML = `
    <div class="taskh-ring-stat">
      <span class="taskh-ring-stat-lbl">Total</span>
      <span class="taskh-ring-stat-val">${total}</span>
    </div>
    <div class="taskh-ring-stat">
      <span class="taskh-ring-stat-lbl">Concluídas</span>
      <span class="taskh-ring-stat-val" style="color:var(--accent3)">${done}</span>
    </div>
    <div class="taskh-ring-stat">
      <span class="taskh-ring-stat-lbl">Pendentes</span>
      <span class="taskh-ring-stat-val" style="color:var(--accent5)">${total - done}</span>
    </div>`;
}

function taskHubRenderDoneBtn(t) {
  const btn  = document.getElementById('taskh-done-btn');
  const icon = document.getElementById('taskh-done-icon');
  const lbl  = document.getElementById('taskh-done-lbl');
  const navIcon = document.getElementById('taskh-nav-done-icon');
  const navLbl  = document.getElementById('taskh-nav-done-lbl');
  if (!btn) return;
  btn.className = 'taskh-done-btn ' + (t.done ? 'done-state' : 'pending');
  if (icon) icon.textContent = t.done ? '✓' : '○';
  if (lbl)  lbl.textContent  = t.done ? 'Concluída! Clique para reabrir' : 'Marcar como concluída';
  if (navIcon) navIcon.textContent = t.done ? '✓' : '○';
  if (navLbl)  navLbl.textContent  = t.done ? 'Reabrir' : 'Concluir';
}

function taskHubRenderTips(t) {
  const grid = document.getElementById('taskh-tips-grid');
  if (!grid) return;
  const subs = t.subtarefas || [];
  const diff = t.data ? tkDaysFromNow(t.data) : null;
  const tips = [];

  if (!t.nota) tips.push({ icon:'📝', color:'#c8a96e', badge:'Detalhe', title:'Adicione contexto', desc:'Uma boa descrição evita esquecimentos e ajuda a retomar o foco rapidamente.' });
  if (subs.length === 0) tips.push({ icon:'◈', color:'#7c6fcd', badge:'Estrutura', title:'Divida em subtarefas', desc:'Tarefas com passos menores são concluídas 2x mais rápido.' });
  if (diff !== null && diff < 0 && !t.done) tips.push({ icon:'⚡', color:'#e06b8b', badge:'Urgente', title:'Tarefa atrasada!', desc:`Esta tarefa está ${Math.abs(diff)} dia(s) atrasada. Priorize agora.` });
  if (diff !== null && diff === 0 && !t.done) tips.push({ icon:'🎯', color:'#e8864a', badge:'Hoje', title:'Vence hoje!', desc:'Foco! Esta tarefa precisa ser concluída antes do fim do dia.' });
  if (t.prior === 'alta' && !t.done) tips.push({ icon:'🔴', color:'#e06b8b', badge:'Alta prio', title:'Tarefa de alta prioridade', desc:'Considere trabalhar nesta tarefa antes de qualquer outra pendente.' });
  if (subs.length > 0 && subs.every(s=>s.done) && !t.done) tips.push({ icon:'✅', color:'#5ec4a8', badge:'Quase lá!', title:'Subtarefas 100% concluídas', desc:'Todas as subtarefas foram feitas. Marque a tarefa principal como concluída!' });

  // tips fixas de valor
  const fixed = [
    { icon:'⏱️', color:'#4ab0e8', badge:'Produtividade', title:'Use a técnica Pomodoro', desc:'25 min de foco + 5 min de pausa. Ideal para tarefas complexas.' },
    { icon:'🌅', color:'#7c6fcd', badge:'Hábito', title:'Tarefas difíceis pela manhã', desc:'Sua energia e foco são maiores no início do dia.' },
    { icon:'📱', color:'#c8a96e', badge:'Foco', title:'Silencie notificações', desc:'Interrupções reduzem produtividade em até 40%.' },
    { icon:'🎉', color:'#5ec4a8', badge:'Recompensa', title:'Celebre cada conclusão', desc:'Pequenas recompensas reforçam o hábito de completar tarefas.' },
  ];
  while (tips.length < 6) tips.push(fixed[tips.length % fixed.length]);
  const show = tips.slice(0,6);
  grid.innerHTML = show.map(tp => `
    <div class="hub-tip-card" style="--tip-color:${tp.color}">
      <div class="hub-tip-top">
        <div class="hub-tip-emoji">${tp.icon}</div>
        <div class="hub-tip-badge">${tp.badge}</div>
      </div>
      <div class="hub-tip-title">${tp.title}</div>
      <div class="hub-tip-desc">${tp.desc}</div>
    </div>`).join('');
}

function taskHubToggleDone() {
  const t = S.tasks.find(x => x.id === taskHubState.id); if (!t) return;
  t.done = !t.done;
  save(); renderTasks();
  taskHubRender(t);
}

function taskHubToggleSub(idx) {
  const t = S.tasks.find(x => x.id === taskHubState.id); if (!t) return;
  t.subtarefas[idx].done = !t.subtarefas[idx].done;
  // auto-marcar tarefa se todas as subs concluídas
  if (t.subtarefas.length && t.subtarefas.every(s=>s.done)) t.done = true;
  save(); renderTasks();
  taskHubRenderSubs(t); taskHubRenderRing(t); taskHubRenderDoneBtn(t);
}

function taskHubDelSub(idx) {
  const t = S.tasks.find(x => x.id === taskHubState.id); if (!t) return;
  t.subtarefas.splice(idx, 1);
  save(); renderTasks();
  taskHubRenderSubs(t); taskHubRenderRing(t);
}

function taskHubAddSub() {
  const inp = document.getElementById('taskh-new-sub');
  const texto = inp.value.trim(); if (!texto) return;
  const t = S.tasks.find(x => x.id === taskHubState.id); if (!t) return;
  t.subtarefas.push({ texto, done: false });
  inp.value = '';
  save(); renderTasks();
  taskHubRenderSubs(t); taskHubRenderRing(t);
}

// ── Drawer de edição ─────────────────────────────────────────────────
function taskHubDrawerOpen() {
  const t = S.tasks.find(x => x.id === taskHubState.id); if (!t) return;
  taskHubDrawerColor = t.cor || TK_COLORS[0];
  document.getElementById('tkd-nome').value  = t.nome  || '';
  document.getElementById('tkd-nota').value  = t.nota  || '';
  document.getElementById('tkd-prior').value = t.prior || 'media';
  document.getElementById('tkd-cat').value   = t.cat   || 'Pessoal';
  document.getElementById('tkd-data').value  = t.data  || '';
  document.getElementById('tkd-hora').value  = t.hora  || '';
  document.getElementById('taskh-drawer-icon').textContent  = TK_PRIOR_COLOR[t.prior] ? ({alta:'🔴',media:'🟡',baixa:'🟢'}[t.prior]) : '✦';
  document.getElementById('taskh-drawer-title').textContent = t.nome;
  tkBuildColorPicker('tkd-colors', taskHubDrawerColor, 'taskHubPickColor');
  document.getElementById('taskh-drawer').classList.add('open');
  document.getElementById('taskh-drawer-bd').classList.add('open');
  setTimeout(() => document.getElementById('tkd-nome').focus(), 160);
}

function taskHubPickColor(col) {
  taskHubDrawerColor = col;
  tkBuildColorPicker('tkd-colors', taskHubDrawerColor, 'taskHubPickColor');
}

function taskHubDrawerClose() {
  document.getElementById('taskh-drawer').classList.remove('open');
  document.getElementById('taskh-drawer-bd').classList.remove('open');
}

function taskHubDrawerSalvar() {
  const nome = document.getElementById('tkd-nome').value.trim();
  if (!nome) { document.getElementById('tkd-nome').focus(); return; }
  const idx = S.tasks.findIndex(x => x.id === taskHubState.id); if (idx < 0) return;
  S.tasks[idx] = {
    ...S.tasks[idx],
    nome,
    nota:  document.getElementById('tkd-nota').value.trim(),
    prior: document.getElementById('tkd-prior').value,
    cat:   document.getElementById('tkd-cat').value,
    data:  document.getElementById('tkd-data').value,
    hora:  document.getElementById('tkd-hora').value,
    cor:   taskHubDrawerColor,
  };
  save(); renderTasks();
  taskHubDrawerClose();
  taskHubRender(S.tasks[idx]);
}

function taskHubDelete() {
  const t = S.tasks.find(x => x.id === taskHubState.id);
  const nome = t ? t.nome : 'esta tarefa';
  if (!confirm('Excluir "' + nome + '"?')) return;
  S.tasks = S.tasks.filter(x => x.id !== taskHubState.id);
  save(); renderTasks();
  taskHubDrawerClose(); taskHubClose();
}


load();
renderTasks();
