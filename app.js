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
const SLOT_MAX_LINES = 20;
const SLOT_PAYLINES = [
  { label: "1", name: "Center row", rows: [2, 2, 2, 2, 2], kind: "row" },
  { label: "2", name: "Top row", rows: [0, 0, 0, 0, 0], kind: "row" },
  { label: "3", name: "Bottom row", rows: [4, 4, 4, 4, 4], kind: "row" },
  { label: "4", name: "Upper row", rows: [1, 1, 1, 1, 1], kind: "row" },
  { label: "5", name: "Lower row", rows: [3, 3, 3, 3, 3], kind: "row" },
  { label: "6", name: "V cut", rows: [0, 1, 2, 1, 0], kind: "zigzag" },
  { label: "7", name: "Inverted V", rows: [4, 3, 2, 3, 4], kind: "zigzag" },
  { label: "8", name: "Top diagonal", rows: [0, 1, 2, 3, 4], kind: "diagonal" },
  { label: "9", name: "Bottom diagonal", rows: [4, 3, 2, 1, 0], kind: "diagonal" },
  { label: "10", name: "Lightning high", rows: [1, 0, 1, 0, 1], kind: "zigzag" },
  { label: "11", name: "Lightning low", rows: [3, 4, 3, 4, 3], kind: "zigzag" },
  { label: "12", name: "Zig center high", rows: [2, 1, 0, 1, 2], kind: "zigzag" },
  { label: "13", name: "Zag center low", rows: [2, 3, 4, 3, 2], kind: "zigzag" },
  { label: "14", name: "Court bounce A", rows: [0, 2, 4, 2, 0], kind: "zigzag" },
  { label: "15", name: "Court bounce B", rows: [4, 2, 0, 2, 4], kind: "zigzag" },
  { label: "16", name: "Fast break A", rows: [1, 2, 3, 2, 1], kind: "zigzag" },
  { label: "17", name: "Fast break B", rows: [3, 2, 1, 2, 3], kind: "zigzag" },
  { label: "18", name: "Stair step high", rows: [0, 0, 1, 2, 2], kind: "zigzag" },
  { label: "19", name: "Stair step low", rows: [4, 4, 3, 2, 2], kind: "zigzag" },
  { label: "20", name: "Full court zig", rows: [2, 4, 0, 4, 2], kind: "zigzag" },
];
const SLOT_PAY_OUTCOMES = [
  { label: "No line win", multiplier: 0, chance: 0.61 },
  { label: "Single line hit", multiplier: 1, chance: 0.225 },
  { label: "Double line hit", multiplier: 2, chance: 0.085 },
  { label: "Diagonal line hit", multiplier: 3, chance: 0.018 },
  { label: "Full court line", multiplier: 5, chance: 0.036 },
  { label: "Wild streak", multiplier: 10, chance: 0.017 },
  { label: "Free throw feature", multiplier: 20, chance: 0.006 },
  { label: "Heat check feature", multiplier: 50, chance: 0.0015 },
  { label: "Progressive shot", multiplier: 100, chance: 0.0005 },
];
const SLOT_PROGRESSIVE_TIERS = {
  mini: { label: "Mini", drip: 0.03, boost: 0.12, chance: 0.55 },
  minor: { label: "Minor", drip: 0.015, boost: 0.22, chance: 0.28 },
  major: { label: "Major", drip: 0.006, boost: 0.65, chance: 0.13 },
  grand: { label: "Grand", drip: 0.002, boost: 1.4, chance: 0.04 },
};
const ROULETTE_BETS = {
  red: { label: "Red", type: "even", payout: 1 },
  black: { label: "Black", type: "even", payout: 1 },
  odd: { label: "Odd", type: "even", payout: 1 },
  even: { label: "Even", type: "even", payout: 1 },
  low: { label: "1 to 18", type: "even", payout: 1 },
  high: { label: "19 to 36", type: "even", payout: 1 },
  dozen1: { label: "1st 12", type: "dozen", payout: 2 },
  dozen2: { label: "2nd 12", type: "dozen", payout: 2 },
  dozen3: { label: "3rd 12", type: "dozen", payout: 2 },
  column1: { label: "Column 1", type: "column", payout: 2 },
  column2: { label: "Column 2", type: "column", payout: 2 },
  column3: { label: "Column 3", type: "column", payout: 2 },
  sixLine1: { label: "1-6", type: "sixLine", payout: 5 },
  corner1: { label: "1/2/4/5", type: "corner", payout: 8 },
  street1: { label: "1-2-3", type: "street", payout: 11 },
  split1: { label: "1/2", type: "split", payout: 17 },
  straight17: { label: "17", type: "straight", payout: 35 },
};
const BIG_WHEEL_SEGMENTS = {
  one: { label: "$1", payout: 1, stopAngle: 17.5 },
  two: { label: "$2", payout: 2, stopAngle: 65.5 },
  five: { label: "$5", payout: 5, stopAngle: 122 },
  ten: { label: "$10", payout: 10, stopAngle: 178 },
  twenty: { label: "$20", payout: 20, stopAngle: 238 },
  joker: { label: "Joker", payout: 40, stopAngle: 297 },
  logo: { label: "Logo", payout: 40, stopAngle: 343 },
};
const ROULETTE_RED_NUMBERS = new Set(["1", "3", "5", "7", "9", "12", "14", "16", "18", "19", "21", "23", "25", "27", "30", "32", "34", "36"]);
const ROULETTE_WHEEL_POCKETS = {
  european: ["0", "32", "15", "19", "4", "21", "2", "25", "17", "34", "6", "27", "13", "36", "11", "30", "8", "23", "10", "5", "24", "16", "33", "1", "20", "14", "31", "9", "22", "18", "29", "7", "28", "12", "35", "3", "26"],
  american: ["0", "28", "9", "26", "30", "11", "7", "20", "32", "17", "5", "22", "34", "15", "3", "24", "36", "13", "1", "00", "27", "10", "25", "29", "12", "8", "19", "31", "18", "6", "21", "33", "16", "4", "23", "35", "14", "2"],
};
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
    bonusKeys: ["freeThrows"],
    randomizerChance: 0.035,
    randomizerSymbol: "bonus-free",
  },
  heatCheck: {
    target: 5,
    label: "Heat Check Pot",
    collectors: ["fire-seven", "wild"],
    bonusKeys: ["heatCheck"],
    randomizerChance: 0.018,
    randomizerSymbol: "fire-seven",
  },
  championship: {
    target: 4,
    label: "Championship Pot",
    collectors: ["ring", "jackpot-hoop"],
    bonusKeys: ["hoopJackpot"],
    randomizerChance: 0.006,
    randomizerSymbol: "jackpot-hoop",
  },
};
const VIDEO_POKER_VARIANTS = {
  jacksOrBetter: {
    label: "Jacks or Better",
    subtitle: "Classic 9/6 hold helper",
    includeJoker: false,
    defaults: [
      ["A", "♠"],
      ["K", "♠"],
      ["Q", "♠"],
      ["J", "♠"],
      ["10", "♠"],
    ],
    paytableNote: "The max-credit royal flush line is the red 4000-credit jackpot column.",
    rows: [
      ["Royal Flush", [250, 500, 750, 1000, 4000]],
      ["Straight Flush", [50, 100, 150, 200, 250]],
      ["4 of a Kind", [25, 50, 75, 100, 125]],
      ["Full House", [9, 18, 27, 36, 45]],
      ["Flush", [6, 12, 18, 24, 30]],
      ["Straight", [4, 8, 12, 16, 20]],
      ["3 of a Kind", [3, 6, 9, 12, 15]],
      ["Two Pair", [2, 4, 6, 8, 10]],
      ["Jacks or Better", [1, 2, 3, 4, 5]],
    ],
  },
  jokersWild: {
    label: "Jokers Wild",
    subtitle: "Wild joker, kings-or-better style",
    includeJoker: true,
    defaults: [
      ["Joker", "★"],
      ["K", "♠"],
      ["K", "♥"],
      ["9", "♦"],
      ["4", "♣"],
    ],
    paytableNote: "The joker works as a wild card, so five of a kind and joker royal lines become part of the game.",
    rows: [
      ["Natural Royal", [500, 1000, 1500, 2000, 4000]],
      ["Five of a Kind", [200, 400, 600, 800, 1000]],
      ["Joker Royal", [100, 200, 300, 400, 500]],
      ["Straight Flush", [50, 100, 150, 200, 250]],
      ["4 of a Kind", [20, 40, 60, 80, 100]],
      ["Full House", [7, 14, 21, 28, 35]],
      ["Flush", [5, 10, 15, 20, 25]],
      ["Straight", [3, 6, 9, 12, 15]],
      ["3 of a Kind", [2, 4, 6, 8, 10]],
      ["Kings or Better", [1, 2, 3, 4, 5]],
    ],
  },
  deucesWild: {
    label: "Deuces Wild",
    subtitle: "All 2s are wild",
    includeJoker: false,
    defaults: [
      ["2", "♠"],
      ["2", "♥"],
      ["A", "♠"],
      ["K", "♠"],
      ["7", "♦"],
    ],
    paytableNote: "Any 2 is wild. The helper favors protecting deuces before chasing ordinary pairs.",
    rows: [
      ["Natural Royal", [800, 1600, 2400, 3200, 4000]],
      ["Four Deuces", [200, 400, 600, 800, 1000]],
      ["Wild Royal", [25, 50, 75, 100, 125]],
      ["Five of a Kind", [15, 30, 45, 60, 75]],
      ["Straight Flush", [9, 18, 27, 36, 45]],
      ["4 of a Kind", [5, 10, 15, 20, 25]],
      ["Full House", [3, 6, 9, 12, 15]],
      ["Flush", [2, 4, 6, 8, 10]],
      ["Straight", [2, 4, 6, 8, 10]],
      ["3 of a Kind", [1, 2, 3, 4, 5]],
    ],
  },
  doubleBonus: {
    label: "Double Bonus Poker",
    subtitle: "Bonus-heavy quads strategy",
    includeJoker: false,
    defaults: [
      ["A", "♠"],
      ["A", "♥"],
      ["7", "♠"],
      ["4", "♦"],
      ["9", "♣"],
    ],
    paytableNote: "Double Bonus gives extra weight to four aces and other quads, so the helper protects more made pairs.",
    rows: [
      ["Royal Flush", [250, 500, 750, 1000, 4000]],
      ["Straight Flush", [50, 100, 150, 200, 250]],
      ["4 Aces", [160, 320, 480, 640, 800]],
      ["4 2s, 3s, or 4s", [80, 160, 240, 320, 400]],
      ["4 5s thru Kings", [50, 100, 150, 200, 250]],
      ["Full House", [9, 18, 27, 36, 45]],
      ["Flush", [7, 14, 21, 28, 35]],
      ["Straight", [5, 10, 15, 20, 25]],
      ["3 of a Kind", [3, 6, 9, 12, 15]],
      ["Two Pair", [1, 2, 3, 4, 5]],
      ["Jacks or Better", [1, 2, 3, 4, 5]],
    ],
  },
};
const CRAPS_BET_LABELS = {
  passLine: "Pass Line",
  dontPass: "Don't Pass",
  dontCome: "Don't Come",
  come: "Come",
  field: "Field",
  big6: "Big 6",
  big8: "Big 8",
  place4: "Place 4",
  place5: "Place 5",
  place6: "Place 6",
  place8: "Place 8",
  place9: "Place 9",
  place10: "Place 10",
  hardways: "Hardways",
  hard8: "Hard 8",
  anySeven: "Any 7",
  craps3: "Craps 3",
  aces: "Aces",
  boxcars: "Boxcars",
  yo: "Yo 11",
  anyCraps: "Any Craps",
};

