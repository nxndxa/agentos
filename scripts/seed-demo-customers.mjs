#!/usr/bin/env node

const origin = (process.env.AGENTOS_BASE_URL ?? 'https://mcp-production-110f.up.railway.app').replace(/\/$/, '');
const apiKey = process.env.AGENTOS_API_KEY ?? process.env.PLEASURE_PIZZA_API_KEY;
const seedTag = 'agentos-seed-300';

if (!apiKey) throw new Error('Set AGENTOS_API_KEY or PLEASURE_PIZZA_API_KEY.');

async function api(path, options = {}) {
  const response = await fetch(`${origin}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      ...options.headers
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
  return payload;
}

const firstNames = ['Avery', 'Mateo', 'Sofia', 'Eli', 'Maya', 'Noah', 'Lena', 'Diego', 'Priya', 'Julian', 'Zoe', 'Theo', 'Camila', 'Miles', 'Nora', 'Leo', 'Amara', 'Finn', 'Iris', 'Kai'];
const lastNames = ['Rivera', 'Chen', 'Patel', 'Ortega', 'Brooks', 'Kim', 'Nguyen', 'Martinez', 'Johnson', 'Singh', 'Garcia', 'Wilson', 'Park', 'Reed', 'Lopez'];
const locations = ['downtown', 'east_side', 'pleasure_point'];
const statuses = ['active', 'active', 'vip', 'new', 'needs_attention'];
const tiers = ['Bronze', 'Silver', 'Gold'];
const interests = ['vegetarian', 'family order', 'delivery', 'gluten-free inquiry', 'slice regular', 'student', 'office catering', 'vegan options', 'house ranch fan', 'pickup'];

const desired = firstNames.flatMap((firstName, firstIndex) => lastNames.map((lastName, lastIndex) => {
  const index = firstIndex * lastNames.length + lastIndex + 1;
  const orders = (index * 7) % 43;
  const lifetimeSpend = Number((orders * (18.5 + (index % 9) * 2.35) + (index % 100) / 100).toFixed(2));
  const lastOrderAt = new Date(Date.UTC(2026, 8, 12) - (index % 120) * 86_400_000 - (index % 18) * 3_600_000).toISOString();
  return {
    name: `${firstName} ${lastName}`,
    email: `agentos.demo.${String(index).padStart(3, '0')}@example.com`,
    phone: `831-555-${String(index + 99).padStart(4, '0')}`,
    location: locations[index % locations.length],
    status: statuses[index % statuses.length],
    loyaltyTier: tiers[index % tiers.length],
    lifetimeOrders: orders,
    lifetimeSpend,
    lastOrderAt,
    tags: [seedTag, interests[index % interests.length], index % 4 === 0 ? 'newsletter' : 'demo customer']
  };
}));

const before = await api('/api/crm/dashboard');
const existingEmails = new Set(before.customers.map(customer => customer.email));
const missing = desired.filter(customer => !existingEmails.has(customer.email));

for (let offset = 0; offset < missing.length; offset += 10) {
  const batch = missing.slice(offset, offset + 10);
  await Promise.all(batch.map(customer => api('/api/crm/customers', { method: 'POST', body: JSON.stringify(customer) })));
  process.stdout.write(`Seeded ${Math.min(offset + batch.length, missing.length)}/${missing.length}\r`);
}
if (missing.length) process.stdout.write('\n');

const after = await api('/api/crm/dashboard');
const seeded = after.customers.filter(customer => customer.tags.includes(seedTag));
if (seeded.length !== 300) throw new Error(`Expected exactly 300 ${seedTag} profiles, found ${seeded.length}.`);

console.log(JSON.stringify({ origin, created: missing.length, seeded: seeded.length, totalCustomers: after.stats.customers }, null, 2));
