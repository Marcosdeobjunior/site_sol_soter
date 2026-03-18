(function () {
  "use strict";

  var pageId = document.body.getAttribute("data-page") || "";
  var storageApi = window.SoterStorage || null;
  var latestStatus = null;
  var latestLogs = [];
  var refreshTimer = null;
  var refreshIntervalId = null;

  function clearRpgFactoryState(state) {
    if (!state || !state.data || typeof state.data !== "object") return;

    delete state.data.rpg;
    delete state.data.tasks;
    delete state.data.tarefas;
    delete state.data.sonhosHub;
    delete state.data.sonhos;
    delete state.data.viagens;
    delete state.data.travels;
    delete state.data.wishlistTracker;
    delete state.data.wishlist;
    delete state.data.wishlistHistory;
    delete state.data.wishlistGoal;
    delete state.data.financasTracker;
    delete state.data.financas;
    delete state.data.financasSavingsGoal;
    delete state.data.financasCategorySets;
    delete state.data.financasRecurrenceRules;
    delete state.data.trackerLivraria;
    delete state.data.trackerLivros;
    delete state.data.libraryTrackerItems;
    delete state.data.livros;
    delete state.data.livraria;
    delete state.data.trackerCinema;
    delete state.data.trackerFilmes;
    delete state.data.trackerSeries;
    delete state.data.cinema;
    delete state.data.filmes;
    delete state.data.trackerMangas;
    delete state.data.trackerManga;
    delete state.data.mangas;
    delete state.data.academiaTracker;
    delete state.data.estudos;

    removeLocalKeys([
      "wishlist-v2",
      "wishlist",
      "trackerLivraria",
      "trackerLivros",
      "libraryTrackerItems",
      "trackerCinema",
      "trackerFilmes",
      "trackerSeries",
      "trackerMangas",
      "trackerManga",
      "gym-profile",
      "gym-weights",
      "gym-exercises",
      "gym-diet"
    ]);

    removeLocalByPrefix("gym-done-");
  }

  var PAGE_STORAGE_CONFIG = [
    {
      id: "tarefas",
      label: "Tarefas",
      path: "tarefas.html",
      mode: "state",
      source: "Estado principal",
      summary: function (state) {
        var items = pickArray(state.data, ["tasks", "tarefas"]);
        return formatCount(items.length, "item", "itens");
      },
      hasData: function (state) {
        return pickArray(state.data, ["tasks", "tarefas"]).length > 0;
      },
      clear: function (state) {
        delete state.data.tasks;
        delete state.data.tarefas;
      }
    },
    {
      id: "sonhos",
      label: "Sonhos",
      path: "sonhos.html",
      mode: "state",
      source: "Estado principal",
      summary: function (state) {
        var hub = state.data && state.data.sonhosHub && Array.isArray(state.data.sonhosHub.sonhos)
          ? state.data.sonhosHub.sonhos
          : [];
        return formatCount(hub.length, "sonho", "sonhos");
      },
      hasData: function (state) {
        var hub = state.data && state.data.sonhosHub && Array.isArray(state.data.sonhosHub.sonhos)
          ? state.data.sonhosHub.sonhos
          : [];
        return hub.length > 0 || pickArray(state.data, ["sonhos"]).length > 0;
      },
      clear: function (state) {
        delete state.data.sonhosHub;
        delete state.data.sonhos;
      }
    },
    {
      id: "viagens",
      label: "Viagens",
      path: "viagens.html",
      mode: "state",
      source: "Estado principal",
      summary: function (state) {
        return formatCount(pickArray(state.data, ["viagens", "travels"]).length, "viagem", "viagens");
      },
      hasData: function (state) {
        return pickArray(state.data, ["viagens", "travels"]).length > 0;
      },
      clear: function (state) {
        delete state.data.viagens;
        delete state.data.travels;
      }
    },
    {
      id: "wishlist",
      label: "Wishlist",
      path: "wishlist.html",
      mode: "state",
      source: "Estado principal + legado",
      summary: function (state) {
        var tracker = state.data && state.data.wishlistTracker && Array.isArray(state.data.wishlistTracker.items)
          ? state.data.wishlistTracker.items
          : [];
        return formatCount(tracker.length, "item", "itens");
      },
      hasData: function (state) {
        var tracker = state.data && state.data.wishlistTracker && Array.isArray(state.data.wishlistTracker.items)
          ? state.data.wishlistTracker.items
          : [];
        return tracker.length > 0 || !!(state.data && (state.data.wishlist || state.data.wishlistHistory || state.data.wishlistGoal));
      },
      clear: function (state) {
        delete state.data.wishlistTracker;
        delete state.data.wishlist;
        delete state.data.wishlistHistory;
        delete state.data.wishlistGoal;
        removeLocalKeys(["wishlist-v2", "wishlist"]);
      }
    },
    {
      id: "financas",
      label: "Financas",
      path: "financas.html",
      mode: "state",
      source: "Estado principal",
      summary: function (state) {
        var tracker = state.data && state.data.financasTracker && Array.isArray(state.data.financasTracker.txs)
          ? state.data.financasTracker.txs
          : [];
        return formatCount(tracker.length, "movimento", "movimentos");
      },
      hasData: function (state) {
        var tracker = state.data && state.data.financasTracker && Array.isArray(state.data.financasTracker.txs)
          ? state.data.financasTracker.txs
          : [];
        return tracker.length > 0 || !!(state.data && (state.data.financas || state.data.financasSavingsGoal || state.data.financasCategorySets || state.data.financasRecurrenceRules));
      },
      clear: function (state) {
        delete state.data.financasTracker;
        delete state.data.financas;
        delete state.data.financasSavingsGoal;
        delete state.data.financasCategorySets;
        delete state.data.financasRecurrenceRules;
      }
    },
    {
      id: "livros",
      label: "Livraria",
      path: "livros.html",
      mode: "state",
      source: "Estado principal + legado",
      summary: function (state) {
        return formatCount(pickArray(state.data, ["trackerLivraria", "trackerLivros", "libraryTrackerItems", "livros", "livraria"]).length, "titulo", "titulos");
      },
      hasData: function (state) {
        return pickArray(state.data, ["trackerLivraria", "trackerLivros", "libraryTrackerItems", "livros", "livraria"]).length > 0;
      },
      clear: function (state) {
        delete state.data.trackerLivraria;
        delete state.data.trackerLivros;
        delete state.data.libraryTrackerItems;
        delete state.data.livros;
        delete state.data.livraria;
        removeLocalKeys(["trackerLivraria", "trackerLivros", "libraryTrackerItems"]);
        clearLibraryStandaloneSections(["livros"]);
      }
    },
    {
      id: "cinema",
      label: "Cinema",
      path: "cinema.html",
      mode: "state",
      source: "Estado principal + legado",
      summary: function (state) {
        return formatCount(pickArray(state.data, ["trackerCinema", "trackerFilmes", "trackerSeries", "cinema", "filmes"]).length, "titulo", "titulos");
      },
      hasData: function (state) {
        return pickArray(state.data, ["trackerCinema", "trackerFilmes", "trackerSeries", "cinema", "filmes"]).length > 0;
      },
      clear: function (state) {
        delete state.data.trackerCinema;
        delete state.data.trackerFilmes;
        delete state.data.trackerSeries;
        delete state.data.cinema;
        delete state.data.filmes;
        removeLocalKeys(["trackerCinema", "trackerFilmes", "trackerSeries"]);
        clearLibraryStandaloneSections(["cinema"]);
      }
    },
    {
      id: "mangas",
      label: "Mangas",
      path: "mangas.html",
      mode: "state",
      source: "Estado principal + legado",
      summary: function (state) {
        return formatCount(pickArray(state.data, ["trackerMangas", "trackerManga", "mangas"]).length, "titulo", "titulos");
      },
      hasData: function (state) {
        return pickArray(state.data, ["trackerMangas", "trackerManga", "mangas"]).length > 0;
      },
      clear: function (state) {
        delete state.data.trackerMangas;
        delete state.data.trackerManga;
        delete state.data.mangas;
        removeLocalKeys(["trackerMangas", "trackerManga"]);
        clearLibraryStandaloneSections(["mangas"]);
      }
    },
    {
      id: "academia",
      label: "Academia",
      path: "academia.html",
      mode: "state",
      source: "Estado principal + legado",
      summary: function (state) {
        var tracker = state.data && state.data.academiaTracker ? state.data.academiaTracker : {};
        var workouts = Array.isArray(tracker.workouts) ? tracker.workouts.length : 0;
        var exercises = Array.isArray(tracker.exercises) ? tracker.exercises.length : 0;
        var total = workouts + exercises;
        return total ? formatCount(total, "registro", "registros") : "Dados de treino";
      },
      hasData: function (state) {
        return hasObjectData(state.data && state.data.academiaTracker) || hasGymLegacyData();
      },
      clear: function (state) {
        delete state.data.academiaTracker;
        removeLocalKeys(["gym-profile", "gym-weights", "gym-exercises", "gym-diet"]);
        removeLocalByPrefix("gym-done-");
      }
    },
    {
      id: "rpg",
      label: "RPG",
      path: "rpg.html",
      mode: "state",
      source: "Estado principal",
      summary: function (state) {
        var rpg = state.data && state.data.rpg && typeof state.data.rpg === "object"
          ? state.data.rpg
          : {};
        var missions = rpg.missions && typeof rpg.missions === "object" ? rpg.missions : {};
        var missionRewards = rpg.missionRewards && typeof rpg.missionRewards === "object" ? rpg.missionRewards : {};
        var log = Array.isArray(rpg.log) ? rpg.log : [];
        var completedToday = countTruthyValues(missions);
        var rewardsDays = countNonEmptyNestedObjects(missionRewards);
        if (completedToday) return formatCount(completedToday, "missao", "missoes") + " concluida(s) hoje";
        if (log.length) return formatCount(log.length, "registro", "registros") + " no log RPG";
        if (rewardsDays) return formatCount(rewardsDays, "dia", "dias") + " com recompensas de missao";
        if (rpg.classe && rpg.classe !== "scholar") return "Classe personalizada do personagem";
        return "Classe, missoes e progresso do personagem";
      },
      hasData: function (state) {
        var rpg = state.data && state.data.rpg && typeof state.data.rpg === "object"
          ? state.data.rpg
          : null;
        var missions = rpg && rpg.missions && typeof rpg.missions === "object" ? rpg.missions : {};
        var missionRewards = rpg && rpg.missionRewards && typeof rpg.missionRewards === "object" ? rpg.missionRewards : {};
        var log = rpg && Array.isArray(rpg.log) ? rpg.log : [];
        return !!(
          rpg &&
          (
            (rpg.classe && rpg.classe !== "scholar") ||
            countTruthyValues(missions) > 0 ||
            countNonEmptyNestedObjects(missionRewards) > 0 ||
            log.length
          )
        );
      },
      clear: function (state) {
        clearRpgFactoryState(state);
      }
    },
    {
      id: "revisao",
      label: "Revisao",
      path: "revisao.html",
      mode: "state",
      source: "Estado principal + espelho local",
      summary: function (state) {
        var planner = state.data && state.data.revisaoPlanner && typeof state.data.revisaoPlanner === "object"
          ? state.data.revisaoPlanner
          : null;
        var plannerCards = planner && Array.isArray(planner.cards) ? planner.cards : [];
        var plannerDecks = planner && Array.isArray(planner.decks) ? planner.decks : [];
        var decks = readLegacyArray("srs-decks");
        var cards = readLegacyArray("srs-cards");
        if (plannerCards.length) return formatCount(plannerCards.length, "card", "cards");
        if (plannerDecks.length) return formatCount(plannerDecks.length, "deck", "decks");
        return cards.length ? formatCount(cards.length, "card", "cards") : formatCount(decks.length, "deck", "decks");
      },
      hasData: function (state) {
        return hasReviewPlannerData(state.data && state.data.revisaoPlanner) || hasReviewLegacyData();
      },
      clear: function (state) {
        delete state.data.revisaoPlanner;
        removeLocalKeys(["srs-decks", "srs-cards", "srs-log", "srs-ratinglog"]);
        removeLocalByPrefix("srs-done-");
      }
    }
  ];

  if (storageApi) {
    var state = storageApi.getState();
    if (state && state.data) {
      state.data.lastVisitedPage = pageId;
      state.data.lastVisitedAt = new Date().toISOString();
      storageApi.save(state);
    }
  }

  function node(id) {
    return document.getElementById(id);
  }

  function cloneState() {
    return storageApi ? storageApi.getState() : { profile: { name: "Usuario", avatar: "" }, data: {} };
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtDate(value) {
    if (!value) return "-";
    var date = new Date(value);
    if (isNaN(date)) return "-";
    return date.toLocaleString("pt-BR");
  }

  function fmtBytes(bytes) {
    var value = Number(bytes || 0);
    if (!value) return "0 B";
    if (value < 1024) return value + " B";
    if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";
    return (value / (1024 * 1024)).toFixed(2) + " MB";
  }

  function setBusy(isBusy) {
    ["fs-connect-btn", "fs-sync-btn", "fs-restore-btn", "fs-disconnect-btn"].forEach(function (id) {
      var el = node(id);
      if (el) el.disabled = !!isBusy;
    });
    document.querySelectorAll("[data-storage-delete]").forEach(function (button) {
      var isActive = button.getAttribute("data-storage-active") === "1";
      button.disabled = !!isBusy || !isActive;
    });
  }

  function applyActionAvailability(status, isBusy) {
    status = status || {};
    var supported = !!status.supported;
    var enabled = !!status.enabled;
    var connectBtn = node("fs-connect-btn");
    var syncBtn = node("fs-sync-btn");
    var restoreBtn = node("fs-restore-btn");
    var disconnectBtn = node("fs-disconnect-btn");

    if (connectBtn) connectBtn.disabled = !!isBusy || !supported;
    if (syncBtn) syncBtn.disabled = !!isBusy || !supported || !enabled;
    if (restoreBtn) restoreBtn.disabled = !!isBusy || !supported || !enabled;
    if (disconnectBtn) disconnectBtn.disabled = !!isBusy || !supported || !enabled;

    document.querySelectorAll("[data-storage-delete]").forEach(function (button) {
      var isActive = button.getAttribute("data-storage-active") === "1";
      button.disabled = !!isBusy || !isActive;
    });
  }

  function pickArray(data, keys) {
    var source = data && typeof data === "object" ? data : {};
    for (var i = 0; i < keys.length; i += 1) {
      if (Array.isArray(source[keys[i]])) return source[keys[i]];
    }
    return [];
  }

  function hasObjectData(value) {
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.length > 0;
    return Object.keys(value).length > 0;
  }

  function countTruthyValues(map) {
    if (!map || typeof map !== "object") return 0;
    return Object.keys(map).filter(function (key) { return !!map[key]; }).length;
  }

  function countNonEmptyNestedObjects(map) {
    if (!map || typeof map !== "object") return 0;
    return Object.keys(map).filter(function (key) {
      var entry = map[key];
      return !!(entry && typeof entry === "object" && Object.keys(entry).some(function (childKey) { return entry[childKey] != null; }));
    }).length;
  }

  function hasReviewPlannerData(planner) {
    if (!planner || typeof planner !== "object") return false;
    var decks = Array.isArray(planner.decks) ? planner.decks : [];
    var cards = Array.isArray(planner.cards) ? planner.cards : [];
    var log = planner.log && typeof planner.log === "object" ? planner.log : {};
    var ratingLog = planner.ratingLog && typeof planner.ratingLog === "object" ? planner.ratingLog : {};
    var doneByDate = planner.doneByDate && typeof planner.doneByDate === "object" ? planner.doneByDate : {};
    return !!(decks.length || cards.length || Object.keys(log).length || Object.keys(ratingLog).length || Object.keys(doneByDate).length);
  }

  function formatCount(value, singular, plural) {
    var count = Number(value || 0);
    return count + " " + (count === 1 ? singular : plural);
  }

  function readJson(key) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function readLegacyArray(key) {
    var parsed = readJson(key);
    return Array.isArray(parsed) ? parsed : [];
  }

  function removeLocalKeys(keys) {
    (keys || []).forEach(function (key) {
      try {
        window.localStorage.removeItem(key);
      } catch (err) {}
    });
  }

  function removeLocalByPrefix(prefix) {
    try {
      var matches = [];
      for (var i = 0; i < window.localStorage.length; i += 1) {
        var key = window.localStorage.key(i);
        if (String(key || "").indexOf(prefix) === 0) matches.push(key);
      }
      removeLocalKeys(matches);
    } catch (err) {}
  }

  function clearLibraryStandaloneSections(sectionKeys) {
    try {
      var raw = readJson("biblioteca_standalone_v1");
      if (!raw || typeof raw !== "object") return;
      (sectionKeys || []).forEach(function (key) {
        if (Array.isArray(raw[key])) raw[key] = [];
      });
      window.localStorage.setItem("biblioteca_standalone_v1", JSON.stringify(raw));
    } catch (err) {}
  }

  function hasGymLegacyData() {
    var directKeys = ["gym-profile", "gym-weights", "gym-exercises", "gym-diet"];
    for (var i = 0; i < directKeys.length; i += 1) {
      if (window.localStorage.getItem(directKeys[i])) return true;
    }
    for (var j = 0; j < window.localStorage.length; j += 1) {
      var key = window.localStorage.key(j);
      if (String(key || "").indexOf("gym-done-") === 0) return true;
    }
    return false;
  }

  function hasReviewLegacyData() {
    if (readLegacyArray("srs-decks").length) return true;
    if (readLegacyArray("srs-cards").length) return true;
    if (hasObjectData(readJson("srs-log"))) return true;
    if (hasObjectData(readJson("srs-ratinglog"))) return true;
    for (var j = 0; j < window.localStorage.length; j += 1) {
      var key = window.localStorage.key(j);
      if (String(key || "").indexOf("srs-done-") === 0) {
        var value = parseInt(window.localStorage.getItem(key), 10) || 0;
        if (value > 0) return true;
      }
    }
    return false;
  }

  function getPageEntries() {
    var current = cloneState();
    return PAGE_STORAGE_CONFIG.map(function (entry) {
      var active = !!entry.hasData(current);
      return {
        id: entry.id,
        label: entry.label,
        path: entry.path,
        mode: entry.mode,
        source: entry.source,
        active: active,
        summary: entry.summary(current),
        clear: entry.clear
      };
    });
  }

  function renderStatus(status) {
    status = status || {};
    latestStatus = status;
    latestLogs = Array.isArray(status.logs) ? status.logs.slice() : [];
    var supported = !!status.supported;
    var enabled = !!status.enabled;
    var hasError = !!status.lastError;
    var dot = node("fs-status-dot");
    var title = node("fs-status-title");
    var sub = node("fs-status-sub");
    var folder = node("fs-folder-name");
    var sync = node("fs-last-sync");
    var payloadSize = node("fs-payload-size");
    var payloadKeys = node("fs-payload-keys");
    var error = node("fs-last-error");

    if (dot) dot.className = "storage-status-dot " + (!supported ? "err" : hasError ? "warn" : enabled ? "ok" : "warn");
    if (title) title.textContent = !supported ? "Navegador nao suportado" : enabled ? "Pasta conectada" : "Pasta nao conectada";
    if (sub) {
      sub.textContent = !supported
        ? "Use Chrome ou Edge para permitir gravacao em pasta local."
        : enabled
          ? "Autosave ativo. O site grava o arquivo local apos cada alteracao."
          : "Escolha uma pasta para ativar o autosave no computador.";
    }
    if (folder) folder.textContent = status.folderName || "-";
    if (sync) sync.textContent = fmtDate(status.lastSyncAt);
    if (payloadSize) payloadSize.textContent = fmtBytes(status.summary && status.summary.bytes);
    if (payloadKeys) payloadKeys.textContent = status.summary && status.summary.labels && status.summary.labels.length
      ? status.summary.labels.join(", ")
      : status.summary && status.summary.keys && status.summary.keys.length
        ? status.summary.keys.join(", ")
        : "-";
    if (error) {
      if (hasError) {
        error.hidden = false;
        error.textContent = "Ultimo erro: " + status.lastError;
      } else {
        error.hidden = true;
        error.textContent = "";
      }
    }

    renderConsole(latestLogs);
    renderPages();
    applyActionAvailability(status, false);
  }

  function renderConsole(logs) {
    var consoleNode = node("fs-console");
    if (!consoleNode) return;
    if (!logs || !logs.length) {
      consoleNode.innerHTML = '<div class="storage-console-empty">Nenhum evento ainda. Conecte uma pasta e faca uma alteracao no site para iniciar o historico.</div>';
      return;
    }

    consoleNode.innerHTML = logs.map(function (entry) {
      var level = String(entry.level || "info");
      var extra = entry.extra && typeof entry.extra === "object" ? entry.extra : {};
      var extraParts = [];
      if (Array.isArray(extra.labels) && extra.labels.length) extraParts.push("blocos: " + extra.labels.join(", "));
      else if (Array.isArray(extra.keys) && extra.keys.length) extraParts.push("blocos: " + extra.keys.join(", "));
      if (extra.bytes) extraParts.push("payload: " + fmtBytes(extra.bytes));
      if (extra.folderName) extraParts.push("pasta: " + extra.folderName);
      if (extra.file) extraParts.push("arquivo: " + extra.file);
      if (extra.error) extraParts.push("erro: " + extra.error);
      return '' +
        '<div class="storage-log">' +
          '<div class="storage-log-time">' + escapeHtml(fmtDate(entry.at)) + "</div>" +
          '<div class="storage-log-level ' + escapeHtml(level) + '">' + escapeHtml(level) + "</div>" +
          '<div class="storage-log-main">' +
            '<div class="storage-log-message">' + escapeHtml(entry.message || "") + "</div>" +
            (extraParts.length ? '<div class="storage-log-extra">' + escapeHtml(extraParts.join("\n")) + "</div>" : "") +
          "</div>" +
        "</div>";
    }).join("");
  }

  function mergeConsoleEntry(entry) {
    if (!entry || typeof entry !== "object") return;
    var entryId = entry.id ? String(entry.id) : "";
    if (!Array.isArray(latestLogs)) latestLogs = [];
    if (entryId && latestLogs.some(function (item) { return item && String(item.id || "") === entryId; })) return;
    latestLogs.unshift(entry);
    latestLogs = latestLogs.slice(0, 40);
    renderConsole(latestLogs);
  }

  function scheduleStatusRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      refreshTimer = null;
      refreshStatus();
    }, 120);
  }

  function startAutoRefresh() {
    if (refreshIntervalId) return;
    refreshIntervalId = window.setInterval(function () {
      if (document.hidden) return;
      refreshStatus();
    }, 1500);
  }

  function renderPages() {
    var listNode = node("storage-pages-list");
    if (!listNode) return;
    var entries = getPageEntries();

    listNode.innerHTML = entries.map(function (entry) {
      var tags = [
        '<span class="storage-page-tag ' + (entry.active ? 'is-live' : '') + '">' + (entry.active ? 'com dados' : 'vazio') + "</span>",
        '<span class="storage-page-tag">' + escapeHtml(entry.source) + "</span>"
      ];

      return '' +
        '<article class="storage-page-item">' +
          '<div class="storage-page-top">' +
            '<div>' +
              '<div class="storage-page-title">' + escapeHtml(entry.label) + "</div>" +
              '<div class="storage-page-meta">' + tags.join("") + "</div>" +
            "</div>" +
          "</div>" +
          '<div class="storage-page-summary">' + escapeHtml(entry.summary) + "</div>" +
          '<div class="storage-page-actions">' +
            '<div class="storage-page-count">' + escapeHtml(entry.path) + "</div>" +
            '<button class="storage-btn storage-btn-danger storage-page-delete" type="button" data-storage-delete="' + escapeHtml(entry.id) + '" data-storage-active="' + (entry.active ? "1" : "0") + '"' + (entry.active ? "" : " disabled") + '>Excluir</button>' +
          "</div>" +
        "</article>";
    }).join("");

    if (!entries.length) {
      listNode.innerHTML = '<div class="storage-pages-empty">Nenhuma pagina com armazenamento foi encontrada.</div>';
    }
  }

  function renderRuntimeError(err) {
    refreshStatus().then(function () {
      var box = node("fs-last-error");
      if (!box) return;
      box.hidden = false;
      box.textContent = "Ultimo erro: " + String((err && err.message) || err || "operation_failed");
    });
  }

  function removeRpgMissionArtifacts(state, missionIds) {
    var safeState = state && typeof state === "object" ? state : {};
    var data = safeState.data && typeof safeState.data === "object" ? safeState.data : {};
    var rpg = data.rpg && typeof data.rpg === "object" ? data.rpg : null;
    if (!rpg || !Array.isArray(missionIds) || !missionIds.length) return;

    if (rpg.missions && typeof rpg.missions === "object") {
      missionIds.forEach(function (missionId) {
        delete rpg.missions[missionId];
      });
    }

    if (rpg.missionRewards && typeof rpg.missionRewards === "object") {
      Object.keys(rpg.missionRewards).forEach(function (dateKey) {
        var rewards = rpg.missionRewards[dateKey];
        if (!rewards || typeof rewards !== "object") return;
        missionIds.forEach(function (missionId) {
          delete rewards[missionId];
        });
        if (!Object.keys(rewards).length) delete rpg.missionRewards[dateKey];
      });
    }
  }

  function clearRpgArtifactsForPage(state, pageIdToClear) {
    var missionMap = {
      livros: ["m_leitura"],
      estudos: ["m_estudo"],
      academia: ["m_treino"],
      tarefas: ["m_tarefa"]
    };
    removeRpgMissionArtifacts(state, missionMap[pageIdToClear] || []);
  }

  function normalizeVerificationLabel(value) {
    return String(value == null ? "" : value)
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function requestDeleteConfirmation(entry) {
    var firstStep = window.confirm(
      "Excluir todos os dados salvos de " + entry.label + "?\n\n" +
      "Isso remove o conteudo desta pagina no estado local e, se houver pasta conectada, dispara sincronizacao automatica."
    );
    if (!firstStep) return false;

    var expected = normalizeVerificationLabel("EXCLUIR " + entry.label);
    var typed = window.prompt(
      "Segunda verificacao: digite exatamente\n" + expected + "\n\npara confirmar a exclusao.",
      ""
    );
    if (normalizeVerificationLabel(typed) !== expected) {
      window.alert("Exclusao cancelada. A chave de verificacao nao confere.");
      return false;
    }

    return true;
  }

  function refreshStatus() {
    if (!storageApi || !storageApi.getFileStorageStatus) {
      renderStatus({
        supported: false,
        enabled: false,
        lastError: "",
        logs: []
      });
      return Promise.resolve();
    }
    return storageApi.getFileStorageStatus().then(renderStatus).catch(function (err) {
      renderStatus({
        supported: false,
        enabled: false,
        lastError: String((err && err.message) || err || "status_failed")
      });
    });
  }

  function clearPageData(pageIdToClear) {
    var entry = null;
    for (var i = 0; i < PAGE_STORAGE_CONFIG.length; i += 1) {
      if (PAGE_STORAGE_CONFIG[i].id === pageIdToClear) {
        entry = PAGE_STORAGE_CONFIG[i];
        break;
      }
    }
    if (!entry) return Promise.resolve();

    if (!requestDeleteConfirmation(entry)) return Promise.resolve();

    setBusy(true);
    try {
      if (entry.mode === "state" && storageApi) {
        var nextState = cloneState();
        entry.clear(nextState);
        clearRpgArtifactsForPage(nextState, entry.id);
        storageApi.save(nextState);
        return Promise.resolve(
          latestStatus && latestStatus.enabled && storageApi.syncFileStorageNow
            ? storageApi.syncFileStorageNow()
            : true
        )
          .then(function () { return refreshStatus(); })
          .finally(function () { setBusy(false); });
      }

      entry.clear();
      return refreshStatus().finally(function () { setBusy(false); });
    } catch (err) {
      setBusy(false);
      applyActionAvailability(latestStatus, false);
      renderRuntimeError(err);
      return Promise.resolve();
    }
  }

  function bindActions() {
    var connectBtn = node("fs-connect-btn");
    var syncBtn = node("fs-sync-btn");
    var restoreBtn = node("fs-restore-btn");
    var disconnectBtn = node("fs-disconnect-btn");
    var consoleRefreshBtn = node("fs-console-refresh");

    if (connectBtn) {
      connectBtn.addEventListener("click", function () {
        if (!storageApi || !storageApi.connectFileStorage) {
          renderRuntimeError(new Error("storage_api_unavailable"));
          return;
        }
        setBusy(true);
        storageApi.connectFileStorage()
          .then(function () { return refreshStatus(); })
          .catch(renderRuntimeError)
          .finally(function () { applyActionAvailability(latestStatus, false); });
      });
    }

    if (syncBtn) {
      syncBtn.addEventListener("click", function () {
        if (!storageApi || !storageApi.syncFileStorageNow) {
          renderRuntimeError(new Error("storage_api_unavailable"));
          return;
        }
        if (!latestStatus || !latestStatus.enabled) {
          renderRuntimeError(new Error("storage_not_connected"));
          return;
        }
        setBusy(true);
        storageApi.syncFileStorageNow()
          .then(function () { return refreshStatus(); })
          .catch(renderRuntimeError)
          .finally(function () { applyActionAvailability(latestStatus, false); });
      });
    }

    if (restoreBtn) {
      restoreBtn.addEventListener("click", function () {
        if (!storageApi || !storageApi.restoreFromFileStorage) {
          renderRuntimeError(new Error("storage_api_unavailable"));
          return;
        }
        if (!latestStatus || !latestStatus.enabled) {
          renderRuntimeError(new Error("storage_not_connected"));
          return;
        }
        if (!window.confirm("Restaurar os dados do arquivo da pasta conectada? Isso substitui o estado atual do navegador.")) return;
        setBusy(true);
        storageApi.restoreFromFileStorage()
          .then(function () {
            return refreshStatus().then(function () {
              window.location.reload();
            });
          })
          .catch(renderRuntimeError)
          .finally(function () { applyActionAvailability(latestStatus, false); });
      });
    }

    if (disconnectBtn) {
      disconnectBtn.addEventListener("click", function () {
        if (!storageApi || !storageApi.disconnectFileStorage) {
          renderRuntimeError(new Error("storage_api_unavailable"));
          return;
        }
        if (!latestStatus || !latestStatus.enabled) {
          renderRuntimeError(new Error("storage_not_connected"));
          return;
        }
        setBusy(true);
        storageApi.disconnectFileStorage()
          .then(function () { return refreshStatus(); })
          .catch(renderRuntimeError)
          .finally(function () { applyActionAvailability(latestStatus, false); });
      });
    }

    if (consoleRefreshBtn) {
      consoleRefreshBtn.addEventListener("click", refreshStatus);
    }

    document.addEventListener("click", function (event) {
      var trigger = event.target && event.target.closest ? event.target.closest("[data-storage-delete]") : null;
      if (!trigger) return;
      clearPageData(trigger.getAttribute("data-storage-delete"));
    });
  }

  bindActions();
  applyActionAvailability(latestStatus, true);
  refreshStatus();
  startAutoRefresh();
  window.addEventListener("soter:storage-hydrated", refreshStatus);
  window.addEventListener("soter:file-storage-log", function (event) {
    if (event && event.detail) mergeConsoleEntry(event.detail);
    scheduleStatusRefresh();
  });
  window.addEventListener("soter:file-storage-status", scheduleStatusRefresh);
}());
