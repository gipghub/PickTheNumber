(function attachCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.PickTheNumberCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCore() {
  "use strict";

  const FIVE_YEARS_DAYS = 1826;

  const GAMES = {
    powerball: {
      label: "Powerball",
      source: "https://data.ny.gov/api/views/d6yy-54nr/rows.csv?accessType=DOWNLOAD",
      whiteMax: 69,
      bonusMax: 26,
      bonusLabel: "Powerball",
      bonusClass: "bonus",
      matrix: "5/69 + 1/26",
    },
    megamillions: {
      label: "Mega Millions",
      source: "https://data.ny.gov/api/views/5xaw-6ayf/rows.csv?accessType=DOWNLOAD",
      whiteMax: 70,
      bonusMax: 24,
      bonusLabel: "Mega Ball",
      bonusClass: "mega",
      matrix: "5/70 + 1/24",
    },
  };

  const RANKS = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
  const SUITS = ["♠", "♥", "♦", "♣"];
  const RANK_VALUE = {
    A: 14,
    K: 13,
    Q: 12,
    J: 11,
    10: 10,
    9: 9,
    8: 8,
    7: 7,
    6: 6,
    5: 5,
    4: 4,
    3: 3,
    2: 2,
  };

  function cutoffDate(days, baseDate = new Date()) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - Number(days));
    return date.toISOString().slice(0, 10);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        row.push(field.trim());
        field = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(field.trim());
        if (row.some((cell) => cell.length)) rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }

    row.push(field.trim());
    if (row.some((cell) => cell.length)) rows.push(row);
    return rows;
  }

  function normalizeHeader(header) {
    return String(header || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function parseDate(value) {
    if (!value) return null;
    const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    const monthDayYear = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (monthDayYear) {
      const [, month, day, year] = monthDayYear;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString().slice(0, 10);
    return null;
  }

  function numbersFromText(text) {
    return (
      String(text || "")
        .match(/\d+/g)
        ?.map(Number)
        .filter((value) => Number.isFinite(value)) ?? []
    );
  }

  function mapCsvDraws(text, game) {
    const rows = parseCsv(text);
    if (rows.length < 2) return [];

    const headers = rows[0].map(normalizeHeader);
    const findIndex = (candidates) =>
      headers.findIndex((header) => candidates.some((candidate) => header.includes(candidate)));

    const dateIndex = findIndex(["drawdate", "date"]);
    const winningIndex = findIndex(["winningnumbers", "numbers", "winningnumber"]);
    const bonusIndex = findIndex([game === "powerball" ? "powerball" : "megaball", "mega", "bonus"]);
    const multiplierIndex = findIndex(["multiplier", "megaplier", "powerplay"]);

    return rows
      .slice(1)
      .map((row) => {
        const date = parseDate(row[dateIndex]);
        const allNumbers = numbersFromText(row[winningIndex]);
        const inlineBonus =
          bonusIndex >= 0 && bonusIndex !== winningIndex ? numbersFromText(row[bonusIndex])[0] : null;
        const white = allNumbers.slice(0, 5).sort((a, b) => a - b);
        const bonus = inlineBonus ?? allNumbers[5];
        const multiplier = multiplierIndex >= 0 ? row[multiplierIndex] : "";

        if (!date || white.length !== 5 || !Number.isFinite(bonus)) return null;
        return { id: `${game}-${date}`, game, date, white, bonus, multiplier };
      })
      .filter(Boolean);
  }

  function trimDrawsToWindow(draws, days = FIVE_YEARS_DAYS, baseDate = new Date()) {
    const cutoff = cutoffDate(days, baseDate);
    return draws
      .filter((draw) => draw.date >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function frequencyMap(max, draws, key) {
    const map = new Map();
    for (let i = 1; i <= max; i += 1) map.set(i, { number: i, count: 0, gap: draws.length });

    draws.forEach((draw, drawIndex) => {
      const values = key === "white" ? draw.white : [draw.bonus];
      values.forEach((value) => {
        if (!map.has(value)) return;
        const entry = map.get(value);
        entry.count += 1;
        entry.gap = Math.min(entry.gap, drawIndex);
      });
    });

    return Array.from(map.values());
  }

  function average(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function calculateLotteryStats(draws, game) {
    const orderedDraws = [...draws].sort((a, b) => b.date.localeCompare(a.date));
    const whiteStats = frequencyMap(game.whiteMax, orderedDraws, "white");
    const bonusStats = frequencyMap(game.bonusMax, orderedDraws, "bonus");
    const sums = orderedDraws.map((draw) => draw.white.reduce((total, value) => total + value, 0));
    const oddCounts = orderedDraws.map((draw) => draw.white.filter((value) => value % 2).length);
    const lowCounts = orderedDraws.map((draw) => draw.white.filter((value) => value <= game.whiteMax / 2).length);
    const consecutiveCount = orderedDraws.filter((draw) =>
      draw.white.some((value, index, numbers) => index > 0 && value === numbers[index - 1] + 1),
    ).length;

    return {
      draws: orderedDraws,
      whiteStats,
      bonusStats,
      hot: [...whiteStats].sort((a, b) => b.count - a.count || a.number - b.number).slice(0, 10),
      cold: [...whiteStats].sort((a, b) => a.count - b.count || a.number - b.number).slice(0, 10),
      overdue: [...whiteStats].sort((a, b) => b.gap - a.gap || a.number - b.number).slice(0, 10),
      averageSum: average(sums),
      averageOdd: average(oddCounts),
      averageLow: average(lowCounts),
      consecutiveRate: orderedDraws.length ? consecutiveCount / orderedDraws.length : 0,
    };
  }

  function weightedPick(pool, count, scoring, rng = Math.random) {
    const chosen = [];
    const candidates = pool.map((item) => ({ ...item, weight: Math.max(0.1, scoring(item)) }));

    while (chosen.length < count && candidates.length) {
      const totalWeight = candidates.reduce((sum, item) => sum + item.weight, 0);
      let roll = rng() * totalWeight;
      const index = candidates.findIndex((item) => {
        roll -= item.weight;
        return roll <= 0;
      });
      const safeIndex = index >= 0 ? index : candidates.length - 1;
      chosen.push(candidates[safeIndex].number);
      candidates.splice(safeIndex, 1);
    }

    return chosen.sort((a, b) => a - b);
  }

  function balanceNudge(number, max) {
    const midpoint = max / 2;
    return 0.15 - Math.abs(number - midpoint) / max / 4;
  }

  function scoreTicketShape(white, max) {
    const sum = white.reduce((total, value) => total + value, 0);
    const odd = white.filter((value) => value % 2).length;
    const low = white.filter((value) => value <= max / 2).length;
    const consecutive = white.some((value, index) => index > 0 && value === white[index - 1] + 1);
    const spread = white[white.length - 1] - white[0];
    return { sum, odd, low, consecutive, spread };
  }

  function ticketShapeIsUseful(white, quality, style, avoidBirthdays) {
    if (avoidBirthdays && white.filter((number) => number > 31).length < 2) return false;
    if (quality.spread < 24) return false;
    if (style === "balanced" && (quality.low < 2 || quality.low > 3)) return false;
    return true;
  }

  function generateSuggestedTickets(options) {
    const { stats, game, count, style, avoidBirthdays, rng = Math.random } = options;
    const maxCount = Math.max(1, ...stats.whiteStats.map((item) => item.count));
    const maxGap = Math.max(1, ...stats.whiteStats.map((item) => item.gap));
    const bonusMaxCount = Math.max(1, ...stats.bonusStats.map((item) => item.count));
    const seen = new Set();
    const tickets = [];
    let attempts = 0;

    while (tickets.length < count && attempts < count * 120) {
      attempts += 1;
      const white = weightedPick(
        stats.whiteStats,
        5,
        (item) => {
          const hot = item.count / maxCount;
          const overdue = item.gap / maxGap;
          const highNumberNudge = avoidBirthdays && item.number > 31 ? 0.28 : 0;
          if (style === "random") return 1 + highNumberNudge;
          if (style === "hot") return 0.55 + hot * 1.8 + highNumberNudge;
          if (style === "cold") return 0.55 + (1 - hot) * 1.5 + highNumberNudge;
          if (style === "overdue") return 0.55 + overdue * 1.8 + highNumberNudge;
          return 0.7 + hot * 0.7 + overdue * 0.65 + balanceNudge(item.number, game.whiteMax) + highNumberNudge;
        },
        rng,
      );

      const bonus = weightedPick(
        stats.bonusStats,
        1,
        (item) => (style === "random" ? 1 : 0.75 + item.count / bonusMaxCount),
        rng,
      )[0];
      const quality = scoreTicketShape(white, game.whiteMax);
      const strictGate = attempts < count * 90;

      if (strictGate && !ticketShapeIsUseful(white, quality, style, avoidBirthdays)) continue;

      const key = `${white.join("-")}-${bonus}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tickets.push({ white, bonus, quality });
    }

    return tickets;
  }

  function strategyAdvice(action, reason) {
    return { action, reason };
  }

  function blackjackDecision(type, playerValue, dealer) {
    if (type === "pair") return pairDecision(playerValue, dealer);
    const total = Number(playerValue);

    if (type === "soft") {
      if (total >= 19) return strategyAdvice("Stand", "Soft 19 or better is already strong.");
      if (total === 18) {
        if (dealer >= 3 && dealer <= 6)
          return strategyAdvice("Double if allowed, otherwise stand", "Soft 18 has leverage against dealer 3-6.");
        if (dealer === 2 || dealer === 7 || dealer === 8)
          return strategyAdvice("Stand", "Soft 18 is playable against middling upcards.");
        return strategyAdvice("Hit", "Against 9, 10, or ace, soft 18 needs improvement.");
      }
      if (total === 17 && dealer >= 3 && dealer <= 6)
        return strategyAdvice("Double if allowed, otherwise hit", "Soft 17 gains value by doubling into weak dealer cards.");
      if ((total === 15 || total === 16) && dealer >= 4 && dealer <= 6)
        return strategyAdvice("Double if allowed, otherwise hit", "Soft 15-16 doubles best into dealer 4-6.");
      if ((total === 13 || total === 14) && dealer >= 5 && dealer <= 6)
        return strategyAdvice("Double if allowed, otherwise hit", "Soft 13-14 doubles only into the weakest dealer cards.");
      return strategyAdvice("Hit", "Keep using the ace flexibility to improve.");
    }

    if (total >= 17) return strategyAdvice("Stand", "Hard 17 or better usually should not take another card.");
    if (total >= 13 && total <= 16) {
      if (dealer >= 2 && dealer <= 6) return strategyAdvice("Stand", "Let the dealer's weak upcard carry the bust risk.");
      return strategyAdvice("Hit", "Dealer 7 or better pressures hard totals under 17.");
    }
    if (total === 12) {
      if (dealer >= 4 && dealer <= 6) return strategyAdvice("Stand", "Hard 12 stands only against dealer 4-6.");
      return strategyAdvice("Hit", "Hard 12 is too thin against 2-3 or 7-A.");
    }
    if (total === 11) return strategyAdvice("Double if allowed, otherwise hit", "Hard 11 is the best common doubling total.");
    if (total === 10 && dealer <= 9)
      return strategyAdvice("Double if allowed, otherwise hit", "Hard 10 doubles well unless dealer shows 10 or ace.");
    if (total === 9 && dealer >= 3 && dealer <= 6)
      return strategyAdvice("Double if allowed, otherwise hit", "Hard 9 doubles into dealer 3-6.");
    return strategyAdvice("Hit", "Small hard totals need more cards.");
  }

  function pairDecision(pair, dealer) {
    if (pair === "A" || pair === "8") return strategyAdvice("Split", "Always split aces and eights in standard strategy.");
    if (pair === "10") return strategyAdvice("Stand", "A made 20 is stronger than two new hands.");
    if (pair === "9") {
      if ([2, 3, 4, 5, 6, 8, 9].includes(dealer))
        return strategyAdvice("Split", "Pair 9 splits against most non-7, non-10, non-ace upcards.");
      return strategyAdvice("Stand", "Against 7, 10, or ace, keep the 18.");
    }
    if (pair === "7")
      return dealer <= 7
        ? strategyAdvice("Split", "Pair 7 splits against dealer 2-7.")
        : strategyAdvice("Hit", "Pair 7 is weak against high dealer cards.");
    if (pair === "6")
      return dealer >= 2 && dealer <= 6
        ? strategyAdvice("Split", "Pair 6 splits into dealer weakness.")
        : strategyAdvice("Hit", "Do not split sixes into strong dealer cards.");
    if (pair === "5")
      return dealer <= 9
        ? strategyAdvice("Double if allowed, otherwise hit", "Treat pair 5 as hard 10.")
        : strategyAdvice("Hit", "Hard 10 is not a good double into 10 or ace.");
    if (pair === "4")
      return dealer === 5 || dealer === 6
        ? strategyAdvice("Split if double-after-split is allowed, otherwise hit", "Fours are only a niche split.")
        : strategyAdvice("Hit", "Pair 4 usually plays as hard 8.");
    if (pair === "3" || pair === "2")
      return dealer <= 7
        ? strategyAdvice("Split", "Small pairs split against dealer 2-7.")
        : strategyAdvice("Hit", "Against high cards, improve one hand instead.");
    return strategyAdvice("Hit", "Fallback strategy for unusual rules.");
  }

  function groupBy(items, key) {
    return items.reduce((groups, item) => {
      const value = item[key];
      groups[value] = groups[value] || [];
      groups[value].push(item);
      return groups;
    }, {});
  }

  function formatCards(cards) {
    return cards.map((card) => `${card.rank}${card.suit}`).join(" ");
  }

  function hasDuplicateCards(cards) {
    const unique = new Set(cards.map((card) => `${card.rank}${card.suit}`));
    return unique.size !== cards.length;
  }

  function result(title, detail, holds = []) {
    return { title, detail, holds };
  }

  function cardIndexes(cards, predicate) {
    return cards.reduce((indexes, card, index) => {
      if (predicate(card, index)) indexes.push(index);
      return indexes;
    }, []);
  }

  function videoPokerBasics(cards) {
    const rankGroups = groupBy(cards, "rank");
    const suitGroups = groupBy(cards, "suit");
    const rankedGroups = Object.entries(rankGroups).sort(([, first], [, second]) => second.length - first.length);
    const counts = rankedGroups.map(([, group]) => group.length);
    const isFlush = Object.values(suitGroups).some((group) => group.length === 5);
    const sortedValues = [...new Set(cards.map((card) => card.value))].sort((a, b) => a - b);
    const isWheel = [2, 3, 4, 5, 14].every((value) => sortedValues.includes(value));
    const isStraight = sortedValues.length === 5 && (sortedValues[4] - sortedValues[0] === 4 || isWheel);
    const royalRanks = ["10", "J", "Q", "K", "A"];
    const isRoyal = isFlush && royalRanks.every((rank) => rankGroups[rank]?.length);

    return { rankGroups, suitGroups, rankedGroups, counts, isFlush, isStraight, isRoyal };
  }

  function jacksOrBetterHold(cards, options = {}) {
    const basics = videoPokerBasics(cards);
    const { rankGroups, suitGroups, rankedGroups, counts, isFlush, isStraight, isRoyal } = basics;
    const allCards = [0, 1, 2, 3, 4];
    const payingPairRanks = options.highPairRanks || ["J", "Q", "K", "A"];
    const highCardRanks = options.highCardRanks || ["J", "Q", "K", "A"];
    const pairRanks = Object.entries(rankGroups)
      .filter(([, group]) => group.length === 2)
      .map(([rank]) => rank);

    if (isRoyal) return result("Hold all five", "Royal flush. Enjoy the extremely rare good news.", allCards);
    if (isFlush && isStraight) return result("Hold all five", "Straight flush.", allCards);
    if (counts[0] === 4) {
      const rank = rankedGroups[0][0];
      return result("Hold four of a kind", "Keep the made premium hand.", cardIndexes(cards, (card) => card.rank === rank));
    }
    if (counts[0] === 3 && counts[1] === 2) return result("Hold all five", "Full house.", allCards);
    if (isFlush) return result("Hold all five", "Flush.", allCards);
    if (isStraight) return result("Hold all five", "Straight.", allCards);
    if (counts[0] === 3) {
      const rank = rankedGroups[0][0];
      return result("Hold three of a kind", "Draw two cards.", cardIndexes(cards, (card) => card.rank === rank));
    }
    if (counts[0] === 2 && counts[1] === 2) {
      return result("Hold two pair", "Draw one card.", cardIndexes(cards, (card) => pairRanks.includes(card.rank)));
    }

    const highPair = Object.entries(rankGroups).find(
      ([rank, group]) => group.length === 2 && payingPairRanks.includes(rank),
    );
    if (highPair) {
      return result(
        `Hold pair of ${highPair[0]}s`,
        `${options.pairDetail || "Jacks or Better pays on high pairs."}`,
        cardIndexes(cards, (card) => card.rank === highPair[0]),
      );
    }

    if (options.holdAnyPair && pairRanks.length) {
      return result(
        `Hold pair of ${pairRanks[0]}s`,
        "Double Bonus still starts many hands by protecting any made pair.",
        cardIndexes(cards, (card) => card.rank === pairRanks[0]),
      );
    }

    const fourFlush = Object.values(suitGroups).find((group) => group.length === 4);
    if (fourFlush) {
      const flushSuit = fourFlush[0].suit;
      return result("Hold four-card flush", `Keep ${formatCards(fourFlush)}.`, cardIndexes(cards, (card) => card.suit === flushSuit));
    }

    const highCards = cards.filter((card) => highCardRanks.includes(card.rank));
    if (highCards.length) {
      return result(
        "Hold high cards",
        `Keep ${formatCards(highCards)} and draw the rest.`,
        cardIndexes(cards, (card) => highCardRanks.includes(card.rank)),
      );
    }
    return result("Draw five new cards", "No made hand, high pair, or strong draw.");
  }

  function deucesWildHold(cards) {
    const deuceIndexes = cardIndexes(cards, (card) => card.rank === "2");
    if (deuceIndexes.length === 4) return result("Hold all five", "Four deuces is the signature premium hand.", [0, 1, 2, 3, 4]);
    if (deuceIndexes.length) {
      return result(
        `Hold ${deuceIndexes.length} wild deuce${deuceIndexes.length === 1 ? "" : "s"}`,
        "In Deuces Wild, the 2s drive the hand. Keep the wild cards and redraw around them.",
        deuceIndexes,
      );
    }

    const basics = videoPokerBasics(cards);
    if (basics.isRoyal) return result("Hold all five", "Natural royal flush pays the top non-wild prize.", [0, 1, 2, 3, 4]);
    if (basics.isFlush && basics.isStraight) return result("Hold all five", "Natural straight flush.", [0, 1, 2, 3, 4]);
    if (basics.counts[0] === 4) {
      const rank = basics.rankedGroups[0][0];
      return result("Hold four of a kind", "Made quads are strong even without a deuce.", cardIndexes(cards, (card) => card.rank === rank));
    }

    const royalRanks = ["10", "J", "Q", "K", "A"];
    const royalDraw = Object.values(basics.suitGroups).find(
      (group) => group.filter((card) => royalRanks.includes(card.rank)).length >= 3,
    );
    if (royalDraw) {
      const suit = royalDraw[0].suit;
      return result(
        "Hold royal draw",
        "No deuce: chase strong suited royal cards before weak pairs.",
        cardIndexes(cards, (card) => card.suit === suit && royalRanks.includes(card.rank)),
      );
    }

    const fourFlush = Object.values(basics.suitGroups).find((group) => group.length === 4);
    if (fourFlush) {
      const suit = fourFlush[0].suit;
      return result("Hold four-card flush", `Keep ${formatCards(fourFlush)}.`, cardIndexes(cards, (card) => card.suit === suit));
    }
    return result("Draw five new cards", "No deuce, made hand, or strong wild-game draw.");
  }

  function jokersWildHold(cards) {
    const jokerIndexes = cardIndexes(cards, (card) => card.rank === "Joker");
    if (jokerIndexes.length) {
      const nonJokers = cards.filter((card) => card.rank !== "Joker");
      const rankGroups = groupBy(nonJokers, "rank");
      const bestRank = Object.entries(rankGroups).sort(([, first], [, second]) => second.length - first.length)[0];
      if (bestRank?.[1].length >= 3) {
        return result(
          "Hold joker with trips",
          "Joker Wild can turn trips into a premium four or five of a kind draw.",
          cardIndexes(cards, (card) => card.rank === "Joker" || card.rank === bestRank[0]),
        );
      }
      const highCards = cardIndexes(cards, (card) => card.rank === "Joker" || ["K", "A"].includes(card.rank));
      return result("Hold joker", "Keep the joker with kings or aces when available; redraw the rest.", highCards);
    }

    return jacksOrBetterHold(cards, {
      highPairRanks: ["K", "A"],
      highCardRanks: ["K", "A"],
      pairDetail: "Jokers Wild commonly starts paying at kings or better.",
    });
  }

  function videoPokerHold(cards, variant = "jacksOrBetter") {
    if (variant === "deucesWild") return deucesWildHold(cards);
    if (variant === "jokersWild") return jokersWildHold(cards);
    if (variant === "doubleBonus") return jacksOrBetterHold(cards, { holdAnyPair: true });
    return jacksOrBetterHold(cards);
  }

  function threeCardDecision(cards) {
    const ordered = [...cards].sort((a, b) => b.value - a.value);
    const [first, second, third] = ordered;
    const shouldPlay =
      first.value > 12 || (first.rank === "Q" && (second.value > 6 || (second.value === 6 && third.value >= 4)));
    const hand = formatCards(ordered);
    return shouldPlay
      ? { action: "Play", detail: `${hand} meets or beats the queen-six-four threshold.` }
      : { action: "Fold", detail: `${hand} is below queen-six-four, the common ante/play cutoff.` };
  }

  function crapsPlan(point, bankroll, unit) {
    const maxUnits = Math.floor((Number(bankroll) || 0) / (Number(unit) || 1));
    const odds = point === "4" || point === "10" ? "3x odds" : point === "5" || point === "9" ? "4x odds" : "5x odds";
    const detail =
      point === "none"
        ? "Come-out roll: start with Pass Line or Don't Pass if you prefer the dark-side math. Avoid one-roll proposition bets."
        : `Point is ${point}: back your line bet with ${odds} if bankroll allows. Place 6/8 can be reasonable; skip hardways unless it is pure fun money.`;
    return { maxUnits, detail, stopLossUnits: Math.max(2, Math.floor(maxUnits * 0.35)) };
  }

  function roulettePlan(wheel = "european", betType = "even") {
    const pockets = wheel === "american" ? 38 : 37;
    const houseEdge = wheel === "american" ? 5.26 : 2.7;
    const bets = {
      straight: { label: "Straight number", covered: 1, payout: "35 to 1", volatility: "Highest" },
      split: { label: "Split", covered: 2, payout: "17 to 1", volatility: "Very high" },
      street: { label: "Street", covered: 3, payout: "11 to 1", volatility: "High" },
      corner: { label: "Corner", covered: 4, payout: "8 to 1", volatility: "High" },
      sixLine: { label: "Six line", covered: 6, payout: "5 to 1", volatility: "Medium-high" },
      dozen: { label: "Dozen", covered: 12, payout: "2 to 1", volatility: "Medium" },
      column: { label: "Column", covered: 12, payout: "2 to 1", volatility: "Medium" },
      even: { label: "Red/Black or Odd/Even", covered: 18, payout: "1 to 1", volatility: "Lowest" },
    };
    const bet = bets[betType] || bets.even;
    const hitRate = (bet.covered / pockets) * 100;
    const wheelText = wheel === "american" ? "American double-zero" : "European single-zero";
    const action = wheel === "american" ? "Prefer European if available" : "Use outside bets for longer play";
    const detail =
      betType === "even"
        ? `${wheelText} wheel: even-money bets hit about ${hitRate.toFixed(1)}% of spins before zero rules. Same edge, lower volatility.`
        : `${wheelText} wheel: ${bet.label} covers ${bet.covered} number${bet.covered === 1 ? "" : "s"} and pays ${bet.payout}, but it swings harder.`;

    return {
      action,
      bet: bet.label,
      detail,
      hitRate,
      houseEdge,
      payout: bet.payout,
      volatility: bet.volatility,
    };
  }

  function bigWheelPlan(segment = "one") {
    const pockets = 54;
    const segments = {
      one: { label: "$1", hits: 24, payout: 1 },
      two: { label: "$2", hits: 15, payout: 2 },
      five: { label: "$5", hits: 7, payout: 5 },
      ten: { label: "$10", hits: 4, payout: 10 },
      twenty: { label: "$20", hits: 2, payout: 20 },
      joker: { label: "Joker", hits: 1, payout: 40 },
      logo: { label: "Logo", hits: 1, payout: 40 },
    };
    const pick = segments[segment] || segments.one;
    const hitRate = (pick.hits / pockets) * 100;
    const returnRate = (pick.hits / pockets) * (pick.payout + 1);
    const houseEdge = (1 - returnRate) * 100;
    const action = segment === "one" ? "Best for longest play" : "Novelty only";
    const detail =
      segment === "one"
        ? "The $1 segment usually has the most slices, so it is the least punishing Big Wheel choice."
        : `${pick.label} pays bigger, but the slice count drops fast. Treat it as a short thrill bet, not a strategy bet.`;

    return {
      action,
      detail,
      hitRate,
      houseEdge,
      label: pick.label,
      payout: `${pick.payout} to 1`,
    };
  }

  function slotsPlan(bankroll, bet, rtp, volatility) {
    const safeBankroll = Number(bankroll) || 0;
    const safeBet = Number(bet) || 1;
    const safeRtp = Number(rtp) || 90;
    const spins = Math.floor(safeBankroll / safeBet);
    const expectedLoss = spins * safeBet * (1 - safeRtp / 100);
    const stopLossFactor = volatility === "high" ? 0.35 : volatility === "medium" ? 0.45 : 0.55;
    return {
      spins,
      expectedLoss,
      stopLoss: safeBankroll * stopLossFactor,
      winGoal: safeBankroll * 0.4,
    };
  }

  function slotPotCollections(reelSymbols, potConfigs, rng = Math.random) {
    const symbols = Array.isArray(reelSymbols) ? reelSymbols : [];
    const pots = Object.entries(potConfigs || {});
    const events = pots
      .map(([key, pot]) => {
        const collectors = Array.isArray(pot.collectors) ? pot.collectors : [];
        const collectCount = symbols.filter((symbol) => collectors.includes(symbol)).length;
        const symbol = collectors.find((collector) => symbols.includes(collector)) || "basketball";
        const increment = collectCount >= 3 ? 2 : collectCount > 0 ? 1 : 0;
        return {
          key,
          label: pot.label || key,
          increment,
          collectCount,
          symbol,
          fallback: false,
        };
      })
      .filter((event) => event.increment > 0);

    if (events.length || !pots.length) return events;

    const fallbackIndex = Math.floor(clamp(rng(), 0, 0.999999) * pots.length);
    const [key, pot] = pots[fallbackIndex];
    return [
      {
        key,
        label: pot.label || key,
        increment: 1,
        collectCount: 0,
        symbol: "basketball",
        fallback: true,
      },
    ];
  }

  function bankrollPlan(monthlyBudget, sessionsPerMonth, lotterySpend) {
    const sessions = Math.max(1, Number(sessionsPerMonth) || 1);
    const perSession = (Number(monthlyBudget) || 0) / sessions;
    const casinoBudget = Math.max(0, perSession - (Number(lotterySpend) || 0));
    return { perSession, casinoBudget };
  }

  return {
    FIVE_YEARS_DAYS,
    GAMES,
    RANKS,
    SUITS,
    RANK_VALUE,
    average,
    bankrollPlan,
    bigWheelPlan,
    blackjackDecision,
    calculateLotteryStats,
    clamp,
    cutoffDate,
    crapsPlan,
    formatCards,
    frequencyMap,
    generateSuggestedTickets,
    hasDuplicateCards,
    mapCsvDraws,
    numbersFromText,
    parseCsv,
    parseDate,
    scoreTicketShape,
    slotPotCollections,
    slotsPlan,
    threeCardDecision,
    ticketShapeIsUseful,
    trimDrawsToWindow,
    roulettePlan,
    videoPokerHold,
    weightedPick,
  };
});
