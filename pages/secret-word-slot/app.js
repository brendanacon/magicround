const STORAGE_KEYS = {
  players: "secret-word-slot-players",
  words: "secret-word-slot-words",
};

const defaultPlayers = [
  {
    id: "rdj",
    name: "Robert Downey Jr.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/5/5f/Robert_Downey_Jr_2014_Comic_Con_%28cropped%29.jpg",
  },
  {
    id: "zendaya",
    name: "Zendaya",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/f/f5/Zendaya_2019_by_Glenn_Francis.jpg",
  },
  {
    id: "gosling",
    name: "Ryan Gosling",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/5/55/Ryan_Gosling_in_2018.jpg",
  },
  {
    id: "blanchett",
    name: "Cate Blanchett",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/3/3d/Cate_Blanchett_Cannes_2018.jpg",
  },
  {
    id: "idris",
    name: "Idris Elba",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/7/7e/Idris_Elba-4580.jpg",
  },
  {
    id: "stone",
    name: "Emma Stone",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/0/0d/Emma_Stone_at_Maniac_UK_premiere_%28cropped%29.jpg",
  },
  {
    id: "gaga",
    name: "Lady Gaga",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/0/0b/Lady_Gaga_at_Joe_Biden%27s_inauguration_%28cropped%29.jpg",
  },
  {
    id: "jackman",
    name: "Hugh Jackman",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/5/59/Hugh_Jackman_by_Gage_Skidmore_2.jpg",
  },
  {
    id: "viola",
    name: "Viola Davis",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/5/58/Viola_Davis_by_Gage_Skidmore.jpg",
  },
  {
    id: "chalamet",
    name: "Timothée Chalamet",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/2/2b/Timoth%C3%A9e_Chalamet-4485.jpg",
  },
  {
    id: "salma",
    name: "Salma Hayek",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/8/88/Salma_Hayek_by_Gage_Skidmore_2.jpg",
  },
  {
    id: "pascale",
    name: "Pedro Pascal",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/9/99/Pedro_Pascal_by_Gage_Skidmore.jpg",
  },
  {
    id: "wong",
    name: "Awkwafina",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/4/4d/Awkwafina_2019_by_Glenn_Francis.jpg",
  },
  {
    id: "nyongo",
    name: "Lupita Nyong'o",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/f/f6/Lupita_Nyong%27o_by_Gage_Skidmore.jpg",
  },
];

const defaultWords = [
  "blue",
  "red",
  "chill",
  "spark",
  "glow",
  "secret",
  "midnight",
  "lucky",
  "silk",
  "echo",
  "velvet",
  "drift",
  "gold",
  "wildcard",
];

const playerGrid = document.getElementById("playerGrid");
const scoreList = document.getElementById("scoreList");
const leaderboardList = document.getElementById("leaderboardList");
const assignmentList = document.getElementById("assignmentList");
const pickNextButton = document.getElementById("pickNext");
const currentPlayerName = document.getElementById("currentPlayerName");
const currentPlayerStatus = document.getElementById("currentPlayerStatus");
const currentPlayerImage = document.getElementById("currentPlayerImage");
const slotWord = document.getElementById("slotWord");
const slotResult = document.querySelector(".slot-result");
const reel = document.getElementById("reel");
const lever = document.getElementById("lever");
const spinButton = document.getElementById("spinBtn");
const hideWordButton = document.getElementById("hideWord");
const wordInput = document.getElementById("wordInput");
const saveWordsButton = document.getElementById("saveWords");
const resetWordsButton = document.getElementById("resetWords");
const wordStats = document.getElementById("wordStats");
const resetScoresButton = document.getElementById("resetScores");

const state = {
  players: [],
  words: [],
  currentPlayerId: null,
  spinning: false,
  wordVisible: false,
};

const itemHeight = 60;

function loadPlayers() {
  const stored = localStorage.getItem(STORAGE_KEYS.players);
  if (stored) {
    return JSON.parse(stored);
  }

  return defaultPlayers.map((player) => ({
    ...player,
    active: false,
    score: 0,
    lastWord: "",
  }));
}

function loadWords() {
  const stored = localStorage.getItem(STORAGE_KEYS.words);
  if (stored) {
    return JSON.parse(stored);
  }
  return [...defaultWords];
}

function savePlayers() {
  localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(state.players));
}

function saveWords() {
  localStorage.setItem(STORAGE_KEYS.words, JSON.stringify(state.words));
}

