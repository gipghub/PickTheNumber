"use strict";

const Core = window.PickTheNumberCore;
if (!Core) throw new Error("PickTheNumberCore failed to load.");

const { FIVE_YEARS_DAYS, GAMES, RANKS, SUITS, RANK_VALUE } = Core;
const DB_NAME = "pick-the-number-db";
const DB_VERSION = 1;
const SOUND_STORAGE_KEY = "pick-the-number-sound";
const SLOT_POT_STORAGE_KEY = "pick-the-number-slot-pots";
const SLOT_SESSION_STORAGE_KEY = "pick-the-number-slot-session";
const SLOT_SPIN_DURATION_MS = 1300;
const SLOT_SETTLE_DURATION_MS = 650;
const SLOT_BASE_RTP = 98;
const SLOT_PAY_OUTCOMES = [
  { label: "No line win", multiplier: 0, chance: 0.63 },
  { label: "Single line hit", multiplier: 1, chance: 0.23 },
  { label: "Double line hit", multiplier: 2, chance: 0.08 },
  { label: "Full court line", multiplier: 5, chance: 0.035 },
  { label: "Wild streak", multiplier: 10, chance: 0.017 },
  { label: "Free throw feature", multiplier: 20, chance: 0.006 },
  { label: "Heat check feature", multiplier: 50, chance: 0.0015 },
  { label: "Progressive shot", multiplier: 100, chance: 0.0005 },
];
const SLOT_BONUS_PLAYS = {
  freeThrows: {
    title: "Free Throws",
    subtitle: "Five shots at the charity stripe",
    accent: "orange",
    statLabel: "Makes",
    symbol: "basketball.png",
  },
  heatCheck: {
    title: "Heat Check",
    subtitle: "Streak ladder from downtown",
    accent: "red",
    statLabel: "Streak",
    symbol: "fire-seven.png",
  },
  ringChase: {
    title: "Ring Chase",
    subtitle: "Collect rings across the court",
    accent: "gold",
    statLabel: "Rings",
    symbol: "ring.png",
  },
  hoopJackpot: {
    title: "Hoop Jackpot",
    subtitle: "Pick a rim for a progressive shot",
    accent: "blue",
    statLabel: "Tier",
    symbol: "jackpot-hoop.png",
  },
};
const SLOT_POTS = {
  freeThrow: {
    target: 6,
    label: "Free Throw Pot",
    collectors: ["bonus-free"],
    bonusKeys: ["freeThrows", "ringChase"],
  },
  heatCheck: {
    target: 5,
    label: "Heat Check Pot",
    collectors: ["fire-seven", "wild"],
    bonusKeys: ["heatCheck", "freeThrows"],
  },
  championship: {
    target: 4,
    label: "Championship Pot",
    collectors: ["ring", "jackpot-hoop"],
    bonusKeys: ["hoopJackpot", "ringChase"],
  },
};

const state = {
  db: null,
  game: "powerball",
  draws: [],
  deferredInstallPrompt: null,
  slotSpinSeed: 0,
  slotSpinning: false,
  slotForceCollectSpin: false,
  slotVisibleSymbols: [],
  slotSpinFallback: null,
  slotSettleFallback: null,
  slotPots: { freeThrow: 0, heatCheck: 0, championship: 0 },
  slotLastPotEvents: [],
  slotBonusTimeout: null,
  slotBonusPickSession: null,
  slotCredits: 0,
  slotLastWin: 0,
  slotTotalWon: 0,
  slotSpinCount: 0,
  slotLastOutcome: null,
  slotRulesLastFocus: null,
  slotProfileLastFocus: null,
  serviceWorkerRefreshing: false,
  soundEnabled: false,
  audioContext: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  installButton: $("#installButton"),
  soundToggle: $("#soundToggle"),
  connectionStatus: $("#connectionStatus"),
  drawCountLabel: $("#drawCountLabel"),
  drawWindow: $("#drawWindow"),
  pickStyle: $("#pickStyle"),
  ticketCount: $("#ticketCount"),
  avoidBirthdays: $("#avoidBirthdays"),
  syncButton: $("#syncButton"),
  generateButton: $("#generateButton"),
  csvUpload: $("#csvUpload"),
  latestDraw: $("#latestDraw"),
  storedWindow: $("#storedWindow"),
  matrixLabel: $("#matrixLabel"),
  ticketList: $("#ticketList"),
  ticketRationale: $("#ticketRationale"),
  hotNumbers: $("#hotNumbers"),
  coldNumbers: $("#coldNumbers"),
  overdueNumbers: $("#overdueNumbers"),
  patternList: $("#patternList"),
  blackjackAdvice: $("#blackjackAdvice"),
  bjDealerGraphic: $("#bjDealerGraphic"),
  bjPlayerGraphic: $("#bjPlayerGraphic"),
  bjActionGraphic: $("#bjActionGraphic"),
  bjHandType: $("#bjHandType"),
  bjPlayer: $("#bjPlayer"),
  bjDealer: $("#bjDealer"),
  bjDealButton: $("#bjDealButton"),
  videoPokerCards: $("#videoPokerCards"),
  videoPokerAdvice: $("#videoPokerAdvice"),
  videoPokerHandGraphic: $("#videoPokerHandGraphic"),
  videoPokerHoldGraphic: $("#videoPokerHoldGraphic"),
  videoPokerMachineMessage: $("#videoPokerMachineMessage"),
  videoPokerDealButton: $("#videoPokerDealButton"),
  crapsAdvice: $("#crapsAdvice"),
  crapsTableGraphic: $("#crapsTableGraphic"),
  crapsPointMarker: $("#crapsPointMarker"),
  crapsActionChip: $("#crapsActionChip"),
  crapsPoint: $("#crapsPoint"),
  crapsBankroll: $("#crapsBankroll"),
  crapsUnit: $("#crapsUnit"),
  crapsRollButton: $("#crapsRollButton"),
  threeCardCards: $("#threeCardCards"),
  threeCardAdvice: $("#threeCardAdvice"),
  threeCardHandGraphic: $("#threeCardHandGraphic"),
  threeCardActionGraphic: $("#threeCardActionGraphic"),
  threeCardDealButton: $("#threeCardDealButton"),
  slotsAdvice: $("#slotsAdvice"),
  slotReels: $("#slotReels"),
  slotSpinButton: $("#slotSpinButton"),
  slotTestCollectButton: $("#slotTestCollectButton"),
  slotRulesOpen: $("#slotRulesOpen"),
  slotRulesClose: $("#slotRulesClose"),
  slotRulesModal: $("#slotRulesModal"),
  slotProfileOpen: $("#slotProfileOpen"),
  slotProfileClose: $("#slotProfileClose"),
  slotProfileModal: $("#slotProfileModal"),
  slotSpinMeter: $("#slotSpinMeter"),
  slotCreditsMeter: $("#slotCreditsMeter"),
  slotWinMeter: $("#slotWinMeter"),
  slotBonusMeter: $("#slotBonusMeter"),
  slotLossMeter: $("#slotLossMeter"),
  slotStopMeter: $("#slotStopMeter"),
  slotFreeThrowPot: $("#slotFreeThrowPot"),
  slotHeatCheckPot: $("#slotHeatCheckPot"),
  slotChampionshipPot: $("#slotChampionshipPot"),
  slotBonusScreen: $("#slotBonusScreen"),
  slotBetBadge: $("#slotBetBadge"),
  slotGrandMeter: $("#slotGrandMeter"),
  slotMajorMeter: $("#slotMajorMeter"),
  slotMinorMeter: $("#slotMinorMeter"),
  slotMiniMeter: $("#slotMiniMeter"),
  slotBankroll: $("#slotBankroll"),
  slotBet: $("#slotBet"),
  slotRtp: $("#slotRtp"),
  slotVolatility: $("#slotVolatility"),
  bankrollAdvice: $("#bankrollAdvice"),
  monthlyBudget: $("#monthlyBudget"),
  sessionsMonth: $("#sessionsMonth"),
  lotterySpend: $("#lotterySpend"),
};

function setStatus(message) {
  elements.connectionStatus.textContent = message;
}

