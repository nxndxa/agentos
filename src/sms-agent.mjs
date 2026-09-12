export const SMS_AGENT_PHONE = '+1 (347) 281-2048';
export const SMS_AGENT_E164 = '+13472812048';
export const SMS_AGENT_STAGES = [
  'Designing the customer-support SMS workflow',
  'Connecting the Pleasure Pizza knowledge base',
  'Configuring replies, routing, and staff escalation',
  'Assigning and validating the demo SMS number'
];

const configuredDelayMs = Number(process.env.SMS_AGENT_DELAY_MS);
const DEFAULT_DELAY_MS = process.env.NODE_ENV === 'test'
  ? Math.max(0, configuredDelayMs || 25)
  : Math.max(15_000, Math.min(configuredDelayMs || 16_500, 19_500));
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export function isSmsAgentRequest(value) {
  const text = String(value ?? '').toLowerCase();
  const hasSmsIntent = /\b(sms|text message|texting)\b/.test(text);
  const hasAgentIntent = /\b(agent|bot|support|phone number|sms number|text number|same thing)\b/.test(text);
  const hasProvisioningIntent = /\b(create|make|build|set up|setup|provision|get|give|need|want|phone number|sms number|text number)\b/.test(text);
  return hasSmsIntent && hasAgentIntent && hasProvisioningIntent;
}

export async function provisionSmsAgent({
  businessName = 'Pleasure Pizza',
  useCase = 'customer support over SMS',
  delayMs = DEFAULT_DELAY_MS,
  onProgress = async () => {}
} = {}) {
  const startedAt = Date.now();
  const totalDelay = Math.max(0, Number(delayMs) || 0);
  const weights = [0.22, 0.24, 0.26, 0.28];

  for (let index = 0; index < SMS_AGENT_STAGES.length; index += 1) {
    await onProgress({
      step: index + 1,
      total: SMS_AGENT_STAGES.length,
      progress: index + 1,
      message: SMS_AGENT_STAGES[index]
    });
    await wait(Math.round(totalDelay * weights[index]));
  }

  const elapsedMs = Date.now() - startedAt;
  return {
    answer: `Your ${businessName} customer-support SMS agent is ready.\n\nSMS: ${SMS_AGENT_PHONE}\n\nDemo provisioning complete.\nDemo mode: no live SMS agent, carrier service, or phone-number resource was created.`,
    status: 'ready',
    agentName: `${businessName} SMS Support Agent`,
    businessName,
    useCase,
    phoneNumber: SMS_AGENT_PHONE,
    e164: SMS_AGENT_E164,
    provider: 'AgentOS SMS demo',
    simulated: true,
    disclosure: 'This is a deterministic demo simulation. No live SMS agent, carrier service, or phone-number resource was created.',
    elapsedMs,
    progress: SMS_AGENT_STAGES.map((message, index) => ({ step: index + 1, status: 'complete', message })),
    confidence: 'high',
    requiresLiveVerification: false,
    escalation: null,
    sources: ['AgentOS simulated SMS-agent configuration']
  };
}
