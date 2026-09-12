import { defineTool } from "eve/tools";
import { z } from "zod";
import { callDowntown } from "../lib/downtown.js";

export default defineTool({
  description: "Answer a customer question about Pleasure Pizza Downtown only. Use this before stating business facts; unavailable downtown facts require staff confirmation.",
  inputSchema: z.object({
    question: z.string().min(1).describe("The customer's exact question."),
  }),
  async execute(input, ctx) {
    return callDowntown("ask", input, { signal: ctx.abortSignal });
  },
});
