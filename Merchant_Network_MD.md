# Merchant Network Platform — Complete System Documentation

> **Version**: 1.0  
> **Date**: 2026-03-16  
> **Architecture**: Cloudflare Workers + D1 + KV + Durable Objects  
> **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Domain Model & Database Schema](#3-domain-model--database-schema)
4. [Authentication System](#4-authentication-system)
5. [Merchant Identity System](#5-merchant-identity-system)
6. [Discovery & Search](#6-discovery--search)
7. [Invite System](#7-invite-system)
8. [Relationship Workspace](#8-relationship-workspace)
9. [Messaging System](#9-messaging-system)
10. [Deal Lifecycle Engine](#10-deal-lifecycle-engine)
11. [Settlement & Profit Workflows](#11-settlement--profit-workflows)
12. [Approval Engine](#12-approval-engine)
13. [Capital Owner Analytics](#13-capital-owner-analytics)
14. [Portfolio Analytics](#14-portfolio-analytics)
15. [Risk Engine](#15-risk-engine)
16. [Audit Logging](#16-audit-logging)
17. [Trading Module (P2P/FIFO)](#17-trading-module-p2pfifo)
18. [Internationalization](#18-internationalization)
19. [API Reference](#19-api-reference)
20. [Frontend Architecture](#20-frontend-architecture)
21. [Cloudflare Deployment Guide](#21-cloudflare-deployment-guide)
22. [Business Logic Engine (Current Implementation)](#22-business-logic-engine-current-implementation)
23. [Data Store (Current Implementation)](#23-data-store-current-implementation)
24. [End-to-End Test Scenarios](#24-end-to-end-test-scenarios)
25. [Migration Path: Demo → Production](#25-migration-path-demo--production)

---

## 1. System Overview

The Merchant Network Platform is a **merchant-to-merchant collaboration system** for OTC/P2P cryptocurrency traders. It enables:

- **Merchant identity** with immutable IDs and discoverable profiles
- **Relationship management** between merchants (lending, arbitrage, partnership, capital placement)
- **Deal lifecycle management** with approval-driven mutations
- **Capital owner visibility** showing ROI per counterparty
- **Real-time messaging** within relationship workspaces
- **Audit trail** for all business-critical actions
- **P2P price tracking** and FIFO-based trading ledger

### Core Principle

> **The backend is the absolute source of truth.** No business state lives in localStorage, browser memory, or frontend state beyond transient UI. All mutations flow through the API, all data persists in D1.

---

## 2. Architecture

### 2.1 Infrastructure Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                       │
├──────────┬──────────┬───────────┬───────────┬───────────┤
│ Workers  │ D1 (SQL) │ KV Cache  │ Durable   │ R2        │
│ (API)    │ (Primary │  (Lookups/│ Objects   │ (Files)   │
│          │  DB)     │  Sessions)│ (Realtime)│           │
└──────────┴──────────┴───────────┴───────────┴───────────┘
       ▲                                          
       │ HTTPS / WebSocket                        
       │                                          
┌──────┴──────────────────────────────────────────────────┐
│              React SPA (Vite + TypeScript)               │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌─────────┐ │
│  │ Auth    │  │ API      │  │ Backend   │  │ UI      │ │
│  │ Context │  │ Client   │  │ Engine*   │  │ Pages   │ │
│  └─────────┘  └──────────┘  └───────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘

* Backend Engine = in-memory simulation layer for demo mode.
  In production, all calls go through API Client → Workers.
```

### 2.2 Wrangler Configuration

```jsonc
// infra/wrangler.jsonc
{
  "name": "tracker-platform",
  "main": "apps/api/src/index.js",
  "compatibility_date": "2026-03-10",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true },
  "assets": { "directory": "apps/web/dist" },
  "kv_namespaces": [
    {
      "binding": "P2P_KV",
      "id": "REPLACE_WITH_KV_NAMESPACE_ID"
    }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "tracker-platform",
      "database_id": "REPLACE_WITH_D1_DATABASE_ID"
    }
  ],
  "vars": {
    "ALLOWED_ORIGINS": "*",
    "AUTH_SOURCE": "cloudflare-access"
  },
  "triggers": {
    "crons": ["*/5 * * * *"]
  }
}
```

### 2.3 Request Flow

```
User Action → React Component → API Client (src/lib/api.ts)
  → HTTP Request with Auth Headers
  → Cloudflare Worker (apps/api/src/index.js)
  → Route Handler → D1 Query → Response
  → React State Update → UI Re-render
```

---

## 3. Domain Model & Database Schema

### 3.1 TypeScript Domain Types

All entities are defined in `src/types/domain.ts`. Key types:

#### AuthUser
```typescript
interface AuthUser {
  id: string;
  email: string;
  email_verified: boolean;
  mfa_enabled: boolean;
  status: 'active' | 'suspended' | 'deleted';
  created_at: string;
  updated_at: string;
}
```

#### MerchantProfile
```typescript
type MerchantType = 'independent' | 'desk' | 'partner' | 'other';
type Discoverability = 'public' | 'merchant_id_only' | 'hidden';
type MerchantStatus = 'active' | 'restricted' | 'suspended' | 'archived';

interface MerchantProfile {
  id: string;                      // Internal UUID
  owner_user_id: string;           // FK → auth user
  merchant_id: string;             // MRC-XXXXXXXX (immutable, public)
  nickname: string;                // Unique, searchable
  display_name: string;
  merchant_type: MerchantType;
  region: string;
  default_currency: string;
  discoverability: Discoverability;
  bio: string | null;
  status: MerchantStatus;
  created_at: string;
  updated_at: string;
}
```

#### MerchantInvite
```typescript
type InviteStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';

interface MerchantInvite {
  id: string;
  from_merchant_id: string;
  to_merchant_id: string;
  status: InviteStatus;
  purpose: string;
  requested_role: string;
  message: string;
  requested_scope: string[];       // ['deals', 'messages', 'settlements']
  expires_at: string;
  created_at: string;
  updated_at: string;
  // Joined fields for display
  from_display_name?: string;
  from_nickname?: string;
  from_public_id?: string;
  to_display_name?: string;
  to_nickname?: string;
  to_public_id?: string;
}
```

#### MerchantRelationship
```typescript
type RelationshipType = 'general' | 'lending' | 'arbitrage' | 'capital' | 'strategic';
type RelationshipStatus = 'active' | 'restricted' | 'suspended' | 'terminated' | 'archived';

interface ApprovalPolicy {
  settlement_submit?: string;      // 'both' | 'sender' | 'receiver'
  profit_record_submit?: string;
  deal_close?: string;
  capital_changes?: boolean;
  closures?: boolean;
}

interface MerchantRelationship {
  id: string;
  merchant_a_id: string;
  merchant_b_id: string;
  invite_id: string;
  relationship_type: RelationshipType;
  status: RelationshipStatus;
  shared_fields: string[];
  approval_policy: ApprovalPolicy;
  created_at: string;
  updated_at: string;
  // Enriched (computed at query time)
  my_role?: string;
  counterparty?: Partial<MerchantProfile>;
  summary?: RelationshipSummary;
}

interface RelationshipSummary {
  totalDeals: number;
  activeExposure: number;
  realizedProfit: number;
  pendingApprovals: number;
}
```

#### MerchantDeal
```typescript
type DealType = 'lending' | 'arbitrage' | 'partnership' | 'capital_placement' | 'general';
type DealStatus = 'draft' | 'active' | 'due' | 'settled' | 'closed' | 'overdue' | 'cancelled';

interface MerchantDeal {
  id: string;
  relationship_id: string;
  deal_type: DealType;
  title: string;
  amount: number;
  currency: string;
  status: DealStatus;
  metadata: Record<string, unknown>;
  issue_date: string;
  due_date: string | null;
  close_date: string | null;
  expected_return: number | null;
  realized_pnl: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

#### MerchantApproval
```typescript
type ApprovalType =
  | 'settlement_submit'
  | 'profit_record_submit'
  | 'capital_adjustment'
  | 'deal_close'
  | 'relationship_suspend'
  | 'relationship_terminate'
  | 'permissions_change';
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';

interface MerchantApproval {
  id: string;
  relationship_id: string;
  type: ApprovalType;
  target_entity_type: string;
  target_entity_id: string;
  proposed_payload: Record<string, unknown>;
  status: ApprovalStatus;
  submitted_by_user_id: string;
  submitted_by_merchant_id: string;
  reviewer_user_id: string;
  resolution_note: string | null;
  submitted_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}
```

#### MerchantMessage
```typescript
type MessageType = 'text' | 'system' | 'request-note';

interface MerchantMessage {
  id: string;
  relationship_id: string;
  sender_user_id: string;
  sender_merchant_id: string;
  body: string;
  message_type: MessageType;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
}
```

#### AuditLog
```typescript
interface AuditLog {
  id: string;
  relationship_id: string | null;
  actor_user_id: string;
  actor_merchant_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  detail_json: Record<string, unknown>;
  created_at: string;
}
```

#### Settlement & ProfitRecord
```typescript
interface MerchantSettlement {
  id: string;
  relationship_id: string;
  deal_id: string;
  submitted_by_user_id: string;
  amount: number;
  currency: string;
  note: string;
  status: string;               // 'pending' | 'approved' | 'rejected'
  submitted_at: string;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfitRecord {
  id: string;
  relationship_id: string;
  deal_id: string;
  period_key: string;           // '2026-03' (YYYY-MM)
  amount: number;
  currency: string;
  note: string;
  status: string;
  submitted_by_user_id: string;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}
```

### 3.2 D1 Database Schema (SQL)

Full migration at `infra/d1/migrations/001_initial.sql`:

```sql
-- Users & Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  theme TEXT NOT NULL DEFAULT 'dark',
  default_currency TEXT NOT NULL DEFAULT 'USDT',
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  last_page TEXT,
  data_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Merchant Profiles
CREATE TABLE IF NOT EXISTS merchant_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  merchant_id TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  merchant_type TEXT NOT NULL DEFAULT 'independent',
  region TEXT,
  default_currency TEXT NOT NULL DEFAULT 'USDT',
  discoverability TEXT NOT NULL DEFAULT 'public',
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_merchant_profiles_user ON merchant_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_profiles_nickname ON merchant_profiles(nickname);
CREATE INDEX IF NOT EXISTS idx_merchant_profiles_merchant_id ON merchant_profiles(merchant_id);

-- Invites
CREATE TABLE IF NOT EXISTS merchant_invites (
  id TEXT PRIMARY KEY,
  from_merchant_id TEXT NOT NULL,
  to_merchant_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  purpose TEXT,
  requested_role TEXT NOT NULL DEFAULT 'operator',
  message TEXT,
  requested_scope TEXT NOT NULL DEFAULT '[]',
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_invites_to ON merchant_invites(to_merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_invites_from ON merchant_invites(from_merchant_id, status);

-- Relationships
CREATE TABLE IF NOT EXISTS merchant_relationships (
  id TEXT PRIMARY KEY,
  merchant_a_id TEXT NOT NULL,
  merchant_b_id TEXT NOT NULL,
  invite_id TEXT,
  relationship_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'active',
  shared_fields TEXT NOT NULL DEFAULT '[]',
  approval_policy TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rel_a ON merchant_relationships(merchant_a_id);
CREATE INDEX IF NOT EXISTS idx_rel_b ON merchant_relationships(merchant_b_id);

-- Roles
CREATE TABLE IF NOT EXISTS merchant_roles (
  id TEXT PRIMARY KEY,
  relationship_id TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_roles_rel ON merchant_roles(relationship_id, user_id);

-- Deals
CREATE TABLE IF NOT EXISTS merchant_deals (
  id TEXT PRIMARY KEY,
  relationship_id TEXT NOT NULL,
  deal_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDT',
  status TEXT NOT NULL DEFAULT 'draft',
  metadata TEXT NOT NULL DEFAULT '{}',
  issue_date TEXT,
  due_date TEXT,
  close_date TEXT,
  expected_return REAL,
  realized_pnl REAL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_deals_rel ON merchant_deals(relationship_id);

-- Settlements
CREATE TABLE IF NOT EXISTS merchant_settlements (
  id TEXT PRIMARY KEY,
  relationship_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  submitted_by_user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDT',
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Profit Records
CREATE TABLE IF NOT EXISTS merchant_profit_records (
  id TEXT PRIMARY KEY,
  relationship_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  period_key TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDT',
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_by_user_id TEXT NOT NULL,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Approvals
CREATE TABLE IF NOT EXISTS merchant_approvals (
  id TEXT PRIMARY KEY,
  relationship_id TEXT NOT NULL,
  type TEXT NOT NULL,
  target_entity_type TEXT NOT NULL,
  target_entity_id TEXT NOT NULL,
  proposed_payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_by_user_id TEXT NOT NULL,
  submitted_by_merchant_id TEXT NOT NULL,
  reviewer_user_id TEXT NOT NULL,
  resolution_note TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_approvals_reviewer ON merchant_approvals(reviewer_user_id, status);

-- Messages
CREATE TABLE IF NOT EXISTS merchant_messages (
  id TEXT PRIMARY KEY,
  relationship_id TEXT NOT NULL,
  sender_user_id TEXT NOT NULL,
  sender_merchant_id TEXT,
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_rel ON merchant_messages(relationship_id, created_at);

CREATE TABLE IF NOT EXISTS merchant_message_reads (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  read_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(message_id, user_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS merchant_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  relationship_id TEXT,
  category TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT,
  data_json TEXT NOT NULL DEFAULT '{}',
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON merchant_notifications(user_id, read_at, created_at);

-- Audit Logs
CREATE TABLE IF NOT EXISTS merchant_audit_logs (
  id TEXT PRIMARY KEY,
  relationship_id TEXT,
  actor_user_id TEXT,
  actor_merchant_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON merchant_audit_logs(actor_user_id, created_at);

-- Trading: Batches (FIFO stock)
CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  asset_symbol TEXT NOT NULL,
  acquired_at TEXT NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit_cost REAL NOT NULL CHECK (unit_cost >= 0),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_batches_user ON batches(user_id, asset_symbol);

-- Trading: Trades
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  asset_symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  traded_at TEXT NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit_price REAL NOT NULL CHECK (unit_price >= 0),
  fee REAL NOT NULL DEFAULT 0 CHECK (fee >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'void')),
  source_batch_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id, asset_symbol);

-- FIFO Allocations
CREATE TABLE IF NOT EXISTS trade_allocations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  trade_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  allocated_qty REAL NOT NULL CHECK (allocated_qty > 0),
  batch_unit_cost REAL NOT NULL CHECK (batch_unit_cost >= 0),
  allocated_cost REAL NOT NULL CHECK (allocated_cost >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(trade_id, batch_id)
);

-- Schema migrations tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 4. Authentication System

### 4.1 Auth Flow

```
Signup → Email Verification → Login → Session Token → API Access
```

### 4.2 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login, returns JWT token |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/verify-email` | Verify email with token |
| POST | `/api/auth/reset-password` | Request password reset |
| GET | `/api/auth/session` | Get current session |

### 4.3 Auth Context (Frontend)

```typescript
// src/lib/auth-context.tsx
interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  profile: MerchantProfile | null;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```

### 4.4 Request Authentication

Every API request includes auth headers:
```typescript
if (_authToken) {
  headers['Authorization'] = `Bearer ${_authToken}`;
} else if (_compatUserId) {
  headers['X-User-Id'] = _compatUserId;
  headers['X-User-Email'] = _compatEmail;
}
```

### 4.5 Demo Mode Detection

```typescript
// src/lib/demo-mode.ts
export async function isDemoMode(): Promise<boolean> {
  // Attempts GET /api/auth/session
  // If response is HTML (Vite fallback) or 404, no backend → demo mode
  const res = await fetch('/api/auth/session');
  const ct = res.headers.get('content-type') || '';
  return !res.ok || ct.includes('text/html');
}
```

### 4.6 Cloudflare Worker Implementation (Required)

```typescript
// apps/api/src/routes/auth.ts
import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { nanoid } from 'nanoid';

const auth = new Hono<{ Bindings: Env }>();

auth.post('/signup', async (c) => {
  const { email, password } = await c.req.json();
  const db = c.env.DB;
  
  // Hash password with Web Crypto API
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key, 256
  );
  
  const userId = nanoid();
  await db.prepare(
    `INSERT INTO users (id, email, password_hash, password_salt, status) VALUES (?, ?, ?, ?, 'pending_verification')`
  ).bind(userId, email, Buffer.from(hash).toString('hex'), Buffer.from(salt).toString('hex')).run();
  
  // Send verification email via Cloudflare Email Workers or external service
  const verifyToken = nanoid(32);
  await c.env.P2P_KV.put(`verify:${verifyToken}`, userId, { expirationTtl: 86400 });
  
  return c.json({ ok: true, user_id: userId });
});

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  const db = c.env.DB;
  
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user) return c.json({ error: 'Invalid credentials' }, 401);
  
  // Verify password hash
  // ... (hash comparison logic)
  
  const token = await sign({ sub: user.id, email, iat: Date.now() }, c.env.JWT_SECRET);
  return c.json({ ok: true, token, user_id: user.id });
});

auth.get('/session', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json(null);
  
  const token = authHeader.replace('Bearer ', '');
  const payload = await verify(token, c.env.JWT_SECRET);
  return c.json({ user_id: payload.sub, email: payload.email });
});
```

---

## 5. Merchant Identity System

### 5.1 Rules

1. **One profile per user** — enforced by `UNIQUE(user_id)` on `merchant_profiles`
2. **Immutable Merchant ID** — format `MRC-XXXXXXXX`, generated at creation, never changes
3. **Unique nickname** — enforced by `UNIQUE(nickname)`, used for search
4. **Discoverability** — `public` (searchable), `merchant_id_only` (exact match only), `hidden`

### 5.2 ID Generation

```typescript
export function genMerchantId(): string {
  return `MRC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}
```

### 5.3 Profile Ensure (Idempotent Create)

```
POST /api/merchant/profile/ensure
Body: { nickname, display_name, merchant_type?, region?, default_currency?, discoverability?, bio? }
Response: { profile: MerchantProfile }
```

Worker implementation:
```typescript
app.post('/api/merchant/profile/ensure', async (c) => {
  const userId = c.get('userId');
  const data = await c.req.json();
  const db = c.env.DB;
  
  // Check existing
  const existing = await db.prepare('SELECT * FROM merchant_profiles WHERE user_id = ?').bind(userId).first();
  if (existing) return c.json({ profile: existing });
  
  // Check nickname uniqueness
  const nickCheck = await db.prepare('SELECT id FROM merchant_profiles WHERE nickname = ?').bind(data.nickname).first();
  if (nickCheck) return c.json({ error: 'Nickname taken' }, 409);
  
  const id = nanoid();
  const merchantId = `MRC-${nanoid(8).toUpperCase()}`;
  
  await db.prepare(`
    INSERT INTO merchant_profiles (id, user_id, merchant_id, nickname, display_name, merchant_type, region, default_currency, discoverability, bio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, userId, merchantId, data.nickname, data.display_name, 
    data.merchant_type || 'independent', data.region || '', data.default_currency || 'USDT',
    data.discoverability || 'public', data.bio || null
  ).run();
  
  const profile = await db.prepare('SELECT * FROM merchant_profiles WHERE id = ?').bind(id).first();
  return c.json({ profile });
});
```

---

## 6. Discovery & Search

### 6.1 Search Logic

```typescript
export function searchMerchants(query: string): MerchantSearchResult[] {
  const q = query.toLowerCase();
  return getStore().merchants
    .filter(m => m.id !== demoMerchantId)  // Exclude self
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
```

### 6.2 Search Constraints

- **Cannot invite self** — filtered at search time and invite creation
- **Cannot invite if relationship exists** — checked in `sendInvite()`
- **Cannot invite if pending invite exists** — checked in `sendInvite()`

### 6.3 Worker SQL Query

```sql
SELECT id, merchant_id, nickname, display_name, merchant_type, region
FROM merchant_profiles
WHERE user_id != ?
  AND discoverability IN ('public', 'merchant_id_only')
  AND (
    merchant_id LIKE ? OR
    nickname LIKE ? OR
    display_name LIKE ?
  )
LIMIT 20
```

---

## 7. Invite System

### 7.1 Invite Lifecycle

```
                    ┌─── withdraw ──→ WITHDRAWN
                    │
CREATED → PENDING ──┼─── accept ───→ ACCEPTED → creates Relationship
                    │
                    ├─── reject ───→ REJECTED
                    │
                    └─── (expiry) ──→ EXPIRED
```

### 7.2 Send Invite

```typescript
export function sendInvite(data: {
  to_merchant_id: string;
  purpose?: string;
  requested_role?: string;
  message?: string;
  requested_scope?: string[];
}): MerchantInvite {
  // Validations:
  // 1. Target merchant exists
  // 2. Not self-invite
  // 3. No existing active relationship
  // 4. No pending invite between same merchants
  
  const invite: MerchantInvite = {
    id: genId('inv'),
    from_merchant_id: currentMerchantId,
    to_merchant_id: data.to_merchant_id,
    status: 'pending',
    purpose: data.purpose || 'General collaboration',
    requested_role: data.requested_role || 'partner',
    message: data.message || '',
    requested_scope: data.requested_scope || ['deals', 'messages'],
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), // 30 days
    // ...timestamps
  };
  
  // Generates audit log: 'invite_sent'
  return invite;
}
```

### 7.3 Accept Invite → Create Relationship

```typescript
export function acceptInvite(inviteId: string): { relationship_id: string } {
  // 1. Mark invite as 'accepted'
  // 2. Infer relationship_type from invite purpose
  // 3. Create MerchantRelationship record
  // 4. Generate audit logs: 'invite_accepted', 'relationship_created'
  // 5. Add system message to new relationship
  
  const relType = invite.purpose?.includes('lend') ? 'lending'
    : invite.purpose?.includes('capital') ? 'capital'
    : invite.purpose?.includes('arb') ? 'arbitrage'
    : 'general';
  
  const rel: MerchantRelationship = {
    id: genId('rel'),
    merchant_a_id: invite.from_merchant_id,
    merchant_b_id: invite.to_merchant_id,
    relationship_type: relType,
    status: 'active',
    shared_fields: invite.requested_scope,
    approval_policy: { settlement_submit: 'both' },
    // ...
  };
  
  return { relationship_id: rel.id };
}
```

### 7.4 Expiration (Cron Job)

```typescript
// Worker cron trigger: */5 * * * *
async function handleCron(env: Env) {
  const now = new Date().toISOString();
  await env.DB.prepare(`
    UPDATE merchant_invites SET status = 'expired', updated_at = ?
    WHERE status = 'pending' AND expires_at < ?
  `).bind(now, now).run();
}
```

---

## 8. Relationship Workspace

### 8.1 Structure

Each relationship provides a shared workspace with tabs:

| Tab | Content |
|-----|---------|
| Overview | Summary stats, counterparty info, quick actions |
| Messages | Real-time chat between merchants |
| Deals | List of all deals in this relationship |
| Approvals | Pending/resolved approval requests |
| Analytics | Per-relationship performance metrics |
| Audit | Full action history |
| Settings | Relationship configuration, approval policies |

### 8.2 Enrichment

Relationships are enriched with computed data at query time:

```typescript
export function enrichRelationship(rel: MerchantRelationship): MerchantRelationship {
  return {
    ...rel,
    counterparty: getCounterpartyForRel(rel),    // Display name, ID, nickname
    my_role: getMyRoleForRel(rel),                // 'lender', 'borrower', 'partner_a', etc.
    summary: computeRelSummary(rel.id),           // totalDeals, activeExposure, realizedProfit, pendingApprovals
  };
}
```

### 8.3 Role Determination

```typescript
function getMyRoleForRel(rel: MerchantRelationship): string {
  if (rel.relationship_type === 'lending')
    return rel.merchant_a_id === myId ? 'lender' : 'borrower';
  if (rel.relationship_type === 'capital')
    return rel.merchant_a_id === myId ? 'capital_provider' : 'borrower';
  return rel.merchant_a_id === myId ? 'partner_a' : 'partner_b';
}
```

---

## 9. Messaging System

### 9.1 Message Types

| Type | Description |
|------|-------------|
| `text` | User-sent message |
| `system` | Auto-generated for business events |
| `request-note` | Attached to approval requests |

### 9.2 Send Message

```typescript
export function sendMessage(relationshipId: string, body: string): MerchantMessage {
  const msg: MerchantMessage = {
    id: genId('msg'),
    relationship_id: relationshipId,
    sender_user_id: currentUserId,
    sender_merchant_id: currentMerchantId,
    body,
    message_type: 'text',
    metadata: {},
    is_read: true,  // Read by sender
    created_at: now(),
    sender_name: currentProfile.display_name,
  };
  store.messages.push(msg);
  return msg;
}
```

### 9.3 System Messages (Auto-generated)

System messages are created for:
- Relationship established
- Deal created/activated
- Settlement submitted
- Approval approved/rejected
- Capital adjustment
- Deal closed

```typescript
function addSystemMessage(relationshipId: string, body: string): void {
  const msg: MerchantMessage = {
    id: genId('msg'),
    relationship_id: relationshipId,
    sender_user_id: 'system',
    sender_merchant_id: '',
    body,
    message_type: 'system',
    metadata: {},
    is_read: false,
    created_at: now(),
  };
  store.messages.push(msg);
}
```

### 9.4 Read State

```sql
-- Separate read tracking table
CREATE TABLE merchant_message_reads (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  read_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(message_id, user_id)
);
```

### 9.5 Unread Count Query

```sql
SELECT COUNT(*) as unread
FROM merchant_messages m
LEFT JOIN merchant_message_reads r ON r.message_id = m.id AND r.user_id = ?
WHERE m.relationship_id = ? AND r.id IS NULL AND m.sender_user_id != ?
```

---

## 10. Deal Lifecycle Engine

### 10.1 Deal Types & Transitions

#### Lending
```
DRAFT → ACTIVE → DUE → SETTLED (via approved settlement)
                     ↘ OVERDUE (if past due_date)
```

#### Arbitrage
```
DRAFT → ACTIVE → CLOSED (via approved deal close)
```

#### Partnership
```
DRAFT → ACTIVE → [profit cycles] → CLOSED
```

#### Capital Placement
```
DRAFT → ACTIVE → [maturity] → SETTLED/RETURNED
```

### 10.2 Create Deal

```typescript
export function createDeal(data: {
  relationship_id: string;
  deal_type: string;
  title: string;
  amount: number;
  currency?: string;
  due_date?: string;
  expected_return?: number;
}): MerchantDeal {
  // Validates relationship exists
  // Creates deal with status 'draft'
  // Generates audit log: 'deal_created'
  // Sends system message to relationship
  return deal;
}
```

### 10.3 Activate Deal

```typescript
export function activateDeal(dealId: string): MerchantDeal {
  // Only draft → active transition allowed
  // Generates audit log: 'deal_activated'
  // Sends system message
  return deal;
}
```

### 10.4 Overdue Detection

```typescript
export function getDeals(relationshipId?: string): MerchantDeal[] {
  const today = new Date().toISOString().split('T')[0];
  deals.forEach(deal => {
    if (deal.due_date && deal.due_date < today && ['active', 'due'].includes(deal.status)) {
      deal.status = 'overdue';
    }
  });
  return deals;
}
```

### 10.5 Worker Implementation

```typescript
app.post('/api/merchant/deals', async (c) => {
  const userId = c.get('userId');
  const profile = await getProfile(c.env.DB, userId);
  const data = await c.req.json();
  
  // Verify user is part of the relationship
  const rel = await c.env.DB.prepare(`
    SELECT * FROM merchant_relationships WHERE id = ?
    AND (merchant_a_id = ? OR merchant_b_id = ?)
  `).bind(data.relationship_id, profile.id, profile.id).first();
  
  if (!rel) return c.json({ error: 'Unauthorized' }, 403);
  
  const dealId = nanoid();
  await c.env.DB.prepare(`
    INSERT INTO merchant_deals (id, relationship_id, deal_type, title, amount, currency, status, issue_date, due_date, expected_return, created_by)
    VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)
  `).bind(dealId, data.relationship_id, data.deal_type, data.title, data.amount,
    data.currency || 'USDT', new Date().toISOString().split('T')[0],
    data.due_date || null, data.expected_return || null, userId
  ).run();
  
  // Audit log
  await insertAuditLog(c.env.DB, {
    relationship_id: data.relationship_id,
    actor_user_id: userId,
    actor_merchant_id: profile.id,
    entity_type: 'deal',
    entity_id: dealId,
    action: 'deal_created',
    detail_json: { title: data.title, amount: data.amount },
  });
  
  const deal = await c.env.DB.prepare('SELECT * FROM merchant_deals WHERE id = ?').bind(dealId).first();
  return c.json({ ok: true, deal });
});
```

---

## 11. Settlement & Profit Workflows

### 11.1 Submit Settlement

Settlements always require counterparty approval.

```typescript
export function submitSettlement(dealId: string, data: {
  amount: number; currency?: string; note?: string;
}): { settlement_id: string; approval_id: string } {
  // 1. Create settlement record (status: 'pending')
  // 2. Determine reviewer (counterparty of the relationship)
  // 3. Create approval request (type: 'settlement_submit')
  // 4. Generate audit log: 'settlement_submitted'
  // 5. System message to relationship
  
  return { settlement_id, approval_id };
}
```

### 11.2 Record Profit

Monthly profit recording for partnership/arbitrage deals.

```typescript
export function recordProfit(dealId: string, data: {
  amount: number; period_key?: string; currency?: string; note?: string;
}): { profit_id: string; approval_id: string } {
  // period_key defaults to current month: '2026-03'
  // Creates ProfitRecord + MerchantApproval
  // Generates audit log: 'profit_recorded'
  return { profit_id, approval_id };
}
```

### 11.3 Request Deal Close

```typescript
export function requestDealClose(dealId: string): { approval_id: string } {
  // Cannot close already closed/settled/cancelled deals
  // Creates approval (type: 'deal_close')
  // System message: close requested
  return { approval_id };
}
```

---

## 12. Approval Engine

### 12.1 Core Principle

> **Approved → mutate business data. Rejected → no mutation.**

### 12.2 Approval Types

| Type | Target | On Approve |
|------|--------|------------|
| `settlement_submit` | Settlement | Mark settled, update deal P&L, close deal |
| `profit_record_submit` | ProfitRecord | Mark approved, add to deal `realized_pnl` |
| `capital_adjustment` | Deal | Adjust deal `amount` |
| `deal_close` | Deal | Set status to `closed`, set `close_date` |
| `relationship_suspend` | Relationship | Set status to `suspended` |
| `relationship_terminate` | Relationship | Set status to `terminated` |

### 12.3 Approve Logic

```typescript
export function approveRequest(approvalId: string, note?: string): void {
  const approval = store.approvals.find(a => a.id === approvalId);
  if (approval.status !== 'pending') throw new Error('Already resolved');
  
  approval.status = 'approved';
  approval.resolution_note = note || null;
  approval.resolved_at = now();
  
  // Apply business mutation based on type
  switch (approval.type) {
    case 'settlement_submit': {
      const settlement = store.settlements.find(s => s.id === approval.target_entity_id);
      settlement.status = 'approved';
      settlement.approved_at = now();
      
      // Update deal P&L
      const deal = store.deals.find(d => d.id === settlement.deal_id);
      deal.realized_pnl = (deal.realized_pnl || 0) + (settlement.amount - deal.amount);
      deal.status = 'settled';
      deal.close_date = today;
      break;
    }
    case 'profit_record_submit': {
      const pr = store.profitRecords.find(p => p.id === approval.target_entity_id);
      pr.status = 'approved';
      pr.approved_at = now();
      
      const deal = store.deals.find(d => d.id === pr.deal_id);
      deal.realized_pnl = (deal.realized_pnl || 0) + pr.amount;
      break;
    }
    case 'capital_adjustment': {
      const deal = store.deals.find(d => d.id === approval.target_entity_id);
      deal.amount = Math.max(0, deal.amount + adjustment);
      break;
    }
    case 'deal_close': {
      const deal = store.deals.find(d => d.id === approval.target_entity_id);
      deal.status = 'closed';
      deal.close_date = today;
      break;
    }
  }
  
  // Audit log + system message
}
```

### 12.4 Reject Logic

```typescript
export function rejectRequest(approvalId: string, note?: string): void {
  approval.status = 'rejected';
  // NO business data mutation
  // Audit log + system message only
}
```

### 12.5 Worker Implementation (Atomic Transaction)

```typescript
app.post('/api/merchant/approvals/:id/approve', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();
  const { note } = await c.req.json();
  const db = c.env.DB;
  
  const approval = await db.prepare('SELECT * FROM merchant_approvals WHERE id = ? AND reviewer_user_id = ?')
    .bind(id, userId).first();
  if (!approval) return c.json({ error: 'Not found or unauthorized' }, 404);
  if (approval.status !== 'pending') return c.json({ error: 'Already resolved' }, 400);
  
  // Use D1 batch for atomicity
  const statements = [
    db.prepare('UPDATE merchant_approvals SET status = ?, resolution_note = ?, resolved_at = ?, updated_at = ? WHERE id = ?')
      .bind('approved', note || null, new Date().toISOString(), new Date().toISOString(), id),
  ];
  
  // Add mutation statements based on type
  const payload = JSON.parse(approval.proposed_payload);
  switch (approval.type) {
    case 'settlement_submit':
      statements.push(
        db.prepare('UPDATE merchant_settlements SET status = ?, approved_at = ? WHERE id = ?')
          .bind('approved', new Date().toISOString(), approval.target_entity_id),
        db.prepare('UPDATE merchant_deals SET status = ?, realized_pnl = COALESCE(realized_pnl, 0) + ?, close_date = ? WHERE id = ?')
          .bind('settled', payload.amount - /* deal.amount */, new Date().toISOString().split('T')[0], payload.deal_id)
      );
      break;
    // ... other types
  }
  
  // Audit log
  statements.push(
    db.prepare('INSERT INTO merchant_audit_logs (id, relationship_id, actor_user_id, entity_type, entity_id, action, detail_json) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(nanoid(), approval.relationship_id, userId, 'approval', id, 'approval_approved', JSON.stringify({ type: approval.type, note }))
  );
  
  await db.batch(statements);
  return c.json({ ok: true });
});
```

---

## 13. Capital Owner Analytics

### 13.1 Purpose

When Merchant A provides capital to Merchant B, Merchant A must see:

| Metric | Computation |
|--------|-------------|
| Capital Deployed | Sum of all deal amounts for this counterparty |
| Active Capital | Sum of amounts where deal status ∈ {active, due, overdue} |
| Returned Capital | Sum of amounts where deal status ∈ {settled, closed} |
| Realized Profit | Sum of `realized_pnl` across all deals |
| Return Percentage (ROI) | `(realized_profit / capital_deployed) × 100` |
| Exposure per Counterparty | Breakdown by merchant |

### 13.2 Implementation

```typescript
export function computeAnalytics(): PortfolioAnalytics {
  const myRels = store.relationships.filter(r =>
    r.merchant_a_id === myId || r.merchant_b_id === myId
  );
  const myDeals = store.deals.filter(d => myRels.some(r => r.id === d.relationship_id));
  
  // Capital by counterparty
  const counterpartyMap = new Map();
  for (const rel of myRels) {
    const cpId = rel.merchant_a_id === myId ? rel.merchant_b_id : rel.merchant_a_id;
    const cpName = store.merchants.find(m => m.id === cpId)?.display_name;
    const relDeals = myDeals.filter(d => d.relationship_id === rel.id);
    
    const deployed = relDeals.reduce((s, d) => s + d.amount, 0);
    const returned = relDeals
      .filter(d => ['settled', 'closed'].includes(d.status))
      .reduce((s, d) => s + d.amount, 0);
    const profit = relDeals.reduce((s, d) => s + (d.realized_pnl || 0), 0);
    
    counterpartyMap.set(cpId, { name: cpName, deployed, returned, profit });
  }
  
  const capitalByCounterparty = [...counterpartyMap.values()].map(c => ({
    ...c,
    roi: c.deployed > 0 ? (c.profit / c.deployed) * 100 : 0,
  }));
  
  return { /* all metrics */ };
}
```

### 13.3 Analytics Interface

```typescript
interface PortfolioAnalytics {
  totalDeployed: number;
  activeDeployed: number;
  returnedCapital: number;
  realizedProfit: number;
  unsettledExposure: number;
  overdueDeals: number;
  activeRelationships: number;
  pendingApprovals: number;
  capitalByCounterparty: {
    name: string;
    deployed: number;
    returned: number;
    profit: number;
    roi: number;
  }[];
  dealsByType: Record<string, number>;
  riskIndicators: {
    type: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
  }[];
}
```

---

## 14. Portfolio Analytics

### 14.1 Metrics Computed from Real Data

| Metric | Source | Formula |
|--------|--------|---------|
| Total Deployed | All deals | `SUM(deal.amount)` |
| Active Deployed | Active/due/overdue deals | `SUM(deal.amount) WHERE status IN (active, due, overdue)` |
| Returned Capital | Settled/closed deals | `SUM(deal.amount) WHERE status IN (settled, closed)` |
| Realized Profit | All deals | `SUM(deal.realized_pnl)` |
| Unsettled Exposure | Active deals | Same as Active Deployed |
| Overdue Deals | Overdue status | `COUNT WHERE status = 'overdue'` |
| Active Relationships | Active status | `COUNT WHERE status = 'active'` |
| Pending Approvals | Pending approvals I must review | `COUNT WHERE reviewer = me AND status = 'pending'` |

### 14.2 SQL Queries for Analytics

```sql
-- Portfolio summary
SELECT
  SUM(d.amount) as total_deployed,
  SUM(CASE WHEN d.status IN ('active','due','overdue') THEN d.amount ELSE 0 END) as active_deployed,
  SUM(CASE WHEN d.status IN ('settled','closed') THEN d.amount ELSE 0 END) as returned_capital,
  SUM(COALESCE(d.realized_pnl, 0)) as realized_profit,
  SUM(CASE WHEN d.status = 'overdue' THEN 1 ELSE 0 END) as overdue_count
FROM merchant_deals d
JOIN merchant_relationships r ON d.relationship_id = r.id
WHERE r.merchant_a_id = ? OR r.merchant_b_id = ?;

-- Capital by counterparty
SELECT
  CASE WHEN r.merchant_a_id = ? THEN r.merchant_b_id ELSE r.merchant_a_id END as counterparty_id,
  mp.display_name,
  SUM(d.amount) as deployed,
  SUM(CASE WHEN d.status IN ('settled','closed') THEN d.amount ELSE 0 END) as returned,
  SUM(COALESCE(d.realized_pnl, 0)) as profit
FROM merchant_deals d
JOIN merchant_relationships r ON d.relationship_id = r.id
JOIN merchant_profiles mp ON mp.id = CASE WHEN r.merchant_a_id = ? THEN r.merchant_b_id ELSE r.merchant_a_id END
WHERE r.merchant_a_id = ? OR r.merchant_b_id = ?
GROUP BY counterparty_id;
```

---

## 15. Risk Engine

### 15.1 Risk Indicators

| Risk Type | Severity | Trigger |
|-----------|----------|---------|
| Overdue Lending | HIGH | Any deal with `status = 'overdue'` |
| Concentration Risk | MEDIUM | Any counterparty > 50% of total exposure |
| Approval Backlog | LOW | More than 3 pending approvals |
| Settlement Variance | MEDIUM | Settlement amount differs > 10% from deal amount |
| Repeated Rejections | LOW | > 2 rejections in same relationship |

### 15.2 Implementation

```typescript
const riskIndicators = [];

// Overdue detection
if (overdueDeals.length > 0) {
  riskIndicators.push({
    type: 'overdue',
    severity: 'high',
    message: `${overdueDeals.length} deal(s) overdue — total exposure: $${totalOverdue.toLocaleString()}`,
  });
}

// Concentration risk
for (const [, cp] of counterpartyMap) {
  const pct = totalDeployed > 0 ? (cp.deployed / totalDeployed) * 100 : 0;
  if (pct > 50) {
    riskIndicators.push({
      type: 'concentration',
      severity: 'medium',
      message: `${cp.name} represents ${pct.toFixed(0)}% of total exposure`,
    });
  }
}

// Approval backlog
if (pendingApprovals > 3) {
  riskIndicators.push({
    type: 'backlog',
    severity: 'low',
    message: `${pendingApprovals} pending approvals — review queue growing`,
  });
}
```

---

## 16. Audit Logging

### 16.1 Logged Actions

| Action | Entity Type | When |
|--------|-------------|------|
| `invite_sent` | invite | Invite created |
| `invite_accepted` | invite | Invite accepted |
| `invite_rejected` | invite | Invite rejected |
| `invite_withdrawn` | invite | Invite withdrawn |
| `relationship_created` | relationship | After invite acceptance |
| `deal_created` | deal | New deal |
| `deal_activated` | deal | Draft → Active |
| `deal_close_requested` | deal | Close request submitted |
| `settlement_submitted` | settlement | Settlement submitted |
| `profit_recorded` | profit_record | Profit recorded |
| `approval_approved` | approval | Approval granted |
| `approval_rejected` | approval | Approval denied |

### 16.2 Log Structure

```typescript
interface AuditLog {
  id: string;                    // Unique ID
  relationship_id: string | null; // NULL for non-relationship actions
  actor_user_id: string;         // Who performed the action
  actor_merchant_id: string | null;
  entity_type: string;           // 'invite', 'deal', 'settlement', etc.
  entity_id: string;             // ID of affected entity
  action: string;                // Action name
  detail_json: Record<string, unknown>; // Context/payload
  created_at: string;            // Immutable timestamp
}
```

### 16.3 Log Creation Helper

```typescript
function addAuditLog(data: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
  const log: AuditLog = {
    id: genId('aud'),
    created_at: new Date().toISOString(),
    ...data,
  };
  store.auditLogs.unshift(log);  // Newest first
  return log;
}
```

---

## 17. Trading Module (P2P/FIFO)

### 17.1 FIFO Cost Basis Engine

The trading module implements First-In-First-Out cost basis tracking for P2P crypto trading.

#### Types

```typescript
interface Batch {
  id: string;
  ts: number;            // Acquisition timestamp
  source: string;        // Supplier name
  note: string;
  buyPriceQAR: number;   // Cost per USDT in QAR
  initialUSDT: number;   // Initial quantity
  revisions: any[];
}

interface Trade {
  id: string;
  ts: number;
  inputMode: 'USDT' | 'QAR';
  amountUSDT: number;
  sellPriceQAR: number;
  feeQAR: number;
  note: string;
  voided: boolean;
  usesStock: boolean;     // Whether to deduct from FIFO batches
  revisions: any[];
  customerId: string;
}

interface DerivedBatch {
  id: string;
  buyPriceQAR: number;
  initialUSDT: number;
  remainingUSDT: number;  // After FIFO allocations
}

interface TradeCalcResult {
  ok: boolean;
  netQAR: number;         // Revenue - Cost - Fees
  avgBuyQAR: number;      // Weighted average cost of allocated batches
  margin: number;          // Net / Revenue × 100
  ppu: number;             // Profit per unit
  slices: { batchId: string; qty: number; cost: number }[];
}
```

#### FIFO Computation

```typescript
export function computeFIFO(batches: Batch[], trades: Trade[]): DerivedState {
  const sortedBatches = [...batches].sort((a, b) => a.ts - b.ts);
  const remaining = new Map<string, number>();
  for (const b of sortedBatches) remaining.set(b.id, b.initialUSDT);

  const sortedTrades = [...trades]
    .filter(t => !t.voided && t.usesStock)
    .sort((a, b) => a.ts - b.ts);

  for (const t of sortedTrades) {
    let qtyLeft = t.amountUSDT;
    const slices = [];
    let totalCost = 0;

    for (const b of sortedBatches) {
      if (qtyLeft <= 0) break;
      const rem = remaining.get(b.id) || 0;
      if (rem <= 0) continue;
      
      const allocated = Math.min(rem, qtyLeft);
      slices.push({ batchId: b.id, qty: allocated, cost: allocated * b.buyPriceQAR });
      totalCost += allocated * b.buyPriceQAR;
      remaining.set(b.id, rem - allocated);
      qtyLeft -= allocated;
    }

    const revenue = t.amountUSDT * t.sellPriceQAR;
    const netQAR = revenue - totalCost - t.feeQAR;
    const margin = revenue > 0 ? (netQAR / revenue) * 100 : 0;
    
    tradeCalc.set(t.id, { ok: true, netQAR, avgBuyQAR: totalCost / t.amountUSDT, margin, ppu: netQAR / t.amountUSDT, slices });
  }

  return { batches: derivedBatches, tradeCalc };
}
```

#### KPIs

```typescript
export function kpiFor(state: TrackerState, derived: DerivedState, range: string) {
  const trades = state.trades.filter(t => !t.voided && inRange(t.ts, range));
  // Returns: { rev, net, qty, fee, count, avgMgn }
}
```

### 17.2 P2P Price Tracker

Uses KV storage for P2P price snapshots from exchanges.

```typescript
// API endpoints
const p2p = {
  status: () => request<{ ok: boolean; lastUpdate: string }>('/api/status'),
  latest: () => request<P2PSnapshot>('/api/latest'),
  history: () => request<P2PHistoryPoint[]>('/api/history'),
};
```

#### P2P Data Structures

```typescript
interface P2PSnapshot {
  ts: number;
  sellAvg: number | null;
  buyAvg: number | null;
  bestSell: number | null;
  bestBuy: number | null;
  sellDepth: number;
  buyDepth: number;
  spread: number | null;
  spreadPct: number | null;
  sellOffers: P2POffer[];
  buyOffers: P2POffer[];
}
```

---

## 18. Internationalization

### 18.1 Supported Languages

- **English** (en) — default
- **Arabic** (ar) — RTL support

### 18.2 Usage

```typescript
// In components
import { useT } from '@/lib/i18n';

function MyComponent() {
  const t = useT();
  return (
    <div dir={t.isRTL ? 'rtl' : 'ltr'}>
      <h1>{t('dashboard')}</h1>
      <p>{t('netProfit')}</p>
    </div>
  );
}
```

### 18.3 Translation Keys

Over 200 translation keys covering:
- Navigation (sidebar, topbar)
- Dashboard KPIs
- Orders/Trading
- Stock management
- Calendar
- CRM
- Settings

---

## 19. API Reference

### 19.1 Complete Route Map

#### Auth
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/auth/signup` | `{email, password}` | `{ok, user_id}` |
| POST | `/api/auth/login` | `{email, password}` | `{ok, token, user_id}` |
| POST | `/api/auth/logout` | — | `{ok}` |
| POST | `/api/auth/verify-email` | `{token}` | `{ok}` |
| POST | `/api/auth/reset-password` | `{email}` | `{ok}` |
| GET | `/api/auth/session` | — | `{user_id, email}` or `null` |

#### Merchant Profile
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/merchant/profile/me` | — | `{profile}` |
| POST | `/api/merchant/profile/ensure` | `{nickname, display_name, ...}` | `{profile}` |
| PATCH | `/api/merchant/profile/me` | `Partial<MerchantProfile>` | `{profile}` |
| GET | `/api/merchant/profile/:id` | — | `{profile}` |
| GET | `/api/merchant/search?q=` | — | `{results: MerchantSearchResult[]}` |
| GET | `/api/merchant/check-nickname?nickname=` | — | `{nickname, available}` |

#### Invites
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/merchant/invites` | `{to_merchant_id, purpose?, ...}` | `{ok, invite}` |
| GET | `/api/merchant/invites/inbox` | — | `{invites}` |
| GET | `/api/merchant/invites/sent` | — | `{invites}` |
| POST | `/api/merchant/invites/:id/accept` | — | `{ok, relationship_id}` |
| POST | `/api/merchant/invites/:id/reject` | — | `{ok}` |
| POST | `/api/merchant/invites/:id/withdraw` | — | `{ok}` |

#### Relationships
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/merchant/relationships` | — | `{relationships}` |
| GET | `/api/merchant/relationships/:id` | — | `{relationship}` |
| PATCH | `/api/merchant/relationships/:id/settings` | `Partial<Relationship>` | `{ok, relationship}` |
| POST | `/api/merchant/relationships/:id/suspend` | — | `{ok, approval_id}` |
| POST | `/api/merchant/relationships/:id/terminate` | — | `{ok, approval_id}` |

#### Deals
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/merchant/deals` | — | `{deals}` |
| GET | `/api/merchant/deals?relationship_id=` | — | `{deals}` |
| POST | `/api/merchant/deals` | `{relationship_id, deal_type, title, amount, ...}` | `{ok, deal}` |
| PATCH | `/api/merchant/deals/:id` | `Partial<Deal>` | `{ok, deal}` |
| POST | `/api/merchant/deals/:id/submit-settlement` | `{amount, currency?, note?}` | `{ok, settlement_id, approval_id}` |
| POST | `/api/merchant/deals/:id/record-profit` | `{amount, period_key?, ...}` | `{ok, profit_id, approval_id}` |
| POST | `/api/merchant/deals/:id/close` | `{close_date?, note?}` | `{ok, approval_id}` |

#### Messages
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/merchant/messages/:relId/messages` | — | `{messages}` |
| POST | `/api/merchant/messages/:relId/messages` | `{body, message_type?}` | `{ok, message}` |
| POST | `/api/merchant/messages/mark-read/:msgId` | — | `{ok}` |

#### Approvals
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/merchant/approvals/inbox` | — | `{approvals}` |
| GET | `/api/merchant/approvals/sent` | — | `{approvals}` |
| POST | `/api/merchant/approvals/:id/approve` | `{note?}` | `{ok}` |
| POST | `/api/merchant/approvals/:id/reject` | `{note?}` | `{ok}` |

#### Audit
| Method | Path | Response |
|--------|------|----------|
| GET | `/api/merchant/audit/relationship/:id` | `{logs}` |
| GET | `/api/merchant/audit/activity` | `{logs}` |

#### Notifications
| Method | Path | Response |
|--------|------|----------|
| GET | `/api/merchant/notifications?limit=&unread=` | `{notifications}` |
| GET | `/api/merchant/notifications/count` | `{unread}` |
| POST | `/api/merchant/notifications/:id/read` | `{ok}` |
| POST | `/api/merchant/notifications/read-all` | `{ok}` |

#### Trading
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/batches` | — | `{batches}` |
| POST | `/api/batches` | `Batch data` | `{ok, batch}` |
| PATCH | `/api/batches/:id` | `Partial<Batch>` | `{ok, batch}` |
| DELETE | `/api/batches/:id` | — | `{ok, deleted}` |
| GET | `/api/trades` | — | `{trades}` |
| POST | `/api/trades` | `Trade data` | `{ok, trade}` |
| PATCH | `/api/trades/:id` | `Partial<Trade>` | `{ok, trade}` |
| PATCH | `/api/trades/:id/void` | — | `{ok}` |
| DELETE | `/api/trades/:id` | — | `{ok, deleted}` |

#### P2P
| Method | Path | Response |
|--------|------|----------|
| GET | `/api/status` | `{ok, lastUpdate}` |
| GET | `/api/latest` | `P2PSnapshot` |
| GET | `/api/history` | `P2PHistoryPoint[]` |

#### Preferences
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/preferences` | — | `{preferences}` |
| PATCH | `/api/preferences` | `Partial<Preferences>` | `{ok, preferences}` |

#### Polling
| Method | Path | Response |
|--------|------|----------|
| GET | `/api/merchant/poll?since=` | `{invites, messages}` |

---

## 20. Frontend Architecture

### 20.1 Route Structure

```
/auth/login          → LoginPage
/auth/signup         → SignupPage
/auth/verify-email   → VerifyEmailPage
/auth/reset-password → ResetPasswordPage
/onboarding          → OnboardingPage (AuthGuard)

// App Shell (AuthGuard + ProfileGuard + AppLayout)
 /dashboard           → DashboardPage
 /trading/orders      → OrdersPage
 /trading/stock       → StockPage
 /trading/calendar    → CalendarPage
 /trading/p2p         → P2PTrackerPage
 /trading/portfolio   → PortfolioPage
 /trading/trades      → TradesPage
 /crm                 → CRMPage
 /network             → NetworkPage (Directory + Invites + Relationships + Approvals)
 /network/relationships/:id → RelationshipWorkspace
 /messages            → MessagesPage
 /deals               → DealsPage
 /analytics           → AnalyticsPage
 /vault               → VaultPage
 /audit               → AuditPage
 /settings            → SettingsPage
 /notifications       → NotificationsPage
```

### 20.2 Guards

```typescript
// AuthGuard — redirects to /auth/login if not authenticated
function AuthGuard({ children }) {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/auth/login" />;
  return children;
}

// ProfileGuard — redirects to /onboarding if no merchant profile
function ProfileGuard({ children }) {
  const { profile, isLoading } = useAuth();
  if (isLoading) return null;
  if (!profile) return <Navigate to="/onboarding" />;
  return children;
}
```

### 20.3 State Management

- **AuthContext** — user auth state + merchant profile
- **ThemeContext** — theme, language, layout preferences
- **Backend Store** — in-memory reactive store (demo mode)
- **React Query** — server state caching (production mode)

### 20.4 Key Components

| Component | File | Purpose |
|-----------|------|---------|
| AppLayout | `src/components/layout/AppLayout.tsx` | Main shell with sidebar |
| AppSidebar | `src/components/layout/AppSidebar.tsx` | Navigation sidebar |
| TrackerTopbar | `src/components/layout/TrackerTopbar.tsx` | Top bar with controls |
| PageHeader | `src/components/layout/PageHeader.tsx` | Page title + breadcrumbs |
| StatCard | `src/components/layout/StatCard.tsx` | KPI stat display card |

---

## 21. Cloudflare Deployment Guide

### 21.1 Prerequisites

```bash
npm install -g wrangler
wrangler login
```

### 21.2 Create D1 Database

```bash
wrangler d1 create tracker-platform
# Copy the database_id to wrangler.jsonc
```

### 21.3 Run Migrations

```bash
wrangler d1 execute tracker-platform --file=infra/d1/migrations/001_initial.sql
```

### 21.4 Create KV Namespace

```bash
wrangler kv:namespace create P2P_KV
# Copy the namespace id to wrangler.jsonc
```

### 21.5 Set Secrets

```bash
wrangler secret put JWT_SECRET
# Enter a strong random secret
```

### 21.6 Worker Entry Point

```typescript
// apps/api/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import auth from './routes/auth';
import merchant from './routes/merchant';
import trading from './routes/trading';
import p2p from './routes/p2p';

type Env = {
  DB: D1Database;
  P2P_KV: KVNamespace;
  JWT_SECRET: string;
  ALLOWED_ORIGINS: string;
};

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', cors({
  origin: (origin, c) => c.env.ALLOWED_ORIGINS === '*' ? origin : c.env.ALLOWED_ORIGINS,
  credentials: true,
}));

// Auth middleware (skip auth routes)
app.use('/api/merchant/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);
  
  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = await verify(token, c.env.JWT_SECRET);
    c.set('userId', payload.sub);
    c.set('email', payload.email);
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
  await next();
});

// Routes
app.route('/api/auth', auth);
app.route('/api/merchant', merchant);
app.route('/api', trading);
app.route('/api', p2p);

// Cron handler
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env) {
    // Expire old invites
    const now = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE merchant_invites SET status = 'expired', updated_at = ?
      WHERE status = 'pending' AND expires_at < ?
    `).bind(now, now).run();
    
    // Check overdue deals
    const today = now.split('T')[0];
    await env.DB.prepare(`
      UPDATE merchant_deals SET status = 'overdue', updated_at = ?
      WHERE status IN ('active', 'due') AND due_date < ?
    `).bind(now, today).run();
  },
};
```

### 21.7 Build & Deploy

```bash
# Build frontend
cd apps/web
npm run build

# Deploy
cd ../..
wrangler deploy
```

### 21.8 Project Structure (Recommended)

```
tracker-platform/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── index.ts          # Worker entry
│   │       ├── middleware/
│   │       │   └── auth.ts       # JWT validation
│   │       ├── routes/
│   │       │   ├── auth.ts       # Auth endpoints
│   │       │   ├── merchant.ts   # Merchant profile, invites, relationships
│   │       │   ├── deals.ts      # Deals CRUD + lifecycle
│   │       │   ├── approvals.ts  # Approval engine
│   │       │   ├── messages.ts   # Messaging
│   │       │   ├── audit.ts      # Audit log queries
│   │       │   ├── trading.ts    # Batches + trades (FIFO)
│   │       │   └── p2p.ts        # P2P tracker
│   │       └── lib/
│   │           ├── db.ts         # D1 helper functions
│   │           └── audit.ts      # Audit log insertion helper
│   └── web/                      # React frontend (this repo)
│       ├── src/
│       ├── public/
│       └── vite.config.ts
├── infra/
│   ├── wrangler.jsonc
│   └── d1/
│       └── migrations/
│           └── 001_initial.sql
└── package.json
```

---

## 22. Business Logic Engine (Current Implementation)

The current codebase uses an **in-memory simulation layer** (`src/lib/backend-engine.ts`) that mirrors the exact business logic that should run on the Cloudflare Worker. This ensures:

1. **API contract compliance** — all functions match API endpoint signatures
2. **Behavior fidelity** — approval mutations, audit logging, system messages all work identically
3. **Easy migration** — move function bodies to Worker route handlers

### 22.1 Module Map

| Engine Function | API Endpoint | Purpose |
|----------------|--------------|---------|
| `searchMerchants()` | `GET /api/merchant/search` | Directory search |
| `sendInvite()` | `POST /api/merchant/invites` | Create invite |
| `acceptInvite()` | `POST /api/merchant/invites/:id/accept` | Accept + create relationship |
| `rejectInvite()` | `POST /api/merchant/invites/:id/reject` | Reject invite |
| `withdrawInvite()` | `POST /api/merchant/invites/:id/withdraw` | Withdraw invite |
| `createDeal()` | `POST /api/merchant/deals` | Create deal |
| `activateDeal()` | `PATCH /api/merchant/deals/:id` | Activate deal |
| `submitSettlement()` | `POST /api/merchant/deals/:id/submit-settlement` | Submit settlement |
| `recordProfit()` | `POST /api/merchant/deals/:id/record-profit` | Record profit |
| `requestDealClose()` | `POST /api/merchant/deals/:id/close` | Request deal close |
| `approveRequest()` | `POST /api/merchant/approvals/:id/approve` | Approve + mutate |
| `rejectRequest()` | `POST /api/merchant/approvals/:id/reject` | Reject (no mutation) |
| `sendMessage()` | `POST /api/merchant/messages/:rel/messages` | Send message |
| `getMessages()` | `GET /api/merchant/messages/:rel/messages` | Get messages |
| `getRelationships()` | `GET /api/merchant/relationships` | List relationships |
| `getDeals()` | `GET /api/merchant/deals` | List deals |
| `getApprovalsInbox()` | `GET /api/merchant/approvals/inbox` | Pending for review |
| `getApprovalsSent()` | `GET /api/merchant/approvals/sent` | Submitted by me |
| `getAuditLogs()` | `GET /api/merchant/audit/activity` | Audit trail |
| `computeAnalytics()` | (computed client-side or server endpoint) | Portfolio analytics |

---

## 23. Data Store (Current Implementation)

### 23.1 Store Structure

```typescript
interface Store {
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
```

### 23.2 Seed Data

The store is seeded with realistic demo data:

- **6 merchants** (Demo Trader, Gulf Exchange, Doha OTC, CryptoKnight16, Al Rashid Group, Tamim Trading)
- **3 relationships** (lending, arbitrage, capital placement)
- **2 pending invites** (from Tamim Trading and CryptoKnight16)
- **6 deals** (various types and statuses)
- **3 approvals** (settlement, capital adjustment, profit record)
- **13 messages** across 3 relationship channels
- **6 audit logs** for historical actions

### 23.3 Reactivity

```typescript
// Simple pub/sub for UI reactivity
const listeners = new Set<() => void>();

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyChange(): void {
  listeners.forEach(fn => fn());
}
```

Components subscribe to store changes:
```typescript
useEffect(() => {
  const unsub = subscribe(() => {
    setDeals(getDeals());
    setApprovals(getApprovalsInbox());
  });
  return unsub;
}, []);
```

---

## 24. End-to-End Test Scenarios

### Scenario A: Merchant Discovery & Relationship

```
1. Merchant A creates profile (MRC-XXXXXXXX)
2. Merchant B creates profile (MRC-YYYYYYYY)
3. B searches for A by nickname
4. B sends invite to A
5. A receives invite in inbox
6. A accepts invite
7. ✓ Relationship created with workspace
8. ✓ Audit logs: invite_sent, invite_accepted, relationship_created
9. ✓ System message in new relationship
```

### Scenario B: Deal Lifecycle + Capital Owner ROI

```
1. A creates lending deal: 25,000 USDT to B, due in 90 days, expected return 750
2. A activates the deal
3. B submits settlement: 25,750 USDT (principal + return)
4. A approves settlement
5. ✓ Deal status → settled
6. ✓ deal.realized_pnl = 750
7. ✓ Analytics: totalDeployed = 25,000, returnedCapital = 25,000, realizedProfit = 750
8. ✓ Capital by counterparty shows B with ROI = 3%
```

### Scenario C: Overdue Detection + Risk

```
1. Create lending deal with due_date = yesterday
2. Call getDeals()
3. ✓ Deal status automatically → overdue
4. ✓ Risk indicator: "1 deal(s) overdue — total exposure: $25,000"
5. ✓ Analytics: overdueDeals = 1
```

### Scenario D: Rejection Protection

```
1. B submits profit record: 500 USDT
2. A rejects the approval
3. ✓ Approval status → rejected
4. ✓ deal.realized_pnl unchanged (NO mutation)
5. ✓ Audit log: approval_rejected
6. ✓ System message: rejection notice
```

### Scenario E: Multi-Session Persistence

```
1. Perform actions in Session 1
2. Refresh browser
3. Login from different device
4. ✓ All relationships, deals, messages, approvals persist
   (Requires deployed Cloudflare Worker + D1)
```

---

## 25. Migration Path: Demo → Production

### Step 1: Create Worker Project

```bash
mkdir apps/api
cd apps/api
npm init -y
npm install hono nanoid
```

### Step 2: Port Business Logic

Copy function bodies from `src/lib/backend-engine.ts` into Worker route handlers. Replace in-memory store operations with D1 SQL queries.

**Example migration:**

```typescript
// FROM (backend-engine.ts)
export function createDeal(data) {
  const store = getStore();
  const deal = { id: genId('deal'), ...data, status: 'draft' };
  store.deals.push(deal);
  addAuditLog({ entity_type: 'deal', entity_id: deal.id, action: 'deal_created' });
  return deal;
}

// TO (apps/api/src/routes/deals.ts)
app.post('/deals', async (c) => {
  const userId = c.get('userId');
  const data = await c.req.json();
  const db = c.env.DB;
  
  const dealId = nanoid();
  await db.batch([
    db.prepare('INSERT INTO merchant_deals (...) VALUES (...)').bind(...),
    db.prepare('INSERT INTO merchant_audit_logs (...) VALUES (...)').bind(...),
    db.prepare('INSERT INTO merchant_messages (...) VALUES (...)').bind(...),
  ]);
  
  const deal = await db.prepare('SELECT * FROM merchant_deals WHERE id = ?').bind(dealId).first();
  return c.json({ ok: true, deal });
});
```

### Step 3: Update Frontend API Client

The `src/lib/api.ts` client already targets the correct endpoints. Simply:

1. Set `VITE_API_BASE_URL` to the Worker URL (or leave empty if same-origin)
2. Remove demo mode fallback from `auth-context.tsx`
3. Remove `backend-engine.ts` and `backend-store.ts` imports from page components

### Step 4: Deploy

```bash
wrangler d1 execute tracker-platform --file=infra/d1/migrations/001_initial.sql
wrangler deploy
```

### Step 5: Verify

Run all 5 test scenarios against the deployed Worker.

---

## Appendix A: Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `JWT_SECRET` | Wrangler secret | JWT signing key |
| `ALLOWED_ORIGINS` | wrangler.jsonc vars | CORS allowed origins |
| `AUTH_SOURCE` | wrangler.jsonc vars | Auth provider type |
| `VITE_API_BASE_URL` | Frontend .env | API base URL (empty = same-origin) |

## Appendix B: Data Integrity Constraints

1. **Profit totals = sum of approved profit records** for each deal
2. **Exposure = active capital − settled capital** per counterparty
3. **Deal state transitions** follow allowed paths (no draft → settled)
4. **Expired approvals cannot be approved** — check `expires_at` before mutation
5. **All critical mutations wrapped in `db.batch()`** for atomicity

## Appendix C: Realtime Updates (Future)

For production, implement via Durable Objects:

```typescript
// Each relationship gets a Durable Object for WebSocket coordination
export class RelationshipRoom {
  sessions: WebSocket[] = [];
  
  async fetch(request: Request) {
    const [client, server] = Object.values(new WebSocketPair());
    this.sessions.push(server);
    server.accept();
    
    server.addEventListener('message', (event) => {
      // Broadcast to all connected sessions
      for (const session of this.sessions) {
        if (session !== server) session.send(event.data);
      }
    });
    
    return new Response(null, { status: 101, webSocket: client });
  }
}
```

---

*End of Document*
