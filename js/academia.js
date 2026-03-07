/* ══════════════════════════════════════════
   Sól de Sóter — Academia
   js/pages/academia.js
══════════════════════════════════════════ */

function addGym() {
  const t = v('gym-tipo'), d = +v('gym-dur')||0, o = v('gym-obs');
  if (!t) return;
  S.gym.push({ id: Date.now(), tipo: t, dur: d, obs: o, data: new Date().toLocaleDateString('pt-BR') });
  save(); renderGym(); clearInputs(['gym-tipo','gym-dur','gym-obs']);
}

function delGym(id) {
  S.gym = S.gym.filter(x => x.id !== id);
  save(); renderGym();
}

function setGymMeta() {
  S.gymMeta.treinos = +v('gym-meta-treinos') || 5;
  S.gymMeta.min = +v('gym-meta-min') || 60;
  save(); renderGym();
}

function renderGym() {
  const gym = S.gym;
  const week = gym.slice(-7);
  const treinos = week.length;
  const minTotal = week.reduce((a,b)=>a+b.dur,0);

  // streak
  let streak = 0;
  for (let i = gym.length-1; i >= 0; i--) {
    const today = new Date(); today.setDate(today.getDate()-streak);
    const d = gym[i].data;
    if (d === today.toLocaleDateString('pt-BR')) streak++;
    else break;
  }

  const r1v = document.getElementById('ring1-val');
  if (r1v) r1v.textContent = treinos;
  const r2v = document.getElementById('ring2-val');
  if (r2v) r2v.textContent = minTotal;
  const r3v = document.getElementById('ring3-val');
  if (r3v) r3v.textContent = streak;
  const gmd = document.getElementById('gym-meta-display');
  if (gmd) gmd.textContent = `${S.gymMeta.treinos} treinos/semana · ${S.gymMeta.min}min/treino`;

  const circ = 201;
  const r1pct = Math.min(1, treinos/S.gymMeta.treinos);
  const r2pct = Math.min(1, minTotal/(S.gymMeta.treinos*S.gymMeta.min));
  const r3pct = Math.min(1, streak/7);

  const r1 = document.getElementById('ring1');
  if (r1) r1.style.strokeDashoffset = circ - circ*r1pct;
  const r2 = document.getElementById('ring2');
  if (r2) r2.style.strokeDashoffset = circ - circ*r2pct;
  const r3 = document.getElementById('ring3');
  if (r3) r3.style.strokeDashoffset = circ - circ*r3pct;

  const list = document.getElementById('gym-list');
  if (!list) return;
  if (!gym.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">💪</div>Registre seu primeiro treino!</div>';
    return;
  }
  list.innerHTML = gym.slice().reverse().map(g => `
    <div class="media-item">
      <div class="media-thumb" style="background:rgba(94,196,168,.12)">💪</div>
      <div class="media-info">
        <div class="media-name">${g.tipo}</div>
        <div class="media-meta">${g.data} ${g.dur?'· '+g.dur+' min':''}</div>
        ${g.obs?`<div style="font-size:11px;color:var(--muted);margin-top:3px">${g.obs}</div>`:''}
      </div>
      <button class="del-btn" onclick="delGym(${g.id})">✕</button>
    </div>
  `).join('');
}
