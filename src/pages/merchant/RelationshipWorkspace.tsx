import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { relationships as relApi, messages as msgApi, deals as dealsApi, approvals as approvalsApi, audit as auditApi } from '@/lib/api';
import { getDemoMode, DEMO_USER } from '@/lib/demo-mode';
import { DEMO_RELATIONSHIPS, getDemoDeals, getDemoMessages, DEMO_APPROVALS_INBOX, DEMO_APPROVALS_SENT } from '@/lib/network-demo-data';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/layout/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Send, Users, Briefcase, DollarSign, CheckSquare, Shield, MessageSquare, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import type { MerchantRelationship, MerchantMessage, MerchantDeal, MerchantApproval, AuditLog } from '@/types/domain';

export default function RelationshipWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { userId } = useAuth();
  const [rel, setRel] = useState<MerchantRelationship | null>(null);
  const [msgs, setMsgs] = useState<MerchantMessage[]>([]);
  const [relDeals, setRelDeals] = useState<MerchantDeal[]>([]);
  const [relApprovals, setRelApprovals] = useState<MerchantApproval[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        if (getDemoMode()) {
          const demoRel = DEMO_RELATIONSHIPS.find(r => r.id === id) || null;
          setRel(demoRel);
          setMsgs(getDemoMessages(id));
          setRelDeals(getDemoDeals(id));
          const allApprovals = [...DEMO_APPROVALS_INBOX, ...DEMO_APPROVALS_SENT].filter(a => a.relationship_id === id);
          setRelApprovals(allApprovals);
        } else {
          const [r, m, d] = await Promise.all([
            relApi.get(id),
            msgApi.list(id),
            dealsApi.list(id),
          ]);
          setRel(r.relationship);
          setMsgs(m.messages);
          setRelDeals(d.deals);
        }
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const sendMessage = async () => {
    if (!msgInput.trim() || !id) return;
    try {
      if (getDemoMode()) {
        const newMsg: MerchantMessage = {
          id: `msg-${Date.now()}`,
          relationship_id: id,
          sender_user_id: DEMO_USER.user_id,
          sender_merchant_id: 'demo-merchant-001',
          body: msgInput.trim(),
          message_type: 'text',
          metadata: {},
          is_read: true,
          created_at: new Date().toISOString(),
          sender_name: 'Demo Trader',
        };
        setMsgs(prev => [...prev, newMsg]);
        setMsgInput('');
        return;
      }
      const { message } = await msgApi.send(id, msgInput.trim());
      setMsgs(prev => [...prev, message]);
      setMsgInput('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleApproveLocal = async (approvalId: string) => {
    if (getDemoMode()) {
      setRelApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, status: 'approved' as const } : a));
      toast.success('Approved');
      return;
    }
    try {
      await approvalsApi.approve(approvalId);
      toast.success('Approved');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleRejectLocal = async (approvalId: string) => {
    if (getDemoMode()) {
      setRelApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, status: 'rejected' as const } : a));
      toast.success('Rejected');
      return;
    }
    try {
      await approvalsApi.reject(approvalId);
      toast.success('Rejected');
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!rel) return <div className="p-6 text-center text-muted-foreground">Relationship not found</div>;

  const statusColors: Record<string, string> = {
    active: 'bg-success text-success-foreground',
    restricted: 'bg-warning text-warning-foreground',
    suspended: 'bg-destructive text-destructive-foreground',
  };

  const approvalStatusColors: Record<string, string> = {
    pending: 'bg-warning text-warning-foreground',
    approved: 'bg-success text-success-foreground',
    rejected: 'bg-destructive text-destructive-foreground',
  };

  const dealStatusColors: Record<string, string> = {
    active: 'bg-success text-success-foreground',
    due: 'bg-warning text-warning-foreground',
    settled: 'bg-primary text-primary-foreground',
    closed: 'bg-secondary text-secondary-foreground',
    overdue: 'bg-destructive text-destructive-foreground',
  };

  return (
    <div>
      <PageHeader title={rel.counterparty?.display_name || 'Workspace'} description={`Merchant ID: ${rel.counterparty?.merchant_id} • Role: ${rel.my_role}`}>
        <Badge className={statusColors[rel.status] || 'bg-muted text-muted-foreground'}>{rel.status}</Badge>
      </PageHeader>

      <div className="p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Deals" value={rel.summary?.totalDeals || 0} icon={Briefcase} />
          <StatCard label="Active Exposure" value={`$${(rel.summary?.activeExposure || 0).toLocaleString()}`} icon={DollarSign} />
          <StatCard label="Realized Profit" value={`$${(rel.summary?.realizedProfit || 0).toLocaleString()}`} icon={Users} />
          <StatCard label="Pending Approvals" value={rel.summary?.pendingApprovals || 0} icon={CheckSquare} />
        </div>

        {/* Workspace Tabs */}
        <Tabs defaultValue="messages">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="messages">
              Messages
              {msgs.filter(m => !m.is_read && m.sender_user_id !== userId).length > 0 && (
                <Badge className="ml-1.5 bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                  {msgs.filter(m => !m.is_read && m.sender_user_id !== userId).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="deals">Deals ({relDeals.length})</TabsTrigger>
            <TabsTrigger value="approvals">Approvals ({relApprovals.filter(a => a.status === 'pending').length})</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Card className="glass">
              <CardHeader><CardTitle className="text-sm font-display">Relationship Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize">{rel.relationship_type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Your Role</span><span className="capitalize">{rel.my_role}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shared Fields</span><span>{rel.shared_fields?.join(', ') || 'All'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{new Date(rel.created_at).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Last Updated</span><span>{new Date(rel.updated_at).toLocaleDateString()}</span></div>
                {rel.approval_policy && (
                  <>
                    <div className="border-t border-border pt-2 mt-2">
                      <p className="text-xs font-mono uppercase text-muted-foreground mb-1">Approval Policy</p>
                    </div>
                    {Object.entries(rel.approval_policy).map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span>{String(val)}</span>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="mt-4">
            <Card className="glass">
              <CardContent className="p-0">
                <div className="h-80 overflow-y-auto p-4 space-y-3">
                  {msgs.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No messages yet — start the conversation!</p>}
                  {msgs.map(msg => (
                    <div key={msg.id} className={`flex ${msg.message_type === 'system' ? 'justify-center' : msg.sender_user_id === userId ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                        msg.message_type === 'system'
                          ? 'bg-muted text-muted-foreground text-center w-full text-xs italic'
                          : msg.sender_user_id === userId
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {msg.message_type !== 'system' && <p className="text-[10px] font-mono opacity-70 mb-0.5">{msg.sender_name || msg.sender_merchant_id}</p>}
                        <p>{msg.body}</p>
                        <p className="text-[10px] opacity-50 mt-0.5">{new Date(msg.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t p-3 flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  />
                  <Button onClick={sendMessage} size="icon"><Send className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deals" className="mt-4 space-y-3">
            {relDeals.length === 0 && <p className="text-center text-muted-foreground py-8">No deals in this relationship</p>}
            {relDeals.map(deal => (
              <Card key={deal.id} className="glass">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{deal.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{deal.deal_type}</Badge>
                        <Badge className={dealStatusColors[deal.status] || 'bg-muted text-muted-foreground'}>{deal.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>Issued: {deal.issue_date}</span>
                        {deal.due_date && <span>Due: {deal.due_date}</span>}
                        {deal.expected_return != null && <span>Expected: ${deal.expected_return.toLocaleString()}</span>}
                        {deal.realized_pnl != null && <span className="text-success">P&L: ${deal.realized_pnl.toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-lg">${deal.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{deal.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="approvals" className="mt-4 space-y-3">
            {relApprovals.length === 0 && <p className="text-center text-muted-foreground py-8">No approvals for this relationship</p>}
            {relApprovals.map(a => (
              <Card key={a.id} className="glass">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium capitalize">{a.type.replace(/_/g, ' ')}</p>
                      <Badge className={approvalStatusColors[a.status] || 'bg-muted text-muted-foreground'}>{a.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Target: {a.target_entity_type} • Submitted: {new Date(a.submitted_at).toLocaleDateString()}
                      {a.resolution_note && ` • ${a.resolution_note}`}
                    </p>
                    {a.proposed_payload && Object.keys(a.proposed_payload).length > 0 && (
                      <div className="mt-1.5 text-xs text-muted-foreground">
                        {Object.entries(a.proposed_payload).map(([k, v]) => (
                          <span key={k} className="mr-3">{k}: <span className="text-foreground">{String(v)}</span></span>
                        ))}
                      </div>
                    )}
                  </div>
                  {a.status === 'pending' && a.reviewer_user_id === userId && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApproveLocal(a.id)} className="gap-1"><Check className="w-3.5 h-3.5" /> Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => handleRejectLocal(a.id)} className="gap-1"><X className="w-3.5 h-3.5" /> Reject</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <Card className="glass">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Audit trail will populate as actions are performed.</p>
                <p className="text-xs mt-1">All deal changes, settlements, approvals, and messages are logged.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
