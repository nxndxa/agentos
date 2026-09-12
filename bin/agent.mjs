#!/usr/bin/env node

import { homedir } from 'node:os';
import { readFile } from 'node:fs/promises';

let savedConfig = {};
try {
  savedConfig = JSON.parse(await readFile(`${homedir()}/.config/agentos/pleasure-pizza.json`, 'utf8'));
} catch {}

const [command = 'help', ...args] = process.argv.slice(2);
const baseUrl = (process.env.AGENTOS_URL ?? process.env.AGENTOS_MCP_URL ?? savedConfig.url ?? 'http://localhost:3000/mcp').replace(/\/mcp\/?$/, '');
const token = process.env.PLEASURE_PIZZA_API_KEY ?? process.env.AGENTOS_API_KEY ?? savedConfig.token ?? '';
const voiceStages = [
  'Defining the customer-support call flow',
  'Connecting the Pleasure Pizza knowledge base',
  'Configuring greeting, routing, and escalation rules',
  'Assigning and validating the demo phone number'
];
const smsStages = [
  'Designing the customer-support SMS workflow',
  'Connecting the Pleasure Pizza knowledge base',
  'Configuring replies, routing, and staff escalation',
  'Assigning and validating the demo SMS number'
];
const progressIntervalMs = process.env.NODE_ENV === 'test'
  ? Math.max(1, Number(process.env.CLI_PROGRESS_INTERVAL_MS) || 5)
  : 4_000;

function usage() {
  return `The Pleasure Pizza Skill by AgentOS

Usage:
  agent ask "Do you have gluten-free pizza?" [--location downtown]
  agent locations [downtown|east side|pleasure point]
  agent menu [pizza or ingredient]
  agent escalate "missing order" [--location downtown]
  agent voice-agent [business name]
  agent sms-agent [business name]
  agent knowledge "award winning soup"
  agent crm dashboard
  agent crm customers [search]
  agent crm customer <customer-id>
  agent crm add-customer "Name" [--email value] [--phone value] [--location downtown]
  agent crm update-customer <customer-id> [--status vip] [--location downtown]
  agent crm delete-customer <customer-id>
  agent crm cases [--status open] [--priority high]
  agent crm add-case <customer-id> "Subject" [--priority high] [--assignee "Downtown team"]
  agent crm update-case <case-id> [--status resolved] [--priority normal]
  agent crm delete-case <case-id>
  agent crm assist <customer-id> "Customer question"
  agent tools
  agent health
  agent config

Environment:
  AGENTOS_URL                 Hosted AgentOS origin
  PLEASURE_PIZZA_API_KEY     Bearer credential`;
}

function parseLocation(values) {
  const index = values.indexOf('--location');
  return index >= 0 ? values[index + 1] ?? '' : '';
}

function withoutOptions(values) {
  const index = values.indexOf('--location');
  return (index >= 0 ? values.slice(0, index) : values).join(' ').trim();
}

function option(values, name) {
  const index = values.indexOf(`--${name}`);
  return index >= 0 ? values[index + 1] ?? '' : '';
}

function positionals(values) {
  const result = [];
  for (let index = 0; index < values.length; index += 1) {
    if (values[index].startsWith('--')) index += 1;
    else result.push(values[index]);
  }
  return result;
}

async function request(path, method = 'GET', body) {
  if (!token && path !== '/health') throw new Error('Missing PLEASURE_PIZZA_API_KEY.');
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message ?? `${response.status} ${response.statusText}`);
  return payload;
}

function isVoiceRequest(value) {
  const text = String(value ?? '').toLowerCase();
  return /(vapi|voice agent|ai receptionist|phone agent|voice receptionist)/.test(text)
    && /(create|make|build|set\s*up|setup|provision|get|give|need|want|phone number)/.test(text);
}

function isSmsRequest(value) {
  const text = String(value ?? '').toLowerCase();
  return /\b(sms|text message|texting)\b/.test(text)
    && /\b(agent|bot|support|phone number|sms number|text number|same thing)\b/.test(text)
    && /\b(create|make|build|set\s*up|setup|provision|get|give|need|want|phone number|sms number|text number)\b/.test(text);
}

async function requestWithProgress(path, body, stages) {
  let stage = 0;
  const showStage = () => {
    if (stage >= stages.length) return;
    const message = stages[stage];
    process.stderr.write(`[${stage + 1}/${stages.length}] ${message}\n`);
    stage += 1;
  };
  showStage();
  const timer = setInterval(showStage, progressIntervalMs);
  try {
    return await request(path, 'POST', body);
  } finally {
    clearInterval(timer);
  }
}

