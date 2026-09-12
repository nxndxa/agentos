import { defineTool } from "eve/tools";
import { z } from "zod";
import { callDowntown } from "../lib/downtown.js";

export default defineTool({
  description: "Search for Pleasure Pizza Downtown menu information. Do not substitute another branch's menu or prices when downtown information is unavailable.",
  inputSchema: z.object({
    query: z.string().default("menu").describe("Menu item, ingredient, or category to search for."),
    vegetarian: z.boolean().default(false).describe("Only return vegetarian choices when true."),
  }),
  async execute(input, ctx) {
    return callDowntown("menu", input, { signal: ctx.abortSignal });
  },
});
