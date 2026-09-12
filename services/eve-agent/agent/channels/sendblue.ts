import { defineChannel, POST } from "eve/channels";
import {
  continuationToken,
  getSendBlueConfig,
  parseInboundMessage,
  sendBlueMessage,
  verifySendBlueWebhook,
  type SendBlueInboundMessage,
} from "../lib/sendblue.js";

interface SendBlueState {
  contactNumber: string;
  fromNumber: string;
}

const initialState: SendBlueState = { contactNumber: "", fromNumber: "" };

export default defineChannel<SendBlueState, { state: SendBlueState }>({
  state: initialState,
  turnPolicy: "queue",
  context(state) {
    return { state };
  },
  metadata(state) {
    return {
      audience: "private" as const,
      contactNumber: state.contactNumber,
      fromNumber: state.fromNumber,
    };
  },
  routes: [
    POST("/webhooks/sendblue", async (request, { from, waitUntil }) => {
      let config;
      try {
        config = getSendBlueConfig();
      } catch (error) {
        console.error(error);
        return Response.json({ ok: false, error: "sendblue_not_configured" }, { status: 503 });
      }

      if (!verifySendBlueWebhook(request, config)) {
        return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }

      let body: SendBlueInboundMessage;
      try {
        body = (await request.json()) as SendBlueInboundMessage;
      } catch {
        return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
      }

      const message = parseInboundMessage(body, config);
      if (!message) return Response.json({ ok: true, ignored: true });

      waitUntil(
        from(continuationToken(message.contactNumber, message.fromNumber)).send(message.content, {
          auth: {
            authenticator: "sendblue",
            principalType: "user",
            principalId: message.contactNumber,
            attributes: {
              phone_number: message.contactNumber,
              sendblue_message_handle: message.messageHandle,
            },
          },
          state: {
            contactNumber: message.contactNumber,
            fromNumber: message.fromNumber,
          },
        }),
      );

      return Response.json({ ok: true }, { status: 202 });
    }),
  ],
  events: {
    async "message.completed"(event, channel) {
      if (!event.message || event.finishReason === "tool-calls") return;
      await sendBlueMessage(channel.state.contactNumber, event.message, {
        fromNumber: channel.state.fromNumber,
      });
    },
    async "turn.failed"(_event, channel) {
      await sendBlueMessage(
        channel.state.contactNumber,
        "Sorry—I hit a temporary issue. Please try again, or call your Pleasure Pizza location for immediate help.",
        { fromNumber: channel.state.fromNumber },
      );
    },
  },
});
