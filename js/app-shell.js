(function () {
  "use strict";

  var STORAGE_KEY = "sol_de_soter_site_v1";
  var FILE_DB_NAME = "sol_de_soter_fs_v1";
  var FILE_DB_STORE = "handles";
  var FILE_HANDLE_KEY = "siteDataDir";
  var FILE_NAME = "sol-de-soter-data.json";
  var DEFAULT_STATE = {
    profile: {
      name: "Usuário",
      avatar: ""
    },
    data: {}
  };
  var fileSyncTimer = null;
  var filePendingState = null;
  var fileWriteInFlight = null;
  var fileStorageHandle = null;
  var fileHandleLoaded = false;
  var fileLastSyncedAt = "";
  var fileLastError = "";

  function currentPage() {
    var explicit = document.body.getAttribute("data-page");
    if (explicit) return explicit;
    var file = location.pathname.split("/").pop().toLowerCase();
    if (!file || file === "index.html" || file === "index.htm") return "home";
    return file.replace(".html", "");
  }

  function syncScrollbarCompensation() {
    if (!document || !document.documentElement || !window) return;
    var viewport = window.innerWidth || 0;
    var layout = document.documentElement.clientWidth || 0;
    var scrollbarWidth = Math.max(0, viewport - layout);
    document.documentElement.style.setProperty("--scrollbar-comp", scrollbarWidth + "px");
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

  function compactStateForStorage(input) {
    var clone = deepClone(input);
    clone = ensureStateShape(clone);
    var data = clone.data || {};

    if (data.sonhosHub && Array.isArray(data.sonhosHub.sonhos)) {
      delete data.sonhos;
    }

    if (data.financasTracker && Array.isArray(data.financasTracker.txs)) {
      delete data.financas;
      delete data.financasSavingsGoal;
      delete data.financasCategorySets;
      delete data.financasRecurrenceRules;
    }

    if (data.wishlistTracker && typeof data.wishlistTracker === "object") {
      delete data.wishlist;
      delete data.wishlistHistory;
      delete data.wishlistGoal;
    }

    if (Array.isArray(data.trackerLivraria)) {
      delete data.trackerLivros;
      delete data.libraryTrackerItems;
      delete data.livros;
      delete data.livraria;
    }

    if (Array.isArray(data.trackerCinema)) {
      delete data.trackerFilmes;
      delete data.trackerSeries;
      delete data.cinema;
      delete data.filmes;
    }

    if (Array.isArray(data.trackerMangas)) {
      delete data.trackerManga;
      delete data.mangas;
    }

    clone.data = data;
    return clone;
  }

  function supportsFileStorage() {
    return typeof window !== "undefined" &&
      typeof window.showDirectoryPicker === "function" &&
      typeof window.indexedDB !== "undefined";
  }

  function openFileHandleDb() {
    return new Promise(function (resolve, reject) {
      if (!supportsFileStorage()) {
        reject(new Error("unsupported"));
        return;
      }
      var req = indexedDB.open(FILE_DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(FILE_DB_STORE)) db.createObjectStore(FILE_DB_STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("db_open_failed")); };
    });
  }

  function getStoredFileHandle() {
    if (fileHandleLoaded) return Promise.resolve(fileStorageHandle);
    return openFileHandleDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(FILE_DB_STORE, "readonly");
        var store = tx.objectStore(FILE_DB_STORE);
        var req = store.get(FILE_HANDLE_KEY);
        req.onsuccess = function () {
          fileStorageHandle = req.result || null;
          fileHandleLoaded = true;
          resolve(fileStorageHandle);
        };
        req.onerror = function () { reject(req.error || new Error("db_read_failed")); };
      });
    }).catch(function () {
      fileHandleLoaded = true;
      fileStorageHandle = null;
      return null;
    });
  }

  function storeFileHandle(handle) {
    if (!supportsFileStorage()) return Promise.reject(new Error("unsupported"));
    return openFileHandleDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(FILE_DB_STORE, "readwrite");
        tx.objectStore(FILE_DB_STORE).put(handle, FILE_HANDLE_KEY);
        tx.oncomplete = function () {
          fileStorageHandle = handle;
          fileHandleLoaded = true;
          resolve(handle);
        };
        tx.onerror = function () { reject(tx.error || new Error("db_write_failed")); };
      });
    });
  }

  function removeStoredFileHandle() {
    if (!supportsFileStorage()) return Promise.resolve();
    return openFileHandleDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(FILE_DB_STORE, "readwrite");
        tx.objectStore(FILE_DB_STORE).delete(FILE_HANDLE_KEY);
        tx.oncomplete = function () {
          fileStorageHandle = null;
          fileHandleLoaded = true;
          resolve();
        };
        tx.onerror = function () { reject(tx.error || new Error("db_delete_failed")); };
      });
    });
  }

  function verifyFilePermission(handle, write) {
    if (!handle || typeof handle.queryPermission !== "function") return Promise.resolve(false);
    var opts = write ? { mode: "readwrite" } : {};
    return Promise.resolve(handle.queryPermission(opts)).then(function (result) {
      if (result === "granted") return true;
      if (typeof handle.requestPermission !== "function") return false;
      return Promise.resolve(handle.requestPermission(opts)).then(function (next) {
        return next === "granted";
      });
    }).catch(function () { return false; });
  }

  function updateFileStorageMeta(patch) {
    var state = ensureStateShape(loadState());
    if (!state.data.fileStorage || typeof state.data.fileStorage !== "object") state.data.fileStorage = {};
    Object.keys(patch || {}).forEach(function (key) {
      state.data.fileStorage[key] = patch[key];
    });
    persistStateSnapshot(state, { dispatchStatus: true });
  }

  function summarizeStateForSync(state) {
    state = compactStateForStorage(ensureStateShape(state));
    var data = state.data || {};
    var labelMap = {
      tasks: "tarefas",
      sonhosHub: "sonhos",
      viagens: "viagens",
      wishlistTracker: "wishlist",
      financasTracker: "financas",
      trackerLivraria: "livraria",
      trackerCinema: "cinema",
      trackerMangas: "mangas",
      academiaTracker: "academia",
      libraryHub: "biblioteca hub",
      revisaoPlanner: "revisao"
    };
    var keys = Object.keys(data).filter(function (key) {
      return ["lastVisitedPage", "lastVisitedAt", "notifications", "headerBalanceHidden", "fileStorage"].indexOf(key) === -1;
    });
    var labels = keys.map(function (key) {
      return labelMap[key] || key;
    });
    return {
      keys: keys,
      labels: labels,
      bytes: JSON.stringify(state).length
    };
  }

  function appendFileStorageLog(level, message, extra) {
    try {
      var state = ensureStateShape(loadState());
      if (!state.data.fileStorage || typeof state.data.fileStorage !== "object") state.data.fileStorage = {};
      var logs = Array.isArray(state.data.fileStorage.logs) ? state.data.fileStorage.logs.slice(-39) : [];
      logs.push({
        id: Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        at: new Date().toISOString(),
        level: level || "info",
        message: message || "",
        extra: extra && typeof extra === "object" ? extra : {}
      });
      state.data.fileStorage.logs = logs;
      persistStateSnapshot(state, { dispatchStatus: false });
      window.dispatchEvent(new CustomEvent("soter:file-storage-log", { detail: logs[logs.length - 1] }));
    } catch (err) { }
  }

  function trimFileStorageDebug(state) {
    var clone = deepClone(state);
    clone = ensureStateShape(clone);
    if (!clone.data.fileStorage || typeof clone.data.fileStorage !== "object") return clone;
    var meta = clone.data.fileStorage;
    if (Array.isArray(meta.logs)) meta.logs = meta.logs.slice(-12);
    if (meta.lastSyncedSummary && typeof meta.lastSyncedSummary === "object") {
      meta.lastSyncedSummary = {
        keys: Array.isArray(meta.lastSyncedSummary.keys) ? meta.lastSyncedSummary.keys.slice(0, 12) : [],
        labels: Array.isArray(meta.lastSyncedSummary.labels) ? meta.lastSyncedSummary.labels.slice(0, 12) : [],
        bytes: Number(meta.lastSyncedSummary.bytes || 0)
      };
    }
    clone.data.fileStorage = meta;
    return clone;
  }

  function persistStateSnapshot(state, options) {
    var opts = options && typeof options === "object" ? options : {};
    var shaped = compactStateForStorage(ensureStateShape(state));
    var candidates = [
      shaped,
      trimFileStorageDebug(shaped),
      pruneDataUrls(shaped).state,
      trimFileStorageDebug(pruneDataUrls(shaped).state)
    ];
    var i;

    clearLegacyStorageKeys(shaped);

    for (i = 0; i < candidates.length; i += 1) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates[i]));
        if (opts.dispatchStatus) {
          var meta = candidates[i].data && candidates[i].data.fileStorage ? candidates[i].data.fileStorage : {};
          window.dispatchEvent(new CustomEvent("soter:file-storage-status", { detail: meta }));
        }
        return candidates[i];
      } catch (err) {
        if (!isQuotaError(err)) throw err;
      }
    }

    var quotaErr = new Error("quota_persist_failed");
    quotaErr.name = "QuotaExceededError";
    throw quotaErr;
  }

  function writeStateToFile(handle, state) {
    if (!handle) return Promise.reject(new Error("missing_handle"));
    return Promise.resolve(handle.getFileHandle(FILE_NAME, { create: true })).then(function (fileHandle) {
      return Promise.resolve(fileHandle.createWritable()).then(function (writer) {
        return Promise.resolve(writer.write(JSON.stringify(state, null, 2))).then(function () {
          return writer.close();
        });
      });
    });
  }

  function readStateFromFile(handle) {
    if (!handle) return Promise.reject(new Error("missing_handle"));
    return Promise.resolve(handle.getFileHandle(FILE_NAME)).then(function (fileHandle) {
      return Promise.resolve(fileHandle.getFile()).then(function (file) {
        return Promise.resolve(file.text()).then(function (text) {
          if (!text) return null;
          return ensureStateShape(JSON.parse(text));
        });
      });
    });
  }

  function getFileStorageEnabled(state) {
    var current = state || loadState();
    return !!(current.data && current.data.fileStorage && current.data.fileStorage.enabled);
  }

  function flushFileSync() {
    var nextState = filePendingState;
    filePendingState = null;
    if (!nextState || !supportsFileStorage() || !getFileStorageEnabled(nextState)) return Promise.resolve(false);
    if (fileWriteInFlight) return fileWriteInFlight;
    var summary = summarizeStateForSync(nextState);
    appendFileStorageLog("info", "Sincronização iniciada.", { keys: summary.keys, labels: summary.labels, bytes: summary.bytes });
    fileWriteInFlight = getStoredFileHandle().then(function (handle) {
      if (!handle) throw new Error("missing_handle");
      return verifyFilePermission(handle, true).then(function (granted) {
        if (!granted) throw new Error("permission_denied");
        return writeStateToFile(handle, nextState);
      });
    }).then(function () {
      fileLastSyncedAt = new Date().toISOString();
      fileLastError = "";
      updateFileStorageMeta({
        lastSyncAt: fileLastSyncedAt,
        lastError: "",
        lastSyncedSummary: {
          keys: summary.keys.slice(),
          labels: summary.labels.slice(),
          bytes: summary.bytes
        }
      });
      appendFileStorageLog("ok", "Sincronização concluída.", { keys: summary.keys, labels: summary.labels, bytes: summary.bytes, file: FILE_NAME });
      return true;
    }).catch(function (err) {
      fileLastError = String((err && err.message) || err || "sync_failed");
      updateFileStorageMeta({ lastError: fileLastError });
      appendFileStorageLog("err", "Falha na sincronização.", { error: fileLastError });
      return false;
    }).finally(function () {
      fileWriteInFlight = null;
      if (filePendingState) flushFileSync();
    });
    return fileWriteInFlight;
  }

  function queueFileSync(state) {
    if (!supportsFileStorage()) return;
    filePendingState = compactStateForStorage(ensureStateShape(state));
    if (fileSyncTimer) clearTimeout(fileSyncTimer);
    fileSyncTimer = setTimeout(function () {
      fileSyncTimer = null;
      flushFileSync();
    }, 250);
  }

  function hasMeaningfulState(state) {
    state = ensureStateShape(state);
    if (state.profile && (state.profile.avatar || state.profile.name !== DEFAULT_STATE.profile.name)) return true;
    var ignore = {
      lastVisitedPage: true,
      lastVisitedAt: true,
      headerBalanceHidden: true,
      notifications: true,
      fileStorage: true,
      rpg: true
    };
    return Object.keys(state.data || {}).some(function (key) {
      if (ignore[key]) return false;
      var value = state.data[key];
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === "object") return Object.keys(value).length > 0;
      return value !== "" && value !== null && value !== undefined;
    });
  }

  function tryHydrateFromFile() {
    if (!supportsFileStorage()) return;
    var localState = loadState();
    if (hasMeaningfulState(localState)) return;
    getStoredFileHandle().then(function (handle) {
      if (!handle || !getFileStorageEnabled(localState)) return null;
      return verifyFilePermission(handle, false).then(function (granted) {
        if (!granted) return null;
        return readStateFromFile(handle).catch(function () { return null; });
      });
    }).then(function (diskState) {
      if (!diskState || !hasMeaningfulState(diskState)) return;
      var shaped = compactStateForStorage(diskState);
      persistStateSnapshot(shaped, { dispatchStatus: false });
      appendFileStorageLog("ok", "Estado restaurado automaticamente do arquivo local.", summarizeStateForSync(shaped));
      window.dispatchEvent(new CustomEvent("soter:storage-hydrated"));
    }).catch(function () { });
  }

  function clearLegacyStorageKeys(state) {
    try {
      if (!window.localStorage) return;
      var data = state && state.data ? state.data : {};
      var keysToRemove = [];

      if (data.wishlistTracker && typeof data.wishlistTracker === "object") {
        keysToRemove.push("wishlist-v2", "wishlist");
      }

      if (data.academiaTracker && typeof data.academiaTracker === "object") {
        keysToRemove.push("gym-profile", "gym-weights", "gym-exercises", "gym-diet");
        Array.from({ length: localStorage.length }).forEach(function (_, idx) {
          var key = localStorage.key(idx);
          if (String(key).indexOf("gym-done-") === 0) keysToRemove.push(key);
        });
      }

      if (Array.isArray(data.trackerLivraria)) {
        keysToRemove.push("trackerLivraria", "trackerLivros", "libraryTrackerItems");
      }

      if (Array.isArray(data.trackerCinema)) {
        keysToRemove.push("trackerCinema", "trackerFilmes", "trackerSeries");
      }

      if (Array.isArray(data.trackerMangas)) {
        keysToRemove.push("trackerMangas", "trackerManga");
      }

      keysToRemove.forEach(function (key) {
        try { localStorage.removeItem(key); } catch (err) { }
      });
    } catch (err) { }
  }

  function saveState(state) {
    var shaped = compactStateForStorage(ensureStateShape(state));
    try {
      persistStateSnapshot(shaped, { dispatchStatus: false });
      queueFileSync(shaped);
      return;
    } catch (err) {
      if (!isQuotaError(err)) throw err;
      var pruned = pruneDataUrls(shaped);
      try {
        persistStateSnapshot(pruned.state, { dispatchStatus: false });
        queueFileSync(shaped);
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
    livroPagina: 0.12,
    livroConclusao: 16,
    livroReflexao: 6,
    cinemaFilme: 16,
    cinemaEpisodio: 7,
    cinemaConclusaoSerie: 12,
    cinemaDocumentario: 4,
    cinemaReflexao: 3,
    mangaCapitulo: 3.5,
    mangaConclusao: 10,
    mangaReflexao: 3,
    treino: 24,
    estudoHora: 18,
    estudoConclusao: 10,
    estudoRevisao: 6,
    tarefaBaseBaixa: 6,
    tarefaBaseMedia: 12,
    tarefaBaseAlta: 20,
    tarefaPrazo: 6,
    sonhoBase: 4,
    sonhoMeta: 9,
    sonhoPlanejamento: 6,
    sonhoRealizado: 22,
    sonhoReserva: 4,
    viagem: 42,
    viagemPlanejada: 6,
    financaTx: 2,
    financaSave: 4,
    financaRule: 12,
    wishlistItem: 2,
    wishlistAquisicao: 8,
    wishlistGrupo: 3
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
  function getWishlist(state) {
    var data = state.data || {};
    if (data.wishlistTracker && Array.isArray(data.wishlistTracker.items)) return data.wishlistTracker.items;
    return pickArray(data, ["wishlist"]);
  }
  function getWishlistHistory(state) {
    var data = state.data || {};
    if (data.wishlistTracker && Array.isArray(data.wishlistTracker.acquisitionHistory)) return data.wishlistTracker.acquisitionHistory;
    return Array.isArray(data.wishlistHistory) ? data.wishlistHistory : [];
  }
  function getWishlistGroups(state) {
    var data = state.data || {};
    if (data.wishlistTracker && Array.isArray(data.wishlistTracker.listGroups)) return data.wishlistTracker.listGroups;
    return [];
  }
  function getWishlistGoal(state) {
    var data = state.data || {};
    if (data.wishlistTracker && data.wishlistTracker.goal && typeof data.wishlistTracker.goal === "object") return data.wishlistTracker.goal;
    if (data.wishlistGoal && typeof data.wishlistGoal === "object") return data.wishlistGoal;
    return { saved: 0, goal: 0 };
  }

  function getSonhos(state) {
    var data = state.data || {};
    if (data.sonhosHub && Array.isArray(data.sonhosHub.sonhos)) return data.sonhosHub.sonhos;
    return pickArray(data, ["sonhos"]);
  }

  function norm(v) {
    return String(v == null ? "" : v).trim().toLowerCase();
  }
  function num(v) {
    var parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  function hasMeaningfulText(v) {
    return String(v || "").trim().length >= 12;
  }
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function clampProgress(current, total) {
    var safeCurrent = Math.max(0, num(current));
    var safeTotal = Math.max(0, num(total));
    if (!safeTotal) return safeCurrent;
    return Math.min(safeCurrent, safeTotal);
  }
  function scaleTo100(value, target) {
    if (!target) return 0;
    return clamp(Math.round(value / target * 100), 0, 100);
  }

  function isDoneLivro(item) { return item && norm(item.status) === "concluido"; }
  function isDoneCinema(item) { return item && norm(item.status) === "concluido"; }
  function isDoneManga(item) { return item && norm(item.status) === "concluido"; }
  function isDoneTask(item) { return !!(item && item.done); }
  function isVisitedViagem(item) { return ["feito", "visitado", "concluido"].indexOf(norm(item && item.status)) >= 0; }
  function isDoneDream(item) { return !!(item && item.realizado); }
  function getEstudosHoras(state) {
    return getEstudos(state).reduce(function (acc, item) {
      return acc + Number(item && item.horas || 0);
    }, 0);
  }
  function getLivroPagesRead(item) {
    if (!item) return 0;
    var total = num(item.paginas);
    var current = num(item.atual);
    if (isDoneLivro(item) && total > 0) return total;
    return clampProgress(current, total);
  }
  function getLivroReflectionBonus(item) {
    var bonus = 0;
    if (hasMeaningfulText(item && (item.obs || item.notas || item.resenha))) bonus += RPG_XP.livroReflexao;
    if (num(item && item.nota) > 0) bonus += 2;
    return bonus;
  }
  function getMangaChaptersRead(item) {
    if (!item) return 0;
    var total = num(item.capTotal);
    var current = num(item.capAtual);
    if (isDoneManga(item) && total > 0) return total;
    return clampProgress(current, total);
  }
  function getMangaReflectionBonus(item) {
    var bonus = 0;
    if (hasMeaningfulText(item && (item.obs || item.notas))) bonus += RPG_XP.mangaReflexao;
    if (num(item && item.nota) > 0) bonus += 1;
    return bonus;
  }
  function isSeriesType(item) {
    var kind = norm(item && item.tipo);
    return kind === "serie" || kind === "série" || kind.indexOf("serie") >= 0;
  }
  function isDocumentaryType(item) {
    return norm(item && item.tipo).indexOf("document") >= 0;
  }
  function getCinemaUnits(item) {
    if (!item) return 0;
    if (isSeriesType(item)) {
      var epTotal = num(item.episodioTotal);
      var epAtual = num(item.episodioAtual);
      if (isDoneCinema(item) && epTotal > 0) return epTotal;
      if (epTotal > 0 || epAtual > 0) return clampProgress(epAtual, epTotal);
      var tempTotal = num(item.temporadaTotal);
      var tempAtual = num(item.temporadaAtual);
      if (isDoneCinema(item) && tempTotal > 0) return tempTotal;
      return clampProgress(tempAtual, tempTotal);
    }
    return isDoneCinema(item) ? 1 : 0;
  }
  function getCinemaReflectionBonus(item) {
    var bonus = 0;
    if (hasMeaningfulText(item && (item.obs || item.notas || item.review))) bonus += RPG_XP.cinemaReflexao;
    if (isDocumentaryType(item)) bonus += RPG_XP.cinemaDocumentario;
    if (num(item && item.nota) > 0) bonus += 1;
    return bonus;
  }
  function getTaskComplexity(task, tasks) {
    if (!task) return 0;
    var subtasks = Array.isArray(task.subtarefas) ? task.subtarefas.length : 0;
    var childTasks = (tasks || []).filter(function (item) { return item.parentId === task.id; }).length;
    var complexity = subtasks * 3 + childTasks * 6;
    if (task.parentId) complexity += 4;
    if (subtasks >= 3) complexity += 6;
    if (childTasks > 0) complexity += 8;
    return complexity;
  }
  function isTaskStrategic(task) {
    return norm(task && task.prior) === "alta" || hasMeaningfulText(task && task.nota);
  }
  function isTaskOnTime(task) {
    if (!task || !task.done) return false;
    if (!task.data) return true;
    var doneAt = task.doneAt || task.updatedAt || new Date().toISOString();
    return String(doneAt).slice(0, 10) <= String(task.data).slice(0, 10);
  }
  function countDreamGoalsDone(dream) {
    return Array.isArray(dream && dream.metas) ? dream.metas.filter(function (meta) { return !!meta.feita; }).length : 0;
  }
  function hasDreamPlanning(dream) {
    return hasMeaningfulText(dream && dream.desc) ||
      hasMeaningfulText(dream && dream.intencao) ||
      !!(dream && (dream.dataInicio || dream.dataFim));
  }
  function getDreamFinanceHistoryCount(dream) {
    return Array.isArray(dream && dream.financeHistory) ? dream.financeHistory.length : 0;
  }
  function getSavingsTxValue(txs) {
    return (txs || []).reduce(function (acc, tx) {
      return acc + (tx && tx.type === "save" ? num(tx.value) : 0);
    }, 0);
  }
  function countMeaningfulWishlistItems(items) {
    return (items || []).filter(function (item) {
      return !!(item && (item.price || item.link || hasMeaningfulText(item.notes || item.notas)));
    }).length;
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

  function calcLivroXp(item) {
    return Math.round(getLivroPagesRead(item) * RPG_XP.livroPagina +
      (isDoneLivro(item) ? RPG_XP.livroConclusao : 0) +
      getLivroReflectionBonus(item));
  }

  function calcCinemaXp(item) {
    if (!item) return 0;
    if (isSeriesType(item)) {
      return Math.round(getCinemaUnits(item) * RPG_XP.cinemaEpisodio +
        (isDoneCinema(item) ? RPG_XP.cinemaConclusaoSerie : 0) +
        getCinemaReflectionBonus(item));
    }
    return Math.round((isDoneCinema(item) ? RPG_XP.cinemaFilme : 0) + getCinemaReflectionBonus(item));
  }

  function calcMangaXp(item) {
    return Math.round(getMangaChaptersRead(item) * RPG_XP.mangaCapitulo +
      (isDoneManga(item) ? RPG_XP.mangaConclusao : 0) +
      getMangaReflectionBonus(item));
  }

  function calcEstudoXp(item) {
    if (!item) return 0;
    return Math.round(num(item.horas) * RPG_XP.estudoHora +
      (isDoneStudyItem(item) ? RPG_XP.estudoConclusao : 0) +
      ((item.revisado || norm(item.status) === "revisado" || norm(item.tipo) === "revisao") ? RPG_XP.estudoRevisao : 0));
  }

  function calcTaskXp(task, tasks) {
    if (!isDoneTask(task)) return 0;
    var prior = norm(task.prior || "media");
    var base = prior === "alta" ? RPG_XP.tarefaBaseAlta : prior === "baixa" ? RPG_XP.tarefaBaseBaixa : RPG_XP.tarefaBaseMedia;
    return Math.round(base + getTaskComplexity(task, tasks) + (isTaskOnTime(task) ? RPG_XP.tarefaPrazo : 0) + (isTaskStrategic(task) ? 4 : 0));
  }

  function calcDreamXp(dream) {
    if (!dream) return 0;
    return Math.round(RPG_XP.sonhoBase +
      countDreamGoalsDone(dream) * RPG_XP.sonhoMeta +
      (hasDreamPlanning(dream) ? RPG_XP.sonhoPlanejamento : 0) +
      (isDoneDream(dream) ? RPG_XP.sonhoRealizado : 0) +
      getDreamFinanceHistoryCount(dream) * RPG_XP.sonhoReserva);
  }

  function calcViagemXp(item) {
    if (!item) return 0;
    return Math.round((isVisitedViagem(item) ? RPG_XP.viagem : 0) +
      ((item.dataInicio || item.start || item.dataFim || item.end) ? RPG_XP.viagemPlanejada : 0));
  }

  function calcFinanceXp(state) {
    var txs = getFinanceTxs(state);
    var rules = getFinanceRules(state);
    var txXp = txs.reduce(function (acc, tx) {
      if (!tx) return acc;
      return acc + RPG_XP.financaTx + (tx.type === "save" ? RPG_XP.financaSave : 0);
    }, 0);
    var savingsScale = Math.min(60, Math.floor(getSavingsTxValue(txs) / 200));
    return Math.round(txXp + rules.length * RPG_XP.financaRule + savingsScale);
  }

  function calcWishlistXp(state) {
    var items = getWishlist(state);
    var history = getWishlistHistory(state);
    var groups = getWishlistGroups(state);
    var goal = getWishlistGoal(state);
    var savedBonus = Math.min(30, Math.floor(num(goal.saved) / 200));
    return Math.round(items.length * RPG_XP.wishlistItem +
      countMeaningfulWishlistItems(items) +
      history.length * RPG_XP.wishlistAquisicao +
      groups.length * RPG_XP.wishlistGrupo +
      savedBonus);
  }

  function getMissionRewardsTotal(state) {
    var total = 0;
    Object.keys(state.data.rpg.missionRewards || {}).forEach(function (dateKey) {
      var rewards = state.data.rpg.missionRewards[dateKey];
      if (!rewards || typeof rewards !== "object") return;
      Object.keys(rewards).forEach(function (missionId) {
        total += Number(rewards[missionId] || 0);
      });
    });
    return total;
  }

  function getRpgBreakdown(state) {
    state = ensureRpgShape(state);
    var tasks = getTasks(state);
    var breakdown = {
      livros: getLivros(state).reduce(function (acc, item) { return acc + calcLivroXp(item); }, 0),
      cinema: getCinema(state).reduce(function (acc, item) { return acc + calcCinemaXp(item); }, 0),
      mangas: getMangas(state).reduce(function (acc, item) { return acc + calcMangaXp(item); }, 0),
      treinos: getGym(state).length * RPG_XP.treino,
      estudos: getEstudos(state).reduce(function (acc, item) { return acc + calcEstudoXp(item); }, 0),
      tarefas: tasks.reduce(function (acc, item) { return acc + calcTaskXp(item, tasks); }, 0),
      sonhos: getSonhos(state).reduce(function (acc, item) { return acc + calcDreamXp(item); }, 0),
      viagens: getViagens(state).reduce(function (acc, item) { return acc + calcViagemXp(item); }, 0),
      financas: calcFinanceXp(state),
      wishlist: calcWishlistXp(state),
      missoes: getMissionRewardsTotal(state)
    };
    breakdown.total = breakdown.livros + breakdown.cinema + breakdown.mangas + breakdown.treinos +
      breakdown.estudos + breakdown.tarefas + breakdown.sonhos + breakdown.viagens +
      breakdown.financas + breakdown.wishlist + breakdown.missoes;
    return breakdown;
  }

  function calcRpgXp(state) {
    return getRpgBreakdown(state).total;
  }

  function getRpgAttrs(state) {
    var breakdown = getRpgBreakdown(state);
    var total = breakdown.total;
    return [
      { icon: "\uD83E\uDDE0", label: "Intelecto", val: scaleTo100(breakdown.livros * 0.55 + breakdown.estudos * 0.85 + breakdown.mangas * 0.3 + breakdown.cinema * 0.15, 520), color: "#c8a96e" },
      { icon: "\uD83D\uDCAA", label: "Forca", val: scaleTo100(breakdown.treinos * 1 + breakdown.tarefas * 0.12, 340), color: "#e06b8b" },
      { icon: "\uD83E\uDDED", label: "Sabedoria", val: scaleTo100(breakdown.estudos * 0.4 + breakdown.livros * 0.25 + breakdown.sonhos * 0.85 + breakdown.financas * 0.85 + breakdown.wishlist * 0.4 + breakdown.tarefas * 0.15, 520), color: "#4ab0e8" },
      { icon: "\u26A1", label: "Disciplina", val: scaleTo100(breakdown.tarefas * 0.7 + breakdown.treinos * 0.25 + breakdown.estudos * 0.2 + breakdown.financas * 0.45 + breakdown.sonhos * 0.25, 520), color: "#5ec4a8" },
      { icon: "\uD83C\uDF0D", label: "Exploracao", val: scaleTo100(breakdown.viagens * 1 + breakdown.cinema * 0.45 + breakdown.mangas * 0.15 + breakdown.sonhos * 0.1, 360), color: "#7c6fcd" },
      { icon: "\u2728", label: "Prestigio", val: scaleTo100(total, 2600), color: "#e8864a" }
    ];
  }

  function buildRpgLog(state) {
    var entries = [];
    var now = Date.now();
    getLivros(state).filter(function (item) { return getLivroPagesRead(item) > 0; }).slice(-3).forEach(function (item) {
      entries.push({ icon: "\uD83D\uDCD6", text: 'Leitura registrada: "' + (item.titulo || item.title || "Livro") + '"', xp: calcLivroXp(item), t: item.updatedAt || item.id || now });
    });
    getCinema(state).filter(function (item) { return calcCinemaXp(item) > 0; }).slice(-3).forEach(function (item) {
      entries.push({ icon: "\uD83C\uDFAC", text: 'Tela atualizada: "' + (item.titulo || item.title || "Titulo") + '"', xp: calcCinemaXp(item), t: item.updatedAt || item.id || now });
    });
    getMangas(state).filter(function (item) { return getMangaChaptersRead(item) > 0; }).slice(-3).forEach(function (item) {
      entries.push({ icon: "\uD83D\uDDBC", text: 'Manga atualizado: "' + (item.titulo || item.title || "Manga") + '"', xp: calcMangaXp(item), t: item.updatedAt || item.id || now });
    });
    getGym(state).slice(-4).forEach(function (item) {
      entries.push({ icon: "\uD83D\uDCAA", text: "Treino registrado" + (item.tipo ? " - " + item.tipo : ""), xp: RPG_XP.treino, t: item.updatedAt || item.id || now });
    });
    getEstudos(state).slice(-3).forEach(function (item) {
      entries.push({ icon: "\uD83C\uDF93", text: "Estudo registrado" + (item.materia ? " - " + item.materia : ""), xp: calcEstudoXp(item), t: item.updatedAt || item.id || now });
    });
    getTasks(state).filter(isDoneTask).slice(-3).forEach(function (item) {
      entries.push({ icon: "\u2705", text: 'Tarefa concluida: "' + (item.nome || "Tarefa") + '"', xp: calcTaskXp(item, getTasks(state)), t: item.doneAt || item.updatedAt || item.id || now });
    });
    getSonhos(state).slice(-2).forEach(function (item) {
      entries.push({ icon: "\uD83C\uDF19", text: 'Sonho revisado: "' + (item.titulo || "Sonho") + '"', xp: calcDreamXp(item), t: item.updatedAt || item.id || now });
    });
    getViagens(state).filter(isVisitedViagem).slice(-2).forEach(function (item) {
      entries.push({ icon: "\u2708\uFE0F", text: "Destino concluido: " + (item.dest || item.destino || "Viagem"), xp: calcViagemXp(item), t: item.updatedAt || item.id || now });
    });
    getFinanceTxs(state).slice(-2).forEach(function (item) {
      entries.push({ icon: "\uD83D\uDCB0", text: "Movimento financeiro registrado", xp: RPG_XP.financaTx + (item.type === "save" ? RPG_XP.financaSave : 0), t: item.updatedAt || item.id || now });
    });
    getWishlistHistory(state).slice(-2).forEach(function (item) {
      entries.push({ icon: "\uD83C\uDF20", text: 'Wishlist avançou: "' + (item.name || "Item") + '"', xp: RPG_XP.wishlistAquisicao, t: item.acquiredAt || item.id || now });
    });
    return entries.sort(function (a, b) { return b.t - a.t; }).slice(0, 12);
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

  function hasDreamProgressUpdate(prevState, nextState) {
    var prev = getSonhos(prevState);
    var next = getSonhos(nextState);
    return next.some(function (dream) {
      var before = findByIdOrName(prev, dream);
      if (!before) return true;
      return JSON.stringify(dream) !== JSON.stringify(before);
    });
  }

  function hasCinemaProgressUpdate(prevState, nextState) {
    var prev = getCinema(prevState);
    var next = getCinema(nextState);
    return next.some(function (item) {
      var before = findByIdOrName(prev, item);
      if (!before) return true;
      return JSON.stringify(item) !== JSON.stringify(before);
    });
  }

  function hasMangaProgressUpdate(prevState, nextState) {
    var prev = getMangas(prevState);
    var next = getMangas(nextState);
    return next.some(function (item) {
      var before = findByIdOrName(prev, item);
      if (!before) return getMangaChaptersRead(item) > 0;
      return getMangaChaptersRead(item) !== getMangaChaptersRead(before) || JSON.stringify(item) !== JSON.stringify(before);
    });
  }

  function hasWishlistProgressUpdate(prevState, nextState) {
    var prevItems = getWishlist(prevState);
    var nextItems = getWishlist(nextState);
    var prevHistory = getWishlistHistory(prevState);
    var nextHistory = getWishlistHistory(nextState);
    return nextItems.length > prevItems.length || nextHistory.length > prevHistory.length ||
      nextItems.some(function (item) {
        var before = findByIdOrName(prevItems, item);
        if (!before) return true;
        return JSON.stringify(item) !== JSON.stringify(before);
      });
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
    if (hasDreamProgressUpdate(prev, state)) state.data.rpg.missions.m_sonho = true;
    if (hasCinemaProgressUpdate(prev, state)) state.data.rpg.missions.m_cinema = true;
    if (hasMangaProgressUpdate(prev, state)) state.data.rpg.missions.m_manga = true;
    if (hasWishlistProgressUpdate(prev, state)) state.data.rpg.missions.m_wishlist = true;

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

  function getFinanceTxs(state) {
    var data = state && state.data ? state.data : {};
    if (data.financasTracker && Array.isArray(data.financasTracker.txs)) return data.financasTracker.txs;
    if (Array.isArray(data.financas)) return data.financas;
    return [];
  }

  function getFinanceRules(state) {
    var data = state && state.data ? state.data : {};
    if (data.financasTracker && Array.isArray(data.financasTracker.recurrenceRules)) return data.financasTracker.recurrenceRules;
    if (Array.isArray(data.financasRecurrenceRules)) return data.financasRecurrenceRules;
    return [];
  }

  function financeToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function isFinanceFuture(tx) {
    return !!(tx && tx.date > financeToday());
  }

  function financeDelta(tx) {
    if (!tx) return 0;
    var value = Number(tx.value || 0);
    if (tx.type === "in") return value;
    if (tx.type === "out" || tx.type === "save") return -value;
    return 0;
  }

  function financeDateStr(year, month, day) {
    return year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  }

  function financeIsHoliday(dateStr, holidays) {
    return (holidays || []).indexOf(dateStr) >= 0;
  }

  function financeCountableDay(dateObj, countSaturday, holidays) {
    var dayOfWeek = dateObj.getDay();
    var dateStr = financeDateStr(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    if (financeIsHoliday(dateStr, holidays)) return false;
    if (dayOfWeek === 0) return false;
    if (dayOfWeek === 6) return !!countSaturday;
    return true;
  }

  function financeReceivableDay(dateObj, holidays) {
    var dayOfWeek = dateObj.getDay();
    var dateStr = financeDateStr(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    if (financeIsHoliday(dateStr, holidays)) return false;
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  }

  function financeShiftBusinessDay(dateObj, direction, holidays) {
    var next = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    var step = direction === "next_business_day" ? 1 : -1;
    while (!financeReceivableDay(next, holidays)) next.setDate(next.getDate() + step);
    return next;
  }

  function financeRuleDate(rule, year, month) {
    if (rule.pattern === "fixed_day") {
      var fixedDate = new Date(year, month, Math.min(Number(rule.day || 20), new Date(year, month + 1, 0).getDate()));
      var fixedNeedsShift = (!!rule.avoidWeekend && (fixedDate.getDay() === 0 || fixedDate.getDay() === 6)) ||
        (!!rule.fixedAvoidHoliday && financeIsHoliday(financeDateStr(year, month, fixedDate.getDate()), rule.holidays));
      if (fixedNeedsShift) fixedDate = financeShiftBusinessDay(fixedDate, rule.shift === "next_business_day" ? "next_business_day" : "previous_business_day", rule.holidays);
      return financeDateStr(fixedDate.getFullYear(), fixedDate.getMonth(), fixedDate.getDate());
    }

    var lastDay = new Date(year, month + 1, 0).getDate();
    var count = 0;
    var candidate = new Date(year, month, lastDay);
    var day;
    for (day = 1; day <= lastDay; day += 1) {
      var dateObj = new Date(year, month, day);
      if (!financeCountableDay(dateObj, !!rule.countSaturday, rule.holidays || [])) continue;
      count += 1;
      if (count >= Number(rule.nth || 5)) {
        candidate = dateObj;
        break;
      }
    }
    if (!financeReceivableDay(candidate, rule.holidays || [])) {
      candidate = financeShiftBusinessDay(candidate, rule.shift === "next_business_day" ? "next_business_day" : "previous_business_day", rule.holidays || []);
    }
    return financeDateStr(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
  }

  function financeRuleOccurrencesUntil(rules, endDate) {
    var end = new Date(endDate + "T12:00:00");
    var startYear = end.getFullYear() - 2;
    var startMonth = 0;
    (rules || []).forEach(function (rule) {
      if (!rule || !rule.startDate) return;
      var start = new Date(rule.startDate + "T12:00:00");
      if (start.getFullYear() < startYear) {
        startYear = start.getFullYear();
        startMonth = start.getMonth();
      } else if (start.getFullYear() === startYear) {
        startMonth = Math.min(startMonth, start.getMonth());
      }
    });
    var occurrences = [];
    var year = startYear;
    var month = startMonth;
    while (year < end.getFullYear() || (year === end.getFullYear() && month <= end.getMonth())) {
      (rules || []).forEach(function (rule) {
        if (!rule || !rule.startDate || Number(rule.value || 0) <= 0) return;
        var date = financeRuleDate(rule, year, month);
        if (date < rule.startDate || date > endDate) return;
        occurrences.push({
          date: date,
          type: rule.type,
          value: Number(rule.value || 0)
        });
      });
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    return occurrences;
  }

  function expandFinanceRecurringMonth(txs, year, month) {
    var result = [];
    (txs || []).forEach(function (tx) {
      if (!tx || !tx.date) return;
      var baseDate = new Date(tx.date + "T12:00:00");
      var txYear = baseDate.getFullYear();
      var txMonth = baseDate.getMonth();

      if (tx.recurrence === "monthly") {
        if (year > txYear || (year === txYear && month >= txMonth)) {
          var monthlyDate = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(baseDate.getDate()).padStart(2, "0");
          result.push(Object.assign({}, tx, { date: monthlyDate }));
        }
      } else if (tx.recurrence === "weekly") {
        var cur = new Date(tx.date + "T12:00:00");
        var firstOfMonth = new Date(year, month, 1);
        var lastOfMonth = new Date(year, month + 1, 0);
        while (cur < firstOfMonth) cur.setDate(cur.getDate() + 7);
        while (cur <= lastOfMonth) {
          var weeklyDate = cur.getFullYear() + "-" + String(cur.getMonth() + 1).padStart(2, "0") + "-" + String(cur.getDate()).padStart(2, "0");
          result.push(Object.assign({}, tx, { date: weeklyDate }));
          cur.setDate(cur.getDate() + 7);
        }
      } else if (txYear === year && txMonth === month) {
        result.push(tx);
      }
    });
    return result;
  }

  function computeHeaderFinance(state) {
    var txs = getFinanceTxs(state);
    var rules = getFinanceRules(state);
    var now = new Date();
    var today = financeToday();
    var ym = { y: now.getFullYear(), m: now.getMonth() };
    var saldo = 0;
    var inMonth = 0;
    var outMonth = 0;

    txs.forEach(function (tx) {
      if (!tx || !tx.date) return;
      if (tx.recurrence === "monthly") {
        var monthlyCur = new Date(tx.date + "T12:00:00");
        while (monthlyCur <= now) {
          saldo += financeDelta(tx);
          monthlyCur.setMonth(monthlyCur.getMonth() + 1);
        }
      } else if (tx.recurrence === "weekly") {
        var weeklyCur = new Date(tx.date + "T12:00:00");
        while (weeklyCur <= now) {
          saldo += financeDelta(tx);
          weeklyCur.setDate(weeklyCur.getDate() + 7);
        }
      } else if (tx.date <= today) {
        saldo += financeDelta(tx);
      }
    });
    financeRuleOccurrencesUntil(rules, today).forEach(function (tx) {
      saldo += financeDelta(tx);
    });

    expandFinanceRecurringMonth(txs, ym.y, ym.m).forEach(function (tx) {
      if (tx.type === "in") inMonth += Number(tx.value || 0);
      if (tx.type === "out") outMonth += Number(tx.value || 0);
    });
    financeRuleOccurrencesUntil(rules, financeDateStr(ym.y, ym.m, new Date(ym.y, ym.m + 1, 0).getDate())).forEach(function (tx) {
      if (tx.date.slice(0, 7) !== financeDateStr(ym.y, ym.m, 1).slice(0, 7)) return;
      if (tx.type === "in") inMonth += Number(tx.value || 0);
      if (tx.type === "out") outMonth += Number(tx.value || 0);
    });

    return {
      saldo: saldo,
      overload: inMonth === 0 ? outMonth > 0 : outMonth > inMonth * 0.4
    };
  }

  function renderHeaderBalance(state) {
    var currentState = state || loadState();
    var balanceVal = document.getElementById("header-balance-val");
    var balanceWrap = document.getElementById("header-balance");
    if (!balanceVal) return;
    var finance = computeHeaderFinance(currentState);
    var hidden = !(currentState.data && currentState.data.headerBalanceHidden === false);
    var formatted = "R$ " + Number(finance.saldo || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    balanceVal.textContent = hidden ? "R$ •••••" : formatted;
    balanceVal.classList.toggle("negative", !!finance.overload);
    balanceVal.classList.toggle("is-hidden", hidden);
    if (balanceWrap) {
      balanceWrap.classList.toggle("is-hidden", hidden);
      balanceWrap.setAttribute("aria-pressed", hidden ? "true" : "false");
      balanceWrap.setAttribute("title", hidden ? "Mostrar saldo" : "Ocultar saldo");
    }
  }

  function wireHeaderBalanceToggle(state) {
    var balanceWrap = document.getElementById("header-balance");
    if (!balanceWrap) return;
    balanceWrap.addEventListener("click", function () {
      var nextState = ensureStateShape(loadState());
      if (!nextState.data || typeof nextState.data !== "object") nextState.data = {};
      nextState.data.headerBalanceHidden = !nextState.data.headerBalanceHidden;
      state = applySiteState(nextState, loadState());
    });
  }

  function applySiteState(nextState, previousState) {
    var state = syncRpgState(nextState, previousState);
    saveState(state);
    applyProfileToUI(state);
    renderNotifications(state);
    renderRpgHeader(state);
    renderHeaderBalance(state);
    return state;
  }

  window.SoterRPG = {
    calcXP: function (state) { return calcRpgXp(state || loadState()); },
    getBreakdown: function (state) { return getRpgBreakdown(state || loadState()); },
    getAttrs: function (state) { return getRpgAttrs(state || loadState()); },
    getLog: function (state) { return buildRpgLog(state || loadState()); },
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
      '        <a class="hn-menu-item" data-page="revisao" href="revisao.html">Revisão</a>',
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
      '  <button class="header-balance" id="header-balance" type="button" aria-label="Alternar visibilidade do saldo" aria-pressed="false">',
      '    <div>',
      '      <div class="balance-label">Saldo</div>',
      '      <div class="balance-value" id="header-balance-val">R$ 0,00</div>',
      '    </div>',
      '  </button>',
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
      var id = btn.getAttribute("data-notif-id");
      state.data.notifications = ensureNotifications(state).filter(function (n) { return String(n.id) !== id; });
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

    if (page === "estudos" || page === "revisao") {
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
      },
      supportsFileStorage: function () {
        return supportsFileStorage();
      },
      getFileStorageStatus: function () {
        var current = ensureStateShape(loadState());
        var meta = current.data.fileStorage && typeof current.data.fileStorage === "object" ? current.data.fileStorage : {};
        var summary = meta.lastSyncedSummary && typeof meta.lastSyncedSummary === "object"
          ? meta.lastSyncedSummary
          : summarizeStateForSync(current);
        return Promise.resolve({
          supported: supportsFileStorage(),
          enabled: !!meta.enabled,
          folderName: meta.folderName || "",
          lastSyncAt: meta.lastSyncAt || fileLastSyncedAt || "",
          lastError: meta.lastError || fileLastError || "",
          logs: Array.isArray(meta.logs) ? meta.logs.slice().reverse() : [],
          summary: summary
        });
      },
      connectFileStorage: function () {
        if (!supportsFileStorage()) return Promise.reject(new Error("unsupported"));
        return window.showDirectoryPicker({ mode: "readwrite" }).then(function (handle) {
          return verifyFilePermission(handle, true).then(function (granted) {
            if (!granted) throw new Error("permission_denied");
            return storeFileHandle(handle).then(function () {
              updateFileStorageMeta({
                enabled: true,
                folderName: handle.name || "",
                lastError: ""
              });
              appendFileStorageLog("ok", "Pasta conectada para autosave.", { folderName: handle.name || "" });
              queueFileSync(loadState());
              return {
                supported: true,
                enabled: true,
                folderName: handle.name || "",
                lastSyncAt: fileLastSyncedAt || "",
                lastError: ""
              };
            });
          });
        });
      },
      disconnectFileStorage: function () {
        if (!supportsFileStorage()) return Promise.reject(new Error("unsupported"));
        return getStoredFileHandle().then(function (handle) {
          if (!handle) throw new Error("missing_handle");
          return removeStoredFileHandle();
        }).then(function () {
          fileLastError = "";
          updateFileStorageMeta({
            enabled: false,
            folderName: "",
            lastError: ""
          });
          appendFileStorageLog("warn", "Pasta local desconectada.", {});
          return true;
        }).catch(function (err) {
          fileLastError = String((err && err.message) || err || "disconnect_failed");
          updateFileStorageMeta({ lastError: fileLastError });
          appendFileStorageLog("err", "Falha ao desconectar a pasta local.", { error: fileLastError });
          throw err;
        });
      },
      syncFileStorageNow: function () {
        if (!supportsFileStorage()) return Promise.reject(new Error("unsupported"));
        var current = ensureStateShape(loadState());
        if (!getFileStorageEnabled(current)) {
          appendFileStorageLog("warn", "Sincronização manual ignorada sem pasta conectada.", {});
          return Promise.reject(new Error("storage_not_connected"));
        }
        queueFileSync(loadState());
        return getStoredFileHandle().then(function (handle) {
          if (!handle) throw new Error("missing_handle");
          return flushFileSync();
        }).then(function (result) {
          if (!result) throw new Error("sync_not_completed");
          return result;
        }).catch(function (err) {
          fileLastError = String((err && err.message) || err || "sync_failed");
          updateFileStorageMeta({ lastError: fileLastError });
          appendFileStorageLog("err", "Falha na sincronização manual.", { error: fileLastError });
          throw err;
        });
      },
      restoreFromFileStorage: function () {
        if (!supportsFileStorage()) return Promise.reject(new Error("unsupported"));
        var current = ensureStateShape(loadState());
        if (!getFileStorageEnabled(current)) return Promise.reject(new Error("storage_not_connected"));
        return getStoredFileHandle().then(function (handle) {
          if (!handle) throw new Error("missing_handle");
          return verifyFilePermission(handle, false).then(function (granted) {
            if (!granted) throw new Error("permission_denied");
            return readStateFromFile(handle);
          });
        }).then(function (diskState) {
          if (!diskState) throw new Error("empty_file");
          appendFileStorageLog("ok", "Restauração manual carregada do arquivo local.", summarizeStateForSync(diskState));
          return commit(diskState);
        });
      }
    };
  }

  renderHeader();
  renderFooter();
  syncScrollbarCompensation();
  window.addEventListener("resize", syncScrollbarCompensation);
  wireIndexNavigation();
  highlightCurrentPage();

  var siteState = loadState();
  siteState = syncRpgState(siteState, siteState);
  saveState(siteState);
  applyProfileToUI(siteState);
  wireProfileControls(siteState);
  renderNotifications(siteState);
  wireNotifications(siteState);
  window.addEventListener("soter:notifications-changed", function () {
    siteState = ensureStateShape(loadState());
    renderNotifications(siteState);
  });
  renderRpgHeader(siteState);
  renderHeaderBalance(siteState);
  wireHeaderBalanceToggle(siteState);
  exposeStorageApi(siteState);
  tryHydrateFromFile();
}());



