(function () {
  "use strict";

  var XP_PER_TREINO = 25;
  var XP_PER_HORA_ESTUDO = 20;
  var XP_PER_SONHO = 15;
  var XP_PER_VIAGEM = 50;

  var XP_PER_PAGINA_LIVRO = 0.14;
  var XP_PER_CAPITULO_MANGA = 4;
  var XP_PER_EPISODIO = 8;
  var XP_PER_FILME = 18;
  var XP_BONUS_CONCLUSAO_LIVRO = 10;
  var XP_BONUS_CONCLUSAO_MANGA = 8;
  var XP_BONUS_CONCLUSAO_SERIE = 12;
  var XP_BASE_TAREFA = { baixa: 8, media: 14, alta: 22 };

  var RPG_TITLES = [
    "Iniciante", "Aprendiz", "Explorador", "Aventureiro", "Viajante",
    "Veterano", "Especialista", "Mestre", "Grao-Mestre", "Lendario"
  ];

  var RPG_CLASSES = {
    scholar: { name: "Sabio", icon: "\uD83D\uDCDA", bonus: "Leitura e Estudo", color: "#c8a96e" },
    warrior: { name: "Guerreiro", icon: "\u2694", bonus: "Treino e Disciplina", color: "#e06b8b" },
    explorer: { name: "Explorador", icon: "\uD83E\uDDED", bonus: "Viagens e Aventura", color: "#5ec4a8" },
    artist: { name: "Artista", icon: "\uD83C\uDFA8", bonus: "Sonhos e Criacao", color: "#7c6fcd" },
    mage: { name: "Mago", icon: "\uD83D\uDD2E", bonus: "Conhecimento Arcano", color: "#4ab0e8" },
    ranger: { name: "Ranger", icon: "\uD83C\uDFF9", bonus: "Equilibrio Total", color: "#e8864a" }
  };

  var ACHIEVEMENTS = [
    { id: "first_book", group: "Leitura", icon: "\uD83D\uDCD6", name: "Primeira Leitura", col: "#c8a96e", desc: "Conclua 1 livro", req: "1 livro", check: function () { return getLivros().filter(isDoneLivro).length >= 1; } },
    { id: "bookworm", group: "Leitura", icon: "\uD83D\uDC1B", name: "Bibliofilo", col: "#c8a96e", desc: "Conclua 10 livros", req: "10 livros", check: function () { return getLivros().filter(isDoneLivro).length >= 10; } },
    { id: "bookmaster", group: "Leitura", icon: "\uD83C\uDFDB", name: "Mestre das Letras", col: "#c8a96e", desc: "Conclua 25 livros", req: "25 livros", check: function () { return getLivros().filter(isDoneLivro).length >= 25; } },
    { id: "cinephile", group: "Cinema", icon: "\uD83C\uDFAC", name: "Cinefilo", col: "#e8864a", desc: "Assista 5 filmes ou series", req: "5 titulos", check: function () { return getCinema().filter(isDoneCinema).length >= 5; } },
    { id: "cinelord", group: "Cinema", icon: "\uD83C\uDFA5", name: "Senhor do Cinema", col: "#e8864a", desc: "Assista 20 filmes ou series", req: "20 titulos", check: function () { return getCinema().filter(isDoneCinema).length >= 20; } },
    { id: "gym_start", group: "Academia", icon: "\uD83D\uDCAA", name: "Primeiro Treino", col: "#e06b8b", desc: "Registre 1 treino", req: "1 treino", check: function () { return getGym().length >= 1; } },
    { id: "gym_warrior", group: "Academia", icon: "\uD83C\uDFCB", name: "Guerreiro", col: "#e06b8b", desc: "Complete 30 treinos", req: "30 treinos", check: function () { return getGym().length >= 30; } },
    { id: "gym_legend", group: "Academia", icon: "\uD83E\uDD81", name: "Lenda da Academia", col: "#e06b8b", desc: "Complete 100 treinos", req: "100 treinos", check: function () { return getGym().length >= 100; } },
    { id: "scholar", group: "Estudo", icon: "\uD83C\uDF93", name: "Estudioso", col: "#4ab0e8", desc: "Acumule 10h de estudo", req: "10h estudo", check: function () { return getEstudosHoras() >= 10; } },
    { id: "professor", group: "Estudo", icon: "\uD83E\uDDD1\u200D\uD83C\uDFEB", name: "Professor", col: "#4ab0e8", desc: "Acumule 50h de estudo", req: "50h estudo", check: function () { return getEstudosHoras() >= 50; } },
    { id: "dreamer", group: "Sonhos", icon: "\uD83C\uDF19", name: "Sonhador", col: "#7c6fcd", desc: "Registre 5 sonhos", req: "5 sonhos", check: function () { return getSonhos().length >= 5; } },
    { id: "traveler", group: "Viagens", icon: "\u2708\uFE0F", name: "Viajante", col: "#5ec4a8", desc: "Visite 1 destino", req: "1 viagem", check: function () { return getViagens().filter(isVisitedViagem).length >= 1; } },
    { id: "globetrotter", group: "Viagens", icon: "\uD83C\uDF0D", name: "Desbravador", col: "#5ec4a8", desc: "Visite 5 destinos", req: "5 viagens", check: function () { return getViagens().filter(isVisitedViagem).length >= 5; } },
    { id: "manga_fan", group: "Mangas", icon: "\uD83D\uDDBC", name: "Otaku", col: "#e06b8b", desc: "Leia 5 mangas", req: "5 mangas", check: function () { return getMangas().filter(isDoneManga).length >= 5; } },
    { id: "taskmaster", group: "Tarefas", icon: "\u2705", name: "Mestre das Tarefas", col: "#5ec4a8", desc: "Conclua 20 tarefas", req: "20 tarefas", check: function () { return getTasks().filter(isDoneTask).length >= 20; } },
    { id: "planner", group: "Tarefas", icon: "\uD83D\uDCCB", name: "Planejador", col: "#5ec4a8", desc: "Conclua 50 tarefas", req: "50 tarefas", check: function () { return getTasks().filter(isDoneTask).length >= 50; } },
    { id: "level5", group: "Evolucao", icon: "\u2694", name: "Veterano", col: "#c8a96e", desc: "Alcance o nivel 5", req: "Nivel 5", check: function () { return getLevel(Math.round(calcXP())) >= 5; } },
    { id: "collector", group: "Colecao", icon: "\u2B50", name: "Colecionador", col: "#c8a96e", desc: "Marque 10 favoritos", req: "10 favoritos", check: function () { return getFavoritosCount() >= 10; } },
    { id: "legend", group: "Evolucao", icon: "\uD83D\uDC51", name: "Lendario", col: "#c8a96e", desc: "Alcance o nivel 10", req: "Nivel 10", check: function () { return getLevel(Math.round(calcXP())) >= 10; } },
    { id: "wishmaster", group: "Wishlist", icon: "\uD83C\uDF20", name: "Desejante", col: "#7c6fcd", desc: "Adicione 10 itens a wishlist", req: "10 desejos", check: function () { return getWishlist().length >= 10; } }
  ];

  var RPG_SKILLS = [
    { id: "reading", icon: "\uD83D\uDCD6", name: "Devorador de Paginas", desc: "Leia livros para evoluir", color: "#c8a96e", reqXP: 0, reqAch: null, getLevel: function () { return Math.min(10, getLivros().filter(isDoneLivro).length); } },
    { id: "cinema", icon: "\uD83C\uDFAC", name: "Olhos de Lince", desc: "Assista filmes e series", color: "#e8864a", reqXP: 0, reqAch: null, getLevel: function () { return Math.min(10, getCinema().filter(isDoneCinema).length); } },
    { id: "fitness", icon: "\uD83D\uDCAA", name: "Corpo de Ferro", desc: "Complete treinos na academia", color: "#e06b8b", reqXP: 0, reqAch: null, getLevel: function () { return Math.min(10, Math.floor(getGym().length / 3)); } },
    { id: "study", icon: "\uD83C\uDF93", name: "Mente Afiada", desc: "Acumule horas de estudo", color: "#4ab0e8", reqXP: 50, reqAch: null, getLevel: function () { return Math.min(10, Math.floor(getEstudosHoras() / 5)); } },
    { id: "travel", icon: "\u2708\uFE0F", name: "Passaporte Dourado", desc: "Visite novos destinos", color: "#5ec4a8", reqXP: 100, reqAch: null, getLevel: function () { return Math.min(10, getViagens().filter(isVisitedViagem).length * 2); } },
    { id: "dreams", icon: "\uD83C\uDF19", name: "Arquiteto dos Sonhos", desc: "Registre e conquiste sonhos", color: "#7c6fcd", reqXP: 150, reqAch: "dreamer", getLevel: function () { return Math.min(10, getSonhos().length); } },
    { id: "planning", icon: "\uD83D\uDCCB", name: "Estrategista", desc: "Conclua tarefas e planeje", color: "#5ec4a8", reqXP: 200, reqAch: "taskmaster", getLevel: function () { return Math.min(10, Math.floor(getTasks().filter(isDoneTask).length / 5)); } },
    { id: "manga", icon: "\uD83D\uDCD6", name: "Espirito Otaku", desc: "Leia mangas e light novels", color: "#e06b8b", reqXP: 250, reqAch: "manga_fan", getLevel: function () { return Math.min(10, getMangas().filter(isDoneManga).length); } }
  ];

  function getState() {
    var state = window.SoterStorage && window.SoterStorage.getState ? window.SoterStorage.getState() : { profile: {}, data: {} };
    if (!state.profile || typeof state.profile !== "object") state.profile = { name: "Usuario", avatar: "" };
    if (!state.data || typeof state.data !== "object") state.data = {};
    if (!state.data.rpg || typeof state.data.rpg !== "object") state.data.rpg = { classe: "scholar", missions: {}, log: [] };
    if (!state.data.rpg.missions || typeof state.data.rpg.missions !== "object") state.data.rpg.missions = {};
    return state;
  }

  function saveState(state) {
    if (window.SoterStorage && window.SoterStorage.save) window.SoterStorage.save(state);
  }

  function pickArray(data, keys) {
    var i;
    for (i = 0; i < keys.length; i += 1) {
      if (Array.isArray(data[keys[i]])) return data[keys[i]];
    }
    return [];
  }

  function getLivros() { return pickArray(getState().data, ["trackerLivraria", "trackerLivros", "livros", "livraria"]); }
  function getCinema() { return pickArray(getState().data, ["trackerCinema", "trackerFilmes", "trackerSeries", "cinema", "filmes"]); }
  function getMangas() { return pickArray(getState().data, ["trackerMangas", "trackerManga", "mangas"]); }
  function getTasks() { return pickArray(getState().data, ["tasks", "tarefas"]); }
  function getWishlist() { return pickArray(getState().data, ["wishlist"]); }
  function getGym() { return pickArray(getState().data, ["academia", "gym", "treinos", "workouts"]); }
  function getEstudos() { return pickArray(getState().data, ["estudos"]); }
  function getViagens() { return pickArray(getState().data, ["viagens", "travels"]); }

  function getSonhos() {
    var data = getState().data;
    if (data.sonhosHub && Array.isArray(data.sonhosHub.sonhos)) return data.sonhosHub.sonhos;
    return pickArray(data, ["sonhos"]);
  }

  function getEstudosHoras() {
    return getEstudos().reduce(function (acc, item) { return acc + Number(item.horas || 0); }, 0);
  }

  function isDoneLivro(item) { return item && item.status === "concluido"; }
  function isDoneCinema(item) { return item && item.status === "concluido"; }
  function isDoneManga(item) { return item && item.status === "concluido"; }
  function isDoneTask(item) { return item && !!item.done; }
  function isVisitedViagem(item) { return item && ["feito", "visitado", "concluido"].indexOf(String(item.status || "").toLowerCase()) >= 0; }

  function getFavoritosCount() {
    return getLivros().concat(getCinema(), getMangas()).filter(function (item) { return !!item.fav; }).length;
  }

  function clampProgress(current, total) {
    var safeCurrent = Math.max(0, Number(current || 0));
    var safeTotal = Math.max(0, Number(total || 0));
    if (!safeTotal) return safeCurrent;
    return Math.min(safeCurrent, safeTotal);
  }

  function getLivroPagesRead(item) {
    if (!item) return 0;
    var total = Number(item.paginas || 0);
    var current = Number(item.atual || 0);
    if (item.status === "concluido" && total > 0) return total;
    return clampProgress(current, total);
  }

  function getMangaChaptersRead(item) {
    if (!item) return 0;
    var total = Number(item.capTotal || 0);
    var current = Number(item.capAtual || 0);
    if (item.status === "concluido" && total > 0) return total;
    return clampProgress(current, total);
  }

  function getCinemaUnits(item) {
    if (!item) return 0;
    if (item.tipo === "Série") {
      var epTotal = Number(item.episodioTotal || 0);
      var epAtual = Number(item.episodioAtual || 0);
      if (item.status === "concluido" && epTotal > 0) return epTotal;
      if (epTotal > 0 || epAtual > 0) return clampProgress(epAtual, epTotal);
      var tempTotal = Number(item.temporadaTotal || 0);
      var tempAtual = Number(item.temporadaAtual || 0);
      if (item.status === "concluido" && tempTotal > 0) return tempTotal;
      return clampProgress(tempAtual, tempTotal);
    }
    return item.status === "concluido" ? 1 : 0;
  }

  function calcLivroXP(item) {
    var pages = getLivroPagesRead(item);
    var bonus = item && item.status === "concluido" ? XP_BONUS_CONCLUSAO_LIVRO : 0;
    return Math.round(pages * XP_PER_PAGINA_LIVRO + bonus);
  }

  function calcMangaXP(item) {
    var chapters = getMangaChaptersRead(item);
    var bonus = item && item.status === "concluido" ? XP_BONUS_CONCLUSAO_MANGA : 0;
    return Math.round(chapters * XP_PER_CAPITULO_MANGA + bonus);
  }

  function calcCinemaXP(item) {
    if (!item) return 0;
    if (item.tipo === "Série") {
      var units = getCinemaUnits(item);
      var bonus = item.status === "concluido" ? XP_BONUS_CONCLUSAO_SERIE : 0;
      return Math.round(units * XP_PER_EPISODIO + bonus);
    }
    return item.status === "concluido" ? XP_PER_FILME : 0;
  }

  function getTaskComplexity(task) {
    if (!task) return 0;
    var subtasks = Array.isArray(task.subtarefas) ? task.subtarefas.length : 0;
    var childTasks = getTasks().filter(function (item) { return item.parentId === task.id; }).length;
    var complexity = subtasks * 3 + childTasks * 6;
    if (task.parentId) complexity += 4;
    if (subtasks >= 3) complexity += 6;
    if (childTasks > 0) complexity += 8;
    return complexity;
  }

  function calcTaskXP(task) {
    if (!task || !task.done) return 0;
    var base = XP_BASE_TAREFA[String(task.prior || "media").toLowerCase()] || XP_BASE_TAREFA.media;
    return base + getTaskComplexity(task);
  }

  function getXPBreakdown() {
    return {
      livros: getLivros().reduce(function (acc, item) { return acc + calcLivroXP(item); }, 0),
      cinema: getCinema().reduce(function (acc, item) { return acc + calcCinemaXP(item); }, 0),
      mangas: getMangas().reduce(function (acc, item) { return acc + calcMangaXP(item); }, 0),
      treinos: getGym().length * XP_PER_TREINO,
      estudo: Math.round(getEstudosHoras() * XP_PER_HORA_ESTUDO),
      tarefas: getTasks().reduce(function (acc, item) { return acc + calcTaskXP(item); }, 0),
      sonhos: getSonhos().length * XP_PER_SONHO,
      viagens: getViagens().filter(isVisitedViagem).length * XP_PER_VIAGEM
    };
  }

  function calcXP() {
    if (window.SoterRPG && window.SoterRPG.calcXP) return window.SoterRPG.calcXP(getState());
    var breakdown = getXPBreakdown();
    return breakdown.livros + breakdown.cinema + breakdown.mangas + breakdown.treinos +
      breakdown.estudo + breakdown.tarefas + breakdown.sonhos + breakdown.viagens;
  }

  function xpForLevel(level) {
    if (window.SoterRPG && window.SoterRPG.xpForLevel) return window.SoterRPG.xpForLevel(level);
    return level * 100 + (level - 1) * 50;
  }

  function getLevel(xp) {
    if (window.SoterRPG && window.SoterRPG.getLevel) return window.SoterRPG.getLevel(xp);
    var level = 1;
    while (xp >= xpForLevel(level + 1)) level += 1;
    return level;
  }

  function rpgGetMissions() {
    var state = getState();
    if (window.SoterRPG && window.SoterRPG.syncState) {
      state = window.SoterRPG.syncState(state, getState());
    }
    var today = new Date().toISOString().slice(0, 10);
    if (state.data.rpg.missionsDate !== today) {
      state.data.rpg.missions = {};
      state.data.rpg.missionsDate = today;
      saveState(state);
    }
    var pool = [
      { id: "m_leitura", icon: "\uD83D\uDCDA", name: "Sessao de Leitura", desc: "Abra a pagina de livros e registre progresso", xp: 20, color: "#c8a96e" },
      { id: "m_treino", icon: "\uD83D\uDCAA", name: "Treino do Dia", desc: "Registre um treino na Academia", xp: 30, color: "#e06b8b" },
      { id: "m_tarefa", icon: "\u2705", name: "Conclua uma Tarefa", desc: "Marque ao menos 1 tarefa como concluida hoje", xp: 15, color: "#5ec4a8" },
      { id: "m_estudo", icon: "\uD83C\uDF93", name: "Hora de Estudo", desc: "Adicione uma sessao de estudo", xp: 25, color: "#4ab0e8" },
      { id: "m_sonho", icon: "\uD83C\uDF19", name: "Registro de Sonho", desc: "Adicione ou revise um sonho", xp: 10, color: "#7c6fcd" },
      { id: "m_cinema", icon: "\uD83C\uDFAC", name: "Sessao de Cinema", desc: "Registre um filme ou serie", xp: 15, color: "#e8864a" },
      { id: "m_manga", icon: "\uD83D\uDDBC", name: "Capitulo de Manga", desc: "Atualize seu progresso de manga", xp: 12, color: "#e06b8b" },
      { id: "m_wishlist", icon: "\uD83C\uDF20", name: "Atualizar Wishlist", desc: "Adicione ou revise um item da wishlist", xp: 8, color: "#7c6fcd" }
    ];
    var seed = parseInt(today.replace(/-/g, ""), 10) % pool.length;
    return [0, 1, 2, 3].map(function (offset) {
      var mission = pool[(seed + offset) % pool.length];
      return {
        id: mission.id,
        icon: mission.icon,
        name: mission.name,
        desc: mission.desc,
        xp: mission.xp,
        color: mission.color,
        done: !!state.data.rpg.missions[mission.id]
      };
    });
  }

  function rpgToggleMission(id) {
    var state = getState();
    if (state.data.rpg.missions[id]) return;
    state.data.rpg.missions[id] = true;
    saveState(state);
    rpgRender();
  }

  function rpgSetClass(cls) {
    var state = getState();
    state.data.rpg.classe = cls;
    saveState(state);
    rpgRender();
  }

  function rpgCalcAttrs() {
    var livros = getLivros().filter(isDoneLivro).length;
    var cinema = getCinema().filter(isDoneCinema).length;
    var gym = getGym().length;
    var estudo = getEstudosHoras();
    var tarefas = getTasks().filter(isDoneTask).length;
    var viagens = getViagens().filter(isVisitedViagem).length;
    var xp = Math.round(calcXP());
    function cap100(val) { return Math.min(100, val); }
    return [
      { icon: "\uD83E\uDDE0", label: "Intelecto", val: cap100(livros * 4 + estudo * 2), color: "#c8a96e" },
      { icon: "\uD83D\uDCAA", label: "Forca", val: cap100(gym * 3), color: "#e06b8b" },
      { icon: "\uD83E\uDDED", label: "Sabedoria", val: cap100(livros * 2 + estudo * 3), color: "#4ab0e8" },
      { icon: "\u26A1", label: "Disciplina", val: cap100(tarefas * 2 + gym), color: "#5ec4a8" },
      { icon: "\uD83C\uDF0D", label: "Exploracao", val: cap100(viagens * 10 + cinema * 2), color: "#7c6fcd" },
      { icon: "\u2728", label: "Prestigio", val: cap100(Math.floor(xp / 20)), color: "#e8864a" }
    ];
  }

  function rpgBuildLog() {
    var entries = [];
    var now = Date.now();

    getLivros().filter(function (item) { return getLivroPagesRead(item) > 0; }).slice(-3).forEach(function (item) {
      entries.push({ icon: "\uD83D\uDCD6", text: 'Leitura registrada: "' + (item.titulo || item.title || "Livro") + '"', xp: calcLivroXP(item), t: item.updatedAt || item.id || now });
    });
    getCinema().filter(function (item) { return calcCinemaXP(item) > 0; }).slice(-3).forEach(function (item) {
      entries.push({ icon: "\uD83C\uDFAC", text: 'Progresso no cinema: "' + (item.titulo || item.title || "Titulo") + '"', xp: calcCinemaXP(item), t: item.updatedAt || item.id || now });
    });
    getMangas().filter(function (item) { return getMangaChaptersRead(item) > 0; }).slice(-3).forEach(function (item) {
      entries.push({ icon: "\uD83D\uDDBC", text: 'Leitura de manga: "' + (item.titulo || item.title || "Manga") + '"', xp: calcMangaXP(item), t: item.updatedAt || item.id || now });
    });
    getGym().slice(-4).forEach(function (item) {
      entries.push({ icon: "\uD83D\uDCAA", text: "Treino registrado" + (item.tipo ? " - " + item.tipo : ""), xp: XP_PER_TREINO, t: item.updatedAt || item.id || now });
    });
    getTasks().filter(isDoneTask).slice(-3).forEach(function (item) {
      entries.push({ icon: "\u2705", text: 'Tarefa concluida: "' + (item.nome || "Tarefa") + '"', xp: calcTaskXP(item), t: item.updatedAt || item.id || now });
    });
    getViagens().filter(isVisitedViagem).slice(-2).forEach(function (item) {
      entries.push({ icon: "\u2708\uFE0F", text: "Visitou " + (item.flag || "") + " " + (item.dest || item.destino || "Destino"), xp: XP_PER_VIAGEM, t: item.updatedAt || item.id || now });
    });
    getEstudos().slice(-2).forEach(function (item) {
      entries.push({ icon: "\uD83C\uDF93", text: "Estudou " + Number(item.horas || 0) + "h - " + (item.materia || "Estudo"), xp: Math.round(Number(item.horas || 0) * XP_PER_HORA_ESTUDO), t: item.updatedAt || item.id || now });
    });
    return entries.sort(function (a, b) { return b.t - a.t; }).slice(0, 12);
  }

  function renderAchievements() {
    var container = document.getElementById("rpg-achievements");
    var sub = document.getElementById("rpg-ach-sub");
    var unlockCount = ACHIEVEMENTS.filter(function (item) { return item.check(); }).length;
    var groups = {};

    if (sub) sub.textContent = unlockCount + "/" + ACHIEVEMENTS.length + " desbloqueadas";
    if (!container) return;

    ACHIEVEMENTS.forEach(function (item) {
      var key = item.group || "Geral";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    container.innerHTML = Object.keys(groups).map(function (groupName) {
      var items = groups[groupName];
      var unlockedInGroup = items.filter(function (item) { return item.check(); }).length;
      return '<section class="rpg-ach-group">' +
        '<div class="rpg-ach-group-head"><div class="rpg-ach-group-title">' + groupName + '</div><div class="rpg-ach-group-meta">' + unlockedInGroup + "/" + items.length + '</div></div>' +
        '<div class="rpg-ach-group-grid">' + items.map(function (item) {
          var unlocked = item.check();
          return '<div class="rpg-badge ' + (unlocked ? "" : "locked") + '" style="--badge-color:' + item.col + '">' +
            '<div class="rpg-badge-icon-wrap">' + item.icon + '</div>' +
            '<div style="flex:1;min-width:0"><div class="rpg-badge-name">' + item.name + '</div><div class="rpg-badge-desc">' + item.desc + '</div></div>' +
            '<div class="rpg-badge-status">' + (unlocked ? "\u2713 Obtida" : "\uD83D\uDD12 " + item.req) + '</div></div>';
        }).join("") + "</div></section>";
    }).join("");
  }

  function handleAvatarUpload(event) {
    var file = event && event.target && event.target.files ? event.target.files[0] : null;
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (loadEvent) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        var size = 200;
        var min = Math.min(img.width, img.height);
        var sx = (img.width - min) / 2;
        var sy = (img.height - min) / 2;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        var state = getState();
        state.profile.avatar = canvas.toDataURL("image/jpeg", 0.85);
        saveState(state);
        rpgRender();
      };
      img.src = loadEvent.target.result;
    };
    reader.readAsDataURL(file);
  }

  function touchPageMeta() {
    var state = getState();
    state.data.lastVisitedPage = "rpg";
    state.data.lastVisitedAt = new Date().toISOString();
    saveState(state);
  }

  function rpgRender() {
    var state = getState();
    var xp = Math.round(calcXP());
    var level = getLevel(xp);
    var xpThisLevel = xpForLevel(level);
    var xpNext = xpForLevel(level + 1);
    var pct = Math.min(100, Math.round((xp - xpThisLevel) / (xpNext - xpThisLevel) * 100));
    var cls = RPG_CLASSES[state.data.rpg.classe] || RPG_CLASSES.scholar;
    var title = RPG_TITLES[Math.min(level - 1, RPG_TITLES.length - 1)];
    var name = (state.profile.name || "Usuario").trim() || "Usuario";
    var initials = name.split(/\s+/).map(function (word) { return word.charAt(0); }).join("").slice(0, 2).toUpperCase() || "?";
    var avatar = state.profile.avatar || "";
    var breakdown = getXPBreakdown();

    function setText(id, value) {
      var element = document.getElementById(id);
      if (element) element.textContent = value;
    }

    setText("rpg-hero-name", name);
    setText("rpg-hero-title", cls.icon + " " + cls.name + " - Nivel " + level);
    setText("rpg-class-badge", cls.name);
    setText("rpg-xp-label", xp.toLocaleString("pt-BR") + " XP");
    setText("rpg-xp-next-label", (xpNext - xp).toLocaleString("pt-BR") + " XP para nivel " + (level + 1));
    setText("rpg-orb-level", String(level));
    setText("rpg-level-big", String(level));
    setText("rpg-level-title", title);
    setText("rpg-level-sub", cls.icon + " " + cls.name + " - " + cls.bonus);
    setText("rpg-qs-livros", String(getLivros().filter(isDoneLivro).length));
    setText("rpg-qs-cinema", String(getCinema().filter(isDoneCinema).length));
    setText("rpg-qs-gym", String(getGym().length));
    setText("rpg-qs-tarefas", String(getTasks().filter(isDoneTask).length));

    var xpBar = document.getElementById("rpg-xp-bar");
    if (xpBar) xpBar.style.width = pct + "%";

    var avatarWrap = document.getElementById("rpg-avatar");
    var avatarImg = document.getElementById("rpg-avatar-img");
    var initialsEl = document.getElementById("rpg-initials");
    if (avatarWrap && avatarImg) {
      if (avatar) {
        avatarWrap.classList.add("has-photo");
        avatarImg.src = avatar;
      } else {
        avatarWrap.classList.remove("has-photo");
        avatarImg.removeAttribute("src");
      }
    }
    if (initialsEl) initialsEl.textContent = initials;

    var attrsEl = document.getElementById("rpg-attrs");
    if (attrsEl) {
      attrsEl.innerHTML = rpgCalcAttrs().map(function (attr) {
        return '<div class="rpg-attr"><div class="rpg-attr-icon">' + attr.icon + '</div><div class="rpg-attr-main"><div class="rpg-attr-label">' + attr.label + '</div><div class="rpg-attr-bar-wrap"><div class="rpg-attr-bar" style="width:0%;background:' + attr.color + '" data-w="' + attr.val + '"></div></div></div><div class="rpg-attr-val">' + attr.val + "</div></div>";
      }).join("");
      setTimeout(function () {
        attrsEl.querySelectorAll("[data-w]").forEach(function (bar) { bar.style.width = bar.getAttribute("data-w") + "%"; });
      }, 80);
    }

    document.querySelectorAll(".rpg-class-opt").forEach(function (node) {
      node.classList.toggle("active", node.getAttribute("data-class") === state.data.rpg.classe);
    });

    var xpSources = document.getElementById("rpg-xp-sources");
    if (xpSources) {
      var sources = [
        { icon: "\uD83D\uDCDA", label: "Livraria", val: breakdown.livros },
        { icon: "\uD83C\uDFAC", label: "Cinema", val: breakdown.cinema },
        { icon: "\uD83D\uDDBC", label: "Mangas", val: breakdown.mangas },
        { icon: "\uD83D\uDCAA", label: "Treinos", val: breakdown.treinos },
        { icon: "\u2705", label: "Tarefas", val: breakdown.tarefas },
        { icon: "\uD83C\uDF93", label: "Estudo", val: breakdown.estudo },
        { icon: "\uD83C\uDF19", label: "Sonhos", val: breakdown.sonhos },
        { icon: "\u2708\uFE0F", label: "Viagens", val: breakdown.viagens }
      ].filter(function (item) { return item.val > 0; });
      xpSources.innerHTML = sources.map(function (item) {
        return '<div class="rpg-xp-source">' + item.icon + " " + item.label + ' <span class="rpg-xp-source-val">+' + item.val + "</span></div>";
      }).join("");
    }

    var missions = rpgGetMissions();
    setText("rpg-missions-sub", missions.filter(function (mission) { return mission.done; }).length + "/" + missions.length + " concluidas");
    var missionsEl = document.getElementById("rpg-missions");
    if (missionsEl) {
      missionsEl.innerHTML = missions.map(function (mission) {
        return '<div class="rpg-mission ' + (mission.done ? "done locked" : "") + '" style="--m-color:' + mission.color + '" onclick="rpgToggleMission(\'' + mission.id + '\')" title="' + (mission.done ? "Missao concluida. Disponivel novamente no proximo dia." : "Clique para concluir") + '">' +
          '<div class="rpg-mission-check">' + (mission.done ? "\u2713" : "") + '</div><div class="rpg-mission-info"><div class="rpg-mission-name">' + mission.icon + " " + mission.name + '</div><div class="rpg-mission-meta">' + mission.desc + '</div></div><div class="rpg-mission-xp">+' + mission.xp + " XP</div></div>";
      }).join("");
    }

    var skillsEl = document.getElementById("rpg-skills-grid");
    var skillsUnlocked = RPG_SKILLS.filter(function (skill) {
      var achievement = skill.reqAch ? ACHIEVEMENTS.find(function (item) { return item.id === skill.reqAch; }) : null;
      return xp >= skill.reqXP && (!achievement || achievement.check());
    }).length;
    setText("rpg-skills-sub", skillsUnlocked + "/" + RPG_SKILLS.length + " desbloqueadas");
    if (skillsEl) {
      skillsEl.innerHTML = RPG_SKILLS.map(function (skill) {
        var achievement = skill.reqAch ? ACHIEVEMENTS.find(function (item) { return item.id === skill.reqAch; }) : null;
        var unlocked = xp >= skill.reqXP && (!achievement || achievement.check());
        var levelNum = unlocked ? skill.getLevel() : 0;
        return '<div class="rpg-skill ' + (unlocked ? "" : "locked") + '" style="--skill-color:' + skill.color + '">' +
          '<div class="rpg-skill-header"><div class="rpg-skill-icon">' + skill.icon + '</div>' +
          (unlocked ? '<div class="rpg-skill-active-badge">\u2713 Ativa</div>' : '<div class="rpg-skill-lock-badge">Nv' + Math.ceil(skill.reqXP / 100) + " req.</div>") +
          '</div><div class="rpg-skill-name">' + skill.name + '</div><div class="rpg-skill-desc">' + skill.desc + '</div>' +
          '<div class="rpg-skill-foot"><span class="rpg-skill-lvl-txt">Nivel ' + levelNum + '/10</span><span class="rpg-skill-lvl-num">' + (levelNum > 0 ? "\u25AE".repeat(Math.min(levelNum, 5)) + (levelNum > 5 ? "+" : "") : "-") + '</span></div>' +
          '<div class="rpg-skill-lvl-bar"><div class="rpg-skill-lvl-fill" style="width:' + (levelNum * 10) + '%"></div></div></div>';
      }).join("");
    }

    renderAchievements();

    var logEl = document.getElementById("rpg-log");
    if (logEl) {
      var log = rpgBuildLog();
      logEl.innerHTML = log.length ? log.map(function (entry) {
        return '<div class="rpg-log-item"><div class="rpg-log-icon">' + entry.icon + '</div><div class="rpg-log-text">' + entry.text + '</div><div class="rpg-log-xp">+' + entry.xp + "</div></div>";
      }).join("") : '<div class="rpg-log-empty">\u2726 Nenhuma atividade ainda. Comece a explorar o universo! \u2726</div>';
    }
  }

  window.rpgToggleMission = rpgToggleMission;
  window.rpgSetClass = rpgSetClass;
  window.handleAvatarUpload = handleAvatarUpload;

  touchPageMeta();
  rpgRender();
}());
