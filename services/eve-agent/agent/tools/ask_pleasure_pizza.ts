import { defineTool } from "eve/tools";
import { z } from "zod";
import { callAgentOs } from "../lib/agentos.js";

export default defineTool({
  description: "Answer a customer question using the live Pleasure Pizza knowledge base and its safety policies. Use this before stating business facts.",
  inputSchema: z.object({
    question: z.string().min(1).describe("The customer's exact question."),
    location: z.string().optional().describe("The Pleasure Pizza location, if the customer named one."),
  }),
  async execute(input, ctx) {
    return callAgentOs("ask", input, { signal: ctx.abortSignal });
  },
});
