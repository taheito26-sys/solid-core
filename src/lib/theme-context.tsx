import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   THEME & SETTINGS CONTEXT
   Manages: layout, theme colors, fonts, accessibility, trading config, logs
   All changes apply in real-time via CSS custom properties on :root
   ═══════════════════════════════════════════════════════════════════ */

// ── Layout definitions (from original repo) ──
export interface LayoutDef {
  id: string;
  name: string;
  desc: string;
  font: string;
  bodyFont: string;
  swatches: string[];
  darkMode: boolean;
  borderRadius: string;
}

export const LAYOUTS: LayoutDef[] = [
  { id: 'flux',   name: 'Flux',   desc: 'Clean SaaS · rounded',           font: 'Inter',          bodyFont: 'Inter',             swatches: ['#f8faff','#4f46e5','#7c3aed','#16a34a','#dc2626','#0ea5e9','#e11d48','#d97706'], darkMode: true,  borderRadius: '0.5rem' },
  { id: 'cipher', name: 'Cipher', desc: 'Dark terminal · mono',           font: 'JetBrains Mono', bodyFont: 'JetBrains Mono',    swatches: ['#000000','#00ff64','#00d4ff','#ff4040','#ffcc00','#aa44ff','#ff8c00','#6478ff'], darkMode: true,  borderRadius: '0.25rem' },
  { id: 'aurora', name: 'Aurora', desc: 'AI gradient · ultra-rounded',    font: 'Plus Jakarta Sans', bodyFont: 'Plus Jakarta Sans', swatches: ['#5b21b6','#059669','#e84226','#9333ea','#0284c7','#f43f5e','#3730c8','#16a34a'], darkMode: true,  borderRadius: '0.75rem' },
  { id: 'carbon', name: 'Carbon', desc: 'Dark precision · mono',          font: 'JetBrains Mono', bodyFont: 'JetBrains Mono',    swatches: ['#f59e0b','#22d3ee','#84cc16','#ec4899','#f97316','#a855f7','#0d9488','#6366f1'], darkMode: true,  borderRadius: '0.375rem' },
  { id: 'prism',  name: 'Prism',  desc: 'Bold fintech · geometric',       font: 'Space Grotesk',  bodyFont: 'Space Grotesk',     swatches: ['#1c2a8c','#991b1b','#14532d','#a16207','#0f172a','#182a64','#7e22ce','#7c4614'], darkMode: true,  borderRadius: '0.25rem' },
  { id: 'pulse',  name: 'Pulse',  desc: 'CoinPulse-inspired · dark glass', font: 'DM Sans',       bodyFont: 'DM Sans',           swatches: ['#071018','#27e0a3','#2bb8ff','#8b7bff','#ff627e','#ffb84d','#0b1d2d','#12283d'], darkMode: true,  borderRadius: '0.625rem' },
];

export const THEME_NAMES: Record<string, string> = { t1: 'Theme 1', t2: 'Theme 2', t3: 'Theme 3', t4: 'Theme 4', t5: 'Theme 5' };

