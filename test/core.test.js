const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../src/core.js");

function card(rank, suit) {
  return { rank, suit, value: Core.RANK_VALUE[rank] };
}

function seededRandom(seed = 12345) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

test("CSV parser handles quoted fields and embedded commas", () => {
  const rows = Core.parseCsv('Draw Date,Winning Numbers,Notes\n"05/20/2026","10 28 30 46 57 25","late, draw"\n');
  assert.deepEqual(rows, [
    ["Draw Date", "Winning Numbers", "Notes"],
    ["05/20/2026", "10 28 30 46 57 25", "late, draw"],
  ]);
});

test("Powerball CSV rows map to normalized draw records", () => {
  const csv = [
    "Draw Date,Winning Numbers,Multiplier",
    '05/20/2026,"10 28 30 46 57 25",3',
    '05/17/2026,"3 18 22 27 33 17",2',
  ].join("\n");

  assert.deepEqual(Core.mapCsvDraws(csv, "powerball"), [
    {
      id: "powerball-2026-05-20",
      game: "powerball",
      date: "2026-05-20",
      white: [10, 28, 30, 46, 57],
      bonus: 25,
      multiplier: "3",
    },
    {
      id: "powerball-2026-05-17",
      game: "powerball",
      date: "2026-05-17",
      white: [3, 18, 22, 27, 33],
      bonus: 17,
      multiplier: "2",
    },
  ]);
});

test("Mega Millions CSV rows can use a separate Mega Ball column", () => {
  const csv = [
    "Draw Date,Winning Numbers,Mega Ball,Megaplier",
    '05/19/2026,"10 26 34 56 64",6,3',
  ].join("\n");

  const [draw] = Core.mapCsvDraws(csv, "megamillions");
  assert.equal(draw.id, "megamillions-2026-05-19");
  assert.deepEqual(draw.white, [10, 26, 34, 56, 64]);
  assert.equal(draw.bonus, 6);
});

test("lottery stats calculate hot, cold, overdue, and pattern summaries", () => {
  const draws = [
    { date: "2026-05-20", white: [1, 2, 3, 4, 5], bonus: 1 },
    { date: "2026-05-18", white: [1, 10, 20, 30, 40], bonus: 2 },
    { date: "2026-05-16", white: [6, 7, 8, 9, 10], bonus: 3 },
  ];

  const stats = Core.calculateLotteryStats(draws, Core.GAMES.powerball);
  assert.equal(stats.hot[0].number, 1);
  assert.equal(stats.hot[0].count, 2);
  assert.equal(stats.averageOdd, 2);
  assert.equal(stats.consecutiveRate, 2 / 3);
});

test("ticket generation returns unique valid tickets with useful shape metadata", () => {
  const draws = [
    { date: "2026-05-20", white: [10, 28, 30, 46, 57], bonus: 25 },
    { date: "2026-05-17", white: [3, 18, 22, 27, 33], bonus: 17 },
    { date: "2026-05-14", white: [12, 23, 39, 48, 67], bonus: 5 },
  ];
  const stats = Core.calculateLotteryStats(draws, Core.GAMES.powerball);
  const tickets = Core.generateSuggestedTickets({
    stats,
    game: Core.GAMES.powerball,
    count: 3,
    style: "balanced",
    avoidBirthdays: true,
    rng: seededRandom(),
  });

  assert.equal(tickets.length, 3);
  tickets.forEach((ticket) => {
    assert.equal(ticket.white.length, 5);
    assert.equal(new Set(ticket.white).size, 5);
    assert.ok(ticket.bonus >= 1 && ticket.bonus <= 26);
    assert.ok(ticket.quality.spread >= 0);
  });
});

test("blackjack advisor covers common hard, soft, and pair decisions", () => {
  assert.equal(Core.blackjackDecision("hard", "16", 10).action, "Hit");
  assert.equal(Core.blackjackDecision("soft", "18", 6).action, "Double if allowed, otherwise stand");
  assert.equal(Core.blackjackDecision("pair", "A", 10).action, "Split");
});

test("video poker helper identifies premium hands and duplicate cards", () => {
  const royal = [card("A", "♠"), card("K", "♠"), card("Q", "♠"), card("J", "♠"), card("10", "♠")];
  assert.equal(Core.videoPokerHold(royal).detail, "Royal flush. Enjoy the extremely rare good news.");
  assert.equal(Core.hasDuplicateCards([card("A", "♠"), card("A", "♠")]), true);
});

test("video poker variants adjust wild-card hold advice", () => {
  const deuces = [card("2", "♠"), card("2", "♥"), card("A", "♠"), card("K", "♠"), card("7", "♦")];
  assert.equal(Core.videoPokerHold(deuces, "deucesWild").title, "Hold 2 wild deuces");

  const joker = [
    { rank: "Joker", suit: "★", value: 0 },
    card("K", "♠"),
    card("K", "♥"),
    card("K", "♦"),
    card("4", "♣"),
  ];
  assert.equal(Core.videoPokerHold(joker, "jokersWild").title, "Hold joker with trips");
});

test("three card poker uses the queen-six-four play threshold", () => {
  const play = Core.threeCardDecision([card("Q", "♠"), card("6", "♥"), card("4", "♦")]);
  const fold = Core.threeCardDecision([card("Q", "♠"), card("6", "♥"), card("3", "♦")]);
  assert.equal(play.action, "Play");
  assert.equal(fold.action, "Fold");
});

test("budget helpers keep calculations deterministic", () => {
  assert.deepEqual(Core.bankrollPlan(80, 4, 10), { perSession: 20, casinoBudget: 10 });
  assert.equal(Core.crapsPlan("6", 200, 10).stopLossUnits, 7);
  assert.equal(Core.slotsPlan(100, 1, 94, "medium").expectedLoss.toFixed(2), "6.00");
});

test("roulette and big wheel helpers expose edge-aware advice", () => {
  const roulette = Core.roulettePlan("american", "straight");
  assert.equal(roulette.action, "Prefer European if available");
  assert.equal(roulette.houseEdge.toFixed(2), "5.26");

  const wheel = Core.bigWheelPlan("one");
  assert.equal(wheel.action, "Best for longest play");
  assert.ok(wheel.houseEdge < Core.bigWheelPlan("joker").houseEdge);
});

test("slot pot collection maps visible feature symbols to meter entries", () => {
  const potConfigs = {
    freeThrow: { label: "Free Throw Pot", collectors: ["bonus-free"] },
    heatCheck: { label: "Heat Check Pot", collectors: ["fire-seven", "wild"] },
    championship: { label: "Championship Pot", collectors: ["ring", "jackpot-hoop"] },
  };

  assert.deepEqual(
    Core.slotPotCollections(
      ["bonus-free", "bonus-free", "fire-seven", "wild", "ring", "ring", "jackpot-hoop"],
      potConfigs,
    ),
    [
      {
        key: "freeThrow",
        label: "Free Throw Pot",
        increment: 1,
        collectCount: 2,
        symbol: "bonus-free",
        fallback: false,
      },
      {
        key: "heatCheck",
        label: "Heat Check Pot",
        increment: 1,
        collectCount: 2,
        symbol: "fire-seven",
        fallback: false,
      },
      {
        key: "championship",
        label: "Championship Pot",
        increment: 2,
        collectCount: 3,
        symbol: "ring",
        fallback: false,
      },
    ],
  );

  assert.deepEqual(Core.slotPotCollections(["basketball"], potConfigs, () => 0.7), [
    {
      key: "championship",
      label: "Championship Pot",
      increment: 1,
      collectCount: 0,
      symbol: "basketball",
      fallback: true,
    },
  ]);
});
