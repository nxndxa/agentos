import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const DEFAULT_FILE = process.env.CRM_DATA_FILE ?? resolve('.agentos/pleasure-pizza-crm.sqlite');
const CORPUS_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../data/pleasure-pizza-knowledge.txt');
const VECTOR_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../data/pleasure-pizza-knowledge-vectors.json');
const KNOWLEDGE_SOURCE = 'Pleasure Pizza Knowledge Base (1).pdf';
const LOCATIONS = new Set(['pleasure_point', 'east_side', 'downtown']);
const CUSTOMER_STATUSES = new Set(['new', 'active', 'vip', 'needs_attention', 'inactive']);
const LOYALTY_TIERS = new Set(['Bronze', 'Silver', 'Gold', 'Platinum']);
const CASE_STATUSES = new Set(['open', 'in_progress', 'waiting', 'resolved']);
const PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
const timestamp = () => new Date().toISOString();

function requiredText(value, field, max = 160) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${field} is required.`);
  return text.slice(0, max);
}

function optionalText(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function allowedValue(value, allowed, field) {
  if (!allowed.has(value)) throw new Error(`${field} is invalid.`);
  return value;
}

function optionalEmail(value) {
  const email = optionalText(value, 200).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email is invalid.');
  return email;
}

function optionalPhone(value) {
  const phone = optionalText(value, 40);
  if (phone && (!/^[+()\d.\s-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7)) throw new Error('Phone is invalid.');
  return phone;
}

function optionalIsoDate(value) {
  const date = optionalText(value, 40);
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(date) || Number.isNaN(Date.parse(date))) throw new Error('Last order date must be an ISO timestamp.');
  return new Date(date).toISOString();
}

function safeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(Math.round(number), 100_000)) : fallback;
}

function safeMoney(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(Number(number.toFixed(2)), 10_000_000)) : fallback;
}

function parseTags(value) {
  try { return JSON.parse(value || '[]'); } catch { return []; }
}

function tokenizeKnowledge(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter(token => token.length > 1) ?? [];
}

function knowledgeSnippet(text, tokens, maxLength = 300) {
  const compact = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  const lower = compact.toLowerCase();
  const position = tokens
    .map(token => lower.indexOf(token))
    .filter(index => index >= 0)
    .sort((left, right) => left - right)[0] ?? 0;
  const start = Math.max(0, position - Math.floor(maxLength * 0.3));
  const end = Math.min(compact.length, start + maxLength);
  return `${start ? '…' : ''}${compact.slice(start, end).trim()}${end < compact.length ? '…' : ''}`;
}

function customerFromRow(row) {
  if (!row) return null;
  return {
    id: row.id, name: row.name, email: row.email, phone: row.phone, location: row.location,
    status: row.status, loyaltyTier: row.loyalty_tier, lifetimeOrders: row.lifetime_orders,
    lifetimeSpend: row.lifetime_spend, lastOrderAt: row.last_order_at, tags: parseTags(row.tags),
    createdAt: row.created_at, updatedAt: row.updated_at
  };
}

function caseFromRow(row) {
  if (!row) return null;
  return {
    id: row.id, customerId: row.customer_id, subject: row.subject, category: row.category,
    priority: row.priority, status: row.status, channel: row.channel, message: row.message,
    assignedTo: row.assigned_to, createdAt: row.created_at, updatedAt: row.updated_at
  };
}

const activityFromRow = row => ({ id: row.id, type: row.type, customerId: row.customer_id, caseId: row.case_id, summary: row.summary, createdAt: row.created_at });

export class CrmStore {
  constructor(filePath = DEFAULT_FILE) {
    this.filePath = filePath;
    this.db = null;
    this.initializing = null;
    this.listeners = new Set();
    this.revision = 0;
    this.vectorIndex = null;
  }

  async init() {
    if (this.db) return;
    if (!this.initializing) {
      this.initializing = (async () => {
        await mkdir(dirname(this.filePath), { recursive: true });
        this.db = new DatabaseSync(this.filePath);
        this.db.exec(`
          PRAGMA journal_mode = WAL;
          PRAGMA foreign_keys = ON;
          PRAGMA busy_timeout = 5000;
          CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
            location TEXT NOT NULL, status TEXT NOT NULL, loyalty_tier TEXT NOT NULL,
            lifetime_orders INTEGER NOT NULL DEFAULT 0, lifetime_spend REAL NOT NULL DEFAULT 0,
            last_order_at TEXT, tags TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS cases (
            id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            subject TEXT NOT NULL, category TEXT NOT NULL, priority TEXT NOT NULL, status TEXT NOT NULL,
            channel TEXT NOT NULL, message TEXT NOT NULL DEFAULT '', assigned_to TEXT NOT NULL,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS activities (
            id TEXT PRIMARY KEY, type TEXT NOT NULL, customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
            case_id TEXT REFERENCES cases(id) ON DELETE CASCADE, summary TEXT NOT NULL, created_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_customers_updated ON customers(updated_at DESC);
          CREATE INDEX IF NOT EXISTS idx_cases_status_updated ON cases(status, updated_at DESC);
          CREATE INDEX IF NOT EXISTS idx_activities_customer_created ON activities(customer_id, created_at DESC);
          CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(title, content, source UNINDEXED, page UNINDEXED);
        `);
        await this.ingestKnowledge();
        await this.loadKnowledgeVectors();
      })();
    }
    await this.initializing;
  }

  async ingestKnowledge() {
    const corpus = await readFile(CORPUS_FILE, 'utf8');
    const digest = createHash('sha256').update(corpus).digest('hex');
    const current = this.db.prepare('SELECT value FROM metadata WHERE key = ?').get('knowledge_sha256')?.value;
    if (current === digest) return;
    const pages = corpus.split('\f').map(page => page.trim()).filter(Boolean);
    const insert = this.db.prepare('INSERT INTO knowledge_fts (title, content, source, page) VALUES (?, ?, ?, ?)');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.exec('DELETE FROM knowledge_fts');
      pages.forEach((content, index) => {
        const title = content.split('\n').map(line => line.trim()).find(Boolean) ?? `Knowledge Base page ${index + 1}`;
        insert.run(title.slice(0, 160), content, KNOWLEDGE_SOURCE, String(index + 1));
      });
      this.db.prepare('INSERT OR REPLACE INTO metadata VALUES (?, ?)').run('knowledge_sha256', digest);
      this.db.prepare('INSERT OR REPLACE INTO metadata VALUES (?, ?)').run('knowledge_pages', String(pages.length));
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  async loadKnowledgeVectors() {
    const artifact = JSON.parse(await readFile(VECTOR_FILE, 'utf8'));
    const corpusDigest = this.db.prepare('SELECT value FROM metadata WHERE key = ?').get('knowledge_sha256')?.value;
    if (artifact.schemaVersion !== 1 || artifact.algorithm !== 'sparse-tfidf-cosine') {
      throw new Error('Unsupported Pleasure Pizza knowledge-vector artifact.');
    }
    if (artifact.corpusSha256 !== corpusDigest || artifact.pageCount !== artifact.chunks.length) {
      throw new Error('Pleasure Pizza knowledge vectors do not match the indexed PDF corpus.');
    }
    this.vectorIndex = {
      ...artifact,
      vocabularyIndex: new Map(artifact.vocabulary.map((token, index) => [token, index]))
    };
    this.db.prepare('INSERT OR REPLACE INTO metadata VALUES (?, ?)').run('knowledge_vector_algorithm', artifact.algorithm);
    this.db.prepare('INSERT OR REPLACE INTO metadata VALUES (?, ?)').run('knowledge_vector_chunks', String(artifact.chunkCount));
  }

  searchKnowledgeVectors(query, limit) {
    const tokens = tokenizeKnowledge(query);
    const counts = new Map();
    for (const token of tokens) {
      if (this.vectorIndex.vocabularyIndex.has(token)) counts.set(token, (counts.get(token) ?? 0) + 1);
    }
    const rawQuery = [...counts].map(([token, count]) => {
      const index = this.vectorIndex.vocabularyIndex.get(token);
      return [index, (1 + Math.log(count)) * this.vectorIndex.idf[index]];
    });
    const magnitude = Math.sqrt(rawQuery.reduce((sum, [, value]) => sum + value * value, 0));
    if (!magnitude) return [];
    const queryVector = new Map(rawQuery.map(([index, value]) => [index, value / magnitude]));
    return this.vectorIndex.chunks
      .map(chunk => ({
        title: chunk.title,
        snippet: knowledgeSnippet(chunk.text, tokens),
        source: KNOWLEDGE_SOURCE,
        page: chunk.page,
        vectorScore: chunk.vector.reduce((sum, [index, value]) => sum + (queryVector.get(index) ?? 0) * value, 0)
      }))
      .filter(match => match.vectorScore > 0)
      .sort((left, right) => right.vectorScore - left.vectorScore || left.page - right.page)
      .slice(0, limit);
  }

  async searchKnowledge(query, limit = 5) {
    await this.init();
    const words = tokenizeKnowledge(query).slice(0, 12);
    if (!words.length) return [];
    const expression = words.map(word => `"${word.replaceAll('"', '""')}"`).join(' OR ');
    const safeLimit = Math.max(1, Math.min(Number(limit) || 5, 10));
    const candidateLimit = Math.min(safeLimit * 4, 40);
    const fullText = this.db.prepare(`SELECT title, snippet(knowledge_fts, 1, '[', ']', ' ... ', 40) AS snippet, source, page, bm25(knowledge_fts) AS score FROM knowledge_fts WHERE knowledge_fts MATCH ? ORDER BY score LIMIT ?`).all(expression, candidateLimit).map(row => ({ ...row, page: Number(row.page) }));
    const vectors = this.searchKnowledgeVectors(query, candidateLimit);
    const merged = new Map();
    fullText.forEach((match, index) => merged.set(match.page, { ...match, retrievalScore: 1 / (60 + index + 1), fullTextRank: index + 1 }));
    vectors.forEach((match, index) => {
      const current = merged.get(match.page) ?? match;
      merged.set(match.page, {
        ...current,
        title: current.title ?? match.title,
        snippet: current.snippet ?? match.snippet,
        source: KNOWLEDGE_SOURCE,
        page: match.page,
        vectorScore: Number(match.vectorScore.toFixed(6)),
        vectorRank: index + 1,
        retrievalScore: (current.retrievalScore ?? 0) + 1 / (60 + index + 1)
      });
    });
    return [...merged.values()]
      .sort((left, right) => right.retrievalScore - left.retrievalScore || (right.vectorScore ?? 0) - (left.vectorScore ?? 0) || left.page - right.page)
      .slice(0, safeLimit)
      .map(match => ({ ...match, retrieval: 'hybrid-fts5-tfidf-cosine' }));
  }

  async dashboard() {
    await this.init();
    const customers = this.db.prepare('SELECT * FROM customers ORDER BY updated_at DESC').all().map(customerFromRow);
    const cases = this.db.prepare('SELECT * FROM cases ORDER BY updated_at DESC').all().map(caseFromRow);
    const activities = this.db.prepare('SELECT * FROM activities ORDER BY created_at DESC LIMIT 30').all().map(activityFromRow);
    const openCases = cases.filter(item => item.status !== 'resolved');
    const lifetimeRevenue = customers.reduce((sum, item) => sum + item.lifetimeSpend, 0);
    const assistantAnswers = this.db.prepare("SELECT COUNT(*) AS count FROM activities WHERE type = 'assistant_answer'").get().count;
    const agentEscalations = this.db.prepare("SELECT COUNT(*) AS count FROM cases WHERE channel = 'agentos'").get().count;
    const aiResolutionRate = assistantAnswers ? Math.max(0, Math.round(((assistantAnswers - agentEscalations) / assistantAnswers) * 100)) : 0;
    const demoData = this.db.prepare('SELECT value FROM metadata WHERE key = ?').get('demo_data')?.value === 'true';
    return {
      stats: { customers: customers.length, openCases: openCases.length, urgentCases: openCases.filter(item => ['high', 'urgent'].includes(item.priority)).length, lifetimeRevenue: Number(lifetimeRevenue.toFixed(2)), aiResolutionRate },
      customers, cases, activities,
      meta: {
        demoData,
        database: 'SQLite',
        revision: this.revision,
        updatedAt: this.db.prepare('SELECT value FROM metadata WHERE key = ?').get('crm_updated_at')?.value ?? activities[0]?.createdAt ?? timestamp()
      }
    };
  }

  async searchCustomers({ query = '', location = '', status = '' } = {}) {
    await this.init();
    const needle = `%${String(query).trim().toLowerCase()}%`;
    return this.db.prepare(`SELECT * FROM customers WHERE (? = '%%' OR lower(name || ' ' || email || ' ' || phone || ' ' || location || ' ' || tags) LIKE ?) AND (? = '' OR location = ?) AND (? = '' OR status = ?) ORDER BY updated_at DESC`).all(needle, needle, location, location, status, status).map(customerFromRow);
  }

  async getCustomer(id) {
    await this.init();
    const customer = customerFromRow(this.db.prepare('SELECT * FROM customers WHERE id = ?').get(id));
    if (!customer) throw new Error('Customer not found.');
    customer.cases = this.db.prepare('SELECT * FROM cases WHERE customer_id = ? ORDER BY updated_at DESC').all(id).map(caseFromRow);
    customer.activities = this.db.prepare('SELECT * FROM activities WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20').all(id).map(activityFromRow);
    return customer;
  }

  async createCustomer(input) {
    await this.init();
    const now = timestamp();
    const customer = {
      id: `cus_${randomUUID().replaceAll('-', '').slice(0, 12)}`,
      name: requiredText(input.name, 'Name'), email: optionalEmail(input.email), phone: optionalPhone(input.phone),
      location: input.location ? allowedValue(input.location, LOCATIONS, 'Location') : 'pleasure_point', status: input.status ? allowedValue(input.status, CUSTOMER_STATUSES, 'Status') : 'new',
      loyaltyTier: input.loyaltyTier ? allowedValue(input.loyaltyTier, LOYALTY_TIERS, 'Loyalty tier') : 'Bronze', lifetimeOrders: safeInteger(input.lifetimeOrders), lifetimeSpend: safeMoney(input.lifetimeSpend), lastOrderAt: optionalIsoDate(input.lastOrderAt),
      tags: Array.isArray(input.tags) ? input.tags.map(tag => optionalText(tag, 40)).filter(Boolean).slice(0, 8) : [], createdAt: now, updatedAt: now
    };
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('INSERT INTO customers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(customer.id, customer.name, customer.email, customer.phone, customer.location, customer.status, customer.loyaltyTier, customer.lifetimeOrders, customer.lifetimeSpend, customer.lastOrderAt, JSON.stringify(customer.tags), now, now);
      this.insertActivity({ type: 'customer_created', customerId: customer.id, summary: `${customer.name} was added to the demo CRM.`, createdAt: now });
      this.db.exec('COMMIT');
      this.publishChange('customer.created', customer.id, now);
      return customer;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  async updateCustomer(id, input) {
    await this.init();
    const current = customerFromRow(this.db.prepare('SELECT * FROM customers WHERE id = ?').get(id));
    if (!current) throw new Error('Customer not found.');

    const assignments = [];
    const values = [];
    const set = (column, value) => { assignments.push(`${column}=?`); values.push(value); };
    if (input.name !== undefined) set('name', requiredText(input.name, 'Name'));
    if (input.email !== undefined) set('email', optionalEmail(input.email));
    if (input.phone !== undefined) set('phone', optionalPhone(input.phone));
    if (input.location !== undefined) set('location', allowedValue(input.location, LOCATIONS, 'Location'));
    if (input.status !== undefined) set('status', allowedValue(input.status, CUSTOMER_STATUSES, 'Status'));
    if (input.loyaltyTier !== undefined) set('loyalty_tier', allowedValue(input.loyaltyTier, LOYALTY_TIERS, 'Loyalty tier'));
    if (input.lifetimeOrders !== undefined) set('lifetime_orders', safeInteger(input.lifetimeOrders, current.lifetimeOrders));
    if (input.lifetimeSpend !== undefined) set('lifetime_spend', safeMoney(input.lifetimeSpend, current.lifetimeSpend));
    if (input.lastOrderAt !== undefined) set('last_order_at', optionalIsoDate(input.lastOrderAt));
    if (input.tags !== undefined) {
      if (!Array.isArray(input.tags)) throw new Error('Tags must be an array.');
      set('tags', JSON.stringify(input.tags.map(tag => optionalText(tag, 40)).filter(Boolean).slice(0, 8)));
    }
    if (!assignments.length) return this.getCustomer(id);

    const updatedAt = timestamp();
    set('updated_at', updatedAt);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare(`UPDATE customers SET ${assignments.join(', ')} WHERE id=?`).run(...values, id);
      const updated = customerFromRow(this.db.prepare('SELECT * FROM customers WHERE id = ?').get(id));
      this.insertActivity({ type: 'customer_updated', customerId: id, summary: `${updated.name}'s profile was updated.`, createdAt: updatedAt });
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    this.publishChange('customer.updated', id, updatedAt);
    return this.getCustomer(id);
  }

  async deleteCustomer(id) {
    const customer = await this.getCustomer(id);
    this.db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    this.publishChange('customer.deleted', id);
    return { id, name: customer.name, deleted: true };
  }

  async listCases({ status = '', priority = '', customerId = '' } = {}) {
    await this.init();
    const rows = this.db.prepare(`SELECT cases.*, customers.name AS customer_name, customers.email AS customer_email, customers.location AS customer_location FROM cases JOIN customers ON customers.id = cases.customer_id WHERE (? = '' OR cases.status = ?) AND (? = '' OR cases.priority = ?) AND (? = '' OR cases.customer_id = ?) ORDER BY cases.updated_at DESC`).all(status, status, priority, priority, customerId, customerId);
    return rows.map(row => ({ ...caseFromRow(row), customer: { id: row.customer_id, name: row.customer_name, email: row.customer_email, location: row.customer_location } }));
  }

  async createCase(input) {
    await this.init();
    const customer = customerFromRow(this.db.prepare('SELECT * FROM customers WHERE id = ?').get(input.customerId));
    if (!customer) throw new Error('A valid customer is required.');
    const now = timestamp();
    const supportCase = { id: `case_${randomUUID().replaceAll('-', '').slice(0, 10)}`, customerId: customer.id, subject: requiredText(input.subject, 'Subject'), category: optionalText(input.category, 40) || 'general', priority: PRIORITIES.has(input.priority) ? input.priority : 'normal', status: CASE_STATUSES.has(input.status) ? input.status : 'open', channel: optionalText(input.channel, 30) || 'web', message: optionalText(input.message, 1200), assignedTo: optionalText(input.assignedTo, 80) || 'Unassigned', createdAt: now, updatedAt: now };
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('INSERT INTO cases VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(supportCase.id, supportCase.customerId, supportCase.subject, supportCase.category, supportCase.priority, supportCase.status, supportCase.channel, supportCase.message, supportCase.assignedTo, now, now);
      this.insertActivity({ type: 'case_created', customerId: customer.id, caseId: supportCase.id, summary: `${supportCase.subject} was added to the support queue.`, createdAt: now });
      this.db.exec('COMMIT');
      this.publishChange('case.created', supportCase.id, now);
      return { ...supportCase, customer };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  async updateCase(id, input) {
    await this.init();
    const current = caseFromRow(this.db.prepare('SELECT * FROM cases WHERE id = ?').get(id));
    if (!current) throw new Error('Case not found.');
    const updated = {
      ...current,
      subject: input.subject === undefined ? current.subject : requiredText(input.subject, 'Subject'),
      status: input.status !== undefined && CASE_STATUSES.has(input.status) ? input.status : current.status,
      priority: input.priority !== undefined && PRIORITIES.has(input.priority) ? input.priority : current.priority,
      assignedTo: input.assignedTo === undefined ? current.assignedTo : optionalText(input.assignedTo, 80) || 'Unassigned',
      updatedAt: timestamp()
    };
    this.db.prepare('UPDATE cases SET subject=?, status=?, priority=?, assigned_to=?, updated_at=? WHERE id=?').run(updated.subject, updated.status, updated.priority, updated.assignedTo, updated.updatedAt, id);
    this.insertActivity({ type: 'case_updated', customerId: updated.customerId, caseId: id, summary: `${updated.subject} is now ${updated.status.replaceAll('_', ' ')}.`, createdAt: updated.updatedAt });
    this.publishChange('case.updated', id, updated.updatedAt);
    const customer = customerFromRow(this.db.prepare('SELECT * FROM customers WHERE id = ?').get(updated.customerId));
    return { ...updated, customer };
  }

  async deleteCase(id) {
    await this.init();
    const supportCase = caseFromRow(this.db.prepare('SELECT * FROM cases WHERE id = ?').get(id));
    if (!supportCase) throw new Error('Case not found.');
    this.db.prepare('DELETE FROM cases WHERE id = ?').run(id);
    this.publishChange('case.deleted', id);
    return { id, subject: supportCase.subject, deleted: true };
  }

  insertActivity({ type = 'note', customerId = null, caseId = null, summary, createdAt = timestamp() }) {
    const activity = { id: `act_${randomUUID()}`, type: optionalText(type, 40) || 'note', customerId, caseId, summary: requiredText(summary, 'Summary', 1200), createdAt };
    this.db.prepare('INSERT INTO activities VALUES (?, ?, ?, ?, ?, ?)').run(activity.id, activity.type, activity.customerId, activity.caseId, activity.summary, activity.createdAt);
    return activity;
  }

  async logInteraction(input) {
    await this.init();
    if (input.customerId && !this.db.prepare('SELECT id FROM customers WHERE id = ?').get(input.customerId)) throw new Error('Customer not found.');
    const activity = this.insertActivity(input);
    this.publishChange('activity.created', activity.id, activity.createdAt);
    return activity;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publishChange(type, id, changedAt = timestamp()) {
    this.revision += 1;
    this.db.prepare('INSERT OR REPLACE INTO metadata VALUES (?, ?)').run('crm_updated_at', changedAt);
    const change = { type, id, revision: this.revision, changedAt };
    for (const listener of this.listeners) queueMicrotask(() => listener(change));
    return change;
  }
}

export const crmStore = new CrmStore();
