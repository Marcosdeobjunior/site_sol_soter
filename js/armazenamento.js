/* ══════════════════════════════════════════
   Sól de Sóter — Armazenamento
   js/pages/armazenamento.js
══════════════════════════════════════════ */

const STORAGE_SECTIONS = [
  { key:'livros',   icon:'📚', name:'Livraria',       color:'#c8a96e' },
  { key:'cinema',   icon:'🎬', name:'Cinema',          color:'#4ab0e8' },
  { key:'mangas',   icon:'📖', name:'Mangás',          color:'#e06b8b' },
  { key:'sonhos',   icon:'🌙', name:'Sonhos',          color:'#7c6fcd' },
  { key:'viagens',  icon:'✈️', name:'Viagens',         color:'#4ac4a8' },
  { key:'wishlist', icon:'⭐', name:'Wishlist',        color:'#c8a96e' },
  { key:'financas', icon:'💰', name:'Finanças',        color:'#5ec4a8' },
  { key:'tasks',    icon:'✅', name:'Planejamento',    color:'#5ec4a8' },
  { key:'gym',      icon:'💪', name:'Academia',        color:'#e06b8b' },
  { key:'estudos',  icon:'🎓', name:'Estudos',         color:'#4ac4a8' },
  { key:'profile',  icon:'👤', name:'Perfil / Avatar', color:'#7c6fcd' },
];

let STOR_CAPACITY_MB = parseInt(localStorage.getItem('stor_capacity_mb') || '10', 10);

function byteSize(str) { return new Blob([str]).size; }
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(2) + ' MB';
}
function countImages(data) {
  if (Array.isArray(data)) return data.filter(x => x && x.img).length;
  if (data && typeof data === 'object') return data.avatar ? 1 : 0;
  return 0;
}

function setCapacity(mb) {
  STOR_CAPACITY_MB = mb;
  localStorage.setItem('stor_capacity_mb', mb);
  document.querySelectorAll('.stor-cap-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.trim() === mb + ' MB');
  });
  const lbl = document.getElementById('stor-cap-label');
  if (lbl) lbl.textContent = mb + ' MB';
  const of = document.getElementById('stor-of-total');
  if (of) of.textContent = 'de ' + mb + ' MB';
  renderStorage();
}

function drawDonut(canvasId, sections, totalBytes) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2, r = 68, inner = 44;
  ctx.clearRect(0, 0, W, H);

  const nonZero = sections.filter(s => s.bytes > 0);
  if (!nonZero.length) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = r - inner; ctx.stroke();
    return;
  }

  let start = -Math.PI / 2;
  nonZero.forEach(s => {
    const sweep = (s.bytes / totalBytes) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, (r+inner)/2, start, start+sweep);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = r - inner;
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    ctx.globalAlpha = 1;
    start += sweep;
  });

  ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI*2);
  ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1; ctx.stroke();
}