const state = {
  db: null,
  game: "powerball",
  draws: [],
  deferredInstallPrompt: null,
  videoPokerVariant: "jacksOrBetter",
  videoPokerHeldIndexes: null,
  crapsBets: {},
  crapsBetAnchors: {},
  slotSpinSeed: 0,
  slotSpinning: false,
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
  slotProgressives: null,
  slotLastProgressiveChanges: [],
  rouletteBet: 0,
  rouletteNet: 0,
  bigWheelBet: 0,
  bigWheelNet: 0,
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
  playTypeBox: $("#playTypeBox"),
  activePlayTypeLabel: $("#activePlayTypeLabel"),
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
  videoPokerVariant: $("#videoPokerVariant"),
  videoPokerTitle: $("#videoPokerTitle"),
  videoPokerSubtitle: $("#videoPokerSubtitle"),
  videoPokerVariantNote: $("#videoPokerVariantNote"),
  videoPokerHandGraphic: $("#videoPokerHandGraphic"),
  videoPokerHoldGraphic: $("#videoPokerHoldGraphic"),
  videoPokerMachineMessage: $("#videoPokerMachineMessage"),
  videoPokerPaytable: $("#videoPokerPaytable"),
  videoPokerDealButton: $("#videoPokerDealButton"),
  videoPokerDrawButton: $("#videoPokerDrawButton"),
  videoPokerMachineDrawButton: $("#videoPokerMachineDrawButton"),
  crapsAdvice: $("#crapsAdvice"),
  crapsTableGraphic: $("#crapsTableGraphic"),
  crapsPointMarker: $("#crapsPointMarker"),
  crapsActionChip: $("#crapsActionChip"),
  crapsPoint: $("#crapsPoint"),
  crapsBankroll: $("#crapsBankroll"),
  crapsUnit: $("#crapsUnit"),
  crapsRollButton: $("#crapsRollButton"),
  crapsClearBetsButton: $("#crapsClearBetsButton"),
  threeCardCards: $("#threeCardCards"),
  threeCardAdvice: $("#threeCardAdvice"),
  threeCardHandGraphic: $("#threeCardHandGraphic"),
  threeCardActionGraphic: $("#threeCardActionGraphic"),
  threeCardDealButton: $("#threeCardDealButton"),
  slotsAdvice: $("#slotsAdvice"),
  slotReels: $("#slotReels"),
  slotPaylines: $("#slotPaylines"),
  slotLineLabelsLeft: $("#slotLineLabelsLeft"),
  slotLineLabelsRight: $("#slotLineLabelsRight"),
  slotLineSummary: $("#slotLineSummary"),
  slotLines: $("#slotLines"),
  slotLinesValue: $("#slotLinesValue"),
  slotMaxLinesButton: $("#slotMaxLinesButton"),
  slotSpinButton: $("#slotSpinButton"),
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
  rouletteAdvice: $("#rouletteAdvice"),
  rouletteWheel: $("#rouletteWheel"),
  roulettePocketRing: $("#roulettePocketRing"),
  rouletteResult: $("#rouletteResult"),
  rouletteLayout: $("#rouletteLayout"),
  rouletteWheelType: $("#rouletteWheelType"),
  rouletteBetType: $("#rouletteBetType"),
  rouletteBetTarget: $("#rouletteBetTarget"),
  rouletteUnit: $("#rouletteUnit"),
  roulettePlaceBetButton: $("#roulettePlaceBetButton"),
  rouletteSpinButton: $("#rouletteSpinButton"),
  rouletteClearBetButton: $("#rouletteClearBetButton"),
  rouletteBetLedger: $("#rouletteBetLedger"),
  rouletteWinLossField: $("#rouletteWinLossField"),
  bigWheelAdvice: $("#bigWheelAdvice"),
  bigWheelGraphic: $("#bigWheelGraphic"),
  bigWheelResult: $("#bigWheelResult"),
  bigWheelSegment: $("#bigWheelSegment"),
  bigWheelUnit: $("#bigWheelUnit"),
  bigWheelPlaceBetButton: $("#bigWheelPlaceBetButton"),
  bigWheelSpinButton: $("#bigWheelSpinButton"),
  bigWheelClearBetButton: $("#bigWheelClearBetButton"),
  bigWheelBetLedger: $("#bigWheelBetLedger"),
  bigWheelWinLossField: $("#bigWheelWinLossField"),
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
    roulette: () => playToneSequence(context, now, [294, 370, 440, 554], 0.04, "sine", 0.024),
    bigWheel: () => {
      scheduleNoise(context, now, 0.12, 0.018, 1800);
      playToneSequence(context, now + 0.04, [220, 277, 330], 0.052, "triangle", 0.026);
    },
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
      collapsePlayTypeBox();
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
      showView("strategyView");
      showStrategy(button.dataset.strategy);
      collapsePlayTypeBox();
    });
  });
}

