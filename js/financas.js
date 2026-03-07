/* ══════════════════════════════════════════
   Sól de Sóter — Finanças
   js/pages/financas.js
══════════════════════════════════════════ */

function addFinanca() {
  const d = v('fn-desc'), val = +v('fn-val')||0, t = v('fn-tipo'), c = v('fn-cat');
  if (!d || !val) return;
  S.financas.push({ id: Date.now(), desc: d, val, tipo: t, cat: c, data: new Date().toLocaleDateString('pt-BR') });
  save(); renderFinancas(); clearInputs(['fn-desc','fn-val','fn-cat']);
}

function delFinanca(id) {
  S.financas = S.financas.filter(x => x.id !== id);
  save(); renderFinancas();
}

function setMeta() {
  S.finMeta = +v('fn-meta') || 0;
  save(); renderFinancas();
}

function renderFinancas() {
  const fn = S.financas;
  const rec = fn.filter(x=>x.tipo==='receita').reduce((a,b)=>a+b.val,0);
  const gas = fn.filter(x=>x.tipo==='gasto').reduce((a,b)=>a+b.val,0);
  const eco = fn.filter(x=>x.tipo==='economia').reduce((a,b)=>a+b.val,0);
  const saldo = rec - gas - eco;

  const fnr = document.getElementById('fn-receita');
  if (fnr) fnr.textContent = 'R$ '+rec.toFixed(2);
  const fng = document.getElementById('fn-gastos');
  if (fng) fng.textContent = 'R$ '+gas.toFixed(2);
  const fns = document.getElementById('fn-saldo');
  if (fns) fns.textContent = 'R$ '+saldo.toFixed(2);
  const fne = document.getElementById('fn-eco');
  if (fne) fne.textContent = 'R$ '+eco.toFixed(2);

  if (S.finMeta) {
    const pct = Math.min(100, Math.round(eco/S.finMeta*100));
    const fp = document.getElementById('fn-pct');
    if (fp) fp.textContent = pct+'%';
    const fb = document.getElementById('fn-bar');
    if (fb) fb.style.width = pct+'%';
    const fm = document.getElementById('fn-metaval');
    if (fm) fm.textContent = 'R$ '+S.finMeta;
  }

  const list = document.getElementById('fin-list');
  if (!list) return;
  if (!fn.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">💰</div>Adicione um lançamento!</div>';
    return;
  }
  const dotColors = { receita:'var(--accent3)', gasto:'var(--accent4)', economia:'var(--accent2)' };
  list.innerHTML = fn.slice().reverse().map(f => `
    <div class="expense-item">
      <div class="expense-cat">
        <div class="expense-dot" style="background:${dotColors[f.tipo]}"></div>
        <div>
          <div style="font-size:13px;font-weight:600">${f.desc}</div>
          <div style="font-size:11px;color:var(--muted);font-family:var(--font-mono)">${f.cat||f.tipo} · ${f.data}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="expense-amount" style="color:${dotColors[f.tipo]}">${f.tipo==='gasto'?'-':'+'} R$ ${f.val.toFixed(2)}</div>
        <button class="del-btn" onclick="delFinanca(${f.id})">✕</button>
      </div>
    </div>
  `).join('');
}
