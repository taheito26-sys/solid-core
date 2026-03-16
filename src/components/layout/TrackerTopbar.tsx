import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, Bell, Plus, Search } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import '@/styles/tracker.css';

const RANGE_OPTIONS = [
  { id: 'today', label: '1D' },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: 'all', label: 'ALL' },
] as const;

function titleFromPath(pathname: string) {
  if (pathname === '/dashboard') return { title: 'Dashboard', subtitle: 'KPIs · trend' };
  if (pathname === '/trading/orders') return { title: 'Trades', subtitle: 'FIFO cost basis · margin bar' };
  if (pathname === '/trading/stock') return { title: 'Stock Batches', subtitle: 'FIFO layers · progress = remaining' };
  if (pathname === '/trading/calendar') return { title: 'Calendar', subtitle: 'Visual daily trading activity view' };
  if (pathname === '/crm') return { title: 'CRM', subtitle: 'Directory · Customers + Suppliers · History' };
  if (pathname === '/vault') return { title: 'Vault', subtitle: 'Backup & cloud' };
  if (pathname === '/settings') return { title: 'Settings', subtitle: 'Layout · themes' };
  return { title: 'Tracker', subtitle: 'FIFO · trading workspace' };
}

export function TrackerTopbar() {
  const { settings, update } = useTheme();
  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [search, setSearch] = useState(settings.searchQuery || '');

  useEffect(() => {
    setSearch(settings.searchQuery || '');
  }, [settings.searchQuery]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== settings.searchQuery) {
        update({ searchQuery: search });
      }
    }, 120);
    return () => clearTimeout(t);
  }, [search, settings.searchQuery, update]);

  const meta = useMemo(() => titleFromPath(location.pathname), [location.pathname]);

  return (
    <header className="tracker-topbar">
      <div className="tracker-topbar-title-wrap">
        <div className="tracker-topbar-title">{meta.title}</div>
        <div className="tracker-topbar-sub">{meta.subtitle}</div>
      </div>

      <div className="tracker-topbar-controls">
        <label className="tracker-search" aria-label="Search">
          <Search className="tracker-search-icon" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
          />
        </label>

        <div className="tracker-seg" role="group" aria-label="Date range">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              className={cn(settings.range === opt.id && 'active')}
              onClick={() => update({ range: opt.id })}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="tracker-seg" role="group" aria-label="Currency">
          <button className={cn(settings.currency === 'QAR' && 'active')} onClick={() => update({ currency: 'QAR' })} type="button">QAR</button>
          <button className={cn(settings.currency === 'USDT' && 'active')} onClick={() => update({ currency: 'USDT' })} type="button">USDT</button>
        </div>

        <div className="tracker-seg" role="group" aria-label="Language">
          <button className={cn(settings.language === 'ar' && 'active')} onClick={() => update({ language: 'ar' })} type="button">Arabic</button>
          <button className={cn(settings.language === 'en' && 'active')} onClick={() => update({ language: 'en' })} type="button">English</button>
        </div>

        <div className="tracker-alert-box">
          <Bell className="tracker-alert-icon" />
          <input
            type="number"
            step="0.5"
            min={0}
            value={settings.priceAlertThreshold}
            onChange={(e) => update({ priceAlertThreshold: Number(e.target.value) || 0 })}
          />
          <span>%</span>
        </div>

        <button className="tracker-icon-btn" type="button" title="Diagnostics">
          <Activity size={14} />
        </button>

        <span className="tracker-sync">● Synced</span>

        <div className="tracker-user">
          <span className="tracker-user-avatar">{(profile?.display_name || 'U').charAt(0).toUpperCase()}</span>
          <div className="tracker-user-meta">
            <strong>{profile?.display_name || 'User'}</strong>
            <small>{profile?.merchant_id ? `Client ID: ${profile.merchant_id}` : 'Client ID: N/A'}</small>
          </div>
          <button className="tracker-signout" onClick={logout} type="button">Sign out</button>
        </div>

        <button className="tracker-plus" type="button" onClick={() => navigate('/trading/orders')}>
          <Plus size={16} />
        </button>
      </div>
    </header>
  );
}
