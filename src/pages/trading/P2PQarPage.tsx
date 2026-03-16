import { useState, useEffect, useMemo, useCallback } from 'react';
import { p2p } from '@/lib/api';
import { getDemoMode } from '@/lib/demo-mode';
import { generateP2PHistory, computeDailySummaries, type P2PDaySummary } from '@/lib/p2p-demo-data';
import { useT } from '@/lib/i18n';
import { toast } from 'sonner';
import type { P2PSnapshot, P2PHistoryPoint } from '@/types/domain';
import '@/styles/tracker.css';

/**
 * P2P QAR — QAR-centric view of P2P market data.
 * Shows all values in QAR terms: cost to buy USDT, revenue from selling USDT,
 * daily P&L in QAR, and QAR volume analysis.
 */
export default function P2PQarPage() {
  const t = useT();
  const [snapshot, setSnapshot] = useState<P2PSnapshot | null>(null);
  const [history, setHistory] = useState<P2PHistoryPoint[]>([]);
  const [dailySummaries, setDailySummaries] = useState<P2PDaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [historyRange, setHistoryRange] = useState<'7d' | '15d'>('7d');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (getDemoMode()) {
        const demo = generateP2PHistory();
        setSnapshot(demo.snapshot);
        setHistory(demo.history);
        setDailySummaries(computeDailySummaries(demo.history));
        setLastUpdate(new Date().toISOString());
      } else {
        const [s, h] = await Promise.all([p2p.latest(), p2p.history()]);
        setSnapshot(s);
        const hist = Array.isArray(h) ? h : [];
        setHistory(hist);
        setDailySummaries(computeDailySummaries(hist));
        setLastUpdate(new Date().toISOString());
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load P2P QAR data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter history + summaries by range
  const filteredHistory = useMemo(() => {
    const now = Date.now();
    const days = historyRange === '15d' ? 15 : 7;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return history.filter(h => h.ts >= cutoff);
  }, [history, historyRange]);

  const filteredSummaries = useMemo(() => {
    const now = Date.now();
    const days = historyRange === '15d' ? 15 : 7;
    const cutoff = new Date(now - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return dailySummaries.filter(d => d.date >= cutoff);
  }, [dailySummaries, historyRange]);

  // QAR volume estimates per day (avg price * estimated volume)
  const qarDailyData = useMemo(() => {
    return filteredSummaries.map(d => {
      const avgSell = (d.highSell + (d.lowSell ?? d.highSell)) / 2;
      const avgBuy = (d.highBuy + (d.lowBuy ?? d.highBuy)) / 2;
      const estSellVolQar = avgSell * d.polls * 50; // estimated
      const estBuyVolQar = avgBuy * d.polls * 45;
      const spreadQar = avgSell - avgBuy;
      return {
        date: d.date,
        avgSell: avgSell.toFixed(3),
        avgBuy: avgBuy.toFixed(3),
        spreadQar: spreadQar.toFixed(3),
        estSellVolQar: Math.round(estSellVolQar),
        estBuyVolQar: Math.round(estBuyVolQar),
        polls: d.polls,
        highSell: d.highSell,
        lowSell: d.lowSell,
        highBuy: d.highBuy,
        lowBuy: d.lowBuy,
      };
    });
  }, [filteredSummaries]);

  // QAR KPIs
  const qarKpis = useMemo(() => {
    if (!snapshot) return null;
    const sellQar = snapshot.sellAvg ?? 0;
    const buyQar = snapshot.buyAvg ?? 0;
    const spreadQar = sellQar - buyQar;
    const per1000sell = sellQar * 1000;
    const per1000buy = buyQar * 1000;
    const profitPer1000 = per1000sell - per1000buy;
    return { sellQar, buyQar, spreadQar, per1000sell, per1000buy, profitPer1000 };
  }, [snapshot]);

  // Price bar data for QAR chart
  const priceBarData = useMemo(() => {
    const maxPoints = 60;
    const step = Math.max(1, Math.floor(filteredHistory.length / maxPoints));
    return filteredHistory.filter((_, i) => i % step === 0 || i === filteredHistory.length - 1);
  }, [filteredHistory]);

  if (loading && !snapshot) {
    return (
      <div className="tracker-root" style={{ padding: 10 }}>
        <div className="empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <div className="empty-t">Loading P2P QAR data…</div>
        </div>
      </div>
    );
  }

  if (!snapshot || !qarKpis) return null;

  return (
    <div className="tracker-root" style={{ padding: 10 }}>
      {/* ── Status Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <button className="btn" onClick={load} disabled={loading} style={{ gap: 6 }}>
          <span>🔄</span> Refresh
        </button>
        {lastUpdate && (
          <span className="muted" style={{ fontSize: 11 }}>
            Updated {new Date(lastUpdate).toLocaleTimeString()}
          </span>
        )}
        <span className="pill good">P2P QAR Analysis</span>
        <div className="tracker-seg" style={{ marginLeft: 'auto' }}>
          <button className={historyRange === '7d' ? 'active' : ''} onClick={() => setHistoryRange('7d')}>7D</button>
          <button className={historyRange === '15d' ? 'active' : ''} onClick={() => setHistoryRange('15d')}>15D</button>
        </div>
      </div>

      {/* ── QAR KPI Cards ── */}
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', marginBottom: 10 }}>
        <div className="kpi-card">
          <div className="kpi-lbl">SELL RATE</div>
          <div className="kpi-val good">{qarKpis.sellQar.toFixed(3)} QAR</div>
          <div className="kpi-sub">per 1 USDT</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-lbl">BUY RATE</div>
          <div className="kpi-val bad">{qarKpis.buyQar.toFixed(3)} QAR</div>
          <div className="kpi-sub">per 1 USDT</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-lbl">SPREAD QAR</div>
          <div className="kpi-val warn">{qarKpis.spreadQar.toFixed(3)}</div>
          <div className="kpi-sub">per USDT</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-lbl">SELL 1000 USDT</div>
          <div className="kpi-val good">{qarKpis.per1000sell.toFixed(0)} QAR</div>
          <div className="kpi-sub">Revenue</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-lbl">BUY 1000 USDT</div>
          <div className="kpi-val bad">{qarKpis.per1000buy.toFixed(0)} QAR</div>
          <div className="kpi-sub">Cost</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-lbl">PROFIT / 1000</div>
          <div className="kpi-val" style={{ color: qarKpis.profitPer1000 > 0 ? 'var(--good)' : 'var(--bad)' }}>
            {qarKpis.profitPer1000 > 0 ? '+' : ''}{qarKpis.profitPer1000.toFixed(0)} QAR
          </div>
          <div className="kpi-sub">Buy→Sell spread</div>
        </div>
      </div>

      {/* ── QAR Rate History ── */}
      <div className="panel" style={{ marginBottom: 10 }}>
        <div className="panel-head">
          <h2>💰 QAR Rate History</h2>
          <span className="pill">{filteredHistory.length} pts · {historyRange}</span>
        </div>
        <div className="panel-body">
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>SELL QAR/USDT</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 1, height: 28 }}>
                {priceBarData.map((pt, i) => {
                  const vals = priceBarData.map(p => p.sellAvg ?? 3.7);
                  const minV = Math.min(...vals); const maxV = Math.max(...vals);
                  const range = maxV - minV || 0.01;
                  const h = 6 + ((pt.sellAvg ?? minV) - minV) / range * 22;
                  return <div key={i} style={{ flex: 1, minWidth: 2, height: h, background: 'var(--good)', borderRadius: 1, opacity: 0.8 }} />;
                })}
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--good)', minWidth: 50, textAlign: 'right' }}>
                {snapshot.sellAvg?.toFixed(3)}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>BUY QAR/USDT</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 1, height: 28 }}>
                {priceBarData.map((pt, i) => {
                  const vals = priceBarData.map(p => p.buyAvg ?? 3.7);
                  const minV = Math.min(...vals); const maxV = Math.max(...vals);
                  const range = maxV - minV || 0.01;
                  const h = 6 + ((pt.buyAvg ?? minV) - minV) / range * 22;
                  return <div key={i} style={{ flex: 1, minWidth: 2, height: h, background: 'var(--bad)', borderRadius: 1, opacity: 0.8 }} />;
                })}
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--bad)', minWidth: 50, textAlign: 'right' }}>
                {snapshot.buyAvg?.toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Daily QAR Summary Table ── */}
      {qarDailyData.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h2>📊 Daily QAR Summary</h2>
            <span className="pill">{historyRange}</span>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>HIGH SELL</th>
                    <th>LOW SELL</th>
                    <th>HIGH BUY</th>
                    <th>LOW BUY</th>
                    <th>SPREAD QAR</th>
                    <th>POLLS</th>
                  </tr>
                </thead>
                <tbody>
                  {qarDailyData.map(d => (
                    <tr key={d.date}>
                      <td className="mono">{d.date}</td>
                      <td className="mono r good">{d.highSell.toFixed(3)}</td>
                      <td className="mono r" style={{ color: 'color-mix(in srgb, var(--good) 60%, var(--muted))' }}>{d.lowSell?.toFixed(3) ?? '—'}</td>
                      <td className="mono r bad">{d.highBuy.toFixed(3)}</td>
                      <td className="mono r" style={{ color: 'color-mix(in srgb, var(--bad) 60%, var(--muted))' }}>{d.lowBuy?.toFixed(3) ?? '—'}</td>
                      <td className="mono r warn">{d.spreadQar}</td>
                      <td className="mono r muted">{d.polls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
