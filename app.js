"use strict";

const Core = window.PickTheNumberCore;
if (!Core) throw new Error("PickTheNumberCore failed to load.");

const { FIVE_YEARS_DAYS, GAMES, RANKS, SUITS, RANK_VALUE } = Core;
const DB_NAME = "pick-the-number-db";
const DB_VERSION = 1;
const SOUND_STORAGE_KEY = "pick-the-number-sound";

const state = {
  db: null,
  game: "powerball",
  draws: [],
  deferredInstallPrompt: null,
  slotSpinSeed: 0,
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
  videoPokerCards: $("#videoPokerCards"),
  videoPokerAdvice: $("#videoPokerAdvice"),
  videoPokerHandGraphic: $("#videoPokerHandGraphic"),
  videoPokerHoldGraphic: $("#videoPokerHoldGraphic"),
  videoPokerMachineMessage: $("#videoPokerMachineMessage"),
  crapsAdvice: $("#crapsAdvice"),
  crapsTableGraphic: $("#crapsTableGraphic"),
  crapsPointMarker: $("#crapsPointMarker"),
  crapsActionChip: $("#crapsActionChip"),
  crapsPoint: $("#crapsPoint"),
  crapsBankroll: $("#crapsBankroll"),
  crapsUnit: $("#crapsUnit"),
  threeCardCards: $("#threeCardCards"),
  threeCardAdvice: $("#threeCardAdvice"),
  threeCardHandGraphic: $("#threeCardHandGraphic"),
  threeCardActionGraphic: $("#threeCardActionGraphic"),
  slotsAdvice: $("#slotsAdvice"),
  slotReels: $("#slotReels"),
  slotSpinButton: $("#slotSpinButton"),
  slotSpinMeter: $("#slotSpinMeter"),
  slotBonusMeter: $("#slotBonusMeter"),
  slotLossMeter: $("#slotLossMeter"),
  slotStopMeter: $("#slotStopMeter"),
  slotFreeThrowPot: $("#slotFreeThrowPot"),
  slotHeatCheckPot: $("#slotHeatCheckPot"),
  slotChampionshipPot: $("#slotChampionshipPot"),
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
  const view = new URLSearchParams(window.location.search).get("view");
  if (view === "strategy") showView("strategyView");
  if (view === "bankroll") showView("bankrollView");
}

function setupBlackjack() {
  const dealerCards = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"];
  elements.bjDealer.innerHTML = dealerCards.map((card) => `<option value="${card}">${card}</option>`).join("");

  const refreshPlayerValues = () => {
    const type = elements.bjHandType.value;
    const values =
      type === "pair"
        ? ["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"]
        : type === "soft"
          ? ["13", "14", "15", "16", "17", "18", "19", "20", "21"]
          : ["5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"];
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
  refreshPlayerValues();
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
  updateCrapsAdvice();
}

function updateCrapsAdvice() {
  const plan = Core.crapsPlan(elements.crapsPoint.value, elements.crapsBankroll.value, elements.crapsUnit.value);
  elements.crapsAdvice.innerHTML = `<strong>${plan.maxUnits} base units available.</strong><br>${plan.detail}<br>Suggested stop-loss: ${plan.stopLossUnits} units.`;
  elements.crapsPointMarker.textContent = elements.crapsPoint.value === "none" ? "Off" : elements.crapsPoint.value;
  elements.crapsPointMarker.classList.toggle("is-on", elements.crapsPoint.value !== "none");
  elements.crapsTableGraphic.dataset.point = elements.crapsPoint.value;
  elements.crapsActionChip.querySelector("strong").textContent = plan.maxUnits;
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

function setupSlots() {
  [elements.slotBankroll, elements.slotBet, elements.slotRtp, elements.slotVolatility].forEach((input) =>
    input.addEventListener("input", () => {
      playGameSound("ui", "tap");
      updateSlotsAdvice();
    }),
  );
  elements.slotSpinButton.addEventListener("click", () => {
    playGameSound("slots", "spin");
    state.slotSpinSeed = Math.floor(Math.random() * 100000);
    elements.slotReels.classList.add("is-spinning");
    window.setTimeout(() => elements.slotReels.classList.remove("is-spinning"), 520);
    updateSlotsAdvice(true);
  });
  updateSlotsAdvice();
}

function updateSlotsAdvice(playResultSound = false) {
  const plan = Core.slotsPlan(elements.slotBankroll.value, elements.slotBet.value, elements.slotRtp.value, elements.slotVolatility.value);
  elements.slotsAdvice.innerHTML = `<strong>${plan.spins} spins before the bankroll is gone.</strong><br>At ${Number(elements.slotRtp.value).toFixed(1)}% RTP, the long-run expected loss over that many spins is about $${plan.expectedLoss.toFixed(2)}. For ${elements.slotVolatility.value} volatility, consider a stop-loss near $${plan.stopLoss.toFixed(0)} and a win goal near $${plan.winGoal.toFixed(0)}.`;
  renderSlotVisual(plan);
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

function renderSlotVisual(plan) {
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

  elements.slotReels.innerHTML = reelSymbols.map((label, index) => renderSlotSymbol(label, index)).join("");
  elements.slotSpinMeter.textContent = `${plan.spins} spins`;
  elements.slotLossMeter.textContent = `$${plan.expectedLoss.toFixed(2)} expected loss`;
  elements.slotStopMeter.textContent = `$${plan.stopLoss.toFixed(0)} stop`;
  elements.slotBetBadge.textContent = `$${Number(elements.slotBet.value || 0).toFixed(2)}`;
  updateSlotBonusMeters(reelSymbols, playResultSound);
  elements.slotGrandMeter.textContent = `$${Math.max(5000, plan.winGoal * 250).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  elements.slotMajorMeter.textContent = `$${Math.max(1000, plan.winGoal * 50).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  elements.slotMinorMeter.textContent = `$${Math.max(100, plan.stopLoss * 4).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  elements.slotMiniMeter.textContent = `$${Math.max(25, plan.stopLoss).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function updateSlotBonusMeters(symbols, playResultSound = false) {
  const counts = symbols.reduce((summary, symbol) => {
    summary[symbol] = (summary[symbol] || 0) + 1;
    return summary;
  }, {});

  const freeThrowCount = counts["bonus-free"] || 0;
  const heatCount = (counts["fire-seven"] || 0) + (counts.wild || 0);
  const champCount = (counts.ring || 0) + (counts.trophy || 0) + (counts["jackpot-hoop"] || 0);
  setSlotPot(elements.slotFreeThrowPot, freeThrowCount, 3);
  setSlotPot(elements.slotHeatCheckPot, heatCount, 4);
  setSlotPot(elements.slotChampionshipPot, champCount, 5);

  const bonusTotal = freeThrowCount + heatCount + (counts["jackpot-hoop"] || 0);
  elements.slotBonusMeter.textContent =
    bonusTotal >= 3 ? `${bonusTotal} bonus symbols showing` : `${3 - bonusTotal} more to bonus`;
  if (playResultSound) {
    window.setTimeout(() => playGameSound("slots", bonusTotal >= 3 ? "bonus" : "stop"), 360);
  }
}

function setSlotPot(element, count, target) {
  const fill = Math.min(100, Math.round((count / target) * 100));
  element.style.setProperty("--pot-fill", `${fill}%`);
  element.querySelector("b").dataset.count = `${Math.min(count, target)}/${target}`;
  element.classList.toggle("is-full", count >= target);
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
  return `
    <span class="slot-reel ${className} ${featured ? "featured" : ""}">
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
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.warn("Service worker registration failed", error);
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
