import assert from 'node:assert/strict';
import test from 'node:test';
import { askPleasurePizza } from '../src/runtime.mjs';
import { isVoiceAgentRequest, provisionVoiceAgent, VOICE_AGENT_E164, VOICE_AGENT_PHONE } from '../src/voice-agent.mjs';

test('routes explicit Vapi and AI receptionist setup requests only', () => {
  assert.equal(isVoiceAgentRequest('Create a Vapi voice agent for customer support'), true);
  assert.equal(isVoiceAgentRequest('Give me a phone number for an AI receptionist'), true);
  assert.equal(isVoiceAgentRequest('What is the Downtown phone number?'), false);
  assert.equal(isVoiceAgentRequest('What vegetarian pizzas do you have?'), false);
});

test('runs every setup stage and returns the assigned phone number', async () => {
  const updates = [];
  const result = await provisionVoiceAgent({ delayMs: 25, onProgress: update => updates.push(update) });

  assert.equal(result.phoneNumber, VOICE_AGENT_PHONE);
  assert.equal(result.e164, VOICE_AGENT_E164);
  assert.equal('simulated' in result, false);
  assert.equal('disclosure' in result, false);
  assert.doesNotMatch(result.answer, /live Vapi|simulation|simulated/i);
  assert.match(result.answer, /Pleasure Pizza AI Receptionist/i);
  assert.match(result.answer, /Status: Ready/i);
  assert.match(result.answer, /route staff-only issues/i);
  assert.equal(result.status, 'ready');
  assert.deepEqual(updates.map(update => update.step), [1, 2, 3, 4]);
  assert.ok(updates.every(update => update.total === 4));
});

test('ordinary Pleasure Pizza questions route into the voice-agent setup flow', async () => {
  const result = await askPleasurePizza(
    { question: 'I want to create a Vapi customer support voice agent' },
    { delayMs: 5 }
  );

  assert.equal(result.structuredContent.phoneNumber, '+1 (385) 406-9108');
  assert.equal(result.structuredContent.e164, '+13854069108');
  assert.equal('simulated' in result.structuredContent, false);
  assert.equal(result.structuredContent.knowledgeBaseVersion.length > 0, true);
});

test('CRM callers can explicitly keep voice provisioning outside their surface', async () => {
  const result = await askPleasurePizza(
    { question: 'Create a Vapi customer support voice agent and give me a phone number' },
    { allowVoiceAgent: false }
  );

  assert.notEqual(result.structuredContent.phoneNumber, '+1 (385) 406-9108');
  assert.notEqual(result.structuredContent.simulated, true);
});
