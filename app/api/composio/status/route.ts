import { NextRequest } from "next/server";
import { getComposio } from "@/lib/composio";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId");
  if (!accountId) {
    return Response.json({ error: "accountId is required" }, { status: 400 });
  }
  try {
    const composio = getComposio();
    const account = await composio.connectedAccounts.get(accountId);
    return Response.json({
      id: account.id,
      status: account.status,
      toolkit: account.toolkit?.slug ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Composio request failed";
    console.error("[composio/status]", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