function renderStorage() {
  const MAX_BYTES = STOR_CAPACITY_MB * 1024 * 1024;
  const raw = localStorage.getItem(STORAGE_KEY) || '{}';
  const totalBytes = byteSize(raw);
  const totalPct = Math.min(100, (totalBytes / MAX_BYTES) * 100);

  const freeBytes = Math.max(0, MAX_BYTES - totalBytes);
  const ku = document.getElementById('kpi-usado');
  if (ku) ku.textContent = formatBytes(totalBytes);
  const kl = document.getElementById('kpi-livre');
  if (kl) kl.textContent = formatBytes(freeBytes);

  let imgCount = 0, itemCount = 0;
  const sections = STORAGE_SECTIONS.map(s => {
    const data = S[s.key];
    const json = JSON.stringify(data);
    const bytes = byteSize(json);
    const pctOfTotal = totalBytes > 0 ? (bytes / totalBytes) * 100 : 0;
    const imgs = countImages(data);
    imgCount += imgs;
    itemCount += Array.isArray(data) ? data.length : 0;
    return { ...s, bytes, pctOfTotal, count: Array.isArray(data) ? data.length : 1, imgs };
  }).sort((a,b) => b.bytes - a.bytes);

  const ki = document.getElementById('kpi-imgs');
  if (ki) ki.textContent = imgCount;
  const kit = document.getElementById('kpi-itens');
  if (kit) kit.textContent = itemCount;
  const kp = document.getElementById('kpi-pct');
  if (kp) kp.textContent = totalPct.toFixed(1) + '%';

  const statusIcon = document.getElementById('kpi-status-icon');
  const statusLbl = document.getElementById('kpi-status-label');
  if (statusIcon && statusLbl) {
    if (totalPct > 85) {
      statusIcon.textContent = '⚠'; statusIcon.style.background = 'rgba(224,107,139,.12)'; statusIcon.style.color = 'var(--accent4)';
      statusLbl.textContent = 'Quase cheio';
    } else if (totalPct > 60) {
      statusIcon.textContent = '⚡'; statusIcon.style.background = 'rgba(232,134,74,.12)'; statusIcon.style.color = 'var(--accent5)';
      statusLbl.textContent = 'Atenção';
    } else {
      statusIcon.textContent = '✓'; statusIcon.style.background = 'rgba(94,196,168,.12)'; statusIcon.style.color = 'var(--accent3)';
      statusLbl.textContent = 'Saudável';
    }
  }

  const sbu = document.getElementById('stor-big-used');
  if (sbu) sbu.textContent = formatBytes(totalBytes);
  const sot = document.getElementById('stor-of-total');
  if (sot) sot.textContent = 'de ' + STOR_CAPACITY_MB + ' MB';
  const scl = document.getElementById('stor-cap-label');
  if (scl) scl.textContent = STOR_CAPACITY_MB + ' MB';

  const now = new Date();
  const slu = document.getElementById('stor-last-updated');
  if (slu) slu.textContent = `Atualizado às ${now.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})} · localStorage`;

  const segBar = document.getElementById('stor-seg-bar');
  const segLegend = document.getElementById('stor-seg-legend');
  const topSections = sections.filter(s => s.bytes > 0).slice(0, 8);
  if (segBar) segBar.innerHTML = topSections.map(s =>
    `<div class="stor-seg-chunk" style="width:${(s.bytes/MAX_BYTES*100).toFixed(2)}%;background:${s.color}" title="${s.name}: ${formatBytes(s.bytes)}"></div>`
  ).join('') + (totalPct < 100 ? `<div class="stor-seg-chunk" style="flex:1;background:rgba(255,255,255,.03)"></div>` : '');

  if (segLegend) segLegend.innerHTML = topSections.map(s =>
    `<div class="stor-leg-item"><div class="stor-leg-dot" style="background:${s.color}"></div>${s.name} <span style="opacity:.5;margin-left:2px">${(s.pctOfTotal).toFixed(0)}%</span></div>`
  ).join('');

  drawDonut('stor-donut', topSections, totalBytes);
  const dp = document.getElementById('donut-pct');
  if (dp) dp.textContent = totalPct.toFixed(0) + '%';

  const breakdown = document.getElementById('stor-breakdown');
  if (breakdown) breakdown.innerHTML = sections.map(s => `
    <div class="storage-row">
      <div class="storage-icon">${s.icon}</div>
      <div class="storage-info">
        <div class="storage-name">${s.name}</div>
        <div class="storage-sub">${s.key==='profile'?(S.profile.avatar?'com foto':'sem foto'):`${s.count} ${s.count===1?'item':'itens'}${s.imgs?' · '+s.imgs+' img':''}`}</div>
        <div class="storage-item-bar" style="width:${Math.max(s.pctOfTotal,.5).toFixed(1)}%;background:${s.color};max-width:100%"></div>
      </div>
      <div class="storage-right">
        <div class="storage-size" style="color:${s.color}">${formatBytes(s.bytes)}</div>
        <div class="storage-pct">${s.pctOfTotal.toFixed(1)}%</div>
        ${s.imgs>0?`<button class="storage-clear-btn" onclick="clearSectionImages('${s.key}')">limpar</button>`:''}
      </div>
    </div>`).join('');

  const tips = [];
  if (imgCount > 10) tips.push('📸 ' + imgCount + ' imagens salvas — limpar capas libera bastante espaço.');
  if (totalPct > 60) tips.push('⚡ Use "Limpar imagens" para liberar espaço rapidamente.');
  if (S.tasks.filter(x=>x.done).length > 20) tips.push('✅ Há muitas tarefas concluídas — considere removê-las.');
  if (S.financas.length > 50) tips.push('💰 Muitos lançamentos financeiros — arquive os antigos.');
  if (!tips.length) tips.push('✓ Tudo em ordem! Armazenamento saudável.');
  const st = document.getElementById('stor-tips');
  if (st) st.innerHTML = tips.map(t=>`<div style="margin-bottom:6px">${t}</div>`).join('');
}

function clearSectionImages(key) {
  if (!confirm(`Remover imagens de "${key}"? Os itens serão mantidos.`)) return;
  if (Array.isArray(S[key])) S[key] = S[key].map(item => ({...item, img:''}));
  else if (key==='profile') S.profile.avatar = '';
  save(); renderProfile(); renderStorage();
  if (['livros','cinema','mangas'].includes(key)) renderTracker(key);
}

function clearAllImages() {
  if (!confirm('Remover TODAS as imagens (capas + avatar)? Os itens serão mantidos.')) return;
  ['livros','cinema','mangas'].forEach(k => { S[k] = S[k].map(item => ({...item,img:''})); });
  S.profile.avatar = '';
  save(); renderProfile(); renderLivros(); renderCinema(); renderMangas(); renderStorage();
}

function clearAllData() {
  if (!confirm('⚠ APAGAR TODOS OS DADOS? Irreversível!')) return;
  if (!confirm('Tem certeza? Todo o conteúdo será apagado permanentemente.')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}