function showView(viewId) {
  $$(".tab-button").forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
  $$(".view").forEach((item) => item.classList.toggle("active", item.id === viewId));
  updatePlayTypeLabel();
}

function showStrategy(strategyId) {
  $$(".sub-tab").forEach((item) => item.classList.toggle("active", item.dataset.strategy === strategyId));
  $$(".strategy-panel").forEach((item) => item.classList.toggle("active", item.id === strategyId));
  updatePlayTypeLabel();
}

function updatePlayTypeLabel() {
  if (!elements.activePlayTypeLabel) return;
  const activeView = $(".tab-button.active")?.textContent.trim() || "Lottery Lab";
  const strategyViewActive = $("#strategyView")?.classList.contains("active");
  const activeStrategy = $(".sub-tab.active")?.textContent.trim();
  elements.activePlayTypeLabel.textContent = strategyViewActive && activeStrategy ? activeStrategy : activeView;
}

function collapsePlayTypeBox() {
  if (elements.playTypeBox) elements.playTypeBox.open = false;
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

function shuffledDeck(includeJoker = false) {
  const deck = SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit, value: RANK_VALUE[rank] })));
  if (includeJoker) deck.push({ rank: "Joker", suit: "★", value: 0 });
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}

function randomCards(count, includeJoker = false) {
  return shuffledDeck(includeJoker).slice(0, count);
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
  renderVideoPokerCardPicker();
  renderCardPicker(elements.threeCardCards, 3, "tc", [
    ["Q", "♠"],
    ["6", "♥"],
    ["4", "♦"],
  ]);

  elements.videoPokerCards.addEventListener("change", () => {
    state.videoPokerHeldIndexes = null;
    playGameSound("videoPoker", "card");
    updateVideoPokerAdvice();
  });
  elements.videoPokerVariant.addEventListener("change", () => {
    setVideoPokerVariant(elements.videoPokerVariant.value, true);
  });
  elements.videoPokerHandGraphic.addEventListener("click", (event) => {
    const cardButton = event.target.closest("[data-video-poker-card]");
    if (!cardButton) return;
    toggleVideoPokerHold(Number(cardButton.dataset.videoPokerCard));
  });
  elements.threeCardCards.addEventListener("change", () => {
    playGameSound("threeCard", "card");
    updateThreeCardAdvice();
  });
  elements.videoPokerDealButton.addEventListener("click", () => dealVideoPokerHand());
  elements.videoPokerDrawButton.addEventListener("click", () => drawVideoPokerHand());
  elements.videoPokerMachineDrawButton.addEventListener("click", () => drawVideoPokerHand());
  $("[data-video-poker-control='help']").addEventListener("click", () => showVideoPokerHelp());
  $("[data-video-poker-control='games']").addEventListener("click", () => openVideoPokerGameMenu());
  $("[data-video-poker-control='pays']").addEventListener("click", () => showVideoPokerPays());
  $("[data-video-poker-control='bet']").addEventListener("click", () => setVideoPokerBet());
  $("[data-video-poker-control='cashout']").addEventListener("click", () => cashOutVideoPoker());
  elements.threeCardDealButton.addEventListener("click", () => dealThreeCardHand());
  setVideoPokerVariant(state.videoPokerVariant, false);
  updateVideoPokerAdvice();
  updateThreeCardAdvice();
}

