/* ══════════════════════════════════════════
   Sól de Sóter — Profile & RPG
   js/profile.js
══════════════════════════════════════════ */

// ─── XP / LEVELS ─────────────────────────────────────────────────────────
function calcXP() {
  let xp = 0;
  xp += S.livros.filter(x=>x.status==='concluido').length * 50;
  xp += S.cinema.filter(x=>x.status==='concluido').length * 20;
  xp += S.mangas.filter(x=>x.status==='concluido').length * 30;
  xp += S.gym.length * 15;
  xp += S.estudos.reduce((a,b)=>a+b.horas,0) * 10;
  xp += S.tasks.filter(x=>x.done).length * 5;
  xp += S.viagens.filter(x=>x.status==='feito').length * 100;
  xp += S.sonhos.length * 10;
  return xp;
}

const LEVEL_TITLES = ['Viajante','Explorador','Aventureiro','Guardião','Cavaleiro','Mestre','Grão-Mestre','Lendário','Mítico','Imortal'];
function getLevel(xp) { return Math.floor(xp / 100) + 1; }
function getLevelTitle(lvl) { return LEVEL_TITLES[Math.min(lvl-1, LEVEL_TITLES.length-1)]; }

// ─── RENDER PROFILE ───────────────────────────────────────────────────────
function renderProfile() {
  const xp = Math.round(calcXP());
  const level = getLevel(xp);
  const title = getLevelTitle(level);
  const xpNext = level * 100;
  const pct = Math.min(100, Math.round(((xp % 100) / 100) * 100));
  const name = (S.profile && S.profile.name) || 'Usuário';
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '?';
  const avatar = S.profile.avatar || '';

  // Header avatar
  const hAvatar = document.getElementById('header-avatar');
  const hImg = document.getElementById('header-avatar-img');
  const hInitials = document.getElementById('header-initials');
  if (hAvatar) {
    if (avatar) { hImg.src = avatar; hAvatar.classList.add('has-photo'); }
    else { hImg.src = ''; hAvatar.classList.remove('has-photo'); }
    hInitials.textContent = initials;
  }

  const hpn = document.getElementById('header-profile-name');
  if (hpn) hpn.textContent = name;
  const hlb = document.getElementById('header-level-badge');
  if (hlb) hlb.textContent = `Nv ${level}`;
  const hxf = document.getElementById('header-xp-fill');
  if (hxf) hxf.style.width = pct + '%';

  // Dropdown header
  const pmnd = document.getElementById('pm-name-display');
  if (pmnd) pmnd.textContent = name;
  const pmtd = document.getElementById('pm-title-display');
  if (pmtd) pmtd.textContent = `⚔ ${title} · Nível ${level}`;
  const pmxt = document.getElementById('pm-xp-text');
  if (pmxt) pmxt.textContent = `${xp} XP`;
  const pmxn = document.getElementById('pm-xp-next');
  if (pmxn) pmxn.textContent = `próx: ${xpNext} XP`;
  const pmxf = document.getElementById('pm-xp-fill');
  if (pmxf) pmxf.style.width = pct + '%';
  const pmni = document.getElementById('pm-name-input');
  if (pmni) pmni.value = name;

  // RPG page
  const rpgAvatar = document.getElementById('rpg-avatar');
  const rpgImg = document.getElementById('rpg-avatar-img');
  const rpgInitials = document.getElementById('rpg-initials');
  if (rpgAvatar) {
    if (avatar) { rpgImg.src = avatar; rpgAvatar.classList.add('has-photo'); }
    else { rpgImg.src = ''; rpgAvatar.classList.remove('has-photo'); }
    rpgInitials.textContent = initials;
  }
  const rhn = document.getElementById('rpg-hero-name');
  if (rhn) rhn.textContent = name;
  const rht = document.getElementById('rpg-hero-title');
  if (rht) rht.textContent = `⚔ ${title} · Nível ${level}`;
  const rxl = document.getElementById('rpg-xp-label');
  if (rxl) rxl.textContent = `${xp} XP acumulado`;
  const rxn = document.getElementById('rpg-xp-next-label');
  if (rxn) rxn.textContent = `${xpNext - xp} XP para nível ${level+1}`;
  const rxb = document.getElementById('rpg-xp-bar');
  if (rxb) rxb.style.width = pct + '%';

  // Stats
  const rsl = document.getElementById('rpg-stat-livros');
  if (rsl) rsl.textContent = S.livros.filter(x=>x.status==='concluido').length;
  const rsc = document.getElementById('rpg-stat-cinema');
  if (rsc) rsc.textContent = S.cinema.filter(x=>x.status==='concluido').length;
  const rsg = document.getElementById('rpg-stat-gym');
  if (rsg) rsg.textContent = S.gym.length;
  const rse = document.getElementById('rpg-stat-estudo');
  if (rse) rse.textContent = S.estudos.reduce((a,b)=>a+b.horas,0).toFixed(1)+'h';

  // Balance
  const rec = S.financas.filter(x=>x.tipo==='receita').reduce((a,b)=>a+b.val,0);
  const gas = S.financas.filter(x=>x.tipo==='gasto').reduce((a,b)=>a+b.val,0);
  const eco = S.financas.filter(x=>x.tipo==='economia').reduce((a,b)=>a+b.val,0);
  const saldo = rec - gas - eco;
  const balEl = document.getElementById('header-balance-val');
  if (balEl) {
    balEl.textContent = 'R$ ' + saldo.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
    balEl.className = 'balance-value' + (saldo < 0 ? ' negative' : '');
  }

  renderAchievements(xp, level);
}

