import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/layout/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Briefcase, CheckSquare, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';

export default function MerchantDashboard() {
  const { profile } = useAuth();

  return (
    <div>
      <PageHeader title="Merchant Dashboard" description={profile ? `Welcome back, ${profile.display_name}` : 'Overview of your merchant activity'} />

      <div className="p-6 space-y-6">
        {/* Merchant ID Banner */}
        {profile && (
          <div className="glass rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Your Merchant ID</p>
              <p className="text-lg font-display font-bold text-primary">{profile.merchant_id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">{profile.merchant_type}</Badge>
              <Badge className="bg-success text-success-foreground">{profile.status}</Badge>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Relationships" value="0" icon={Users} />
          <StatCard label="Active Deals" value="0" icon={Briefcase} />
          <StatCard label="Pending Approvals" value="0" icon={CheckSquare} />
          <StatCard label="Capital Deployed" value="$0" icon={DollarSign} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Realized Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold">$0.00</p>
              <p className="text-xs text-muted-foreground mt-1">Across all relationships</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Risk Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold text-success">0</p>
              <p className="text-xs text-muted-foreground mt-1">No overdue items</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Placeholder */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-sm font-display">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No recent activity yet.</p>
              <p className="text-xs mt-1">Start by discovering merchants in the Directory.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
