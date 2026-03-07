/* ══════════════════════════════════════════
   Sól de Sóter — Wishlist
   js/pages/wishlist.js
══════════════════════════════════════════ */

function addWish() {
  const n = v('wl-nome'), e = v('wl-emoji')||'🎁', p = v('wl-preco'), pr = v('wl-prior');
  if (!n) return;
  S.wishlist.push({ id: Date.now(), nome: n, emoji: e, preco: p, prior: pr });
  save(); renderWish(); clearInputs(['wl-nome','wl-emoji','wl-preco']);
}

function delWish(id) {
  S.wishlist = S.wishlist.filter(x => x.id !== id);
  save(); renderWish();
}

function renderWish() {
  const list = document.getElementById('wish-list');
  if (!list) return;
  const wl = S.wishlist;
  const wt = document.getElementById('wl-total');
  if (wt) wt.textContent = wl.length;
  const wa = document.getElementById('wl-alta');
  if (wa) wa.textContent = wl.filter(x=>x.prior==='alta').length;
  const wm = document.getElementById('wl-media');
  if (wm) wm.textContent = wl.filter(x=>x.prior==='media').length;
  const wb = document.getElementById('wl-baixa');
  if (wb) wb.textContent = wl.filter(x=>x.prior==='baixa').length;

  if (!wl.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">⭐</div>Adicione itens à wishlist!</div>';
    return;
  }
  list.innerHTML = wl.map(w => {
    const pc = {alta:['tag-rose','Alta'],media:['tag-gold','Média'],baixa:['tag-teal','Baixa']}[w.prior]||['tag-violet','—'];
    return `<div class="wish-item">
      <div class="wish-emoji">${w.emoji}</div>
      <div class="wish-info">
        <div class="wish-name">${w.nome}</div>
        ${w.preco?`<div class="wish-price">R$ ${w.preco}</div>`:''}
      </div>
      <span class="tag ${pc[0]}">${pc[1]}</span>
      <button class="del-btn" onclick="delWish(${w.id})">✕</button>
    </div>`;
  }).join('');
}
