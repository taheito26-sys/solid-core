import { useMemo } from 'react';
import { createDemoState } from '@/lib/tracker-demo-data';
import {
  fmtU, fmtP, fmtQ, fmtDate, fmtDur,
  getWACOP, rangeLabel, batchCycleTime,
} from '@/lib/tracker-helpers';
import '@/styles/tracker.css';

export default function StockPage() {
  const { state, derived } = useMemo(() => createDemoState(), []);
  const wacop = getWACOP(derived);
  const rLabel = rangeLabel(state.range);

  const perf = state.batches.map(b => {
    const db = derived.batches.find(x => x.id === b.id);
    const rem = db ? Math.max(0, db.remainingUSDT) : b.initialUSDT;
    const used = b.initialUSDT - rem;
    let profit = 0;
    for (const [, c] of derived.tradeCalc) {
      if (!c.ok) continue;
      const s = c.slices.find(s => s.batchId === b.id);
      if (s) profit += s.qty * c.ppu;
    }
    return { ...b, remaining: rem, used, profit };
  }).sort((a, b) => b.ts - a.ts);

  const suppliers = [...new Set(state.batches.map(b => b.source.trim()).filter(Boolean))];

  return (
    <div className="tracker-root" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>
      <div className="twoColPage">
        {/* Left: Batch table */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Batches</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>FIFO layers · progress = remaining</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="pill">{rLabel}</span>
            </div>
          </div>

          {perf.length === 0 ? (
            <div className="empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              <div className="empty-t">No batches</div>
              <div className="empty-s">Add your first purchase →</div>
            </div>
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Source</th>
                    <th className="r">Total</th>
                    <th className="r">Buy</th>
                    <th className="r">Rem</th>
                    <th>Usage</th>
                    <th className="r">Profit</th>
                    <th>Status · Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {perf.map(b => {
                    const rem = Number.isFinite(b.remaining) ? b.remaining : b.initialUSDT;
                    const pct = b.initialUSDT > 0 ? rem / b.initialUSDT : 0;
                    const prog = Math.max(0, Math.min(100, pct * 100));
                    const ct = batchCycleTime(state, derived, b.id);
                    const st = rem <= 1e-9 ? 'Depleted' : rem < b.initialUSDT ? 'Partial' : 'Fresh';
                    const stCls = rem <= 1e-9 ? 'bad' : rem < b.initialUSDT ? 'warn' : 'good';

                    return (
                      <tr key={b.id}>
                        <td className="mono">{fmtDate(b.ts)}</td>
                        <td>{b.source || '—'}</td>
                        <td className="mono r">{fmtU(b.initialUSDT)}</td>
                        <td className="mono r">{fmtP(b.buyPriceQAR)}</td>
                        <td className="mono r">{fmtU(rem)}</td>
                        <td>
                          <div className="prog">
                            <span style={{ width: `${prog.toFixed(0)}%` }} />
                          </div>
                          <div className="muted" style={{ fontSize: 9, marginTop: 2 }}>{prog.toFixed(0)}% remaining</div>
                        </td>
                        <td className="mono r" style={{ color: (b.profit || 0) >= 0 ? 'var(--good)' : 'var(--bad)', fontWeight: 700 }}>
                          {(b.profit || 0) >= 0 ? '+' : ''}{fmtQ(b.profit || 0)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            <span className={`pill ${stCls}`}>{st}</span>
                            {ct !== null && <span className="cycle-badge">{fmtDur(ct)}</span>}
                            <button className="rowBtn">Edit</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Suppliers panel */}
          {suppliers.length > 0 && (
            <div className="panel" style={{ marginTop: 9 }}>
              <div className="panel-head">
                <h2>📦 Suppliers</h2>
                <span className="pill">Auto-tracked</span>
              </div>
              <div className="panel-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {suppliers.map(s => (
                  <span key={s} className="pill" style={{ cursor: 'pointer' }}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Add Batch form */}
        <div>
          <div className="formPanel salePanel">
            <div className="hdr">Add Batch</div>
            <div className="inner">
              {wacop && (
                <div className="bannerRow">
                  <span className="bLbl">Current Av Price</span>
                  <span className="bVal">{fmtP(wacop)}</span>
                  <span className="bSpacer" />
                  <span className="bPill">Avg</span>
                </div>
              )}
              <div className="field2">
                <div className="lbl">Date &amp; Time</div>
                <div className="inputBox"><input type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} /></div>
              </div>
              <div className="field2">
                <div className="lbl">Currency Mode</div>
                <div className="modeToggle">
                  <button className="active">📦 QAR</button>
                  <button>💲 USDT</button>
                </div>
              </div>
              <div className="g2tight">
                <div className="field2">
                  <div className="lbl">Buy Price (QAR)</div>
                  <div className="inputBox"><input inputMode="decimal" placeholder="3.74" /></div>
                </div>
                <div className="field2">
                  <div className="lbl">Volume (QAR)</div>
                  <div className="inputBox"><input inputMode="decimal" placeholder="96,050" /></div>
                </div>
              </div>
              <div className="field2" style={{ gridColumn: 'span 2' }}>
                <div className="lbl">Supplier</div>
                <div className="inputBox"><input placeholder="Search or type supplier name" /></div>
              </div>
              <div className="formActions"><button className="btn">Add Batch</button></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
