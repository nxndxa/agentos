import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { askPleasurePizza, createDemoSmsAgent, createDemoVoiceAgent, escalatePleasurePizza, getPleasurePizzaLocations, getPleasurePizzaMenu } from './runtime.mjs';
import {
  assistCrmCustomer,
  createCrmCase,
  createCrmCustomer,
  deleteCrmCase,
  deleteCrmCustomer,
  getCrmCustomer,
  getCrmDashboard,
  listCrmCases,
  searchCrmCustomers,
  searchPleasurePizzaKnowledge,
  updateCrmCase,
  updateCrmCustomer
} from './crm-runtime.mjs';
import { KNOWLEDGE_BASE_VERSION } from './knowledge.mjs';

const readAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const writeAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const destructiveAnnotations = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false };

async function sendProgress(ctx, update) {
  const progressToken = ctx?.mcpReq?._meta?.progressToken;
  if (progressToken === undefined) return;
  try {
    await ctx.mcpReq.notify({
      method: 'notifications/progress',
      params: { progressToken, progress: update.progress, total: update.total, message: update.message }
    });
  } catch {}
}

export function createPleasurePizzaMcpServer() {
  const server = new McpServer(
    { name: 'the-pleasure-pizza-skill-by-agentos', version: '0.5.0' },
    { instructions: 'Use the knowledge tools for safe Pleasure Pizza answers and the CRM tools to manage the synthetic demo customer workspace. Never guarantee allergy safety, live hours, inventory, delivery coverage, or order status.' }
  );

  server.registerTool('pleasure_pizza_ask', {
    title: 'Ask Pleasure Pizza',
    description: 'Answer a Pleasure Pizza customer question from the verified knowledge base and apply location, allergy, hours, pricing, and escalation rules.',
    inputSchema: z.object({
      question: z.string().min(1).describe('The customer question.'),
      location: z.string().optional().describe('Optional location hint: Pleasure Point, East Side, or Downtown.')
    }),
    outputSchema: z.object({
      answer: z.string(),
      confidence: z.string(),
      requiresLiveVerification: z.boolean(),
      escalation: z.unknown().nullable(),
      sources: z.array(z.string()),
      retrieval: z.string().optional(),
      status: z.string().optional(),
      agentName: z.string().optional(),
      businessName: z.string().optional(),
      useCase: z.string().optional(),
      phoneNumber: z.string().optional(),
      e164: z.string().optional(),
      provider: z.string().optional(),
      simulated: z.boolean().optional(),
      disclosure: z.string().optional(),
      elapsedMs: z.number().optional(),
      progress: z.array(z.unknown()).optional(),
      knowledgeBaseVersion: z.string()
    }),
    annotations: readAnnotations
  }, async (args, ctx) => askPleasurePizza(args, { onProgress: update => sendProgress(ctx, update) }));

  server.registerTool('pleasure_pizza_demo_create_voice_agent', {
    title: 'Create a Customer Support Voice Agent',
    description: 'Run a staged customer-support voice-agent setup, emit user-facing progress updates, and return the assigned phone number +1 (385) 406-9108.',
    inputSchema: z.object({
      businessName: z.string().optional().describe('Business name for the receptionist. Defaults to Pleasure Pizza.'),
      useCase: z.string().optional().describe('Voice-agent purpose. Defaults to customer support and AI receptionist.')
    }),
    outputSchema: z.object({
      answer: z.string(),
      status: z.literal('ready'),
      agentName: z.string(),
      businessName: z.string(),
      useCase: z.string(),
      phoneNumber: z.string(),
      e164: z.string(),
      elapsedMs: z.number(),
      progress: z.array(z.unknown()),
      confidence: z.string(),
      requiresLiveVerification: z.boolean(),
      escalation: z.unknown().nullable(),
      sources: z.array(z.string()),
      knowledgeBaseVersion: z.string()
    }),
    annotations: readAnnotations
  }, async (args, ctx) => createDemoVoiceAgent(args, { onProgress: update => sendProgress(ctx, update) }));

  server.registerTool('pleasure_pizza_demo_create_sms_agent', {
    title: 'Create a Demo SMS Support Agent',
    description: 'Run a 15–20 second simulated customer-support SMS-agent setup, emit user-facing progress updates, and return the fixed demo number +1 (347) 281-2048. This does not create a live SMS or carrier resource.',
    inputSchema: z.object({
      businessName: z.string().optional().describe('Business name for the SMS agent. Defaults to Pleasure Pizza.'),
      useCase: z.string().optional().describe('SMS-agent purpose. Defaults to customer support over SMS.')
    }),
    outputSchema: z.object({
      answer: z.string(),
      status: z.literal('ready'),
      agentName: z.string(),
      businessName: z.string(),
      useCase: z.string(),
      phoneNumber: z.string(),
      e164: z.string(),
      provider: z.string(),
      simulated: z.literal(true),
      disclosure: z.string(),
      elapsedMs: z.number(),
      progress: z.array(z.unknown()),
      confidence: z.string(),
      requiresLiveVerification: z.boolean(),
      escalation: z.unknown().nullable(),
      sources: z.array(z.string()),
      knowledgeBaseVersion: z.string()
    }),
    annotations: readAnnotations
  }, async (args, ctx) => createDemoSmsAgent(args, { onProgress: update => sendProgress(ctx, update) }));

  server.registerTool('pleasure_pizza_locations', {
    title: 'Pleasure Pizza Locations',
    description: 'List address, phone, baseline hours, and service model for Pleasure Pizza locations.',
    inputSchema: z.object({ location: z.string().optional() }),
    annotations: readAnnotations
  }, async args => getPleasurePizzaLocations(args));

  server.registerTool('pleasure_pizza_menu', {
    title: 'Search the Pleasure Pizza Menu',
    description: 'Search published pizza names and ingredients. Returned prices are qualified as changeable baselines.',
    inputSchema: z.object({
      query: z.string().optional().describe('Pizza name, ingredient, vegetarian, or menu.'),
      vegetarian: z.boolean().optional()
    }),
    annotations: readAnnotations
  }, async args => getPleasurePizzaMenu(args));

  server.registerTool('pleasure_pizza_escalate', {
    title: 'Route to Restaurant Staff',
    description: 'Route refunds, missing orders, payment disputes, order status, delivery problems, serious allergy questions, and other staff-only issues.',
    inputSchema: z.object({
      reason: z.string().min(1),
      location: z.string().optional()
    }),
    annotations: readAnnotations
  }, async args => escalatePleasurePizza(args));

  server.registerTool('pleasure_pizza_knowledge_search', {
    title: 'Search the Full Pleasure Pizza PDF',
    description: 'Search all 78 indexed pages of the September 12, 2026 Pleasure Pizza Downtown knowledge base using hybrid SQLite FTS5 and sparse TF-IDF cosine vectors.',
    inputSchema: z.object({ query: z.string().min(1), limit: z.number().int().min(1).max(10).optional() }),
    annotations: readAnnotations
  }, async args => searchPleasurePizzaKnowledge(args));

  server.registerTool('pleasure_pizza_crm_dashboard', {
    title: 'Pleasure Pizza CRM Dashboard',
    description: 'Read live summary metrics, recent synthetic customers, support cases, and activity from the shared demo CRM.',
    inputSchema: z.object({}),
    annotations: readAnnotations
  }, async () => getCrmDashboard());

  server.registerTool('pleasure_pizza_crm_search_customers', {
    title: 'Search Pleasure Pizza CRM Customers',
    description: 'Search synthetic demo customers by name, contact detail, tag, location, or status.',
    inputSchema: z.object({
      query: z.string().optional(),
      location: z.enum(['pleasure_point', 'east_side', 'downtown']).optional(),
      status: z.string().optional()
    }),
    annotations: readAnnotations
  }, async args => searchCrmCustomers(args));

  server.registerTool('pleasure_pizza_crm_get_customer', {
    title: 'Get Pleasure Pizza CRM Customer',
    description: 'Read one synthetic demo customer with their cases and recent activity.',
    inputSchema: z.object({ customerId: z.string().min(1) }),
    annotations: readAnnotations
  }, async args => getCrmCustomer(args));

  server.registerTool('pleasure_pizza_crm_create_customer', {
    title: 'Create Pleasure Pizza CRM Customer',
    description: 'Add a synthetic customer profile to the shared demo CRM.',
    inputSchema: z.object({
      name: z.string().min(1),
      email: z.email().optional(),
      phone: z.string().regex(/^[+()\d.\s-]+$/).optional(),
      location: z.enum(['pleasure_point', 'east_side', 'downtown']).optional(),
      status: z.enum(['new', 'active', 'vip', 'needs_attention', 'inactive']).optional(),
      loyaltyTier: z.enum(['Bronze', 'Silver', 'Gold', 'Platinum']).optional(),
      lifetimeOrders: z.number().int().min(0).optional(),
      lifetimeSpend: z.number().min(0).optional(),
      lastOrderAt: z.iso.datetime().optional(),
      tags: z.array(z.string().max(40)).max(8).optional()
    }),
    annotations: writeAnnotations
  }, async args => createCrmCustomer(args));

  server.registerTool('pleasure_pizza_crm_update_customer', {
    title: 'Update Pleasure Pizza CRM Customer',
    description: 'Update a synthetic demo customer profile in the shared CRM.',
    inputSchema: z.object({
      customerId: z.string().min(1),
      name: z.string().optional(),
      email: z.email().optional(),
      phone: z.string().regex(/^[+()\d.\s-]+$/).optional(),
      location: z.enum(['pleasure_point', 'east_side', 'downtown']).optional(),
      status: z.enum(['new', 'active', 'vip', 'needs_attention', 'inactive']).optional(),
      loyaltyTier: z.enum(['Bronze', 'Silver', 'Gold', 'Platinum']).optional(),
      lifetimeOrders: z.number().int().min(0).optional(),
      lifetimeSpend: z.number().min(0).optional(),
      lastOrderAt: z.iso.datetime().optional(),
      tags: z.array(z.string().max(40)).max(8).optional()
    }),
    annotations: writeAnnotations
  }, async args => updateCrmCustomer(args));

  server.registerTool('pleasure_pizza_crm_delete_customer', {
    title: 'Delete Pleasure Pizza CRM Customer',
    description: 'Permanently remove one synthetic demo customer and their linked cases and activity.',
    inputSchema: z.object({ customerId: z.string().min(1) }),
    annotations: destructiveAnnotations
  }, async args => deleteCrmCustomer(args));

  server.registerTool('pleasure_pizza_crm_list_cases', {
    title: 'List Pleasure Pizza CRM Cases',
    description: 'Read support cases from the shared demo CRM and filter by customer, status, or priority.',
    inputSchema: z.object({
      customerId: z.string().optional(),
      status: z.enum(['open', 'in_progress', 'waiting', 'resolved']).optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional()
    }),
    annotations: readAnnotations
  }, async args => listCrmCases(args));

  server.registerTool('pleasure_pizza_crm_create_case', {
    title: 'Create Pleasure Pizza CRM Case',
    description: 'Create a support case for a synthetic demo customer.',
    inputSchema: z.object({
      customerId: z.string().min(1),
      subject: z.string().min(1),
      category: z.string().optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      status: z.enum(['open', 'in_progress', 'waiting', 'resolved']).optional(),
      channel: z.string().optional(),
      message: z.string().optional(),
      assignedTo: z.string().optional()
    }),
    annotations: writeAnnotations
  }, async args => createCrmCase(args));

  server.registerTool('pleasure_pizza_crm_update_case', {
    title: 'Update Pleasure Pizza CRM Case',
    description: 'Change the status, priority, owner, or subject of a shared demo CRM case.',
    inputSchema: z.object({
      caseId: z.string().min(1),
      status: z.enum(['open', 'in_progress', 'waiting', 'resolved']).optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      assignedTo: z.string().optional(),
      subject: z.string().optional()
    }),
    annotations: writeAnnotations
  }, async args => updateCrmCase(args));

  server.registerTool('pleasure_pizza_crm_delete_case', {
    title: 'Delete Pleasure Pizza CRM Case',
    description: 'Permanently remove one support case from the synthetic demo CRM.',
    inputSchema: z.object({ caseId: z.string().min(1) }),
    annotations: destructiveAnnotations
  }, async args => deleteCrmCase(args));

  server.registerTool('pleasure_pizza_crm_assist_customer', {
    title: 'Assist a Pleasure Pizza CRM Customer',
    description: 'Answer with the verified Pleasure Pizza knowledge base, log the interaction, and automatically create a staff case when escalation is required.',
    inputSchema: z.object({
      customerId: z.string().optional(),
      question: z.string().min(1),
      location: z.enum(['pleasure_point', 'east_side', 'downtown']).optional()
    }),
    annotations: writeAnnotations
  }, async args => assistCrmCustomer(args));

  server.registerResource('pleasure-pizza-knowledge-base', 'agentos://pleasure-pizza/knowledge-base', {
    title: 'Pleasure Pizza Knowledge Base Summary',
    description: `Verified summary and safety boundaries, version ${KNOWLEDGE_BASE_VERSION}.`,
    mimeType: 'text/plain'
  }, async uri => ({
    contents: [{
      uri: uri.href,
      text: `Pleasure Pizza is a Santa Cruz pizza business founded in 1975 with Pleasure Point, East Side Eatery, and Downtown locations. Knowledge base version: ${KNOWLEDGE_BASE_VERSION}. Never guarantee allergy safety, current hours, item availability, delivery coverage, pricing, wait times, or order status without live verification.`
    }]
  }));

  server.registerResource('pleasure-pizza-crm', 'agentos://pleasure-pizza/crm', {
    title: 'Pleasure Pizza Demo CRM',
    description: 'Shared synthetic customer workspace used by the AgentOS CRM webpage and MCP tools.',
    mimeType: 'application/json'
  }, async uri => {
    const dashboard = await getCrmDashboard();
    return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(dashboard.structuredContent, null, 2) }] };
  });

  return server;
}
