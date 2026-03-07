/* ══════════════════════════════════════════
   Sól de Sóter — Estudos
   js/pages/estudos.js
══════════════════════════════════════════ */

function addStudy() {
  const m = v('st-mat-nome'), h = +v('st-horas')||0, o = v('st-obs');
  if (!m) return;
  S.estudos.push({ id: Date.now(), mat: m, horas: h, obs: o, data: new Date().toLocaleDateString('pt-BR') });
  save(); renderStudy(); clearInputs(['st-mat-nome','st-horas','st-obs']);
}

function delStudy(id) {
  S.estudos = S.estudos.filter(x => x.id !== id);
  save(); renderStudy();
}

function renderStudy() {
  const st = S.estudos;
  const total = st.reduce((a,b)=>a+b.horas,0);
  const week = st.slice(-10).reduce((a,b)=>a+b.horas,0);
  const mats = [...new Set(st.map(x=>x.mat))];

  const stt = document.getElementById('st-total');
  if (stt) stt.textContent = total.toFixed(1)+'h';
  const stw = document.getElementById('st-week');
  if (stw) stw.textContent = week.toFixed(1)+'h';
  const stm = document.getElementById('st-mat');
  if (stm) stm.textContent = mats.length;
  const sts = document.getElementById('st-sess');
  if (sts) sts.textContent = st.length;

  const list = document.getElementById('study-list');
  if (!list) return;
  if (!st.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">🎓</div>Registre uma sessão de estudos!</div>';
  } else {
    list.innerHTML = st.slice().reverse().map(s => `
      <div class="media-item">
        <div class="media-thumb" style="background:rgba(74,176,232,.12)">🎓</div>
        <div class="media-info">
          <div class="media-name">${s.mat}</div>
          <div class="media-meta">${s.data} · ${s.horas}h</div>
          ${s.obs?`<div style="font-size:11px;color:var(--muted);margin-top:3px">${s.obs}</div>`:''}
        </div>
        <button class="del-btn" onclick="delStudy(${s.id})">✕</button>
      </div>
    `).join('');
  }

  const subjs = document.getElementById('study-subjects');
  if (!subjs) return;
  if (!mats.length) {
    subjs.innerHTML = '<div class="empty"><div class="empty-icon">📊</div>Sem dados ainda</div>';
    return;
  }
  const matColors = ['var(--accent6)','var(--accent2)','var(--accent3)','var(--accent1)','var(--accent4)','var(--accent5)'];
  subjs.innerHTML = mats.map((m,i) => {
    const h = st.filter(x=>x.mat===m).reduce((a,b)=>a+b.horas,0);
    const pct = total ? Math.round(h/total*100) : 0;
    return `<div class="study-subject">
      <div class="study-header">
        <div class="study-name">${m}</div>
        <div class="study-hours">${h.toFixed(1)}h · ${pct}%</div>
      </div>
      <div class="study-bar"><div class="study-fill" style="width:${pct}%;background:${matColors[i%6]}"></div></div>
    </div>`;
  }).join('');
}