function setupSound() {
  try {
    state.soundEnabled = localStorage.getItem(SOUND_STORAGE_KEY) === "on";
  } catch {
    state.soundEnabled = false;
  }
  updateSoundToggle();
  elements.soundToggle.addEventListener("click", async () => {
    state.soundEnabled = !state.soundEnabled;
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, state.soundEnabled ? "on" : "off");
    } catch {
      // Sound still works for this session if persistent storage is blocked.
    }
    updateSoundToggle();
    if (state.soundEnabled) {
      await ensureAudioContext();
      playGameSound("ui", "on");
    }
  });
}

function updateSoundToggle() {
  elements.soundToggle.textContent = state.soundEnabled ? "Sound On" : "Sound Off";
  elements.soundToggle.setAttribute("aria-pressed", String(state.soundEnabled));
  elements.soundToggle.classList.toggle("is-on", state.soundEnabled);
}

async function ensureAudioContext() {
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    state.audioContext = new AudioContextClass();
  }
  if (state.audioContext.state === "suspended") await state.audioContext.resume();
  return state.audioContext;
}

async function playGameSound(game, cue = "tap") {
  if (!state.soundEnabled) return;
  let context;
  try {
    context = await ensureAudioContext();
  } catch {
    return;
  }
  if (!context) return;

  const now = context.currentTime;
  const sounds = {
    ui: () => playToneSequence(context, now, [523, 659], 0.055, "sine", 0.035),
    lottery: () => playToneSequence(context, now, [392, 523, 659], 0.045, "triangle", 0.026),
    blackjack: () => {
      scheduleNoise(context, now, 0.08, 0.018, 900);
      scheduleTone(context, now + 0.035, 220, 0.09, "triangle", 0.032);
    },
    videoPoker: () => playToneSequence(context, now, [640, 520, 760], 0.038, "square", 0.018),
    craps: () => {
      scheduleNoise(context, now, 0.18, 0.026, 1500);
      playToneSequence(context, now + 0.06, [180, 235, 190], 0.045, "sawtooth", 0.016);
    },
    threeCard: () => playToneSequence(context, now, [310, 390, 475], 0.05, "triangle", 0.026),
    slots: () => {
      if (cue === "bonus") {
        playToneSequence(context, now, [523, 659, 784, 1046], 0.075, "triangle", 0.045);
        scheduleNoise(context, now + 0.05, 0.18, 0.018, 3200);
        return;
      }
      scheduleNoise(context, now, 0.2, 0.018, 2400);
      playToneSequence(context, now + 0.02, [196, 247, 294, 392], 0.048, "square", 0.019);
    },
  };

  (sounds[game] || sounds.ui)();
}

function playToneSequence(context, start, frequencies, duration, type, volume) {
  frequencies.forEach((frequency, index) => {
    scheduleTone(context, start + index * duration * 0.9, frequency, duration, type, volume);
  });
}

function scheduleTone(context, start, frequency, duration, type, volume) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function scheduleNoise(context, start, duration, volume, filterFrequency) {
  const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const output = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    output[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(filterFrequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.buffer = buffer;
  source.connect(filter).connect(gain).connect(context.destination);
  source.start(start);
  source.stop(start + duration);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("draws")) {
        const store = db.createObjectStore("draws", { keyPath: "id" });
        store.createIndex("game", "game", { unique: false });
        store.createIndex("date", "date", { unique: false });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runStore(storeName, mode, callback) {
  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const result = callback(store);

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDraws(game, draws) {
  const trimmed = Core.trimDrawsToWindow(draws, FIVE_YEARS_DAYS);

  await runStore("draws", "readwrite", (store) => {
    store.index("game").openCursor(IDBKeyRange.only(game)).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  });

  await runStore("draws", "readwrite", (store) => {
    trimmed.forEach((draw) => store.put(draw));
  });

  return trimmed.length;
}

async function loadDraws(game) {
  const results = await requestToPromise(
    state.db
      .transaction("draws", "readonly")
      .objectStore("draws")
      .index("game")
      .getAll(IDBKeyRange.only(game)),
  );
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

async function syncDrawData() {
  const game = state.game;
  const config = GAMES[game];
  setStatus(`Syncing ${config.label}`);
  elements.syncButton.disabled = true;

  try {
    const response = await fetch(config.source, { cache: "no-store" });
    if (!response.ok) throw new Error(`Data request failed: ${response.status}`);
    const draws = Core.mapCsvDraws(await response.text(), game);
    if (!draws.length) throw new Error("No draws were found in the data file.");

    const saved = await saveDraws(game, draws);
    state.draws = await loadDraws(game);
    setStatus(`Saved ${saved} draws`);
    renderLottery();
  } catch (error) {
    console.error(error);
    setStatus("Sync blocked");
    elements.ticketList.innerHTML =
      '<div class="empty-state">The live feed could not be reached from this browser. Use the CSV import box with the same public data export.</div>';
  } finally {
    elements.syncButton.disabled = false;
  }
}

async function importCsvFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const draws = Core.mapCsvDraws(await file.text(), state.game);
  if (!draws.length) {
    setStatus("CSV not recognized");
    return;
  }

  const saved = await saveDraws(state.game, draws);
  state.draws = await loadDraws(state.game);
  setStatus(`Imported ${saved} draws`);
  renderLottery();
  event.target.value = "";
}

function filteredDraws() {
  const cutoff = Core.cutoffDate(elements.drawWindow.value);
  return state.draws.filter((draw) => draw.date >= cutoff);
}

function currentStats() {
  return Core.calculateLotteryStats(filteredDraws(), GAMES[state.game]);
}

function renderLottery() {
  const game = GAMES[state.game];
  const stats = currentStats();
  const latest = state.draws[0];

  elements.drawCountLabel.textContent = state.draws.length ? `${state.draws.length} draws stored` : "No local draw data";
  elements.latestDraw.textContent = latest
    ? `${formatDate(latest.date)}: ${latest.white.join("-")} + ${latest.bonus}`
    : "Sync data";
  elements.storedWindow.textContent = `${stats.draws.length} draws`;
  elements.matrixLabel.textContent = game.matrix;

  renderNumberStats(elements.hotNumbers, stats.hot, "hits");
  renderNumberStats(elements.coldNumbers, stats.cold, "hits");
  renderNumberStats(elements.overdueNumbers, stats.overdue, "draw gap");
  renderPatterns(stats);

  if (!elements.ticketList.children.length) renderEmptyTickets();
}

function renderNumberStats(container, stats, label) {
  container.innerHTML = stats.length
    ? stats
        .map(
          (item) => `
            <div class="stat-number">
              <strong>${item.number}</strong>
              <span>${label === "draw gap" ? item.gap : item.count} ${label}</span>
            </div>
          `,
        )
        .join("")
    : '<div class="empty-state">Sync draw data first.</div>';
}

function renderPatterns(stats) {
  const rows = [
    ["Average white-ball sum", stats.draws.length ? Math.round(stats.averageSum) : "n/a"],
    ["Average odd numbers", stats.draws.length ? stats.averageOdd.toFixed(1) : "n/a"],
    ["Average low-half numbers", stats.draws.length ? stats.averageLow.toFixed(1) : "n/a"],
    ["Draws with consecutive white balls", stats.draws.length ? `${Math.round(stats.consecutiveRate * 100)}%` : "n/a"],
  ];

  elements.patternList.innerHTML = rows
    .map(
      ([label, value]) => `
        <div class="pattern-row">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `,
    )
    .join("");
}

function renderEmptyTickets() {
  elements.ticketList.innerHTML = $("#emptyTicketTemplate").innerHTML;
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
}

function generateTickets() {
  const stats = currentStats();
  const style = elements.pickStyle.value;

  if (!stats.draws.length && style !== "random") {
    elements.ticketList.innerHTML =
      '<div class="empty-state">Sync or import draw data before using statistical styles. Clean random still works without data.</div>';
    return;
  }

  const tickets = Core.generateSuggestedTickets({
    stats,
    game: GAMES[state.game],
    count: Core.clamp(Number(elements.ticketCount.value) || 1, 1, 20),
    style,
    avoidBirthdays: elements.avoidBirthdays.value === "true",
  });

  elements.ticketRationale.textContent =
    style === "random" ? "Generated as valid random lines" : "Generated from local frequency, gap, and balance signals";
  elements.ticketList.innerHTML = tickets.length
    ? tickets.map((ticket) => renderTicket(ticket, GAMES[state.game])).join("")
    : '<div class="empty-state">Could not create unique tickets with these filters. Try fewer tickets or clean random.</div>';
}

function renderTicket(ticket, game) {
  return `
    <article class="ticket">
      <div class="ticket-balls">
        ${ticket.white.map((number) => `<span class="ball">${number}</span>`).join("")}
        <span class="ball ${game.bonusClass}" title="${game.bonusLabel}">${ticket.bonus}</span>
      </div>
      <div class="ticket-meta">
        <span>Sum ${ticket.quality.sum}</span>
        <span>${ticket.quality.odd} odd / ${5 - ticket.quality.odd} even</span>
        <span>${ticket.quality.low} low / ${5 - ticket.quality.low} high</span>
        <span>${ticket.quality.consecutive ? "Has consecutive pair" : "No consecutive pair"}</span>
        <span>Spread ${ticket.quality.spread}</span>
      </div>
    </article>
  `;
}

function setupNavigation() {
  $$(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      playGameSound("ui", "tap");
      showView(button.dataset.view);
    });
  });

  $$(".segment").forEach((button) => {
    button.addEventListener("click", async () => {
      playGameSound("lottery", "select");
      $$(".segment").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.game = button.dataset.game;
      state.draws = await loadDraws(state.game);
      elements.ticketList.innerHTML = "";
      setStatus(`${GAMES[state.game].label} selected`);
      renderLottery();
    });
  });

  $$(".sub-tab").forEach((button) => {
    button.addEventListener("click", () => {
      playGameSound(button.dataset.strategy, "enter");
      showStrategy(button.dataset.strategy);
    });
  });
}

function showView(viewId) {
  $$(".tab-button").forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
  $$(".view").forEach((item) => item.classList.toggle("active", item.id === viewId));
}

function showStrategy(strategyId) {
  $$(".sub-tab").forEach((item) => item.classList.toggle("active", item.dataset.strategy === strategyId));
  $$(".strategy-panel").forEach((item) => item.classList.toggle("active", item.id === strategyId));
}

function applyInitialRoute() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  const strategy = params.get("strategy");
  if (view === "strategy") showView("strategyView");
  if (view === "bankroll") showView("bankrollView");
  if (strategy) showStrategy(strategy);
}

