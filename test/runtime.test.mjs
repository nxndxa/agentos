import assert from 'node:assert/strict';
import test from 'node:test';
import { answerCustomerQuestion, searchMenu } from '../src/knowledge.mjs';

test('requires a location for hours', () => {
  assert.match(answerCustomerQuestion('How late are you open?').answer, /Which Pleasure Pizza location/);
});

test('never guarantees allergen safety', () => {
  const result = answerCustomerQuestion('Is the gluten-free crust safe for celiac disease?');
  assert.match(result.answer, /cross-contact is possible/);
  assert.equal(result.escalation.required, true);
});

test('routes missing orders to the correct restaurant', () => {
  const result = answerCustomerQuestion('My Downtown order is missing');
  assert.match(result.answer, /831-600-7859/);
  assert.equal(result.escalation.required, true);
});

test('does not promise delivery coverage', () => {
  const result = answerCustomerQuestion('Can Downtown deliver to me?');
  assert.equal(result.requiresLiveVerification, true);
  assert.match(result.answer, /depend on the address/);
});

test('finds menu items by ingredient', () => {
  const matches = searchMenu('prawns');
  assert.deepEqual(matches.map(item => item.name), ['Abyss']);
});

test('qualifies menu pricing', () => {
  const result = answerCustomerQuestion('How much is the Abyss?');
  assert.match(result.answer, /currently lists/);
  assert.equal(result.requiresLiveVerification, true);
});
