// ─── Network Demo Data ──────────────────────────────────────────────
// Provides realistic demo data for Network, Messages, and Deals
// when no backend is available.

import type {
  MerchantSearchResult,
  MerchantInvite,
  MerchantRelationship,
  MerchantApproval,
  MerchantDeal,
  MerchantMessage,
} from '@/types/domain';
import { DEMO_USER } from './demo-mode';

// ─── Merchants ──────────────────────────────────────────────────────
export const DEMO_MERCHANTS: MerchantSearchResult[] = [
  { id: 'mrc-002', merchant_id: 'MRC-00000002', nickname: 'gulf_exchange', display_name: 'Gulf Exchange Co.', merchant_type: 'desk', region: 'Qatar' },
  { id: 'mrc-003', merchant_id: 'MRC-00000003', nickname: 'doha_otc', display_name: 'Doha OTC Trading', merchant_type: 'independent', region: 'Qatar' },
  { id: 'mrc-004', merchant_id: 'MRC-00000004', nickname: 'crypto_knight', display_name: 'CryptoKnight16', merchant_type: 'independent', region: 'UAE' },
  { id: 'mrc-005', merchant_id: 'MRC-00000005', nickname: 'al_rashid', display_name: 'Al Rashid Group', merchant_type: 'partner', region: 'Saudi Arabia' },
  { id: 'mrc-006', merchant_id: 'MRC-00000006', nickname: 'tamim_trades', display_name: 'Tamim Trading', merchant_type: 'desk', region: 'Qatar' },
];

// ─── Relationships ──────────────────────────────────────────────────
export const DEMO_RELATIONSHIPS: MerchantRelationship[] = [
  {
    id: 'rel-001',
    merchant_a_id: 'demo-merchant-001',
    merchant_b_id: 'mrc-002',
    invite_id: 'inv-001',
    relationship_type: 'lending',
    status: 'active',
    shared_fields: ['deals', 'settlements'],
    approval_policy: { settlement_submit: 'both', profit_record_submit: 'receiver' },
    created_at: '2025-12-15T10:00:00Z',
    updated_at: '2026-03-10T14:00:00Z',
    my_role: 'lender',
    counterparty: { display_name: 'Gulf Exchange Co.', merchant_id: 'MRC-00000002', nickname: 'gulf_exchange' },
    summary: { totalDeals: 3, activeExposure: 45000, realizedProfit: 2340, pendingApprovals: 1 },
  },
  {
    id: 'rel-002',
    merchant_a_id: 'demo-merchant-001',
    merchant_b_id: 'mrc-003',
    invite_id: 'inv-003',
    relationship_type: 'arbitrage',
    status: 'active',
    shared_fields: ['deals', 'messages'],
    approval_policy: { settlement_submit: 'sender' },
    created_at: '2026-01-20T08:00:00Z',
    updated_at: '2026-03-12T09:30:00Z',
    my_role: 'partner_a',
    counterparty: { display_name: 'Doha OTC Trading', merchant_id: 'MRC-00000003', nickname: 'doha_otc' },
    summary: { totalDeals: 5, activeExposure: 120000, realizedProfit: 8750, pendingApprovals: 0 },
  },
  {
    id: 'rel-003',
    merchant_a_id: 'mrc-005',
    merchant_b_id: 'demo-merchant-001',
    invite_id: 'inv-005',
    relationship_type: 'capital',
    status: 'restricted',
    shared_fields: ['deals'],
    approval_policy: { capital_changes: true, closures: true },
    created_at: '2026-02-05T12:00:00Z',
    updated_at: '2026-03-14T16:00:00Z',
    my_role: 'borrower',
    counterparty: { display_name: 'Al Rashid Group', merchant_id: 'MRC-00000005', nickname: 'al_rashid' },
    summary: { totalDeals: 1, activeExposure: 200000, realizedProfit: 0, pendingApprovals: 2 },
  },
];

