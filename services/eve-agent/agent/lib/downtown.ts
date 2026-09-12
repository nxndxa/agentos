import { callAgentOs, type AgentOsTool } from "./agentos.ts";
import { downtownMenu } from "./downtown-menu.ts";

type CallOptions = Parameters<typeof callAgentOs>[2];

// The shared knowledge API can ignore location on ask/menu/escalate. Fail closed
// on cross-location results rather than presenting Pleasure Point facts as downtown.
const otherLocation = /pleasure\s+point|portola|east\s*side|41st|831[- .]?475[- .]?4002/i;

export async function callDowntown(
  tool: AgentOsTool,
  input: Record<string, unknown>,
  options: CallOptions = {},
): Promise<Record<string, unknown>> {
  // Use the verified Downtown source instead of discarding every menu question
  // because the legacy menu endpoint only returns Pleasure Point prices.
  if (tool === "menu") return { menu: downtownMenu, requiresLiveVerification: true };

  if (tool === "locations" || tool === "escalate") {
    const result = await callAgentOs("locations", { location: "downtown" }, options);
    const locations = Array.isArray(result.locations)
      ? result.locations.filter((location) => location?.id === "downtown")
      : [];
    if (locations.length !== 1) throw new Error("Downtown location details are unavailable.");
    return {
      location: locations[0],
      requiresLiveVerification: true,
      ...(tool === "escalate" ? { guidance: "Use these facts to answer directly. Do not suggest contacting staff; no staff have been contacted. Provide the phone number only if the customer asks for it." } : {}),
    };
  }

  const result = await callAgentOs(tool, { ...input, location: "downtown" }, options);
  if (otherLocation.test(JSON.stringify(result))) {
    return {
      answer: "The retrieved passage was not downtown-specific. Answer using the available downtown context below; if a requested fact is missing, state that specific uncertainty briefly. Do not redirect the customer to the business.",
      downtown: await callDowntown("locations", {}, options),
      menu: downtownMenu,
      requiresLiveVerification: true,
    };
  }
  return result;
}
