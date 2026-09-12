export const KNOWLEDGE_BASE_VERSION = 'September 12, 2026';

export const locations = {
  pleasure_point: {
    id: 'pleasure_point',
    name: 'Original Pleasure Pizza - Pleasure Point',
    aliases: ['pleasure point', 'original', 'portola', '4000 portola'],
    address: '4000 Portola Drive, Santa Cruz, CA 95062',
    phone: '831-475-4002',
    baselineHours: '11:00 AM-9:00 PM daily',
    concept: 'Pizza by the slice, whole pizzas, takeout, online ordering, and limited casual seating.',
    services: ['slices', 'whole pizzas', 'takeout', 'online ordering', 'limited seating']
  },
  east_side: {
    id: 'east_side',
    name: 'Pleasure Pizza East Side Eatery',
    aliases: ['east side', 'east side eatery', '41st', '800 41st'],
    address: '800 41st Avenue, Santa Cruz, CA 95062',
    phone: '831-431-6058',
    baselineHours: 'Monday-Thursday 11:00 AM-9:00 PM; Friday-Sunday 9:00 AM-9:00 PM',
    concept: 'Full-service neighborhood restaurant with dine-in, takeout, delivery, breakfast on selected days, lunch, dinner, local beer, wine, and a full bar.',
    services: ['dine-in', 'takeout', 'delivery', 'breakfast', 'lunch', 'dinner', 'full bar']
  },
  downtown: {
    id: 'downtown',
    name: 'Pleasure Pizza Downtown Santa Cruz',
    aliases: ['downtown', 'pacific', '1415 pacific'],
    address: '1415 Pacific Avenue, Santa Cruz, CA 95060',
    phone: '831-600-7859',
    baselineHours: 'the official website lists 11:00 AM-8:00 PM daily; live ordering sometimes shows later hours',
    concept: 'Slices, whole pizzas, appetizers, wings, salads, dine-in, pickup, delivery, and online ordering.',
    services: ['dine-in', 'slices', 'whole pizzas', 'pickup', 'delivery', 'online ordering']
  }
};

export const pizzas = [
  { name: 'Cheese', ingredients: ['mozzarella'], vegetarian: true, prices: { '14': 17.95 } },
  { name: 'Pepperoni', ingredients: ['applewood-smoked pepperoni'], prices: { '14': 20.5, '18': 32 } },
  { name: 'Pesto', ingredients: ['basil pesto'], vegetarian: true, prices: { '14': 20.5, '18': 32 } },
  { name: 'Sweet Hawaiian', ingredients: ['Canadian bacon', 'pineapple'], prices: { '14': 25, '18': 35 } },
  { name: "Board'n", ingredients: ['pepperoni', 'fresh mushrooms'], prices: { '14': 25, '18': 35 } },
  { name: 'Popeye', ingredients: ['spinach', 'feta', 'tomatoes', 'mozzarella'], notes: 'No red sauce.', vegetarian: true, prices: { '14': 25, '18': 35 } },
  { name: 'Veggie', ingredients: ['tomatoes', 'red onions', 'red bell pepper', 'green bell pepper', 'mushrooms', 'black olives'], vegetarian: true, prices: { '14': 26, '18': 36 } },
  { name: "Juliet's Garden", ingredients: ['pesto', 'feta', 'red onions', 'red bell pepper', 'green bell pepper'], vegetarian: true, prices: { '14': 26, '18': 36 } },
  { name: 'Greek', ingredients: ['artichoke hearts', 'tomatoes', 'feta', 'black olives'], vegetarian: true, prices: { '14': 26, '18': 36 } },
  { name: 'Indicator', ingredients: ['chipotle pesto', 'pineapple'], vegetarian: true, prices: { '14': 26, '18': 36 } },
  { name: 'Meat Combo', ingredients: ['salami', 'pepperoni', 'Canadian bacon', 'sausage'], prices: { '14': 28, '18': 39 } },
  { name: 'Pleasure Combo', ingredients: ['sausage', 'pepperoni', 'salami', 'green bell pepper', 'red onion', 'black olives', 'mushrooms'], prices: { '14': 28, '18': 39 } },
  { name: 'Santa Barbara', ingredients: ['mozzarella', 'parmesan', 'pepper jack', 'spinach', 'artichoke hearts', 'green onions'], vegetarian: true, prices: { '14': 28, '18': 39 } },
  { name: 'BBQ Chicken', ingredients: ['chicken', 'semi-spicy BBQ sauce', 'pepper jack', 'red onion', 'red bell pepper', 'green bell pepper', 'pineapple'], notes: 'Downtown currently labels its BBQ Chicken Pizza halal.', prices: { '14': 28, '18': 39 } },
  { name: 'The Hook', ingredients: ['Canadian bacon', 'pesto', 'tomatoes', 'feta', 'parmesan', 'mozzarella'], notes: 'No red sauce.', prices: { '14': 28, '18': 39 } },
  { name: 'K-Pig', ingredients: ['bacon', 'Canadian bacon', 'sausage', 'pepperoni', 'mozzarella', 'pepper jack', 'tomato cream sauce'], prices: { '14': 28, '18': 39 } },
  { name: 'Verona', ingredients: ['pesto-marinated chicken', 'garlic', 'red onions', 'pepper jack', 'mozzarella'], prices: { '14': 28, '18': 39 } },
  { name: 'Telecaster', ingredients: ['chipotle pesto', 'pepper jack', 'pineapple', 'bacon', 'tomato cream sauce'], prices: { '14': 28, '18': 39 } },
  { name: 'Abyss', ingredients: ['prawns sauteed with butter and garlic', 'mozzarella', 'pesto', 'lemon'], prices: { '14': 37, '18': 48 } }
];

