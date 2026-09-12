import { defineTool } from "eve/tools";
import { z } from "zod";
import { callAgentOs } from "../lib/agentos.js";

export default defineTool({
  description: "Find the correct Pleasure Pizza location phone number for allergies, existing orders, payment, delivery, complaints, or staff-only issues.",
  inputSchema: z.object({
    reason: z.string().min(1).describe("Why the customer needs restaurant staff."),
    location: z.string().optional().describe("The location involved, if known."),
  }),
  async execute(input, ctx) {
    return callAgentOs("escalate", input, { signal: ctx.abortSignal });
  },
});
