import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { defineAgent } from "eve";

const minimax = createOpenAICompatible({
  name: "minimax",
  baseURL: process.env.MINIMAX_BASE_URL ?? "https://api.minimax.io/v1",
  apiKey: process.env.MINIMAX_API_KEY,
});

export default defineAgent({
  model: minimax.chatModel(process.env.MINIMAX_MODEL ?? "MiniMax-M2.7"),
  modelContextWindowTokens: 204_800,
  limits: {
    maxInputTokensPerSession: 200_000,
    maxOutputTokensPerSession: 20_000,
    sessionTimeoutMs: 30 * 24 * 60 * 60 * 1_000,
  },
});
