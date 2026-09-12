import { defineTool } from "eve/tools";
import { z } from "zod";
import { callDowntown } from "../lib/downtown.js";

export default defineTool({
  description: "Get a verified published Downtown menu summary, representative pizzas and ingredients, sizes, and selected slice prices. Use for menu overviews and recommendations; this is a partial snapshot, not live stock or custom totals.",
  inputSchema: z.object({
    query: z.string().default("menu").describe("Menu item, ingredient, or category to search for."),
    vegetarian: z.boolean().default(false).describe("Only return vegetarian choices when true."),
  }),
  async execute(input, ctx) {
    return callDowntown("menu", input, { signal: ctx.abortSignal });
  },
});