const ACHIEVEMENTS = [
  { id:'first_book', icon:'📖', name:'Primeira Leitura', desc:'Conclua 1 livro', check: ()=> S.livros.filter(x=>x.status==='concluido').length >= 1 },
  { id:'bookworm', icon:'🐛', name:'Bibliófilo', desc:'Conclua 10 livros', check: ()=> S.livros.filter(x=>x.status==='concluido').length >= 10 },
  { id:'cinephile', icon:'🎬', name:'Cinéfilo', desc:'Assista 5 filmes/séries', check: ()=> S.cinema.filter(x=>x.status==='concluido').length >= 5 },
  { id:'gym_start', icon:'💪', name:'Primeiro Treino', desc:'Registre 1 treino', check: ()=> S.gym.length >= 1 },
  { id:'gym_warrior', icon:'🏋', name:'Guerreiro do Ginásio', desc:'Complete 30 treinos', check: ()=> S.gym.length >= 30 },
  { id:'scholar', icon:'🎓', name:'Estudioso', desc:'Acumule 10h de estudo', check: ()=> S.estudos.reduce((a,b)=>a+b.horas,0) >= 10 },
  { id:'dreamer', icon:'🌙', name:'Sonhador', desc:'Adicione 5 sonhos', check: ()=> S.sonhos.length >= 5 },
  { id:'traveler', icon:'✈️', name:'Viajante', desc:'Visite 1 destino', check: ()=> S.viagens.filter(x=>x.status==='feito').length >= 1 },
  { id:'manga_fan', icon:'📖', name:'Otaku', desc:'Leia 5 mangás', check: ()=> S.mangas.filter(x=>x.status==='concluido').length >= 5 },
  { id:'level5', icon:'⚔️', name:'Veterano', desc:'Alcance o nível 5', check: ()=> getLevel(Math.round(calcXP())) >= 5 },
  { id:'collector', icon:'⭐', name:'Colecionador', desc:'Marque 10 favoritos', check: ()=> [...S.livros,...S.cinema,...S.mangas].filter(x=>x.fav).length >= 10 },
  { id:'legend', icon:'👑', name:'Lendário', desc:'Alcance o nível 10', check: ()=> getLevel(Math.round(calcXP())) >= 10 },
];

function renderAchievements(xp, level) {
  const container = document.getElementById('rpg-achievements');
  if (!container) return;
  container.innerHTML = ACHIEVEMENTS.map(a => {
    const unlocked = a.check();
    return `<div class="rpg-badge ${unlocked?'':'locked'}">
      <div class="rpg-badge-icon">${a.icon}</div>
      <div>
        <div class="rpg-badge-name">${a.name}</div>
        <div class="rpg-badge-desc">${unlocked ? '✓ ' : ''}${a.desc}</div>
      </div>
    </div>`;
  }).join('');
}

function saveProfileName(val) {
  if (!S.profile) S.profile = {};
  S.profile.name = val || 'Usuário';
  save();
  renderProfile();
}

function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 200;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2, sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      S.profile.avatar = canvas.toDataURL('image/jpeg', 0.85);
      save();
      renderProfile();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function removeAvatar() {
  S.profile.avatar = '';
  save();
  renderProfile();
}