// Maps layout+theme → [primary, secondary, accent/success, destructive, info, pink, warning, dark]
export const THEME_COLORS: Record<string, Record<string, string[]>> = {
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

export const FONTS = ['Inter','JetBrains Mono','Space Grotesk','Sora','Plus Jakarta Sans','DM Sans','Outfit','Fira Code','IBM Plex Mono','Roboto'];
export const FONT_SIZES = [9,10,11,12,13,14];
export const VISION_PROFILES = ['standard','comfortable','compact','large'] as const;

// ── Settings shape ──
export interface AppSettings {
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
  logLevel: 'error' | 'warn' | 'info';
}

const DEFAULT_SETTINGS: AppSettings = {
  layout: 'flux', theme: 't1',
  lowStockThreshold: 5000, priceAlertThreshold: 2,
  allowInvalidTrades: true,
  ledgerFont: 'Inter', ledgerFontSize: 11,
  fontVisionProfile: 'standard', autoFontDisable: false,
  autoBackup: false, logsEnabled: true, logLevel: 'info',
};

// ── Log entry ──
export interface LogEntry {
  id: string;
  ts: number;
  level: 'error' | 'warn' | 'info';
  message: string;
  detail?: string;
}

// ── Context shape ──
interface ThemeContextValue {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  save: () => void;
  discard: () => void;
  isDirty: boolean;
  currentLayout: LayoutDef;
  currentThemeColors: string[];
  // Logs
  logs: LogEntry[];
  addLog: (level: LogEntry['level'], message: string, detail?: string) => void;
  clearLogs: () => void;
  downloadLogs: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ── Hex to HSL converter ──
function hexToHSL(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function loadSavedSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('tracker_settings');
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function loadLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem('tracker_logs');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

// ── Vision profile → font size multiplier ──
function visionMultiplier(profile: string): number {
  switch (profile) {
    case 'compact': return 0.9;
    case 'comfortable': return 1.1;
    case 'large': return 1.25;
    default: return 1;
  }
}

// ── Apply CSS variables to document ──
function applyThemeToDOM(settings: AppSettings) {
  const root = document.documentElement;
  const layout = LAYOUTS.find(l => l.id === settings.layout) || LAYOUTS[0];
  const themeColors = (THEME_COLORS[settings.layout] || THEME_COLORS.flux)[settings.theme];
  if (!themeColors) return;

  // [primary, secondary, success, destructive, info, pink, warning, dark]
  const [primary, secondary, success, destructive, info, , warning] = themeColors;

  // Always dark mode for the tracker
  root.classList.add('dark');

  // Core color tokens
  root.style.setProperty('--primary', hexToHSL(primary));
  root.style.setProperty('--ring', hexToHSL(primary));
  root.style.setProperty('--accent', hexToHSL(success));
  root.style.setProperty('--destructive', hexToHSL(destructive));
  root.style.setProperty('--warning', hexToHSL(warning));
  root.style.setProperty('--success', hexToHSL(success));

  // Sidebar primary follows theme
  root.style.setProperty('--sidebar-primary', hexToHSL(primary));
  root.style.setProperty('--sidebar-ring', hexToHSL(primary));

  // Chart colors from theme
  root.style.setProperty('--chart-1', hexToHSL(primary));
  root.style.setProperty('--chart-2', hexToHSL(success));
  root.style.setProperty('--chart-3', hexToHSL(warning));
  root.style.setProperty('--chart-4', hexToHSL(secondary));
  root.style.setProperty('--chart-5', hexToHSL(destructive));

  // Info color (used by some chart/badge)
  root.style.setProperty('--info', hexToHSL(info));

  // Fonts
  root.style.setProperty('--font-display', `'${layout.font}', monospace`);
  root.style.setProperty('--font-body', `'${layout.bodyFont}', sans-serif`);

  // Ledger font  
  root.style.setProperty('--font-ledger', `'${settings.ledgerFont}', sans-serif`);

  // Font size with vision profile
  const mult = settings.autoFontDisable ? 1 : visionMultiplier(settings.fontVisionProfile);
  const effectiveSize = Math.round(settings.ledgerFontSize * mult);
  root.style.setProperty('--ledger-font-size', `${effectiveSize}px`);

  // Border radius per layout
  root.style.setProperty('--radius', layout.borderRadius);

  // Body font application
  document.body.style.fontFamily = `var(--font-body)`;
}

// ── Provider ──
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<AppSettings>(loadSavedSettings);
  const [draft, setDraft] = useState<AppSettings>(loadSavedSettings);
  const [dirty, setDirty] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>(loadLogs);
  const logsRef = useRef(logs);
  logsRef.current = logs;

  // Apply theme on every draft change (live preview)
  useEffect(() => {
    applyThemeToDOM(draft);
  }, [draft]);

  // Apply on mount
  useEffect(() => {
    applyThemeToDOM(saved);
    // Load Google Fonts for all layouts
    const fonts = [...new Set(LAYOUTS.map(l => l.font).concat(FONTS))];
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${fonts.map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;800`).join('&')}&display=swap`;
    document.head.appendChild(link);
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setDraft(prev => {
      const next = { ...prev, ...patch };
      return next;
    });
    setDirty(true);
  }, []);

  const save = useCallback(() => {
    localStorage.setItem('tracker_settings', JSON.stringify(draft));
    setSaved(draft);
    setDirty(false);
  }, [draft]);

  const discard = useCallback(() => {
    setDraft(saved);
    setDirty(false);
    applyThemeToDOM(saved);
  }, [saved]);

  // Logging
  const addLog = useCallback((level: LogEntry['level'], message: string, detail?: string) => {
    const settingsNow = draft;
    if (!settingsNow.logsEnabled) return;
    const levels: Record<string, number> = { error: 0, warn: 1, info: 2 };
    if (levels[level] > levels[settingsNow.logLevel]) return;

    const entry: LogEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ts: Date.now(),
      level,
      message,
      detail,
    };
    setLogs(prev => {
      const next = [entry, ...prev].slice(0, 500);
      localStorage.setItem('tracker_logs', JSON.stringify(next));
      return next;
    });
  }, [draft]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    localStorage.setItem('tracker_logs', '[]');
  }, []);

  const downloadLogs = useCallback(() => {
    const content = JSON.stringify(logsRef.current, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tracker-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }, []);

  const currentLayout = LAYOUTS.find(l => l.id === draft.layout) || LAYOUTS[0];
  const currentThemeColors = (THEME_COLORS[draft.layout] || THEME_COLORS.flux)[draft.theme] || THEME_COLORS.flux.t1;

  return (
    <ThemeContext.Provider value={{
      settings: draft,
      update,
      save,
      discard,
      isDirty: dirty,
      currentLayout,
      currentThemeColors,
      logs,
      addLog,
      clearLogs,
      downloadLogs,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
