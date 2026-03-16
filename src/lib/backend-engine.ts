// ─── Backend Engine ─────────────────────────────────────────────────
// All business mutations go through this module.
// Produces audit logs, enforces constraints, and triggers side effects.

import { getStore, genId, genMerchantId, notifyChange } from './backend-store';
import { DEMO_USER, DEMO_PROFILE } from './demo-mode';
import type {
  MerchantProfile, MerchantInvite, MerchantRelationship,
  MerchantDeal, MerchantApproval, MerchantMessage, AuditLog,
  MerchantSearchResult, MerchantSettlement, ProfitRecord,
  RelationshipSummary,
} from '@/types/domain';

const now = () => new Date().toISOString();
const demoUserId = DEMO_USER.user_id;
const demoMerchantId = DEMO_PROFILE.id;

// ─── Helpers ────────────────────────────────────────────────────────
function addAuditLog(data: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
  const log: AuditLog = { id: genId('aud'), created_at: now(), ...data };
  getStore().auditLogs.unshift(log);
  return log;
}

function addSystemMessage(relationshipId: string, body: string): void {
  const msg: MerchantMessage = {
    id: genId('msg'), relationship_id: relationshipId,
    sender_user_id: 'system', sender_merchant_id: '',
    body, message_type: 'system', metadata: {}, is_read: false,
    created_at: now(),
  };
  getStore().messages.push(msg);
}

function getCounterpartyForRel(rel: MerchantRelationship): Partial<MerchantProfile> | undefined {
  const store = getStore();
  const counterpartyId = rel.merchant_a_id === demoMerchantId ? rel.merchant_b_id : rel.merchant_a_id;
  const m = store.merchants.find(x => x.id === counterpartyId);
  return m ? { display_name: m.display_name, merchant_id: m.merchant_id, nickname: m.nickname } : undefined;
}

function getMyRoleForRel(rel: MerchantRelationship): string {
  if (rel.relationship_type === 'lending') return rel.merchant_a_id === demoMerchantId ? 'lender' : 'borrower';
  if (rel.relationship_type === 'capital') return rel.merchant_a_id === demoMerchantId ? 'capital_provider' : 'borrower';
  return rel.merchant_a_id === demoMerchantId ? 'partner_a' : 'partner_b';
}

// ─── Computed Summaries ─────────────────────────────────────────────
export function computeRelSummary(relId: string): RelationshipSummary {
  const store = getStore();
  const relDeals = store.deals.filter(d => d.relationship_id === relId);
  const activeDeals = relDeals.filter(d => ['active', 'due', 'overdue'].includes(d.status));
  const pendingApprovals = store.approvals.filter(a => a.relationship_id === relId && a.status === 'pending').length;

  return {
    totalDeals: relDeals.length,
    activeExposure: activeDeals.reduce((s, d) => s + d.amount, 0),
    realizedProfit: relDeals.reduce((s, d) => s + (d.realized_pnl || 0), 0),
    pendingApprovals,
  };
}

export function enrichRelationship(rel: MerchantRelationship): MerchantRelationship {
  return {
    ...rel,
    counterparty: getCounterpartyForRel(rel),
    my_role: getMyRoleForRel(rel),
    summary: computeRelSummary(rel.id),
  };
}

// ─── Merchant Search ────────────────────────────────────────────────
export function searchMerchants(query: string): MerchantSearchResult[] {
  const q = query.toLowerCase();
  return getStore().merchants
    .filter(m => m.id !== demoMerchantId)
    .filter(m =>
      m.display_name.toLowerCase().includes(q) ||
      m.nickname.toLowerCase().includes(q) ||
      m.merchant_id.toLowerCase().includes(q)
    )
    .map(m => ({
      id: m.id, merchant_id: m.merchant_id, nickname: m.nickname,
      display_name: m.display_name, merchant_type: m.merchant_type, region: m.region,
    }));
}

