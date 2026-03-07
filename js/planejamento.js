/* ══════════════════════════════════════════
   Sól de Sóter — Planejamento (Tarefas)
   js/pages/planejamento.js
══════════════════════════════════════════ */

function addTask() {
  const n = v('tk-nome'), p = v('tk-prior'), c = v('tk-cat');
  if (!n) return;
  S.tasks.push({ id: Date.now(), nome: n, prior: p, cat: c, done: false });
  save(); renderTasks(); clearInputs(['tk-nome']);
}

function toggleTask(id) {
  const t = S.tasks.find(x => x.id === id);
  if (t) { t.done = !t.done; save(); renderTasks(); }
}

function delTask(id) {
  S.tasks = S.tasks.filter(x => x.id !== id);
  save(); renderTasks();
}

function renderTasks() {
  const tk = S.tasks;
  const done = tk.filter(x=>x.done).length;
  const pct = tk.length ? Math.round(done/tk.length*100) : 0;

  const tot = document.getElementById('tk-total');
  if (tot) tot.textContent = tk.length;
  const pend = document.getElementById('tk-pend');
  if (pend) pend.textContent = tk.length - done;
  const doneEl = document.getElementById('tk-done');
  if (doneEl) doneEl.textContent = done;
  const pctEl = document.getElementById('tk-pct');
  if (pctEl) pctEl.textContent = pct+'%';

  const list = document.getElementById('task-list');
  if (!list) return;
  if (!tk.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">✅</div>Adicione sua primeira tarefa!</div>';
    return;
  }
  const priorColors = { alta:'var(--accent4)', media:'var(--accent5)', baixa:'var(--accent3)' };
  list.innerHTML = tk.map(t => `
    <div class="task-item" style="${t.done?'opacity:.5':''}">
      <div class="task-check ${t.done?'done':''}" onclick="toggleTask(${t.id})">${t.done?'✓':''}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;${t.done?'text-decoration:line-through':''}">${t.nome}</div>
        <div style="font-size:11px;color:var(--muted);font-family:var(--font-mono);margin-top:2px">${t.cat||'Pessoal'}</div>
      </div>
      <span style="color:${priorColors[t.prior]||'var(--muted)'};font-size:10px;font-family:var(--font-mono)">${t.prior||'—'}</span>
      <button class="del-btn" onclick="delTask(${t.id})">✕</button>
    </div>
  `).join('');
}
