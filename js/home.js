/* ══════════════════════════════════════════
   Sól de Sóter — Home
   js/pages/home.js
══════════════════════════════════════════ */

function renderHome() {
  const htl = document.getElementById('ht-livros');
  if (htl) htl.textContent = S.livros.length;
  const htc = document.getElementById('ht-cinema');
  if (htc) htc.textContent = S.cinema.length;
  const htm = document.getElementById('ht-mangas');
  if (htm) htm.textContent = S.mangas.length;
  const htt = document.getElementById('ht-tarefas');
  if (htt) htt.textContent = S.tasks.filter(x=>!x.done).length;

  const lendo = S.livros.find(x=>x.status==='lendo');
  const hlEl = document.getElementById('home-lendo');
  if (hlEl) hlEl.innerHTML = lendo
    ? `<div style="font-size:24px;margin-bottom:8px">📚</div><div style="font-weight:600">${lendo.titulo}</div><div style="font-size:11px;color:var(--muted);margin-top:3px">${lendo.autor||'—'}</div>`
    : '<div class="empty"><div class="empty-icon">📚</div>Nenhum livro</div>';

  const cin = S.cinema.find(x=>x.status==='assistindo');
  const hcEl = document.getElementById('home-cinema');
  if (hcEl) hcEl.innerHTML = cin
    ? `<div style="font-size:24px;margin-bottom:8px">🎬</div><div style="font-weight:600">${cin.titulo}</div><div style="font-size:11px;color:var(--muted);margin-top:3px">${cin.tipo||'—'}</div>`
    : '<div class="empty"><div class="empty-icon">🎬</div>Nenhum filme</div>';

  const task = S.tasks.find(x=>!x.done);
  const htEl = document.getElementById('home-tarefa');
  if (htEl) htEl.innerHTML = task
    ? `<div style="font-size:24px;margin-bottom:8px">✅</div><div style="font-weight:600">${task.nome}</div><div style="font-size:11px;color:var(--muted);margin-top:3px">${task.cat||'Pessoal'}</div>`
    : '<div class="empty"><div class="empty-icon">✅</div>Sem tarefas</div>';

  if (S.mood) {
    const md = document.getElementById('moodDisplay');
    if (md) md.textContent = S.mood;
    document.querySelectorAll('.mood-btn').forEach(b => {
      if (b.textContent === S.mood) b.classList.add('selected');
    });
  }
  const qn = document.getElementById('quickNote');
  if (S.note && qn) qn.value = S.note;
}

function setMood(btn, emoji) {
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  S.mood = emoji;
  const md = document.getElementById('moodDisplay');
  if (md) md.textContent = emoji;
  save();
}

function saveNote() {
  const qn = document.getElementById('quickNote');
  if (qn) { S.note = qn.value; save(); }
}