// ─── Invite Engine ──────────────────────────────────────────────────
export function sendInvite(data: {
  to_merchant_id: string; purpose?: string; requested_role?: string;
  message?: string; requested_scope?: string[];
}): MerchantInvite {
  const store = getStore();
  const toMerchant = store.merchants.find(m => m.id === data.to_merchant_id);
  if (!toMerchant) throw new Error('Merchant not found');
  if (data.to_merchant_id === demoMerchantId) throw new Error('Cannot invite yourself');

  // Check existing relationship
  const existingRel = store.relationships.find(r =>
    (r.merchant_a_id === demoMerchantId && r.merchant_b_id === data.to_merchant_id) ||
    (r.merchant_b_id === demoMerchantId && r.merchant_a_id === data.to_merchant_id)
  );
  if (existingRel && ['active', 'restricted'].includes(existingRel.status)) {
    throw new Error('Relationship already exists');
  }

  // Check pending invite
  const existingInvite = store.invites.find(i =>
    i.status === 'pending' &&
    ((i.from_merchant_id === demoMerchantId && i.to_merchant_id === data.to_merchant_id) ||
     (i.to_merchant_id === demoMerchantId && i.from_merchant_id === data.to_merchant_id))
  );
  if (existingInvite) throw new Error('Invite already pending');

  const invite: MerchantInvite = {
    id: genId('inv'), from_merchant_id: demoMerchantId, to_merchant_id: data.to_merchant_id,
    status: 'pending', purpose: data.purpose || 'General collaboration',
    requested_role: data.requested_role || 'partner', message: data.message || '',
    requested_scope: data.requested_scope || ['deals', 'messages'],
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    created_at: now(), updated_at: now(),
    to_display_name: toMerchant.display_name, to_nickname: toMerchant.nickname,
    to_public_id: toMerchant.merchant_id,
  };
  store.invites.push(invite);

  addAuditLog({
    relationship_id: null, actor_user_id: demoUserId, actor_merchant_id: demoMerchantId,
    entity_type: 'invite', entity_id: invite.id, action: 'invite_sent',
    detail_json: { to: toMerchant.display_name, purpose: invite.purpose },
  });

  notifyChange();
  return invite;
}

export function acceptInvite(inviteId: string): { relationship_id: string } {
  const store = getStore();
  const invite = store.invites.find(i => i.id === inviteId);
  if (!invite) throw new Error('Invite not found');
  if (invite.status !== 'pending') throw new Error('Invite is not pending');

  invite.status = 'accepted';
  invite.updated_at = now();

  // Create relationship
  const fromMerchant = store.merchants.find(m => m.id === invite.from_merchant_id);
  const relType = invite.purpose?.toLowerCase().includes('lend') ? 'lending'
    : invite.purpose?.toLowerCase().includes('capital') ? 'capital'
    : invite.purpose?.toLowerCase().includes('arb') ? 'arbitrage'
    : 'general';

  const rel: MerchantRelationship = {
    id: genId('rel'),
    merchant_a_id: invite.from_merchant_id, merchant_b_id: invite.to_merchant_id,
    invite_id: invite.id, relationship_type: relType as any, status: 'active',
    shared_fields: invite.requested_scope || ['deals', 'messages'],
    approval_policy: { settlement_submit: 'both' },
    created_at: now(), updated_at: now(),
  };
  store.relationships.push(rel);

  addAuditLog({
    relationship_id: rel.id, actor_user_id: demoUserId, actor_merchant_id: demoMerchantId,
    entity_type: 'invite', entity_id: invite.id, action: 'invite_accepted',
    detail_json: { from: fromMerchant?.display_name, relationship_id: rel.id },
  });
  addAuditLog({
    relationship_id: rel.id, actor_user_id: demoUserId, actor_merchant_id: demoMerchantId,
    entity_type: 'relationship', entity_id: rel.id, action: 'relationship_created',
    detail_json: { counterparty: fromMerchant?.display_name, type: rel.relationship_type },
  });

  // System message
  addSystemMessage(rel.id, `🤝 Relationship established with ${fromMerchant?.display_name || 'Unknown'}`);

  notifyChange();
  return { relationship_id: rel.id };
}