const dynamicTerms = ['right now', 'tonight', 'today', 'currently open', 'open now', 'wait time', 'in stock', 'available now', 'delivery time', 'delivery radius', 'promo', 'discount', 'special'];
const allergyTerms = ['allergy', 'allergic', 'celiac', 'gluten', 'dairy', 'nut', 'peanut', 'shellfish', 'fish allergy', 'soy', 'egg allergy'];
const escalationTerms = ['refund', 'missing order', 'wrong order', 'incorrect order', 'order status', 'payment dispute', 'charged twice', 'lost property', 'gift card', 'employment', 'job application', 'accessibility', 'delivery issue', 'large catering', 'same-day large'];

export function resolveLocation(value = '') {
  const normalized = value.toLowerCase();
  return Object.values(locations).find(location => location.aliases.some(alias => normalized.includes(alias))) ?? null;
}

export function listLocations() {
  return Object.values(locations).map(({ aliases, ...location }) => location);
}

export function searchMenu(query = '', options = {}) {
  const normalized = query.toLowerCase().trim();
  let results = pizzas;
  if (options.vegetarian || normalized.includes('vegetarian')) results = results.filter(item => item.vegetarian);
  if (normalized && !normalized.includes('vegetarian') && normalized !== 'pizza' && normalized !== 'menu') {
    results = results.filter(item => [item.name, ...item.ingredients].join(' ').toLowerCase().includes(normalized));
  }
  return results;
}

function formatPhoneDirectory() {
  return Object.values(locations).map(location => `${location.name}: ${location.phone}`).join('\n');
}

function locationNeeded() {
  return {
    answer: 'Which Pleasure Pizza location do you mean: Pleasure Point, East Side Eatery, or Downtown?',
    confidence: 'high',
    requiresLiveVerification: false,
    escalation: null,
    sources: ['Location Routing Rules']
  };
}

function policyAnswer(answer, sources, extra = {}) {
  return {
    answer,
    confidence: extra.confidence ?? 'high',
    requiresLiveVerification: extra.requiresLiveVerification ?? false,
    escalation: extra.escalation ?? null,
    sources
  };
}

