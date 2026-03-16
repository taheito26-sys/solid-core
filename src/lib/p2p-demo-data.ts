// ─── P2P Demo Data Generator ─────────────────────────────────────
// Generates realistic 7-day USDT/QAR price history matching
// the source repo's Binance P2P scraper output format.

import type { P2PSnapshot, P2PHistoryPoint, P2POffer } from '@/types/domain';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const HISTORY_DAYS = 7;
const HISTORY_POINTS = (60 / 5) * 24 * HISTORY_DAYS; // 2016

const NICKS = [
  'QatarOTC', 'AhmedTrader', 'GulfExchange', 'DohaP2P',
  'KhalifaCrypto', 'SouqUSDT', 'AlWakraFX', 'PearlTrader',
  'RasLaffanOTC', 'MesaieedFX', 'WestBayTrader', 'LusailOTC',
];

const METHODS = [
  'QNB', 'CBQ', 'Masraf', 'QIIB', 'Doha Bank',
  'Cash', 'Vodafone Cash', 'Bank Transfer',
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateOffers(rng: () => number, side: 'sell' | 'buy', basePrice: number): P2POffer[] {
  const count = 8 + Math.floor(rng() * 5);
  const offers: P2POffer[] = [];
  for (let i = 0; i < count; i++) {
    const offset = side === 'sell'
      ? basePrice + (rng() * 0.06 - 0.01)
      : basePrice - (rng() * 0.06 - 0.01);
    const price = Math.round(offset * 100) / 100;
    const methodCount = 1 + Math.floor(rng() * 3);
    const methods: string[] = [];
    for (let m = 0; m < methodCount; m++) {
      const method = METHODS[Math.floor(rng() * METHODS.length)];
      if (!methods.includes(method)) methods.push(method);
    }
    offers.push({
      price,
      min: Math.round((500 + rng() * 1500) / 10) * 10,
      max: Math.round((5000 + rng() * 45000) / 100) * 100,
      nick: NICKS[Math.floor(rng() * NICKS.length)],
      methods,
      available: Math.round((500 + rng() * 15000) * 100) / 100,
    });
  }
  // Sort: sell = highest first, buy = lowest first (matching source parseSide)
  offers.sort((a, b) => side === 'sell' ? b.price - a.price : a.price - b.price);
  return offers;
}

function computeStats(offers: P2POffer[], side: 'sell' | 'buy') {
  const top5 = offers.slice(0, 5);
  const avg = top5.length ? top5.reduce((s, o) => s + o.price, 0) / top5.length : null;
  const best = offers[0]?.price ?? null;
  const depth = top5.reduce((s, o) => {
    return side === 'sell'
      ? s + Math.min(o.max, o.available > 0 ? o.available * o.price : o.max)
      : s + Math.min(o.max / (o.price || 1), o.available > 0 ? o.available : o.max / (o.price || 1));
  }, 0);
  return { avg, best, depth };
}

export function generateP2PHistory(): { snapshot: P2PSnapshot; history: P2PHistoryPoint[] } {
  const rng = seededRandom(42);
  const now = Date.now();
  const startTs = now - HISTORY_DAYS * 24 * 60 * 60 * 1000;
  
  const history: P2PHistoryPoint[] = [];
  let baseSell = 3.78;
  let baseBuy = 3.74;

  // Generate 7 days of history at 5-min intervals
  for (let i = 0; i < HISTORY_POINTS; i++) {
    const ts = startTs + i * POLL_INTERVAL_MS;
    
    // Add realistic price drift with daily cycles
    const hourOfDay = new Date(ts).getHours();
    const dayFactor = Math.sin((hourOfDay - 6) * Math.PI / 12) * 0.005; // Peak at noon
    const noise = (rng() - 0.5) * 0.02;
    const drift = (rng() - 0.5) * 0.002;
    
    baseSell = Math.max(3.70, Math.min(3.85, baseSell + drift + dayFactor * 0.1));
    baseBuy = baseSell - 0.03 - rng() * 0.02;

    const sellAvg = Math.round((baseSell + noise) * 1000) / 1000;
    const buyAvg = Math.round((baseBuy + noise * 0.8) * 1000) / 1000;
    const spread = Math.round((sellAvg - buyAvg) * 1000) / 1000;
    const spreadPct = Math.round((spread / buyAvg) * 100 * 1000) / 1000;

    history.push({ ts, sellAvg, buyAvg, spread, spreadPct });
  }

  // Latest snapshot with full offer books
  const latest = history[history.length - 1];
  const sellOffers = generateOffers(rng, 'sell', latest.sellAvg!);
  const buyOffers = generateOffers(rng, 'buy', latest.buyAvg!);
  const sellStats = computeStats(sellOffers, 'sell');
  const buyStats = computeStats(buyOffers, 'buy');

  const spread = sellStats.avg && buyStats.avg ? sellStats.avg - buyStats.avg : null;
  const spreadPct = spread && buyStats.avg ? (spread / buyStats.avg) * 100 : null;

  const snapshot: P2PSnapshot = {
    ts: now,
    sellAvg: sellStats.avg ? Math.round(sellStats.avg * 100) / 100 : null,
    buyAvg: buyStats.avg ? Math.round(buyStats.avg * 100) / 100 : null,
    bestSell: sellStats.best,
    bestBuy: buyStats.best,
    sellDepth: Math.round(sellStats.depth),
    buyDepth: Math.round(buyStats.depth),
    spread: spread ? Math.round(spread * 1000) / 1000 : null,
    spreadPct: spreadPct ? Math.round(spreadPct * 1000) / 1000 : null,
    sellOffers,
    buyOffers,
  };

  return { snapshot, history };
}

/** Compute daily high/low summary from history (matches source's p2p:day:YYYY-MM-DD) */
export interface P2PDaySummary {
  date: string;
  highSell: number;
  lowSell: number | null;
  highBuy: number;
  lowBuy: number | null;
  polls: number;
}

export function computeDailySummaries(history: P2PHistoryPoint[]): P2PDaySummary[] {
  const byDate = new Map<string, P2PDaySummary>();
  for (const pt of history) {
    const date = new Date(pt.ts).toISOString().slice(0, 10);
    let day = byDate.get(date);
    if (!day) {
      day = { date, highSell: 0, lowSell: null, highBuy: 0, lowBuy: null, polls: 0 };
      byDate.set(date, day);
    }
    if (pt.sellAvg != null) {
      day.highSell = Math.max(day.highSell, pt.sellAvg);
      day.lowSell = day.lowSell === null ? pt.sellAvg : Math.min(day.lowSell, pt.sellAvg);
    }
    if (pt.buyAvg != null) {
      day.highBuy = Math.max(day.highBuy, pt.buyAvg);
      day.lowBuy = day.lowBuy === null ? pt.buyAvg : Math.min(day.lowBuy, pt.buyAvg);
    }
    day.polls++;
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}