export function rejectInvite(inviteId: string): void {
  const store = getStore();
  const invite = store.invites.find(i => i.id === inviteId);
  if (!invite || invite.status !== 'pending') throw new Error('Invalid invite');
  invite.status = 'rejected';
  invite.updated_at = now();

  addAuditLog({
    relationship_id: null, actor_user_id: demoUserId, actor_merchant_id: demoMerchantId,
    entity_type: 'invite', entity_id: invite.id, action: 'invite_rejected', detail_json: {},
  });
  notifyChange();
}

export function withdrawInvite(inviteId: string): void {
  const store = getStore();
  const invite = store.invites.find(i => i.id === inviteId);
  if (!invite || invite.status !== 'pending') throw new Error('Invalid invite');
  invite.status = 'withdrawn';
  invite.updated_at = now();

  addAuditLog({
    relationship_id: null, actor_user_id: demoUserId, actor_merchant_id: demoMerchantId,
    entity_type: 'invite', entity_id: invite.id, action: 'invite_withdrawn', detail_json: {},
  });
  notifyChange();
}

// ─── Deal Engine ────────────────────────────────────────────────────
export function createDeal(data: {
  relationship_id: string; deal_type: string; title: string;
  amount: number; currency?: string; due_date?: string; expected_return?: number;
}): MerchantDeal {
  const store = getStore();
  const rel = store.relationships.find(r => r.id === data.relationship_id);
  if (!rel) throw new Error('Relationship not found');

  const deal: MerchantDeal = {
    id: genId('deal'), relationship_id: data.relationship_id,
    deal_type: data.deal_type as any, title: data.title,
    amount: data.amount, currency: data.currency || 'USDT',
    status: 'draft', metadata: {}, issue_date: now().split('T')[0],
    due_date: data.due_date || null, close_date: null,
    expected_return: data.expected_return || null, realized_pnl: null,
    created_by: demoUserId, created_at: now(), updated_at: now(),
  };
  store.deals.push(deal);

  addAuditLog({
    relationship_id: data.relationship_id, actor_user_id: demoUserId, actor_merchant_id: demoMerchantId,
    entity_type: 'deal', entity_id: deal.id, action: 'deal_created',
    detail_json: { title: deal.title, amount: deal.amount, type: deal.deal_type },
  });
  addSystemMessage(data.relationship_id, `📋 New deal created: "${deal.title}" — ${deal.amount} ${deal.currency}`);

  notifyChange();
  return deal;
}

export function activateDeal(dealId: string): MerchantDeal {
  const store = getStore();
  const deal = store.deals.find(d => d.id === dealId);
  if (!deal) throw new Error('Deal not found');
  if (deal.status !== 'draft') throw new Error('Only draft deals can be activated');
  deal.status = 'active';
  deal.updated_at = now();

  addAuditLog({
    relationship_id: deal.relationship_id, actor_user_id: demoUserId, actor_merchant_id: demoMerchantId,
    entity_type: 'deal', entity_id: deal.id, action: 'deal_activated',
    detail_json: { title: deal.title },
  });
  addSystemMessage(deal.relationship_id, `✅ Deal "${deal.title}" is now active`);
  notifyChange();
  return deal;
}