// ─── Invites ────────────────────────────────────────────────────────
export const DEMO_INVITES_INBOX: MerchantInvite[] = [
  {
    id: 'inv-010',
    from_merchant_id: 'mrc-006',
    to_merchant_id: 'demo-merchant-001',
    status: 'pending',
    purpose: 'P2P Arbitrage Partnership',
    requested_role: 'partner',
    message: 'Would love to collaborate on QAR/USDT arbitrage opportunities.',
    requested_scope: ['deals', 'messages'],
    expires_at: '2026-04-15T00:00:00Z',
    created_at: '2026-03-14T09:00:00Z',
    updated_at: '2026-03-14T09:00:00Z',
    from_display_name: 'Tamim Trading',
    from_nickname: 'tamim_trades',
    from_public_id: 'MRC-00000006',
  },
  {
    id: 'inv-011',
    from_merchant_id: 'mrc-004',
    to_merchant_id: 'demo-merchant-001',
    status: 'pending',
    purpose: 'Capital Placement',
    requested_role: 'lender',
    message: 'Interested in a 50K USDT capital placement for 90 days.',
    requested_scope: ['deals', 'settlements', 'messages'],
    expires_at: '2026-04-10T00:00:00Z',
    created_at: '2026-03-12T15:30:00Z',
    updated_at: '2026-03-12T15:30:00Z',
    from_display_name: 'CryptoKnight16',
    from_nickname: 'crypto_knight',
    from_public_id: 'MRC-00000004',
  },
];

export const DEMO_INVITES_SENT: MerchantInvite[] = [
  {
    id: 'inv-020',
    from_merchant_id: 'demo-merchant-001',
    to_merchant_id: 'mrc-002',
    status: 'accepted',
    purpose: 'Lending Partnership',
    requested_role: 'borrower',
    message: '',
    requested_scope: ['deals', 'settlements'],
    expires_at: '2026-01-15T00:00:00Z',
    created_at: '2025-12-10T10:00:00Z',
    updated_at: '2025-12-15T10:00:00Z',
    to_display_name: 'Gulf Exchange Co.',
    to_nickname: 'gulf_exchange',
  },
  {
    id: 'inv-021',
    from_merchant_id: 'demo-merchant-001',
    to_merchant_id: 'mrc-003',
    status: 'accepted',
    purpose: 'Arbitrage Collaboration',
    requested_role: 'partner',
    message: 'Let\'s work on cross-exchange spreads',
    requested_scope: ['deals', 'messages'],
    expires_at: '2026-02-20T00:00:00Z',
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-01-20T08:00:00Z',
    to_display_name: 'Doha OTC Trading',
    to_nickname: 'doha_otc',
  },
];

// ─── Deals ──────────────────────────────────────────────────────────
export const DEMO_DEALS: MerchantDeal[] = [
  {
    id: 'deal-001',
    relationship_id: 'rel-001',
    deal_type: 'lending',
    title: 'Working Capital Facility #1',
    amount: 25000,
    currency: 'USDT',
    status: 'active',
    metadata: {},
    issue_date: '2026-01-15',
    due_date: '2026-04-15',
    close_date: null,
    expected_return: 750,
    realized_pnl: null,
    created_by: DEMO_USER.user_id,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-10T14:00:00Z',
  },
  {
    id: 'deal-002',
    relationship_id: 'rel-001',
    deal_type: 'lending',
    title: 'Short-term Advance',
    amount: 10000,
    currency: 'USDT',
    status: 'settled',
    metadata: {},
    issue_date: '2026-02-01',
    due_date: '2026-03-01',
    close_date: '2026-02-28',
    expected_return: 200,
    realized_pnl: 220,
    created_by: DEMO_USER.user_id,
    created_at: '2026-02-01T08:00:00Z',
    updated_at: '2026-02-28T16:00:00Z',
  },
  {
    id: 'deal-003',
    relationship_id: 'rel-001',
    deal_type: 'lending',
    title: 'March Placement',
    amount: 10000,
    currency: 'USDT',
    status: 'due',
    metadata: {},
    issue_date: '2026-03-01',
    due_date: '2026-03-15',
    close_date: null,
    expected_return: 150,
    realized_pnl: null,
    created_by: DEMO_USER.user_id,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-14T10:00:00Z',
  },
  {
    id: 'deal-004',
    relationship_id: 'rel-002',
    deal_type: 'arbitrage',
    title: 'Binance-Bybit Spread #12',
    amount: 50000,
    currency: 'USDT',
    status: 'active',
    metadata: {},
    issue_date: '2026-03-10',
    due_date: null,
    close_date: null,
    expected_return: 1500,
    realized_pnl: null,
    created_by: DEMO_USER.user_id,
    created_at: '2026-03-10T09:00:00Z',
    updated_at: '2026-03-14T12:00:00Z',
  },
  {
    id: 'deal-005',
    relationship_id: 'rel-002',
    deal_type: 'arbitrage',
    title: 'P2P QAR Spread Feb',
    amount: 30000,
    currency: 'USDT',
    status: 'closed',
    metadata: {},
    issue_date: '2026-02-10',
    due_date: null,
    close_date: '2026-02-28',
    expected_return: 900,
    realized_pnl: 1120,
    created_by: DEMO_USER.user_id,
    created_at: '2026-02-10T08:00:00Z',
    updated_at: '2026-02-28T18:00:00Z',
  },
  {
    id: 'deal-006',
    relationship_id: 'rel-003',
    deal_type: 'capital_placement',
    title: 'Capital Infusion Q1',
    amount: 200000,
    currency: 'USDT',
    status: 'active',
    metadata: {},
    issue_date: '2026-02-05',
    due_date: '2026-05-05',
    close_date: null,
    expected_return: 8000,
    realized_pnl: null,
    created_by: 'mrc-005-user',
    created_at: '2026-02-05T12:00:00Z',
    updated_at: '2026-03-14T16:00:00Z',
  },
];

