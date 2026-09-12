import assert from "node:assert/strict";
import test from "node:test";
import { callDowntown } from "../agent/lib/downtown.ts";

const env = { AGENTOS_API_KEY: "test-key" };

test("pins all knowledge calls to downtown despite a requested location override", async () => {
  for (const tool of ["ask", "menu"] as const) {
    await callDowntown(tool, { location: "pleasure point", query: "pizza" }, {
      env,
      fetchImpl: async (_url, init) => {
        assert.equal(JSON.parse(String(init?.body)).location, "downtown");
        return Response.json({ answer: "Downtown facts" });
      },
    });
  }
});

test("rejects cross-location menu prices and answers", async () => {
  for (const answer of ["Pleasure Point prices: $39", "Call 831-475-4002", "East Side at 41st Avenue"]) {
    const result = await callDowntown("menu", {}, {
      env, fetchImpl: async () => Response.json({ answer, items: [{ price: 39 }] }),
    });
    assert.equal(result.items, undefined);
    assert.equal(result.requiresLiveVerification, true);
    assert.ok(!JSON.stringify(result).includes("$39"));
  }
});

test("location lookup and staff routing expose only the downtown record", async () => {
  for (const tool of ["locations", "escalate"] as const) {
    const result = await callDowntown(tool, { location: "other" }, {
      env,
      fetchImpl: async (url, init) => {
        assert.ok(String(url).endsWith("/api/locations"));
        assert.deepEqual(JSON.parse(String(init?.body)), { location: "downtown" });
        return Response.json({ answer: "all branches", locations: [
          { id: "point", phone: "wrong" }, { id: "downtown", phone: "831-600-7859" },
        ] });
      },
    });
    assert.deepEqual(result.location, { id: "downtown", phone: "831-600-7859" });
    assert.ok(!JSON.stringify(result).includes("wrong"));
  }
});
