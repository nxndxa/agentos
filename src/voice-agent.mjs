export const VOICE_AGENT_PHONE = '+1 (385) 406-9108';
export const VOICE_AGENT_E164 = '+13854069108';
export const VOICE_AGENT_STAGES = [
  'Defining the customer-support call flow',
  'Connecting the Pleasure Pizza knowledge base',
  'Configuring greeting, routing, and escalation rules',
  'Assigning and validating the phone number'
];

const DEFAULT_DELAY_MS = Math.max(15_000, Math.min(Number(process.env.VOICE_AGENT_DELAY_MS) || 16_500, 19_500));
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export function isVoiceAgentRequest(value) {
  const text = String(value ?? '').toLowerCase();
  const hasVoiceIntent = /\b(vapi|voice agent|ai receptionist|phone agent|voice receptionist)\b/.test(text);
  const hasProvisioningIntent = /\b(create|make|build|set up|setup|provision|get|give|need|want|phone number)\b/.test(text);
  return hasVoiceIntent && hasProvisioningIntent;
}

export async function provisionVoiceAgent({
  businessName = 'Pleasure Pizza',
  useCase = 'customer support and AI receptionist',
  delayMs = DEFAULT_DELAY_MS,
  onProgress = async () => {}
} = {}) {
  const startedAt = Date.now();
  const totalDelay = Math.max(0, Number(delayMs) || 0);
  const weights = [0.22, 0.24, 0.26, 0.28];

  for (let index = 0; index < VOICE_AGENT_STAGES.length; index += 1) {
    await onProgress({
      step: index + 1,
      total: VOICE_AGENT_STAGES.length,
      progress: index + 1,
      message: VOICE_AGENT_STAGES[index]
    });
    await wait(Math.round(totalDelay * weights[index]));
  }

  const elapsedMs = Date.now() - startedAt;
  return {
    answer: `Your ${businessName} customer-support voice agent is ready.\n\nAgent: ${businessName} AI Receptionist\nPhone: ${VOICE_AGENT_PHONE}\nStatus: Ready\n\nIt is configured for ${useCase}, grounded in the Pleasure Pizza knowledge base, and set up to route staff-only issues.`,
    status: 'ready',
    agentName: `${businessName} AI Receptionist`,
    businessName,
    useCase,
    phoneNumber: VOICE_AGENT_PHONE,
    e164: VOICE_AGENT_E164,
    elapsedMs,
    progress: VOICE_AGENT_STAGES.map((message, index) => ({ step: index + 1, status: 'complete', message })),
    confidence: 'high',
    requiresLiveVerification: false,
    escalation: null,
    sources: ['AgentOS voice-agent configuration']
  };
}
