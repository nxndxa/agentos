import { homedir } from 'node:os';
import { readFile } from 'node:fs/promises';

let savedConfig = {};
try {
  savedConfig = JSON.parse(await readFile(`${homedir()}/.config/agentos/pleasure-pizza.json`, 'utf8'));
} catch {}

const baseUrl = (process.env.AGENTOS_URL ?? savedConfig.url ?? 'http://localhost:3000').replace(/\/$/, '');
const token = process.env.PLEASURE_PIZZA_API_KEY ?? process.env.AGENTOS_API_KEY ?? savedConfig.token ?? 'agentos-local-demo-only';

const health = await fetch(`${baseUrl}/health`);
if (!health.ok) throw new Error(`Health check failed: ${health.status}`);

const answer = await fetch(`${baseUrl}/api/ask`, {
  method: 'POST',
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ question: 'Do you have gluten-free pizza?' })
});
if (!answer.ok) throw new Error(`Authenticated ask failed: ${answer.status}`);
const payload = await answer.json();
if (!payload.answer.includes('cross-contact')) throw new Error('Allergy boundary is missing from the response.');

console.log(JSON.stringify({ ok: true, health: await health.json(), sample: payload.answer }, null, 2));