function setupBlackjack() {
  const dealerCards = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"];
  elements.bjDealer.innerHTML = dealerCards.map((card) => `<option value="${card}">${card}</option>`).join("");

  const refreshPlayerValues = () => {
    const values = blackjackPlayerValueOptions(elements.bjHandType.value);
    elements.bjPlayer.innerHTML = values.map((value) => `<option value="${value}">${value}</option>`).join("");
    updateBlackjackAdvice();
  };

  elements.bjHandType.addEventListener("change", () => {
    playGameSound("blackjack", "card");
    refreshPlayerValues();
  });
  elements.bjPlayer.addEventListener("change", () => {
    playGameSound("blackjack", "card");
    updateBlackjackAdvice();
  });
  elements.bjDealer.addEventListener("change", () => {
    playGameSound("blackjack", "card");
    updateBlackjackAdvice();
  });
  elements.bjDealButton.addEventListener("click", () => dealBlackjackScenario());
  refreshPlayerValues();
}

function blackjackPlayerValueOptions(type) {
  if (type === "pair") return ["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"];
  if (type === "soft") return ["13", "14", "15", "16", "17", "18", "19", "20", "21"];
  return ["5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"];
}

function dealBlackjackScenario() {
  const type = randomItem(["hard", "soft", "pair"]);
  elements.bjHandType.value = type;
  elements.bjPlayer.innerHTML = blackjackPlayerValueOptions(type)
    .map((value) => `<option value="${value}">${value}</option>`)
    .join("");
  elements.bjPlayer.value = randomItem(blackjackPlayerValueOptions(type));
  elements.bjDealer.value = randomItem(["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"]);
  playGameSound("blackjack", "card");
  updateBlackjackAdvice();
}

function dealerValue(card) {
  return card === "A" ? 11 : Number(card);
}

function updateBlackjackAdvice() {
  const advice = Core.blackjackDecision(elements.bjHandType.value, elements.bjPlayer.value, dealerValue(elements.bjDealer.value));
  elements.blackjackAdvice.innerHTML = `<strong>${advice.action}</strong><br>${advice.reason}`;
  renderBlackjackVisual(advice);
}

function renderBlackjackVisual(advice) {
  renderGraphicCards(elements.bjDealerGraphic, [
    { rank: elements.bjDealer.value, suit: "♣" },
    { back: true },
  ]);
  renderGraphicCards(elements.bjPlayerGraphic, blackjackPlayerCards(elements.bjHandType.value, elements.bjPlayer.value));
  elements.bjActionGraphic.textContent = advice.action.split(",")[0];
}

function blackjackPlayerCards(type, value) {
  if (type === "pair") {
    return [
      { rank: value, suit: "♥" },
      { rank: value, suit: "♠" },
    ];
  }

  const total = Number(value);
  if (type === "soft") {
    return [
      { rank: "A", suit: "♥" },
      { rank: rankFromPip(Math.min(10, Math.max(2, total - 11))), suit: "♠" },
    ];
  }

  if (total <= 11) {
    return [
      { rank: rankFromPip(Math.max(2, total - 2)), suit: "♦" },
      { rank: "2", suit: "♣" },
    ];
  }

  return [
    { rank: "10", suit: "♦" },
    { rank: rankFromPip(Math.max(2, Math.min(10, total - 10))), suit: "♠" },
  ];
}

function rankFromPip(value) {
  return value === 10 ? "10" : String(value);
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffledDeck() {
  const deck = SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit, value: RANK_VALUE[rank] })));
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}

function randomCards(count) {
  return shuffledDeck().slice(0, count);
}

function setCardPickerCards(container, prefix, cards) {
  cards.forEach((card, index) => {
    const rankSelect = container.querySelector(`[data-card-rank="${prefix}-${index}"]`);
    const suitSelect = container.querySelector(`[data-card-suit="${prefix}-${index}"]`);
    if (rankSelect) rankSelect.value = card.rank;
    if (suitSelect) suitSelect.value = card.suit;
  });
}

function setupCardPickers() {
  renderCardPicker(elements.videoPokerCards, 5, "vp", [
    ["A", "♠"],
    ["K", "♠"],
    ["Q", "♠"],
    ["J", "♠"],
    ["10", "♠"],
  ]);
  renderCardPicker(elements.threeCardCards, 3, "tc", [
    ["Q", "♠"],
    ["6", "♥"],
    ["4", "♦"],
  ]);

  elements.videoPokerCards.addEventListener("change", () => {
    playGameSound("videoPoker", "card");
    updateVideoPokerAdvice();
  });
  elements.threeCardCards.addEventListener("change", () => {
    playGameSound("threeCard", "card");
    updateThreeCardAdvice();
  });
  elements.videoPokerDealButton.addEventListener("click", () => dealVideoPokerHand());
  elements.threeCardDealButton.addEventListener("click", () => dealThreeCardHand());
  updateVideoPokerAdvice();
  updateThreeCardAdvice();
}

function renderCardPicker(container, count, prefix, defaults) {
  container.innerHTML = Array.from({ length: count }, (_, index) => {
    const [defaultRank, defaultSuit] = defaults[index] || ["A", "♠"];
    const rankOptions = RANKS.map(
      (rank) => `<option value="${rank}" ${rank === defaultRank ? "selected" : ""}>${rank}</option>`,
    ).join("");
    const suitOptions = SUITS.map(
      (suit) => `<option value="${suit}" ${suit === defaultSuit ? "selected" : ""}>${suit}</option>`,
    ).join("");
    return `
      <div class="card-control">
        <label>Card ${index + 1}</label>
        <select data-card-rank="${prefix}-${index}">${rankOptions}</select>
        <select data-card-suit="${prefix}-${index}">${suitOptions}</select>
      </div>
    `;
  }).join("");
}

function getCards(container, prefix) {
  const controls = Array.from(container.querySelectorAll(`[data-card-rank^="${prefix}"]`));
  return controls.map((rankSelect, index) => {
    const suitSelect = container.querySelector(`[data-card-suit="${prefix}-${index}"]`);
    return { rank: rankSelect.value, suit: suitSelect.value, value: RANK_VALUE[rankSelect.value] };
  });
}

