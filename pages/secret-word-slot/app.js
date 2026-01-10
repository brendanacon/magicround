const STORAGE_KEYS = {
  players: "secret-word-slot-players",
  words: "secret-word-slot-words",
  assignedWords: "secret-word-slot-assigned-words",
};

const defaultPlayers = [
  {
    id: "andreas",
    name: "Andreas",
    image: "",
  },
  {
    id: "axel",
    name: "Axel",
    image: "",
  },
  {
    id: "benjamin",
    name: "Benjamin",
    image: "",
  },
  {
    id: "brendan",
    name: "Brendan Connaughton",
    image: "",
  },
  {
    id: "erika",
    name: "Erika Dias",
    image: "",
  },
  {
    id: "george",
    name: "George Hatz",
    image: "",
  },
  {
    id: "joanna",
    name: "Joanna Lily",
    image: "",
  },
  {
    id: "kaitlyn",
    name: "Kaitlyn Rooke",
    image: "",
  },
  {
    id: "lara",
    name: "Lara Murray",
    image: "",
  },
  {
    id: "lilli",
    name: "Lilli Klil",
    image: "",
  },
  {
    id: "matt",
    name: "Matt Ellis",
    image: "",
  },
  {
    id: "michael",
    name: "Michael Evans",
    image: "",
  },
  {
    id: "phil",
    name: "Phil Maxwell",
    image: "",
  },
  {
    id: "rachel",
    name: "Rachel Towers",
    image: "",
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

// DOM element references - will be set during initialization
let playerGrid;
let scoreList;
let leaderboardList;
let currentPlayerName;
let currentPlayerStatus;
let currentPlayerImage;
let slotWordDisplay;
let reel;
let lever;
let spinButton;
let resetWordButton;
let wordInput;
let saveWordsButton;
let resetWordsButton;
let wordStats;
let resetScoresButton;
let passToMessage;
let assignedWordsList;
let resetGameButton;
let allocationToggle;
let modeDescription;
let playersDescription;

const state = {
  players: [],
  words: [],
  currentPlayerId: null,
  spinning: false,
  assignedWords: [],
  wordVisible: false,
  nextPlayerId: null,
};

const itemHeight = 60;

function loadPlayers() {
  const stored = localStorage.getItem(STORAGE_KEYS.players);
  if (stored) {
    const parsed = JSON.parse(stored);
    // Check if stored players match the new default list
    // If the first player is not in our new defaults, reset to new defaults
    const firstStoredId = parsed[0]?.id;
    const hasNewPlayer = defaultPlayers.some(p => p.id === firstStoredId);
    
    if (!hasNewPlayer) {
      // Old data detected - reset to new defaults
      console.log("Detected old player data, resetting to new player list");
      const newPlayers = defaultPlayers.map((player) => ({
        ...player,
        active: false,
        score: 0,
        lastWord: "",
      }));
      // Save directly to localStorage since state.players isn't set yet
      localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(newPlayers));
      return newPlayers;
    }
    return parsed;
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

function loadAssignedWords() {
  const stored = localStorage.getItem(STORAGE_KEYS.assignedWords);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
}

function saveAssignedWords() {
  localStorage.setItem(STORAGE_KEYS.assignedWords, JSON.stringify(state.assignedWords));
}

function savePlayers() {
  localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(state.players));
}

function saveWords() {
  localStorage.setItem(STORAGE_KEYS.words, JSON.stringify(state.words));
}

function setCurrentPlayer(player) {
  state.currentPlayerId = player ? player.id : null;
  if (!currentPlayerName || !currentPlayerImage || !currentPlayerStatus) {
    return;
  }
  if (player) {
    currentPlayerName.textContent = player.name;
    if (currentPlayerImage) {
      currentPlayerImage.src = player.image || "";
      currentPlayerImage.alt = player.name;
      currentPlayerImage.style.display = "none";
    }
    if (state.allocationMode === "additional" && state.selectedPlayerForAdditional === player.id) {
      currentPlayerStatus.textContent = "Selected for word assignment. Pull the lever.";
    } else if (player.lastWord && player.lastWord.trim() !== "") {
      currentPlayerStatus.textContent = `Current word: "${player.lastWord}"`;
    } else {
      currentPlayerStatus.textContent = "Ready to spin for a new word.";
    }
  } else {
    currentPlayerName.textContent = "Activate at least one player";
    currentPlayerImage.removeAttribute("src");
    currentPlayerImage.alt = "";
    currentPlayerStatus.textContent = "Activate players to start.";
  }
}

function updateWordStats() {
  if (wordStats) {
    wordStats.textContent = `${state.words.length} words loaded.`;
  }
}

function renderPlayers() {
  if (!playerGrid) {
    console.error("playerGrid not found in renderPlayers");
    return;
  }
  console.log("Rendering players:", state.players.length);
  playerGrid.innerHTML = "";
  state.players.forEach((player) => {
    const card = document.createElement("div");
    const isSelected = state.allocationMode === "additional" && state.selectedPlayerForAdditional === player.id;
    card.className = `player-card${player.active ? " active" : ""}${isSelected ? " selected" : ""}`;

    const button = document.createElement("button");
    button.type = "button";
    
    // In additional mode, clicking selects the player for word assignment
    // In initial mode, clicking toggles active status
    if (state.allocationMode === "additional") {
      button.addEventListener("click", () => selectPlayerForAdditional(player.id));
    } else {
      button.addEventListener("click", () => togglePlayer(player.id));
    }

    const img = document.createElement("img");
    img.className = "player-avatar";
    img.src = player.image || "";
    img.alt = player.name;
    img.style.display = "none";

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
  if (!scoreList) return;
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
    name.innerHTML = `<strong>${player.name}</strong><div class="player-status">Active</div>`;

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
  if (!leaderboardList) return;
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
    name.innerHTML = `<strong>${player.name}</strong><div class="player-status">Active</div>`;

    const score = document.createElement("div");
    score.innerHTML = `<strong>${player.score}</strong>`;

    row.append(rank, name, score);
    leaderboardList.append(row);
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

  const activePlayers = state.players.filter((player) => player.active);
  
  // Auto-set current player if none is set or current player is no longer active
  if (!state.currentPlayerId || !activePlayers.find((player) => player.id === state.currentPlayerId)) {
    // In initial mode, set to first active player
    // In additional mode, don't auto-set (user must select)
    if (state.allocationMode === "initial") {
      setCurrentPlayer(activePlayers[0] || null);
      if (activePlayers[0]) {
        state.currentPlayerId = activePlayers[0].id;
      }
    } else {
      setCurrentPlayer(null);
      state.currentPlayerId = null;
    }
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

function spinSlot() {
  if (state.spinning) {
    return;
  }

  if (!slotWordDisplay || !reel) {
    return;
  }

  let player;
  
  // In additional mode, use the selected player
  if (state.allocationMode === "additional") {
    if (!state.selectedPlayerForAdditional) {
      slotWordDisplay.textContent = "Select a player first";
      return;
    }
    player = state.players.find((p) => p.id === state.selectedPlayerForAdditional);
    if (!player || !player.active) {
      slotWordDisplay.textContent = "Selected player is not active";
      return;
    }
  } else {
    // Initial allocation mode - use current player
    player = state.players.find((p) => p.id === state.currentPlayerId);
    if (!player) {
      slotWordDisplay.textContent = "Pick a player first";
      return;
    }

    // If current player already has a word, automatically advance to next player
    if (player.lastWord && player.lastWord.trim() !== "") {
      const activePlayers = state.players.filter((p) => p.active);
      const currentIndex = activePlayers.findIndex((p) => p.id === player.id);
      const nextIndex = (currentIndex + 1) % activePlayers.length;
      const nextPlayer = activePlayers[nextIndex];
      
      if (nextPlayer && nextPlayer.id !== player.id) {
        console.log("Current player has a word, advancing to:", nextPlayer.name);
        player = nextPlayer;
        setCurrentPlayer(nextPlayer);
        state.currentPlayerId = nextPlayer.id;
        savePlayers();
      } else {
        // Only one active player, can't advance
        if (slotWordDisplay) {
          slotWordDisplay.textContent = `${player.name} already has a word. Switch to "Extra Word" mode to assign more.`;
          slotWordDisplay.classList.add("visible");
        }
        if (lever) {
          lever.classList.remove("pulled");
        }
        state.spinning = false;
        return;
      }
    }
  }

  if (state.words.length === 0) {
    slotWordDisplay.textContent = "Add words in the Word Bank";
    return;
  }

  // Hide previous word if visible
  slotWordDisplay.classList.remove("visible");
  slotWordDisplay.textContent = "";
  if (slotWordDisplay.parentElement) {
    slotWordDisplay.parentElement.classList.remove("word-visible");
  }
  if (passToMessage) {
    passToMessage.classList.remove("visible");
  }
  state.wordVisible = false;

  state.spinning = true;
  if (lever) {
    lever.classList.add("pulled");
  }

  // Get words that haven't been assigned yet
  const assignedWordList = state.assignedWords.map(a => a.word.toLowerCase());
  const availableWords = state.words.filter(word => 
    !assignedWordList.includes(word.toLowerCase())
  );
  
  if (availableWords.length === 0) {
    if (slotWordDisplay) {
      slotWordDisplay.textContent = "All words assigned!";
      slotWordDisplay.classList.add("visible");
    }
    if (lever) {
      lever.classList.remove("pulled");
    }
    state.spinning = false;
    return;
  }

  const cycles = 14;
  const picks = Array.from({ length: cycles }, () =>
    availableWords[Math.floor(Math.random() * availableWords.length)]
  );
  const finalWord = availableWords[Math.floor(Math.random() * availableWords.length)];
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
    if (reel) {
      reel.removeEventListener("transitionend", onFinish);
    }
    
    // Display word in center of slot machine
    if (slotWordDisplay) {
      slotWordDisplay.textContent = finalWord;
      slotWordDisplay.classList.add("visible");
      if (slotWordDisplay.parentElement) {
        slotWordDisplay.parentElement.classList.add("word-visible");
        // Adjust slot window height based on content
        const wordLength = finalWord.length;
        if (wordLength > 30) {
          slotWordDisplay.parentElement.style.minHeight = "auto";
          slotWordDisplay.parentElement.style.padding = "16px";
        }
      }
    }
    state.wordVisible = true;
    
    // Save assigned word to history - ensure we're using the correct current player
    console.log("Assigning word to player:", player.name, "ID:", player.id);
    state.assignedWords.push({
      playerId: player.id,
      playerName: player.name,
      word: finalWord,
      timestamp: new Date().toISOString(),
    });
    saveAssignedWords();
    
    // Update player's last word (for internal tracking)
    state.players = state.players.map((p) =>
      p.id === player.id ? { ...p, lastWord: finalWord } : p
    );
    savePlayers();
    
    // Show who to pass to next and store the next player (only in initial mode)
    if (state.allocationMode === "initial") {
      const activePlayers = state.players.filter((p) => p.active);
      const currentIndex = activePlayers.findIndex((p) => p.id === player.id);
      const nextIndex = (currentIndex + 1) % activePlayers.length;
      const nextPlayer = activePlayers[nextIndex];
      
      // Store the next player ID so we can advance to them when word is hidden
      if (nextPlayer && nextPlayer.id !== player.id) {
        state.nextPlayerId = nextPlayer.id;
        if (passToMessage) {
          passToMessage.textContent = `Pass to ${nextPlayer.name}`;
          passToMessage.classList.add("visible");
        }
      } else {
        state.nextPlayerId = null;
      }
    } else {
      // In additional mode, clear the pass message
      if (passToMessage) {
        passToMessage.classList.remove("visible");
      }
      state.nextPlayerId = null;
    }
    
    renderScoreboard();
    renderLeaderboard();
    renderAssignedWords();
    setCurrentPlayer({ ...player, lastWord: finalWord });
    if (lever) {
      lever.classList.remove("pulled");
    }
    state.spinning = false;
  };

  reel.addEventListener("transitionend", onFinish);
}

function hideWord() {
  if (!slotWordDisplay || !passToMessage) {
    return;
  }
  slotWordDisplay.classList.remove("visible");
  slotWordDisplay.textContent = "";
  if (slotWordDisplay.parentElement) {
    slotWordDisplay.parentElement.classList.remove("word-visible");
  }
  passToMessage.classList.remove("visible");
  state.wordVisible = false;
  
  // Automatically advance to the next player when word is hidden (only in initial mode)
  if (state.allocationMode === "initial" && state.nextPlayerId) {
    const nextPlayer = state.players.find((p) => p.id === state.nextPlayerId && p.active);
    if (nextPlayer) {
      console.log("Advancing to next player:", nextPlayer.name);
      setCurrentPlayer(nextPlayer);
      state.currentPlayerId = nextPlayer.id;
      savePlayers();
    }
    state.nextPlayerId = null;
  } else if (state.allocationMode === "additional") {
    // In additional mode, keep the selected player selected
    if (state.selectedPlayerForAdditional) {
      const selectedPlayer = state.players.find((p) => p.id === state.selectedPlayerForAdditional);
      if (selectedPlayer) {
        setCurrentPlayer(selectedPlayer);
      }
    }
  }
}

function selectPlayerForAdditional(playerId) {
  // Only allow selection in additional mode
  if (state.allocationMode !== "additional") {
    return;
  }
  
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.active) {
    return;
  }
  
  state.selectedPlayerForAdditional = playerId;
  setCurrentPlayer(player);
  renderPlayers();
  console.log("Selected player for additional word:", player.name);
}

function setAllocationMode(mode) {
  state.allocationMode = mode;
  state.selectedPlayerForAdditional = null;
  
  // Update toggle switch
  if (allocationToggle) {
    allocationToggle.classList.toggle("mode-additional", mode === "additional");
  }
  
  // Update descriptions
  if (modeDescription) {
    if (mode === "initial") {
      modeDescription.textContent = "Words will cycle through players one by one. Pull the lever to assign to the current player.";
    } else {
      modeDescription.textContent = "Select a player from the grid, then pull the lever to assign a word to them.";
    }
  }
  
  if (playersDescription) {
    if (mode === "initial") {
      playersDescription.textContent = "Tap to activate who is playing tonight.";
    } else {
      playersDescription.textContent = "Tap a player to select them for word assignment.";
    }
  }
  
  // Re-render players to show selection state
  renderPlayers();
  
  // Clear current player selection if switching to initial mode
  if (mode === "initial") {
    const activePlayer = state.players.find((p) => p.active);
    setCurrentPlayer(activePlayer || null);
  }
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
  slotWordDisplay.textContent = "";
  slotWordDisplay.classList.remove("visible");
  if (slotWordDisplay.parentElement) {
    slotWordDisplay.parentElement.classList.remove("word-visible");
  }
  passToMessage.classList.remove("visible");
  state.wordVisible = false;
}

function resetGame() {
  // Show confirmation dialog
  const confirmed = confirm(
    "Are you sure you want to reset the game?\n\n" +
    "This will clear:\n" +
    "• All assigned words\n" +
    "• Current word assignments\n" +
    "• Slot machine display\n\n" +
    "Word Bank will NOT be reset."
  );
  
  if (!confirmed) {
    return;
  }
  
  // Clear assigned words
  state.assignedWords = [];
  saveAssignedWords();
  
  // Clear player lastWord assignments
  state.players = state.players.map((player) => ({
    ...player,
    lastWord: "",
  }));
  savePlayers();
  
  // Clear slot machine display
  if (slotWordDisplay) {
    slotWordDisplay.textContent = "";
    slotWordDisplay.classList.remove("visible");
    if (slotWordDisplay.parentElement) {
      slotWordDisplay.parentElement.classList.remove("word-visible");
    }
  }
  
  // Clear pass to message
  if (passToMessage) {
    passToMessage.classList.remove("visible");
    passToMessage.textContent = "";
  }
  
  // Reset state
  state.wordVisible = false;
  state.nextPlayerId = null;
  
  // Re-render everything
  renderScoreboard();
  renderLeaderboard();
  renderAssignedWords();
  setCurrentPlayer(
    state.players.find((player) => player.active) || null
  );
  
  console.log("Game reset complete");
}

function renderAssignedWords() {
  if (!assignedWordsList) return;
  assignedWordsList.innerHTML = "";
  
  if (state.assignedWords.length === 0) {
    assignedWordsList.innerHTML = "<p class=\"word-stats\">No words assigned yet.</p>";
    return;
  }
  
  // Group words by player
  const wordsByPlayer = {};
  state.assignedWords.forEach((assignment) => {
    if (!wordsByPlayer[assignment.playerId]) {
      wordsByPlayer[assignment.playerId] = {
        playerName: assignment.playerName,
        words: [],
      };
    }
    wordsByPlayer[assignment.playerId].words.push(assignment);
  });
  
  // Create accordion for each player
  Object.entries(wordsByPlayer).forEach(([playerId, data]) => {
    const accordionItem = document.createElement("div");
    accordionItem.className = "accordion-item";
    
    const header = document.createElement("div");
    header.className = "accordion-header";
    header.innerHTML = `
      <strong>${data.playerName}</strong>
      <span class="accordion-toggle">▼</span>
    `;
    
    const content = document.createElement("div");
    content.className = "accordion-content";
    
    const wordsContainer = document.createElement("div");
    wordsContainer.className = "accordion-words";
    
    data.words.forEach((assignment) => {
      const wordItem = document.createElement("div");
      wordItem.className = "word-item";
      wordItem.textContent = assignment.word;
      wordsContainer.appendChild(wordItem);
    });
    
    content.appendChild(wordsContainer);
    accordionItem.appendChild(header);
    accordionItem.appendChild(content);
    
    header.addEventListener("click", () => {
      accordionItem.classList.toggle("open");
    });
    
    assignedWordsList.appendChild(accordionItem);
  });
}

function initTabs() {
  try {
    const buttons = document.querySelectorAll(".tab-button");
    const panels = document.querySelectorAll(".tab-panel");

    console.log("Initializing tabs:", buttons.length, "buttons,", panels.length, "panels");

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.dataset.tab;
        console.log("Tab clicked:", tab);
        buttons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        panels.forEach((panel) => {
          const isActive = panel.id === tab;
          panel.classList.toggle("active", isActive);
          console.log("Panel", panel.id, "active:", isActive);
        });
      });
    });
  } catch (error) {
    console.error("Error initializing tabs:", error);
  }
}

