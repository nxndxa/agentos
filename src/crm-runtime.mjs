import { KNOWLEDGE_BASE_VERSION } from './knowledge.mjs';
import { askPleasurePizza } from './runtime.mjs';
import { crmStore } from './crm-store.mjs';

function toolResult(payload) {
  return {
    content: [{ type: 'text', text: payload.answer ?? JSON.stringify(payload, null, 2) }],
    structuredContent: { ...payload, knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION }
  };
}

export async function getCrmDashboard() {
  const dashboard = await crmStore.dashboard();
  return toolResult({ answer: `CRM has ${dashboard.stats.customers} customers and ${dashboard.stats.openCases} open support cases.`, ...dashboard });
}

export async function searchCrmCustomers(args = {}) {
  const customers = await crmStore.searchCustomers(args);
  return toolResult({ answer: customers.length ? customers.map(item => `${item.name} · ${item.location} · ${item.status} · ${item.email || item.phone || 'no contact'}`).join('\n') : 'No matching demo customers were found.', customers, count: customers.length });
}

export async function getCrmCustomer({ customerId }) {
  const customer = await crmStore.getCustomer(customerId);
  return toolResult({ answer: `${customer.name} is a ${customer.loyaltyTier} customer with ${customer.lifetimeOrders} orders and ${customer.cases.filter(item => item.status !== 'resolved').length} open cases.`, customer });
}

export async function createCrmCustomer(args) {
  const customer = await crmStore.createCustomer(args);
  return toolResult({ answer: `${customer.name} was added to the Pleasure Pizza demo CRM.`, customer });
}

export async function updateCrmCustomer({ customerId, ...changes }) {
  const customer = await crmStore.updateCustomer(customerId, changes);
  return toolResult({ answer: `${customer.name}'s CRM profile was updated.`, customer });
}

export async function deleteCrmCustomer({ customerId }) {
  const deleted = await crmStore.deleteCustomer(customerId);
  return toolResult({ answer: `${deleted.name} was removed from the synthetic demo CRM.`, deleted });
}

export async function listCrmCases(args = {}) {
  const cases = await crmStore.listCases(args);
  return toolResult({ answer: cases.length ? cases.map(item => `${item.id} · ${item.priority} · ${item.status} · ${item.subject} · ${item.customer?.name ?? 'Unknown customer'}`).join('\n') : 'No matching support cases were found.', cases, count: cases.length });
}

export async function createCrmCase(args) {
  const supportCase = await crmStore.createCase(args);
  return toolResult({ answer: `${supportCase.id} was created for ${supportCase.customer.name} and assigned to ${supportCase.assignedTo}.`, case: supportCase });
}

export async function updateCrmCase({ caseId, ...changes }) {
  const supportCase = await crmStore.updateCase(caseId, changes);
  return toolResult({ answer: `${supportCase.id} is now ${supportCase.status.replaceAll('_', ' ')}.`, case: supportCase });
}

export async function deleteCrmCase({ caseId }) {
  const deleted = await crmStore.deleteCase(caseId);
  return toolResult({ answer: `${deleted.id} was removed from the synthetic demo CRM.`, deleted });
}

export async function searchPleasurePizzaKnowledge({ query, limit = 5 }) {
  const results = await crmStore.searchKnowledge(query, limit);
  return toolResult({
    answer: results.length ? results.map(item => `PDF page ${item.page}: ${item.snippet}`).join('\n\n') : 'No matching passage was found in the indexed Pleasure Pizza PDF.',
    query,
    results,
    retrieval: 'Hybrid SQLite FTS5 + sparse TF-IDF cosine vectors',
    source: 'Pleasure Pizza Knowledge Base (1).pdf'
  });
}

export async function assistCrmCustomer({ customerId = '', question, location = '' }) {
  const customer = customerId ? await crmStore.getCustomer(customerId) : null;
  const resolvedLocation = location || customer?.location || '';
  const result = (await askPleasurePizza({ question, location: resolvedLocation }, { allowVoiceAgent: false, allowSmsAgent: false })).structuredContent;
  let supportCase = null;

  if (customerId) {
    await crmStore.logInteraction({ customerId, type: 'customer_message', summary: question });
    await crmStore.logInteraction({ customerId, type: 'assistant_answer', summary: result.answer });
    if (result.escalation?.required) {
      const priority = /allerg|celiac|charged|payment/i.test(question) ? 'high' : 'normal';
      supportCase = await crmStore.createCase({
        customerId,
        subject: question.slice(0, 90),
        category: /allerg|celiac|gluten/i.test(question) ? 'dietary' : 'support',
        priority,
        status: 'open',
        channel: 'agentos',
        message: question,
        assignedTo: resolvedLocation === 'downtown' ? 'Downtown team' : resolvedLocation === 'east_side' ? 'East Side team' : resolvedLocation === 'pleasure_point' ? 'Pleasure Point team' : 'Unassigned'
      });
    }
  }

  return toolResult({ ...result, answer: result.answer, customer, case: supportCase });
}
