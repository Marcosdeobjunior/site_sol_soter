(function () {
  "use strict";

  var STORAGE_KEY = "sol_de_soter_site_v1";
  var DEFAULT_STATE = {
    profile: {
      name: "Usuário",
      avatar: ""
    },
    data: {}
  };

  function currentPage() {
    var explicit = document.body.getAttribute("data-page");
    if (explicit) return explicit;
    var file = location.pathname.split("/").pop().toLowerCase();
    if (!file || file === "index.html" || file === "index.htm") return "home";
    return file.replace(".html", "");
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function ensureStateShape(raw) {
    var state = raw && typeof raw === "object" ? raw : {};
    if (!state.profile || typeof state.profile !== "object") state.profile = {};
    if (typeof state.profile.name !== "string" || !state.profile.name.trim()) state.profile.name = DEFAULT_STATE.profile.name;
    if (typeof state.profile.avatar !== "string") state.profile.avatar = "";
    if (!state.data || typeof state.data !== "object") state.data = {};
    return state;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        var fresh = deepClone(DEFAULT_STATE);
        saveState(fresh);
        return fresh;
      }
      return ensureStateShape(JSON.parse(raw));
    } catch (err) {
      var fallback = deepClone(DEFAULT_STATE);
      saveState(fallback);
      return fallback;
    }
  }

  function isQuotaError(err) {
    if (!err) return false;
    if (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
    return typeof err.message === "string" && err.message.toLowerCase().indexOf("quota") >= 0;
  }

  function pruneDataUrls(input) {
    var clone = deepClone(input);
    var removed = 0;
    var imageKeyHints = {
      img: true,
      imagem: true,
      image: true,
      capa: true,
      cover: true,
      avatar: true,
      foto: true,
      photo: true
    };

    function walk(node, parent, key) {
      if (!node) return;
      if (typeof node === "string") {
        var isDataUrl = node.indexOf("data:image/") === 0;
        if (isDataUrl && parent) {
          parent[key] = "";
          removed += 1;
        }
        return;
      }
      if (Array.isArray(node)) {
        node.forEach(function (item, idx) { walk(item, node, idx); });
        return;
      }
      if (typeof node === "object") {
        Object.keys(node).forEach(function (k) {
          var value = node[k];
          if (typeof value === "string" && imageKeyHints[String(k).toLowerCase()] && value.indexOf("data:image/") === 0) {
            node[k] = "";
            removed += 1;
            return;
          }
          walk(value, node, k);
        });
      }
    }

    walk(clone, null, null);
    return { state: clone, removed: removed };
  }

  function saveState(state) {
    var shaped = ensureStateShape(state);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shaped));
      return;
    } catch (err) {
      if (!isQuotaError(err)) throw err;
      var pruned = pruneDataUrls(shaped);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned.state));
        if (pruned.removed > 0) {
          console.warn("[SoterStorage] Storage cheio: " + pruned.removed + " imagem(ns) foram removidas para salvar os dados.");
        }
        return;
      } catch (err2) {
        if (!isQuotaError(err2)) throw err2;
        console.error("[SoterStorage] Falha ao salvar: limite de armazenamento excedido mesmo apos limpeza.");
        throw err2;
      }
    }
  }

  function getInitials(name) {
    var cleaned = (name || "").trim();
    if (!cleaned) return "?";
    var parts = cleaned.split(/\s+/).slice(0, 2);
    return parts.map(function (p) { return p.charAt(0).toUpperCase(); }).join("");
  }

  var RPG_XP = {
    livro: 30,
    cinema: 15,
    manga: 20,
    treino: 25,
    estudoHora: 20,
    tarefa: 10,
    sonho: 15,
    viagem: 50
  };

  var RPG_TITLES = [
    "Iniciante", "Aprendiz", "Explorador", "Aventureiro", "Viajante",
    "Veterano", "Especialista", "Mestre", "Grao-Mestre", "Lendario"
  ];

  var RPG_CLASSES = {
    scholar: { name: "Sabio" },
    warrior: { name: "Guerreiro" },
    explorer: { name: "Explorador" },
    artist: { name: "Artista" },
    mage: { name: "Mago" },
    ranger: { name: "Ranger" }
  };

  var RPG_MISSION_XP = {
    m_leitura: 20,
    m_treino: 30,
    m_tarefa: 15,
    m_estudo: 25,
    m_sonho: 10,
    m_cinema: 15,
    m_manga: 12,
    m_wishlist: 8
  };

  function ensureRpgShape(state) {
    state = ensureStateShape(state);
    if (!state.data.rpg || typeof state.data.rpg !== "object") state.data.rpg = {};
    if (!state.data.rpg.classe) state.data.rpg.classe = "scholar";
    if (!state.data.rpg.missions || typeof state.data.rpg.missions !== "object") state.data.rpg.missions = {};
    if (!state.data.rpg.missionRewards || typeof state.data.rpg.missionRewards !== "object") state.data.rpg.missionRewards = {};
    if (!Array.isArray(state.data.rpg.log)) state.data.rpg.log = [];
    return state;
  }

  function pickArray(data, keys) {
    var i;
    for (i = 0; i < keys.length; i += 1) {
      if (Array.isArray(data[keys[i]])) return data[keys[i]];
    }
    return [];
  }

  function getLivros(state) { return pickArray(state.data, ["trackerLivraria", "trackerLivros", "livros", "livraria"]); }
  function getCinema(state) { return pickArray(state.data, ["trackerCinema", "trackerFilmes", "trackerSeries", "cinema", "filmes"]); }
  function getMangas(state) { return pickArray(state.data, ["trackerMangas", "trackerManga", "mangas"]); }
  function getTasks(state) { return pickArray(state.data, ["tasks", "tarefas"]); }
  function getGym(state) { return pickArray(state.data, ["academia", "gym", "treinos", "workouts"]); }
  function getEstudos(state) { return pickArray(state.data, ["estudos"]); }
  function getViagens(state) { return pickArray(state.data, ["viagens", "travels"]); }

  function getSonhos(state) {
    var data = state.data || {};
    if (data.sonhosHub && Array.isArray(data.sonhosHub.sonhos)) return data.sonhosHub.sonhos;
    return pickArray(data, ["sonhos"]);
  }

  function norm(v) {
    return String(v == null ? "" : v).trim().toLowerCase();
  }

  function isDoneLivro(item) { return item && norm(item.status) === "concluido"; }
  function isDoneCinema(item) { return item && norm(item.status) === "concluido"; }
  function isDoneManga(item) { return item && norm(item.status) === "concluido"; }
  function isDoneTask(item) { return !!(item && item.done); }
  function isVisitedViagem(item) { return ["feito", "visitado", "concluido"].indexOf(norm(item && item.status)) >= 0; }
  function getEstudosHoras(state) {
    return getEstudos(state).reduce(function (acc, item) {
      return acc + Number(item && item.horas || 0);
    }, 0);
  }

  function isDoneStudyItem(item) {
    if (!item || typeof item !== "object") return false;
    if (item.done || item.completed || item.concluida || item.concluido || item.revisado) return true;
    if (Number(item.progress || item.progresso || 0) >= 100) return true;
    return ["concluido", "concluida", "feito", "feita", "completed", "done", "revisado", "revisada"].indexOf(norm(item.status)) >= 0;
  }

  function xpForLevel(level) { return level * 100 + (level - 1) * 50; }
  function getLevelFromXp(xp) {
    var level = 1;
    while (xp >= xpForLevel(level + 1)) level += 1;
    return level;
  }

  function calcRpgXp(state) {
    state = ensureRpgShape(state);
    var total = getLivros(state).filter(isDoneLivro).length * RPG_XP.livro +
      getCinema(state).filter(isDoneCinema).length * RPG_XP.cinema +
      getMangas(state).filter(isDoneManga).length * RPG_XP.manga +
      getGym(state).length * RPG_XP.treino +
      getEstudosHoras(state) * RPG_XP.estudoHora +
      getTasks(state).filter(isDoneTask).length * RPG_XP.tarefa +
      getSonhos(state).length * RPG_XP.sonho +
      getViagens(state).filter(isVisitedViagem).length * RPG_XP.viagem;
    Object.keys(state.data.rpg.missionRewards || {}).forEach(function (dateKey) {
      var rewards = state.data.rpg.missionRewards[dateKey];
      if (!rewards || typeof rewards !== "object") return;
      Object.keys(rewards).forEach(function (missionId) {
        total += Number(rewards[missionId] || 0);
      });
    });
    return total;
  }

  function findByIdOrName(items, item) {
    if (!item) return null;
    var itemId = item.id;
    var itemTitle = norm(item.titulo || item.title || item.nome);
    return (items || []).find(function (candidate) {
      if (itemId != null && candidate && candidate.id != null) return String(candidate.id) === String(itemId);
      return norm(candidate && (candidate.titulo || candidate.title || candidate.nome)) === itemTitle;
    }) || null;
  }

  function hasBookProgressUpdate(prevState, nextState) {
    var prev = getLivros(prevState);
    var next = getLivros(nextState);
    return next.some(function (book) {
      var before = findByIdOrName(prev, book);
      if (!before) return Number(book && book.atual || 0) > 0;
      return Number(book && book.atual || 0) !== Number(before && before.atual || 0);
    });
  }

  function hasNewCompletedTask(prevState, nextState) {
    var prev = getTasks(prevState);
    var next = getTasks(nextState);
    return next.some(function (task) {
      var before = findByIdOrName(prev, task);
      return !!(task && task.done) && !(before && before.done);
    });
  }

  function hasNewCompletedStudy(prevState, nextState) {
    var prev = getEstudos(prevState);
    var next = getEstudos(nextState);
    return next.some(function (entry) {
      var before = findByIdOrName(prev, entry);
      return isDoneStudyItem(entry) && !isDoneStudyItem(before);
    });
  }

  function hasNewWorkout(prevState, nextState) {
    return getGym(nextState).length > getGym(prevState).length;
  }

  function syncRpgState(nextState, previousState) {
    var state = ensureRpgShape(nextState);
    var prev = ensureRpgShape(previousState || loadState());
    var today = new Date().toISOString().slice(0, 10);

    if (state.data.rpg.missionsDate !== today) {
      state.data.rpg.missions = {};
      state.data.rpg.missionsDate = today;
    }

    if (hasBookProgressUpdate(prev, state)) state.data.rpg.missions.m_leitura = true;
    if (hasNewCompletedTask(prev, state)) state.data.rpg.missions.m_tarefa = true;
    if (hasNewCompletedStudy(prev, state)) state.data.rpg.missions.m_estudo = true;
    if (hasNewWorkout(prev, state)) state.data.rpg.missions.m_treino = true;

    if (!state.data.rpg.missionRewards[today] || typeof state.data.rpg.missionRewards[today] !== "object") {
      state.data.rpg.missionRewards[today] = {};
    }

    Object.keys(state.data.rpg.missions).forEach(function (missionId) {
      if (!state.data.rpg.missions[missionId]) return;
      if (state.data.rpg.missionRewards[today][missionId] != null) return;
      state.data.rpg.missionRewards[today][missionId] = Number(RPG_MISSION_XP[missionId] || 0);
    });

    return state;
  }

  function renderRpgHeader(state) {
    state = ensureRpgShape(state);
    var xp = Math.round(calcRpgXp(state));
    var level = getLevelFromXp(xp);
    var xpThisLevel = xpForLevel(level);
    var xpNext = xpForLevel(level + 1);
    var pct = xpNext > xpThisLevel ? Math.max(0, Math.min(100, Math.round((xp - xpThisLevel) / (xpNext - xpThisLevel) * 100))) : 100;
    var cls = RPG_CLASSES[state.data.rpg.classe] || RPG_CLASSES.scholar;
    var title = RPG_TITLES[Math.min(level - 1, RPG_TITLES.length - 1)];

    var headerLevel = document.getElementById("header-level-badge");
    var headerFill = document.getElementById("header-xp-fill");
    var pmTitle = document.getElementById("pm-title-display");
    var pmXpText = document.getElementById("pm-xp-text");
    var pmXpNext = document.getElementById("pm-xp-next");
    var pmXpFill = document.getElementById("pm-xp-fill");

    if (headerLevel) headerLevel.textContent = "Nv " + level;
    if (headerFill) headerFill.style.width = pct + "%";
    if (pmTitle) pmTitle.textContent = title + " · " + cls.name + " · Nível " + level;
    if (pmXpText) pmXpText.textContent = xp.toLocaleString("pt-BR") + " XP";
    if (pmXpNext) pmXpNext.textContent = "próx. nível: " + xpNext.toLocaleString("pt-BR") + " XP";
    if (pmXpFill) pmXpFill.style.width = pct + "%";
  }

  function applySiteState(nextState, previousState) {
    var state = syncRpgState(nextState, previousState);
    saveState(state);
    applyProfileToUI(state);
    renderNotifications(state);
    renderRpgHeader(state);
    return state;
  }

  window.SoterRPG = {
    calcXP: function (state) { return calcRpgXp(state || loadState()); },
    xpForLevel: xpForLevel,
    getLevel: function (xp) { return getLevelFromXp(xp); },
    syncState: function (state, previousState) { return syncRpgState(state, previousState); },
    renderHeaderProgress: function (state) { renderRpgHeader(state || loadState()); }
  };

  function applyProfileToUI(state) {
    var profile = state.profile;
    var displayName = profile.name && profile.name.trim() ? profile.name.trim() : DEFAULT_STATE.profile.name;
    var hasAvatar = !!profile.avatar;

    var headerName = document.getElementById("header-profile-name");
    var pmName = document.getElementById("pm-name-display");
    var nameInput = document.getElementById("pm-name-input");
    var initials = document.getElementById("header-initials");
    var avatar = document.getElementById("header-avatar");
    var avatarImg = document.getElementById("header-avatar-img");

    if (headerName) headerName.textContent = displayName;
    if (pmName) pmName.textContent = displayName;
    if (nameInput) nameInput.value = displayName;
    if (initials) initials.textContent = getInitials(displayName);

    if (avatar && avatarImg) {
      if (hasAvatar) {
        avatar.classList.add("has-photo");
        avatarImg.src = profile.avatar;
      } else {
        avatar.classList.remove("has-photo");
        avatarImg.removeAttribute("src");
      }
    }
  }

  function compressImageDataUrl(file, callback) {
    var reader = new FileReader();
    reader.onload = function (event) {
      var img = new Image();
      img.onload = function () {
        var maxSize = 320;
        var w = img.width;
        var h = img.height;
        var ratio = Math.min(maxSize / w, maxSize / h, 1);
        var outW = Math.round(w * ratio);
        var outH = Math.round(h * ratio);

        var canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        canvas.getContext("2d").drawImage(img, 0, 0, outW, outH);
        callback(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function wireProfileControls(state) {
    var nameInput = document.getElementById("pm-name-input");
    var avatarInput = document.getElementById("pm-avatar-input");
    var changePhotoBtn = document.getElementById("pm-avatar-change-btn");
    var removePhotoBtn = document.getElementById("pm-avatar-remove-btn");

    if (nameInput) {
      nameInput.addEventListener("input", function () {
        var value = nameInput.value.trim();
        state.profile.name = value || DEFAULT_STATE.profile.name;
        state = applySiteState(state, loadState());
      });
    }

    if (changePhotoBtn && avatarInput) {
      changePhotoBtn.addEventListener("click", function () {
        avatarInput.click();
      });
    }

    if (avatarInput) {
      avatarInput.addEventListener("change", function (event) {
        var file = event.target.files && event.target.files[0];
        if (!file) return;
        compressImageDataUrl(file, function (dataUrl) {
          state.profile.avatar = dataUrl;
          state = applySiteState(state, loadState());
          avatarInput.value = "";
        });
      });
    }

    if (removePhotoBtn) {
      removePhotoBtn.addEventListener("click", function () {
        state.profile.name = DEFAULT_STATE.profile.name;
        state.profile.avatar = "";
        state = applySiteState(state, loadState());
      });
    }
  }

  function renderHeader() {
    var mount = document.querySelector("[data-app-header]");
    if (!mount) return;

    mount.innerHTML = [
      '<header class="site-header" id="site-header">',
      '  <a class="header-brand" href="index.html"><em>Sól</em> de Sóter</a>',
      '  <nav class="header-nav" id="header-nav">',
      '    <div style="flex:1"></div>',
      '    <a class="hn-link" data-page="home" href="index.html">Home</a>',
      '    <div class="hn-dropdown" id="dd-pessoal">',
      '      <button class="hn-dropdown-trigger" tabindex="0">Pessoal <span class="hn-chevron">▾</span></button>',
      '      <div class="hn-menu">',
      '        <a class="hn-menu-item" data-page="sonhos" href="sonhos.html">Sonhos</a>',
      '        <a class="hn-menu-item" data-page="viagens" href="viagens.html">Viagens</a>',
      '        <a class="hn-menu-item" data-page="wishlist" href="wishlist.html">Wishlist</a>',
      '        <a class="hn-menu-item" data-page="financas" href="financas.html">Finanças</a>',
      '        <a class="hn-menu-item" data-page="tarefas" href="tarefas.html">Planejamento</a>',
      '        <a class="hn-menu-item" data-page="academia" href="academia.html">Academia</a>',
      '      </div>',
      '    </div>',
      '    <div class="hn-dropdown" id="dd-estudos">',
      '      <button class="hn-dropdown-trigger" tabindex="0">Estudos <span class="hn-chevron">▾</span></button>',
      '      <div class="hn-menu">',
      '        <a class="hn-menu-item" data-page="estudos" href="estudos.html">Revisão</a>',
      '      </div>',
      '    </div>',
      '    <div class="hn-dropdown" id="dd-biblioteca">',
      '      <button class="hn-dropdown-trigger" tabindex="0">Biblioteca <span class="hn-chevron">▾</span></button>',
      '      <div class="hn-menu">',
      '        <a class="hn-menu-item" data-page="livros" href="livros.html">Livraria</a>',
      '        <a class="hn-menu-item" data-page="cinema" href="cinema.html">Cinema</a>',
      '        <a class="hn-menu-item" data-page="mangas" href="mangas.html">Mangás</a>',
      '      </div>',
      '    </div>',
      '  </nav>',
      '  <div class="hn-dropdown hn-notif" id="dd-notif">',
      '    <button class="hn-dropdown-trigger hn-notif-trigger" tabindex="0" aria-label="Notificações">🔔 <span class="hn-notif-badge" id="notif-count">0</span></button>',
      '    <div class="hn-menu hn-notif-menu">',
      '      <div class="hn-notif-head"><span>Notificações</span><button type="button" class="hn-notif-clear" id="notif-clear-btn">Limpar</button></div>',
      '      <div class="hn-notif-list" id="notif-list"></div>',
      '    </div>',
      '  </div>',
      '  <div class="header-balance">',
      '    <div>',
      '      <div class="balance-label">Saldo</div>',
      '      <div class="balance-value" id="header-balance-val">R$ 0,00</div>',
      '    </div>',
      '  </div>',
      '  <div class="profile-widget" id="profile-widget">',
      '    <button class="profile-trigger" id="profile-trigger" type="button">',
      '      <div class="profile-avatar" id="header-avatar">',
      '        <img id="header-avatar-img" src="" alt="">',
      '        <span class="avatar-initials" id="header-initials">?</span>',
      '      </div>',
      '      <div class="profile-info">',
      '        <div class="profile-name" id="header-profile-name">Usuário</div>',
      '        <div class="profile-level-row">',
      '          <span class="profile-level-badge" id="header-level-badge">Nv 1</span>',
      '          <div class="profile-xp-bar"><div class="profile-xp-fill" id="header-xp-fill" style="width:0%"></div></div>',
      '        </div>',
      '      </div>',
      '      <span class="profile-chevron">▾</span>',
      '    </button>',
      '    <div class="profile-menu" id="profile-menu">',
      '      <div class="pm-header">',
      '        <div class="pm-name" id="pm-name-display">Usuário</div>',
      '        <div class="pm-title" id="pm-title-display">Viajante Nível 1</div>',
      '        <div class="pm-xp-row">',
      '          <span id="pm-xp-text">0 XP</span>',
      '          <span id="pm-xp-next">próx. nível: 100 XP</span>',
      '        </div>',
      '        <div class="pm-xp-bar"><div class="pm-xp-fill" id="pm-xp-fill" style="width:0%"></div></div>',
      '      </div>',
      '      <div class="pm-edit-zone">',
      '        <div class="pm-edit-label">Seu nome</div>',
      '        <input class="pm-name-input" id="pm-name-input" placeholder="Como quer ser chamado?">',
      '        <div class="pm-edit-label" style="margin-top:8px">Foto de perfil</div>',
      '        <div class="pm-avatar-upload">',
      '          <button class="pm-avatar-btn" id="pm-avatar-change-btn" type="button">📷 Trocar foto</button>',
      '          <button class="pm-avatar-btn" id="pm-avatar-remove-btn" type="button">✕ Remover</button>',
      '        </div>',
      '        <input type="file" id="pm-avatar-input" accept="image/*">',
      '      </div>',
      '      <div class="pm-divider"></div>',
      '      <a class="pm-item" href="rpg.html">RPG</a>',
      '      <a class="pm-item" href="armazenamento.html">Armazenamento</a>',
      '    </div>',
      '  </div>',
      '</header>'
    ].join("\n");
  }

  function getDefaultNotifications() {
    return [
      { id: Date.now() + 1, text: "Revisão de Estudos pendente." },
      { id: Date.now() + 2, text: "Meta semanal ainda não concluída." },
      { id: Date.now() + 3, text: "Adicione novos itens à biblioteca." }
    ];
  }

  function ensureNotifications(state) {
    if (!state.data || typeof state.data !== "object") state.data = {};
    if (!Array.isArray(state.data.notifications)) {
      state.data.notifications = getDefaultNotifications();
      saveState(state);
    }
    return state.data.notifications;
  }

  function renderNotifications(state) {
    var list = document.getElementById("notif-list");
    var count = document.getElementById("notif-count");
    if (!list || !count) return;

    var notifications = ensureNotifications(state);
    count.textContent = String(notifications.length);
    count.style.display = notifications.length ? "inline-flex" : "none";

    if (!notifications.length) {
      list.innerHTML = '<div class="hn-notif-empty">Sem notificações</div>';
      return;
    }

    list.innerHTML = notifications.map(function (n) {
      return '<div class="hn-notif-item"><span class="hn-notif-text">' + n.text + '</span><button type="button" class="hn-notif-remove" data-notif-id="' + n.id + '" aria-label="Remover notificação">✕</button></div>';
    }).join("");
  }

  function wireNotifications(state) {
    var list = document.getElementById("notif-list");
    var clearBtn = document.getElementById("notif-clear-btn");
    if (!list || !clearBtn) return;

    clearBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      state.data.notifications = [];
      saveState(state);
      renderNotifications(state);
    });

    list.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-notif-id]");
      if (!btn) return;
      event.preventDefault();
      event.stopPropagation();
      var id = Number(btn.getAttribute("data-notif-id"));
      state.data.notifications = ensureNotifications(state).filter(function (n) { return n.id !== id; });
      saveState(state);
      renderNotifications(state);
    });
  }
  function renderFooter() {
    var mount = document.querySelector("[data-app-footer]");
    if (!mount) return;

    var year = String(new Date().getFullYear());
    mount.innerHTML = [
      '<footer class="site-footer">',
      "  <div>",
      '    <div class="footer-brand"><em>Sól</em> de Sóter</div>',
      '    <div class="footer-tagline">Espaço pessoal · tudo em um só lugar</div>',
      "  </div>",
      '  <div class="footer-links">',
      '    <a class="footer-link" href="index.html">Home</a>',
      '    <a class="footer-link" href="livros.html">Livraria</a>',
      '    <a class="footer-link" href="cinema.html">Cinema</a>',
      '    <a class="footer-link" href="sonhos.html">Sonhos</a>',
      '    <a class="footer-link" href="financas.html">Finanças</a>',
      '    <a class="footer-link" href="tarefas.html">Planejamento</a>',
      "  </div>",
      '  <div class="footer-copy">✦ Sól de Sóter · <span id="footer-year">' + year + "</span></div>",
      "</footer>"
    ].join("\n");
  }

  function highlightCurrentPage() {
    var page = currentPage();
    document.querySelectorAll("[data-page]").forEach(function (node) {
      if (node.getAttribute("data-page") === page) {
        node.classList.add("active");
      }
    });

    var bibliotecaPages = ["livros", "cinema", "mangas"];
    var pessoalPages = ["sonhos", "viagens", "wishlist", "financas", "tarefas", "academia"];

    if (bibliotecaPages.indexOf(page) >= 0) {
      var ddB = document.getElementById("dd-biblioteca");
      if (ddB) ddB.classList.add("has-active");
    }

    if (pessoalPages.indexOf(page) >= 0) {
      var ddP = document.getElementById("dd-pessoal");
      if (ddP) ddP.classList.add("has-active");
    }

    if (page === "estudos") {
      var ddE = document.getElementById("dd-estudos");
      if (ddE) ddE.classList.add("has-active");
    }
  }

  function wireIndexNavigation() {
    document.querySelectorAll('a[href="index.html"]').forEach(function (link) {
      link.addEventListener("click", function () {
        sessionStorage.setItem("soter_allow_index", "1");
      });
    });
  }

  function exposeStorageApi(state) {
    function commit(nextState) {
      var previousState = loadState();
      state = applySiteState(nextState, previousState);
      return state;
    }

    window.SoterStorage = {
      load: function () { return loadState(); },
      save: function (nextState) { return commit(nextState); },
      getState: function () { return ensureStateShape(loadState()); },
      setData: function (key, value) {
        state = ensureStateShape(loadState());
        state.data[key] = value;
        return commit(state);
      },
      getData: function (key) {
        state = ensureStateShape(loadState());
        return state.data[key];
      }
    };
  }

  renderHeader();
  renderFooter();
  wireIndexNavigation();
  highlightCurrentPage();

  var siteState = loadState();
  siteState = syncRpgState(siteState, siteState);
  saveState(siteState);
  applyProfileToUI(siteState);
  wireProfileControls(siteState);
  renderNotifications(siteState);
  wireNotifications(siteState);
  renderRpgHeader(siteState);
  exposeStorageApi(siteState);
}());



