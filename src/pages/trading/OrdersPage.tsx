import { useMemo, useState } from 'react';
import { createDemoState } from '@/lib/tracker-demo-data';
import {
  fmtU, fmtP, fmtQ, fmtPct, fmtDate, fmtQWithUnit,
  getWACOP, inRange, rangeLabel,
} from '@/lib/tracker-helpers';
import '@/styles/tracker.css';

export default function OrdersPage() {
  const { state, derived } = useMemo(() => createDemoState(), []);
  const [query, setQuery] = useState('');
  const wacop = getWACOP(derived);
  const rLabel = rangeLabel(state.range);

  const all = [...state.trades].sort((a, b) => b.ts - a.ts);
  const list = all.filter(t => inRange(t.ts, state.range));
  const filtered = !query ? list : list.filter(t =>
    [fmtDate(t.ts), String(t.amountUSDT), String(t.sellPriceQAR)].join(' ').toLowerCase().includes(query.toLowerCase())
  );

  const custName = (cid: string) => {
    if (!cid) return '';
    const c = state.customers.find(x => x.id === cid);
    return c ? c.name : '';
  };

  return (
    <div className="tracker-root" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>
      <div className="twoColPage">
        {/* Left: Trade table */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Trades</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>FIFO cost basis · margin bar</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="pill">{rLabel}</span>
              <button className="btn secondary">CSV</button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 4h10M7 8h10M7 12h10M7 16h10M7 20h10" />
              </svg>
              <div className="empty-t">No trades yet</div>
              <div className="empty-s">Add a batch, then log a sale →</div>
            </div>
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Buyer</th>
                    <th className="r">Qty</th>
                    <th className="r">Avg Buy</th>
                    <th className="r">Sell</th>
                    <th className="r">Volume</th>
                    <th>Margin</th>
                    <th className="r">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const c = derived.tradeCalc.get(t.id);
                    const ok = !!c?.ok;
                    const rev = t.amountUSDT * t.sellPriceQAR;
                    const net = ok ? c!.netQAR : NaN;
                    const margin = ok && rev > 0 ? c!.netQAR / rev : NaN;
                    const pct = Number.isFinite(margin) ? Math.min(1, Math.abs(margin) / 0.05) : 0;
                    const cn = custName(t.customerId);

                    return (
                      <tr key={t.id}>
                        <td>
                          <div style={{ display: 'flex', gap: 5, alignItems: 'center', minWidth: 0 }}>
                            <span className="mono" style={{ whiteSpace: 'nowrap' }}>{fmtDate(t.ts)}</span>
                            {!ok && <span className="pill bad" style={{ fontSize: 9 }}>!</span>}
                          </div>
                        </td>
                        <td>
                          {cn ? (
                            <span className="tradeBuyerChip" title={cn} style={{ maxWidth: 130 }}>{cn}</span>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: 9 }}>—</span>
                          )}
                        </td>
                        <td className="mono r">{fmtU(t.amountUSDT)}</td>
                        <td className="mono r">{ok ? fmtP(c!.avgBuyQAR) : '—'}</td>
                        <td className="mono r">{fmtP(t.sellPriceQAR)}</td>
                        <td className="mono r">{fmtQ(rev)}</td>
                        <td>
                          <div className="prog" style={{ maxWidth: 80 }}>
                            <span style={{ width: `${(pct * 100).toFixed(0)}%`, background: margin >= 0 ? 'linear-gradient(90deg,var(--good),var(--t3))' : 'linear-gradient(90deg,var(--bad),var(--warn))' }} />
                          </div>
                          <div className="muted" style={{ fontSize: 9, marginTop: 2 }}>{Number.isFinite(margin) ? fmtPct(margin * 100) : '—'}</div>
                        </td>
                        <td className="mono r" style={{ color: Number.isFinite(net) ? (net >= 0 ? 'var(--good)' : 'var(--bad)') : undefined, fontWeight: 700 }}>
                          {Number.isFinite(net) ? (net >= 0 ? '+' : '') + fmtQ(net) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: New Sale form */}
        <div>
          <div className="formPanel salePanel">
            <div className="hdr">New Sale</div>
            <div className="inner">
              {wacop && (
                <div className="bannerRow">
                  <span className="bLbl">Av Price</span>
                  <span className="bVal">{fmtP(wacop)}</span>
                  <span className="bSpacer" />
                  <span className="bPill">FIFO</span>
                </div>
              )}
              <div className="field2">
                <div className="lbl">Date &amp; Time</div>
                <div className="inputBox"><input type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} /></div>
              </div>
              <div className="field2">
                <div className="lbl">Input Mode</div>
                <div className="modeToggle">
                  <button className="active">💲 USDT</button>
                  <button>📦 QAR</button>
                </div>
              </div>
              <div className="g2tight">
                <div className="field2">
                  <div className="lbl">Quantity</div>
                  <div className="inputBox"><input inputMode="decimal" placeholder="0.00" /></div>
                </div>
                <div className="field2">
                  <div className="lbl">Sell Price</div>
                  <div className="inputBox"><input inputMode="decimal" placeholder={wacop ? fmtP(wacop) : '0.00'} defaultValue={wacop ? fmtP(wacop) : ''} /></div>
                </div>
              </div>
              <div className="field2">
                <div className="lbl">Buyer Name</div>
                <div className="inputBox"><input placeholder="Search or type buyer name" /></div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, cursor: 'pointer', color: 'var(--muted)' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--brand)' }} /> Use FIFO stock
              </label>
              <div className="previewBox">
                <div className="pt">Live Preview</div>
                <div className="muted" style={{ fontSize: 11 }}>Enter details...</div>
              </div>
              <div className="formActions"><button className="btn">Add Trade</button></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
