import { defineTool } from "eve/tools";
import { z } from "zod";
import { callAgentOs } from "../lib/agentos.js";

export default defineTool({
  description: "Search Pleasure Pizza's published menu. Returned prices are baselines and require live confirmation.",
  inputSchema: z.object({
    query: z.string().default("menu").describe("Menu item, ingredient, or category to search for."),
    vegetarian: z.boolean().default(false).describe("Only return vegetarian choices when true."),
  }),
  async execute(input, ctx) {
    return callAgentOs("menu", input, { signal: ctx.abortSignal });
  },
});
