import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

/* ── Layout & theme configs from the original repo ── */
const LAYOUTS = [
  { id: 'flux', name: 'Flux', desc: 'Clean SaaS · rounded', font: 'Inter', swatches: ['#f8faff','#4f46e5','#7c3aed','#16a34a','#dc2626','#0ea5e9','#e11d48','#d97706'] },
  { id: 'cipher', name: 'Cipher', desc: 'Dark terminal · mono', font: 'JetBrains', swatches: ['#000000','#00ff64','#00d4ff','#ff4040','#ffcc00','#aa44ff','#ff8c00','#6478ff'] },
  { id: 'aurora', name: 'Aurora', desc: 'AI gradient · ultra-rounded', font: 'Plus Jakarta', swatches: ['#5b21b6','#059669','#e84226','#9333ea','#0284c7','#f43f5e','#3730c8','#16a34a'] },
  { id: 'carbon', name: 'Carbon', desc: 'Dark precision · mono', font: 'JetBrains', swatches: ['#f59e0b','#22d3ee','#84cc16','#ec4899','#f97316','#a855f7','#0d9488','#6366f1'] },
  { id: 'prism', name: 'Prism', desc: 'Bold fintech · geometric', font: 'Space Grotesk', swatches: ['#1c2a8c','#991b1b','#14532d','#a16207','#0f172a','#182a64','#7e22ce','#7c4614'] },
  { id: 'pulse', name: 'Pulse', desc: 'CoinPulse-inspired · dark glass', font: 'DM Sans', swatches: ['#071018','#27e0a3','#2bb8ff','#8b7bff','#ff627e','#ffb84d','#0b1d2d','#12283d'] },
];

const THEME_NAMES: Record<string, string> = { t1: 'Theme 1', t2: 'Theme 2', t3: 'Theme 3', t4: 'Theme 4', t5: 'Theme 5' };

const THEME_COLORS: Record<string, Record<string, string[]>> = {
  flux: {
    t1: ['#4f46e5','#7c3aed','#16a34a','#dc2626','#0ea5e9','#e11d48','#d97706','#0f172a'],
    t2: ['#0d9488','#059669','#15803d','#dc2626','#0284c7','#f43f5e','#d97706','#6366f1'],
    t3: ['#e11d48','#db2777','#15803d','#b91c1c','#7c3aed','#0d9488','#d97706','#0284c7'],
    t4: ['#d97706','#b45309','#15803d','#dc2626','#0284c7','#7c3aed','#e11d48','#0d9488'],
    t5: ['#334155','#0ea5e9','#15803d','#dc2626','#8b5cf6','#d97706','#e11d48','#0d9488'],
  },
  cipher: {
    t1: ['#00ff64','#00cc50','#44ff88','#ff4040','#00eeff','#aa55ff','#ff8c00','#6478ff'],
    t2: ['#0096ff','#0064cc','#00d4aa','#ff4455','#aa55ff','#00ff64','#ff8c00','#44ddff'],
    t3: ['#aa44ff','#8800ee','#44ff88','#ff4466','#44ddff','#00ff64','#ff8c00','#0096ff'],
    t4: ['#ff8c00','#ff6600','#44ff88','#ff3300','#ff44aa','#0096ff','#aa44ff','#44ddff'],
    t5: ['#6478ff','#4455ee','#44ffaa','#ff5566','#ff66ff','#00ff64','#ff8c00','#44ddff'],
  },
  aurora: {
    t1: ['#5b21b6','#7c3aed','#a78bfa','#059669','#0ea5e9','#ec4899','#f59e0b','#64748b'],
    t2: ['#059669','#0d9488','#34d399','#6366f1','#0ea5e9','#ec4899','#f59e0b','#64748b'],
    t3: ['#e84226','#f97316','#fb923c','#059669','#0ea5e9','#8b5cf6','#ec4899','#64748b'],
    t4: ['#9333ea','#c026d3','#d946ef','#059669','#0ea5e9','#f43f5e','#f59e0b','#64748b'],
    t5: ['#0284c7','#0ea5e9','#38bdf8','#059669','#6366f1','#ec4899','#f59e0b','#64748b'],
  },
  carbon: {
    t1: ['#f59e0b','#fbbf24','#fcd34d','#4ade80','#38bdf8','#f87171','#c084fc','#94a3b8'],
    t2: ['#22d3ee','#38bdf8','#7dd3fc','#4ade80','#f59e0b','#f87171','#c084fc','#94a3b8'],
    t3: ['#84cc16','#a3e635','#bef264','#22d3ee','#f59e0b','#f87171','#c084fc','#94a3b8'],
    t4: ['#ec4899','#f472b6','#fbcfe8','#4ade80','#38bdf8','#f59e0b','#c084fc','#94a3b8'],
    t5: ['#f97316','#fb923c','#fdba74','#4ade80','#22d3ee','#f43f5e','#c084fc','#94a3b8'],
  },
  prism: {
    t1: ['#1c2a8c','#3b4ec8','#6b7dff','#166534','#0284c7','#7c2d12','#78350f','#374151'],
    t2: ['#991b1b','#dc2626','#ef4444','#166534','#1c2a8c','#92400e','#6d28d9','#374151'],
    t3: ['#14532d','#166534','#16a34a','#1c2a8c','#0284c7','#991b1b','#92400e','#374151'],
    t4: ['#a16207','#ca8a04','#eab308','#166534','#1c2a8c','#991b1b','#6d28d9','#374151'],
    t5: ['#0f172a','#1e293b','#334155','#166534','#1c2a8c','#991b1b','#92400e','#374151'],
  },
  pulse: {
    t1: ['#27e0a3','#1fb88a','#8b7bff','#ff627e','#2bb8ff','#ffb84d','#0b1d2d','#12283d'],
    t2: ['#2bb8ff','#1a9de0','#8b7bff','#ff627e','#27e0a3','#ffb84d','#0b1d2d','#12283d'],
    t3: ['#8b7bff','#6b5be0','#27e0a3','#ff627e','#2bb8ff','#ffb84d','#0b1d2d','#12283d'],
    t4: ['#ff627e','#e04060','#27e0a3','#8b7bff','#2bb8ff','#ffb84d','#0b1d2d','#12283d'],
    t5: ['#ffb84d','#e09830','#27e0a3','#ff627e','#2bb8ff','#8b7bff','#0b1d2d','#12283d'],
  },
};

