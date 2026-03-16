import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { merchant as merchantApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    merchant_type: profile?.merchant_type || 'independent',
    region: profile?.region || '',
    default_currency: profile?.default_currency || 'USDT',
    discoverability: profile?.discoverability || 'public',
    bio: profile?.bio || '',
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      await merchantApi.updateProfile(form);
      await refreshProfile();
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" description="Manage your merchant profile" />
      <div className="p-6 max-w-2xl space-y-6">
        <Card className="glass">
          <CardHeader><CardTitle className="text-sm font-display">Profile Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {profile && (
              <div className="p-3 rounded-md bg-muted">
                <p className="text-xs font-mono text-muted-foreground">Merchant ID (immutable)</p>
                <p className="font-display font-bold text-primary">{profile.merchant_id}</p>
                <p className="text-xs text-muted-foreground mt-1">Nickname: @{profile.nickname}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Merchant Type</Label>
                <Select value={form.merchant_type} onValueChange={v => setForm(f => ({ ...f, merchant_type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="independent">Independent</SelectItem>
                    <SelectItem value="desk">Desk</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={form.default_currency} onChange={e => setForm(f => ({ ...f, default_currency: e.target.value.toUpperCase() }))} />
              </div>
              <div className="space-y-2">
                <Label>Discoverability</Label>
                <Select value={form.discoverability} onValueChange={v => setForm(f => ({ ...f, discoverability: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="merchant_id_only">Merchant ID Only</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} maxLength={500} rows={3} />
            </div>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