function setCurrentPlayer(player, options = {}) {
  const { revealWord = false } = options;
  state.currentPlayerId = player ? player.id : null;
  state.wordVisible = revealWord;
  if (player) {
    currentPlayerName.textContent = player.name;
    currentPlayerImage.src = player.image;
    currentPlayerImage.alt = player.name;
    currentPlayerStatus.textContent = player.lastWord
      ? "Word assigned. Pull the lever to replace it."
      : "Ready to spin for a new word.";
  } else {
    currentPlayerName.textContent = "Activate at least one player";
    currentPlayerImage.removeAttribute("src");
    currentPlayerImage.alt = "";
    currentPlayerStatus.textContent = "Tap “Pick next” to start.";
  }
  updateSlotDisplay(player ? player.lastWord : "");
}

function updateWordStats() {
  wordStats.textContent = `${state.words.length} words loaded.`;
}

function renderPlayers() {
  playerGrid.innerHTML = "";
  state.players.forEach((player) => {
    const card = document.createElement("div");
    card.className = `player-card${player.active ? " active" : ""}`;

    const button = document.createElement("button");
    button.type = "button";
    button.addEventListener("click", () => togglePlayer(player.id));

    const img = document.createElement("img");
    img.className = "player-avatar";
    img.src = player.image;
    img.alt = player.name;

    const name = document.createElement("div");
    name.className = "player-name";
    name.textContent = player.name;

    const status = document.createElement("div");
    status.className = "player-status";
    status.textContent = player.active ? "Active" : "Inactive";

    button.append(img, name, status);
    card.append(button);
    playerGrid.append(card);
  });
}

function renderScoreboard() {
  scoreList.innerHTML = "";
  const activePlayers = state.players.filter((player) => player.active);
  if (activePlayers.length === 0) {
    scoreList.innerHTML = "<p class=\"word-stats\">No active players yet.</p>";
    return;
  }

  activePlayers.forEach((player) => {
    const row = document.createElement("div");
    row.className = "score-row";

    const name = document.createElement("div");
    name.innerHTML = `<strong>${player.name}</strong><div class="player-status">${
      player.lastWord ? "Word assigned" : "No word yet"
    }</div>`;

    const controls = document.createElement("div");
    controls.className = "score-controls";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "-";
    minus.addEventListener("click", () => updateScore(player.id, -1));

    const value = document.createElement("span");
    value.className = "score-value";
    value.textContent = player.score;

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.addEventListener("click", () => updateScore(player.id, 1));

    controls.append(minus, value, plus);
    row.append(name, controls);
    scoreList.append(row);
  });
}

function renderLeaderboard() {
  leaderboardList.innerHTML = "";
  const ranked = [...state.players]
    .filter((player) => player.active)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    leaderboardList.innerHTML = "<p class=\"word-stats\">Activate players to see the leaderboard.</p>";
    return;
  }

  ranked.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "leaderboard-row";

    const rank = document.createElement("div");
    rank.className = "leaderboard-rank";
    rank.textContent = index + 1;

    const name = document.createElement("div");
    name.innerHTML = `<strong>${player.name}</strong><div class="player-status">${
      player.lastWord ? "Word assigned" : "No word yet"
    }</div>`;

    const score = document.createElement("div");
    score.innerHTML = `<strong>${player.score}</strong>`;

    row.append(rank, name, score);
    leaderboardList.append(row);
  });
}

function renderAssignments() {
  assignmentList.innerHTML = "";
  const activePlayers = state.players.filter((player) => player.active);
  if (activePlayers.length === 0) {
    assignmentList.innerHTML =
      "<p class=\"word-stats\">Activate players to reveal assignments.</p>";
    return;
  }

  activePlayers.forEach((player) => {
    const details = document.createElement("details");
    details.className = "assignment-card";

    const summary = document.createElement("summary");
    const img = document.createElement("img");
    img.className = "player-avatar";
    img.src = player.image;
    img.alt = player.name;

    const name = document.createElement("span");
    name.textContent = player.name;

    summary.append(img, name);

    const body = document.createElement("div");
    body.className = "assignment-details";
    body.innerHTML = player.lastWord
      ? `<span class="label">Secret Word</span><div class="assignment-word">${player.lastWord}</div>`
      : "<span class=\"label\">No word yet</span>";

    details.append(summary, body);
    assignmentList.append(details);
  });
}

function togglePlayer(id) {
  state.players = state.players.map((player) =>
    player.id === id ? { ...player, active: !player.active } : player
  );
  savePlayers();
  renderPlayers();
  renderScoreboard();
  renderLeaderboard();
  renderAssignments();

  const activePlayers = state.players.filter((player) => player.active);
  if (!activePlayers.find((player) => player.id === state.currentPlayerId)) {
    setCurrentPlayer(activePlayers[0] || null);
  }
}

function pickNextPlayer() {
  const activePlayers = state.players.filter((player) => player.active);
  if (activePlayers.length === 0) {
    setCurrentPlayer(null);
    return;
  }

  const next =
    activePlayers[Math.floor(Math.random() * activePlayers.length)];
  setCurrentPlayer(next);
}

