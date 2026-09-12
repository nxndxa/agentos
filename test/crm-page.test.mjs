import assert from 'node:assert/strict';
import test from 'node:test';
import { renderCrmPage } from '../src/crm-page.mjs';

test('renders a complete responsive CRM application shell', () => {
  const html = renderCrmPage('https://example.test');
  assert.match(html, /Pleasure CRM/);
  assert.match(html, /Customer operations/);
  assert.doesNotMatch(html, /AgentOS customer copilot/);
  assert.doesNotMatch(html, /Pleasure Pizza AgentOS/);
  assert.doesNotMatch(html, /How can I help\?/);
  assert.doesNotMatch(html, /Create customer-support voice agent/);
  assert.doesNotMatch(html, /Voice setup/);
  assert.match(html, /\/api\/crm\/dashboard/);
  assert.doesNotMatch(html, /\/api\/crm\/assistant/);
  assert.match(html, /https:\/\/example\.test\/mcp/);
  assert.doesNotMatch(html, /aos_pp_/);
});

test('escapes the configured public origin', () => {
  const html = renderCrmPage('https://example.test/\"><script>alert(1)</script>');
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;/);
});