// ─── Approvals ──────────────────────────────────────────────────────
export const DEMO_APPROVALS_INBOX: MerchantApproval[] = [
  {
    id: 'apr-001',
    relationship_id: 'rel-001',
    type: 'settlement_submit',
    target_entity_type: 'deal',
    target_entity_id: 'deal-003',
    proposed_payload: { amount: 10150, currency: 'USDT', note: 'Principal + return' },
    status: 'pending',
    submitted_by_user_id: 'gulf-user-001',
    submitted_by_merchant_id: 'mrc-002',
    reviewer_user_id: DEMO_USER.user_id,
    resolution_note: null,
    submitted_at: '2026-03-14T10:30:00Z',
    resolved_at: null,
    created_at: '2026-03-14T10:30:00Z',
    updated_at: '2026-03-14T10:30:00Z',
  },
  {
    id: 'apr-002',
    relationship_id: 'rel-003',
    type: 'capital_adjustment',
    target_entity_type: 'deal',
    target_entity_id: 'deal-006',
    proposed_payload: { adjustment: -50000, note: 'Partial capital recall' },
    status: 'pending',
    submitted_by_user_id: 'rashid-user-001',
    submitted_by_merchant_id: 'mrc-005',
    reviewer_user_id: DEMO_USER.user_id,
    resolution_note: null,
    submitted_at: '2026-03-13T14:00:00Z',
    resolved_at: null,
    created_at: '2026-03-13T14:00:00Z',
    updated_at: '2026-03-13T14:00:00Z',
  },
];

export const DEMO_APPROVALS_SENT: MerchantApproval[] = [
  {
    id: 'apr-010',
    relationship_id: 'rel-002',
    type: 'profit_record_submit',
    target_entity_type: 'deal',
    target_entity_id: 'deal-005',
    proposed_payload: { amount: 1120, period_key: '2026-02', currency: 'USDT' },
    status: 'approved',
    submitted_by_user_id: DEMO_USER.user_id,
    submitted_by_merchant_id: 'demo-merchant-001',
    reviewer_user_id: 'doha-user-001',
    resolution_note: 'Confirmed — profit split received.',
    submitted_at: '2026-02-28T18:30:00Z',
    resolved_at: '2026-03-01T09:00:00Z',
    created_at: '2026-02-28T18:30:00Z',
    updated_at: '2026-03-01T09:00:00Z',
  },
];

