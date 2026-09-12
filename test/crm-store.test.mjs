import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { CrmStore } from '../src/crm-store.mjs';

let directory;
let store;

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'pleasure-crm-test-'));
  store = new CrmStore(join(directory, 'crm.sqlite'));
  await store.init();
});

after(async () => {
  store?.db?.close();
  await rm(directory, { recursive: true, force: true });
});

test('creates a real SQLite database without embedded customer fixtures', async () => {
  const dashboard = await store.dashboard();
  assert.equal(dashboard.meta.database, 'SQLite');
  assert.equal(dashboard.meta.demoData, false);
  assert.equal(dashboard.stats.customers, 0);
  assert.equal(dashboard.stats.aiResolutionRate, 0);
  assert.equal((await stat(join(directory, 'crm.sqlite'))).isFile(), true);
});

test('indexes and searches the complete PDF corpus', async () => {
  const pages = store.db.prepare("SELECT value FROM metadata WHERE key = 'knowledge_pages'").get().value;
  const results = await store.searchKnowledge('pepperoni inventory threshold', 5);
  assert.equal(Number(pages), 78);
  assert.ok(results.length > 0);
  assert.match(results.map(item => item.snippet).join(' '), /pepperoni/i);
  assert.ok(results.every(item => item.source === 'Pleasure Pizza Knowledge Base (1).pdf'));
  assert.ok(results.every(item => item.retrieval === 'hybrid-fts5-tfidf-cosine'));
  assert.ok(results.some(item => item.vectorScore > 0));
});

test('supports complete customer CRUD', async () => {
  const created = await store.createCustomer({ name: 'Demo Person', email: 'demo@example.com', location: 'downtown', tags: ['test'] });
  assert.equal((await store.getCustomer(created.id)).name, 'Demo Person');
  const updated = await store.updateCustomer(created.id, { status: 'vip', loyaltyTier: 'Gold' });
  assert.equal(updated.status, 'vip');
  assert.equal(updated.loyaltyTier, 'Gold');
  assert.equal((await store.searchCustomers({ query: 'demo@example.com' })).length, 1);
  assert.equal((await store.deleteCustomer(created.id)).deleted, true);
  await assert.rejects(store.getCustomer(created.id), /not found/);
});

test('validates customer fields and preserves concurrent partial updates', async () => {
  await assert.rejects(store.createCustomer({ name: 'Bad Email', email: 'nope' }), /email/i);
  await assert.rejects(store.createCustomer({ name: 'Bad Phone', phone: 'abc' }), /phone/i);
  await assert.rejects(store.createCustomer({ name: 'Bad Status', status: 'unknown' }), /status/i);
  await assert.rejects(store.createCustomer({ name: 'Bad Tier', loyaltyTier: 'Diamond' }), /loyalty/i);
  await assert.rejects(store.createCustomer({ name: 'Bad Date', lastOrderAt: 'yesterday' }), /date/i);

  const created = await store.createCustomer({ name: 'Concurrent Customer', email: 'before@example.com' });
  await Promise.all([
    store.updateCustomer(created.id, { email: 'after@example.com' }),
    store.updateCustomer(created.id, { status: 'vip' })
  ]);
  const updated = await store.getCustomer(created.id);
  assert.equal(updated.email, 'after@example.com');
  assert.equal(updated.status, 'vip');
  await store.deleteCustomer(created.id);
});

test('supports complete support-case CRUD and activity logging', async () => {
  const customer = await store.createCustomer({ name: 'Case Test Customer', location: 'downtown' });
  const created = await store.createCase({ customerId: customer.id, subject: 'Demo support request', priority: 'high', assignedTo: 'Downtown team' });
  assert.equal(created.status, 'open');
  const updated = await store.updateCase(created.id, { status: 'resolved' });
  assert.equal(updated.status, 'resolved');
  const activity = await store.logInteraction({ customerId: customer.id, type: 'note', summary: 'Verified from test.' });
  assert.match(activity.id, /^act_/);
  assert.equal((await store.deleteCase(created.id)).deleted, true);
  assert.equal((await store.deleteCustomer(customer.id)).deleted, true);
});
