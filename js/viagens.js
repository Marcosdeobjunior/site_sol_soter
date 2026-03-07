/* ══════════════════════════════════════════
   Sól de Sóter — Viagens
   js/pages/viagens.js
══════════════════════════════════════════ */

function addViagem() {
  const d = v('vg-dest'), f = v('vg-flag')||'🌍', s = v('vg-status'), dt = v('vg-data'), n = v('vg-notas');
  if (!d) return;
  S.viagens.push({ id: Date.now(), dest: d, flag: f, status: s, data: dt, notas: n });
  save(); renderViagens(); clearInputs(['vg-dest','vg-flag','vg-data','vg-notas']);
}

function delViagem(id) {
  S.viagens = S.viagens.filter(x => x.id !== id);
  save(); renderViagens();
}

function renderViagens() {
  const grid = document.getElementById('viagens-grid');
  if (!grid) return;
  if (!S.viagens.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:span 3"><div class="empty-icon">✈️</div>Adicione seu primeiro destino!</div>';
    return;
  }
  grid.innerHTML = S.viagens.map(vg => {
    const tagMap = {
      sonho: ['tag-violet','Sonho'],
      planejando: ['tag-amber','Planejando'],
      feito: ['tag-teal','Já fui! ✓']
    };
    const [tg, tl] = tagMap[vg.status] || ['tag-violet','—'];
    return `<div class="travel-card">
      <div style="display:flex;justify-content:space-between">
        <div class="travel-flag">${vg.flag}</div>
        <button class="del-btn" onclick="delViagem(${vg.id})">✕</button>
      </div>
      <div class="travel-dest">${vg.dest}</div>
      ${vg.data?`<div class="travel-date">📅 ${vg.data}</div>`:''}
      ${vg.notas?`<div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.4">${vg.notas}</div>`:''}
      <div class="travel-status"><span class="tag ${tg}">${tl}</span></div>
    </div>`;
  }).join('');
}
