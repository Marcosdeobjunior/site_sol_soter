(function () {
  "use strict";

  var PARALLAX_LAYERS = 3;
  var SHOOT_INTERVAL = 4000;
  var CONNECT_DIST = 100;
  var MOUSE_REPEL = 90;
  var DREAM_OPEN_KEY = "soter_open_dream_id";

  var canvas = document.getElementById("bg-canvas");
  var ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  var prefersReducedMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var starCount = prefersReducedMotion ? 70 : 220;
  var connectDistSq = CONNECT_DIST * CONNECT_DIST;
  var shootTimer = null;
  var animationFrameId = 0;
  var isAnimating = false;
  var W;
  var H;
  var stars = [];
  var shoots = [];
  var mouse = { x: -9999, y: -9999 };

  var hueMap = {
    white: [220, 215, 255],
    gold: [200, 169, 110],
    violet: [140, 120, 210],
    sky: [120, 190, 240]
  };

  function shouldAnimateBackground() {
    return !!(canvas && ctx && !document.hidden);
  }

  function resolveStarCount() {
    var width = window.innerWidth || 0;
    if (prefersReducedMotion) return 70;
    if (width <= 640) return 90;
    if (width <= 1024) return 140;
    return 220;
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function initStars() {
    stars = [];
    starCount = resolveStarCount();
    for (var i = 0; i < starCount; i += 1) {
      var layer = Math.floor(Math.random() * PARALLAX_LAYERS);
      stars.push({
        x: rand(0, W),
        y: rand(0, H),
        vx: rand(-0.04, 0.04) * (layer + 1),
        vy: rand(-0.02, 0.03) * (layer + 1),
        r: rand(0.3, 1.2) * (layer * 0.4 + 0.6),
        alpha: rand(0.3, 1),
        twinkleSpeed: rand(0.005, 0.025),
        twinkleDir: Math.random() > 0.5 ? 1 : -1,
        layer: layer,
        hue: Math.random() < 0.15 ? (Math.random() < 0.5 ? "gold" : (Math.random() < 0.5 ? "violet" : "sky")) : "white"
      });
    }
  }

  function spawnShoot() {
    shoots.push({
      x: rand(W * 0.2, W),
      y: rand(0, H * 0.4),
      len: rand(100, 200),
      angle: rand(20, 50) * Math.PI / 180,
      speed: rand(8, 16),
      alpha: 1
    });
  }

  function drawNebula(cx, cy, r, color) {
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawConstellations() {
    if (prefersReducedMotion || W < 900) return;
    ctx.save();
    for (var i = 0; i < stars.length; i += 1) {
      for (var j = i + 1; j < stars.length; j += 1) {
        var dx = stars[i].x - stars[j].x;
        var dy = stars[i].y - stars[j].y;
        var distSq = dx * dx + dy * dy;
        if (distSq < connectDistSq && stars[i].layer === stars[j].layer) {
          var d = Math.sqrt(distSq);
          var op = (1 - d / CONNECT_DIST) * 0.07;
          ctx.strokeStyle = "rgba(200,180,255," + op + ")";
          ctx.lineWidth = 0.4;
          ctx.beginPath();
          ctx.moveTo(stars[i].x, stars[i].y);
          ctx.lineTo(stars[j].x, stars[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function frame() {
    if (!shouldAnimateBackground()) {
      isAnimating = false;
      animationFrameId = 0;
      return;
    }

    ctx.clearRect(0, 0, W, H);

    var bg = ctx.createRadialGradient(W * 0.35, H * 0.3, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.9);
    bg.addColorStop(0, "#08082a");
    bg.addColorStop(0.4, "#05050f");
    bg.addColorStop(1, "#020208");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    drawNebula(W * 0.15, H * 0.2, 320, "rgba(80,50,180,0.035)");
    drawNebula(W * 0.75, H * 0.6, 280, "rgba(180,120,50,0.028)");
    drawNebula(W * 0.5, H * 0.85, 200, "rgba(40,120,150,0.025)");

    drawConstellations();

    for (var i = 0; i < stars.length; i += 1) {
      var s = stars[i];
      s.alpha += s.twinkleSpeed * s.twinkleDir;
      if (s.alpha >= 1) { s.alpha = 1; s.twinkleDir = -1; }
      if (s.alpha <= 0.15) { s.alpha = 0.15; s.twinkleDir = 1; }

      var mx = mouse.x - s.x;
      var my = mouse.y - s.y;
      var md = Math.sqrt(mx * mx + my * my);
      if (md < MOUSE_REPEL && md > 0) {
        var force = (1 - md / MOUSE_REPEL) * 0.6;
        s.x -= (mx / md) * force;
        s.y -= (my / md) * force;
      }

      s.x += s.vx;
      s.y += s.vy;
      if (s.x < -5) s.x = W + 5;
      if (s.x > W + 5) s.x = -5;
      if (s.y < -5) s.y = H + 5;
      if (s.y > H + 5) s.y = -5;

      var rgb = hueMap[s.hue];
      var glow = s.r * 3;
      var glowGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glow);
      glowGrad.addColorStop(0, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + s.alpha + ")");
      glowGrad.addColorStop(1, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0)");
      ctx.beginPath();
      ctx.arc(s.x, s.y, glow, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + Math.min(s.alpha * 1.4, 1) + ")";
      ctx.fill();
    }

    for (var k = shoots.length - 1; k >= 0; k -= 1) {
      var sh = shoots[k];
      sh.x -= Math.cos(sh.angle) * sh.speed;
      sh.y += Math.sin(sh.angle) * sh.speed;
      sh.alpha -= 0.012;

      if (sh.alpha <= 0 || sh.x < -50 || sh.y > H + 50) {
        shoots.splice(k, 1);
        continue;
      }

      var tx = sh.x + Math.cos(sh.angle) * sh.len;
      var ty = sh.y - Math.sin(sh.angle) * sh.len;
      var grad = ctx.createLinearGradient(sh.x, sh.y, tx, ty);
      grad.addColorStop(0, "rgba(255,255,255," + sh.alpha + ")");
      grad.addColorStop(0.3, "rgba(200,180,255," + (sh.alpha * 0.6) + ")");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sh.x, sh.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255," + sh.alpha + ")";
      ctx.fill();
    }

    animationFrameId = requestAnimationFrame(frame);
  }

  function resize() {
    if (!canvas || !ctx) return;
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initStars();
  }

  function ensureAnimationLoop() {
    if (!shouldAnimateBackground() || isAnimating) return;
    isAnimating = true;
    frame();
  }

  function stopAnimationLoop() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
    isAnimating = false;
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener("mouseleave", function () {
    mouse.x = -9999;
    mouse.y = -9999;
  });
  window.addEventListener("touchmove", function (e) {
    if (e.touches && e.touches[0]) {
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
    }
  }, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      stopAnimationLoop();
      return;
    }
    ensureAnimationLoop();
  });

  function normalizeDreamTag(rawTag) {
    var value = String(rawTag || "pessoal").trim().toLowerCase();
    var labels = {
      pessoal: "Pessoal",
      carreira: "Carreira",
      financeiro: "Financeiro",
      saude: "Saúde",
      familia: "Família",
      aventura: "Aventura",
      criativo: "Criativo",
      espiritual: "Espiritual"
    };
    return labels[value] || "Pessoal";
  }

  function getDreamItems() {
    var state = window.SoterStorage && window.SoterStorage.getState ? window.SoterStorage.getState() : null;
    var data = state && state.data ? state.data : {};
    var raw = null;

    if (data.sonhosHub && Array.isArray(data.sonhosHub.sonhos)) {
      raw = data.sonhosHub.sonhos;
    }

    if (!raw) {
      var keys = ["sonhos", "sonhosItems", "dreams", "dreamItems", "listaSonhos"];
      for (var i = 0; i < keys.length; i += 1) {
        if (Array.isArray(data[keys[i]])) {
          raw = data[keys[i]];
          break;
        }
      }
    }

    if (!raw || !raw.length) return [];

    return raw.map(function (item, idx) {
      return {
        id: item.id || ("dream-" + idx),
        title: String(item.titulo || item.title || item.nome || item.name || ("Sonho " + (idx + 1))),
        description: String(item.desc || item.descricao || item.description || item.resumo || item.obs || "Sem descrição."),
        tag: normalizeDreamTag(item.categoria || item.area || item.tipo || "pessoal"),
        image: item.img || item.imagem || item.image || item.cover || item.capa || ""
      };
    });
  }

  function defaultDreamGradient(index) {
    var presets = [
      "radial-gradient(circle at 18% 22%, rgba(200,169,110,0.18), transparent 32%), linear-gradient(135deg, rgba(10,10,18,0.96), rgba(18,16,28,0.94) 45%, rgba(12,22,24,0.92) 100%)",
      "radial-gradient(circle at 80% 18%, rgba(124,111,205,0.22), transparent 34%), linear-gradient(135deg, rgba(10,10,18,0.96), rgba(14,18,34,0.94) 48%, rgba(24,14,28,0.92) 100%)",
      "radial-gradient(circle at 55% 16%, rgba(94,196,168,0.18), transparent 30%), linear-gradient(135deg, rgba(10,10,18,0.96), rgba(18,18,28,0.94) 50%, rgba(22,18,12,0.92) 100%)"
    ];
    return presets[index % presets.length];
  }

  function initDreamCarousel() {
    var stage = document.getElementById("dreams-stage");
    var title = document.getElementById("dreams-title");
    var subtitle = document.getElementById("dreams-subtitle");
    var tag = document.getElementById("dreams-tag");
    var cta = document.getElementById("dreams-cta");
    var thumbs = document.getElementById("dreams-thumbs");
    var prev = document.getElementById("dreams-prev");
    var next = document.getElementById("dreams-next");
    if (!stage || !title || !subtitle || !tag || !cta || !thumbs || !prev || !next) return;

    var items = getDreamItems();
    var hasItems = items.length > 0;
    var idx = 0;

    if (!hasItems) {
      items = [{
        id: "empty",
        title: "Nenhum sonho cadastrado",
        description: "Adicione seus sonhos na página de sonhos para exibir aqui.",
        tag: "Pessoal",
        image: ""
      }];
      prev.style.display = "none";
      next.style.display = "none";
      thumbs.style.display = "none";
    }

    function setDreamLink(item) {
      cta.href = "sonhos.html";
      cta.onclick = function () {
        if (!hasItems) return;
        sessionStorage.setItem(DREAM_OPEN_KEY, String(item.id));
      };
    }

    function renderThumbs() {
      if (!hasItems) return;
      thumbs.innerHTML = items.slice(0, 6).map(function (item, thumbIdx) {
        var active = thumbIdx === idx ? "active" : "";
        var media = item.image
          ? '<img src="' + item.image + '" alt="">'
          : '<span class="dream-thumb-fallback">' + item.title.charAt(0).toUpperCase() + "</span>";
        return '<button class="dream-thumb ' + active + '" type="button" data-idx="' + thumbIdx + '">' + media + "</button>";
      }).join("");

      thumbs.querySelectorAll("[data-idx]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          idx = Number(btn.getAttribute("data-idx")) || 0;
          render();
        });
      });
    }

    function render() {
      var item = items[idx];
      title.textContent = item.title;
      subtitle.textContent = item.description;
      tag.textContent = item.tag;
      cta.textContent = hasItems ? "Ver sonho" : "Abrir sonhos";
      setDreamLink(item);

      if (item.image) {
        stage.style.backgroundImage = "linear-gradient(180deg, rgba(4,5,10,0.18), rgba(4,5,10,0.82) 58%, rgba(4,5,10,0.94) 100%), url('" + item.image.replace(/'/g, "\\'") + "')";
        stage.style.backgroundSize = "cover";
        stage.style.backgroundPosition = "center";
      } else {
        stage.style.backgroundImage = defaultDreamGradient(idx);
        stage.style.backgroundSize = "cover";
        stage.style.backgroundPosition = "center";
      }

      renderThumbs();
    }

    prev.addEventListener("click", function () {
      idx = (idx - 1 + items.length) % items.length;
      render();
    });

    next.addEventListener("click", function () {
      idx = (idx + 1) % items.length;
      render();
    });

    if (hasItems && items.length > 1) {
      setInterval(function () {
        idx = (idx + 1) % items.length;
        render();
      }, 5000);
    }

    render();
  }

  if (canvas && ctx) {
    resize();
    shootTimer = setInterval(function () {
      if (!document.hidden && !prefersReducedMotion) spawnShoot();
    }, SHOOT_INTERVAL);
    setTimeout(function () {
      if (!document.hidden && !prefersReducedMotion) spawnShoot();
    }, 800);
    ensureAnimationLoop();
  }
  initDreamCarousel();
}());