function updateVideoPokerAdvice() {
  const cards = getCards(elements.videoPokerCards, "vp");
  if (Core.hasDuplicateCards(cards)) {
    renderVideoPokerScreen(cards, { title: "Duplicate card", detail: "" });
    elements.videoPokerAdvice.innerHTML =
      "<strong>Choose five unique cards.</strong><br>The same card cannot appear twice in a real hand.";
    return;
  }
  const result = Core.videoPokerHold(cards);
  renderVideoPokerScreen(cards, result);
  elements.videoPokerAdvice.innerHTML = `<strong>${result.title}</strong><br>${result.detail}`;
}

function dealVideoPokerHand() {
  setCardPickerCards(elements.videoPokerCards, "vp", randomCards(5));
  playGameSound("videoPoker", "card");
  updateVideoPokerAdvice();
}

function renderVideoPokerScreen(cards, result) {
  const holdIndexes = videoPokerHoldIndexes(cards, result);
  elements.videoPokerHoldGraphic.innerHTML = cards
    .map((_, index) => `<span class="${holdIndexes.has(index) ? "is-held" : ""}">Hold</span>`)
    .join("");
  elements.videoPokerHandGraphic.innerHTML = cards
    .map((card, index) => renderVideoPokerCard(card, holdIndexes.has(index)))
    .join("");
  elements.videoPokerMachineMessage.textContent =
    result.title === "Duplicate card" ? "Duplicate Card" : result.title.replace("Hold all five", "Play 5 Credits");
}

function videoPokerHoldIndexes(cards, result) {
  if (!result || !result.title || result.title === "Draw five new cards") return new Set();
  if (result.title === "Hold all five") return new Set([0, 1, 2, 3, 4]);
  if (result.title.includes("four-card flush")) return indexesMatching(cards, (card) => card.suit === mostCommon(cards, "suit"));
  if (result.title.includes("high cards")) return indexesMatching(cards, (card) => ["J", "Q", "K", "A"].includes(card.rank));
  if (result.title.includes("pair of")) {
    const pairRank = Object.entries(groupCards(cards, "rank")).find(([, group]) => group.length === 2)?.[0];
    return indexesMatching(cards, (card) => card.rank === pairRank);
  }
  if (result.title.includes("two pair")) {
    const pairRanks = Object.entries(groupCards(cards, "rank"))
      .filter(([, group]) => group.length === 2)
      .map(([rank]) => rank);
    return indexesMatching(cards, (card) => pairRanks.includes(card.rank));
  }
  if (result.title.includes("three of a kind")) {
    const rank = Object.entries(groupCards(cards, "rank")).find(([, group]) => group.length === 3)?.[0];
    return indexesMatching(cards, (card) => card.rank === rank);
  }
  if (result.title.includes("four of a kind")) {
    const rank = Object.entries(groupCards(cards, "rank")).find(([, group]) => group.length === 4)?.[0];
    return indexesMatching(cards, (card) => card.rank === rank);
  }
  return new Set([0, 1, 2, 3, 4]);
}

function indexesMatching(cards, predicate) {
  return new Set(cards.map((card, index) => (predicate(card) ? index : -1)).filter((index) => index >= 0));
}

function groupCards(cards, key) {
  return cards.reduce((groups, card) => {
    groups[card[key]] = groups[card[key]] || [];
    groups[card[key]].push(card);
    return groups;
  }, {});
}

function mostCommon(cards, key) {
  return Object.entries(groupCards(cards, key)).sort((a, b) => b[1].length - a[1].length)[0]?.[0];
}

function setupCraps() {
  elements.crapsPoint.addEventListener("input", () => {
    playGameSound("craps", "dice");
    updateCrapsAdvice();
  });
  [elements.crapsBankroll, elements.crapsUnit].forEach((input) =>
    input.addEventListener("input", () => {
      playGameSound("blackjack", "chip");
      updateCrapsAdvice();
    }),
  );
  elements.crapsRollButton.addEventListener("click", () => rollCrapsScenario());
  updateCrapsAdvice();
}

function updateCrapsAdvice(rollNote = "") {
  const plan = Core.crapsPlan(elements.crapsPoint.value, elements.crapsBankroll.value, elements.crapsUnit.value);
  elements.crapsAdvice.innerHTML = `<strong>${plan.maxUnits} base units available.</strong><br>${rollNote ? `${rollNote}<br>` : ""}${plan.detail}<br>Suggested stop-loss: ${plan.stopLossUnits} units.`;
  elements.crapsPointMarker.textContent = elements.crapsPoint.value === "none" ? "Off" : elements.crapsPoint.value;
  elements.crapsPointMarker.classList.toggle("is-on", elements.crapsPoint.value !== "none");
  elements.crapsTableGraphic.dataset.point = elements.crapsPoint.value;
  elements.crapsActionChip.querySelector("strong").textContent = plan.maxUnits;
}

function rollCrapsScenario() {
  const first = Math.ceil(Math.random() * 6);
  const second = Math.ceil(Math.random() * 6);
  const total = first + second;
  const previousPoint = elements.crapsPoint.value;
  let nextPoint = previousPoint;
  let rollNote = "";

  if (previousPoint === "none") {
    if (["4", "5", "6", "8", "9", "10"].includes(String(total))) {
      nextPoint = String(total);
      rollNote = `Roll ${first} + ${second} = ${total}. Point is now ${total}.`;
    } else if ([7, 11].includes(total)) {
      rollNote = `Roll ${first} + ${second} = ${total}. Pass line wins on the come-out.`;
    } else if ([2, 3, 12].includes(total)) {
      rollNote = `Roll ${first} + ${second} = ${total}. Pass line loses on the come-out.`;
    }
  } else if (total === Number(previousPoint)) {
    nextPoint = "none";
    rollNote = `Roll ${first} + ${second} = ${total}. Point made, puck goes off.`;
  } else if (total === 7) {
    nextPoint = "none";
    rollNote = `Roll ${first} + ${second} = 7. Seven-out, puck goes off.`;
  } else {
    rollNote = `Roll ${first} + ${second} = ${total}. Point remains ${previousPoint}.`;
  }

  elements.crapsPoint.value = nextPoint;
  renderCrapsDice(first, second);
  playGameSound("craps", "dice");
  updateCrapsAdvice(rollNote);
}

function renderCrapsDice(first, second) {
  const dicePair = elements.crapsTableGraphic.querySelector(".dice-pair");
  if (!dicePair) return;
  dicePair.innerHTML = `<span class="die ${dieClass(first)}"></span><span class="die ${dieClass(second)}"></span>`;
}

function dieClass(value) {
  return ["", "die-one", "die-two", "die-three", "die-four", "die-five", "die-six"][value] || "die-one";
}

function updateThreeCardAdvice() {
  const cards = getCards(elements.threeCardCards, "tc");
  renderGraphicCards(elements.threeCardHandGraphic, cards);
  if (Core.hasDuplicateCards(cards)) {
    elements.threeCardAdvice.innerHTML =
      "<strong>Choose three unique cards.</strong><br>The same card cannot appear twice in a real hand.";
    elements.threeCardActionGraphic.textContent = "Check";
    elements.threeCardActionGraphic.classList.remove("is-fold");
    return;
  }
  const result = Core.threeCardDecision(cards);
  elements.threeCardAdvice.innerHTML = `<strong>${result.action}.</strong><br>${result.detail}`;
  elements.threeCardActionGraphic.textContent = result.action;
  elements.threeCardActionGraphic.classList.toggle("is-fold", result.action === "Fold");
}

function dealThreeCardHand() {
  setCardPickerCards(elements.threeCardCards, "tc", randomCards(3));
  playGameSound("threeCard", "card");
  updateThreeCardAdvice();
}

