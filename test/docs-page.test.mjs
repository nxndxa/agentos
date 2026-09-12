import assert from 'node:assert/strict';
import test from 'node:test';
import { renderDocsPage } from '../src/docs-page.mjs';

test('renders complete connection documentation', () => {
  const html = renderDocsPage('https://example.test');
  assert.match(html, /Connect it to Codex/);
  assert.match(html, /codex mcp add pleasure-pizza-by-agentos/);
  assert.match(html, /https:\/\/example\.test\/mcp/);
  assert.match(html, /pleasure_pizza_ask/);
  assert.match(html, /pleasure_pizza_create_voice_agent/);
  assert.match(html, /\+1 \(385\) 406-9108/);
  assert.match(html, /YOUR_PRIVATE_KEY/);
  assert.doesNotMatch(html, /aos_pp_/);
});

test('escapes an untrusted origin', () => {
  const html = renderDocsPage('https://example.test/\"><script>alert(1)</script>');
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;/);
});