async function main() {
  if (command === 'help' || command === '--help' || command === '-h') return console.log(usage());
  if (command === 'health') return console.log(JSON.stringify(await request('/health'), null, 2));
  if (command === 'tools') return console.log(JSON.stringify(await request('/api/tools'), null, 2));
  if (command === 'config') {
    return console.log(JSON.stringify({ name: 'pleasure-pizza-by-agentos', url: `${baseUrl}/mcp`, bearer_token_env_var: 'PLEASURE_PIZZA_API_KEY' }, null, 2));
  }

  if (command === 'knowledge') {
    const query = args.join(' ').trim();
    if (!query) throw new Error('A knowledge search query is required.');
    return console.log(JSON.stringify(await request(`/api/crm/knowledge?query=${encodeURIComponent(query)}`), null, 2));
  }

  if (command === 'crm') {
    const [action = 'dashboard', ...crmArgs] = args;
    const values = positionals(crmArgs);
    let result;
    if (action === 'dashboard') result = await request('/api/crm/dashboard');
    else if (action === 'customers') result = await request(`/api/crm/customers?query=${encodeURIComponent(values.join(' '))}`);
    else if (action === 'customer') result = await request(`/api/crm/customers/${encodeURIComponent(values[0] ?? '')}`);
    else if (action === 'add-customer') result = await request('/api/crm/customers', 'POST', { name: values.join(' '), email: option(crmArgs, 'email'), phone: option(crmArgs, 'phone'), location: option(crmArgs, 'location') || 'pleasure_point', tags: option(crmArgs, 'tags').split(',').filter(Boolean) });
    else if (action === 'update-customer') result = await request(`/api/crm/customers/${encodeURIComponent(values[0] ?? '')}`, 'PATCH', { status: option(crmArgs, 'status') || undefined, location: option(crmArgs, 'location') || undefined, loyaltyTier: option(crmArgs, 'tier') || undefined });
    else if (action === 'delete-customer') result = await request(`/api/crm/customers/${encodeURIComponent(values[0] ?? '')}`, 'DELETE');
    else if (action === 'cases') result = await request(`/api/crm/cases?status=${encodeURIComponent(option(crmArgs, 'status'))}&priority=${encodeURIComponent(option(crmArgs, 'priority'))}`);
    else if (action === 'add-case') result = await request('/api/crm/cases', 'POST', { customerId: values[0], subject: values.slice(1).join(' '), priority: option(crmArgs, 'priority') || 'normal', assignedTo: option(crmArgs, 'assignee') || 'Unassigned', message: option(crmArgs, 'message') });
    else if (action === 'update-case') result = await request(`/api/crm/cases/${encodeURIComponent(values[0] ?? '')}`, 'PATCH', { status: option(crmArgs, 'status') || undefined, priority: option(crmArgs, 'priority') || undefined, assignedTo: option(crmArgs, 'assignee') || undefined });
    else if (action === 'delete-case') result = await request(`/api/crm/cases/${encodeURIComponent(values[0] ?? '')}`, 'DELETE');
    else if (action === 'assist') result = await request('/api/crm/assistant', 'POST', { customerId: values[0] ?? '', question: values.slice(1).join(' '), location: option(crmArgs, 'location') });
    else throw new Error(`Unknown CRM action: ${action}\n\n${usage()}`);
    return console.log(JSON.stringify(result, null, 2));
  }

  const location = parseLocation(args);
  const text = withoutOptions(args);
  const routes = {
    ask: ['/api/ask', { question: text, location }],
    'voice-agent': ['/api/voice-agent', { businessName: text || 'Pleasure Pizza', useCase: 'customer support and AI receptionist' }],
    'sms-agent': ['/api/sms-agent', { businessName: text || 'Pleasure Pizza', useCase: 'customer support over SMS' }],
    locations: ['/api/locations', { location: text || location }],
    menu: ['/api/menu', { query: text || 'menu' }],
    escalate: ['/api/escalate', { reason: text, location }]
  };
  const route = routes[command];
  if (!route) throw new Error(`Unknown command: ${command}\n\n${usage()}`);
  const progressKind = command === 'sms-agent' || (command === 'ask' && isSmsRequest(text))
    ? 'SMS'
    : command === 'voice-agent' || (command === 'ask' && isVoiceRequest(text))
      ? 'Voice'
      : '';
  const result = progressKind
    ? await requestWithProgress(route[0], route[1], progressKind === 'SMS' ? smsStages : voiceStages)
    : await request(route[0], 'POST', route[1]);
  if (progressKind) process.stderr.write(`[ready] ${progressKind} agent setup complete\n\n`);
  console.log(result.answer ?? JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(`AgentOS error: ${error.message}`);
  process.exitCode = 1;
});