function setupSlots() {
  loadSlotPots();
  loadSlotSession();
  [elements.slotBankroll, elements.slotBet, elements.slotRtp, elements.slotVolatility].forEach((input) =>
    input.addEventListener("input", () => {
      playGameSound("ui", "tap");
      state.slotVisibleSymbols = [];
      if (input === elements.slotBankroll) resetSlotSessionFromInputs();
      updateSlotsAdvice();
    }),
  );
  elements.slotSpinButton.addEventListener("click", () => startSlotSpin());
  elements.slotTestCollectButton.addEventListener("click", () => startSlotSpin({ forceCollect: true }));
  elements.slotReels.addEventListener("animationend", handleSlotAnimationEnd);
  elements.slotBonusScreen.addEventListener("click", (event) => {
    const pickButton = event.target.closest("[data-slot-bonus-pick]");
    if (pickButton) {
      revealSlotBonusPick(Number(pickButton.dataset.slotBonusPick));
      return;
    }

    if (!event.target.closest("[data-slot-bonus-close]")) return;
    hideSlotBonusScreen();
  });
  elements.slotRulesOpen.addEventListener("click", openSlotRules);
  elements.slotRulesClose.addEventListener("click", closeSlotRules);
  elements.slotRulesModal.addEventListener("click", (event) => {
    if (event.target === elements.slotRulesModal) closeSlotRules();
  });
  elements.slotProfileOpen.addEventListener("click", openSlotProfile);
  elements.slotProfileClose.addEventListener("click", closeSlotProfile);
  elements.slotProfileModal.addEventListener("click", (event) => {
    if (event.target === elements.slotProfileModal) closeSlotProfile();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!elements.slotRulesModal.hidden) closeSlotRules();
    if (!elements.slotProfileModal.hidden) closeSlotProfile();
  });
  updateSlotsAdvice();
  maybeShowSlotBonusPreview();
}

function openSlotRules() {
  state.slotRulesLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  elements.slotRulesModal.hidden = false;
  elements.slotRulesModal.classList.add("is-open");
  elements.slotRulesOpen.setAttribute("aria-expanded", "true");
  document.body.classList.add("slot-rules-opened");
  playGameSound("ui", "tap");
  elements.slotRulesClose.focus();
}

function closeSlotRules() {
  elements.slotRulesModal.classList.remove("is-open");
  elements.slotRulesModal.hidden = true;
  elements.slotRulesOpen.setAttribute("aria-expanded", "false");
  document.body.classList.remove("slot-rules-opened");
  if (state.slotRulesLastFocus) state.slotRulesLastFocus.focus();
}

function openSlotProfile() {
  state.slotProfileLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  elements.slotProfileModal.hidden = false;
  elements.slotProfileModal.classList.add("is-open");
  elements.slotProfileOpen.setAttribute("aria-expanded", "true");
  document.body.classList.add("slot-profile-opened");
  playGameSound("ui", "tap");
  elements.slotProfileClose.focus();
}

function closeSlotProfile() {
  elements.slotProfileModal.classList.remove("is-open");
  elements.slotProfileModal.hidden = true;
  elements.slotProfileOpen.setAttribute("aria-expanded", "false");
  document.body.classList.remove("slot-profile-opened");
  if (state.slotProfileLastFocus) state.slotProfileLastFocus.focus();
}

function startSlotSpin({ forceCollect = false } = {}) {
  if (state.slotSpinning) return;
  if (state.slotCredits < currentSlotBet()) {
    elements.slotBonusMeter.textContent = "Add credits";
    resetSlotSessionFromInputs();
    updateSlotsAdvice();
    return;
  }

  hideSlotBonusScreen();
  state.slotSpinning = true;
  state.slotForceCollectSpin = forceCollect;
  playGameSound("slots", "spin");
  elements.slotSpinButton.disabled = true;
  elements.slotTestCollectButton.disabled = true;
  elements.slotSpinButton.querySelector("span").textContent = forceCollect ? "Collect..." : "Spin...";
  elements.slotReels.classList.remove("is-settling");
  elements.slotReels.classList.add("is-spinning");
  window.clearTimeout(state.slotSpinFallback);
  window.clearTimeout(state.slotSettleFallback);
  state.slotSpinFallback = window.setTimeout(finishSlotSpin, SLOT_SPIN_DURATION_MS + 250);
}

function handleSlotAnimationEnd(event) {
  if (event.target !== elements.slotReels) return;
  if (elements.slotReels.classList.contains("is-spinning")) {
    finishSlotSpin();
    return;
  }
  if (elements.slotReels.classList.contains("is-settling")) {
    finishSlotSettle();
  }
}

function finishSlotSpin() {
  if (!state.slotSpinning || !elements.slotReels.classList.contains("is-spinning")) return;
  window.clearTimeout(state.slotSpinFallback);
  state.slotSpinFallback = null;
  state.slotSpinSeed = Math.floor(Math.random() * 100000);
  state.slotVisibleSymbols = state.slotForceCollectSpin
    ? buildForcedCollectSlotSymbols()
    : buildSlotReelSymbols(currentSlotPlan());
  settleSlotWager();
  advanceSlotPots(state.slotVisibleSymbols);
  elements.slotReels.classList.remove("is-spinning");
  elements.slotReels.classList.add("is-settling");
  window.clearTimeout(state.slotSettleFallback);
  state.slotSettleFallback = window.setTimeout(finishSlotSettle, SLOT_SETTLE_DURATION_MS + 250);
  try {
    updateSlotsAdvice(true);
  } catch (error) {
    console.error("Slot reel update failed", error);
  }
}

function finishSlotSettle() {
  if (!state.slotSpinning) return;
  window.clearTimeout(state.slotSettleFallback);
  state.slotSettleFallback = null;
  elements.slotReels.classList.remove("is-settling");
  elements.slotSpinButton.disabled = false;
  elements.slotTestCollectButton.disabled = false;
  elements.slotSpinButton.querySelector("span").textContent = "Spin";
  state.slotForceCollectSpin = false;
  state.slotSpinning = false;
}

function currentSlotBankroll() {
  return Math.max(0, Number(elements.slotBankroll.value) || 0);
}

function currentSlotPlan() {
  return Core.slotsPlan(elements.slotBankroll.value, elements.slotBet.value, elements.slotRtp.value, elements.slotVolatility.value);
}

function currentSlotBet() {
  return Math.max(0.25, Number(elements.slotBet.value) || 1);
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function loadSlotSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SLOT_SESSION_STORAGE_KEY) || "{}");
    state.slotCredits = Number.isFinite(Number(saved.credits)) ? Math.max(0, Number(saved.credits)) : currentSlotBankroll();
    state.slotLastWin = Number.isFinite(Number(saved.lastWin)) ? Math.max(0, Number(saved.lastWin)) : 0;
    state.slotTotalWon = Number.isFinite(Number(saved.totalWon)) ? Math.max(0, Number(saved.totalWon)) : 0;
    state.slotSpinCount = Number.isFinite(Number(saved.spinCount)) ? Math.max(0, Math.floor(Number(saved.spinCount))) : 0;
    state.slotLastOutcome = saved.lastOutcome || null;
  } catch {
    resetSlotSessionFromInputs(false);
  }
}

function saveSlotSession() {
  try {
    localStorage.setItem(
      SLOT_SESSION_STORAGE_KEY,
      JSON.stringify({
        credits: state.slotCredits,
        lastWin: state.slotLastWin,
        totalWon: state.slotTotalWon,
        spinCount: state.slotSpinCount,
        lastOutcome: state.slotLastOutcome,
      }),
    );
  } catch {
    // Session numbers remain usable until the page closes if storage is blocked.
  }
}

function resetSlotSessionFromInputs(shouldSave = true) {
  state.slotCredits = currentSlotBankroll();
  state.slotLastWin = 0;
  state.slotTotalWon = 0;
  state.slotSpinCount = 0;
  state.slotLastOutcome = null;
  if (shouldSave) saveSlotSession();
}

function loadSlotPots() {
  try {
    const saved = JSON.parse(localStorage.getItem(SLOT_POT_STORAGE_KEY) || "{}");
    Object.keys(SLOT_POTS).forEach((key) => {
      const target = SLOT_POTS[key].target;
      state.slotPots[key] = clampPotValue(saved[key], target);
    });
  } catch {
    state.slotPots = { freeThrow: 0, heatCheck: 0, championship: 0 };
  }
}

function saveSlotPots() {
  try {
    localStorage.setItem(SLOT_POT_STORAGE_KEY, JSON.stringify(state.slotPots));
  } catch {
    // Pot meters still persist for this session if browser storage is blocked.
  }
}

function clampPotValue(value, target) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(target, Math.floor(numeric)));
}

