import { answerCustomerQuestion, KNOWLEDGE_BASE_VERSION, listLocations, searchMenu } from './knowledge.mjs';
import { crmStore } from './crm-store.mjs';
import { isSmsAgentRequest, provisionSmsAgent } from './sms-agent.mjs';
import { isVoiceAgentRequest, provisionVoiceAgent } from './voice-agent.mjs';

export const TOOL_DEFINITIONS = [
  {
    name: 'pleasure_pizza_ask',
    title: 'Ask Pleasure Pizza',
    description: 'Answer a customer question using the Pleasure Pizza knowledge base and its safety policies.'
  },
  {
    name: 'pleasure_pizza_locations',
    title: 'Pleasure Pizza Locations',
    description: 'List Pleasure Point, East Side Eatery, and Downtown contact information and service models.'
  },
  {
    name: 'pleasure_pizza_menu',
    title: 'Search the Pleasure Pizza Menu',
    description: 'Find pizzas or vegetarian options from the published menu. Prices are baseline information, not guarantees.'
  },
  {
    name: 'pleasure_pizza_escalate',
    title: 'Route to Restaurant Staff',
    description: 'Find the correct location phone number for order, allergy, payment, delivery, or staff-only issues.'
  },
  {
    name: 'pleasure_pizza_create_voice_agent',
    title: 'Create Customer Support Voice Agent',
    description: 'Run the staged customer-support voice-agent demo flow and return the assigned phone number.'
  },
  {
    name: 'pleasure_pizza_demo_create_sms_agent',
    title: 'Create Demo SMS Agent',
    description: 'Run the simulated customer-support SMS-agent setup and return the assigned demo number.'
  },
  {
    name: 'pleasure_pizza_knowledge_search',
    title: 'Search Full Knowledge Base',
    description: 'Search all indexed pages of the Pleasure Pizza knowledge base.'
  },
  {
    name: 'pleasure_pizza_crm_dashboard',
    title: 'CRM Dashboard',
    description: 'Read live customer, support-case, and activity metrics.'
  },
  {
    name: 'pleasure_pizza_crm_search_customers',
    title: 'Search CRM Customers',
    description: 'Search synthetic CRM customer profiles.'
  },
  {
    name: 'pleasure_pizza_crm_get_customer',
    title: 'Get CRM Customer',
    description: 'Read one synthetic customer profile and timeline.'
  },
  {
    name: 'pleasure_pizza_crm_create_customer',
    title: 'Create CRM Customer',
    description: 'Create a synthetic CRM customer profile.'
  },
  {
    name: 'pleasure_pizza_crm_update_customer',
    title: 'Update CRM Customer',
    description: 'Update a synthetic CRM customer profile.'
  },
  {
    name: 'pleasure_pizza_crm_delete_customer',
    title: 'Delete CRM Customer',
    description: 'Delete a synthetic CRM customer and linked records.'
  },
  {
    name: 'pleasure_pizza_crm_list_cases',
    title: 'List CRM Cases',
    description: 'List and filter support cases.'
  },
  {
    name: 'pleasure_pizza_crm_create_case',
    title: 'Create CRM Case',
    description: 'Create a support case for a synthetic customer.'
  },
  {
    name: 'pleasure_pizza_crm_update_case',
    title: 'Update CRM Case',
    description: 'Update a support case status, priority, or owner.'
  },
  {
    name: 'pleasure_pizza_crm_delete_case',
    title: 'Delete CRM Case',
    description: 'Delete a synthetic CRM support case.'
  },
  {
    name: 'pleasure_pizza_crm_assist_customer',
    title: 'Assist CRM Customer',
    description: 'Answer a customer question, log it, and create staff follow-up when needed.'
  }
];

function asToolResult(payload) {
  return {
    content: [{ type: 'text', text: payload.answer ?? JSON.stringify(payload, null, 2) }],
    structuredContent: { ...payload, knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION }
  };
}

export async function createDemoVoiceAgent(args = {}, options = {}) {
  return asToolResult(await provisionVoiceAgent({ ...args, ...options }));
}

export async function createDemoSmsAgent(args = {}, options = {}) {
  return asToolResult(await provisionSmsAgent({ ...args, ...options }));
}

export async function askPleasurePizza({ question, location = '' }, options = {}) {
  if (options.allowSmsAgent !== false && isSmsAgentRequest(question)) return createDemoSmsAgent({ businessName: 'Pleasure Pizza', useCase: 'customer support over SMS' }, options);
  if (options.allowVoiceAgent !== false && isVoiceAgentRequest(question)) return createDemoVoiceAgent({ businessName: 'Pleasure Pizza', useCase: 'customer support and AI receptionist' }, options);
  const result = answerCustomerQuestion(question, location);
  if (!result.sources.includes('Core Business Summary for System Prompts')) return asToolResult(result);

  const matches = await crmStore.searchKnowledge(question, 3);
  if (!matches.length) return asToolResult(result);
  return asToolResult({
    ...result,
    answer: `From the complete Pleasure Pizza PDF index:\n\n${matches.map(item => `Page ${item.page}: ${item.snippet.replaceAll('[', '').replaceAll(']', '')}`).join('\n\n')}`,
    confidence: 'medium',
    sources: matches.map(item => `Pleasure Pizza Knowledge Base (1).pdf page ${item.page}`),
    retrieval: 'Hybrid SQLite FTS5 + sparse TF-IDF cosine vectors'
  });
}

export function getPleasurePizzaLocations({ location = '' } = {}) {
  const all = listLocations();
  const normalized = location.toLowerCase();
  const matches = normalized ? all.filter(item => `${item.name} ${item.id}`.toLowerCase().includes(normalized.replaceAll(' ', '_')) || item.name.toLowerCase().includes(normalized)) : all;
  const selected = matches.length ? matches : all;
  return asToolResult({
    answer: selected.map(item => `${item.name}\n${item.address}\n${item.phone}\n${item.baselineHours}\n${item.concept}`).join('\n\n'),
    locations: selected,
    confidence: matches.length || !normalized ? 'high' : 'unknown',
    requiresLiveVerification: true,
    sources: ['Locations', 'Hours Policy for AI']
  });
}

export function getPleasurePizzaMenu({ query = 'menu', vegetarian = false } = {}) {
  const items = searchMenu(query, { vegetarian });
  const answer = items.length
    ? items.map(item => {
        const priceText = Object.entries(item.prices).map(([size, price]) => `${size}\" $${price.toFixed(2)}`).join(' / ');
        return `${item.name}: ${item.ingredients.join(', ')} (${priceText})`;
      }).join('\n')
    : 'I do not have a confirmed menu match for that query.';
  return asToolResult({ answer: `${answer}\n\nPrices shown are current published Pleasure Point baselines and may change or vary by location.`, items, confidence: items.length ? 'high' : 'unknown', requiresLiveVerification: true, sources: ['Original Pleasure Point Pizza Menu', 'Price Policy for AI'] });
}

export function escalatePleasurePizza({ reason, location = '' }) {
  const question = `${reason} ${location}`.trim();
  const result = answerCustomerQuestion(question || 'order status', location);
  if (!result.escalation) {
    result.escalation = { required: true, reason: reason || 'customer_requested_staff', phone: null };
    result.answer += '\n\nPlease call the location involved for staff assistance.';
  }
  return asToolResult(result);
}
