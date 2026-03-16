import { useMemo, useState } from 'react';
import { createDemoState } from '@/lib/tracker-demo-data';
import { fmtU, fmtDate } from '@/lib/tracker-helpers';
import { useTheme } from '@/lib/theme-context';
import '@/styles/tracker.css';

export default function CRMPage() {
  const { settings } = useTheme();
  const { state } = useMemo(() => createDemoState({
    lowStockThreshold: settings.lowStockThreshold,
    priceAlertThreshold: settings.priceAlertThreshold,
  }), [settings.lowStockThreshold, settings.priceAlertThreshold]);
  const [tab, setTab] = useState<'customers' | 'suppliers'>('customers');
  const [search, setSearch] = useState('');

  // Customers from demo state
  const customers = state.customers;
  const filteredCustomers = !search
    ? customers
    : customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  // Suppliers extracted from batches
  const supplierMap = new Map<string, { name: string; batchCount: number; totalUSDT: number; lastDate: number }>();
  for (const b of state.batches) {
    const src = b.source.trim();
    if (!src) continue;
    const existing = supplierMap.get(src);
    if (existing) {
      existing.batchCount++;
      existing.totalUSDT += b.initialUSDT;
      existing.lastDate = Math.max(existing.lastDate, b.ts);
    } else {
      supplierMap.set(src, { name: src, batchCount: 1, totalUSDT: b.initialUSDT, lastDate: b.ts });
    }
  }
  const suppliers = Array.from(supplierMap.values()).sort((a, b) => b.lastDate - a.lastDate);
  const filteredSuppliers = !search
    ? suppliers
    : suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  // Per-customer trade stats
  const customerStats = (cId: string) => {
    const trades = state.trades.filter(t => !t.voided && t.customerId === cId);
    const totalUSDT = trades.reduce((s, t) => s + t.amountUSDT, 0);
    const totalQAR = trades.reduce((s, t) => s + t.amountUSDT * t.sellPriceQAR, 0);
    return { trades: trades.length, totalUSDT, totalQAR };
  };

  return (
    <div className="tracker-root" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>
      {/* Tab toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className={`btn ${tab === 'customers' ? '' : 'secondary'}`}
            onClick={() => setTab('customers')}
          >
            👥 Customers ({customers.length})
          </button>
          <button
            className={`btn ${tab === 'suppliers' ? '' : 'secondary'}`}
            onClick={() => setTab('suppliers')}
          >
            📦 Suppliers ({suppliers.length})
          </button>
        </div>
        <div className="inputBox" style={{ maxWidth: 260, padding: '6px 10px' }}>
          <input
            placeholder={tab === 'customers' ? 'Search customers...' : 'Search suppliers...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── CUSTOMERS TAB ── */}
      {tab === 'customers' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Customers</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Buyer management · trade history</div>
            </div>
            <button className="btn">+ Add Customer</button>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="empty">
              <div className="empty-t">No customers found</div>
              <div className="empty-s">Add your first buyer to track trades</div>
            </div>
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Tier</th>
                    <th className="r">Daily Limit</th>
                    <th className="r">Trades</th>
                    <th className="r">Total USDT</th>
                    <th className="r">Total QAR</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(c => {
                    const s = customerStats(c.id);
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 700 }}>{c.name}</td>
                        <td className="mono">{c.phone || '—'}</td>
                        <td>
                          <span className={`pill ${c.tier === 'A' ? 'good' : c.tier === 'B' ? 'warn' : ''}`}>
                            {c.tier}
                          </span>
                        </td>
                        <td className="mono r">{fmtU(c.dailyLimitUSDT, 0)}</td>
                        <td className="mono r">{s.trades}</td>
                        <td className="mono r">{fmtU(s.totalUSDT, 0)}</td>
                        <td className="mono r">{fmtU(s.totalQAR, 0)}</td>
                        <td style={{ fontSize: 10, color: 'var(--muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="rowBtn">Edit</button>
                            <button className="rowBtn">History</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── SUPPLIERS TAB ── */}
      {tab === 'suppliers' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Suppliers</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>Auto-tracked from batches · purchase history</div>
            </div>
            <button className="btn">+ Add Supplier</button>
          </div>

          {filteredSuppliers.length === 0 ? (
            <div className="empty">
              <div className="empty-t">No suppliers found</div>
              <div className="empty-s">Add batches with a source to track suppliers</div>
            </div>
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th className="r">Batches</th>
                    <th className="r">Total USDT</th>
                    <th>Last Purchase</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map(s => (
                    <tr key={s.name}>
                      <td style={{ fontWeight: 700 }}>{s.name}</td>
                      <td className="mono r">{s.batchCount}</td>
                      <td className="mono r">{fmtU(s.totalUSDT, 0)}</td>
                      <td className="mono">{fmtDate(s.lastDate)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="rowBtn">View Batches</button>
                          <button className="rowBtn">Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
