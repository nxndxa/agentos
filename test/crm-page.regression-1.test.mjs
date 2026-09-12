import assert from 'node:assert/strict';
import test from 'node:test';
import { renderCrmPage } from '../src/crm-page.mjs';

// Regression: ISSUE-001 — deleted customer details remained in the closed profile drawer DOM
// Found by /qa on 2026-09-12
// Report: .gstack/qa-reports/qa-report-mcp-production-110f-up-railway-app-2026-09-12.md
test('clears customer data when the profile drawer closes or its record disappears', () => {
  const html = renderCrmPage('https://example.test');

  assert.match(
    html,
    /function closeDrawer\(\)\{document\.getElementById\('drawer'\)\.classList\.remove\('open'\);document\.getElementById\('drawerBody'\)\.replaceChildren\(\);state\.drawerCustomerId=null\}/
  );
  assert.match(
    html,
    /state\.drawerCustomerId&&!next\.customers\.some\(customer=>customer\.id===state\.drawerCustomerId\)\)closeDrawer\(\)/
  );
  assert.match(html, /document\.getElementById\('closeDrawer'\)\.onclick=closeDrawer/);
  assert.match(html, /await api\('\/api\/crm\/customers\/'\+c\.id,\{method:'DELETE'\}\);closeDrawer\(\)/);
});
