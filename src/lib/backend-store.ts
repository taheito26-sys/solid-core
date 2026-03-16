// ─── Mutable In-Memory Backend Store ────────────────────────────────
// Simulates D1 database. All mutations go through backend-engine.ts.
// Seeded with demo data, but fully mutable within a session.

import type {
  MerchantProfile, MerchantSearchResult, MerchantInvite,
  MerchantRelationship, MerchantDeal, MerchantApproval,
  MerchantMessage, MerchantNotification, AuditLog,
  MerchantSettlement, ProfitRecord,
} from '@/types/domain';
import { DEMO_USER, DEMO_PROFILE } from './demo-mode';

// ─── ID Generator ───────────────────────────────────────────────────
let _seq = 1000;
export function genId(prefix: string): string {
  return `${prefix}-${(++_seq).toString().padStart(4, '0')}`;
}

export function genMerchantId(): string {
  return `MRC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

// ─── Store Tables ───────────────────────────────────────────────────
export interface Store {
  merchants: MerchantProfile[];
  invites: MerchantInvite[];
  relationships: MerchantRelationship[];
  deals: MerchantDeal[];
  approvals: MerchantApproval[];
  messages: MerchantMessage[];
  settlements: MerchantSettlement[];
  profitRecords: ProfitRecord[];
  auditLogs: AuditLog[];
  notifications: MerchantNotification[];
}

// ─── Seed Data ──────────────────────────────────────────────────────
function createSeedStore(): Store {
  const demoMerchantId = DEMO_PROFILE.id;
  const demoUserId = DEMO_USER.user_id;

  const merchants: MerchantProfile[] = [
    { ...DEMO_PROFILE },
    {
      id: 'mrc-002', owner_user_id: 'gulf-user-001', merchant_id: 'MRC-00000002',
      nickname: 'gulf_exchange', display_name: 'Gulf Exchange Co.', merchant_type: 'desk',
      region: 'Qatar', default_currency: 'USDT', discoverability: 'public', bio: 'Leading OTC desk in Qatar',
      status: 'active', created_at: '2025-06-01T00:00:00Z', updated_at: '2026-03-10T14:00:00Z',
    },
    {
      id: 'mrc-003', owner_user_id: 'doha-user-001', merchant_id: 'MRC-00000003',
      nickname: 'doha_otc', display_name: 'Doha OTC Trading', merchant_type: 'independent',
      region: 'Qatar', default_currency: 'USDT', discoverability: 'public', bio: 'P2P specialist',
      status: 'active', created_at: '2025-08-15T00:00:00Z', updated_at: '2026-03-12T09:30:00Z',
    },
    {
      id: 'mrc-004', owner_user_id: 'knight-user-001', merchant_id: 'MRC-00000004',
      nickname: 'crypto_knight', display_name: 'CryptoKnight16', merchant_type: 'independent',
      region: 'UAE', default_currency: 'USDT', discoverability: 'public', bio: null,
      status: 'active', created_at: '2025-10-01T00:00:00Z', updated_at: '2026-03-12T15:30:00Z',
    },
    {
      id: 'mrc-005', owner_user_id: 'rashid-user-001', merchant_id: 'MRC-00000005',
      nickname: 'al_rashid', display_name: 'Al Rashid Group', merchant_type: 'partner',
      region: 'Saudi Arabia', default_currency: 'USDT', discoverability: 'public', bio: 'Capital provider',
      status: 'active', created_at: '2025-07-01T00:00:00Z', updated_at: '2026-03-14T16:00:00Z',
    },
    {
      id: 'mrc-006', owner_user_id: 'tamim-user-001', merchant_id: 'MRC-00000006',
      nickname: 'tamim_trades', display_name: 'Tamim Trading', merchant_type: 'desk',
      region: 'Qatar', default_currency: 'USDT', discoverability: 'public', bio: null,
      status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-03-14T09:00:00Z',
    },
  ];

  const relationships: MerchantRelationship[] = [
    {
      id: 'rel-001', merchant_a_id: demoMerchantId, merchant_b_id: 'mrc-002',
      invite_id: 'inv-001', relationship_type: 'lending', status: 'active',
      shared_fields: ['deals', 'settlements'], approval_policy: { settlement_submit: 'both', profit_record_submit: 'receiver' },
      created_at: '2025-12-15T10:00:00Z', updated_at: '2026-03-10T14:00:00Z',
    },
    {
      id: 'rel-002', merchant_a_id: demoMerchantId, merchant_b_id: 'mrc-003',
      invite_id: 'inv-003', relationship_type: 'arbitrage', status: 'active',
      shared_fields: ['deals', 'messages'], approval_policy: { settlement_submit: 'sender' },
      created_at: '2026-01-20T08:00:00Z', updated_at: '2026-03-12T09:30:00Z',
    },
    {
      id: 'rel-003', merchant_a_id: 'mrc-005', merchant_b_id: demoMerchantId,
      invite_id: 'inv-005', relationship_type: 'capital', status: 'active',
      shared_fields: ['deals'], approval_policy: { capital_changes: true, closures: true },
      created_at: '2026-02-05T12:00:00Z', updated_at: '2026-03-14T16:00:00Z',
    },
  ];

  const invites: MerchantInvite[] = [
    {
      id: 'inv-010', from_merchant_id: 'mrc-006', to_merchant_id: demoMerchantId,
      status: 'pending', purpose: 'P2P Arbitrage Partnership', requested_role: 'partner',
      message: 'Would love to collaborate on QAR/USDT arbitrage opportunities.',
      requested_scope: ['deals', 'messages'], expires_at: '2026-04-15T00:00:00Z',
      created_at: '2026-03-14T09:00:00Z', updated_at: '2026-03-14T09:00:00Z',
      from_display_name: 'Tamim Trading', from_nickname: 'tamim_trades', from_public_id: 'MRC-00000006',
    },
    {
      id: 'inv-011', from_merchant_id: 'mrc-004', to_merchant_id: demoMerchantId,
      status: 'pending', purpose: 'Capital Placement', requested_role: 'lender',
      message: 'Interested in a 50K USDT capital placement for 90 days.',
      requested_scope: ['deals', 'settlements', 'messages'], expires_at: '2026-04-10T00:00:00Z',
      created_at: '2026-03-12T15:30:00Z', updated_at: '2026-03-12T15:30:00Z',
      from_display_name: 'CryptoKnight16', from_nickname: 'crypto_knight', from_public_id: 'MRC-00000004',
    },
  ];

  const deals: MerchantDeal[] = [
    {
      id: 'deal-001', relationship_id: 'rel-001', deal_type: 'lending',
      title: 'Working Capital Facility #1', amount: 25000, currency: 'USDT',
      status: 'active', metadata: {}, issue_date: '2026-01-15', due_date: '2026-04-15',
      close_date: null, expected_return: 750, realized_pnl: null,
      created_by: demoUserId, created_at: '2026-01-15T10:00:00Z', updated_at: '2026-03-10T14:00:00Z',
    },
    {
      id: 'deal-002', relationship_id: 'rel-001', deal_type: 'lending',
      title: 'Short-term Advance', amount: 10000, currency: 'USDT',
      status: 'settled', metadata: {}, issue_date: '2026-02-01', due_date: '2026-03-01',
      close_date: '2026-02-28', expected_return: 200, realized_pnl: 220,
      created_by: demoUserId, created_at: '2026-02-01T08:00:00Z', updated_at: '2026-02-28T16:00:00Z',
    },
    {
      id: 'deal-003', relationship_id: 'rel-001', deal_type: 'lending',
      title: 'March Placement', amount: 10000, currency: 'USDT',
      status: 'due', metadata: {}, issue_date: '2026-03-01', due_date: '2026-03-15',
      close_date: null, expected_return: 150, realized_pnl: null,
      created_by: demoUserId, created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-14T10:00:00Z',
    },
    {
      id: 'deal-004', relationship_id: 'rel-002', deal_type: 'arbitrage',
      title: 'Binance-Bybit Spread #12', amount: 50000, currency: 'USDT',
      status: 'active', metadata: {}, issue_date: '2026-03-10', due_date: null,
      close_date: null, expected_return: 1500, realized_pnl: null,
      created_by: demoUserId, created_at: '2026-03-10T09:00:00Z', updated_at: '2026-03-14T12:00:00Z',
    },
    {
      id: 'deal-005', relationship_id: 'rel-002', deal_type: 'arbitrage',
      title: 'P2P QAR Spread Feb', amount: 30000, currency: 'USDT',
      status: 'closed', metadata: {}, issue_date: '2026-02-10', due_date: null,
      close_date: '2026-02-28', expected_return: 900, realized_pnl: 1120,
      created_by: demoUserId, created_at: '2026-02-10T08:00:00Z', updated_at: '2026-02-28T18:00:00Z',
    },
    {
      id: 'deal-006', relationship_id: 'rel-003', deal_type: 'capital_placement',
      title: 'Capital Infusion Q1', amount: 200000, currency: 'USDT',
      status: 'active', metadata: {}, issue_date: '2026-02-05', due_date: '2026-05-05',
      close_date: null, expected_return: 8000, realized_pnl: null,
      created_by: 'rashid-user-001', created_at: '2026-02-05T12:00:00Z', updated_at: '2026-03-14T16:00:00Z',
    },
  ];

  const approvals: MerchantApproval[] = [
    {
      id: 'apr-001', relationship_id: 'rel-001', type: 'settlement_submit',
      target_entity_type: 'deal', target_entity_id: 'deal-003',
      proposed_payload: { amount: 10150, currency: 'USDT', note: 'Principal + return' },
      status: 'pending', submitted_by_user_id: 'gulf-user-001', submitted_by_merchant_id: 'mrc-002',
      reviewer_user_id: demoUserId, resolution_note: null,
      submitted_at: '2026-03-14T10:30:00Z', resolved_at: null,
      created_at: '2026-03-14T10:30:00Z', updated_at: '2026-03-14T10:30:00Z',
    },
    {
      id: 'apr-002', relationship_id: 'rel-003', type: 'capital_adjustment',
      target_entity_type: 'deal', target_entity_id: 'deal-006',
      proposed_payload: { adjustment: -50000, note: 'Partial capital recall' },
      status: 'pending', submitted_by_user_id: 'rashid-user-001', submitted_by_merchant_id: 'mrc-005',
      reviewer_user_id: demoUserId, resolution_note: null,
      submitted_at: '2026-03-13T14:00:00Z', resolved_at: null,
      created_at: '2026-03-13T14:00:00Z', updated_at: '2026-03-13T14:00:00Z',
    },
    {
      id: 'apr-010', relationship_id: 'rel-002', type: 'profit_record_submit',
      target_entity_type: 'deal', target_entity_id: 'deal-005',
      proposed_payload: { amount: 1120, period_key: '2026-02', currency: 'USDT' },
      status: 'approved', submitted_by_user_id: demoUserId, submitted_by_merchant_id: demoMerchantId,
      reviewer_user_id: 'doha-user-001', resolution_note: 'Confirmed — profit split received.',
      submitted_at: '2026-02-28T18:30:00Z', resolved_at: '2026-03-01T09:00:00Z',
      created_at: '2026-02-28T18:30:00Z', updated_at: '2026-03-01T09:00:00Z',
    },
  ];

  const messages: MerchantMessage[] = [
    { id: 'msg-001', relationship_id: 'rel-001', sender_user_id: 'gulf-user-001', sender_merchant_id: 'mrc-002', body: 'Hi, ready to settle Deal #3?', message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-14T10:00:00Z', sender_name: 'Gulf Exchange' },
    { id: 'msg-002', relationship_id: 'rel-001', sender_user_id: demoUserId, sender_merchant_id: demoMerchantId, body: 'Yes, let me verify the amount first.', message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-14T10:05:00Z', sender_name: 'Demo Trader' },
    { id: 'msg-003', relationship_id: 'rel-001', sender_user_id: 'gulf-user-001', sender_merchant_id: 'mrc-002', body: "Total is 10,150 USDT (principal + return). I've submitted the settlement for your approval.", message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-14T10:30:00Z', sender_name: 'Gulf Exchange' },
    { id: 'msg-004', relationship_id: 'rel-001', sender_user_id: 'system', sender_merchant_id: '', body: '📋 Settlement submitted for Deal "March Placement" — pending approval', message_type: 'system', metadata: {}, is_read: true, created_at: '2026-03-14T10:30:05Z' },
    { id: 'msg-005', relationship_id: 'rel-001', sender_user_id: demoUserId, sender_merchant_id: demoMerchantId, body: "Got it, I'll review and approve shortly.", message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-14T10:35:00Z', sender_name: 'Demo Trader' },
    { id: 'msg-010', relationship_id: 'rel-002', sender_user_id: demoUserId, sender_merchant_id: demoMerchantId, body: 'Spread on Binance-Bybit is widening. Want to increase the position?', message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-12T08:00:00Z', sender_name: 'Demo Trader' },
    { id: 'msg-011', relationship_id: 'rel-002', sender_user_id: 'doha-user-001', sender_merchant_id: 'mrc-003', body: 'How much are you thinking? Current exposure is already 50K.', message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-12T08:15:00Z', sender_name: 'Doha OTC' },
    { id: 'msg-012', relationship_id: 'rel-002', sender_user_id: demoUserId, sender_merchant_id: demoMerchantId, body: 'Another 20K should be fine. The spread is 0.8% right now.', message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-12T08:20:00Z', sender_name: 'Demo Trader' },
    { id: 'msg-013', relationship_id: 'rel-002', sender_user_id: 'doha-user-001', sender_merchant_id: 'mrc-003', body: "Let's do it. Create the deal and I'll confirm.", message_type: 'text', metadata: {}, is_read: false, created_at: '2026-03-12T08:30:00Z', sender_name: 'Doha OTC' },
    { id: 'msg-020', relationship_id: 'rel-003', sender_user_id: 'rashid-user-001', sender_merchant_id: 'mrc-005', body: 'We need to recall 50K from the capital placement.', message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-13T13:00:00Z', sender_name: 'Al Rashid Group' },
    { id: 'msg-021', relationship_id: 'rel-003', sender_user_id: demoUserId, sender_merchant_id: demoMerchantId, body: 'Understood. When do you need it processed?', message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-13T13:30:00Z', sender_name: 'Demo Trader' },
    { id: 'msg-022', relationship_id: 'rel-003', sender_user_id: 'rashid-user-001', sender_merchant_id: 'mrc-005', body: "By end of week if possible. I've submitted the capital adjustment for your approval.", message_type: 'text', metadata: {}, is_read: false, created_at: '2026-03-13T14:00:00Z', sender_name: 'Al Rashid Group' },
    { id: 'msg-023', relationship_id: 'rel-003', sender_user_id: 'system', sender_merchant_id: '', body: '📋 Capital adjustment submitted: -50,000 USDT on Deal "Capital Infusion Q1"', message_type: 'system', metadata: {}, is_read: true, created_at: '2026-03-13T14:00:05Z' },
  ];

  const auditLogs: AuditLog[] = [
    { id: 'aud-001', relationship_id: 'rel-001', actor_user_id: demoUserId, actor_merchant_id: demoMerchantId, entity_type: 'relationship', entity_id: 'rel-001', action: 'relationship_created', detail_json: { counterparty: 'Gulf Exchange Co.' }, created_at: '2025-12-15T10:00:00Z' },
    { id: 'aud-002', relationship_id: 'rel-001', actor_user_id: demoUserId, actor_merchant_id: demoMerchantId, entity_type: 'deal', entity_id: 'deal-001', action: 'deal_created', detail_json: { title: 'Working Capital Facility #1', amount: 25000 }, created_at: '2026-01-15T10:00:00Z' },
    { id: 'aud-003', relationship_id: 'rel-001', actor_user_id: demoUserId, actor_merchant_id: demoMerchantId, entity_type: 'deal', entity_id: 'deal-002', action: 'deal_settled', detail_json: { title: 'Short-term Advance', pnl: 220 }, created_at: '2026-02-28T16:00:00Z' },
    { id: 'aud-004', relationship_id: 'rel-002', actor_user_id: demoUserId, actor_merchant_id: demoMerchantId, entity_type: 'relationship', entity_id: 'rel-002', action: 'relationship_created', detail_json: { counterparty: 'Doha OTC Trading' }, created_at: '2026-01-20T08:00:00Z' },
    { id: 'aud-005', relationship_id: 'rel-002', actor_user_id: demoUserId, actor_merchant_id: demoMerchantId, entity_type: 'deal', entity_id: 'deal-005', action: 'deal_closed', detail_json: { title: 'P2P QAR Spread Feb', pnl: 1120 }, created_at: '2026-02-28T18:00:00Z' },
    { id: 'aud-006', relationship_id: 'rel-003', actor_user_id: 'rashid-user-001', actor_merchant_id: 'mrc-005', entity_type: 'relationship', entity_id: 'rel-003', action: 'relationship_created', detail_json: { counterparty: 'Demo Trader' }, created_at: '2026-02-05T12:00:00Z' },
  ];

  return {
    merchants,
    invites,
    relationships,
    deals,
    approvals,
    messages,
    settlements: [],
    profitRecords: [],
    auditLogs,
    notifications: [],
  };
}

// ─── Singleton Store ────────────────────────────────────────────────
let _store: Store | null = null;

export function getStore(): Store {
  if (!_store) _store = createSeedStore();
  return _store;
}

export function resetStore(): void {
  _store = createSeedStore();
}

// ─── Event Bus (simple pub/sub for reactivity) ─────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyChange(): void {
  listeners.forEach(fn => fn());
}
