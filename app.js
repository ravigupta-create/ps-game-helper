(function () {
  "use strict";

  // === SECURITY: Sanitize all user-facing strings ===
  function sanitize(str) {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  // === STATE ===
  const state = {
    currentGame: null,
    currentFilter: "all",
    currentCategory: "all",
    cheatSheet: false,
    favorites: JSON.parse(localStorage.getItem("psg_favorites") || "[]"),
    theme: localStorage.getItem("psg_theme") || "dark",
    searchIdx: -1, // keyboard nav index for search
  };

  // === DOM REFS ===
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const dom = {
    nav: $("#gameNav"), landing: $("#landing"), detail: $("#gameDetail"),
    favPage: $("#favoritesPage"), gameGrid: $("#gameGrid"),
    tipsContainer: $("#tipsContainer"), gameTitle: $("#gameTitle"),
    gameDesc: $("#gameDesc"), gameTags: $("#gameTags"),
    gameIconLarge: $("#gameIconLarge"), searchInput: $("#searchInput"),
    searchResults: $("#searchResults"), favToggle: $("#favToggle"),
    themeToggle: $("#themeToggle"), backBtn: $("#backBtn"),
    progressFill: $("#progressFill"), progressText: $("#progressText"),
    progressBar: $("#progressBar"), favoritesContainer: $("#favoritesContainer"),
    noFavs: $("#noFavs"), statGames: $("#statGames"), statTips: $("#statTips"),
    statFavs: $("#statFavs"), categoryBar: $("#categoryBar"),
    cheatSheetToggle: $("#cheatSheetToggle"),
    randomBtn: $("#randomTip"), randomModal: $("#randomModal"),
    randomContent: $("#randomTipContent"), closeRandom: $("#closeRandom"),
    nextRandom: $("#nextRandom"),
  };

  // === SEARCH INDEX (pre-built for efficiency) ===
  let searchIndex = [];
  function buildSearchIndex() {
    searchIndex = [];
    GAMES.forEach((game) => {
      searchIndex.push({ type: "game", game, text: game.name.toLowerCase(), display: game.name, sub: game.genre });
      game.tips.forEach((tip) => {
        const combined = (tip.title + " " + tip.desc + " " + tip.controls.join(" ")).toLowerCase();
        searchIndex.push({ type: "tip", game, tip, text: combined, display: tip.title, sub: game.name });
      });
    });
  }

  // === INIT ===
  function init() {
    // Efficiency: sort games by category for consistent ordering
    GAMES.sort((a, b) => {
      const catOrder = ["sports","action","rpg","openworld","shooter","fighting","adventure","racing","indie","misc"];
      return catOrder.indexOf(a.category) - catOrder.indexOf(b.category);
    });
    buildSearchIndex();
    applyTheme();
    renderNav();
    renderLanding();
    updateStats();
    bindEvents();
    handleHash();
  }

  // === THEME ===
  function applyTheme() {
    if (state.theme === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }
  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("psg_theme", state.theme);
    applyTheme();
  }

  // === CATEGORY FILTER ===
  function getFilteredGames() {
    if (state.currentCategory === "all") return GAMES;
    return GAMES.filter((g) => g.category === state.currentCategory);
  }
  function setCategory(cat) {
    state.currentCategory = cat;
    localStorage.setItem("psg_category", cat);
    $$(".cat-btn").forEach((b) => b.classList.toggle("active", b.dataset.cat === cat));
    renderNav();
    renderLanding();
  }

  // === NAV ===
  function renderNav() {
    const games = getFilteredGames();
    let html = "";
    games.forEach((g) => {
      html += `<button class="nav-btn" data-game="${sanitize(g.id)}">
        <span class="nav-icon" style="background:${sanitize(g.color)}">${sanitize(g.icon)}</span>
        ${sanitize(g.name)}
      </button>`;
    });
    dom.nav.innerHTML = html;
  }

  // === LANDING ===
  function renderLanding() {
    const games = getFilteredGames();
    let html = "";
    games.forEach((g) => {
      const tipCount = g.tips.length;
      html += `<div class="game-card" data-game="${sanitize(g.id)}">
        <div class="card-icon" style="background:${sanitize(g.color)}">${sanitize(g.icon)}</div>
        <h3>${sanitize(g.name)}</h3>
        <div class="card-genre">${sanitize(g.genre)}</div>
        <div class="card-count">${tipCount} tips & controls</div>
        <div class="card-cat">${sanitize(g.category)}</div>
      </div>`;
    });
    dom.gameGrid.innerHTML = html;
  }

  // === STATS ===
  function updateStats() {
    let totalTips = 0;
    GAMES.forEach((g) => (totalTips += g.tips.length));
    dom.statGames.textContent = GAMES.length;
    dom.statTips.textContent = totalTips;
    dom.statFavs.textContent = state.favorites.length;
  }

  // === SHOW GAME ===
  function showGame(gameId) {
    const game = GAMES.find((g) => g.id === gameId);
    if (!game) return;
    state.currentGame = game;
    state.currentFilter = "all";
    state.cheatSheet = false;
    dom.tipsContainer.classList.remove("cheat-sheet");

    dom.landing.classList.add("hidden");
    dom.favPage.classList.add("hidden");
    dom.detail.classList.remove("hidden");
    dom.progressBar.classList.remove("hidden");

    dom.gameTitle.textContent = game.name;
    dom.gameDesc.textContent = game.desc;
    dom.gameIconLarge.style.background = game.color;
    dom.gameIconLarge.textContent = game.icon;

    let tagsHtml = "";
    game.tags.forEach((t) => { tagsHtml += `<span class="tag">${sanitize(t)}</span>`; });
    if (game.yearlyUpdate) {
      tagsHtml += `<span class="tag" style="border-color:var(--accent);color:var(--accent)">Updated Yearly</span>`;
    }
    dom.gameTags.innerHTML = tagsHtml;

    $$(".filter-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.filter === "all"));
    renderTips(game.tips);
    updateProgress();
    window.location.hash = gameId;
    $$(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.game === gameId));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // === RENDER TIPS WITH SECTION HEADERS ===
  function renderTips(tips) {
    const filtered = state.currentFilter === "all" ? tips : tips.filter((t) => t.level === state.currentFilter);
    let html = "";
    let lastSection = "";

    filtered.forEach((tip, i) => {
      // Section header
      if (tip.section && tip.section !== lastSection) {
        lastSection = tip.section;
        html += `<div class="section-header">${sanitize(tip.section)}</div>`;
      }
      const favKey = state.currentGame.id + "::" + tip.title;
      const isFav = state.favorites.includes(favKey);
      let controlsHtml = "";
      tip.controls.forEach((c) => { controlsHtml += `<span class="control-badge">${sanitize(c)}</span>`; });

      html += `<div class="tip-card ${sanitize(tip.level)}" data-index="${i}">
        <div class="tip-header">
          <span class="tip-title">${sanitize(tip.title)}</span>
          <div class="tip-badges">
            <span class="tip-level ${sanitize(tip.level)}">${sanitize(tip.level)}</span>
            <button class="fav-btn ${isFav ? "active" : ""}" data-fav="${sanitize(favKey)}" title="Save to favorites">
              ${isFav ? "&#9733;" : "&#9734;"}
            </button>
          </div>
        </div>
        <div class="tip-controls">${controlsHtml}</div>
        <div class="tip-desc">${sanitize(tip.desc)}</div>
        <div class="tip-why"><strong>Why this matters:</strong> ${sanitize(tip.why)}</div>
      </div>`;
    });

    if (filtered.length === 0) {
      html = `<div style="text-align:center;padding:40px;color:var(--text2)">No tips found for this filter.</div>`;
    }
    dom.tipsContainer.innerHTML = html;
  }

  // === FAVORITES ===
  function toggleFavorite(key) {
    const idx = state.favorites.indexOf(key);
    if (idx === -1) state.favorites.push(key);
    else state.favorites.splice(idx, 1);
    localStorage.setItem("psg_favorites", JSON.stringify(state.favorites));
    updateStats();
    if (state.currentGame) renderTips(state.currentGame.tips);
  }

  function showFavorites() {
    dom.landing.classList.add("hidden");
    dom.detail.classList.add("hidden");
    dom.progressBar.classList.add("hidden");
    dom.favPage.classList.remove("hidden");
    state.currentGame = null;
    $$(".nav-btn").forEach((btn) => btn.classList.remove("active"));

    if (state.favorites.length === 0) {
      dom.noFavs.classList.remove("hidden");
      dom.favoritesContainer.innerHTML = "";
      return;
    }
    dom.noFavs.classList.add("hidden");
    let html = "";
    state.favorites.forEach((favKey) => {
      const [gameId, tipTitle] = favKey.split("::");
      const game = GAMES.find((g) => g.id === gameId);
      if (!game) return;
      const tip = game.tips.find((t) => t.title === tipTitle);
      if (!tip) return;
      let controlsHtml = "";
      tip.controls.forEach((c) => { controlsHtml += `<span class="control-badge">${sanitize(c)}</span>`; });
      html += `<div class="tip-card ${sanitize(tip.level)}">
        <div class="fav-tip-game">${sanitize(game.icon)} ${sanitize(game.name)}</div>
        <div class="tip-header">
          <span class="tip-title">${sanitize(tip.title)}</span>
          <div class="tip-badges">
            <span class="tip-level ${sanitize(tip.level)}">${sanitize(tip.level)}</span>
            <button class="fav-btn active" data-fav="${sanitize(favKey)}">&#9733;</button>
          </div>
        </div>
        <div class="tip-controls">${controlsHtml}</div>
        <div class="tip-desc">${sanitize(tip.desc)}</div>
        <div class="tip-why"><strong>Why this matters:</strong> ${sanitize(tip.why)}</div>
      </div>`;
    });
    dom.favoritesContainer.innerHTML = html;
  }

  // === SEARCH (enhanced with keyboard nav) ===
  let searchDebounce = null;
  function handleSearch(query) {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.searchIdx = -1;
      if (!query || query.length < 2) {
        dom.searchResults.classList.add("hidden");
        return;
      }
      const q = query.toLowerCase();
      const results = [];
      for (let i = 0; i < searchIndex.length && results.length < 20; i++) {
        const entry = searchIndex[i];
        if (entry.text.includes(q)) {
          results.push(entry);
        }
      }
      if (results.length === 0) {
        dom.searchResults.innerHTML = `<div class="search-item">No results found</div>`;
        dom.searchResults.classList.remove("hidden");
        return;
      }
      let html = "";
      results.forEach((r, i) => {
        html += `<div class="search-item" data-si="${i}" data-game-id="${sanitize(r.game.id)}" data-type="${r.type}">
          <div>${sanitize(r.display)}</div>
          <div class="search-game">${sanitize(r.game.icon)} ${sanitize(r.sub)}</div>
        </div>`;
      });
      dom.searchResults.innerHTML = html;
      dom.searchResults.classList.remove("hidden");
    }, 150);
  }

  function searchKeyNav(e) {
    const items = dom.searchResults.querySelectorAll(".search-item[data-game-id]");
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      state.searchIdx = Math.min(state.searchIdx + 1, items.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      state.searchIdx = Math.max(state.searchIdx - 1, 0);
    } else if (e.key === "Enter" && state.searchIdx >= 0) {
      e.preventDefault();
      const item = items[state.searchIdx];
      if (item) {
        showGame(item.dataset.gameId);
        dom.searchInput.value = "";
        dom.searchResults.classList.add("hidden");
      }
      return;
    } else return;
    items.forEach((it, i) => it.classList.toggle("selected", i === state.searchIdx));
    items[state.searchIdx].scrollIntoView({ block: "nearest" });
  }

  // === RANDOM TIP ===
  function showRandomTip() {
    const game = GAMES[Math.floor(Math.random() * GAMES.length)];
    const tip = game.tips[Math.floor(Math.random() * game.tips.length)];
    let controlsHtml = "";
    tip.controls.forEach((c) => { controlsHtml += `<span class="control-badge">${sanitize(c)}</span>`; });
    dom.randomContent.innerHTML = `
      <div style="margin-bottom:8px;font-size:.8rem;color:var(--accent)">${sanitize(game.icon)} ${sanitize(game.name)}</div>
      <div class="tip-header">
        <span class="tip-title">${sanitize(tip.title)}</span>
        <span class="tip-level ${sanitize(tip.level)}">${sanitize(tip.level)}</span>
      </div>
      <div class="tip-controls" style="margin:8px 0">${controlsHtml}</div>
      <div class="tip-desc">${sanitize(tip.desc)}</div>
      <div class="tip-why" style="margin-top:8px"><strong>Why:</strong> ${sanitize(tip.why)}</div>`;
    dom.randomModal.classList.remove("hidden");
  }

  // === CHEAT SHEET TOGGLE ===
  function toggleCheatSheet() {
    state.cheatSheet = !state.cheatSheet;
    dom.tipsContainer.classList.toggle("cheat-sheet", state.cheatSheet);
  }

  // === PROGRESS ===
  function updateProgress() {
    if (!state.currentGame) return;
    requestAnimationFrame(() => {
      const cards = dom.tipsContainer.querySelectorAll(".tip-card");
      if (!cards.length) return;
      const vb = window.innerHeight;
      let visible = 0;
      cards.forEach((c) => { if (c.getBoundingClientRect().top < vb) visible++; });
      const pct = Math.round((visible / cards.length) * 100);
      dom.progressFill.style.width = pct + "%";
      dom.progressText.textContent = pct + "% explored (" + visible + "/" + cards.length + " tips)";
    });
  }

  function handleHash() {
    const hash = window.location.hash.slice(1);
    if (hash && GAMES.find((g) => g.id === hash)) showGame(hash);
  }

  function showLanding() {
    dom.detail.classList.add("hidden");
    dom.favPage.classList.add("hidden");
    dom.progressBar.classList.add("hidden");
    dom.landing.classList.remove("hidden");
    state.currentGame = null;
    window.location.hash = "";
    $$(".nav-btn").forEach((btn) => btn.classList.remove("active"));
  }

  // === EVENTS ===
  function bindEvents() {
    dom.nav.addEventListener("click", (e) => {
      const btn = e.target.closest(".nav-btn");
      if (btn) showGame(btn.dataset.game);
    });
    dom.gameGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".game-card");
      if (card) showGame(card.dataset.game);
    });
    dom.backBtn.addEventListener("click", showLanding);
    dom.themeToggle.addEventListener("click", toggleTheme);
    dom.favToggle.addEventListener("click", showFavorites);
    dom.cheatSheetToggle.addEventListener("click", toggleCheatSheet);
    dom.randomBtn.addEventListener("click", showRandomTip);
    dom.closeRandom.addEventListener("click", () => dom.randomModal.classList.add("hidden"));
    dom.nextRandom.addEventListener("click", showRandomTip);
    dom.randomModal.addEventListener("click", (e) => { if (e.target === dom.randomModal) dom.randomModal.classList.add("hidden"); });

    // Category bar
    dom.categoryBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".cat-btn");
      if (btn) setCategory(btn.dataset.cat);
    });

    // Filter buttons
    $$(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.currentFilter = btn.dataset.filter;
        $$(".filter-btn").forEach((b) => b.classList.toggle("active", b === btn));
        if (state.currentGame) renderTips(state.currentGame.tips);
      });
    });

    // Favorite delegation
    document.addEventListener("click", (e) => {
      const favBtn = e.target.closest(".fav-btn");
      if (favBtn) {
        toggleFavorite(favBtn.dataset.fav);
        if (!dom.favPage.classList.contains("hidden")) showFavorites();
      }
    });

    // Search
    dom.searchInput.addEventListener("input", (e) => handleSearch(e.target.value.trim()));
    dom.searchInput.addEventListener("keydown", searchKeyNav);
    dom.searchResults.addEventListener("click", (e) => {
      const item = e.target.closest(".search-item");
      if (item && item.dataset.gameId) {
        showGame(item.dataset.gameId);
        dom.searchInput.value = "";
        dom.searchResults.classList.add("hidden");
      }
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-box")) dom.searchResults.classList.add("hidden");
    });

    // Scroll
    let scrollTicking = false;
    window.addEventListener("scroll", () => {
      if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(() => { updateProgress(); scrollTicking = false; });
      }
    });

    window.addEventListener("hashchange", handleHash);

    // Keyboard
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!dom.randomModal.classList.contains("hidden")) { dom.randomModal.classList.add("hidden"); return; }
        if (!dom.detail.classList.contains("hidden")) showLanding();
        else if (!dom.favPage.classList.contains("hidden")) showLanding();
        dom.searchResults.classList.add("hidden");
        dom.searchInput.value = "";
      }
      // Ctrl/Cmd + K for search focus
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        dom.searchInput.focus();
      }
    });
  }

  init();
})();
