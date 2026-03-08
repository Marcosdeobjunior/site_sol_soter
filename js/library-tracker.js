(function () {
  "use strict";

  var STORAGE_MAP = { livros: "trackerLivraria", cinema: "trackerCinema", mangas: "trackerMangas" };
  var PAGE = { livros: 1, cinema: 1, mangas: 1 };
  var PER_PAGE = 25;
  var modalTracker = null;
  var modalEditId = null;
  var modalStar = 0;
  var modalImg = "";
  var migratedLegacyData = false;
  var FILTER_PENDING = { livros: {}, cinema: {}, mangas: {} };
  var FILTER_APPLIED = { livros: {}, cinema: {}, mangas: {} };
  var S = { livros: [], cinema: [], mangas: [] };

  var CFG = {
    livros: {
      prefix: "lv", title: "Minha <span>Livraria</span>", subtitle: "Tracking de leitura - livros lidos e em progresso", listTitle: "Todos os livros",
      icon: "📚", empty: "Adicione seu primeiro livro!", status: ["lendo", "concluido", "quero", "pausado"],
      labels: { lendo: "Lendo", concluido: "Concluido", quero: "Quero ler", pausado: "Pausado" },
      colors: { lendo: "#c8a96e", concluido: "#5ec4a8", quero: "#7c6fcd", pausado: "#7a7590" },
      ribbons: { lendo: "rgba(200,169,110,.8)", concluido: "rgba(94,196,168,.8)", quero: "rgba(124,111,205,.8)", pausado: "rgba(122,117,144,.6)" },
      progress: function (x) { return x.paginas ? Math.round((x.atual || 0) / x.paginas * 100) : null; },
      progressLabel: function (x) { return x.paginas ? ("Pag. " + (x.atual || 0) + "/" + x.paginas) : null; }
    },
    cinema: {
      prefix: "ci", title: "Meu <span>Cinema</span>", subtitle: "Filmes e series - assistidos e na fila", listTitle: "Minha lista",
      icon: "🎬", empty: "Adicione um filme ou serie!", status: ["assistindo", "concluido", "quero"],
      labels: { assistindo: "Assistindo", concluido: "Concluido", quero: "Quero ver" },
      colors: { assistindo: "#e8864a", concluido: "#5ec4a8", quero: "#4ab0e8" },
      ribbons: { assistindo: "rgba(232,134,74,.8)", concluido: "rgba(94,196,168,.8)", quero: "rgba(74,176,232,.8)" },
      progress: function () { return null; }, progressLabel: function (x) { return x.tipo || null; }
    },
    mangas: {
      prefix: "mg", title: "Colecao de <span>Mangas</span>", subtitle: "Tracking de capitulos e volumes", listTitle: "Minha colecao",
      icon: "📖", empty: "Adicione seu primeiro manga!", status: ["lendo", "concluido", "pausado", "quero"],
      labels: { lendo: "Lendo", concluido: "Concluido", pausado: "Pausado", quero: "Quero ler" },
      colors: { lendo: "#e06b8b", concluido: "#5ec4a8", pausado: "#7a7590", quero: "#7c6fcd" },
      ribbons: { lendo: "rgba(224,107,139,.8)", concluido: "rgba(94,196,168,.8)", pausado: "rgba(122,117,144,.6)", quero: "rgba(124,111,205,.8)" },
      progress: function (x) { return x.capTotal ? Math.round((x.capAtual || 0) / x.capTotal * 100) : null; },
      progressLabel: function (x) { return x.capTotal ? ("Cap. " + (x.capAtual || 0) + "/" + x.capTotal) : (x.capAtual ? ("Cap. " + x.capAtual) : null); }
    }
  };

  function st() { return window.SoterStorage && window.SoterStorage.getState ? window.SoterStorage.getState() : { data: {} }; }
  function n(v) { var x = Number(v); return Number.isFinite(x) ? x : 0; }
  function esc(v) { return String(v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;"); }
  function save() {
    if (!window.SoterStorage || !window.SoterStorage.save) return;
    var s = st(); if (!s.data || typeof s.data !== "object") s.data = {};
    s.data[STORAGE_MAP.livros] = S.livros; s.data[STORAGE_MAP.cinema] = S.cinema; s.data[STORAGE_MAP.mangas] = S.mangas;
    window.SoterStorage.save(s);
  }
  function load() {
    var s = st();
    var data = s.data && typeof s.data === "object" ? s.data : {};
    var livrosMain = data[STORAGE_MAP.livros];
    var cinemaMain = data[STORAGE_MAP.cinema];
    var mangasMain = data[STORAGE_MAP.mangas];

    var legacyLivros = pickLegacyArray(data, ["trackerLivros", "libraryTrackerItems", "bibliotecaLivros", "livros", "livraria"]);
    var legacyCinema = pickLegacyArray(data, ["trackerFilmes", "trackerSeries", "bibliotecaCinema", "cinema", "filmes"]);
    var legacyMangas = pickLegacyArray(data, ["trackerManga", "trackerMangas", "bibliotecaMangas", "mangas"]);

    S.livros = Array.isArray(livrosMain) ? livrosMain : (legacyLivros || readLegacyLocalStorage(["trackerLivraria", "trackerLivros", "libraryTrackerItems"]));
    S.cinema = Array.isArray(cinemaMain) ? cinemaMain : (legacyCinema || readLegacyLocalStorage(["trackerCinema", "trackerFilmes", "trackerSeries"]));
    S.mangas = Array.isArray(mangasMain) ? mangasMain : (legacyMangas || readLegacyLocalStorage(["trackerMangas", "trackerManga"]));

    migratedLegacyData = (!Array.isArray(livrosMain) && !!legacyLivros) ||
      (!Array.isArray(cinemaMain) && !!legacyCinema) ||
      (!Array.isArray(mangasMain) && !!legacyMangas) ||
      (!Array.isArray(livrosMain) && S.livros.length > 0) ||
      (!Array.isArray(cinemaMain) && S.cinema.length > 0) ||
      (!Array.isArray(mangasMain) && S.mangas.length > 0);
  }

  function pickLegacyArray(data, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      var arr = data[keys[i]];
      if (Array.isArray(arr)) return arr;
    }
    return null;
  }

  function readLegacyLocalStorage(keys) {
    if (!window.localStorage) return null;
    for (var i = 0; i < keys.length; i += 1) {
      var raw = window.localStorage.getItem(keys[i]);
      if (!raw) continue;
      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.items)) return parsed.items;
      } catch (err) { }
    }
    return null;
  }

  function setStars(v) {
    modalStar = v;
    document.querySelectorAll(".mstar").forEach(function (b) { b.classList.toggle("on", n(b.getAttribute("data-v")) <= v); });
    var lbl = document.getElementById("modal-star-label");
    if (lbl) lbl.textContent = v ? (v + " estrela" + (v > 1 ? "s" : "")) : "Sem nota";
  }

  function updateModalHeroImage(src) {
    var blur = document.getElementById("modal-hero-blur");
    if (!blur) return;
    if (src) {
      blur.style.backgroundImage = 'url("' + src.replace(/"/g, '\\"') + '")';
      blur.style.opacity = "0.55";
    } else {
      blur.style.backgroundImage = "";
      blur.style.opacity = "0";
    }
  }

  function updateModalHero() {
    var titleNode = document.getElementById("modal-hero-title");
    var titleInput = document.getElementById("m-titulo");
    if (!titleNode || !titleInput) return;
    var t = titleInput.value.trim();
    if (t) {
      titleNode.textContent = t;
      return;
    }
    titleNode.textContent = modalTracker === "cinema" ? "Novo Titulo" : (modalTracker === "mangas" ? "Novo Manga" : "Novo Livro");
  }

  function updateModalStatusPill() {
    var row = document.getElementById("modal-status-row");
    var pill = document.getElementById("modal-status-pill");
    var statusSel = document.getElementById("m-status");
    if (!row || !pill || !statusSel || !modalTracker) return;
    var cfg = CFG[modalTracker];
    var status = statusSel.value;
    var color = (cfg && cfg.colors && cfg.colors[status]) ? cfg.colors[status] : "#7a7590";
    pill.textContent = (cfg && cfg.labels && cfg.labels[status]) ? cfg.labels[status] : status;
    pill.style.color = color;
    pill.style.borderColor = color + "66";
    pill.style.background = color + "1f";
    row.style.display = "flex";
  }

  function updateModalProgress() {
    if (modalTracker === "livros") {
      var totalPag = n(document.getElementById("m-paginas").value);
      var atualPag = n(document.getElementById("m-atual-pag").value);
      var wrap = document.getElementById("modal-progress-wrap");
      var fill = document.getElementById("modal-progress-fill");
      var pct = document.getElementById("modal-progress-pct");
      if (!wrap || !fill || !pct) return;
      if (totalPag > 0) {
        var v = Math.max(0, Math.min(100, Math.round(atualPag / totalPag * 100)));
        fill.style.width = v + "%";
        pct.textContent = v + "%";
        wrap.style.display = "flex";
      } else {
        fill.style.width = "0%";
        pct.textContent = "0%";
        wrap.style.display = "none";
      }
      return;
    }

    if (modalTracker === "mangas") {
      var totalCap = n(document.getElementById("m-cap-total").value);
      var atualCap = n(document.getElementById("m-cap-atual").value);
      var wrapMg = document.getElementById("modal-progress-wrap-mg");
      var fillMg = document.getElementById("modal-progress-fill-mg");
      var pctMg = document.getElementById("modal-progress-pct-mg");
      if (!wrapMg || !fillMg || !pctMg) return;
      if (totalCap > 0) {
        var vm = Math.max(0, Math.min(100, Math.round(atualCap / totalCap * 100)));
        fillMg.style.width = vm + "%";
        pctMg.textContent = vm + "%";
        wrapMg.style.display = "flex";
      } else {
        fillMg.style.width = "0%";
        pctMg.textContent = "0%";
        wrapMg.style.display = "none";
      }
      return;
    }
  }

  function updateFavToggle(input) {
    var icon = document.querySelector(".fav-toggle .fav-icon");
    if (!icon || !input) return;
    icon.textContent = input.checked ? "❤" : "🤍";
  }

  function handleImgUpload(event) {
    var file = event && event.target && event.target.files ? event.target.files[0] : null;
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var src = ev && ev.target ? String(ev.target.result || "") : "";
      if (!src) return;
      modalImg = src;
      var preview = document.getElementById("modal-preview");
      var zone = document.getElementById("img-zone");
      if (preview) preview.src = src;
      if (zone) zone.classList.add("has-img");
      updateModalHeroImage(src);
    };
    reader.readAsDataURL(file);
  }


  function buildCard(it, cfg) {
    var p = cfg.progress(it), pl = cfg.progressLabel(it), c = cfg.colors[it.status] || "#7a7590", r = cfg.ribbons[it.status] || "rgba(122,117,144,.6)";
    var stars = it.nota ? ("★".repeat(it.nota) + "☆".repeat(5 - it.nota)) : "";
    var img = it.img ? ('<img class="mc-img" src="' + esc(it.img) + '" alt="' + esc(it.titulo) + '" loading="lazy">') : ('<div class="mc-img-placeholder"><div class="ph-icon">' + cfg.icon + '</div><div class="ph-title">' + esc(it.titulo) + "</div></div>");
    return '<div class="mc ' + (it.fav ? "fav" : "") + '" data-edit-id="' + esc(it.id) + '">' + img +
      '<div class="mc-ribbon" style="background:' + r + ';color:#fff">' + esc(cfg.labels[it.status] || it.status) + "</div>" +
      (it.fav ? '<div class="mc-fav-badge">⭐</div>' : "") +
      '<div class="mc-body"><div class="mc-title">' + esc(it.titulo) + "</div>" +
      (it.autor ? '<div class="mc-author">' + esc(it.autor) + "</div>" : "") +
      (stars ? '<div class="mc-stars">' + stars + "</div>" : "") +
      (p !== null ? ('<div class="mc-progress-bar"><div class="mc-progress-fill" style="width:' + p + '%"></div></div>') : "") +
      '<div class="mc-bottom"><span class="mc-status-pill" style="color:' + c + ";border-color:" + c + '40;background:' + c + '18">' + esc(cfg.labels[it.status] || it.status) + "</span>" +
      (pl ? '<span class="mc-pct">' + esc(pl) + "</span>" : "") + "</div></div></div>";
  }

  function applyFilter(key, items) {
    var af = FILTER_APPLIED[key]; if (!af || !Object.keys(af).length) return items;
    return items.filter(function (x) {
      if (af.status && af.status.length && af.status.indexOf(x.status) < 0) return false;
      if (af.nota && af.nota.length && (x.nota || 0) < n(af.nota[0])) return false;
      if (af.fav && af.fav.indexOf("true") >= 0 && !x.fav) return false;
      if (af.comImg && af.comImg.indexOf("true") >= 0 && !x.img) return false;
      return true;
    });
  }

  function render(key) {
    var cfg = CFG[key], p = cfg.prefix;
    var sq = ((document.getElementById(p + "-search") || { value: "" }).value || "").toLowerCase();
    var items = S[key].filter(function (x) { return !sq || (x.titulo || "").toLowerCase().indexOf(sq) >= 0 || (x.autor || "").toLowerCase().indexOf(sq) >= 0 || (x.genero || "").toLowerCase().indexOf(sq) >= 0; });
    items = applyFilter(key, items);
    document.getElementById(p + "-total").textContent = S[key].length;
    document.getElementById(p + "-lendo").textContent = key === "cinema" ? S[key].filter(function (x) { return x.status === "assistindo"; }).length : S[key].filter(function (x) { return x.status === "lendo"; }).length;
    document.getElementById(p + "-done").textContent = S[key].filter(function (x) { return x.status === "concluido"; }).length;
    document.getElementById(p + "-fav").textContent = S[key].filter(function (x) { return x.fav; }).length;
    var unit = key === "livros" ? (items.length === 1 ? "livro" : "livros") : (key === "cinema" ? (items.length === 1 ? "titulo" : "titulos") : (items.length === 1 ? "manga" : "mangas"));
    document.getElementById(p + "-count-label").textContent = items.length + " " + unit + (sq ? " encontrados" : "");
    var pages = Math.max(1, Math.ceil(items.length / PER_PAGE)); if (PAGE[key] > pages) PAGE[key] = pages;
    var tabs = document.getElementById(key + "-tabs");
    tabs.innerHTML = pages <= 1 ? "" : Array.from({ length: pages }, function (_, i) { var s = i * PER_PAGE + 1, e = Math.min((i + 1) * PER_PAGE, items.length); return '<button class="ttab ' + (PAGE[key] === i + 1 ? "active" : "") + '" data-page="' + (i + 1) + '">Pagina ' + (i + 1) + ' <span style="font-size:9px;opacity:.6">(' + s + "-" + e + ")</span></button>"; }).join("");
    var pageItems = items.slice((PAGE[key] - 1) * PER_PAGE, PAGE[key] * PER_PAGE);
    var grid = document.getElementById(key + "-grid");
    grid.innerHTML = !items.length ? ('<div class="empty" style="grid-column:span 5"><div class="empty-icon">' + cfg.icon + "</div>" + cfg.empty + "</div>") : pageItems.map(function (x) { return buildCard(x, cfg); }).join("");
  }

  function openModal(key, id) {
    modalTracker = key; modalEditId = id || null; modalImg = ""; setStars(0);
    var cfg = CFG[key]; var type = key === "livros" ? "Livro" : (key === "cinema" ? "Filme / Serie" : "Manga");
    document.getElementById("modal-title").innerHTML = id ? ("Editar <em>" + type + "</em>") : ("Novo <em>" + type + "</em>");
    document.getElementById("modal-hero-badge").textContent = type;
    document.getElementById("m-status").innerHTML = cfg.status.map(function (s) { return '<option value="' + s + '">' + cfg.labels[s] + "</option>"; }).join("");
    document.getElementById("m-livros-extra").style.display = key === "livros" ? "" : "none";
    document.getElementById("m-cinema-extra").style.display = key === "cinema" ? "" : "none";
    document.getElementById("m-mangas-extra").style.display = key === "mangas" ? "" : "none";
    ["m-titulo", "m-autor", "m-genero", "m-obs", "m-paginas", "m-atual-pag", "m-cap-atual", "m-cap-total"].forEach(function (k) { document.getElementById(k).value = ""; });
    document.getElementById("m-fav").checked = false;
    document.querySelector(".fav-toggle .fav-icon").textContent = "🤍";
    document.getElementById("img-zone").classList.remove("has-img");
    document.getElementById("modal-preview").removeAttribute("src");
    document.getElementById("modal-status-row").style.display = "none";
    updateModalHeroImage("");
    document.getElementById("modal-del-btn").classList.toggle("visible", !!id);

    if (id) {
      var it = S[key].find(function (x) { return String(x.id) === String(id); });
      if (it) {
        document.getElementById("m-titulo").value = it.titulo || "";
        document.getElementById("m-autor").value = it.autor || "";
        document.getElementById("m-genero").value = it.genero || "";
        document.getElementById("m-obs").value = it.obs || "";
        document.getElementById("m-status").value = it.status || cfg.status[0];
        document.getElementById("m-fav").checked = !!it.fav;
        document.querySelector(".fav-toggle .fav-icon").textContent = it.fav ? "❤" : "🤍";
        if (it.nota) setStars(it.nota);
        document.getElementById("m-paginas").value = it.paginas || "";
        document.getElementById("m-atual-pag").value = it.atual || "";
        document.getElementById("m-cap-atual").value = it.capAtual || "";
        document.getElementById("m-cap-total").value = it.capTotal || "";
        document.getElementById("m-tipo-cinema").value = it.tipo || "Filme";
        if (it.img) { modalImg = it.img; document.getElementById("modal-preview").src = it.img; document.getElementById("img-zone").classList.add("has-img"); updateModalHeroImage(it.img); }
        document.getElementById("modal-status-row").style.display = "flex";
        updateModalStatusPill();
      }
    }
    updateModalHero();
    updateModalProgress();
    document.getElementById("tracker-modal").classList.add("open");
    setTimeout(function () { document.getElementById("m-titulo").focus(); }, 50);
  }

  function saveModal() {
    if (!modalTracker) return;
    var title = document.getElementById("m-titulo").value.trim();
    if (!title) return;
    var it = {
      id: modalEditId || (Date.now() + "_" + Math.floor(Math.random() * 100000)),
      titulo: title,
      autor: document.getElementById("m-autor").value.trim(),
      genero: document.getElementById("m-genero").value.trim(),
      obs: document.getElementById("m-obs").value.trim(),
      status: document.getElementById("m-status").value,
      nota: modalStar,
      fav: document.getElementById("m-fav").checked,
      img: modalImg,
      paginas: n(document.getElementById("m-paginas").value),
      atual: n(document.getElementById("m-atual-pag").value),
      capAtual: n(document.getElementById("m-cap-atual").value),
      capTotal: n(document.getElementById("m-cap-total").value),
      tipo: document.getElementById("m-tipo-cinema").value
    };
    if (modalEditId) {
      var i = S[modalTracker].findIndex(function (x) { return String(x.id) === String(modalEditId); });
      if (i >= 0) S[modalTracker][i] = it;
    } else S[modalTracker].push(it);
    save();
    render(modalTracker);
    document.getElementById("tracker-modal").classList.remove("open");
  }

  function mount(key) {
    var cfg = CFG[key], p = cfg.prefix;
    var root = document.querySelector("[data-tracker-root]");
    if (!root) return;
    root.innerHTML = '<section class="page-header"><div class="page-title-main">' + cfg.title + '</div><div class="page-subtitle-main">' + cfg.subtitle + '</div></section>' +
      '<div class="grid-4" style="margin-bottom:24px"><div class="card"><div class="card-title">Total</div><div class="card-big-num" id="' + p + '-total">0</div></div><div class="card"><div class="card-title">' + (key === "cinema" ? "Assistindo" : "Lendo") + '</div><div class="card-big-num" style="color:' + (key === "cinema" ? "var(--accent5)" : "var(--accent1)") + '" id="' + p + '-lendo">0</div></div><div class="card"><div class="card-title">Concluidos</div><div class="card-big-num" style="color:var(--accent3)" id="' + p + '-done">0</div></div><div class="card"><div class="card-title">Favoritos</div><div class="card-big-num" style="color:var(--accent4)" id="' + p + '-fav">0</div></div></div>' +
      '<div class="tracker-wrap-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:10px"><div><div style="font-size:14px;font-weight:700">' + cfg.listTitle + '</div><div class="tracker-count" id="' + p + '-count-label"></div></div><div style="display:flex;gap:8px"><input class="inp" id="' + p + '-search" placeholder="🔍 Buscar..." style="min-width:150px;flex:unset">' + (key === "livros" ? '<div class="filter-wrap" id="' + p + '-filter-wrap"><button class="btn-filter" id="' + p + '-filter-btn" type="button">⚙ Filtros <span class="filter-badge" id="' + p + '-filter-badge">0</span></button><div class="filter-panel" id="' + p + '-filter-panel"><div class="filter-section-title">Status</div><div class="filter-chips"><button class="filter-chip" data-filter="status" data-val="lendo" type="button">Lendo</button><button class="filter-chip" data-filter="status" data-val="concluido" type="button">Concluido</button><button class="filter-chip" data-filter="status" data-val="quero" type="button">Quero ler</button><button class="filter-chip" data-filter="status" data-val="pausado" type="button">Pausado</button></div><div class="filter-section-title">Avaliacao minima</div><div class="filter-chips"><button class="filter-chip" data-filter="nota" data-val="1" type="button">★ 1+</button><button class="filter-chip" data-filter="nota" data-val="2" type="button">★ 2+</button><button class="filter-chip" data-filter="nota" data-val="3" type="button">★ 3+</button><button class="filter-chip" data-filter="nota" data-val="4" type="button">★ 4+</button><button class="filter-chip" data-filter="nota" data-val="5" type="button">★ 5</button></div><div class="filter-section-title">Outros</div><div class="filter-chips"><button class="filter-chip" data-filter="fav" data-val="true" type="button">⭐ Favoritos</button><button class="filter-chip" data-filter="comImg" data-val="true" type="button">🖼 Com capa</button></div><div class="filter-divider"></div><div class="filter-actions"><button class="btn btn-primary" id="' + p + '-btn-apply" type="button">✓ Aplicar</button><button class="btn btn-ghost" id="' + p + '-btn-clear" type="button">✕ Limpar</button></div></div></div>' : "") + '<button class="btn btn-primary" id="' + p + '-add" type="button">+ Adicionar</button></div></div><div class="tracker-tabs" id="' + key + '-tabs"></div><div class="tracker-grid" id="' + key + '-grid"></div></div>' +
      '<div class="modal-backdrop" id="tracker-modal"><div class="modal"><button class="modal-close" id="modal-close-btn" title="Fechar">✕</button><div class="modal-hero"><div class="modal-hero-blur" id="modal-hero-blur"></div><div class="modal-hero-gradient"></div><div class="modal-hero-content"><div class="modal-hero-title" id="modal-hero-title"></div><div class="modal-hero-type-badge" id="modal-hero-badge"></div></div></div><div class="modal-body"><div class="modal-img-col"><div class="img-upload-zone" id="img-zone"><img id="modal-preview" src="" alt="preview"><div class="upload-hint"><span class="uh-icon">🖼️</span><span class="uh-text">Clique para<br>enviar capa</span><span class="uh-sub">JPG · PNG · WebP</span></div><div class="img-change-btn">✎ trocar</div></div><input type="file" id="modal-img-input" accept="image/*"><label class="fav-toggle"><input type="checkbox" id="m-fav"><span class="fav-icon">🤍</span><span>Favorito</span></label></div><div class="modal-fields-col"><div class="modal-top-bar"><div class="modal-title" id="modal-title">Adicionar</div></div><div class="modal-status-row" id="modal-status-row" style="display:none"><span class="modal-status-pill" id="modal-status-pill"></span></div><div class="mlabel">Titulo</div><div class="form-row" style="margin-bottom:10px"><input class="inp" id="m-titulo" placeholder="Titulo *" style="font-weight:600"></div><div class="mlabel">Autor · Genero</div><div class="form-row" style="margin-bottom:10px"><input class="inp" id="m-autor" placeholder="Autor / Criador"><input class="inp" id="m-genero" placeholder="Genero"></div><div class="mlabel">Status</div><select class="inp" id="m-status" style="margin-bottom:10px;width:100%"></select><div id="m-livros-extra"><div class="mlabel">Progresso de leitura</div><div class="form-row" style="margin-bottom:6px"><input class="inp" id="m-paginas" placeholder="Total de paginas" type="number"><input class="inp" id="m-atual-pag" placeholder="Pagina atual" type="number"></div><div class="modal-progress-wrap" id="modal-progress-wrap" style="display:none"><div class="modal-progress-bar-bg"><div class="modal-progress-bar-fill" id="modal-progress-fill" style="width:0%"></div></div><div class="modal-progress-pct" id="modal-progress-pct">0%</div></div></div><div id="m-cinema-extra" style="display:none"><div class="mlabel">Tipo</div><select class="inp" id="m-tipo-cinema" style="margin-bottom:10px;width:100%"><option>Filme</option><option>Serie</option><option>Documentario</option><option>Anime</option></select></div><div id="m-mangas-extra" style="display:none"><div class="mlabel">Progresso de capitulos</div><div class="form-row" style="margin-bottom:6px"><input class="inp" id="m-cap-atual" placeholder="Capitulo atual" type="number"><input class="inp" id="m-cap-total" placeholder="Total de caps" type="number"></div><div class="modal-progress-wrap" id="modal-progress-wrap-mg" style="display:none"><div class="modal-progress-bar-bg"><div class="modal-progress-bar-fill" id="modal-progress-fill-mg" style="width:0%"></div></div><div class="modal-progress-pct" id="modal-progress-pct-mg">0%</div></div></div><div class="mlabel">Avaliacao</div><div style="display:flex;align-items:center;gap:12px;margin-bottom:10px"><div class="modal-stars" id="modal-stars"><button class="mstar" data-v="1" type="button">★</button><button class="mstar" data-v="2" type="button">★</button><button class="mstar" data-v="3" type="button">★</button><button class="mstar" data-v="4" type="button">★</button><button class="mstar" data-v="5" type="button">★</button></div><span id="modal-star-label" style="font-size:10px;color:var(--muted);font-family:var(--font-mono)">Sem nota</span></div><div class="mlabel">Observacoes</div><textarea class="inp" id="m-obs" placeholder="Notas pessoais, sinopse, resenha..." style="width:100%;min-height:72px;resize:vertical;margin-bottom:4px"></textarea><div class="modal-related" id="modal-related" style="display:none"><div class="modal-related-title" id="modal-related-label">Relacionados</div><div class="related-scroll" id="modal-related-scroll"></div></div><div style="height:80px;flex-shrink:0"></div></div></div><div class="modal-footer"><div class="modal-actions"><button class="btn btn-primary btn-save" id="modal-save-btn" type="button">✓ Salvar</button><button class="btn btn-ghost" id="modal-cancel-btn" type="button">Cancelar</button><button class="btn btn-danger" id="modal-del-btn" type="button">🗑</button></div></div><div class="modal-layout" style="display:none"></div></div></div>';

    document.getElementById(p + "-search").addEventListener("input", function () { PAGE[key] = 1; render(key); });
    document.getElementById(key + "-tabs").addEventListener("click", function (e) { var t = e.target; if (!(t instanceof HTMLElement)) return; var tab = t.closest("[data-page]"); if (!tab) return; PAGE[key] = n(tab.getAttribute("data-page")) || 1; render(key); });
    document.getElementById(key + "-grid").addEventListener("click", function (e) { var t = e.target; if (!(t instanceof HTMLElement)) return; var card = t.closest("[data-edit-id]"); if (!card) return; openModal(key, card.getAttribute("data-edit-id")); });
    document.getElementById(p + "-add").addEventListener("click", function () { openModal(key); });
    if (key === "livros") {
      document.getElementById(p + "-filter-btn").addEventListener("click", function () { document.getElementById(p + "-filter-panel").classList.toggle("open"); });
      document.querySelectorAll("#" + p + "-filter-panel .filter-chip").forEach(function (chip) { chip.addEventListener("click", function () { if (chip.getAttribute("data-filter") === "nota") chip.closest(".filter-chips").querySelectorAll(".filter-chip").forEach(function (c) { if (c !== chip) c.classList.remove("selected"); }); chip.classList.toggle("selected"); FILTER_PENDING[key] = {}; document.querySelectorAll("#" + p + "-filter-panel .filter-chip.selected").forEach(function (c) { var f = c.getAttribute("data-filter"), v = c.getAttribute("data-val"); if (!FILTER_PENDING[key][f]) FILTER_PENDING[key][f] = []; FILTER_PENDING[key][f].push(v); }); }); });
      document.getElementById(p + "-btn-apply").addEventListener("click", function () { FILTER_APPLIED[key] = JSON.parse(JSON.stringify(FILTER_PENDING[key])); var cnt = Object.values(FILTER_APPLIED[key]).flat().length; document.getElementById(p + "-filter-btn").classList.toggle("active", cnt > 0); document.getElementById(p + "-filter-badge").textContent = cnt; document.getElementById(p + "-filter-panel").classList.remove("open"); PAGE[key] = 1; render(key); });
      document.getElementById(p + "-btn-clear").addEventListener("click", function () { FILTER_PENDING[key] = {}; FILTER_APPLIED[key] = {}; document.getElementById(p + "-filter-btn").classList.remove("active"); document.getElementById(p + "-filter-badge").textContent = "0"; document.querySelectorAll("#" + p + "-filter-panel .filter-chip.selected").forEach(function (c) { c.classList.remove("selected"); }); document.getElementById(p + "-filter-panel").classList.remove("open"); PAGE[key] = 1; render(key); });
    }

    document.getElementById("modal-close-btn").addEventListener("click", function () { document.getElementById("tracker-modal").classList.remove("open"); });
    document.getElementById("modal-cancel-btn").addEventListener("click", function () { document.getElementById("tracker-modal").classList.remove("open"); });
    document.getElementById("tracker-modal").addEventListener("click", function (e) { if (e.target && e.target.id === "tracker-modal") document.getElementById("tracker-modal").classList.remove("open"); });
    document.getElementById("modal-save-btn").addEventListener("click", saveModal);
    document.getElementById("modal-del-btn").addEventListener("click", function () {
      if (!modalTracker || !modalEditId) return;
      S[modalTracker] = S[modalTracker].filter(function (x) { return String(x.id) !== String(modalEditId); });
      save();
      render(modalTracker);
      document.getElementById("tracker-modal").classList.remove("open");
    });
    document.getElementById("m-titulo").addEventListener("input", updateModalHero);
    document.getElementById("m-status").addEventListener("change", updateModalStatusPill);
    document.getElementById("m-paginas").addEventListener("input", updateModalProgress);
    document.getElementById("m-atual-pag").addEventListener("input", updateModalProgress);
    document.getElementById("m-cap-atual").addEventListener("input", updateModalProgress);
    document.getElementById("m-cap-total").addEventListener("input", updateModalProgress);
    document.getElementById("m-fav").addEventListener("change", function () { updateFavToggle(this); });
    document.getElementById("img-zone").addEventListener("click", function () { document.getElementById("modal-img-input").click(); });
    document.getElementById("modal-img-input").addEventListener("change", handleImgUpload);
    document.querySelectorAll(".mstar").forEach(function (b) { b.addEventListener("click", function () { setStars(n(b.getAttribute("data-v"))); }); });

    render(key);
  }

  function init(options) {
    load();
    if (migratedLegacyData) save();
    var key = (options && options.tracker) || document.body.getAttribute("data-page") || "livros";
    mount(key);
  }

  window.SoterTracker = { init: init };
}());
