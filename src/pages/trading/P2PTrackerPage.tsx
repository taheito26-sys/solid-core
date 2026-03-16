import { useState, useEffect, useMemo, useCallback } from 'react';
import { p2p } from '@/lib/api';
import { getDemoMode } from '@/lib/demo-mode';
import { generateP2PHistory, computeDailySummaries, type P2PDaySummary } from '@/lib/p2p-demo-data';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/layout/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/lib/i18n';
import {
  Loader2, TrendingUp, TrendingDown, ArrowUpDown, RefreshCw,
  Activity, BarChart3, Clock, Zap, DollarSign, Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, Legend,
} from 'recharts';
import type { P2PSnapshot, P2PHistoryPoint } from '@/types/domain';

type ChartRange = '1h' | '6h' | '1d' | '7d';

export default function P2PTrackerPage() {
  const t = useT();
  const [snapshot, setSnapshot] = useState<P2PSnapshot | null>(null);
  const [history, setHistory] = useState<P2PHistoryPoint[]>([]);
  const [dailySummaries, setDailySummaries] = useState<P2PDaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState<ChartRange>('7d');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

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
      toast.error(err.message || 'Failed to load P2P data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5 minutes (matching source cron interval)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, load]);

  // Filter history by chart range
  const filteredHistory = useMemo(() => {
    const now = Date.now();
    const ranges: Record<ChartRange, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };
    const cutoff = now - ranges[chartRange];
    return history.filter(h => h.ts >= cutoff);
  }, [history, chartRange]);

  const chartData = useMemo(() => {
    // Downsample for performance: max ~200 points on chart
    const maxPoints = 200;
    const step = Math.max(1, Math.floor(filteredHistory.length / maxPoints));
    return filteredHistory
      .filter((_, i) => i % step === 0 || i === filteredHistory.length - 1)
      .map(h => ({
        time: chartRange === '7d'
          ? new Date(h.ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
          : new Date(h.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sell: h.sellAvg,
        buy: h.buyAvg,
        spread: h.spread,
      }));
  }, [filteredHistory, chartRange]);

  const spreadChartData = useMemo(() => {
    const maxPoints = 200;
    const step = Math.max(1, Math.floor(filteredHistory.length / maxPoints));
    return filteredHistory
      .filter((_, i) => i % step === 0)
      .map(h => ({
        time: chartRange === '7d'
          ? new Date(h.ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
          : new Date(h.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        spreadPct: h.spreadPct,
      }));
  }, [filteredHistory, chartRange]);

  return (
    <div>
      <PageHeader
        title={t('p2pTracker')}
        description="USDT/QAR · Binance P2P · 7-day history"
      >
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="text-xs"
          >
            <Zap className="w-3 h-3 mr-1" />
            {autoRefresh ? 'Auto ON' : 'Auto OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {t('p2pTracker')}
          </Button>
        </div>
      </PageHeader>

      <div className="p-6 space-y-6">
        {loading && !snapshot && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {snapshot && (
          <>
            {/* ── Status Bar ── */}
            {lastUpdate && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Last update: {new Date(lastUpdate).toLocaleString()}</span>
                {autoRefresh && (
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                    <Activity className="w-3 h-3 mr-1" /> Live
                  </Badge>
                )}
              </div>
            )}

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <StatCard
                label={t.isRTL ? 'متوسط البيع' : 'Sell Avg'}
                value={snapshot.sellAvg?.toFixed(2) || '—'}
                icon={TrendingDown}
              />
              <StatCard
                label={t.isRTL ? 'متوسط الشراء' : 'Buy Avg'}
                value={snapshot.buyAvg?.toFixed(2) || '—'}
                icon={TrendingUp}
              />
              <StatCard
                label={t.isRTL ? 'أفضل بيع' : 'Best Sell'}
                value={snapshot.bestSell?.toFixed(2) || '—'}
                icon={TrendingDown}
              />
              <StatCard
                label={t.isRTL ? 'أفضل شراء' : 'Best Buy'}
                value={snapshot.bestBuy?.toFixed(2) || '—'}
                icon={TrendingUp}
              />
              <StatCard
                label={t.isRTL ? 'الفارق' : 'Spread'}
                value={snapshot.spread?.toFixed(3) || '—'}
                icon={ArrowUpDown}
                trend={snapshot.spreadPct ? `${snapshot.spreadPct.toFixed(3)}%` : undefined}
                trendUp={!!snapshot.spreadPct && snapshot.spreadPct > 0}
              />
              <StatCard
                label={t.isRTL ? 'العمق' : 'Depth'}
                value={`${(snapshot.sellDepth / 1000).toFixed(0)}K / ${(snapshot.buyDepth / 1000).toFixed(0)}K`}
                icon={Layers}
              />
            </div>

            {/* ── Chart Range Selector ── */}
            <div className="flex items-center gap-1">
              {(['1h', '6h', '1d', '7d'] as ChartRange[]).map(r => (
                <Button
                  key={r}
                  size="sm"
                  variant={chartRange === r ? 'default' : 'ghost'}
                  className="text-xs px-3 h-7"
                  onClick={() => setChartRange(r)}
                >
                  {r.toUpperCase()}
                </Button>
              ))}
            </div>

            {/* ── Price History Chart ── */}
            {chartData.length > 0 && (
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    {t.isRTL ? 'سجل الأسعار' : 'Price History'} ({chartRange.toUpperCase()})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="sellGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="buyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(142, 72%, 38%)" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="hsl(142, 72%, 38%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                        <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} tickFormatter={(v: number) => v.toFixed(2)} />
                        <Tooltip
                          contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                          labelStyle={{ fontSize: 10 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="sell" stroke="hsl(0, 72%, 51%)" fill="url(#sellGrad)" strokeWidth={2} name="Sell Avg" dot={false} />
                        <Area type="monotone" dataKey="buy" stroke="hsl(142, 72%, 38%)" fill="url(#buyGrad)" strokeWidth={2} name="Buy Avg" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Spread % Chart ── */}
            {spreadChartData.length > 0 && (
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-primary" />
                    {t.isRTL ? 'نسبة الفارق' : 'Spread %'} ({chartRange.toUpperCase()})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={spreadChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                        <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v.toFixed(2)}%`} />
                        <Tooltip
                          contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                          formatter={(v: number) => [`${v.toFixed(3)}%`, 'Spread']}
                        />
                        <Line type="monotone" dataKey="spreadPct" stroke="hsl(var(--primary))" dot={false} strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Order Book ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                    {t.isRTL ? 'عروض البيع (أنت تشتري)' : 'Sell Offers (You Buy)'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="grid grid-cols-5 gap-1 text-[10px] font-mono uppercase text-muted-foreground pb-1 border-b border-border/50">
                      <span>{t('price')}</span>
                      <span>{t.isRTL ? 'المتاح' : 'Available'}</span>
                      <span>{t.isRTL ? 'الحد' : 'Range'}</span>
                      <span>{t.isRTL ? 'التاجر' : 'Trader'}</span>
                      <span>{t.isRTL ? 'طرق' : 'Methods'}</span>
                    </div>
                    {snapshot.sellOffers?.slice(0, 8).map((o, i) => (
                      <div key={i} className="grid grid-cols-5 gap-1 items-center text-sm py-1.5 border-b border-border/30 last:border-0">
                        <span className="font-mono font-bold text-destructive">{o.price.toFixed(2)}</span>
                        <span className="text-xs font-mono">{o.available.toLocaleString()}</span>
                        <span className="text-[10px] text-muted-foreground">{o.min.toFixed(0)}-{o.max.toFixed(0)}</span>
                        <span className="text-xs text-muted-foreground truncate">{o.nick}</span>
                        <div className="flex gap-0.5 flex-wrap">
                          {o.methods.slice(0, 2).map(m => (
                            <Badge key={m} variant="outline" className="text-[8px] px-1 py-0">{m}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-success" />
                    {t.isRTL ? 'عروض الشراء (أنت تبيع)' : 'Buy Offers (You Sell)'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="grid grid-cols-5 gap-1 text-[10px] font-mono uppercase text-muted-foreground pb-1 border-b border-border/50">
                      <span>{t('price')}</span>
                      <span>{t.isRTL ? 'المتاح' : 'Available'}</span>
                      <span>{t.isRTL ? 'الحد' : 'Range'}</span>
                      <span>{t.isRTL ? 'التاجر' : 'Trader'}</span>
                      <span>{t.isRTL ? 'طرق' : 'Methods'}</span>
                    </div>
                    {snapshot.buyOffers?.slice(0, 8).map((o, i) => (
                      <div key={i} className="grid grid-cols-5 gap-1 items-center text-sm py-1.5 border-b border-border/30 last:border-0">
                        <span className="font-mono font-bold text-success">{o.price.toFixed(2)}</span>
                        <span className="text-xs font-mono">{o.available.toLocaleString()}</span>
                        <span className="text-[10px] text-muted-foreground">{o.min.toFixed(0)}-{o.max.toFixed(0)}</span>
                        <span className="text-xs text-muted-foreground truncate">{o.nick}</span>
                        <div className="flex gap-0.5 flex-wrap">
                          {o.methods.slice(0, 2).map(m => (
                            <Badge key={m} variant="outline" className="text-[8px] px-1 py-0">{m}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Daily Summary ── */}
            {dailySummaries.length > 0 && (
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    {t.isRTL ? 'ملخص يومي (7 أيام)' : 'Daily Summary (7 Days)'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/50 text-muted-foreground">
                          <th className="text-left py-2 font-mono">{t('date')}</th>
                          <th className="text-right py-2 font-mono">{t.isRTL ? 'أعلى بيع' : 'High Sell'}</th>
                          <th className="text-right py-2 font-mono">{t.isRTL ? 'أدنى بيع' : 'Low Sell'}</th>
                          <th className="text-right py-2 font-mono">{t.isRTL ? 'أعلى شراء' : 'High Buy'}</th>
                          <th className="text-right py-2 font-mono">{t.isRTL ? 'أدنى شراء' : 'Low Buy'}</th>
                          <th className="text-right py-2 font-mono">{t.isRTL ? 'استطلاعات' : 'Polls'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailySummaries.map(d => (
                          <tr key={d.date} className="border-b border-border/30 last:border-0">
                            <td className="py-1.5 font-mono">{d.date}</td>
                            <td className="py-1.5 text-right font-mono text-destructive">{d.highSell.toFixed(3)}</td>
                            <td className="py-1.5 text-right font-mono text-destructive/70">{d.lowSell?.toFixed(3) ?? '—'}</td>
                            <td className="py-1.5 text-right font-mono text-success">{d.highBuy.toFixed(3)}</td>
                            <td className="py-1.5 text-right font-mono text-success/70">{d.lowBuy?.toFixed(3) ?? '—'}</td>
                            <td className="py-1.5 text-right font-mono text-muted-foreground">{d.polls}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