function advanceSlotPots(reelSymbols = getCurrentSlotSymbols()) {
  const events = [];
  Core.slotPotCollections(reelSymbols, SLOT_POTS).forEach((collection) => {
    const pot = SLOT_POTS[collection.key];
    if (!pot) return;

    const nextValue = state.slotPots[collection.key] + collection.increment;
    if (nextValue >= pot.target) {
      const bonus = rollSlotBonus(pot);
      state.slotPots[collection.key] = 0;
      events.push({ type: "trigger", ...collection, label: pot.label, bonus });
      return;
    }

    state.slotPots[collection.key] = nextValue;
    events.push({ type: "advance", ...collection, label: pot.label, value: nextValue });
  });

  state.slotLastPotEvents = events;
  saveSlotPots();
}

function rollSlotPayout(rtp) {
  const scale = Math.max(0.75, Math.min(1.15, (Number(rtp) || SLOT_BASE_RTP) / SLOT_BASE_RTP));
  const roll = Math.random();
  let cumulative = 0;
  const outcome =
    SLOT_PAY_OUTCOMES.find((item) => {
      cumulative += item.chance;
      return roll <= cumulative;
    }) || SLOT_PAY_OUTCOMES[0];

  return {
    ...outcome,
    multiplier: outcome.multiplier * scale,
  };
}

function settleSlotWager() {
  const bet = currentSlotBet();
  const outcome = rollSlotPayout(elements.slotRtp.value);
  const win = roundMoney(bet * outcome.multiplier);

  state.slotCredits = roundMoney(Math.max(0, state.slotCredits - bet) + win);
  state.slotLastWin = win;
  state.slotTotalWon = roundMoney(state.slotTotalWon + win);
  state.slotSpinCount += 1;
  state.slotLastOutcome = outcome.label;
  saveSlotSession();
}

function settleSlotBonusWins() {
  const triggered = state.slotLastPotEvents.filter((event) => event.type === "trigger");
  if (!triggered.length) return;

  const bet = currentSlotBet();
  const bonusWin = triggered.reduce((total, event) => total + bet * (event.bonus.multiplier || 0), 0);
  if (bonusWin <= 0) return;

  state.slotLastWin = roundMoney(state.slotLastWin + bonusWin);
  state.slotCredits = roundMoney(state.slotCredits + bonusWin);
  state.slotTotalWon = roundMoney(state.slotTotalWon + bonusWin);
  saveSlotSession();
}

function rollSlotBonus(pot) {
  const bonusKeys = pot.bonusKeys || ["freeThrows"];
  const bonusKey = bonusKeys[Math.floor(Math.random() * bonusKeys.length)] || "freeThrows";
  const bonus = SLOT_BONUS_PLAYS[bonusKey] || SLOT_BONUS_PLAYS.freeThrows;
  const roll = Math.random();

  if (bonusKey === "freeThrows") {
    const makes = Math.max(1, Math.min(5, Math.ceil(roll * 5)));
    return {
      ...bonus,
      key: bonusKey,
      value: `${makes}/5`,
      award: makes >= 4 ? "Hot hand boost" : "Credit boost",
      meter: Math.round((makes / 5) * 100),
      multiplier: makes * 2,
    };
  }

  if (bonusKey === "heatCheck") {
    const streak = Math.max(2, Math.min(8, Math.ceil(roll * 8)));
    return {
      ...bonus,
      key: bonusKey,
      value: `${streak}x`,
      award: streak >= 6 ? "Fire ladder" : "Fast-break pays",
      meter: Math.min(100, streak * 12),
      multiplier: streak * 3,
    };
  }

  if (bonusKey === "ringChase") {
    const rings = Math.max(1, Math.min(3, Math.ceil(roll * 3)));
    return {
      ...bonus,
      key: bonusKey,
      value: `${rings}/3`,
      award: rings === 3 ? "Ring sweep" : "Ring collect",
      meter: Math.round((rings / 3) * 100),
      multiplier: rings * 12,
    };
  }

  const tiers = roll > 0.96 ? "Grand" : roll > 0.84 ? "Major" : roll > 0.48 ? "Minor" : "Mini";
  const tierMultipliers = { Mini: 15, Minor: 40, Major: 150, Grand: 500 };
  return {
    ...bonus,
    key: bonusKey,
    value: tiers,
    award: `${tiers} shot`,
    meter: roll > 0.96 ? 100 : roll > 0.84 ? 78 : roll > 0.48 ? 54 : 32,
    multiplier: tierMultipliers[tiers],
  };
}

function updateSlotsAdvice(playResultSound = false) {
  const plan = currentSlotPlan();
  elements.slotsAdvice.innerHTML = `<strong>${plan.spins} spins before the bankroll is gone.</strong><br>At ${Number(elements.slotRtp.value).toFixed(1)}% RTP, the long-run expected loss over that many spins is about $${plan.expectedLoss.toFixed(2)}. For ${elements.slotVolatility.value} volatility, consider a stop-loss near $${plan.stopLoss.toFixed(0)} and a win goal near $${plan.winGoal.toFixed(0)}.`;
  renderSlotVisual(plan, playResultSound);
}

function renderGraphicCards(container, cards) {
  container.innerHTML = cards.map(renderGraphicCard).join("");
}

function renderGraphicCard(card) {
  if (card.back) return '<span class="graphic-card back"></span>';
  const isRed = card.suit === "♥" || card.suit === "♦";
  return `<span class="graphic-card ${isRed ? "red" : ""}"><span>${card.rank}</span><small>${card.suit}</small></span>`;
}

function renderVideoPokerCard(card, isHeld) {
  const isRed = card.suit === "♥" || card.suit === "♦";
  const faceLabel = ["J", "Q", "K"].includes(card.rank) ? `<b class="vp-face">${card.rank}</b>` : `<b class="vp-pip">${card.suit}</b>`;
  return `
    <span class="vp-card ${isRed ? "red" : ""} ${isHeld ? "is-held" : ""}">
      <span class="vp-corner top">${card.rank}<small>${card.suit}</small></span>
      <span class="vp-card-art">${faceLabel}</span>
      <span class="vp-corner bottom">${card.rank}<small>${card.suit}</small></span>
    </span>
  `;
}

