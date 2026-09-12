import { defineTool } from "eve/tools";
import { z } from "zod";
import { callDowntown } from "../lib/downtown.js";

export default defineTool({
  description: "Get the Pleasure Pizza Downtown phone number for allergies, existing orders, payment, delivery, complaints, missing downtown facts, or staff-only issues. Does not contact staff.",
  inputSchema: z.object({
    reason: z.string().min(1).describe("Why the customer needs restaurant staff."),
  }),
  async execute(input, ctx) {
    return callDowntown("escalate", input, { signal: ctx.abortSignal });
  },
});
