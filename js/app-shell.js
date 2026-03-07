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
      '    <div class="hn-dropdown" id="dd-biblioteca">',
      '      <button class="hn-dropdown-trigger" tabindex="0">Biblioteca <span class="hn-chevron">▾</span></button>',
      '      <div class="hn-menu">',
      '        <a class="hn-menu-item" data-page="livros" href="#">Livraria</a>',
      '        <a class="hn-menu-item" data-page="cinema" href="#">Cinema</a>',
      '        <a class="hn-menu-item" data-page="mangas" href="#">Mangás</a>',
      "      </div>",
      "    </div>",
      '    <div class="hn-dropdown" id="dd-pessoal">',
      '      <button class="hn-dropdown-trigger" tabindex="0">Pessoal <span class="hn-chevron">▾</span></button>',
      '      <div class="hn-menu">',
      '        <a class="hn-menu-item" data-page="sonhos" href="#">Sonhos</a>',
      '        <a class="hn-menu-item" data-page="viagens" href="#">Viagens</a>',
      '        <a class="hn-menu-item" data-page="wishlist" href="#">Wishlist</a>',
      '        <a class="hn-menu-item" data-page="financas" href="#">Finanças</a>',
      '        <a class="hn-menu-item" data-page="tarefas" href="#">Planejamento</a>',
      '        <a class="hn-menu-item" data-page="academia" href="#">Academia</a>',
      '        <a class="hn-menu-item" data-page="estudos" href="#">Estudos</a>',
      "      </div>",
      "    </div>",
      "  </nav>",
      '  <div class="header-balance">',
      "    <div>",
      '      <div class="balance-label">Saldo</div>',
      '      <div class="balance-value" id="header-balance-val">R$ 0,00</div>',
      "    </div>",
      "  </div>",
      '  <div class="profile-widget" id="profile-widget">',
      '    <button class="profile-trigger" id="profile-trigger" type="button">',
      '      <div class="profile-avatar" id="header-avatar">',
      '        <img id="header-avatar-img" src="" alt="">',
      '        <span class="avatar-initials" id="header-initials">?</span>',
      "      </div>",
      '      <div class="profile-info">',
      '        <div class="profile-name" id="header-profile-name">Usuário</div>',
      '        <div class="profile-level-row">',
      '          <span class="profile-level-badge" id="header-level-badge">Nv 1</span>',
      '          <div class="profile-xp-bar"><div class="profile-xp-fill" id="header-xp-fill" style="width:0%"></div></div>',
      "        </div>",
      "      </div>",
      '      <span class="profile-chevron">▾</span>',
      "    </button>",
      '    <div class="profile-menu" id="profile-menu">',
      '      <div class="pm-header">',
      '        <div class="pm-name" id="pm-name-display">Usuário</div>',
      '        <div class="pm-title" id="pm-title-display">Viajante Nível 1</div>',
      '        <div class="pm-xp-row">',
      '          <span id="pm-xp-text">0 XP</span>',
      '          <span id="pm-xp-next">próx. nível: 100 XP</span>',
      "        </div>",
      '        <div class="pm-xp-bar"><div class="pm-xp-fill" id="pm-xp-fill" style="width:0%"></div></div>',
      "      </div>",
      '      <div class="pm-edit-zone">',
      '        <div class="pm-edit-label">Seu nome</div>',
      '        <input class="pm-name-input" id="pm-name-input" placeholder="Como quer ser chamado?">',
      '        <div class="pm-edit-label" style="margin-top:8px">Foto de perfil</div>',
      '        <div class="pm-avatar-upload">',
      '          <button class="pm-avatar-btn" id="pm-avatar-change-btn" type="button">📷 Trocar foto</button>',
      '          <button class="pm-avatar-btn" id="pm-avatar-remove-btn" type="button">✕ Remover</button>',
      "        </div>",
      '        <input type="file" id="pm-avatar-input" accept="image/*">',
      "      </div>",
      '      <div class="pm-divider"></div>',
      '      <a class="pm-item" href="#"><span class="pm-icon">⚔</span> RPG</a>',
      '      <a class="pm-item" href="#"><span class="pm-icon">💰</span> Finanças</a>',
      '      <a class="pm-item" href="#"><span class="pm-icon">💾</span> Armazenamento</a>',
      "    </div>",
      "  </div>",
      "</header>"
    ].join("\n");
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
      '    <a class="footer-link" href="#">Livraria</a>',
      '    <a class="footer-link" href="#">Cinema</a>',
      '    <a class="footer-link" href="#">Sonhos</a>',
      '    <a class="footer-link" href="#">Finanças</a>',
      '    <a class="footer-link" href="#">Planejamento</a>',
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
    var pessoalPages = ["sonhos", "viagens", "wishlist", "financas", "tarefas", "academia", "estudos"];

    if (bibliotecaPages.indexOf(page) >= 0) {
      var ddB = document.getElementById("dd-biblioteca");
      if (ddB) ddB.classList.add("has-active");
    }

    if (pessoalPages.indexOf(page) >= 0) {
      var ddP = document.getElementById("dd-pessoal");
      if (ddP) ddP.classList.add("has-active");
    }
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
  highlightCurrentPage();

  var siteState = loadState();
  applyProfileToUI(siteState);
  wireProfileControls(siteState);
  exposeStorageApi(siteState);
}());