function init() {
  state.players = loadPlayers();
  state.words = loadWords();
  state.assignedWords = loadAssignedWords();

  renderPlayers();
  renderScoreboard();
  renderLeaderboard();
  renderAssignedWords();
  setCurrentPlayer(
    state.players.find((player) => player.active) || null
  );
  populateWordsText();
  initTabs();
}

// Wait for DOM to be ready - use multiple methods to ensure it works
function startApp() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp);
  } else if (document.readyState === "interactive" || document.readyState === "complete") {
    // DOM is already ready
    setTimeout(initializeApp, 0);
  } else {
    initializeApp();
  }
}

// Start the app
startApp();

// Test if script loaded
console.log("Secret Word Slot script loaded");

function initializeApp() {
  try {
    console.log("Initializing app...");
    
    // Get all DOM elements
    playerGrid = document.getElementById("playerGrid");
    scoreList = document.getElementById("scoreList");
    leaderboardList = document.getElementById("leaderboardList");
    currentPlayerName = document.getElementById("currentPlayerName");
    currentPlayerStatus = document.getElementById("currentPlayerStatus");
    currentPlayerImage = document.getElementById("currentPlayerImage");
    slotWordDisplay = document.getElementById("slotWordDisplay");
    reel = document.getElementById("reel");
    lever = document.getElementById("lever");
    spinButton = document.getElementById("spinBtn");
    resetWordButton = document.getElementById("resetWord");
    wordInput = document.getElementById("wordInput");
    saveWordsButton = document.getElementById("saveWords");
    resetWordsButton = document.getElementById("resetWords");
    wordStats = document.getElementById("wordStats");
    resetScoresButton = document.getElementById("resetScores");
    passToMessage = document.getElementById("passToMessage");
    assignedWordsList = document.getElementById("assignedWordsList");
    resetGameButton = document.getElementById("resetGameButton");
    allocationToggle = document.getElementById("allocationToggle");
    modeDescription = document.getElementById("modeDescription");
    playersDescription = document.getElementById("playersDescription");

    console.log("Elements found:", {
      playerGrid: !!playerGrid,
      pickNextButton: !!pickNextButton,
      spinButton: !!spinButton,
      lever: !!lever,
      resetWordButton: !!resetWordButton
    });

    // Verify all required elements exist
    if (!playerGrid || !spinButton || !lever || !resetWordButton) {
      console.error("Required DOM elements not found", {
        playerGrid: !!playerGrid,
        spinButton: !!spinButton,
        lever: !!lever,
        resetWordButton: !!resetWordButton
      });
      return;
    }

    // Initialize the app
    console.log("Calling init()...");
    init();

    // Set up event listeners
    console.log("Setting up event listeners...");
    spinButton.addEventListener("click", spinSlot);
    lever.addEventListener("click", spinSlot);
    resetWordButton.addEventListener("click", hideWord);
    
    // Set up allocation mode toggle
    if (allocationToggle) {
      allocationToggle.addEventListener("click", () => {
        const newMode = state.allocationMode === "initial" ? "additional" : "initial";
        setAllocationMode(newMode);
      });
    }
    
    // Initialize allocation mode
    setAllocationMode("initial");
    
    if (saveWordsButton) {
      saveWordsButton.addEventListener("click", saveWordsFromInput);
    }
    if (resetWordsButton) {
      resetWordsButton.addEventListener("click", resetWords);
    }
    if (resetScoresButton) {
      resetScoresButton.addEventListener("click", resetScores);
    }
    if (resetGameButton) {
      resetGameButton.addEventListener("click", resetGame);
    }
    
    console.log("App initialized successfully!");
  } catch (error) {
    console.error("Error initializing app:", error);
  }
}

