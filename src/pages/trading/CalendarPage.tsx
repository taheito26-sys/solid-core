import { useMemo, useState } from 'react';
import { createDemoState } from '@/lib/tracker-demo-data';
import {
  fmtQ, fmtU, fmtP, fmtPct, fmtQWithUnit,
} from '@/lib/tracker-helpers';
import { useTheme } from '@/lib/theme-context';
import '@/styles/tracker.css';

export default function CalendarPage() {
  const { settings } = useTheme();
  const { state, derived } = useMemo(() => createDemoState({
    lowStockThreshold: settings.lowStockThreshold,
    priceAlertThreshold: settings.priceAlertThreshold,
  }), [settings.lowStockThreshold, settings.priceAlertThreshold]);
  const [cal, setCal] = useState(state.cal);

  const mn = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const now = new Date();
  const curY = now.getFullYear(), curM = now.getMonth(), curD = now.getDate();
  const { year, month, selectedDay } = cal;
  const daysInM = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  // Build month data
  const mData: Record<number, { profit: number; trades: number; volumeQAR: number; wins: number; losses: number; marginSum: number; tradeList: any[] }> = {};
  for (let d = 1; d <= daysInM; d++) mData[d] = { profit: 0, trades: 0, volumeQAR: 0, wins: 0, losses: 0, marginSum: 0, tradeList: [] };

  for (const t of state.trades.filter(t => !t.voided)) {
    const dt = new Date(t.ts);
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      const c = derived.tradeCalc.get(t.id);
      const d2 = dt.getDate();
      if (c?.ok) {
        const rev = t.amountUSDT * t.sellPriceQAR;
        mData[d2].profit += c.netQAR;
        mData[d2].volumeQAR += rev;
        mData[d2].trades++;
        mData[d2].marginSum += Number.isFinite(c.margin) ? c.margin : 0;
        (c.netQAR >= 0 ? mData[d2].wins++ : mData[d2].losses++);
        mData[d2].tradeList.push({ ...t, net: c.netQAR, margin: c.margin, avgBuy: c.avgBuyQAR, rev });
      }
    }
  }

  const totalP = Object.values(mData).reduce((s, d) => s + d.profit, 0);
  const totalT = Object.values(mData).reduce((s, d) => s + d.trades, 0);
  const totalV = Object.values(mData).reduce((s, d) => s + d.volumeQAR, 0);
  const wins = Object.values(mData).reduce((s, d) => s + d.wins, 0);
  const tradeDays = Object.values(mData).filter(d => d.trades > 0).length;
  const bestDay = Object.entries(mData).filter(([, d]) => d.trades > 0).sort((a, b) => b[1].profit - a[1].profit)[0];
  const worstDay = Object.entries(mData).filter(([, d]) => d.trades > 0).sort((a, b) => a[1].profit - b[1].profit)[0];
  const avgMargin = totalT ? Object.values(mData).reduce((s, d) => s + d.marginSum, 0) / totalT : 0;
  const winRate = totalT ? (wins / totalT) : 0;

  const selData = selectedDay ? mData[selectedDay] : null;

  const prevMonth = () => {
    let y = year, m = month - 1;
    if (m < 0) { m = 11; y--; }
    setCal({ year: y, month: m, selectedDay: null });
  };
  const nextMonth = () => {
    let y = year, m = month + 1;
    if (m > 11) { m = 0; y++; }
    setCal({ year: y, month: m, selectedDay: null });
  };
  const goToday = () => setCal({ year: now.getFullYear(), month: now.getMonth(), selectedDay: null });
  const selectDay = (d: number) => setCal(prev => ({ ...prev, selectedDay: prev.selectedDay === d ? null : d }));

  return (
    <div className="tracker-root" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>
      {/* Stats */}
      <div className="cal-stats">
        <div className="cal-stat">
          <div className="kpi-lbl">Monthly Profit</div>
          <div className={`kpi-val ${totalP >= 0 ? 'good' : 'bad'}`}>{(totalP >= 0 ? '+' : '') + fmtQ(totalP)}</div>
        </div>
        <div className="cal-stat">
          <div className="kpi-lbl">Total Trades</div>
          <div className="kpi-val">{totalT}</div>
        </div>
        <div className="cal-stat">
          <div className="kpi-lbl">Trading Days</div>
          <div className="kpi-val">
            {tradeDays}
            {bestDay && <span className="cycle-badge" style={{ marginLeft: 4 }}>Best: {mn[month].slice(0, 3)} {bestDay[0]}</span>}
            {worstDay && <span className="cycle-badge" style={{ marginLeft: 4 }}>Worst: {mn[month].slice(0, 3)} {worstDay[0]}</span>}
          </div>
        </div>
        <div className="cal-stat">
          <div className="kpi-lbl">Monthly Volume</div>
          <div className="kpi-val">{fmtQWithUnit(totalV)}</div>
        </div>
        <div className="cal-stat">
          <div className="kpi-lbl">Win Rate</div>
          <div className="kpi-val">{(winRate * 100).toFixed(0)}%</div>
        </div>
        <div className="cal-stat">
          <div className="kpi-lbl">Avg Margin</div>
          <div className="kpi-val">{fmtPct(avgMargin)}</div>
        </div>
      </div>

      {/* Calendar */}
      <div className="panel">
        <div className="panel-head">
          <h2>{mn[month]} {year}</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn secondary" onClick={prevMonth}>← Prev</button>
            <button className="btn secondary" onClick={goToday}>Today</button>
            <button className="btn secondary" onClick={nextMonth}>Next →</button>
          </div>
        </div>
        <div className="panel-body">
          <div className="cal-grid">
            {dn.map(d => <div key={d} className="cal-hdr">{d}</div>)}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`e-${i}`} className="cal-day empty-day" />
            ))}
            {Array.from({ length: daysInM }, (_, i) => {
              const d = i + 1;
              const data = mData[d];
              const hasP = data.profit > 0;
              const hasL = data.profit < 0;
              const isTdy = d === curD && year === curY && month === curM;
              const isSel = d === selectedDay;

              return (
                <div
                  key={d}
                  className={`cal-day${hasP ? ' has-profit' : hasL ? ' has-loss' : ''}${isTdy ? ' today' : ''}${isSel ? ' selected' : ''}`}
                  onClick={() => selectDay(d)}
                >
                  <div className="cal-num">{d}</div>
                  {data.trades > 0 && (
                    <>
                      <div className={`cal-profit ${hasP ? 'good' : 'bad'}`}>
                        {(data.profit >= 0 ? '+' : '') + fmtQ(data.profit)}
                      </div>
                      <div className="cal-count">{data.trades}t</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && selData && selData.trades > 0 && (
        <div className="cal-detail">
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
            📅 {mn[month]} {selectedDay}, {year} — {selData.trades} trade{selData.trades !== 1 ? 's' : ''} · Vol {fmtQWithUnit(selData.volumeQAR)} · Net {(selData.profit >= 0 ? '+' : '') + fmtQ(selData.profit)} · Win {(selData.trades ? ((selData.wins / selData.trades) * 100).toFixed(0) : '0')}%
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th className="r">Qty</th>
                  <th className="r">Avg Buy</th>
                  <th className="r">Sell</th>
                  <th className="r">Volume</th>
                  <th className="r">Net</th>
                  <th className="r">Margin</th>
                </tr>
              </thead>
              <tbody>
                {selData.tradeList.map((t: any) => (
                  <tr key={t.id}>
                    <td className="mono">{new Date(t.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="mono r">{fmtU(t.amountUSDT)}</td>
                    <td className="mono r" style={{ color: 'var(--bad)' }}>{fmtP(t.avgBuy)}</td>
                    <td className="mono r" style={{ color: 'var(--good)' }}>{fmtP(t.sellPriceQAR)}</td>
                    <td className="mono r">{fmtQ(t.rev)}</td>
                    <td className="mono r" style={{ color: t.net >= 0 ? 'var(--good)' : 'var(--bad)', fontWeight: 700 }}>
                      {(t.net >= 0 ? '+' : '') + fmtQ(t.net)}
                    </td>
                    <td className="mono r" style={{ color: t.margin >= 1 ? 'var(--good)' : t.margin < 0 ? 'var(--bad)' : 'var(--warn)' }}>
                      {fmtPct(t.margin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {selectedDay && selData && selData.trades === 0 && (
        <div className="cal-detail">
          <div className="muted" style={{ fontSize: 11, padding: '8px 0' }}>
            No trades on {mn[month]} {selectedDay}. <button className="rowBtn">Log a trade</button>
          </div>
        </div>
      )}
    </div>
  );
}