const FONTS = ['Inter','JetBrains Mono','Space Grotesk','Sora','Plus Jakarta Sans','DM Sans','Outfit','Fira Code','IBM Plex Mono','Roboto'];
const FONT_SIZES = [9,10,11,12,13,14];
const VISION_PROFILES = ['standard','comfortable','compact','large'];

interface SettingsDraft {
  layout: string;
  theme: string;
  lowStockThreshold: number;
  priceAlertThreshold: number;
  allowInvalidTrades: boolean;
  ledgerFont: string;
  ledgerFontSize: number;
  fontVisionProfile: string;
  autoFontDisable: boolean;
  autoBackup: boolean;
  logsEnabled: boolean;
  logLevel: string;
}

function loadSettings(): SettingsDraft {
  try {
    const raw = localStorage.getItem('tracker_settings');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    layout: 'flux', theme: 't1',
    lowStockThreshold: 5000, priceAlertThreshold: 2,
    allowInvalidTrades: true,
    ledgerFont: 'Inter', ledgerFontSize: 11,
    fontVisionProfile: 'standard', autoFontDisable: false,
    autoBackup: false, logsEnabled: true, logLevel: 'info',
  };
}

export default function SettingsPage() {
  const [saved, setSaved] = useState<SettingsDraft>(loadSettings);
  const [draft, setDraft] = useState<SettingsDraft>(loadSettings);
  const [dirty, setDirty] = useState(false);

  const update = useCallback((patch: Partial<SettingsDraft>) => {
    setDraft(prev => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  const commitSettings = useCallback(() => {
    localStorage.setItem('tracker_settings', JSON.stringify(draft));
    setSaved(draft);
    setDirty(false);
    toast.success('Settings saved');
  }, [draft]);

  const discardSettings = useCallback(() => {
    setDraft(saved);
    setDirty(false);
    toast('Discarded pending changes');
  }, [saved]);

  const curThemeColors = THEME_COLORS[draft.layout] || THEME_COLORS.flux;

  return (
    <div className="tracker-page">
      <PageHeader title="Settings" description="Layout templates · themes · data">
        {dirty && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={discardSettings}><RotateCcw className="w-3 h-3 mr-1" /> Discard</Button>
            <Button size="sm" onClick={commitSettings}><Save className="w-3 h-3 mr-1" /> Save Settings</Button>
          </div>
        )}
      </PageHeader>

      <div className="p-6 space-y-4 max-w-6xl">
        {/* ── Layout Templates ── */}
        <Card className="glass">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-display">🎨 Layout Templates</CardTitle>
              <Badge variant="outline" className="text-xs">{LAYOUTS.find(l => l.id === draft.layout)?.name || draft.layout} · {LAYOUTS.find(l => l.id === draft.layout)?.font}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {LAYOUTS.map(l => (
                <button
                  key={l.id}
                  onClick={() => update({ layout: l.id })}
                  className={cn(
                    'relative rounded-lg border p-3 text-left transition-all hover:border-primary/50',
                    draft.layout === l.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'
                  )}
                >
                  {draft.layout === l.id && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  )}
                  <div className="text-xs font-bold">{l.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{l.desc}</div>
                  <div className="flex gap-0.5 mt-2">
                    {l.swatches.map((c, i) => (
                      <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>

            {/* Theme Colors */}
            <div>
              <Label className="text-xs mb-2 block">Color Themes for {LAYOUTS.find(l => l.id === draft.layout)?.name}</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(curThemeColors).map(([tid, colors]) => (
                  <button
                    key={tid}
                    onClick={() => update({ theme: tid })}
                    className={cn(
                      'rounded-lg border p-2.5 transition-all hover:border-primary/50',
                      draft.theme === tid ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'
                    )}
                  >
                    <div className="flex gap-0.5 mb-1.5">
                      {colors.map((c, i) => (
                        <div key={i} className="w-3 h-3 rounded-sm flex-1" style={{ background: c }} />
                      ))}
                    </div>
                    <div className="text-[10px] text-center font-medium">{THEME_NAMES[tid] || tid}</div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* ── Trading Config ── */}
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">⚡ Trading Config</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Low stock threshold (USDT)</Label>
                <Input
                  type="number" step={100} min={0}
                  value={draft.lowStockThreshold}
                  onChange={e => update({ lowStockThreshold: Number(e.target.value) || 0 })}
                  className="max-w-[180px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Price alert threshold (%)</Label>
                <Input
                  type="number" step={0.5} min={0}
                  value={draft.priceAlertThreshold}
                  onChange={e => update({ priceAlertThreshold: Number(e.target.value) || 0 })}
                  className="max-w-[180px]"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Allow invalid trades (no stock)</Label>
                <Switch checked={draft.allowInvalidTrades} onCheckedChange={v => update({ allowInvalidTrades: v })} />
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                When enabled, unmatched trades are still stored and shown with "!" but excluded from profit KPIs.
              </p>
            </CardContent>
          </Card>

          {/* ── Fonts & Accessibility ── */}
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">🔤 Fonts & Accessibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs mb-2 block">Ledger Font</Label>
                <div className="flex flex-wrap gap-1.5">
                  {FONTS.map(f => (
                    <button
                      key={f}
                      onClick={() => update({ ledgerFont: f })}
                      className={cn(
                        'px-2 py-1 rounded text-[10px] border transition-all',
                        draft.ledgerFont === f ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border hover:border-primary/30'
                      )}
                      style={{ fontFamily: `'${f}', sans-serif` }}
                    >
                      {f.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs mb-2 block">Font Size</Label>
                <div className="flex gap-1.5">
                  {FONT_SIZES.map(s => (
                    <button
                      key={s}
                      onClick={() => update({ ledgerFontSize: s })}
                      className={cn(
                        'px-2.5 py-1 rounded text-[10px] border transition-all',
                        draft.ledgerFontSize === s ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border hover:border-primary/30'
                      )}
                    >
                      {s}px
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3">
                <Label className="text-xs mb-2 block">Accessibility Profile</Label>
                <div className="flex gap-1.5 mb-3">
                  {VISION_PROFILES.map(p => (
                    <button
                      key={p}
                      onClick={() => update({ fontVisionProfile: p })}
                      className={cn(
                        'px-2.5 py-1 rounded text-[10px] border transition-all capitalize',
                        draft.fontVisionProfile === p ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border hover:border-primary/30'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Auto-adjust font for screen size</Label>
                  <Switch checked={!draft.autoFontDisable} onCheckedChange={v => update({ autoFontDisable: !v })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Logs ── */}
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">📋 Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Enable logs</Label>
                <Switch checked={draft.logsEnabled} onCheckedChange={v => update({ logsEnabled: v })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Level</Label>
                <div className="flex gap-1.5">
                  {['error','warn','info'].map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => update({ logLevel: lvl })}
                      className={cn(
                        'px-3 py-1 rounded text-[10px] border transition-all',
                        draft.logLevel === lvl ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border hover:border-primary/30'
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => toast('Logs modal — coming soon')}>Open</Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => toast('Download — coming soon')}>Download</Button>
                <Button variant="destructive" size="sm" className="text-xs" onClick={() => toast('Logs cleared')}>Clear</Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Client-side logs stored in this browser. Server Drive folder logs are separate.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