export function submitSettlement(dealId: string, data: {
  amount: number; currency?: string; note?: string;
}): { settlement_id: string; approval_id: string } {
  const store = getStore();
  const deal = store.deals.find(d => d.id === dealId);
  if (!deal) throw new Error('Deal not found');

  const rel = store.relationships.find(r => r.id === deal.relationship_id);
  if (!rel) throw new Error('Relationship not found');

  // Determine reviewer (counterparty)
  const reviewerMerchant = rel.merchant_a_id === demoMerchantId ? rel.merchant_b_id : rel.merchant_a_id;
  const reviewerUser = store.merchants.find(m => m.id === reviewerMerchant)?.owner_user_id || reviewerMerchant;

  const settlement: MerchantSettlement = {
    id: genId('stl'), relationship_id: deal.relationship_id, deal_id: dealId,
    submitted_by_user_id: demoUserId, amount: data.amount,
    currency: data.currency || deal.currency, note: data.note || '',
    status: 'pending', submitted_at: now(), approved_at: null,
    created_at: now(), updated_at: now(),
  };
  store.settlements.push(settlement);

  const approval: MerchantApproval = {
    id: genId('apr'), relationship_id: deal.relationship_id, type: 'settlement_submit',
    target_entity_type: 'settlement', target_entity_id: settlement.id,
    proposed_payload: { amount: data.amount, currency: settlement.currency, note: data.note || '', deal_id: dealId, deal_title: deal.title },
    status: 'pending', submitted_by_user_id: demoUserId, submitted_by_merchant_id: demoMerchantId,
    reviewer_user_id: reviewerUser, resolution_note: null,
    submitted_at: now(), resolved_at: null, created_at: now(), updated_at: now(),
  };
  store.approvals.push(approval);

  addAuditLog({
    relationship_id: deal.relationship_id, actor_user_id: demoUserId, actor_merchant_id: demoMerchantId,
    entity_type: 'settlement', entity_id: settlement.id, action: 'settlement_submitted',
    detail_json: { amount: data.amount, deal: deal.title },
  });
  addSystemMessage(deal.relationship_id, `📋 Settlement submitted for "${deal.title}" — ${data.amount} ${settlement.currency} (pending approval)`);

  notifyChange();
  return { settlement_id: settlement.id, approval_id: approval.id };
}

export function recordProfit(dealId: string, data: {
  amount: number; period_key?: string; currency?: string; note?: string;
}): { profit_id: string; approval_id: string } {
  const store = getStore();
  const deal = store.deals.find(d => d.id === dealId);
  if (!deal) throw new Error('Deal not found');

  const rel = store.relationships.find(r => r.id === deal.relationship_id);
  if (!rel) throw new Error('Relationship not found');

  const reviewerMerchant = rel.merchant_a_id === demoMerchantId ? rel.merchant_b_id : rel.merchant_a_id;
  const reviewerUser = store.merchants.find(m => m.id === reviewerMerchant)?.owner_user_id || reviewerMerchant;

  const pr: ProfitRecord = {
    id: genId('prf'), relationship_id: deal.relationship_id, deal_id: dealId,
    period_key: data.period_key || new Date().toISOString().substring(0, 7),
    amount: data.amount, currency: data.currency || deal.currency,
    note: data.note || '', status: 'pending', submitted_by_user_id: demoUserId,
    approved_at: null, created_at: now(), updated_at: now(),
  };
  store.profitRecords.push(pr);

  const approval: MerchantApproval = {
    id: genId('apr'), relationship_id: deal.relationship_id, type: 'profit_record_submit',
    target_entity_type: 'profit_record', target_entity_id: pr.id,
    proposed_payload: { amount: data.amount, period_key: pr.period_key, currency: pr.currency, deal_id: dealId, deal_title: deal.title },
    status: 'pending', submitted_by_user_id: demoUserId, submitted_by_merchant_id: demoMerchantId,
    reviewer_user_id: reviewerUser, resolution_note: null,
    submitted_at: now(), resolved_at: null, created_at: now(), updated_at: now(),
  };
  store.approvals.push(approval);

  addAuditLog({
    relationship_id: deal.relationship_id, actor_user_id: demoUserId, actor_merchant_id: demoMerchantId,
    entity_type: 'profit_record', entity_id: pr.id, action: 'profit_recorded',
    detail_json: { amount: data.amount, period: pr.period_key, deal: deal.title },
  });
  addSystemMessage(deal.relationship_id, `📊 Profit recorded for "${deal.title}" — ${data.amount} ${pr.currency} (${pr.period_key})`);

  notifyChange();
  return { profit_id: pr.id, approval_id: approval.id };
}

