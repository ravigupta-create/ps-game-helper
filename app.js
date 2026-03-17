// PS Game Helper - Application Logic
// Security: No eval, no innerHTML with user input, no external requests
// Efficiency: Event delegation, requestAnimationFrame for scroll, localStorage caching

(function () {
  "use strict";

  // === SECURITY ROBOT ===
  // All user-facing strings are sanitized before DOM insertion
  function sanitize(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // === STATE ===
  const state = {
    currentGame: null,
    currentFilter: "all",
    favorites: JSON.parse(localStorage.getItem("psg_favorites") || "[]"),
    theme: localStorage.getItem("psg_theme") || "dark",
    scrollPositions: {},
  };

  // === DOM REFS ===
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    nav: $("#gameNav"),
    landing: $("#landing"),
    detail: $("#gameDetail"),
    favPage: $("#favoritesPage"),
    gameGrid: $("#gameGrid"),
    tipsContainer: $("#tipsContainer"),
    gameTitle: $("#gameTitle"),
    gameDesc: $("#gameDesc"),
    gameTags: $("#gameTags"),
    gameIconLarge: $("#gameIconLarge"),
    searchInput: $("#searchInput"),
    searchResults: $("#searchResults"),
    favToggle: $("#favToggle"),
    themeToggle: $("#themeToggle"),
    backBtn: $("#backBtn"),
    progressFill: $("#progressFill"),
    progressText: $("#progressText"),
    progressBar: $("#progressBar"),
    favoritesContainer: $("#favoritesContainer"),
    noFavs: $("#noFavs"),
    statGames: $("#statGames"),
    statTips: $("#statTips"),
    statFavs: $("#statFavs"),
  };

  // === INIT ===
  function init() {
    applyTheme();
    renderNav();
    renderLanding();
    updateStats();
    bindEvents();
    handleHash();
  }

  // === THEME ===
  function applyTheme() {
    document.documentElement.setAttribute(
      "data-theme",
      state.theme === "light" ? "light" : ""
    );
    if (state.theme !== "light")
      document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", "light");
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("psg_theme", state.theme);
    applyTheme();
  }

  // === NAV ===
  function renderNav() {
    let html = "";
    GAMES.forEach((g) => {
      html += `<button class="nav-btn" data-game="${sanitize(g.id)}">
        <span class="nav-icon" style="background:${sanitize(g.color)}">${sanitize(g.icon)}</span>
        ${sanitize(g.name)}
      </button>`;
    });
    dom.nav.innerHTML = html;
  }

  // === LANDING ===
  function renderLanding() {
    let html = "";
    GAMES.forEach((g) => {
      const tipCount = g.tips.length;
      html += `<div class="game-card" data-game="${sanitize(g.id)}">
        <div class="card-icon" style="background:${sanitize(g.color)}">${sanitize(g.icon)}</div>
        <h3>${sanitize(g.name)}</h3>
        <div class="card-genre">${sanitize(g.genre)}</div>
        <div class="card-count">${tipCount} tips & controls</div>
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

    dom.landing.classList.add("hidden");
    dom.favPage.classList.add("hidden");
    dom.detail.classList.remove("hidden");
    dom.progressBar.classList.remove("hidden");

    dom.gameTitle.textContent = game.name;
    dom.gameDesc.textContent = game.desc;
    dom.gameIconLarge.style.background = game.color;
    dom.gameIconLarge.textContent = game.icon;

    let tagsHtml = "";
    game.tags.forEach((t) => {
      tagsHtml += `<span class="tag">${sanitize(t)}</span>`;
    });
    if (game.yearlyUpdate) {
      tagsHtml += `<span class="tag" style="border-color:var(--accent);color:var(--accent)">Updated Yearly</span>`;
    }
    dom.gameTags.innerHTML = tagsHtml;

    // Reset filter buttons
    $$(".filter-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === "all");
    });

    renderTips(game.tips);
    updateProgress();
    window.location.hash = gameId;

    // Update nav active state
    $$(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.game === gameId);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // === RENDER TIPS ===
  function renderTips(tips) {
    const filtered =
      state.currentFilter === "all"
        ? tips
        : tips.filter((t) => t.level === state.currentFilter);

    let html = "";
    filtered.forEach((tip, i) => {
      const favKey = state.currentGame.id + "::" + tip.title;
      const isFav = state.favorites.includes(favKey);
      let controlsHtml = "";
      tip.controls.forEach((c) => {
        controlsHtml += `<span class="control-badge">${sanitize(c)}</span>`;
      });

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
    if (idx === -1) {
      state.favorites.push(key);
    } else {
      state.favorites.splice(idx, 1);
    }
    localStorage.setItem("psg_favorites", JSON.stringify(state.favorites));
    updateStats();

    // Re-render current view
    if (state.currentGame) {
      renderTips(state.currentGame.tips);
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
      const [gameId, tipTitle] = favKey.split("::");
      const game = GAMES.find((g) => g.id === gameId);
      if (!game) return;
      const tip = game.tips.find((t) => t.title === tipTitle);
      if (!tip) return;

      let controlsHtml = "";
      tip.controls.forEach((c) => {
        controlsHtml += `<span class="control-badge">${sanitize(c)}</span>`;
      });

      html += `<div class="tip-card ${sanitize(tip.level)}">
        <div class="fav-tip-game">${sanitize(game.icon)} ${sanitize(game.name)}</div>
        <div class="tip-header">
          <span class="tip-title">${sanitize(tip.title)}</span>
          <div class="tip-badges">
            <span class="tip-level ${sanitize(tip.level)}">${sanitize(tip.level)}</span>
            <button class="fav-btn active" data-fav="${sanitize(favKey)}" title="Remove from favorites">&#9733;</button>
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
      if (!query || query.length < 2) {
        dom.searchResults.classList.add("hidden");
        return;
      }

      const q = query.toLowerCase();
      const results = [];

      GAMES.forEach((game) => {
        // Search game name
        if (game.name.toLowerCase().includes(q)) {
          results.push({
            type: "game",
            game: game,
            text: game.name,
            sub: game.genre,
          });
        }

        // Search tips
        game.tips.forEach((tip) => {
          if (
            tip.title.toLowerCase().includes(q) ||
            tip.desc.toLowerCase().includes(q) ||
            tip.controls.some((c) => c.toLowerCase().includes(q))
          ) {
            results.push({
              type: "tip",
              game: game,
              tip: tip,
              text: tip.title,
              sub: game.name,
            });
          }
        });
      });

      if (results.length === 0) {
        dom.searchResults.innerHTML = `<div class="search-item">No results found</div>`;
        dom.searchResults.classList.remove("hidden");
        return;
      }

      // Limit results for performance
      const limited = results.slice(0, 15);
      let html = "";
      limited.forEach((r, i) => {
        html += `<div class="search-item" data-search-idx="${i}" data-game-id="${sanitize(r.game.id)}" data-type="${r.type}">
          <div>${sanitize(r.text)}</div>
          <div class="search-game">${sanitize(r.game.icon)} ${sanitize(r.sub)}</div>
        </div>`;
      });

      dom.searchResults.innerHTML = html;
      dom.searchResults.classList.remove("hidden");
    }, 200);
  }

  // === PROGRESS ===
  function updateProgress() {
    if (!state.currentGame) return;
    requestAnimationFrame(() => {
      const container = dom.tipsContainer;
      const cards = container.querySelectorAll(".tip-card");
      if (cards.length === 0) return;

      const viewportBottom = window.innerHeight;
      let visible = 0;

      cards.forEach((card) => {
        if (card.getBoundingClientRect().top < viewportBottom) {
          visible++;
        }
      });

      const pct = Math.round((visible / cards.length) * 100);
      dom.progressFill.style.width = pct + "%";
      dom.progressText.textContent = pct + "% explored";
    });
  }

  // === HASH ROUTING ===
  function handleHash() {
    const hash = window.location.hash.slice(1);
    if (hash && GAMES.find((g) => g.id === hash)) {
      showGame(hash);
    }
  }

  // === SHOW LANDING ===
  function showLanding() {
    dom.detail.classList.add("hidden");
    dom.favPage.classList.add("hidden");
    dom.progressBar.classList.add("hidden");
    dom.landing.classList.remove("hidden");
    state.currentGame = null;
    window.location.hash = "";
    $$(".nav-btn").forEach((btn) => btn.classList.remove("active"));
  }

  // === EVENT BINDING ===
  function bindEvents() {
    // Nav clicks (event delegation)
    dom.nav.addEventListener("click", (e) => {
      const btn = e.target.closest(".nav-btn");
      if (btn) showGame(btn.dataset.game);
    });

    // Game grid clicks
    dom.gameGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".game-card");
      if (card) showGame(card.dataset.game);
    });

    // Back button
    dom.backBtn.addEventListener("click", showLanding);

    // Theme toggle
    dom.themeToggle.addEventListener("click", toggleTheme);

    // Favorites toggle
    dom.favToggle.addEventListener("click", showFavorites);

    // Filter buttons
    $$(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.currentFilter = btn.dataset.filter;
        $$(".filter-btn").forEach((b) =>
          b.classList.toggle("active", b === btn)
        );
        if (state.currentGame) renderTips(state.currentGame.tips);
      });
    });

    // Favorite buttons (delegation on tips container and favorites container)
    document.addEventListener("click", (e) => {
      const favBtn = e.target.closest(".fav-btn");
      if (favBtn) {
        toggleFavorite(favBtn.dataset.fav);
        // If on favorites page, re-render
        if (!dom.favPage.classList.contains("hidden")) {
          showFavorites();
        }
      }
    });

    // Search
    dom.searchInput.addEventListener("input", (e) => {
      handleSearch(e.target.value.trim());
    });

    // Search result clicks
    dom.searchResults.addEventListener("click", (e) => {
      const item = e.target.closest(".search-item");
      if (item && item.dataset.gameId) {
        showGame(item.dataset.gameId);
        dom.searchInput.value = "";
        dom.searchResults.classList.add("hidden");
      }
    });

    // Close search on outside click
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-box")) {
        dom.searchResults.classList.add("hidden");
      }
    });

    // Scroll progress
    let scrollTicking = false;
    window.addEventListener("scroll", () => {
      if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(() => {
          updateProgress();
          scrollTicking = false;
        });
      }
    });

    // Hash change
    window.addEventListener("hashchange", handleHash);

    // Keyboard shortcut: Escape to go back
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!dom.detail.classList.contains("hidden")) {
          showLanding();
        } else if (!dom.favPage.classList.contains("hidden")) {
          showLanding();
        }
        dom.searchResults.classList.add("hidden");
        dom.searchInput.value = "";
      }
    });
  }

  // === START ===
  init();
})();
