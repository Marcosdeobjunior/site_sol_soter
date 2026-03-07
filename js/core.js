/* ══════════════════════════════════════════
   Sól de Sóter — Core: Storage & Navigation
   js/core.js
══════════════════════════════════════════ */

// ─── STATE ────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'universo_v2';

let S = {
  livros: [], cinema: [], mangas: [],
  sonhos: [], viagens: [], wishlist: [],
  financas: [], tasks: [], gym: [], estudos: [],
  finMeta: 0,
  gymMeta: { treinos: 5, min: 60 },
  mood: '', note: '',
  profile: { name: 'Usuário', avatar: '' }
};

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch(e) { console.warn('Erro ao salvar:', e); }
}

function load() {
  try {
    const d = localStorage.getItem(STORAGE_KEY);
    if (d) S = { ...S, ...JSON.parse(d) };
  } catch(e) { console.warn('Erro ao carregar:', e); }
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────
const ALL_PAGES = ['home','livros','cinema','mangas','sonhos','viagens','wishlist','financas','tarefas','academia','estudos','rpg','armazenamento'];

function goTo(page) {
  ALL_PAGES.forEach(p => {
    const el = document.getElementById('page-' + p);
    if (el) el.classList.toggle('active', p === page);
  });

  // Update nav active states
  document.querySelectorAll('.hn-link, .hn-menu-item').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('hn-' + page);
  if (activeBtn) activeBtn.classList.add('active');

  // Update dropdown active states
  document.querySelectorAll('.hn-dropdown').forEach(dd => dd.classList.remove('has-active'));
  const ddMap = { livros:'dd-biblioteca', cinema:'dd-biblioteca', mangas:'dd-biblioteca', sonhos:'dd-pessoal', viagens:'dd-pessoal', wishlist:'dd-pessoal', financas:'dd-pessoal', tarefas:'dd-pessoal', academia:'dd-pessoal', estudos:'dd-pessoal' };
  if (ddMap[page]) {
    const dd = document.getElementById(ddMap[page]);
    if (dd) dd.classList.add('has-active');
  }

  // Trigger re-renders on navigation
  if (page === 'rpg') renderProfile();
  if (page === 'armazenamento') renderStorage();
  if (page === 'home') renderHome();

  window.scrollTo(0, 0);
}

// ─── MOBILE NAV ───────────────────────────────────────────────────────────
function toggleMobileNav() {
  document.getElementById('mobile-nav').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
}

function closeMobileNav() {
  document.getElementById('mobile-nav').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

// ─── SPLASH ───────────────────────────────────────────────────────────────
function enterSite() {
  document.getElementById('splash').classList.add('hidden');
}

// ─── DATE ─────────────────────────────────────────────────────────────────
function setDate() {
  const d = new Date();
  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  const str = d.toLocaleDateString('pt-BR', opts);
  const el = document.getElementById('homeDate');
  if (el) el.textContent = str;
}

// ─── UTILS ────────────────────────────────────────────────────────────────
function v(id) { return document.getElementById(id).value.trim(); }
function clearInputs(ids) { ids.forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; }); }
function toggleForm(id) { document.getElementById(id).classList.toggle('open'); }

