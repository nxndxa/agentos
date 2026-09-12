import assert from "node:assert/strict";
import test from "node:test";
import {
  continuationToken,
  customerFacingText,
  getSendBlueConfig,
  parseInboundMessage,
  sendBlueMessage,
  verifySendBlueWebhook,
} from "../agent/lib/sendblue.ts";

const env = {
  SENDBLUE_API_KEY: "key",
  SENDBLUE_API_SECRET: "secret",
  SENDBLUE_FROM_NUMBER: "+13470000000",
  SENDBLUE_WEBHOOK_SECRET: "webhook-secret",
  SENDBLUE_ALLOWED_SERVICES: "iMessage",
};

test("validates and parses a direct inbound iMessage", () => {
  const config = getSendBlueConfig(env);
  const request = new Request("https://example.test/webhooks/sendblue", {
    headers: { "sb-signing-secret": "webhook-secret" },
  });
  assert.equal(verifySendBlueWebhook(request, config), true);
  assert.deepEqual(
    parseInboundMessage(
      {
        content: " Where are you? ",
        from_number: "+15550000000",
        sendblue_number: "+13470000000",
        is_outbound: false,
        status: "RECEIVED",
        service: "iMessage",
        message_handle: "message-1",
      },
      config,
    ),
    {
      contactNumber: "+15550000000",
      fromNumber: "+13470000000",
      content: "Where are you?",
      messageHandle: "message-1",
    },
  );
  assert.equal(continuationToken("+15550000000", "+13470000000"), "+13470000000:+15550000000");
});

test("ignores outbound, non-iMessage, group, and wrong-line messages", () => {
  const config = getSendBlueConfig(env);
  const valid = {
    content: "Hello",
    from_number: "+15550000000",
    sendblue_number: "+13470000000",
    is_outbound: false,
    status: "RECEIVED",
    service: "iMessage",
  };

  assert.equal(parseInboundMessage({ ...valid, is_outbound: true }, config), null);
  assert.equal(parseInboundMessage({ ...valid, service: "SMS" }, config), null);
  assert.equal(parseInboundMessage({ ...valid, group_id: "group-1" }, config), null);
  assert.equal(parseInboundMessage({ ...valid, sendblue_number: "+19990000000" }, config), null);
});

test("removes MiniMax reasoning blocks from customer-facing text", () => {
  assert.equal(
    customerFacingText("<think>Internal chain of thought.</think>\n\nCall us at 831-555-0100."),
    "Call us at 831-555-0100.",
  );
  assert.equal(customerFacingText("Answer only."), "Answer only.");
  assert.equal(customerFacingText("<think>unfinished reasoning"), "");
});

test("sendBlueMessage uses the documented SendBlue request shape", async () => {
  let request: Request | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    request = new Request(input, init);
    return Response.json({ status: "QUEUED" });
  };

  await sendBlueMessage("+15550000000", "**Hi!**", { env, fetchImpl });
  assert.equal(request?.url, "https://api.sendblue.com/api/send-message");
  assert.equal(request?.headers.get("sb-api-key-id"), "key");
  assert.equal(request?.headers.get("sb-api-secret-key"), "secret");
  assert.deepEqual(await request?.json(), {
    number: "+15550000000",
    from_number: "+13470000000",
    content: "Hi!",
  });
});

test("renders recommendation and price formatting as plain iMessage text", () => {
  assert.equal(
    customerFacingText("## Try these\n- **The Hook** — pesto and feta\n- **BBQ Chicken** — chicken and BBQ sauce\n\nCall **831-475-4002**. Published price: **$39.00**."),
    "Try these\nThe Hook — pesto and feta\nBBQ Chicken — chicken and BBQ sauce\n\nCall 831-475-4002. Published price: $39.00.",
  );
  assert.equal(customerFacingText("See https://example.com/menu_for_today and call +1-831-475-4002."),
    "See https://example.com/menu_for_today and call +1-831-475-4002.");
});
