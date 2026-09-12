import assert from 'node:assert/strict';
import test from 'node:test';
import { askPleasurePizza } from '../src/runtime.mjs';
import { isSmsAgentRequest, provisionSmsAgent, SMS_AGENT_E164, SMS_AGENT_PHONE } from '../src/sms-agent.mjs';

test('routes explicit SMS support-agent setup requests only', () => {
  assert.equal(isSmsAgentRequest('Create an SMS agent for customer support'), true);
  assert.equal(isSmsAgentRequest('Give me a phone number for a texting agent'), true);
  assert.equal(isSmsAgentRequest('I want to create the same thing for SMS'), true);
  assert.equal(isSmsAgentRequest('What is the Downtown phone number?'), false);
  assert.equal(isSmsAgentRequest('Can customers text this number?'), false);
});

test('runs every SMS setup stage and returns the fixed disclosed demo number', async () => {
  const updates = [];
  const result = await provisionSmsAgent({ delayMs: 25, onProgress: update => updates.push(update) });

  assert.equal(result.phoneNumber, SMS_AGENT_PHONE);
  assert.equal(result.e164, SMS_AGENT_E164);
  assert.equal(result.simulated, true);
  assert.match(result.disclosure, /deterministic demo simulation/i);
  assert.match(result.disclosure, /No live SMS agent/i);
  assert.match(result.answer, /No live SMS agent/i);
  assert.equal(result.status, 'ready');
  assert.deepEqual(updates.map(update => update.step), [1, 2, 3, 4]);
  assert.ok(updates.every(update => update.total === 4));
});

test('ordinary Pleasure Pizza asks route into the SMS-agent setup flow', async () => {
  const result = await askPleasurePizza(
    { question: 'I want to create an SMS customer support agent and get the number' },
    { delayMs: 5 }
  );

  assert.equal(result.structuredContent.phoneNumber, '+1 (347) 281-2048');
  assert.equal(result.structuredContent.e164, '+13472812048');
  assert.equal(result.structuredContent.simulated, true);
  assert.equal(result.structuredContent.knowledgeBaseVersion.length > 0, true);
});

test('CRM callers keep SMS provisioning outside their surface', async () => {
  const result = await askPleasurePizza(
    { question: 'Create an SMS support agent and give me a phone number' },
    { allowSmsAgent: false }
  );

  assert.notEqual(result.structuredContent.phoneNumber, '+1 (347) 281-2048');
  assert.notEqual(result.structuredContent.simulated, true);
});
