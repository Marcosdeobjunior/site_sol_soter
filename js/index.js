(function () {
  "use strict";

  var STAR_COUNT = 320;
  var PARALLAX_LAYERS = 3;
  var SHOOT_INTERVAL = 4000;
  var CONNECT_DIST = 100;
  var MOUSE_REPEL = 90;

  var canvas = document.getElementById("bg-canvas");
  var ctx = canvas.getContext("2d");
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

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function initStars() {
    stars = [];
    for (var i = 0; i < STAR_COUNT; i += 1) {
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
    ctx.save();
    for (var i = 0; i < stars.length; i += 1) {
      for (var j = i + 1; j < stars.length; j += 1) {
        var dx = stars[i].x - stars[j].x;
        var dy = stars[i].y - stars[j].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < CONNECT_DIST && stars[i].layer === stars[j].layer) {
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

    requestAnimationFrame(frame);
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initStars();
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

  function getDreamItems() {
    var state = window.SoterStorage && window.SoterStorage.getState ? window.SoterStorage.getState() : null;
    var data = state && state.data ? state.data : {};
    var raw = null;
    var keys = ["sonhos", "sonhosItems", "dreams", "dreamItems", "listaSonhos"];
    for (var i = 0; i < keys.length; i += 1) {
      if (Array.isArray(data[keys[i]])) {
        raw = data[keys[i]];
        break;
      }
    }
    if (!raw || !raw.length) return [];

    return raw.map(function (item, idx) {
      var title = String(item.titulo || item.title || item.nome || item.name || ("Sonho " + (idx + 1)));
      var description = String(item.descricao || item.description || item.resumo || item.obs || "Sem descrição.");
      var tag = String(item.categoria || item.area || item.tipo || "Pessoal");
      var image = item.imagem || item.image || item.img || item.capa || "";
      return {
        title: title,
        description: description,
        tag: tag,
        image: image
      };
    });
  }

  function defaultDreamGradient(index) {
    var presets = [
      "radial-gradient(circle at 20% 35%, rgba(255,255,255,0.26), rgba(255,255,255,0.05) 34%, rgba(8,8,14,0.92) 68%), linear-gradient(120deg, rgba(38,28,12,0.85), rgba(8,12,22,0.88))",
      "radial-gradient(circle at 68% 28%, rgba(255,255,255,0.2), rgba(255,255,255,0.04) 36%, rgba(8,8,14,0.92) 70%), linear-gradient(120deg, rgba(22,34,46,0.86), rgba(28,18,40,0.88))",
      "radial-gradient(circle at 50% 24%, rgba(255,255,255,0.22), rgba(255,255,255,0.05) 33%, rgba(8,8,14,0.92) 69%), linear-gradient(120deg, rgba(30,18,12,0.85), rgba(16,28,18,0.88))"
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
        title: "Nenhum sonho cadastrado",
        description: "Adicione seus sonhos para exibir aqui.",
        tag: "Pessoal",
        image: ""
      }];
      prev.style.display = "none";
      next.style.display = "none";
      thumbs.style.display = "none";
    }

    function renderThumbs() {
      if (!hasItems) return;
      thumbs.innerHTML = items.slice(0, 6).map(function (item, thumbIdx) {
        var active = thumbIdx === idx ? "active" : "";
        if (item.image) {
          return '<button class="dream-thumb ' + active + '" type="button" data-idx="' + thumbIdx + '"><img src="' + item.image + '" alt=""></button>';
        }
        return '<button class="dream-thumb ' + active + '" type="button" data-idx="' + thumbIdx + '" style="background:' + defaultDreamGradient(thumbIdx) + '"></button>';
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
      title.textContent = item.title.toUpperCase();
      subtitle.textContent = item.description;
      tag.textContent = item.tag;
      cta.textContent = hasItems ? "Ver sonhos" : "Abrir sonhos";
      cta.href = "sonhos.html";
      if (item.image) {
        stage.style.backgroundImage = "linear-gradient(180deg, rgba(6,6,10,0.1), rgba(6,6,10,0.75)), url('" + item.image.replace(/'/g, "\\'") + "')";
        stage.style.backgroundSize = "cover";
        stage.style.backgroundPosition = "center";
      } else {
        stage.style.backgroundImage = defaultDreamGradient(idx);
        stage.style.backgroundSize = "auto";
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

  resize();
  setInterval(spawnShoot, SHOOT_INTERVAL);
  setTimeout(spawnShoot, 800);
  initDreamCarousel();
  frame();
}());
