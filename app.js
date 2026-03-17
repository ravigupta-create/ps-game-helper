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
    yearSelections: JSON.parse(localStorage.getItem("psg_years") || "{}"),
    searchIdx: -1,
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
    yearSelector: $("#yearSelector"), yearSelect: $("#yearSelect"),
    yearNotes: $("#yearNotes"),
  };

  // === SEARCH INDEX ===
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

  // === YEAR SYSTEM ===
  // Get the user's selected year for a yearly game, or the current/default year
  function getSelectedYear(gameId) {
    if (state.yearSelections[gameId] !== undefined) {
      return parseInt(state.yearSelections[gameId]);
    }
    // Default to the max year (current)
    const yc = typeof YEAR_CHANGES !== "undefined" ? YEAR_CHANGES[gameId] : null;
    return yc ? yc.maxYear : CURRENT_YEAR;
  }

  function setSelectedYear(gameId, year) {
    state.yearSelections[gameId] = year;
    localStorage.setItem("psg_years", JSON.stringify(state.yearSelections));
  }

  // Get the display name for a game at a specific year
  function getGameNameForYear(game, year) {
    const yc = typeof YEAR_CHANGES !== "undefined" ? YEAR_CHANGES[game.id] : null;
    if (yc && yc.nameFormat) {
      return yc.nameFormat(year);
    }
    return game.name;
  }

  // Build the tips list for a game at a specific year
  // - Removes tips that didn't exist in that year
  // - Adds year-specific tips
  // - Marks tips as "new in [year]" where applicable
  function getTipsForYear(game, year) {
    const yc = typeof YEAR_CHANGES !== "undefined" ? YEAR_CHANGES[game.id] : null;
    if (!yc || year === yc.maxYear) {
      // Current year = use base tips as-is
      return game.tips.map(function(t) { return Object.assign({}, t); });
    }

    // Build set of removed tip titles for this year and all years before it up to selected
    var removedTitles = new Set();
    var addedTips = [];

    // For the selected year, gather what's removed and added
    var yearData = yc.changes[year];
    if (yearData) {
      if (yearData.removed) {
        yearData.removed.forEach(function(t) { removedTitles.add(t); });
      }
      if (yearData.added) {
        yearData.added.forEach(function(t) {
          var tip = Object.assign({}, t);
          tip._yearAdded = year;
          addedTips.push(tip);
        });
      }
    }

    // Filter base tips: remove ones that didn't exist
    var tips = game.tips.filter(function(t) {
      return !removedTitles.has(t.title);
    }).map(function(t) { return Object.assign({}, t); });

    // Add year-specific tips
    tips = tips.concat(addedTips);

    return tips;
  }

  function getYearNotes(gameId, year) {
    var yc = typeof YEAR_CHANGES !== "undefined" ? YEAR_CHANGES[gameId] : null;
    if (!yc) return "";
    var yd = yc.changes[year];
    return yd && yd.notes ? yd.notes : "";
  }

  // Setup the year selector dropdown for a game
  function setupYearSelector(game) {
    var yc = typeof YEAR_CHANGES !== "undefined" ? YEAR_CHANGES[game.id] : null;
    if (!game.yearlyUpdate || !yc) {
      dom.yearSelector.classList.add("hidden");
      return;
    }

    dom.yearSelector.classList.remove("hidden");
    var selectedYear = getSelectedYear(game.id);

    // Populate dropdown
    var html = "";
    for (var y = yc.maxYear; y >= yc.minYear; y--) {
      var label = getGameNameForYear(game, y);
      var sel = (y === selectedYear) ? " selected" : "";
      html += '<option value="' + y + '"' + sel + '>' + sanitize(label) + (y === yc.maxYear ? " (Latest)" : "") + '</option>';
    }
    dom.yearSelect.innerHTML = html;

    // Show notes
    var notes = getYearNotes(game.id, selectedYear);
    dom.yearNotes.textContent = notes;
  }

  function onYearChange() {
    if (!state.currentGame) return;
    var year = parseInt(dom.yearSelect.value);
    setSelectedYear(state.currentGame.id, year);

    // Update title
    var displayName = getGameNameForYear(state.currentGame, year);
    dom.gameTitle.textContent = displayName;

    // Update notes
    var notes = getYearNotes(state.currentGame.id, year);
    dom.yearNotes.textContent = notes;

    // Re-render tips for selected year
    var tips = getTipsForYear(state.currentGame, year);
    renderTips(tips, year, state.currentGame);
    updateProgress();
  }

  // === INIT ===
  function init() {
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
      // Use year-appropriate name if yearly
      var displayName = g.name;
      if (g.yearlyUpdate && typeof YEAR_CHANGES !== "undefined" && YEAR_CHANGES[g.id]) {
        var yr = getSelectedYear(g.id);
        displayName = getGameNameForYear(g, yr);
      }
      html += `<button class="nav-btn" data-game="${sanitize(g.id)}">
        <span class="nav-icon" style="background:${sanitize(g.color)}">${sanitize(g.icon)}</span>
        ${sanitize(displayName)}
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
      var displayName = g.name;
      if (g.yearlyUpdate && typeof YEAR_CHANGES !== "undefined" && YEAR_CHANGES[g.id]) {
        var yr = getSelectedYear(g.id);
        displayName = getGameNameForYear(g, yr);
      }
      var yearBadge = "";
      if (g.yearlyUpdate) {
        var selYr = getSelectedYear(g.id);
        var yc = typeof YEAR_CHANGES !== "undefined" ? YEAR_CHANGES[g.id] : null;
        if (yc && selYr !== yc.maxYear) {
          yearBadge = '<div class="card-cat" style="color:var(--accent)">' + sanitize(String(selYr)) + ' Edition</div>';
        }
      }
      html += `<div class="game-card" data-game="${sanitize(g.id)}">
        <div class="card-icon" style="background:${sanitize(g.color)}">${sanitize(g.icon)}</div>
        <h3>${sanitize(displayName)}</h3>
        <div class="card-genre">${sanitize(g.genre)}</div>
        <div class="card-count">${tipCount} tips & controls</div>
        ${yearBadge}
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

    // Year-aware name
    var selectedYear = getSelectedYear(game.id);
    var displayName = game.name;
    if (game.yearlyUpdate && typeof YEAR_CHANGES !== "undefined" && YEAR_CHANGES[game.id]) {
      displayName = getGameNameForYear(game, selectedYear);
    }

    dom.gameTitle.textContent = displayName;
    dom.gameDesc.textContent = game.desc;
    dom.gameIconLarge.style.background = game.color;
    dom.gameIconLarge.textContent = game.icon;

    let tagsHtml = "";
    game.tags.forEach((t) => { tagsHtml += `<span class="tag">${sanitize(t)}</span>`; });
    if (game.yearlyUpdate) {
      tagsHtml += `<span class="tag" style="border-color:var(--accent);color:var(--accent)">Updated Yearly</span>`;
    }
    dom.gameTags.innerHTML = tagsHtml;

    // Setup year selector
    setupYearSelector(game);

    $$(".filter-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.filter === "all"));

    // Get year-appropriate tips
    var tips = getTipsForYear(game, selectedYear);
    renderTips(tips, selectedYear, game);
    updateProgress();
    window.location.hash = gameId;
    $$(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.game === gameId));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // === RENDER TIPS ===
  function renderTips(tips, selectedYear, gameOverride) {
    var game = gameOverride || state.currentGame;
    var filtered = state.currentFilter === "all" ? tips : tips.filter((t) => t.level === state.currentFilter);
    let html = "";
    let lastSection = "";
    var yc = typeof YEAR_CHANGES !== "undefined" && game ? YEAR_CHANGES[game.id] : null;
    var isOlderYear = yc && selectedYear && selectedYear !== yc.maxYear;

    filtered.forEach((tip, i) => {
      if (tip.section && tip.section !== lastSection) {
        lastSection = tip.section;
        html += `<div class="section-header">${sanitize(tip.section)}</div>`;
      }
      const favKey = (game ? game.id : "unknown") + "::" + tip.title;
      const isFav = state.favorites.includes(favKey);
      let controlsHtml = "";
      tip.controls.forEach((c) => { controlsHtml += `<span class="control-badge">${sanitize(c)}</span>`; });

      // Year badge
      var yearBadgeHtml = "";
      if (tip._yearAdded) {
        yearBadgeHtml = '<span class="year-badge added">New in ' + sanitize(String(tip._yearAdded)) + '</span>';
      }

      html += `<div class="tip-card ${sanitize(tip.level)}" data-index="${i}">
        <div class="tip-header">
          <span class="tip-title">${sanitize(tip.title)}${yearBadgeHtml}</span>
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

    // Show removed tips notice for older years
    if (isOlderYear && yc.changes[selectedYear] && yc.changes[selectedYear].removed && yc.changes[selectedYear].removed.length > 0) {
      var removedList = yc.changes[selectedYear].removed;
      html += '<div style="margin-top:16px;padding:14px 18px;background:var(--bg3);border:1px solid var(--expert);border-radius:var(--radius);font-size:.82rem">';
      html += '<strong style="color:var(--expert)">Not available in this edition:</strong><br>';
      removedList.forEach(function(r) {
        html += '<span class="year-badge removed" style="margin:3px 2px;display:inline-block">' + sanitize(r) + '</span> ';
      });
      html += '<div style="margin-top:6px;color:var(--text2);font-size:.75rem">These controls/features were added in a later edition. Upgrade to access them.</div>';
      html += '</div>';
    }

    if (filtered.length === 0) {
      html = `<div style="text-align:center;padding:40px;color:var(--text2)">No tips found for this filter.</div>`;
    }
    dom.tipsContainer.innerHTML = html;

    // Store tips reference for filter changes
    state._currentTips = tips;
    state._currentYear = selectedYear;
  }

  // === FAVORITES ===
  function toggleFavorite(key) {
    const idx = state.favorites.indexOf(key);
    if (idx === -1) state.favorites.push(key);
    else state.favorites.splice(idx, 1);
    localStorage.setItem("psg_favorites", JSON.stringify(state.favorites));
    updateStats();
    if (state.currentGame && state._currentTips) {
      renderTips(state._currentTips, state._currentYear, state.currentGame);
    }
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
      const parts = favKey.split("::");
      const gameId = parts[0];
      const tipTitle = parts.slice(1).join("::");
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

  // === SEARCH ===
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
        if (searchIndex[i].text.includes(q)) results.push(searchIndex[i]);
      }
      if (results.length === 0) {
        dom.searchResults.innerHTML = '<div class="search-item">No results found</div>';
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
      if (item) { showGame(item.dataset.gameId); dom.searchInput.value = ""; dom.searchResults.classList.add("hidden"); }
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

    // Year selector
    dom.yearSelect.addEventListener("change", onYearChange);

    // Category bar
    dom.categoryBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".cat-btn");
      if (btn) setCategory(btn.dataset.cat);
    });

    // Filter buttons - now uses stored tips
    $$(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.currentFilter = btn.dataset.filter;
        $$(".filter-btn").forEach((b) => b.classList.toggle("active", b === btn));
        if (state.currentGame && state._currentTips) {
          renderTips(state._currentTips, state._currentYear, state.currentGame);
        }
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
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        dom.searchInput.focus();
      }
    });
  }

  init();
})();
