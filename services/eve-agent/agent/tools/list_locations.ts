import { defineTool } from "eve/tools";
import { z } from "zod";
import { callAgentOs } from "../lib/agentos.js";

export default defineTool({
  description: "List Pleasure Pizza locations, phone numbers, addresses, published baseline hours, and service models.",
  inputSchema: z.object({
    location: z.string().optional().describe("Optional location name to narrow the result."),
  }),
  async execute(input, ctx) {
    return callAgentOs("locations", input, { signal: ctx.abortSignal });
  },
});