// ─── Messages ───────────────────────────────────────────────────────
export const DEMO_MESSAGES: Record<string, MerchantMessage[]> = {
  'rel-001': [
    { id: 'msg-001', relationship_id: 'rel-001', sender_user_id: 'gulf-user-001', sender_merchant_id: 'mrc-002', body: 'Hi, ready to settle Deal #3?', message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-14T10:00:00Z', sender_name: 'Gulf Exchange' },
    { id: 'msg-002', relationship_id: 'rel-001', sender_user_id: DEMO_USER.user_id, sender_merchant_id: 'demo-merchant-001', body: 'Yes, let me verify the amount first.', message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-14T10:05:00Z', sender_name: 'Demo Trader' },
    { id: 'msg-003', relationship_id: 'rel-001', sender_user_id: 'gulf-user-001', sender_merchant_id: 'mrc-002', body: 'Total is 10,150 USDT (principal + return). I\'ve submitted the settlement for your approval.', message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-14T10:30:00Z', sender_name: 'Gulf Exchange' },
    { id: 'msg-004', relationship_id: 'rel-001', sender_user_id: 'system', sender_merchant_id: '', body: '📋 Settlement submitted for Deal "March Placement" — pending approval', message_type: 'system', metadata: {}, is_read: true, created_at: '2026-03-14T10:30:05Z' },
    { id: 'msg-005', relationship_id: 'rel-001', sender_user_id: DEMO_USER.user_id, sender_merchant_id: 'demo-merchant-001', body: 'Got it, I\'ll review and approve shortly.', message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-14T10:35:00Z', sender_name: 'Demo Trader' },
  ],
  'rel-002': [
    { id: 'msg-010', relationship_id: 'rel-002', sender_user_id: DEMO_USER.user_id, sender_merchant_id: 'demo-merchant-001', body: 'Spread on Binance-Bybit is widening. Want to increase the position?', message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-12T08:00:00Z', sender_name: 'Demo Trader' },
    { id: 'msg-011', relationship_id: 'rel-002', sender_user_id: 'doha-user-001', sender_merchant_id: 'mrc-003', body: 'How much are you thinking? Current exposure is already 50K.', message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-12T08:15:00Z', sender_name: 'Doha OTC' },
    { id: 'msg-012', relationship_id: 'rel-002', sender_user_id: DEMO_USER.user_id, sender_merchant_id: 'demo-merchant-001', body: 'Another 20K should be fine. The spread is 0.8% right now.', message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-12T08:20:00Z', sender_name: 'Demo Trader' },
    { id: 'msg-013', relationship_id: 'rel-002', sender_user_id: 'doha-user-001', sender_merchant_id: 'mrc-003', body: 'Let\'s do it. Create the deal and I\'ll confirm.', message_type: 'text', metadata: {}, is_read: false, created_at: '2026-03-12T08:30:00Z', sender_name: 'Doha OTC' },
  ],
  'rel-003': [
    { id: 'msg-020', relationship_id: 'rel-003', sender_user_id: 'rashid-user-001', sender_merchant_id: 'mrc-005', body: 'We need to recall 50K from the capital placement.', message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-13T13:00:00Z', sender_name: 'Al Rashid Group' },
    { id: 'msg-021', relationship_id: 'rel-003', sender_user_id: DEMO_USER.user_id, sender_merchant_id: 'demo-merchant-001', body: 'Understood. When do you need it processed?', message_type: 'text', metadata: {}, is_read: true, created_at: '2026-03-13T13:30:00Z', sender_name: 'Demo Trader' },
    { id: 'msg-022', relationship_id: 'rel-003', sender_user_id: 'rashid-user-001', sender_merchant_id: 'mrc-005', body: 'By end of week if possible. I\'ve submitted the capital adjustment for your approval.', message_type: 'text', metadata: {}, is_read: false, created_at: '2026-03-13T14:00:00Z', sender_name: 'Al Rashid Group' },
    { id: 'msg-023', relationship_id: 'rel-003', sender_user_id: 'system', sender_merchant_id: '', body: '📋 Capital adjustment submitted: -50,000 USDT on Deal "Capital Infusion Q1"', message_type: 'system', metadata: {}, is_read: true, created_at: '2026-03-13T14:00:05Z' },
  ],
};

// ─── Helper to filter deals by relationship ─────────────────────────
export function getDemoDeals(relationshipId?: string): MerchantDeal[] {
  if (relationshipId) return DEMO_DEALS.filter(d => d.relationship_id === relationshipId);
  return DEMO_DEALS;
}

export function getDemoMessages(relationshipId: string): MerchantMessage[] {
  return DEMO_MESSAGES[relationshipId] || [];
}

// Search demo merchants
export function searchDemoMerchants(query: string): MerchantSearchResult[] {
  const q = query.toLowerCase();
  return DEMO_MERCHANTS.filter(m =>
    m.display_name.toLowerCase().includes(q) ||
    m.nickname.toLowerCase().includes(q) ||
    m.merchant_id.toLowerCase().includes(q)
  );
}
