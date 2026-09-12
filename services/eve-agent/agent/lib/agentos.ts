const defaultBaseUrl = "https://mcp-production-110f.up.railway.app";

export type AgentOsTool = "ask" | "locations" | "menu" | "escalate";

export interface AgentOsConfig {
  baseUrl: string;
  apiKey: string;
}

export function getAgentOsConfig(env: NodeJS.ProcessEnv = process.env): AgentOsConfig {
  const apiKey = env.AGENTOS_API_KEY?.trim();
  if (!apiKey) throw new Error("AGENTOS_API_KEY is not configured.");

  return {
    baseUrl: (env.AGENTOS_API_URL?.trim() || defaultBaseUrl).replace(/\/$/, ""),
    apiKey,
  };
}

export async function callAgentOs<T extends Record<string, unknown>>(
  tool: AgentOsTool,
  input: Record<string, unknown>,
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch; signal?: AbortSignal } = {},
): Promise<T> {
  const { baseUrl, apiKey } = getAgentOsConfig(options.env);
  const response = await (options.fetchImpl ?? fetch)(`${baseUrl}/api/${tool}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
    signal: options.signal,
  });

  const payload = (await response.json().catch(() => null)) as T | { message?: string } | null;
  if (!response.ok) {
    const detail = payload && "message" in payload && payload.message ? `: ${payload.message}` : "";
    throw new Error(`Pleasure Pizza service returned ${response.status}${detail}`);
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("Pleasure Pizza service returned an invalid response.");
  }
  return payload as T;
}
