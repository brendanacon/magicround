const STORAGE_KEY = "ios-slot-game-state";
const WORDS_KEY = "ios-slot-game-words";

const defaultPlayers = [
  "Robert Downey Jr.",
  "Zendaya",
  "Chris Evans",
  "Scarlett Johansson",
  "Dwayne Johnson",
  "Florence Pugh",
  "Ryan Gosling",
  "Margot Robbie",
  "Chris Hemsworth",
  "Keanu Reeves",
  "Emma Stone",
  "Will Smith",
  "Natalie Portman",
  "Tom Holland",
];

const defaultWords = [
  "blue",
  "red",
  "champagne",
  "umbrella",
  "dessert",
  "camera",
  "sunset",
  "marble",
  "passport",
  "midnight",
  "sandal",
  "orbit",
];

const colorPool = [
  "linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)",
  "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
  "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)",
  "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
  "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)",
  "linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)",
  "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)",
  "linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)",
];

const state = {
  players: [],
  activePlayerId: null,
  currentWord: null,
};

const selectors = {
  playerGrid: document.getElementById("playerGrid"),
  scoreBoard: document.getElementById("scoreBoard"),
  leaderBoard: document.getElementById("leaderBoard"),
  wordInput: document.getElementById("wordInput"),
  wordCount: document.getElementById("wordCount"),
  currentPlayerCard: document.getElementById("currentPlayerCard"),
  slotResult: document.getElementById("slotResult"),
  activePlayerDisplay: document.getElementById("activePlayerDisplay"),
  lever: document.getElementById("lever"),
  spinBtn: document.getElementById("spinBtn"),
  shufflePlayerBtn: document.getElementById("shufflePlayerBtn"),
  wordUsedBtn: document.getElementById("wordUsedBtn"),
  wordGuessedBtn: document.getElementById("wordGuessedBtn"),
  newWordBtn: document.getElementById("newWordBtn"),
  saveWordsBtn: document.getElementById("saveWordsBtn"),
  resetScoresBtn: document.getElementById("resetScoresBtn"),
  activateAllBtn: document.getElementById("activateAllBtn"),
  avatarUpload: document.getElementById("avatarUpload"),
};

let reelInterval = null;
let avatarTargetId = null;

const buildPlayers = () => {
  return defaultPlayers.map((name, index) => ({
    id: `player-${index}`,
    name,
    active: index < 6,
    score: 0,
    avatar: null,
    accent: colorPool[index % colorPool.length],
  }));
};

const loadState = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  const savedWords = localStorage.getItem(WORDS_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    state.players = parsed.players || buildPlayers();
    state.activePlayerId = parsed.activePlayerId || state.players[0]?.id || null;
    state.currentWord = parsed.currentWord || null;
  } else {
    state.players = buildPlayers();
    state.activePlayerId = state.players[0]?.id || null;
    state.currentWord = null;
  }

  if (savedWords) {
    selectors.wordInput.value = savedWords;
  } else {
    selectors.wordInput.value = defaultWords.join("\n");
  }
};

const persistState = () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      players: state.players,
      activePlayerId: state.activePlayerId,
      currentWord: state.currentWord,
    })
  );
};

const persistWords = () => {
  localStorage.setItem(WORDS_KEY, selectors.wordInput.value);
};

const getWords = () => {
  const raw = selectors.wordInput.value
    .split("\n")
    .map((word) => word.trim())
    .filter(Boolean);
  return raw.length ? raw : defaultWords;
};

const setActivePlayer = (id) => {
  state.activePlayerId = id;
  persistState();
  renderActivePlayer();
};

const shufflePlayer = () => {
  const activePlayers = state.players.filter((player) => player.active);
  if (!activePlayers.length) {
    return;
  }
  const next = activePlayers[Math.floor(Math.random() * activePlayers.length)];
  setActivePlayer(next.id);
};

const updateWordCount = () => {
  const count = getWords().length;
  selectors.wordCount.textContent = `${count} words`;
};

const renderPlayers = () => {
  selectors.playerGrid.innerHTML = "";
  state.players.forEach((player) => {
    const card = document.createElement("button");
    card.className = `player-card ${player.active ? "player-card--active" : ""}`;
    card.type = "button";

    const avatar = document.createElement("div");
    avatar.className = "player-card__avatar";
    avatar.textContent = player.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    if (player.avatar) {
      avatar.style.backgroundImage = `url(${player.avatar})`;
    } else {
      avatar.style.background = player.accent;
    }
    avatar.addEventListener("click", (event) => {
      event.stopPropagation();
      avatarTargetId = player.id;
      selectors.avatarUpload.click();
    });

    const info = document.createElement("div");
    info.className = "player-card__info";
    info.innerHTML = `<h3>${player.name}</h3><span>${player.score} points</span>`;

    card.appendChild(avatar);
    card.appendChild(info);

    card.addEventListener("click", () => {
      player.active = !player.active;
      if (player.active && !state.activePlayerId) {
        state.activePlayerId = player.id;
      }
      persistState();
      renderAll();
    });

    selectors.playerGrid.appendChild(card);
  });
};

const renderActivePlayer = () => {
  const player = state.players.find((item) => item.id === state.activePlayerId);
  if (!player) {
    selectors.currentPlayerCard.innerHTML =
      "<p class=\"empty-state\">Activate players to start.</p>";
    selectors.activePlayerDisplay.querySelector(".status__value").textContent =
      "No one active";
    return;
  }

  selectors.activePlayerDisplay.querySelector(".status__value").textContent =
    player.name;

  selectors.currentPlayerCard.innerHTML = `
    <div class="player-pill">
      <span>${player.name}</span>
    </div>
    <div class="player-pill">Score: ${player.score}</div>
  `;
};

