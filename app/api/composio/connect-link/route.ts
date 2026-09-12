import { NextRequest } from "next/server";
import { DEMO_ENTITY_ID, TOOLKIT_SLUGS, getAuthConfigId, getComposio, isToolKey } from "@/lib/composio";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { tool?: string } = {};
  try {
    body = (await req.json()) as { tool?: string };
  } catch {
    // Empty body is fine — defaults to gmail.
  }
  const tool = body.tool ?? "gmail";
  if (!isToolKey(tool)) {
    return Response.json({ error: `unknown tool: ${tool}` }, { status: 400 });
  }

  try {
    const composio = getComposio();
    const toolkitSlug = TOOLKIT_SLUGS[tool];
    const authConfigId = await getAuthConfigId(toolkitSlug);
    const callbackUrl = new URL("/api/composio/callback", req.url).toString();
    const link = await composio.connectedAccounts.link(DEMO_ENTITY_ID, authConfigId, {
      callbackUrl,
    });
    return Response.json({
      tool,
      redirectUrl: link.redirectUrl,
      connectedAccountId: link.id,
      status: link.status ?? "INITIATED",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Composio request failed";
    console.error("[composio/connect-link]", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
