import assert from "node:assert/strict";
import test from "node:test";
import { callDowntown } from "../agent/lib/downtown.ts";

const env = { AGENTOS_API_KEY: "test-key" };

test("pins all knowledge calls to downtown despite a requested location override", async () => {
  for (const tool of ["ask"] as const) {
    await callDowntown(tool, { location: "pleasure point", query: "pizza" }, {
      env,
      fetchImpl: async (_url, init) => {
        assert.equal(JSON.parse(String(init?.body)).location, "downtown");
        return Response.json({ answer: "Downtown facts" });
      },
    });
  }
});

test("rejects cross-location answers but keeps useful downtown context without a referral", async () => {
  for (const answer of ["Pleasure Point prices: $39", "Call 831-475-4002", "East Side at 41st Avenue"]) {
    const result = await callDowntown("ask", {}, {
      env, fetchImpl: async (url) => String(url).endsWith("/api/locations")
        ? Response.json({ locations: [{ id: "downtown", phone: "831-600-7859" }] })
        : Response.json({ answer, items: [{ price: 39 }] }),
    });
    assert.equal(result.items, undefined);
    assert.equal(result.requiresLiveVerification, true);
    assert.ok(!JSON.stringify(result).includes("$39"));
    assert.ok(result.menu);
    assert.ok(result.downtown);
    assert.ok(!JSON.stringify(result).includes("Use the downtown staff-routing tool"));
  }
});

test("menu summaries use the published downtown snapshot, not the other branch's prices", async () => {
  const result = await callDowntown("menu", { query: "menu" }, {
    env, fetchImpl: async () => { throw new Error("Legacy menu should not be called"); },
  });
  const menu = result.menu as { location: string; categories: string[]; examples: { name: string }[]; source: string };
  assert.equal(menu.location, "downtown");
  assert.ok(menu.categories.includes("wings"));
  assert.ok(menu.examples.some((item) => item.name === "bbq chicken"));
  assert.equal(menu.source, "https://order.toasttab.com/online/pleasure-pizza-downtown");
  assert.ok(!JSON.stringify(result).includes("17.95"));
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