export function requestDealClose(dealId: string): { approval_id: string } {
  const store = getStore();
  const deal = store.deals.find(d => d.id === dealId);
  if (!deal) throw new Error('Deal not found');
  if (['closed', 'settled', 'cancelled'].includes(deal.status)) throw new Error('Deal already closed');

  const rel = store.relationships.find(r => r.id === deal.relationship_id);
  if (!rel) throw new Error('Relationship not found');

  const reviewerMerchant = rel.merchant_a_id === demoMerchantId ? rel.merchant_b_id : rel.merchant_a_id;
  const reviewerUser = store.merchants.find(m => m.id === reviewerMerchant)?.owner_user_id || reviewerMerchant;

  const approval: MerchantApproval = {
    id: genId('apr'), relationship_id: deal.relationship_id, type: 'deal_close',
    target_entity_type: 'deal', target_entity_id: deal.id,
    proposed_payload: { deal_title: deal.title, close_date: now().split('T')[0] },
    status: 'pending', submitted_by_user_id: demoUserId, submitted_by_merchant_id: demoMerchantId,
    reviewer_user_id: reviewerUser, resolution_note: null,
    submitted_at: now(), resolved_at: null, created_at: now(), updated_at: now(),
  };
  store.approvals.push(approval);

  addAuditLog({
    relationship_id: deal.relationship_id, actor_user_id: demoUserId, actor_merchant_id: demoMerchantId,
    entity_type: 'deal', entity_id: deal.id, action: 'deal_close_requested',
    detail_json: { title: deal.title },
  });
  addSystemMessage(deal.relationship_id, `🔒 Close requested for deal "${deal.title}" — pending approval`);

  notifyChange();
  return { approval_id: approval.id };
}

// ─── Approval Engine ────────────────────────────────────────────────
export function approveRequest(approvalId: string, note?: string): void {
  const store = getStore();
  const approval = store.approvals.find(a => a.id === approvalId);
  if (!approval) throw new Error('Approval not found');
  if (approval.status !== 'pending') throw new Error('Approval already resolved');

  approval.status = 'approved';
  approval.resolution_note = note || null;
  approval.resolved_at = now();
  approval.updated_at = now();

  // Apply business mutation based on type
  switch (approval.type) {
    case 'settlement_submit': {
      const settlement = store.settlements.find(s => s.id === approval.target_entity_id);
      if (settlement) {
        settlement.status = 'approved';
        settlement.approved_at = now();
        settlement.updated_at = now();

        // Update deal P&L
        const dealId = (approval.proposed_payload as any).deal_id || settlement.deal_id;
        const deal = store.deals.find(d => d.id === dealId);
        if (deal) {
          deal.realized_pnl = (deal.realized_pnl || 0) + (settlement.amount - deal.amount);
          deal.status = 'settled';
          deal.close_date = now().split('T')[0];
          deal.updated_at = now();
        }
      }
      break;
    }
    case 'profit_record_submit': {
      const pr = store.profitRecords.find(p => p.id === approval.target_entity_id);
      if (pr) {
        pr.status = 'approved';
        pr.approved_at = now();
        pr.updated_at = now();

        const dealId = (approval.proposed_payload as any).deal_id || pr.deal_id;
        const deal = store.deals.find(d => d.id === dealId);
        if (deal) {
          deal.realized_pnl = (deal.realized_pnl || 0) + pr.amount;
          deal.updated_at = now();
        }
      }
      break;
    }
    case 'capital_adjustment': {
      const dealId = approval.target_entity_id;
      const deal = store.deals.find(d => d.id === dealId);
      if (deal) {
        const adj = (approval.proposed_payload as any).adjustment || 0;
        deal.amount = Math.max(0, deal.amount + adj);
        deal.updated_at = now();
      }
      break;
    }
    case 'deal_close': {
      const deal = store.deals.find(d => d.id === approval.target_entity_id);
      if (deal) {
        deal.status = 'closed';
        deal.close_date = now().split('T')[0];
        deal.updated_at = now();
      }
      break;
    }
  }

  addAuditLog({
    relationship_id: approval.relationship_id, actor_user_id: demoUserId, actor_merchant_id: demoMerchantId,
    entity_type: 'approval', entity_id: approval.id, action: 'approval_approved',
    detail_json: { type: approval.type, note },
  });
  addSystemMessage(approval.relationship_id, `✅ ${approval.type.replace(/_/g, ' ')} approved${note ? `: ${note}` : ''}`);

  notifyChange();
}