function renderSlotVisual(plan, playResultSound = false) {
  const reelSymbols = state.slotVisibleSymbols.length ? state.slotVisibleSymbols : buildSlotReelSymbols();
  state.slotVisibleSymbols = reelSymbols;

  elements.slotReels.innerHTML = reelSymbols.map((label, index) => renderSlotSymbol(label, index)).join("");
  elements.slotSpinMeter.textContent = `${plan.spins} spins`;
  elements.slotCreditsMeter.textContent = `Credits ${formatMoney(state.slotCredits)}`;
  elements.slotWinMeter.textContent = `Win ${formatMoney(state.slotLastWin)}`;
  elements.slotLossMeter.textContent = `$${plan.expectedLoss.toFixed(2)} expected loss`;
  elements.slotStopMeter.textContent = `$${plan.stopLoss.toFixed(0)} stop`;
  elements.slotBetBadge.textContent = `$${Number(elements.slotBet.value || 0).toFixed(2)}`;
  updateSlotBonusMeters(playResultSound);
  elements.slotGrandMeter.textContent = `$${Math.max(5000, plan.winGoal * 250).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  elements.slotMajorMeter.textContent = `$${Math.max(1000, plan.winGoal * 50).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  elements.slotMinorMeter.textContent = `$${Math.max(100, plan.stopLoss * 4).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  elements.slotMiniMeter.textContent = `$${Math.max(25, plan.stopLoss).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function buildSlotReelSymbols() {
  const volatility = elements.slotVolatility.value;
  const symbolSets = {
    low: ["basketball", "basketball", "whistle", "sneaker", "arena", "jersey", "scoreboard", "ring", "bonus-free"],
    medium: ["basketball", "sneaker", "arena", "scoreboard", "ring", "trophy", "wild", "bonus-free", "fire-seven"],
    high: ["basketball", "ring", "trophy", "wild", "bonus-free", "fire-seven", "jackpot-hoop", "scoreboard"],
  };
  const symbols = symbolSets[volatility] || symbolSets.medium;
  const seed =
    Number(elements.slotBankroll.value) * 3 +
    Number(elements.slotBet.value) * 19 +
    Number(elements.slotRtp.value) * 11 +
    volatility.length +
    state.slotSpinSeed;

  const reelSymbols = Array.from({ length: 25 }, (_, index) => {
    const label = symbols[Math.abs(Math.floor(seed + index * 3 + index * index)) % symbols.length];
    return index === 12 && !symbols.includes("jackpot-hoop") ? "bonus-free" : label;
  });

  return reelSymbols;
}

function buildForcedCollectSlotSymbols() {
  return [
    "bonus-free",
    "basketball",
    "fire-seven",
    "ring",
    "basketball",
    "scoreboard",
    "wild",
    "basketball",
    "jackpot-hoop",
    "fire-seven",
    "bonus-free",
    "sneaker",
    "bonus-free",
    "ring",
    "scoreboard",
    "basketball",
    "wild",
    "trophy",
    "ring",
    "jackpot-hoop",
    "jersey",
    "basketball",
    "fire-seven",
    "bonus-free",
    "basketball",
  ];
}

function getCurrentSlotSymbols() {
  return state.slotVisibleSymbols.length
    ? state.slotVisibleSymbols
    : $$("[data-slot-symbol]").map((element) => element.dataset.slotSymbol);
}

function updateSlotBonusMeters(playResultSound = false) {
  const triggered = state.slotLastPotEvents.filter((event) => event.type === "trigger");
  const advanced = state.slotLastPotEvents.filter((event) => event.type === "advance");
  const triggeredKeys = new Set(triggered.map((event) => event.key));

  setSlotPot(
    elements.slotFreeThrowPot,
    state.slotPots.freeThrow,
    SLOT_POTS.freeThrow.target,
    triggeredKeys.has("freeThrow"),
  );
  setSlotPot(
    elements.slotHeatCheckPot,
    state.slotPots.heatCheck,
    SLOT_POTS.heatCheck.target,
    triggeredKeys.has("heatCheck"),
  );
  setSlotPot(
    elements.slotChampionshipPot,
    state.slotPots.championship,
    SLOT_POTS.championship.target,
    triggeredKeys.has("championship"),
  );

  if (triggered.length) {
    showSlotBonusScreen(triggered);
    elements.slotBonusMeter.textContent = `${triggered.map((event) => event.bonus.title).join(" + ")} bonus triggered`;
  } else if (advanced.length) {
    elements.slotBonusMeter.textContent = advanced.map(formatSlotPotEvent).join(" · ");
  } else if (state.slotLastOutcome) {
    elements.slotBonusMeter.textContent = state.slotLastOutcome;
  } else {
    elements.slotBonusMeter.textContent = "Pots hold";
  }

  if (playResultSound) {
    animateSlotPotCollections([...advanced, ...triggered]);
    if (triggered.length) window.setTimeout(refreshSlotPotMeters, 1300);
    window.setTimeout(() => playGameSound("slots", triggered.length ? "bonus" : "stop"), 360);
    state.slotLastPotEvents = [];
  }
}

function formatSlotPotEvent(event) {
  const potName = event.label.replace(" Pot", "");
  if (event.fallback) return `Loose ball to ${potName} +${event.increment}`;
  return `${potName} +${event.increment}`;
}

function refreshSlotPotMeters() {
  setSlotPot(elements.slotFreeThrowPot, state.slotPots.freeThrow, SLOT_POTS.freeThrow.target);
  setSlotPot(elements.slotHeatCheckPot, state.slotPots.heatCheck, SLOT_POTS.heatCheck.target);
  setSlotPot(elements.slotChampionshipPot, state.slotPots.championship, SLOT_POTS.championship.target);
}

function showSlotBonusScreen(triggeredEvents) {
  if (!elements.slotBonusScreen || !triggeredEvents.length) return;
  const featuredEvent = triggeredEvents[0];
  const bonus = featuredEvent.bonus;
  const extraEvents = triggeredEvents.slice(1);
  const session = createSlotBonusPickSession(triggeredEvents);
  state.slotBonusPickSession = session;

  elements.slotBonusScreen.hidden = false;
  elements.slotBonusScreen.className = `slot-bonus-screen is-open ${bonus.accent}`;
  elements.slotBonusScreen.innerHTML = `
    <div class="slot-bonus-court">
      <button class="slot-bonus-close" type="button" data-slot-bonus-close aria-label="Close bonus screen">×</button>
      <div class="slot-bonus-hoop" aria-hidden="true">
        <span></span>
      </div>
      <div class="slot-bonus-copy">
        <small>${featuredEvent.label}</small>
        <strong>${bonus.title}</strong>
        <p>Pick basketballs to reveal prizes. Find Collect to bank the bonus.</p>
      </div>
      <div class="slot-bonus-scoreboard">
        <span>Found</span>
        <strong id="slotBonusFound">${formatMoney(0)}</strong>
        <b id="slotBonusStatus">Pick a ball</b>
      </div>
      <div class="slot-bonus-pick-grid" aria-label="Basketball bonus picks">
        ${session.picks
          .map(
            (pick, index) => `
              <button class="slot-bonus-pick" type="button" data-slot-bonus-pick="${index}" aria-label="Reveal basketball ${index + 1}">
                <span class="slot-bonus-ball-face" aria-hidden="true"></span>
                <strong>${pick.type === "collect" ? "Collect" : formatMoney(pick.value)}</strong>
              </button>
            `,
          )
          .join("")}
      </div>
      <img src="./assets/slots/${bonus.symbol}" alt="" loading="lazy" />
      <em id="slotBonusTotal">Available bonus: ${formatMoney(session.totalAward)}${extraEvents.length ? ` · Extra bonus: ${extraEvents.map((event) => event.bonus.title).join(" + ")}` : ""}</em>
    </div>
  `;

  window.clearTimeout(state.slotBonusTimeout);
  state.slotBonusTimeout = null;
}

function createSlotBonusPickSession(triggeredEvents) {
  const totalAward = roundMoney(
    triggeredEvents.reduce((total, event) => total + currentSlotBet() * (event.bonus.multiplier || 0), 0),
  );
  const awards = splitSlotBonusAward(totalAward);
  const picks = awards.map((value) => ({ type: "award", value, revealed: false }));
  picks.push({ type: "collect", value: totalAward, revealed: false });
  while (picks.length < 9) picks.push({ type: "award", value: roundMoney(currentSlotBet()), revealed: false });

  return {
    totalAward,
    foundAward: 0,
    collected: false,
    preview: new URLSearchParams(window.location.search).get("slotBonus") === "preview",
    picks: shuffleSlotBonusPicks(picks),
  };
}

function splitSlotBonusAward(totalAward) {
  if (totalAward <= 0) return [0, 0, 0, 0];
  const weights = [0.12, 0.18, 0.24, 0.46];
  const awards = weights.map((weight) => roundMoney(totalAward * weight));
  const difference = roundMoney(totalAward - awards.reduce((sum, value) => roundMoney(sum + value), 0));
  awards[awards.length - 1] = roundMoney(awards[awards.length - 1] + difference);
  return awards;
}

function shuffleSlotBonusPicks(picks) {
  const shuffled = [...picks];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function revealSlotBonusPick(index) {
  const session = state.slotBonusPickSession;
  if (!session || session.collected) return;
  const pick = session.picks[index];
  if (!pick || pick.revealed) return;

  pick.revealed = true;
  const button = elements.slotBonusScreen.querySelector(`[data-slot-bonus-pick="${index}"]`);
  if (button) {
    button.classList.add("is-revealed", pick.type === "collect" ? "is-collect" : "is-award");
    button.disabled = true;
  }

  if (pick.type === "collect") {
    collectSlotBonusSession();
    return;
  }

  session.foundAward = roundMoney(session.foundAward + pick.value);
  updateSlotBonusPickBoard(`Found ${formatMoney(pick.value)}`);
  playGameSound("ui", "tap");
}

function collectSlotBonusSession() {
  const session = state.slotBonusPickSession;
  if (!session || session.collected) return;
  session.collected = true;

  if (!session.preview && session.totalAward > 0) {
    state.slotLastWin = roundMoney(state.slotLastWin + session.totalAward);
    state.slotCredits = roundMoney(state.slotCredits + session.totalAward);
    state.slotTotalWon = roundMoney(state.slotTotalWon + session.totalAward);
    saveSlotSession();
  }

  elements.slotWinMeter.textContent = `Win ${formatMoney(state.slotLastWin)}`;
  elements.slotCreditsMeter.textContent = `Credits ${formatMoney(state.slotCredits)}`;
  elements.slotBonusMeter.textContent = `Collected ${formatMoney(session.totalAward)}`;
  elements.slotBonusScreen.querySelectorAll("[data-slot-bonus-pick]").forEach((button) => {
    button.disabled = true;
  });
  updateSlotBonusPickBoard(`Collected ${formatMoney(session.totalAward)}`);
  playGameSound("slots", "bonus");
}

function updateSlotBonusPickBoard(status) {
  const session = state.slotBonusPickSession;
  if (!session) return;
  const found = elements.slotBonusScreen.querySelector("#slotBonusFound");
  const statusLabel = elements.slotBonusScreen.querySelector("#slotBonusStatus");
  if (found) found.textContent = session.collected ? formatMoney(session.totalAward) : formatMoney(session.foundAward);
  if (statusLabel) statusLabel.textContent = status;
}

function maybeShowSlotBonusPreview() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("slotBonus") !== "preview") return;

  const bonus = {
    ...SLOT_BONUS_PLAYS.hoopJackpot,
    key: "hoopJackpot",
    value: "Major",
    award: "Major shot",
    meter: 78,
    multiplier: 150,
  };
  showSlotBonusScreen([{ type: "trigger", key: "championship", label: "Championship Pot", bonus }]);
  elements.slotBonusMeter.textContent = "Hoop Jackpot bonus preview";
}

function hideSlotBonusScreen() {
  if (!elements.slotBonusScreen) return;
  if (state.slotBonusPickSession && !state.slotBonusPickSession.collected) collectSlotBonusSession();
  window.clearTimeout(state.slotBonusTimeout);
  state.slotBonusTimeout = null;
  elements.slotBonusScreen.classList.remove("is-open");
  elements.slotBonusScreen.hidden = true;
  state.slotBonusPickSession = null;
  if (window.location.hash === "#slotBonusScreen" || new URLSearchParams(window.location.search).has("slotBonus")) {
    const nextUrl = new URL(window.location.href);
    nextUrl.hash = "";
    nextUrl.searchParams.delete("slotBonus");
    window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}`);
  }
}

function setSlotPot(element, count, target, triggered = false) {
  const fill = triggered ? 100 : Math.min(100, Math.round((count / target) * 100));
  const label = triggered ? "BONUS" : `${Math.min(count, target)}/${target}`;
  element.style.setProperty("--pot-fill", `${fill}%`);
  element.querySelector("b").setAttribute("data-count", label);
  const visibleValue = element.querySelector(".slot-pot-value");
  if (visibleValue) visibleValue.textContent = label;
  element.classList.toggle("is-full", triggered || count >= target);
}

function animateSlotPotCollections(events) {
  if (!events.length) return;
  const potTargets = {
    freeThrow: elements.slotFreeThrowPot,
    heatCheck: elements.slotHeatCheckPot,
    championship: elements.slotChampionshipPot,
  };
  const fallbackSource = elements.slotReels.getBoundingClientRect();

  events.forEach((event, index) => {
    const target = potTargets[event.key];
    if (!target) return;

    const source = document.querySelector(`[data-slot-symbol="${event.symbol}"]`);
    const startRect = source?.getBoundingClientRect() || fallbackSource;
    const endRect = target.getBoundingClientRect();
    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;
    const endX = endRect.left + endRect.width / 2;
    const endY = endRect.top + endRect.height / 2;
    const flyer = document.createElement("img");

    flyer.className = "slot-collect-flyer";
    flyer.src = `./assets/slots/${slotSymbolFileName(event.symbol)}`;
    flyer.alt = "";
    flyer.style.left = `${startX}px`;
    flyer.style.top = `${startY}px`;
    flyer.style.setProperty("--fly-x", `${endX - startX}px`);
    flyer.style.setProperty("--fly-y", `${endY - startY}px`);
    flyer.style.animationDelay = `${index * 90}ms`;
    document.body.append(flyer);

    target.classList.add("is-collecting");
    window.setTimeout(() => target.classList.remove("is-collecting"), 760 + index * 90);
    window.setTimeout(() => flyer.remove(), 980 + index * 90);
  });
}

function slotSymbolFileName(symbol) {
  const files = {
    arena: "arena.png",
    basketball: "basketball.png",
    "bonus-free": "bonus-free.png",
    "fire-seven": "fire-seven.png",
    "jackpot-hoop": "jackpot-hoop.png",
    jersey: "jersey.png",
    ring: "ring.png",
    scoreboard: "scoreboard.png",
    sneaker: "sneaker.png",
    trophy: "trophy.png",
    whistle: "whistle.png",
    wild: "wild.png",
  };
  return files[symbol] || files.basketball;
}

function renderSlotSymbol(symbol, index) {
  const labels = {
    arena: ["Arena", "arena", "arena.png"],
    basketball: ["Ball", "basketball", "basketball.png"],
    "bonus-free": ["Bonus", "bonus-free", "bonus-free.png"],
    "fire-seven": ["Fire 7s", "fire-seven", "fire-seven.png"],
    "jackpot-hoop": ["Jackpot", "jackpot-hoop", "jackpot-hoop.png"],
    jersey: ["Jersey", "jersey", "jersey.png"],
    ring: ["Ring", "ring", "ring.png"],
    scoreboard: ["Board", "scoreboard", "scoreboard.png"],
    sneaker: ["Sneaker", "sneaker", "sneaker.png"],
    trophy: ["Trophy", "trophy", "trophy.png"],
    whistle: ["Whistle", "whistle", "whistle.png"],
    wild: ["Wild", "wild", "wild.png"],
  };
  const [label, className, fileName] = labels[symbol] || labels.basketball;
  const featured = ["bonus-free", "fire-seven", "jackpot-hoop", "wild"].includes(symbol);
  const reelIndex = index % 5;
  const rowIndex = Math.floor(index / 5);
  return `
    <span class="slot-reel ${className} ${featured ? "featured" : ""}" data-slot-symbol="${symbol}" style="--reel-index: ${reelIndex}; --row-index: ${rowIndex};">
      <img class="slot-symbol-art" src="./assets/slots/${fileName}" alt="" loading="lazy" />
      <strong>${label}</strong>
    </span>
  `;
}

function setupBankroll() {
  [elements.monthlyBudget, elements.sessionsMonth, elements.lotterySpend].forEach((input) =>
    input.addEventListener("input", () => {
      playGameSound("ui", "tap");
      updateBankrollAdvice();
    }),
  );
  updateBankrollAdvice();
}

function updateBankrollAdvice() {
  const plan = Core.bankrollPlan(elements.monthlyBudget.value, elements.sessionsMonth.value, elements.lotterySpend.value);
  elements.bankrollAdvice.innerHTML = `<strong>$${plan.perSession.toFixed(2)} per session.</strong><br>If you spend $${Number(elements.lotterySpend.value).toFixed(2)} on lottery tickets first, keep casino play around $${plan.casinoBudget.toFixed(2)} for that session.`;
}

function setupPwa() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("service-worker.js")
      .then((registration) => registration.update())
      .catch((error) => {
        console.warn("Service worker registration failed", error);
      });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (state.serviceWorkerRefreshing) return;
      state.serviceWorkerRefreshing = true;
      window.location.reload();
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    elements.installButton.hidden = false;
  });

  elements.installButton.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    elements.installButton.hidden = true;
  });
}

async function init() {
  setupSound();
  setupNavigation();
  setupBlackjack();
  setupCardPickers();
  setupCraps();
  setupSlots();
  setupBankroll();
  setupPwa();
  applyInitialRoute();

  elements.syncButton.addEventListener("click", () => {
    playGameSound("lottery", "sync");
    syncDrawData();
  });
  elements.generateButton.addEventListener("click", () => {
    playGameSound("lottery", "generate");
    generateTickets();
  });
  elements.csvUpload.addEventListener("change", importCsvFile);
  elements.drawWindow.addEventListener("change", renderLottery);
  elements.pickStyle.addEventListener("change", () => {
    elements.ticketList.innerHTML = "";
    renderLottery();
  });

  try {
    state.db = await openDatabase();
    state.draws = await loadDraws(state.game);
    setStatus("Ready");
    renderLottery();
  } catch (error) {
    console.error(error);
    setStatus("Storage unavailable");
  }
}

init();