function updateScore(id, delta) {
  state.players = state.players.map((player) =>
    player.id === id ? { ...player, score: player.score + delta } : player
  );
  savePlayers();
  renderScoreboard();
  renderLeaderboard();
}

function getAvailableWords(currentPlayerId) {
  const assigned = new Set(
    state.players
      .filter((player) => player.id !== currentPlayerId && player.lastWord)
      .map((player) => player.lastWord)
  );

  return state.words.filter((word) => !assigned.has(word));
}

function updateSlotDisplay(word) {
  if (!word) {
    slotWord.textContent = "Pull the lever";
    slotResult.classList.remove("hidden");
    return;
  }

  if (state.wordVisible) {
    slotWord.textContent = word;
    slotResult.classList.remove("hidden");
  } else {
    slotWord.textContent = "Hidden";
    slotResult.classList.add("hidden");
  }
}

function spinSlot() {
  if (state.spinning) {
    return;
  }

  const player = state.players.find((p) => p.id === state.currentPlayerId);
  if (!player) {
    slotWord.textContent = "Pick a player first";
    return;
  }

  if (state.words.length === 0) {
    slotWord.textContent = "Add words in the Word Bank";
    return;
  }

  const availableWords = getAvailableWords(player.id);
  if (availableWords.length === 0) {
    slotWord.textContent = "No available words";
    return;
  }

  state.spinning = true;
  lever.classList.add("pulled");

  const cycles = 14;
  const picks = Array.from({ length: cycles }, () =>
    availableWords[Math.floor(Math.random() * availableWords.length)]
  );
  const finalWord =
    availableWords[Math.floor(Math.random() * availableWords.length)];
  picks.push(finalWord);

  reel.innerHTML = picks
    .map((word) => `<div class="reel-item">${word}</div>`)
    .join("");

  const height = window.innerWidth < 520 ? 54 : itemHeight;
  reel.style.transition = "none";
  reel.style.transform = "translateY(0)";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      reel.style.transition = "transform 1.6s cubic-bezier(0.2, 0.6, 0.2, 1)";
      reel.style.transform = `translateY(-${(picks.length - 1) * height}px)`;
    });
  });

  const onFinish = () => {
    reel.removeEventListener("transitionend", onFinish);
    slotWord.textContent = finalWord;
    state.players = state.players.map((p) =>
      p.id === player.id ? { ...p, lastWord: finalWord } : p
    );
    savePlayers();
    renderScoreboard();
    renderLeaderboard();
    renderAssignments();
    setCurrentPlayer({ ...player, lastWord: finalWord }, { revealWord: true });
    lever.classList.remove("pulled");
    state.spinning = false;
  };

  reel.addEventListener("transitionend", onFinish);
}

function hideWord() {
  if (!state.currentPlayerId) {
    return;
  }
  const player = state.players.find((p) => p.id === state.currentPlayerId);
  state.wordVisible = false;
  updateSlotDisplay(player ? player.lastWord : "");
}

function populateWordsText() {
  wordInput.value = state.words.join("\n");
  updateWordStats();
}

function saveWordsFromInput() {
  const words = wordInput.value
    .split("\n")
    .map((word) => word.trim())
    .filter(Boolean);

  state.words = words;
  saveWords();
  updateWordStats();
}

function resetWords() {
  state.words = [...defaultWords];
  saveWords();
  populateWordsText();
}

function resetScores() {
  state.players = state.players.map((player) => ({
    ...player,
    score: 0,
    lastWord: "",
  }));
  savePlayers();
  renderScoreboard();
  renderLeaderboard();
  renderAssignments();
  state.wordVisible = false;
  updateSlotDisplay("");
}

function initTabs() {
  const buttons = document.querySelectorAll(".tab-button");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      buttons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      panels.forEach((panel) => {
        panel.classList.toggle("active", panel.id === tab);
      });
    });
  });
}

function init() {
  state.players = loadPlayers();
  state.words = loadWords();

  renderPlayers();
  renderScoreboard();
  renderLeaderboard();
  renderAssignments();
  setCurrentPlayer(
    state.players.find((player) => player.active) || null
  );
  populateWordsText();
  initTabs();
}

pickNextButton.addEventListener("click", pickNextPlayer);
spinButton.addEventListener("click", spinSlot);
lever.addEventListener("click", spinSlot);
hideWordButton.addEventListener("click", hideWord);
saveWordsButton.addEventListener("click", saveWordsFromInput);
resetWordsButton.addEventListener("click", resetWords);
resetScoresButton.addEventListener("click", resetScores);

init();