// ─── SPLASH STARFIELD ─────────────────────────────────────────────────────
function initSplashStars() {
  const sf = document.getElementById('starfield');
  if (!sf) return;
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2.5 + 0.5;
    s.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      --dur:${(Math.random()*3+2).toFixed(1)}s;
      --delay:-${(Math.random()*5).toFixed(1)}s;
      --min-op:${(Math.random()*.2+.05).toFixed(2)};
      --max-op:${(Math.random()*.6+.4).toFixed(2)};
    `;
    sf.appendChild(s);
  }
  for (let i = 0; i < 3; i++) {
    const sh = document.createElement('div');
    sh.className = 'shoot';
    sh.style.cssText = `
      left:${Math.random()*60+20}%;
      top:${Math.random()*30+5}%;
      --sdur:${(Math.random()*4+3).toFixed(1)}s;
      --sdelay:-${(Math.random()*6).toFixed(1)}s;
    `;
    sf.appendChild(sh);
  }
}

// ─── INTERACTIVE CANVAS STARFIELD ────────────────────────────────────────
function initCanvasStarfield() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, stars = [], mouse = { x: -9999, y: -9999 };

  const STAR_COUNT = 320;
  const PARALLAX_LAYERS = 3;
  const SHOOT_INTERVAL = 4000;
  const CONNECT_DIST = 100;
  const MOUSE_REPEL = 90;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initStars();
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function initStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const layer = Math.floor(Math.random() * PARALLAX_LAYERS);
      stars.push({
        x: rand(0, W), y: rand(0, H),
        vx: rand(-0.04, 0.04) * (layer + 1),
        vy: rand(-0.02, 0.03) * (layer + 1),
        r: rand(0.3, 1.2) * (layer * 0.4 + 0.6),
        alpha: rand(0.3, 1),
        twinkleSpeed: rand(0.005, 0.025),
        twinkleDir: Math.random() > .5 ? 1 : -1,
        layer,
        hue: Math.random() < .15 ? (Math.random() < .5 ? 'gold' : Math.random() < .5 ? 'violet' : 'sky') : 'white',
      });
    }
  }

  const hueMap = { white:[220,215,255], gold:[200,169,110], violet:[140,120,210], sky:[120,190,240] };
  let shoots = [];

  function spawnShoot() {
    shoots.push({ x: rand(W*.2,W), y: rand(0,H*.4), len: rand(100,200), angle: rand(20,50)*Math.PI/180, speed: rand(8,16), alpha: 1 });
  }
  setInterval(spawnShoot, SHOOT_INTERVAL);
  setTimeout(spawnShoot, 800);

  function drawConstellations() {
    ctx.save();
    for (let i = 0; i < stars.length; i++) {
      for (let j = i+1; j < stars.length; j++) {
        const dx = stars[i].x - stars[j].x, dy = stars[i].y - stars[j].y;
        const d = Math.sqrt(dx*dx+dy*dy);
        if (d < CONNECT_DIST && stars[i].layer === stars[j].layer) {
          const op = (1-d/CONNECT_DIST)*0.07;
          ctx.strokeStyle = `rgba(200,180,255,${op})`; ctx.lineWidth = 0.4;
          ctx.beginPath(); ctx.moveTo(stars[i].x,stars[i].y); ctx.lineTo(stars[j].x,stars[j].y); ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function drawMouseGlow() {
    if (mouse.x < 0 || mouse.x > W) return;
    const grad = ctx.createRadialGradient(mouse.x,mouse.y,0,mouse.x,mouse.y,140);
    grad.addColorStop(0,'rgba(180,150,255,0.06)'); grad.addColorStop(1,'rgba(180,150,255,0)');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(mouse.x,mouse.y,140,0,Math.PI*2); ctx.fill();
  }

  function drawNebula(cx,cy,r,color) {
    const g = ctx.createRadialGradient(cx,cy,0,cx,cy,r);
    g.addColorStop(0,color); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
  }

  function frame() {
    ctx.clearRect(0,0,W,H);
    const bg = ctx.createRadialGradient(W*.35,H*.3,0,W*.5,H*.5,Math.max(W,H)*.9);
    bg.addColorStop(0,'#08082a'); bg.addColorStop(.4,'#05050f'); bg.addColorStop(1,'#020208');
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

    drawNebula(W*.15,H*.2,320,'rgba(80,50,180,0.035)');
    drawNebula(W*.75,H*.6,280,'rgba(180,120,50,0.028)');
    drawNebula(W*.5,H*.85,200,'rgba(40,120,150,0.025)');
    drawMouseGlow();
    drawConstellations();

    for (const s of stars) {
      s.alpha += s.twinkleSpeed * s.twinkleDir;
      if (s.alpha >= 1) { s.alpha = 1; s.twinkleDir = -1; }
      if (s.alpha <= 0.15) { s.alpha = 0.15; s.twinkleDir = 1; }

      const mx = mouse.x-s.x, my = mouse.y-s.y;
      const md = Math.sqrt(mx*mx+my*my);
      if (md < MOUSE_REPEL) { const force=(1-md/MOUSE_REPEL)*.6; s.x-=(mx/md)*force; s.y-=(my/md)*force; }

      s.x += s.vx; s.y += s.vy;
      if (s.x<-5) s.x=W+5; if (s.x>W+5) s.x=-5; if (s.y<-5) s.y=H+5; if (s.y>H+5) s.y=-5;

      const [r,g,b] = hueMap[s.hue];
      const glow = s.r*3;
      const glowGrad = ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,glow);
      glowGrad.addColorStop(0,`rgba(${r},${g},${b},${s.alpha})`); glowGrad.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.beginPath(); ctx.arc(s.x,s.y,glow,0,Math.PI*2); ctx.fillStyle=glowGrad; ctx.fill();
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r*.6,0,Math.PI*2); ctx.fillStyle=`rgba(${r},${g},${b},${Math.min(s.alpha*1.4,1)})`; ctx.fill();
    }

    for (let i=shoots.length-1; i>=0; i--) {
      const sh=shoots[i];
      sh.x-=Math.cos(sh.angle)*sh.speed; sh.y+=Math.sin(sh.angle)*sh.speed;
      sh.alpha-=0.012;
      if (sh.alpha<=0||sh.x<-50||sh.y>H+50) { shoots.splice(i,1); continue; }
      const tx=sh.x+Math.cos(sh.angle)*sh.len, ty=sh.y-Math.sin(sh.angle)*sh.len;
      const grad=ctx.createLinearGradient(sh.x,sh.y,tx,ty);
      grad.addColorStop(0,`rgba(255,255,255,${sh.alpha})`); grad.addColorStop(.3,`rgba(200,180,255,${sh.alpha*.6})`); grad.addColorStop(1,'rgba(255,255,255,0)');
      ctx.strokeStyle=grad; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(sh.x,sh.y); ctx.lineTo(tx,ty); ctx.stroke();
      ctx.beginPath(); ctx.arc(sh.x,sh.y,1.5,0,Math.PI*2); ctx.fillStyle=`rgba(255,255,255,${sh.alpha})`; ctx.fill();
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', e => { mouse.x=e.clientX; mouse.y=e.clientY; });
  window.addEventListener('mouseleave', ()=>{ mouse.x=-9999; mouse.y=-9999; });
  window.addEventListener('touchmove', e=>{ mouse.x=e.touches[0].clientX; mouse.y=e.touches[0].clientY; }, {passive:true});

  resize();
  frame();
}