function renderCardPicker(container, count, prefix, defaults) {
  const includeJoker = prefix === "vp" && currentVideoPokerProfile().includeJoker;
  const ranks = includeJoker ? ["Joker", ...RANKS] : RANKS;
  const suits = includeJoker ? ["★", ...SUITS] : SUITS;
  container.innerHTML = Array.from({ length: count }, (_, index) => {
    const [defaultRank, defaultSuit] = defaults[index] || ["A", "♠"];
    const rankOptions = ranks.map(
      (rank) => `<option value="${rank}" ${rank === defaultRank ? "selected" : ""}>${rank}</option>`,
    ).join("");
    const suitOptions = suits.map(
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
    const rank = rankSelect.value;
    const suit = rank === "Joker" ? "★" : suitSelect.value === "★" ? "♠" : suitSelect.value;
    return { rank, suit, value: RANK_VALUE[rank] || 0 };
  });
}

function currentVideoPokerProfile() {
  return VIDEO_POKER_VARIANTS[state.videoPokerVariant] || VIDEO_POKER_VARIANTS.jacksOrBetter;
}

function renderVideoPokerCardPicker() {
  renderCardPicker(elements.videoPokerCards, 5, "vp", currentVideoPokerProfile().defaults);
}

function setVideoPokerVariant(variant, refreshCards = true) {
  state.videoPokerVariant = VIDEO_POKER_VARIANTS[variant] ? variant : "jacksOrBetter";
  const profile = currentVideoPokerProfile();
  elements.videoPokerVariant.value = state.videoPokerVariant;
  elements.videoPokerTitle.textContent = `${profile.label} Hold Helper`;
  elements.videoPokerSubtitle.textContent = profile.subtitle;
  elements.videoPokerVariantNote.textContent = profile.subtitle;
  elements.videoPokerPaytable.setAttribute("aria-label", `${profile.label} paytable`);
  renderVideoPokerPaytable();
  if (refreshCards) {
    renderVideoPokerCardPicker();
    state.videoPokerHeldIndexes = null;
    playGameSound("ui", "tap");
  }
  updateVideoPokerAdvice();
}

function renderVideoPokerPaytable() {
  const rows = currentVideoPokerProfile().rows;
  const labels = rows.map(([label]) => `<span>${label}</span>`).join("");
  const columns = [0, 1, 2, 3, 4]
    .map(
      (column) => `
        <div class="vp-pay-col ${column === 4 ? "max-bet" : ""}">
          ${rows.map(([, pays]) => `<span>${pays[column]}</span>`).join("")}
        </div>
      `,
    )
    .join("");
  elements.videoPokerPaytable.innerHTML = `<div class="vp-pay-labels">${labels}</div>${columns}`;
}

function updateVideoPokerAdvice() {
  const cards = getCards(elements.videoPokerCards, "vp");
  if (Core.hasDuplicateCards(cards)) {
    state.videoPokerHeldIndexes = null;
    renderVideoPokerScreen(cards, { title: "Duplicate card", detail: "" });
    elements.videoPokerAdvice.innerHTML =
      "<strong>Choose five unique cards.</strong><br>The same card cannot appear twice in a real hand.";
    return;
  }
  const result = Core.videoPokerHold(cards, state.videoPokerVariant);
  const recommendedHoldIndexes = videoPokerHoldIndexes(cards, result);
  const holdIndexes = state.videoPokerHeldIndexes || recommendedHoldIndexes;
  renderVideoPokerScreen(cards, result, holdIndexes);
  elements.videoPokerAdvice.innerHTML = `<strong>${currentVideoPokerProfile().label}: ${result.title}</strong><br>${result.detail}${state.videoPokerHeldIndexes ? `<br>Selected holds: ${formatVideoPokerHoldSelection(cards, holdIndexes)}.` : ""}`;
}

function dealVideoPokerHand() {
  setCardPickerCards(elements.videoPokerCards, "vp", randomCards(5, currentVideoPokerProfile().includeJoker));
  state.videoPokerHeldIndexes = null;
  playGameSound("videoPoker", "card");
  updateVideoPokerAdvice();
}

function drawVideoPokerHand() {
  const cards = getCards(elements.videoPokerCards, "vp");
  if (Core.hasDuplicateCards(cards)) return;
  const holdIndexes = state.videoPokerHeldIndexes || videoPokerHoldIndexes(cards, Core.videoPokerHold(cards, state.videoPokerVariant));
  const originalCardKeys = new Set(cards.map(cardKey));
  const replacementCards = shuffledDeck(currentVideoPokerProfile().includeJoker).filter((card) => !originalCardKeys.has(cardKey(card)));
  let replacementIndex = 0;
  const drawnCards = cards.map((card, index) => {
    if (holdIndexes.has(index)) return card;
    const replacement = replacementCards[replacementIndex];
    replacementIndex += 1;
    return replacement;
  });

  setCardPickerCards(elements.videoPokerCards, "vp", drawnCards);
  state.videoPokerHeldIndexes = null;
  playGameSound("videoPoker", "card");
  updateVideoPokerAdvice();
  elements.videoPokerMachineMessage.textContent = "Draw Complete";
  elements.videoPokerAdvice.innerHTML += `<br>Draw replaced ${cards.length - holdIndexes.size} card${cards.length - holdIndexes.size === 1 ? "" : "s"}.`;
}

function showVideoPokerHelp() {
  playGameSound("ui", "tap");
  elements.videoPokerMachineMessage.textContent = "Pick Holds";
  elements.videoPokerAdvice.innerHTML =
    "<strong>Video poker help.</strong><br>Deal a hand, tap cards to toggle HOLD, then press Draw to replace every unheld card.";
}

function openVideoPokerGameMenu() {
  playGameSound("ui", "tap");
  const variants = Object.keys(VIDEO_POKER_VARIANTS);
  const nextIndex = (variants.indexOf(state.videoPokerVariant) + 1) % variants.length;
  setVideoPokerVariant(variants[nextIndex], true);
  elements.videoPokerMachineMessage.textContent = "More Games";
  elements.videoPokerAdvice.innerHTML = `<strong>${currentVideoPokerProfile().label} selected.</strong><br>${currentVideoPokerProfile().subtitle}. Use the game selector above for a specific video poker profile.`;
}

function showVideoPokerPays() {
  playGameSound("ui", "tap");
  elements.videoPokerPaytable.classList.toggle("is-highlighted");
  elements.videoPokerMachineMessage.textContent = elements.videoPokerPaytable.classList.contains("is-highlighted")
    ? "Paytable"
    : "Play 5 Credits";
  elements.videoPokerAdvice.innerHTML =
    `<strong>${currentVideoPokerProfile().label} pays.</strong><br>${currentVideoPokerProfile().paytableNote}`;
}

function setVideoPokerBet() {
  playGameSound("blackjack", "chip");
  elements.videoPokerMachineMessage.textContent = "Bet 5 Credits";
  elements.videoPokerAdvice.innerHTML =
    `<strong>Bet set to 5 credits.</strong><br>The helper assumes max-coin ${currentVideoPokerProfile().label} so the top award line is represented properly.`;
}

function cashOutVideoPoker() {
  playGameSound("ui", "tap");
  state.videoPokerHeldIndexes = null;
  elements.videoPokerMachineMessage.textContent = "Cash Out";
  elements.videoPokerAdvice.innerHTML =
    "<strong>Cash out noted.</strong><br>This trainer does not track real money here, so the cash meter stays at $0.00.";
}

function cardKey(card) {
  return `${card.rank}${card.suit}`;
}

function renderVideoPokerScreen(cards, result, holdIndexes = videoPokerHoldIndexes(cards, result)) {
  elements.videoPokerHoldGraphic.innerHTML = cards
    .map((_, index) => `<span class="${holdIndexes.has(index) ? "is-held" : ""}">Hold</span>`)
    .join("");
  elements.videoPokerHandGraphic.innerHTML = cards
    .map((card, index) => renderVideoPokerCard(card, holdIndexes.has(index), index))
    .join("");
  elements.videoPokerMachineMessage.textContent =
    result.title === "Duplicate card" ? "Duplicate Card" : result.title.replace("Hold all five", "Play 5 Credits");
}

function toggleVideoPokerHold(index) {
  const cards = getCards(elements.videoPokerCards, "vp");
  if (Core.hasDuplicateCards(cards)) return;

  const currentHolds =
    state.videoPokerHeldIndexes || videoPokerHoldIndexes(cards, Core.videoPokerHold(cards, state.videoPokerVariant));
  const nextHolds = new Set(currentHolds);
  if (nextHolds.has(index)) {
    nextHolds.delete(index);
  } else {
    nextHolds.add(index);
  }

  state.videoPokerHeldIndexes = nextHolds;
  playGameSound("videoPoker", "card");
  updateVideoPokerAdvice();
}

function formatVideoPokerHoldSelection(cards, holdIndexes) {
  const heldCards = cards.filter((_, index) => holdIndexes.has(index));
  return heldCards.length ? heldCards.map((card) => `${card.rank}${card.suit}`).join(", ") : "none";
}

function videoPokerHoldIndexes(cards, result) {
  if (Array.isArray(result?.holds)) return new Set(result.holds);
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
  elements.crapsTableGraphic.querySelectorAll("[data-craps-bet]").forEach((zone) => {
    const label = CRAPS_BET_LABELS[zone.dataset.crapsBet] || "craps bet";
    const matchingZones = Array.from(elements.crapsTableGraphic.querySelectorAll(`[data-craps-bet="${zone.dataset.crapsBet}"]`));
    zone.dataset.crapsBetZone = `${zone.dataset.crapsBet}-${matchingZones.indexOf(zone)}`;
    zone.setAttribute("role", "button");
    zone.setAttribute("tabindex", "0");
    zone.setAttribute("aria-label", `Place chip on ${label}`);
  });
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
  elements.crapsClearBetsButton.addEventListener("click", () => clearCrapsBets());
  elements.crapsTableGraphic.addEventListener("click", (event) => {
    const betZone = event.target.closest("[data-craps-bet]");
    if (!betZone || !elements.crapsTableGraphic.contains(betZone)) return;
    placeCrapsBet(betZone.dataset.crapsBet, betZone);
  });
  elements.crapsTableGraphic.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const betZone = event.target.closest("[data-craps-bet]");
    if (!betZone || !elements.crapsTableGraphic.contains(betZone)) return;
    event.preventDefault();
    placeCrapsBet(betZone.dataset.crapsBet, betZone);
  });
  updateCrapsAdvice();
}