export function rejectRequest(approvalId: string, note?: string): void {
  const store = getStore();
  const approval = store.approvals.find(a => a.id === approvalId);
  if (!approval) throw new Error('Approval not found');
  if (approval.status !== 'pending') throw new Error('Approval already resolved');

  approval.status = 'rejected';
  approval.resolution_note = note || null;
  approval.resolved_at = now();
  approval.updated_at = now();

  // No business mutation on rejection

  addAuditLog({
    relationship_id: approval.relationship_id, actor_user_id: demoUserId, actor_merchant_id: demoMerchantId,
    entity_type: 'approval', entity_id: approval.id, action: 'approval_rejected',
    detail_json: { type: approval.type, note },
  });
  addSystemMessage(approval.relationship_id, `❌ ${approval.type.replace(/_/g, ' ')} rejected${note ? `: ${note}` : ''}`);

  notifyChange();
}

// ─── Messages ───────────────────────────────────────────────────────
export function sendMessage(relationshipId: string, body: string): MerchantMessage {
  const msg: MerchantMessage = {
    id: genId('msg'), relationship_id: relationshipId,
    sender_user_id: demoUserId, sender_merchant_id: demoMerchantId,
    body, message_type: 'text', metadata: {}, is_read: true,
    created_at: now(), sender_name: DEMO_PROFILE.display_name,
  };
  getStore().messages.push(msg);
  notifyChange();
  return msg;
}

