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

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ensureStateShape(state)));
  }

  function getInitials(name) {
    var cleaned = (name || "").trim();
    if (!cleaned) return "?";
    var parts = cleaned.split(/\s+/).slice(0, 2);
    return parts.map(function (p) { return p.charAt(0).toUpperCase(); }).join("");
  }

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
        saveState(state);
        applyProfileToUI(state);
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
          saveState(state);
          applyProfileToUI(state);
          avatarInput.value = "";
        });
      });
    }

    if (removePhotoBtn) {
      removePhotoBtn.addEventListener("click", function () {
        state.profile.name = DEFAULT_STATE.profile.name;
        state.profile.avatar = "";
        saveState(state);
        applyProfileToUI(state);
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
    window.SoterStorage = {
      load: function () { return loadState(); },
      save: function (nextState) { saveState(nextState); },
      getState: function () { return ensureStateShape(loadState()); },
      setData: function (key, value) {
        state.data[key] = value;
        saveState(state);
      },
      getData: function (key) {
        return state.data[key];
      }
    };
  }

  renderHeader();
  renderFooter();
  wireIndexNavigation();
  highlightCurrentPage();

  var siteState = loadState();
  applyProfileToUI(siteState);
  wireProfileControls(siteState);
  renderNotifications(siteState);
  wireNotifications(siteState);
  exposeStorageApi(siteState);
}());