function updateCrapsAdvice(rollNote = "") {
  const plan = Core.crapsPlan(elements.crapsPoint.value, elements.crapsBankroll.value, elements.crapsUnit.value);
  const betSummary = formatCrapsBetSummary();
  elements.crapsAdvice.innerHTML = `<strong>${plan.maxUnits} base units available.</strong><br>${rollNote ? `${rollNote}<br>` : ""}${betSummary ? `${betSummary}<br>` : ""}${plan.detail}<br>Suggested stop-loss: ${plan.stopLossUnits} units.`;
  elements.crapsPointMarker.textContent = elements.crapsPoint.value === "none" ? "Off" : elements.crapsPoint.value;
  elements.crapsPointMarker.classList.toggle("is-on", elements.crapsPoint.value !== "none");
  elements.crapsTableGraphic.dataset.point = elements.crapsPoint.value;
  elements.crapsActionChip.querySelector("strong").textContent = plan.maxUnits;
}

function placeCrapsBet(betKey, betZone) {
  const unit = Math.max(1, Number(elements.crapsUnit.value) || 1);
  const currentTotal = Object.values(state.crapsBets).reduce((sum, value) => sum + value, 0);
  const bankroll = Math.max(0, Number(elements.crapsBankroll.value) || 0);
  if (currentTotal + unit > bankroll) {
    updateCrapsAdvice(`Bankroll limit reached. Clear bets or raise the session bankroll to place more chips.`);
    return;
  }

  state.crapsBets[betKey] = (state.crapsBets[betKey] || 0) + unit;
  state.crapsBetAnchors[betKey] = betZone?.dataset.crapsBetZone || state.crapsBetAnchors[betKey];
  renderCrapsBets();
  playGameSound("blackjack", "chip");
  updateCrapsAdvice(`Placed ${formatMoney(unit)} on ${CRAPS_BET_LABELS[betKey] || "the layout"}.`);
}

function clearCrapsBets() {
  state.crapsBets = {};
  state.crapsBetAnchors = {};
  renderCrapsBets();
  playGameSound("ui", "tap");
  updateCrapsAdvice("Cleared the table layout.");
}

function renderCrapsBets() {
  elements.crapsTableGraphic.querySelectorAll(".craps-bet-chip").forEach((chip) => chip.remove());
  Object.entries(state.crapsBets).forEach(([betKey, amount]) => {
    if (amount <= 0) return;
    const zones = elements.crapsTableGraphic.querySelectorAll(`[data-craps-bet="${betKey}"]`);
    const targetZone =
      elements.crapsTableGraphic.querySelector(`[data-craps-bet-zone="${state.crapsBetAnchors[betKey]}"]`) || zones[0];
    if (!targetZone) return;
    const chip = document.createElement("span");
    chip.className = "craps-bet-chip";
    chip.textContent = formatMoney(amount);
    chip.setAttribute("aria-label", `${formatMoney(amount)} on ${CRAPS_BET_LABELS[betKey] || "bet"}`);
    targetZone.appendChild(chip);
  });
}

function formatCrapsBetSummary() {
  const entries = Object.entries(state.crapsBets).filter(([, amount]) => amount > 0);
  if (!entries.length) return "Tap the craps layout to place one base-unit chip on a bet.";
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
  const labels = entries
    .slice(0, 3)
    .map(([betKey, amount]) => `${CRAPS_BET_LABELS[betKey] || betKey} ${formatMoney(amount)}`)
    .join(" · ");
  return `On table: ${formatMoney(total)} (${labels}${entries.length > 3 ? " · more" : ""}).`;
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
  [elements.slotBankroll, elements.slotBet, elements.slotLines, elements.slotRtp, elements.slotVolatility].forEach((input) =>
    input.addEventListener("input", () => {
      playGameSound("ui", "tap");
      state.slotVisibleSymbols = [];
      if (input === elements.slotBankroll) resetSlotSessionFromInputs();
      updateSlotsAdvice();
    }),
  );
  elements.slotMaxLinesButton.addEventListener("click", () => {
    elements.slotLines.value = String(SLOT_MAX_LINES);
    state.slotVisibleSymbols = [];
    playGameSound("ui", "tap");
    updateSlotsAdvice();
  });
  elements.slotSpinButton.addEventListener("click", () => startSlotSpin());
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

function startSlotSpin() {
  if (state.slotSpinning) return;
  if (state.slotCredits < currentSlotBet()) {
    elements.slotBonusMeter.textContent = "Add credits";
    resetSlotSessionFromInputs();
    updateSlotsAdvice();
    return;
  }

  hideSlotBonusScreen();
  state.slotSpinning = true;
  playGameSound("slots", "spin");
  elements.slotSpinButton.disabled = true;
  elements.slotSpinButton.querySelector("span").textContent = "Spin...";
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
  state.slotVisibleSymbols = buildSlotReelSymbols(currentSlotPlan());
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
  elements.slotSpinButton.querySelector("span").textContent = "Spin";
  state.slotSpinning = false;
}

function currentSlotBankroll() {
  return Math.max(0, Number(elements.slotBankroll.value) || 0);
}

function currentSlotPlan() {
  return Core.slotsPlan(elements.slotBankroll.value, currentSlotBet(), elements.slotRtp.value, elements.slotVolatility.value);
}

function currentSlotBet() {
  return roundMoney(currentSlotLineBet() * currentSlotLineCount());
}

function currentSlotLineBet() {
  return Math.max(0.25, Number(elements.slotBet.value) || 1);
}

function currentSlotLineCount() {
  return Math.max(1, Math.min(SLOT_MAX_LINES, Math.floor(Number(elements.slotLines.value) || SLOT_MAX_LINES)));
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatSignedMoney(value) {
  const numeric = Number(value || 0);
  return numeric < 0 ? `-${formatMoney(Math.abs(numeric))}` : formatMoney(numeric);
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
    state.slotProgressives = normalizeSlotProgressives(saved.progressives, currentSlotPlan());
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
        progressives: state.slotProgressives,
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
  state.slotProgressives = initialSlotProgressives(currentSlotPlan());
  state.slotLastProgressiveChanges = [];
  if (shouldSave) saveSlotSession();
}

function initialSlotProgressives(plan) {
  return {
    grand: roundMoney(Math.max(5000, plan.winGoal * 250)),
    major: roundMoney(Math.max(1000, plan.winGoal * 50)),
    minor: roundMoney(Math.max(100, plan.stopLoss * 4)),
    mini: roundMoney(Math.max(25, plan.stopLoss)),
  };
}

function normalizeSlotProgressives(saved, plan) {
  const base = initialSlotProgressives(plan);
  return Object.fromEntries(
    Object.keys(SLOT_PROGRESSIVE_TIERS).map((key) => {
      const savedValue = Number(saved?.[key]);
      return [key, roundMoney(Math.max(base[key], Number.isFinite(savedValue) ? savedValue : base[key]))];
    }),
  );
}

function syncSlotProgressives(plan) {
  state.slotProgressives = normalizeSlotProgressives(state.slotProgressives, plan);
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

    const nextValue = clampPotValue(state.slotPots[collection.key] + collection.increment, pot.target);
    state.slotPots[collection.key] = nextValue;
    events.push({ type: "advance", ...collection, label: pot.label, value: nextValue });
  });

  state.slotLastPotEvents = [...events, ...rollSlotBonusRandomizers()];
  saveSlotPots();
}

