import { defineTool } from "eve/tools";
import { z } from "zod";
import { callDowntown } from "../lib/downtown.js";

export default defineTool({
  description: "Get only Pleasure Pizza Downtown's phone number, address, published hours, and services. The location is fixed; never ask the customer to choose a branch.",
  inputSchema: z.object({}),
  async execute(input, ctx) {
    return callDowntown("locations", input, { signal: ctx.abortSignal });
  },
});
