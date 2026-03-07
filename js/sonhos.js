/* ══════════════════════════════════════════
   Sól de Sóter — Sonhos
   js/pages/sonhos.js
══════════════════════════════════════════ */

function addSonho() {
  const t = v('sn-titulo'), ic = v('sn-icon')||'🌙', h = v('sn-horizonte'), d = v('sn-desc');
  if (!t) return;
  S.sonhos.push({ id: Date.now(), titulo: t, icon: ic, horizonte: h, desc: d });
  save(); renderSonhos(); clearInputs(['sn-titulo','sn-icon','sn-desc']);
}

function delSonho(id) {
  S.sonhos = S.sonhos.filter(x => x.id !== id);
  save(); renderSonhos();
}

const dreamColors = ['var(--accent1)','var(--accent2)','var(--accent3)','var(--accent4)','var(--accent5)','var(--accent6)'];

function renderSonhos() {
  const grid = document.getElementById('sonhos-grid');
  if (!grid) return;
  if (!S.sonhos.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:span 3"><div class="empty-icon">🌙</div>Adicione seu primeiro sonho!</div>';
    return;
  }
  grid.innerHTML = S.sonhos.map((s,i) => `
    <div class="dream-card" style="--dc:${dreamColors[i%6]}; border-top:2px solid ${dreamColors[i%6]}">
      <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;border-radius:50%;background:${dreamColors[i%6]};opacity:.08;pointer-events:none"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="dream-icon">${s.icon}</div>
        <button class="del-btn" onclick="delSonho(${s.id})">✕</button>
      </div>
      <div class="dream-title">${s.titulo}</div>
      ${s.desc?`<div class="dream-desc">${s.desc}</div>`:''}
      <div class="dream-horizon">⏳ ${s.horizonte||'—'}</div>
    </div>
  `).join('');
}