function rollSlotBonusRandomizers() {
  const volatilityScale = {
    low: 0.85,
    medium: 1,
    high: 1.25,
  };
  const scale = volatilityScale[elements.slotVolatility.value] || volatilityScale.medium;

  return Object.entries(SLOT_POTS).flatMap(([key, pot]) => {
    const chance = (pot.randomizerChance || 0) * scale;
    if (!chance || Math.random() > chance) return [];

    return [
      {
        type: "trigger",
        key,
        label: pot.label,
        symbol: pot.randomizerSymbol || pot.collectors?.[0] || "basketball",
        increment: 0,
        randomizer: true,
        bonus: rollSlotBonus(pot),
      },
    ];
  });
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
  advanceSlotProgressives(bet);
  saveSlotSession();
}

function advanceSlotProgressives(bet) {
  syncSlotProgressives(currentSlotPlan());
  const volatilityScale = { low: 0.82, medium: 1, high: 1.24 }[elements.slotVolatility.value] || 1;
  const featuredTier = rollProgressiveTier();

  state.slotLastProgressiveChanges = [featuredTier];
  Object.entries(SLOT_PROGRESSIVE_TIERS).forEach(([key, tier]) => {
    const baseDrip = Math.max(0.01, bet * tier.drip * volatilityScale);
    const boost = key === featuredTier ? Math.max(0.05, bet * tier.boost * volatilityScale) : 0;
    state.slotProgressives[key] = roundMoney((state.slotProgressives[key] || 0) + baseDrip + boost);
  });
}