export function getMessages(relationshipId: string): MerchantMessage[] {
  return getStore().messages
    .filter(m => m.relationship_id === relationshipId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

// ─── Queries ────────────────────────────────────────────────────────
export function getRelationships(): MerchantRelationship[] {
  return getStore().relationships
    .filter(r => r.merchant_a_id === demoMerchantId || r.merchant_b_id === demoMerchantId)
    .map(enrichRelationship);
}

export function getRelationship(id: string): MerchantRelationship | null {
  const rel = getStore().relationships.find(r => r.id === id);
  return rel ? enrichRelationship(rel) : null;
}

export function getDeals(relationshipId?: string): MerchantDeal[] {
  const store = getStore();
  let d = store.deals;
  if (relationshipId) d = d.filter(x => x.relationship_id === relationshipId);
  // Check overdue
  const today = new Date().toISOString().split('T')[0];
  d.forEach(deal => {
    if (deal.due_date && deal.due_date < today && ['active', 'due'].includes(deal.status)) {
      deal.status = 'overdue';
    }
  });
  return [...d].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getInvitesInbox(): MerchantInvite[] {
  return getStore().invites.filter(i => i.to_merchant_id === demoMerchantId);
}

export function getInvitesSent(): MerchantInvite[] {
  return getStore().invites.filter(i => i.from_merchant_id === demoMerchantId);
}

export function getApprovalsInbox(): MerchantApproval[] {
  return getStore().approvals.filter(a => a.reviewer_user_id === demoUserId);
}

export function getApprovalsSent(): MerchantApproval[] {
  return getStore().approvals.filter(a => a.submitted_by_user_id === demoUserId);
}

export function getAuditLogs(relationshipId?: string): AuditLog[] {
  const store = getStore();
  let logs = store.auditLogs;
  if (relationshipId) logs = logs.filter(l => l.relationship_id === relationshipId);
  return [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ─── Analytics Engine ───────────────────────────────────────────────
export interface PortfolioAnalytics {
  totalDeployed: number;
  activeDeployed: number;
  returnedCapital: number;
  realizedProfit: number;
  unsettledExposure: number;
  overdueDeals: number;
  activeRelationships: number;
  pendingApprovals: number;
  // Capital owner view
  capitalByCounterparty: { name: string; deployed: number; returned: number; profit: number; roi: number }[];
  // Deal breakdown
  dealsByType: Record<string, number>;
  // Risk
  riskIndicators: { type: string; severity: 'high' | 'medium' | 'low'; message: string }[];
}

export function computeAnalytics(): PortfolioAnalytics {
  const store = getStore();
  const myRels = store.relationships.filter(r =>
    r.merchant_a_id === demoMerchantId || r.merchant_b_id === demoMerchantId
  );
  const myDeals = store.deals.filter(d => myRels.some(r => r.id === d.relationship_id));

  const activeDeals = myDeals.filter(d => ['active', 'due', 'overdue'].includes(d.status));
  const settledDeals = myDeals.filter(d => ['settled', 'closed'].includes(d.status));
  const overdueDeals = myDeals.filter(d => d.status === 'overdue');

  const totalDeployed = myDeals.reduce((s, d) => s + d.amount, 0);
  const activeDeployed = activeDeals.reduce((s, d) => s + d.amount, 0);
  const returnedCapital = settledDeals.reduce((s, d) => s + d.amount, 0);
  const realizedProfit = myDeals.reduce((s, d) => s + (d.realized_pnl || 0), 0);
  const unsettledExposure = activeDeals.reduce((s, d) => s + d.amount, 0);

  // Capital by counterparty
  const counterpartyMap = new Map<string, { name: string; deployed: number; returned: number; profit: number }>();
  for (const rel of myRels) {
    const cp = rel.merchant_a_id === demoMerchantId ? rel.merchant_b_id : rel.merchant_a_id;
    const cpProfile = store.merchants.find(m => m.id === cp);
    const cpName = cpProfile?.display_name || cp;
    const relDeals = myDeals.filter(d => d.relationship_id === rel.id);
    const deployed = relDeals.reduce((s, d) => s + d.amount, 0);
    const returned = relDeals.filter(d => ['settled', 'closed'].includes(d.status)).reduce((s, d) => s + d.amount, 0);
    const profit = relDeals.reduce((s, d) => s + (d.realized_pnl || 0), 0);
    counterpartyMap.set(cp, { name: cpName, deployed, returned, profit });
  }
  const capitalByCounterparty = [...counterpartyMap.values()].map(c => ({
    ...c, roi: c.deployed > 0 ? (c.profit / c.deployed) * 100 : 0,
  }));

  // Deal type breakdown
  const dealsByType: Record<string, number> = {};
  for (const d of myDeals) {
    dealsByType[d.deal_type] = (dealsByType[d.deal_type] || 0) + 1;
  }

  // Risk indicators
  const riskIndicators: PortfolioAnalytics['riskIndicators'] = [];
  if (overdueDeals.length > 0) {
    riskIndicators.push({
      type: 'overdue', severity: 'high',
      message: `${overdueDeals.length} deal(s) overdue — total exposure: $${overdueDeals.reduce((s, d) => s + d.amount, 0).toLocaleString()}`,
    });
  }
  // Concentration risk
  for (const [, cp] of counterpartyMap) {
    const pct = totalDeployed > 0 ? (cp.deployed / totalDeployed) * 100 : 0;
    if (pct > 50) {
      riskIndicators.push({
        type: 'concentration', severity: 'medium',
        message: `${cp.name} represents ${pct.toFixed(0)}% of total exposure`,
      });
    }
  }
  // Pending approvals
  const pendingApprovals = store.approvals.filter(a => a.status === 'pending' && a.reviewer_user_id === demoUserId).length;
  if (pendingApprovals > 3) {
    riskIndicators.push({
      type: 'backlog', severity: 'low',
      message: `${pendingApprovals} pending approvals — review queue growing`,
    });
  }

  return {
    totalDeployed, activeDeployed, returnedCapital, realizedProfit,
    unsettledExposure, overdueDeals: overdueDeals.length,
    activeRelationships: myRels.filter(r => r.status === 'active').length,
    pendingApprovals, capitalByCounterparty, dealsByType, riskIndicators,
  };
}
