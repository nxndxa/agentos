# Pleasure Pizza Eve agent

This service adds an iMessage concierge to the existing Pleasure Pizza AgentOS deployment. It runs as a separate Railway service named `eve-agent` and calls the existing `mcp` service for restaurant knowledge. The existing MCP server and CRM database are not included in this package.

## What we used

- **Vercel Eve 0.47.3** provides the agent loop, tool execution, channel events, and conversation sessions.
- **MiniMax M2.7** provides reasoning through its OpenAI-compatible API, using `@ai-sdk/openai-compatible` and the AI SDK. The model and base URL are configurable.
- **SendBlue** receives inbound iMessages and delivers replies through its HTTP API.
- **Railway** hosts the Node 24 service and a volume mounted at `/app/.eve/.workflow-data` for Eve session storage.
- **TypeScript and Zod** define the implementation and model-facing tool inputs. Node's test runner checks the integration helpers with mocked HTTP requests.

Railway's official MCP was also registered in the operator's local Codex configuration for infrastructure access. That configuration and the operator's Railway login are not part of this repository or required by the deployed app.

## How a message works

1. SendBlue posts to `POST /webhooks/sendblue`. The service compares the `sb-signing-secret` header with the configured secret using a constant-time comparison.
2. The channel accepts nonempty, received, direct messages for the configured sending line and allowed service. The default allowed service is `iMessage`; outbound events and group messages are ignored.
3. The sending line and customer number form the conversation address. Eve resumes that conversation or creates one, and queues new messages when a turn is active.
4. MiniMax chooses from four restaurant tools. Each sends authenticated JSON to the existing AgentOS service:

   | Tool | Existing endpoint | Purpose |
   | --- | --- | --- |
   | `ask_pleasure_pizza` | `POST /api/ask` | Retrieve an answer from the restaurant knowledge service |
   | `list_locations` | `POST /api/locations` | Look up location details |
   | `search_menu` | `POST /api/menu` | Search published menu information |
   | `route_to_staff` | `POST /api/escalate` | Return staff contact guidance; does not contact staff |

5. On a completed assistant reply, the channel strips MiniMax `<think>` blocks and posts the visible text to SendBlue's `/api/send-message` endpoint. Text emitted alongside tool calls is not delivered. Failed turns attempt a short fallback reply.

The prompt requires location clarification where relevant and cautions against guaranteeing live prices, hours, order status, or allergen safety. Eve's default shell, file, web, and delegation tools are explicitly disabled. This service exposes no CRM editing tools.

## Configuration and local use

Use Node 24 or newer. Run these commands from `services/eve-agent`:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm start
```

Set the environment variables listed in `.env.example` before starting the service. For local development, populate an ignored `.env` file and use `npm run dev`. The example contains placeholders only.

| Variable | Purpose |
| --- | --- |
| `MINIMAX_API_KEY` | MiniMax authentication |
| `MINIMAX_BASE_URL` | Defaults to `https://api.minimax.io/v1` |
| `MINIMAX_MODEL` | Defaults to `MiniMax-M2.7` |
| `AGENTOS_API_URL` | Existing Pleasure Pizza service origin |
| `AGENTOS_API_KEY` | Bearer credential for restaurant tools |
| `SENDBLUE_API_KEY`, `SENDBLUE_API_SECRET` | SendBlue authentication |
| `SENDBLUE_FROM_NUMBER` | Registered sending line in E.164 format |
| `SENDBLUE_WEBHOOK_SECRET` | Secret matching the receive webhook registration |
| `SENDBLUE_ALLOWED_SERVICES` | Comma-separated inbound service allowlist; defaults to `iMessage` |
| `PORT` | HTTP listening port; Railway supplies this in production |

Production credentials are stored in Railway variables. The new service references the existing `mcp` service's MiniMax, AgentOS, and SendBlue credentials with Railway variable references, and has its own generated webhook secret. Never commit real values. `.env` files, dependency directories, Eve state, and generated builds are ignored.

## Deployment

The service is currently uploaded through the Railway CLI; GitHub autodeployment is not configured. From the repository root, with the intended Railway project and environment linked:

```sh
railway up services/eve-agent --path-as-root --service eve-agent
```

Railway detects the Node version, runs the package's build command, and starts Eve on all interfaces. Keep the session volume attached when redeploying. Configure SendBlue's receive webhook with the public `/webhooks/sendblue` URL, a matching secret, and a scope restricted to the intended SendBlue line.

The public `GET /eve/v1/health` endpoint reports readiness. Eve's default session and inspection routes reject unauthenticated production requests; no public chat API authenticator was added.

An initial deploy failed with `EXDEV` when Eve tried to rename an uploaded local `.output` directory. Excluding `.output/` from the upload fixed the build. Do not deploy with `--no-gitignore`, which would bypass the artifact and secret exclusions.

## Verification and remaining limits

The implementation passed six helper tests, TypeScript checking, and an Eve production build. A local Eve invocation using the configured MiniMax credentials successfully retrieved a restaurant phone number through the live knowledge service. Railway health probes passed, an unsigned webhook returned 401, and a signed ignored event returned 200. The signed SendBlue receive webhook was registered and read back successfully.

A real inbound-to-outbound iMessage conversation has **not** been tested. SendBlue shared lines may require the sender to be a verified contact. Attachments and group conversations are not supported. The inbound service allowlist does not itself enforce SendBlue's outbound SMS fallback policy.

This initial integration does not implement webhook deduplication, an application delivery ledger, or a durable inbox. It acknowledges accepted webhooks before the background session send completes, so failures at that boundary can lose a message, and provider retries can duplicate replies. Add durable ingestion and delivery reconciliation before relying on exactly-once processing. HTTP calls also have no explicit application timeout or retry policy, and an HTTP success from SendBlue is not proof of delivery. Conversation state contains customer messages and phone numbers; manage access and retention accordingly.

## References

- [Vercel Eve](https://github.com/vercel/eve)
- [MiniMax OpenAI-compatible API](https://platform.minimax.io/docs/api-reference/text-chat-openai)
- [SendBlue webhooks](https://docs.sendblue.com/getting-started/webhooks/)
- [SendBlue message API](https://docs.sendblue.com/api/resources/messages/methods/send)
- [Railway MCP](https://docs.railway.com/ai/mcp-server)