function rollProgressiveTier() {
  const roll = Math.random();
  let cumulative = 0;
  return (
    Object.entries(SLOT_PROGRESSIVE_TIERS).find(([, tier]) => {
      cumulative += tier.chance;
      return roll <= cumulative;
    })?.[0] || "mini"
  );
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
  const lineCount = currentSlotLineCount();
  elements.slotsAdvice.innerHTML = `<strong>${plan.spins} spins before the bankroll is gone.</strong><br>${lineCount} active ${lineCount === 1 ? "line" : "lines"} at ${formatMoney(currentSlotLineBet())} per line makes each spin ${formatMoney(currentSlotBet())}. At ${Number(elements.slotRtp.value).toFixed(1)}% RTP, the long-run expected loss over that many spins is about ${formatMoney(plan.expectedLoss)}. For ${elements.slotVolatility.value} volatility, consider a stop-loss near ${formatMoney(plan.stopLoss)} and a win goal near ${formatMoney(plan.winGoal)}.`;
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

function renderVideoPokerCard(card, isHeld, index) {
  if (card.rank === "Joker") {
    return `
      <button class="vp-card joker ${isHeld ? "is-held" : ""}" type="button" data-video-poker-card="${index}" aria-pressed="${isHeld}" aria-label="${isHeld ? "Release" : "Hold"} Joker">
        <span class="vp-corner top">J<small>★</small></span>
        <span class="vp-card-art"><b class="vp-face">Joker</b></span>
        <span class="vp-corner bottom">J<small>★</small></span>
      </button>
    `;
  }
  const isRed = card.suit === "♥" || card.suit === "♦";
  const faceLabel = ["J", "Q", "K"].includes(card.rank) ? `<b class="vp-face">${card.rank}</b>` : `<b class="vp-pip">${card.suit}</b>`;
  return `
    <button class="vp-card ${isRed ? "red" : ""} ${isHeld ? "is-held" : ""}" type="button" data-video-poker-card="${index}" aria-pressed="${isHeld}" aria-label="${isHeld ? "Release" : "Hold"} ${card.rank}${card.suit}">
      <span class="vp-corner top">${card.rank}<small>${card.suit}</small></span>
      <span class="vp-card-art">${faceLabel}</span>
      <span class="vp-corner bottom">${card.rank}<small>${card.suit}</small></span>
    </button>
  `;
}

function renderSlotVisual(plan, playResultSound = false) {
  syncSlotProgressives(plan);
  const reelSymbols = state.slotVisibleSymbols.length ? state.slotVisibleSymbols : buildSlotReelSymbols();
  const lineCount = currentSlotLineCount();
  const lineBet = currentSlotLineBet();
  const totalBet = currentSlotBet();
  state.slotVisibleSymbols = reelSymbols;

  elements.slotReels.innerHTML = reelSymbols.map((label, index) => renderSlotSymbol(label, index)).join("");
  renderSlotPaylines();
  elements.slotLinesValue.textContent = String(lineCount);
  elements.slotLineSummary.textContent = `${lineCount} ${lineCount === 1 ? "Line" : "Lines"} · Progressive Hoops`;
  elements.slotSpinMeter.textContent = `${plan.spins} spins`;
  elements.slotCreditsMeter.textContent = `Credits ${formatMoney(state.slotCredits)}`;
  elements.slotWinMeter.textContent = `Win ${formatMoney(state.slotLastWin)}`;
  elements.slotLossMeter.textContent = `$${plan.expectedLoss.toFixed(2)} expected loss`;
  elements.slotStopMeter.textContent = `$${plan.stopLoss.toFixed(0)} stop`;
  elements.slotBetBadge.textContent = `${formatMoney(lineBet)} x ${lineCount} = ${formatMoney(totalBet)}`;
  updateSlotBonusMeters(playResultSound);
  renderSlotProgressives(playResultSound);
}

function activeSlotPaylines() {
  return SLOT_PAYLINES.slice(0, currentSlotLineCount());
}

function renderSlotPaylines() {
  const lines = activeSlotPaylines();
  elements.slotPaylines.innerHTML = lines
    .map((line, index) => {
      const points = line.rows.map((row, reelIndex) => `${10 + reelIndex * 20},${10 + row * 20}`).join(" ");
      return `<polyline points="${points}" class="${line.kind}" style="--line-index:${index};" />`;
    })
    .join("");

  const labels = lines.map((line, index) => `<span class="${line.kind}" style="--line-index:${index};">${line.label}</span>`).join("");
  elements.slotLineLabelsLeft.innerHTML = labels;
  elements.slotLineLabelsRight.innerHTML = labels;
}

function renderSlotProgressives(playResultSound = false) {
  const meters = {
    grand: elements.slotGrandMeter,
    major: elements.slotMajorMeter,
    minor: elements.slotMinorMeter,
    mini: elements.slotMiniMeter,
  };
  const changed = new Set(state.slotLastProgressiveChanges);

  Object.entries(meters).forEach(([key, meter]) => {
    meter.textContent = formatProgressiveMoney(state.slotProgressives[key]);
    const panel = meter.parentElement;
    panel?.classList.toggle("is-progressive-hit", playResultSound && changed.has(key));
    panel?.classList.toggle("is-grand-flash", playResultSound && key === "grand" && changed.has(key));
    if (playResultSound && changed.has(key)) {
      window.setTimeout(() => {
        panel?.classList.remove("is-progressive-hit", "is-grand-flash");
      }, key === "grand" ? 1600 : 950);
    }
  });

  if (playResultSound) state.slotLastProgressiveChanges = [];
}

function formatProgressiveMoney(value) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
    currentSlotLineCount() * 23 +
    Number(elements.slotRtp.value) * 11 +
    volatility.length +
    state.slotSpinSeed;

  const reelSymbols = Array.from({ length: 25 }, (_, index) => {
    const label = symbols[Math.abs(Math.floor(seed + index * 3 + index * index)) % symbols.length];
    return index === 12 && !symbols.includes("jackpot-hoop") ? "bonus-free" : label;
  });

  return reelSymbols;
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
  const iconScale = 0.88 + fill * 0.0022;
  const label = triggered ? "Bonus randomizer hit" : count >= target ? "Pool full" : "Pool building";
  element.style.setProperty("--pot-fill", `${fill}%`);
  element.style.setProperty("--pool-icon-scale", iconScale.toFixed(3));
  element.style.setProperty("--pool-icon-breathe-scale", (iconScale + 0.08).toFixed(3));
  element.style.setProperty("--pool-icon-pop-scale", (iconScale + 0.18).toFixed(3));
  element.querySelector("b").setAttribute("aria-label", label);
  const visibleValue = element.querySelector(".slot-pot-value");
  if (visibleValue) visibleValue.textContent = label;
  element.classList.toggle("is-full", triggered || count >= target);
  element.classList.toggle("is-triggered", triggered);
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

function setupRoulette() {
  [elements.rouletteWheelType, elements.rouletteBetType, elements.rouletteBetTarget, elements.rouletteUnit].forEach((input) => {
    const handleRouletteInput = () => {
      playGameSound("ui", "tap");
      if (input === elements.rouletteBetType) syncRouletteBetTargetFromType();
      if (input === elements.rouletteBetTarget) syncRouletteBetType();
      if (input === elements.rouletteWheelType) renderRouletteWheelNumbers();
      renderRouletteChips();
      updateRouletteAdvice();
      updateRouletteBetLedger();
    };
    input.addEventListener("input", handleRouletteInput);
    input.addEventListener("change", handleRouletteInput);
  });
  elements.rouletteLayout.addEventListener("click", (event) => {
    const target = event.target.closest("[data-bet]");
    if (!target) return;
    elements.rouletteBetTarget.value = target.dataset.bet;
    syncRouletteBetType();
    placeRouletteBet();
  });
  elements.roulettePlaceBetButton.addEventListener("click", () => placeRouletteBet());
  elements.rouletteSpinButton.addEventListener("click", () => spinRouletteWheel());
  elements.rouletteClearBetButton.addEventListener("click", () => clearRouletteBet());
  renderRouletteWheelNumbers();
  syncRouletteBetType();
  renderRouletteChips();
  updateRouletteBetLedger();
  updateRouletteWinLossField();
  updateRouletteAdvice();
}

function updateRouletteAdvice(resultText = "") {
  const selectedBet = currentRouletteBet();
  const plan = Core.roulettePlan(elements.rouletteWheelType.value, selectedBet.type);
  const unit = Math.max(1, Number(elements.rouletteUnit.value) || 1);
  const wagerText = state.rouletteBet
    ? `Active bet: ${selectedBet.label} for ${formatMoney(state.rouletteBet)}. Net: ${formatSignedMoney(state.rouletteNet)}.`
    : "Place a chip before spinning to resolve a roulette bet.";
  elements.rouletteAdvice.innerHTML = `<strong>${plan.action}: ${selectedBet.label}.</strong><br>${resultText ? `${resultText}<br>` : ""}${wagerText}<br>${plan.detail}<br>Hit rate: ${plan.hitRate.toFixed(1)}%. Payout: ${selectedBet.payout} to 1. House edge: ${plan.houseEdge.toFixed(2)}%. A ${formatMoney(unit)} unit is plenty for this volatility.`;
}

function syncRouletteBetType() {
  const bet = currentRouletteBet();
  elements.rouletteBetType.value = bet.type;
}

function syncRouletteBetTargetFromType() {
  const matchingKey = Object.entries(ROULETTE_BETS).find(([, bet]) => bet.type === elements.rouletteBetType.value)?.[0];
  if (matchingKey) elements.rouletteBetTarget.value = matchingKey;
}

function currentRouletteBet() {
  return ROULETTE_BETS[elements.rouletteBetTarget.value] || ROULETTE_BETS.red;
}

function placeRouletteBet() {
  const unit = Math.max(1, Number(elements.rouletteUnit.value) || 1);
  state.rouletteBet = roundMoney(state.rouletteBet + unit);
  playGameSound("blackjack", "chip");
  renderRouletteChips();
  updateRouletteBetLedger();
  updateRouletteWinLossField("Bet placed");
  updateRouletteAdvice("Chip placed.");
}

function clearRouletteBet() {
  state.rouletteBet = 0;
  playGameSound("ui", "tap");
  renderRouletteChips();
  updateRouletteBetLedger();
  updateRouletteWinLossField("No active bet");
  updateRouletteAdvice("Roulette bet cleared.");
}

function updateRouletteBetLedger() {
  const bet = currentRouletteBet();
  elements.rouletteBetLedger.textContent = state.rouletteBet
    ? `Bet ${formatMoney(state.rouletteBet)} on ${bet.label} · Net ${formatSignedMoney(state.rouletteNet)}`
    : `No roulette bet placed · Net ${formatSignedMoney(state.rouletteNet)}`;
  elements.rouletteBetLedger.classList.toggle("has-bet", state.rouletteBet > 0);
}

function updateRouletteWinLossField(label = "Win/Loss") {
  elements.rouletteWinLossField.textContent = `${label}: ${formatSignedMoney(state.rouletteNet)}`;
  elements.rouletteWinLossField.classList.toggle("is-positive", state.rouletteNet > 0);
  elements.rouletteWinLossField.classList.toggle("is-negative", state.rouletteNet < 0);
}

function renderRouletteChips() {
  const selectedKey = elements.rouletteBetTarget.value;
  elements.rouletteLayout.querySelectorAll("[data-bet]").forEach((target) => {
    const hasChip = state.rouletteBet > 0 && target.dataset.bet === selectedKey;
    target.classList.toggle("has-chip", hasChip);
    target.dataset.chip = hasChip ? formatMoney(state.rouletteBet) : "";
  });
}

function renderRouletteWheelNumbers() {
  const pockets = ROULETTE_WHEEL_POCKETS[elements.rouletteWheelType.value] || ROULETTE_WHEEL_POCKETS.european;
  elements.roulettePocketRing.innerHTML = pockets
    .map((pocket, index) => {
      const color = pocket === "0" || pocket === "00" ? "green" : ROULETTE_RED_NUMBERS.has(pocket) ? "red" : "black";
      return `<span class="${color}" style="--pocket-index:${index}; --pocket-count:${pockets.length};">${pocket}</span>`;
    })
    .join("");
}

function spinRouletteWheel() {
  const isAmerican = elements.rouletteWheelType.value === "american";
  const pockets = isAmerican
    ? ["0", "00", ...Array.from({ length: 36 }, (_, index) => String(index + 1))]
    : ["0", ...Array.from({ length: 36 }, (_, index) => String(index + 1))];
  const result = randomItem(pockets);
  const color = result === "0" || result === "00" ? "green" : ROULETTE_RED_NUMBERS.has(result) ? "red" : "black";

  elements.rouletteResult.textContent = result;
  elements.rouletteWheel.dataset.result = color;
  elements.rouletteWheel.classList.remove("is-spinning");
  void elements.rouletteWheel.offsetWidth;
  elements.rouletteWheel.classList.add("is-spinning");
  playGameSound("roulette", "spin");
  const resolution = resolveRouletteBet(result, color);
  updateRouletteBetLedger();
  updateRouletteWinLossField(rouletteResultLabel(resolution));
  updateRouletteAdvice(`Last spin: ${result} ${color}.${resolution ? ` ${resolution}` : ""}`);
}

function resolveRouletteBet(result, color) {
  if (!state.rouletteBet) return "No active bet was resolved.";
  const bet = currentRouletteBet();
  const won = rouletteBetWins(bet, result, color);
  const net = won ? state.rouletteBet * bet.payout : -state.rouletteBet;
  state.rouletteNet = roundMoney(state.rouletteNet + net);
  return won ? `${bet.label} wins ${formatMoney(net)}.` : `${bet.label} loses ${formatMoney(state.rouletteBet)}.`;
}

function rouletteResultLabel(resolution) {
  if (!resolution || resolution.includes("No active")) return "Win/Loss";
  return resolution.includes("wins") ? "Won" : "Lost";
}

function rouletteBetWins(bet, result, color) {
  const number = Number(result);
  if (!Number.isFinite(number) || number === 0) return false;
  if (bet.label === "Red") return color === "red";
  if (bet.label === "Black") return color === "black";
  if (bet.label === "Odd") return number % 2 === 1;
  if (bet.label === "Even") return number % 2 === 0;
  if (bet.label === "1 to 18") return number >= 1 && number <= 18;
  if (bet.label === "19 to 36") return number >= 19 && number <= 36;
  if (bet.label === "1st 12") return number >= 1 && number <= 12;
  if (bet.label === "2nd 12") return number >= 13 && number <= 24;
  if (bet.label === "3rd 12") return number >= 25 && number <= 36;
  if (bet.label === "Column 1") return number % 3 === 1;
  if (bet.label === "Column 2") return number % 3 === 2;
  if (bet.label === "Column 3") return number % 3 === 0;
  if (bet.label === "1-6") return number >= 1 && number <= 6;
  if (bet.label === "1/2/4/5") return [1, 2, 4, 5].includes(number);
  if (bet.label === "1-2-3") return number >= 1 && number <= 3;
  if (bet.label === "1/2") return number === 1 || number === 2;
  if (bet.label === "17") return number === 17;
  return false;
}

function setupBigWheel() {
  [elements.bigWheelSegment, elements.bigWheelUnit].forEach((input) =>
    input.addEventListener("input", () => {
      playGameSound("ui", "tap");
      updateBigWheelAdvice();
      updateBigWheelBetLedger();
    }),
  );
  elements.bigWheelPlaceBetButton.addEventListener("click", () => placeBigWheelBet());
  elements.bigWheelSpinButton.addEventListener("click", () => spinBigWheel());
  elements.bigWheelClearBetButton.addEventListener("click", () => clearBigWheelBet());
  updateBigWheelBetLedger();
  updateBigWheelWinLossField();
  updateBigWheelAdvice();
}

function updateBigWheelAdvice(resultText = "") {
  const plan = Core.bigWheelPlan(elements.bigWheelSegment.value);
  const selectedSegment = currentBigWheelSegment();
  const unit = Math.max(1, Number(elements.bigWheelUnit.value) || 1);
  const wagerText = state.bigWheelBet
    ? `Active bet: ${selectedSegment.label} for ${formatMoney(state.bigWheelBet)}. Net: ${formatSignedMoney(state.bigWheelNet)}.`
    : "Place a chip before spinning to resolve a Big Wheel bet.";
  elements.bigWheelAdvice.innerHTML = `<strong>${plan.action}: ${plan.label}.</strong><br>${resultText ? `${resultText}<br>` : ""}${wagerText}<br>${plan.detail}<br>Hit rate: ${plan.hitRate.toFixed(1)}%. Payout: ${plan.payout}. Estimated house edge: ${plan.houseEdge.toFixed(1)}%. Keep this near one ${formatMoney(unit)} novelty spin.`;
}

function currentBigWheelSegment() {
  return BIG_WHEEL_SEGMENTS[elements.bigWheelSegment.value] || BIG_WHEEL_SEGMENTS.one;
}

function placeBigWheelBet() {
  const unit = Math.max(1, Number(elements.bigWheelUnit.value) || 1);
  state.bigWheelBet = roundMoney(state.bigWheelBet + unit);
  playGameSound("blackjack", "chip");
  updateBigWheelBetLedger();
  updateBigWheelWinLossField("Bet placed");
  updateBigWheelAdvice("Chip placed.");
}

function clearBigWheelBet() {
  state.bigWheelBet = 0;
  playGameSound("ui", "tap");
  updateBigWheelBetLedger();
  updateBigWheelWinLossField("No active bet");
  updateBigWheelAdvice("Big Wheel bet cleared.");
}

function updateBigWheelBetLedger() {
  const segment = currentBigWheelSegment();
  elements.bigWheelBetLedger.textContent = state.bigWheelBet
    ? `Bet ${formatMoney(state.bigWheelBet)} on ${segment.label} · Net ${formatSignedMoney(state.bigWheelNet)}`
    : `No Big Wheel bet placed · Net ${formatSignedMoney(state.bigWheelNet)}`;
  elements.bigWheelBetLedger.classList.toggle("has-bet", state.bigWheelBet > 0);
}

function updateBigWheelWinLossField(label = "Win/Loss") {
  elements.bigWheelWinLossField.textContent = `${label}: ${formatSignedMoney(state.bigWheelNet)}`;
  elements.bigWheelWinLossField.classList.toggle("is-positive", state.bigWheelNet > 0);
  elements.bigWheelWinLossField.classList.toggle("is-negative", state.bigWheelNet < 0);
}

function spinBigWheel() {
  const segments = [
    ...Array(24).fill("one"),
    ...Array(15).fill("two"),
    ...Array(7).fill("five"),
    ...Array(4).fill("ten"),
    ...Array(2).fill("twenty"),
    "joker",
    "logo",
  ];
  const resultKey = randomItem(segments);
  const resultSegment = BIG_WHEEL_SEGMENTS[resultKey] || BIG_WHEEL_SEGMENTS.one;
  const result = resultSegment.label;
  const stopRotation = 1440 - resultSegment.stopAngle;
  elements.bigWheelResult.textContent = result;
  elements.bigWheelGraphic.dataset.result = resultKey;
  elements.bigWheelGraphic.style.setProperty("--big-wheel-stop-angle", `${stopRotation}deg`);
  elements.bigWheelGraphic.style.setProperty("--big-wheel-readout-angle", `${-stopRotation}deg`);
  elements.bigWheelGraphic.classList.remove("is-spinning");
  void elements.bigWheelGraphic.offsetWidth;
  elements.bigWheelGraphic.classList.add("is-spinning");
  playGameSound("bigWheel", "spin");
  const resolution = resolveBigWheelBet(result);
  updateBigWheelBetLedger();
  updateBigWheelWinLossField(bigWheelResultLabel(resolution));
  updateBigWheelAdvice(`Last spin: ${result}.${resolution ? ` ${resolution}` : ""}`);
}

function resolveBigWheelBet(result) {
  if (!state.bigWheelBet) return "No active bet was resolved.";
  const segment = currentBigWheelSegment();
  const won = segment.label === result;
  const net = won ? state.bigWheelBet * segment.payout : -state.bigWheelBet;
  state.bigWheelNet = roundMoney(state.bigWheelNet + net);
  return won ? `${segment.label} wins ${formatMoney(net)}.` : `${segment.label} loses ${formatMoney(state.bigWheelBet)}.`;
}

function bigWheelResultLabel(resolution) {
  if (!resolution || resolution.includes("No active")) return "Win/Loss";
  return resolution.includes("wins") ? "Won" : "Lost";
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
  setupRoulette();
  setupBigWheel();
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