const renderScores = () => {
  selectors.scoreBoard.innerHTML = "";
  state.players
    .filter((player) => player.active)
    .forEach((player) => {
      const row = document.createElement("div");
      row.className = "score-row";
      row.innerHTML = `
        <div class="score-row__info">
          <div class="player-card__avatar"></div>
          <div>
            <strong>${player.name}</strong>
            <div>${player.score} pts</div>
          </div>
        </div>
        <div class="score-row__controls">
          <button type="button" data-action="minus">-</button>
          <button type="button" data-action="plus">+</button>
        </div>
      `;

      const avatar = row.querySelector(".player-card__avatar");
      if (player.avatar) {
        avatar.style.backgroundImage = `url(${player.avatar})`;
      } else {
        avatar.style.background = player.accent;
      }

      row.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.dataset.action === "plus") {
            player.score += 1;
          } else {
            player.score -= 1;
          }
          persistState();
          renderAll();
        });
      });

      selectors.scoreBoard.appendChild(row);
    });
};

const renderLeaderboard = () => {
  selectors.leaderBoard.innerHTML = "";
  const sorted = [...state.players]
    .filter((player) => player.active)
    .sort((a, b) => b.score - a.score);

  if (!sorted.length) {
    selectors.leaderBoard.innerHTML =
      "<p class=\"empty-state\">Activate players to see scores.</p>";
    return;
  }

  sorted.forEach((player, index) => {
    const item = document.createElement("div");
    item.className = "leaderboard__item";
    item.innerHTML = `
      <div class="score-row__info">
        <div class="player-card__avatar"></div>
        <div>
          <strong>#${index + 1} ${player.name}</strong>
          <div>${player.score} points</div>
        </div>
      </div>
      <span>${player.score >= 0 ? "+" : ""}${player.score}</span>
    `;

    const avatar = item.querySelector(".player-card__avatar");
    if (player.avatar) {
      avatar.style.backgroundImage = `url(${player.avatar})`;
    } else {
      avatar.style.background = player.accent;
    }

    selectors.leaderBoard.appendChild(item);
  });
};

const spinReels = () => {
  const words = getWords();
  const activePlayer = state.players.find(
    (item) => item.id === state.activePlayerId
  );
  if (!activePlayer || !words.length) {
    selectors.slotResult.textContent = "Add words and players to spin.";
    return;
  }

  const reels = document.querySelectorAll(".reel-word");
  reels.forEach((reel) => reel.classList.add("reel-word--spinning"));
  selectors.lever.classList.add("lever--pulled");

  const spinWord = () => words[Math.floor(Math.random() * words.length)];
  if (reelInterval) {
    clearInterval(reelInterval);
  }
  reelInterval = setInterval(() => {
    reels.forEach((reel) => {
      reel.textContent = spinWord();
    });
  }, 120);

  setTimeout(() => {
    clearInterval(reelInterval);
    const finalWord = spinWord();
    reels.forEach((reel) => {
      reel.textContent = finalWord;
      reel.classList.remove("reel-word--spinning");
    });
    selectors.lever.classList.remove("lever--pulled");
    state.currentWord = finalWord;
    selectors.slotResult.textContent = `Word for ${activePlayer.name}: ${finalWord}`;
    persistState();
  }, 1400);
};

const resetWord = () => {
  state.currentWord = null;
  selectors.slotResult.textContent = "Spin to get a word";
  persistState();
};

const applyScoreChange = (delta) => {
  const player = state.players.find((item) => item.id === state.activePlayerId);
  if (!player) {
    return;
  }
  player.score += delta;
  resetWord();
  persistState();
  renderAll();
};

const renderAll = () => {
  renderPlayers();
  renderActivePlayer();
  renderScores();
  renderLeaderboard();
  updateWordCount();
};

const setupTabs = () => {
  const tabButtons = document.querySelectorAll(".tab-bar__item");
  const panels = document.querySelectorAll(".panel");
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      tabButtons.forEach((btn) => btn.classList.remove("tab-bar__item--active"));
      button.classList.add("tab-bar__item--active");
      panels.forEach((panel) => {
        panel.classList.toggle("panel--active", panel.dataset.panel === tab);
      });
    });
  });
};

selectors.spinBtn.addEventListener("click", spinReels);
selectors.shufflePlayerBtn.addEventListener("click", shufflePlayer);
selectors.wordUsedBtn.addEventListener("click", () => applyScoreChange(1));
selectors.wordGuessedBtn.addEventListener("click", () => applyScoreChange(-1));
selectors.newWordBtn.addEventListener("click", resetWord);
selectors.saveWordsBtn.addEventListener("click", () => {
  persistWords();
  updateWordCount();
});
selectors.resetScoresBtn.addEventListener("click", () => {
  state.players.forEach((player) => {
    player.score = 0;
  });
  persistState();
  renderAll();
});
selectors.activateAllBtn.addEventListener("click", () => {
  state.players.forEach((player) => {
    player.active = true;
  });
  if (!state.activePlayerId) {
    state.activePlayerId = state.players[0]?.id || null;
  }
  persistState();
  renderAll();
});
selectors.avatarUpload.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file || !avatarTargetId) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const player = state.players.find((item) => item.id === avatarTargetId);
    if (player) {
      player.avatar = reader.result;
      persistState();
      renderAll();
    }
  };
  reader.readAsDataURL(file);
  event.target.value = "";
});

loadState();
setupTabs();
renderAll();
updateWordCount();
