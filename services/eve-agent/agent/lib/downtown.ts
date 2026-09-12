import { callAgentOs, type AgentOsTool } from "./agentos.ts";

type CallOptions = Parameters<typeof callAgentOs>[2];

// The shared knowledge API can ignore location on ask/menu/escalate. Fail closed
// on cross-location results rather than presenting Pleasure Point facts as downtown.
const otherLocation = /pleasure\s+point|portola|east\s*side|41st|831[- .]?475[- .]?4002/i;

export async function callDowntown(
  tool: AgentOsTool,
  input: Record<string, unknown>,
  options: CallOptions = {},
): Promise<Record<string, unknown>> {
  if (tool === "locations" || tool === "escalate") {
    const result = await callAgentOs("locations", { location: "downtown" }, options);
    const locations = Array.isArray(result.locations)
      ? result.locations.filter((location) => location?.id === "downtown")
      : [];
    if (locations.length !== 1) throw new Error("Downtown location details are unavailable.");
    return {
      location: locations[0],
      requiresLiveVerification: true,
      ...(tool === "escalate" ? { guidance: "Ask the customer to call this downtown number; no staff have been contacted." } : {}),
    };
  }

  const result = await callAgentOs(tool, { ...input, location: "downtown" }, options);
  if (otherLocation.test(JSON.stringify(result))) {
    return {
      answer: "This lookup did not confirm downtown-specific information. Do not quote it or substitute another branch's menu or prices. Use the downtown staff-routing tool for confirmation.",
      requiresLiveVerification: true,
    };
  }
  return result;
}
