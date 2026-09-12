import { defineTool } from "eve/tools";
import { z } from "zod";
import { callDowntown } from "../lib/downtown.js";

export default defineTool({
  description: "Get Downtown location/contact facts when the customer explicitly asks for them. Does not contact staff, access orders, or handle refunds; never use this as a substitute for answering a question.",
  inputSchema: z.object({
    reason: z.string().min(1).describe("Why the customer needs restaurant staff."),
  }),
  async execute(input, ctx) {
    return callDowntown("escalate", input, { signal: ctx.abortSignal });
  },
});