export function answerCustomerQuestion(question, locationHint = '') {
  const raw = String(question ?? '').trim();
  const q = raw.toLowerCase();
  const location = resolveLocation(`${locationHint} ${raw}`);

  if (!raw) return policyAnswer('Ask me about Pleasure Pizza locations, menus, dietary options, hours, pickup, or delivery.', ['Customer-Facing FAQ']);

  const isOrderEscalation = q.includes('order') && ['missing', 'wrong', 'incorrect', 'status', 'refund', 'problem', 'issue'].some(term => q.includes(term));
  const isLostProperty = q.includes('lost') && ['wallet', 'phone', 'keys', 'bag', 'property', 'item'].some(term => q.includes(term));
  if (escalationTerms.some(term => q.includes(term)) || isOrderEscalation || isLostProperty) {
    const phone = location ? `${location.name} at ${location.phone}` : `the location involved:\n${formatPhoneDirectory()}`;
    return policyAnswer(
      `This needs help from restaurant staff. Please contact ${phone}. I don't have access to orders, payments, refunds, inventory, or staff systems.`,
      ['Escalation Rules', 'Phone Directory'],
      { escalation: { required: true, reason: 'staff_only_request', phone: location?.phone ?? null } }
    );
  }

  if (allergyTerms.some(term => q.includes(term))) {
    const contact = location ? ` Call ${location.phone} before ordering.` : ' Please confirm directly with the restaurant before ordering.';
    return policyAnswer(
      `Pleasure Pizza offers some dietary options, including a 12-inch gluten-free crust Downtown, but every kitchen handles other ingredients and cross-contact is possible. I can't guarantee any item is allergen-free or safe for celiac disease or a severe allergy.${contact}`,
      ['Gluten-Free Options', 'Allergy Policy for AI', 'Dietary Claim Rule'],
      { escalation: { required: true, reason: 'allergy_confirmation', phone: location?.phone ?? null } }
    );
  }

  if (q.includes('open') || q.includes('hours') || q.includes('close')) {
    if (!location) return locationNeeded();
    return policyAnswer(
      `${location.name}'s baseline hours are ${location.baselineHours}. Hours can change, so please check live ordering or call ${location.phone} before relying on that for today.`,
      ['Locations', 'Hours Policy for AI'],
      { requiresLiveVerification: true }
    );
  }

  if (q.includes('deliver')) {
    if (!location) return locationNeeded();
    if (location.id === 'pleasure_point') {
      return policyAnswer('Pleasure Point is primarily a slice and takeout shop. Delivery is confirmed for East Side Eatery and Downtown; check the live ordering system for your address.', ['Delivery', 'Locations'], { requiresLiveVerification: true });
    }
    return policyAnswer(`${location.name} offers delivery options, but availability, fees, minimums, and radius depend on the address and ordering platform. Please check live ordering before promising delivery.`, ['Delivery'], { requiresLiveVerification: true });
  }

  if (q.includes('phone') || q.includes('call') || q.includes('address') || q.includes('where')) {
    if (location) return policyAnswer(`${location.name}\n${location.address}\n${location.phone}`, ['Locations', 'Phone Directory']);
    return policyAnswer(Object.values(locations).map(item => `${item.name}\n${item.address}\n${item.phone}`).join('\n\n'), ['Locations', 'Phone Directory']);
  }

  if (q.includes('halal')) {
    return policyAnswer('Downtown currently labels its BBQ Chicken Pizza as halal and lets customers select halal chicken for wings. Do not assume every chicken dish, meat, or the whole restaurant is halal. For strict preparation requirements, call Downtown at 831-600-7859.', ['Halal Options', 'Dietary Claim Rule'], { requiresLiveVerification: true });
  }

  if (q.includes('vegan')) {
    return policyAnswer('Downtown currently offers plant-based cheese and lists Vegan Tenders + Fries. Individual sauces and toppings should not be called vegan without confirmed ingredients, and availability can change.', ['Vegan Options', 'Dietary Claim Rule'], { requiresLiveVerification: true });
  }

  if (q.includes('vegetarian')) {
    return policyAnswer("Vegetarian pizza options include Cheese, Pesto, Veggie, Greek, Indicator, Juliet's Garden, Santa Barbara, and Popeye. If you like pesto, Juliet's Garden is a strong pick; for something unusual, try the chipotle-pesto-and-pineapple Indicator.", ['Vegetarian Options', 'Customer Recommendations']);
  }

  if (q.includes('half') && q.includes('half')) {
    return policyAnswer('Yes. Downtown supports half-and-half pizzas, including 14-inch, 18-inch, and 12-inch gluten-free options. If the combination cannot be configured online, call the restaurant.', ['Half-and-Half Pizza']);
  }

  if (q.includes('breakfast') || q.includes('brunch')) {
    return policyAnswer('East Side Eatery serves breakfast and brunch Friday through Sunday until 2 PM according to the published menu. The detailed breakfast menu is older, so confirm current items and prices when needed.', ['Breakfast / Brunch'], { requiresLiveVerification: true });
  }

  if (q.includes('alcohol') || q.includes('beer') || q.includes('wine') || q.includes('bar')) {
    return policyAnswer('East Side Eatery has a full bar and serves beer and wine, including locally selected options. Do not assume the same alcohol availability at Pleasure Point or Downtown.', ['Alcohol']);
  }

  if (q.includes('ranch')) {
    return policyAnswer('Yes. Pleasure Pizza is known for its house-made ranch. Downtown calls it I.M.H.O.B.E. Ranch - “In My Honest Opinion Best Ever” - and currently lists individual portions at about $0.75.', ['House Ranch', 'Price Policy for AI'], { requiresLiveVerification: true });
  }

  if (q.includes('slice')) {
    return policyAnswer('Yes. Pleasure Point specializes in pizza by the slice, and Downtown also offers individual slices. Today\'s selection and prices vary, so I can\'t promise a specific slice is available.', ['Pizza by the Slice', 'Do Not Hallucinate'], { requiresLiveVerification: true });
  }

  if (q.includes('best') || q.includes("what's good") || q.includes('recommend')) {
    return policyAnswer("For something classic, try Pepperoni or Board'n. Meat lovers usually like K-Pig, Meat Combo, or Pleasure Combo. Vegetarian picks include Greek, Veggie, Juliet's Garden, and Indicator. For something unusual, try The Hook, Telecaster, or Abyss. The house ranch is also a local favorite.", ['Customer Recommendations']);
  }

  const menuMatch = pizzas.find(item => q.includes(item.name.toLowerCase()));
  if (menuMatch) {
    const prices = Object.entries(menuMatch.prices).map(([size, price]) => `${size}-inch $${price.toFixed(2)}`).join(', ');
    const notes = menuMatch.notes ? ` ${menuMatch.notes}` : '';
    return policyAnswer(`${menuMatch.name} includes ${menuMatch.ingredients.join(', ')}.${notes} The Pleasure Point menu currently lists ${prices}; prices and ingredients can vary by location and may change.`, ['Original Pleasure Point Pizza Menu', 'Price Policy for AI'], { requiresLiveVerification: true });
  }

  if (q.includes('1975') || q.includes('history') || q.includes('how long')) {
    return policyAnswer('Pleasure Pizza describes itself as “A True Santa Cruz Tradition Since 1975.” The original shop is closely associated with Pleasure Point and Santa Cruz surf culture.', ['Business Overview', 'Brand History']);
  }

  if (dynamicTerms.some(term => q.includes(term))) {
    return policyAnswer('I do not have confirmed live information for that. Please check the current online ordering system or call the relevant Pleasure Pizza location.', ['Knowledge Confidence', 'Do Not Hallucinate'], { confidence: 'unknown', requiresLiveVerification: true });
  }

  return policyAnswer('Pleasure Pizza is a Santa Cruz pizza institution founded in 1975, with locations at Pleasure Point, East Side/41st Avenue, and Downtown. It is known for large slices, specialty pizzas, creative toppings, house ranch, and a relaxed local atmosphere. Ask me about a specific location, pizza, dietary option, or service.', ['Core Business Summary for System Prompts']);
}
