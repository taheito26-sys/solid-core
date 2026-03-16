import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Mail,
  Users,
  MessageSquare,
  CheckSquare,
  Briefcase,
  BarChart3,
  Shield,
  Settings,
  TrendingUp,
  ArrowLeftRight,
  Bell,
  LogOut,
  ChevronLeft,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

const merchantNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/merchant' },
  { label: 'Directory', icon: Search, path: '/merchant/directory' },
  { label: 'Invitations', icon: Mail, path: '/merchant/invitations' },
  { label: 'Relationships', icon: Users, path: '/merchant/relationships' },
  { label: 'Messages', icon: MessageSquare, path: '/merchant/messages' },
  { label: 'Approvals', icon: CheckSquare, path: '/merchant/approvals' },
  { label: 'Deals', icon: Briefcase, path: '/merchant/deals' },
  { label: 'Analytics', icon: BarChart3, path: '/merchant/analytics' },
  { label: 'Audit', icon: Shield, path: '/merchant/audit' },
  { label: 'Settings', icon: Settings, path: '/merchant/settings' },
];

const tradingNav = [
  { label: 'P2P Tracker', icon: TrendingUp, path: '/trading/p2p' },
  { label: 'Orders', icon: ArrowLeftRight, path: '/trading/orders' },
  { label: 'Stock', icon: Wallet, path: '/trading/stock' },
  { label: 'Calendar', icon: LayoutDashboard, path: '/trading/calendar' },
  { label: 'Portfolio', icon: Wallet, path: '/trading/portfolio' },
  { label: 'Trades', icon: ArrowLeftRight, path: '/trading/trades' },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      'h-screen flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm tracking-tight">TRACKER</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors">
          <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Profile */}
      {profile && !collapsed && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-xs font-mono text-sidebar-primary truncate">{profile.merchant_id}</p>
          <p className="text-sm font-medium truncate">{profile.display_name}</p>
          <p className="text-xs text-muted-foreground truncate">@{profile.nickname}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-1">
        {!collapsed && <p className="px-4 pt-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Merchant</p>}
        {merchantNav.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 mx-2 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {!collapsed && <p className="px-4 pt-5 pb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Trading</p>}
        {tradingNav.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 mx-2 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        <Link
          to="/notifications"
          className="flex items-center gap-3 mx-0 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent transition-colors"
        >
          <Bell className="w-4 h-4" />
          {!collapsed && <span>Notifications</span>}
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-destructive hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
