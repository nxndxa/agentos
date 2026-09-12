import { timingSafeEqual } from "node:crypto";

const sendblueBaseUrl = "https://api.sendblue.com";

export interface SendBlueConfig {
  apiKey: string;
  apiSecret: string;
  fromNumber: string;
  webhookSecret: string;
  allowedServices: Set<string>;
}

export interface SendBlueInboundMessage {
  content?: unknown;
  from_number?: unknown;
  to_number?: unknown;
  sendblue_number?: unknown;
  number?: unknown;
  is_outbound?: unknown;
  status?: unknown;
  service?: unknown;
  group_id?: unknown;
  message_handle?: unknown;
}

export function getSendBlueConfig(env: NodeJS.ProcessEnv = process.env): SendBlueConfig {
  const apiKey = env.SENDBLUE_API_KEY?.trim();
  const apiSecret = env.SENDBLUE_API_SECRET?.trim();
  const fromNumber = env.SENDBLUE_FROM_NUMBER?.trim();
  const webhookSecret = env.SENDBLUE_WEBHOOK_SECRET?.trim();

  if (!apiKey || !apiSecret || !fromNumber || !webhookSecret) {
    throw new Error("SendBlue credentials, sending number, or webhook secret are not configured.");
  }

  const allowedServices = new Set(
    (env.SENDBLUE_ALLOWED_SERVICES || "iMessage")
      .split(",")
      .map((service) => service.trim().toLowerCase())
      .filter(Boolean),
  );

  return { apiKey, apiSecret, fromNumber, webhookSecret, allowedServices };
}

export function safeEqual(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return (
    actualBytes.length > 0 &&
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

export function verifySendBlueWebhook(request: Request, config: SendBlueConfig): boolean {
  return safeEqual(request.headers.get("sb-signing-secret") ?? "", config.webhookSecret);
}

export function parseInboundMessage(
  value: SendBlueInboundMessage,
  config: SendBlueConfig,
): { contactNumber: string; fromNumber: string; content: string; messageHandle: string } | null {
  if (value.is_outbound !== false || value.status !== "RECEIVED") return null;
  if (typeof value.content !== "string" || !value.content.trim()) return null;
  if (typeof value.from_number !== "string" || !value.from_number.trim()) return null;

  const service = typeof value.service === "string" ? value.service.toLowerCase() : "";
  if (!config.allowedServices.has(service)) return null;

  const fromNumber =
    typeof value.sendblue_number === "string" && value.sendblue_number.trim()
      ? value.sendblue_number.trim()
      : typeof value.to_number === "string" && value.to_number.trim()
        ? value.to_number.trim()
        : config.fromNumber;

  if (fromNumber !== config.fromNumber) return null;
  if (typeof value.group_id === "string" && value.group_id.trim()) return null;

  return {
    contactNumber: value.from_number.trim(),
    fromNumber,
    content: value.content.trim(),
    messageHandle: typeof value.message_handle === "string" ? value.message_handle : "",
  };
}

export function continuationToken(contactNumber: string, fromNumber: string): string {
  return `${fromNumber}:${contactNumber}`;
}

export function customerFacingText(content: string): string {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "")
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)")
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1")
    .replace(/(?<!\w)_{1,3}([^_\n]+)_{1,3}(?!\w)/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendBlueMessage(
  toNumber: string,
  content: string,
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch; fromNumber?: string } = {},
): Promise<unknown> {
  const config = getSendBlueConfig(options.env);
  const safeContent = customerFacingText(content);
  if (!safeContent) throw new Error("Refusing to send an empty customer-facing message.");
  const response = await (options.fetchImpl ?? fetch)(`${sendblueBaseUrl}/api/send-message`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sb-api-key-id": config.apiKey,
      "sb-api-secret-key": config.apiSecret,
    },
    body: JSON.stringify({
      number: toNumber,
      from_number: options.fromNumber ?? config.fromNumber,
      content: safeContent,
    }),
  });

  const payload = (await response.json().catch(() => null)) as { error_message?: string } | null;
  if (!response.ok) {
    const detail = payload?.error_message ? `: ${payload.error_message}` : "";
    throw new Error(`SendBlue returned ${response.status}${detail}`);
  }
  return payload;
}
