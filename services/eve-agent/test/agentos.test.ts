import assert from "node:assert/strict";
import test from "node:test";
import { callAgentOs } from "../agent/lib/agentos.ts";

test("callAgentOs sends authenticated JSON to the selected tool endpoint", async () => {
  let request: Request | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    request = new Request(input, init);
    return Response.json({ answer: "hello" });
  };

  const result = await callAgentOs<{ answer: string }>("ask", { question: "Hi" }, {
    env: { AGENTOS_API_URL: "https://example.test/", AGENTOS_API_KEY: "test-key" },
    fetchImpl,
  });

  assert.equal(result.answer, "hello");
  assert.equal(request?.url, "https://example.test/api/ask");
  assert.equal(request?.headers.get("authorization"), "Bearer test-key");
  assert.deepEqual(await request?.json(), { question: "Hi" });
});

test("callAgentOs reports upstream errors without exposing credentials", async () => {
  await assert.rejects(
    callAgentOs("menu", {}, {
      env: { AGENTOS_API_KEY: "private-key" },
      fetchImpl: async () => Response.json({ message: "bad query" }, { status: 400 }),
    }),
    /returned 400: bad query/,
  );
});
