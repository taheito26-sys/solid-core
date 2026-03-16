import { useMemo } from 'react';
import { createDemoState } from '@/lib/tracker-demo-data';
import {
  fmtQWithUnit, fmtU, fmtQ, fmtPct, fmtP,
  kpiFor, totalStock, stockCostQAR, getWACOP,
  rangeLabel, num,
} from '@/lib/tracker-helpers';
import { useTheme } from '@/lib/theme-context';
import '@/styles/tracker.css';

export default function DashboardPage() {
  const { settings } = useTheme();
  const { state, derived } = useMemo(() => createDemoState({
    lowStockThreshold: settings.lowStockThreshold,
    priceAlertThreshold: settings.priceAlertThreshold,
  }), [settings.lowStockThreshold, settings.priceAlertThreshold]);

  const d1 = kpiFor(state, derived, 'today');
  const d7 = kpiFor(state, derived, '7d');
  const dR = kpiFor(state, derived, state.range);
  const stk = totalStock(derived);
  const stCost = stockCostQAR(derived);
  const wacop = getWACOP(derived);
  const rLabel = rangeLabel(state.range);

  const allTrades = state.trades.filter(t => !t.voided);
  const allMargins = allTrades.map(t => {
    const c = derived.tradeCalc.get(t.id);
    return c?.ok ? c.margin : null;
  }).filter((x): x is number => x !== null);
  const avgM = allMargins.length ? allMargins.reduce((s, v) => s + v, 0) / allMargins.length : 0;

  const LOW = num(state.settings?.lowStockThreshold, 5000);
  const isLow = stk <= 0 || (LOW > 0 && stk < LOW);

  const p2pSellAvg: number | null = 3.82; // Demo P2P rate

  const badgeStyle = (condition: string) => {
    const color = condition === 'good' ? 'var(--good)' : condition === 'bad' ? 'var(--bad)' : 'var(--warn)';
    return {
      color,
      borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
      background: `color-mix(in srgb, ${color} 10%, transparent)`,
    };
  };

  return (
    <div className="tracker-root" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>
      {/* KPI Bands */}
      <div className="kpi-band-grid">
        <div className="kpi-band">
          <div className="kpi-band-title">📦 TRADING VOLUME</div>
          <div className="kpi-band-cols">
            <div>
              <div className="kpi-period">1 DAY</div>
              <div className="kpi-cell-val t1v">{fmtQWithUnit(d1.rev)}</div>
              <div className="kpi-cell-sub">{d1.count} trade{d1.count !== 1 ? 's' : ''} · {fmtU(d1.qty, 0)} USDT</div>
            </div>
            <div>
              <div className="kpi-period">7 DAYS</div>
              <div className="kpi-cell-val t1v">{fmtQWithUnit(d7.rev)}</div>
              <div className="kpi-cell-sub">{d7.count} trade{d7.count !== 1 ? 's' : ''} · {fmtU(d7.qty, 0)} USDT</div>
            </div>
          </div>
        </div>
        <div className="kpi-band">
          <div className="kpi-band-title">📈 NET PROFIT</div>
          <div className="kpi-band-cols">
            <div>
              <div className="kpi-period">1 DAY</div>
              <div className={`kpi-cell-val ${d1.net >= 0 ? 'good' : 'bad'}`}>{fmtQWithUnit(d1.net)}</div>
              <div className="kpi-cell-sub">Fees {fmtQWithUnit(d1.fee)}</div>
            </div>
            <div>
              <div className="kpi-period">7 DAYS</div>
              <div className={`kpi-cell-val ${d7.net >= 0 ? 'good' : 'bad'}`}>{fmtQWithUnit(d7.net)}</div>
              <div className="kpi-cell-sub">Fees {fmtQWithUnit(d7.fee)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="kpis">
        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-badge" style={badgeStyle(dR.net >= 0 ? 'good' : 'bad')}>{rLabel}</span>
          </div>
          <div className="kpi-lbl">NET PROFIT</div>
          <div className={`kpi-val ${dR.net >= 0 ? 'good' : 'bad'}`}>{fmtQWithUnit(dR.net)}</div>
          <div className="kpi-sub">{dR.count} trades · {fmtQ(dR.rev)} rev</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-badge" style={badgeStyle(avgM >= 1 ? 'good' : avgM >= 0 ? 'warn' : 'bad')}>{allTrades.length} trades</span>
          </div>
          <div className="kpi-lbl">AVG MARGIN</div>
          <div className={`kpi-val ${avgM >= 1 ? 'good' : avgM >= 0 ? 'warn' : 'bad'}`}>{fmtPct(avgM)}</div>
          <div className="kpi-sub">{dR.count} in range · avg {fmtPct(dR.avgMgn)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-badge" style={badgeStyle(isLow ? 'bad' : 'good')}>{isLow ? '⚠ Low' : 'OK'}</span>
          </div>
          <div className="kpi-lbl">AVAILABLE USDT</div>
          <div className={`kpi-val ${isLow ? 'bad' : 'good'}`} style={isLow ? { animation: 'tracker-blink 1.5s infinite' } : undefined}>{fmtU(stk, 0)}</div>
          <div className="kpi-sub">Liquid USDT ready for deployment</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-badge" style={{ color: 'var(--brand)', borderColor: 'color-mix(in srgb,var(--brand) 30%,transparent)', background: 'var(--brand3)' }}>Av Price</span>
          </div>
          <div className="kpi-lbl">Av Price + SPREAD</div>
          <div className="kpi-val" style={{ fontSize: 16, color: 'var(--t2)' }}>{wacop ? fmtP(wacop) + ' QAR' : 'No stock'}</div>
          <div className="kpi-sub">
            {(() => {
              const sp = wacop && p2pSellAvg ? ((p2pSellAvg - wacop) / wacop * 100).toFixed(2) : null;
              return sp !== null
                ? <span className={Number(sp) >= 0 ? 'good' : 'bad'} style={{ fontWeight: 700 }}>{Number(sp) >= 0 ? '+' : ''}{sp}% vs P2P</span>
                : 'Sell above Av Price to profit';
            })()}
          </div>
        </div>
      </div>

      {/* KPI Cards Row 2 — Cash Position */}
      <div className="kpis" style={{ marginTop: 0 }}>
        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-badge" style={{ color: 'var(--warn)', borderColor: 'color-mix(in srgb,var(--warn) 30%,transparent)', background: 'color-mix(in srgb,var(--warn) 10%,transparent)' }}>Cash</span>
          </div>
          <div className="kpi-lbl">CASH AVAILABLE</div>
          <div className="kpi-val" style={{ color: 'var(--warn)' }}>{fmtQWithUnit(num(state.cashQAR, 0))}</div>
          <div className="kpi-sub" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="rowBtn" style={{ fontSize: 9, padding: '3px 8px' }}>💰 Manage Cash</button>
            <span className="muted" style={{ fontSize: 10 }}>{state.cashOwner ? `Owner: ${state.cashOwner}` : 'Owner: —'}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-badge" style={{ color: 'var(--t5)', borderColor: 'color-mix(in srgb,var(--t5) 30%,transparent)', background: 'color-mix(in srgb,var(--t5) 10%,transparent)' }}>{wacop ? '@Av Price' : '—'}</span>
          </div>
          <div className="kpi-lbl">BUYING POWER</div>
          <div className="kpi-val" style={{ color: 'var(--t5)' }}>
            {wacop && num(state.cashQAR, 0) > 0 ? fmtU(num(state.cashQAR, 0) / wacop, 0) + ' USDT' : 'Set cash →'}
          </div>
          <div className="kpi-sub">{wacop ? '@ ' + fmtP(wacop) + ' QAR' : 'Add batches first'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-badge good" style={{ color: 'var(--good)', borderColor: 'color-mix(in srgb,var(--good) 30%,transparent)', background: 'color-mix(in srgb,var(--good) 10%,transparent)' }}>Net</span>
          </div>
          <div className="kpi-lbl">NET POSITION</div>
          <div className="kpi-val good">{fmtQWithUnit(stCost + num(state.cashQAR, 0))}</div>
          <div className="kpi-sub">Stock {fmtQWithUnit(stCost)} + Cash {fmtQWithUnit(num(state.cashQAR, 0))}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-badge" style={{ color: 'var(--muted)', borderColor: 'var(--line)' }}>{state.batches.length} batch</span>
          </div>
          <div className="kpi-lbl">STOCK COST EST.</div>
          <div className="kpi-val" style={{ fontSize: 17 }}>{fmtQWithUnit(stCost)}</div>
          <div className="kpi-sub">Av Price {wacop ? fmtP(wacop) + ' QAR' : '—'}</div>
        </div>
      </div>

      {/* Bottom panels */}
      <div className="dash-bottom">
        <div className="panel">
          <div className="panel-head"><h2>Profit &amp; Revenue Trend</h2><span className="pill">Last 14 trades</span></div>
          <div className="panel-body" style={{ height: 190, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="muted" style={{ fontSize: 11 }}>Chart renders with live trade data</span>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h2>Period Stats</h2><span className="pill">{rLabel}</span></div>
          <div className="panel-body">
            <div className="prev-row"><span className="muted">Volume</span><strong className="mono t1v">{fmtQWithUnit(dR.rev)}</strong></div>
            <div className="prev-row"><span className="muted">Cost</span><strong className="mono">{fmtQWithUnit(dR.rev - dR.net - dR.fee)}</strong></div>
            <div className="prev-row"><span className="muted">Fees</span><strong className="mono">{fmtQWithUnit(dR.fee)}</strong></div>
            <div className="prev-row"><span className="muted">Net Profit</span><strong className={`mono ${dR.net >= 0 ? 'good' : 'bad'}`}>{fmtQWithUnit(dR.net)}</strong></div>
            <div className="prev-row"><span className="muted">Avg Margin</span><strong className="mono" style={{ color: 'var(--t3)' }}>{fmtPct(dR.avgMgn)}</strong></div>
            <div className="prev-row"><span className="muted">Trades</span><strong className="mono">{dR.count}</strong></div>
          </div>
        </div>
      </div>

      {/* Chart panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="panel">
          <div className="panel-head"><h2>📊 Net Profit Per Trade</h2><span className="pill muted">All time</span></div>
          <div className="panel-body" style={{ height: 170, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="muted" style={{ fontSize: 11 }}>Chart renders with live trade data</span>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h2>📈 Daily Volume &amp; Profit</h2><span className="pill muted">By day</span></div>
          <div className="panel-body" style={{ height: 170, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="muted" style={{ fontSize: 11 }}>Chart renders with live trade data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
