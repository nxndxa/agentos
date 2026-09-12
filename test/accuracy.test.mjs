import assert from 'node:assert/strict';
import test from 'node:test';
import { answerCustomerQuestion } from '../src/knowledge.mjs';

const cases = [
  ['Pleasure Point address', 'Where is Pleasure Point?', /4000 Portola Drive/],
  ['East Side phone', 'What is the East Side phone number?', /831-431-6058/],
  ['Downtown phone', 'Call Downtown', /831-600-7859/],
  ['ambiguous hours', 'How late are you open?', /Which Pleasure Pizza location/],
  ['Downtown hours caution', 'How late is Downtown open tonight?', /check live ordering or call/],
  ['celiac boundary', 'Is the gluten-free crust safe for celiac disease?', /can't guarantee any item is allergen-free/],
  ['shellfish boundary', 'I have a shellfish allergy. Is the Abyss safe?', /cross-contact is possible/],
  ['vegan qualification', 'What vegan food do you have?', /Downtown currently offers/],
  ['halal qualification', 'Is every chicken dish halal?', /Do not assume every chicken dish/],
  ['vegetarian list', 'What vegetarian pizzas are there?', /Juliet's Garden/],
  ['price qualification', 'How much is the Telecaster?', /currently lists/],
  ['delivery boundary', 'Will East Side deliver to my house?', /depend on the address/],
  ['missing order route', 'My Downtown order is missing', /831-600-7859/],
  ['refund route', 'I need a refund from Pleasure Point', /831-475-4002/],
  ['slice inventory boundary', 'What slices do you have today?', /can't promise a specific slice/],
  ['live wait boundary', 'What is the wait time right now?', /do not have confirmed live information/],
  ['breakfast qualification', 'Does East Side serve breakfast?', /confirm current items and prices/],
  ['alcohol scope', 'Do you serve alcohol?', /East Side Eatery has a full bar/],
  ['half and half', 'Can I order half pepperoni and half veggie?', /Downtown supports half-and-half/],
  ['history', 'How long has Pleasure Pizza been around?', /Since 1975/]
];

for (const [name, question, expected] of cases) {
  test(name, () => assert.match(answerCustomerQuestion(question).answer, expected));
}

test('high-risk categories are escalated', () => {
  for (const question of ['I need a refund', 'My order status', 'I was charged twice', 'I lost my wallet']) {
    assert.equal(answerCustomerQuestion(question).escalation?.required, true, question);
  }
});
