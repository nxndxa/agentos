const DEFAULT_ORIGIN = 'https://mcp-production-110f.up.railway.app';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderDocsPage(origin = DEFAULT_ORIGIN) {
  const safeOrigin = escapeHtml(origin.replace(/\/$/, ''));
  const mcpUrl = `${safeOrigin}/mcp`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#0c0c0f">
    <meta name="description" content="Connect Codex, Qoder, or another MCP client to The Pleasure Pizza MCP by AgentOS.">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%230c0c0f'/%3E%3Cpath d='M14 19h36L32 51z' fill='%23ff6b35'/%3E%3Ccircle cx='29' cy='29' r='3' fill='%23ffe07a'/%3E%3Ccircle cx='39' cy='34' r='3' fill='%23ffe07a'/%3E%3Cpath d='M17 19h30' stroke='%23f7efe6' stroke-width='5' stroke-linecap='round'/%3E%3C/svg%3E">
    <title>Connect · The Pleasure Pizza MCP by AgentOS</title>
    <style>
      :root{color-scheme:dark;--bg:#0c0c0f;--surface:#141419;--surface-2:#1a191f;--line:#2c2a31;--text:#f8f3ed;--muted:#aaa3a0;--orange:#ff6b35;--yellow:#ffe07a;--green:#87e7b0;--code:#09090c;--shadow:0 20px 70px rgba(0,0,0,.36)}
      *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 74% -10%,rgba(255,107,53,.13),transparent 28%),var(--bg);color:var(--text);font:16px/1.65 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
      a{color:inherit}.shell{width:min(1180px,calc(100% - 40px));margin:auto}.topbar{height:70px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}.brand{display:flex;align-items:center;gap:12px;text-decoration:none;font-weight:750;letter-spacing:-.02em}.brand-mark{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:var(--orange);color:#180904;font-size:.72rem;font-weight:900}.top-links{display:flex;align-items:center;gap:20px;color:var(--muted);font-size:.88rem}.top-links a{text-decoration:none}.status{display:inline-flex;align-items:center;gap:8px;color:var(--green)}.status::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 12px currentColor}
      .hero{padding:78px 0 64px;border-bottom:1px solid var(--line)}.kicker{margin:0 0 16px;color:var(--orange);font:700 .75rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase}.hero h1{max-width:850px;margin:0;font-size:clamp(3rem,7vw,6.6rem);line-height:.91;letter-spacing:-.07em}.hero h1 em{color:var(--yellow);font-style:normal}.hero-copy{display:grid;grid-template-columns:minmax(0,620px) auto;align-items:end;gap:40px;margin-top:32px}.hero-copy p{margin:0;color:var(--muted);font-size:1.08rem}.endpoint-chip{display:inline-flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--line);border-radius:999px;background:var(--surface);font:500 .76rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap}.endpoint-chip span{color:var(--green)}
      .layout{display:grid;grid-template-columns:210px minmax(0,1fr);gap:54px;padding:52px 0 100px}.toc{position:sticky;top:28px;align-self:start}.toc p{margin:0 0 12px;color:#67636a;font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.toc a{display:block;padding:7px 0;color:var(--muted);font-size:.86rem;text-decoration:none}.toc a:hover{color:var(--text)}.content{min-width:0}.section{scroll-margin-top:28px;padding:0 0 64px}.section+.section{padding-top:8px;border-top:1px solid var(--line)}.section-label{display:flex;align-items:center;gap:11px;margin:44px 0 12px;color:var(--orange);font:700 .72rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase}.section-label span{display:grid;place-items:center;width:24px;height:24px;border:1px solid #4b342c;border-radius:7px}.section h2{margin:0 0 12px;font-size:clamp(1.8rem,4vw,3rem);line-height:1.04;letter-spacing:-.045em}.section>p{max-width:700px;margin:0 0 24px;color:var(--muted)}
      .notice{display:flex;gap:13px;margin:24px 0;padding:16px 18px;border:1px solid #4a3e22;border-radius:14px;background:rgba(255,224,122,.06);color:#d8ceb0;font-size:.88rem}.notice strong{color:var(--yellow)}.notice-icon{flex:none;color:var(--yellow)}
      .steps{display:grid;gap:14px}.step{display:grid;grid-template-columns:42px minmax(0,1fr);gap:14px;padding:20px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}.step-number{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:rgba(255,107,53,.12);color:var(--orange);font:700 .8rem ui-monospace,SFMono-Regular,Menlo,monospace}.step h3{margin:3px 0 7px;font-size:1rem}.step p{margin:0;color:var(--muted);font-size:.88rem}
      .codeblock{position:relative;margin:14px 0 2px;border:1px solid var(--line);border-radius:14px;background:var(--code);overflow:hidden}.codebar{display:flex;align-items:center;justify-content:space-between;padding:9px 10px 9px 16px;border-bottom:1px solid #242329;color:#77717a;font:600 .68rem ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;letter-spacing:.08em}.copy{border:1px solid #34323a;border-radius:8px;background:#19181e;color:#bbb5bc;padding:7px 10px;cursor:pointer;font:600 .68rem ui-monospace,SFMono-Regular,Menlo,monospace}.copy:hover{border-color:#5b5762;color:white}.codeblock pre{margin:0;padding:18px;overflow:auto;color:#e9e4df;font:500 .78rem/1.65 ui-monospace,SFMono-Regular,Menlo,monospace;tab-size:2}.codeblock .accent{color:var(--yellow)}
      .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{padding:20px;border:1px solid var(--line);border-radius:17px;background:linear-gradient(145deg,var(--surface),#111116)}.card .tool-name{color:var(--yellow);font:700 .78rem ui-monospace,SFMono-Regular,Menlo,monospace}.card h3{margin:10px 0 7px;font-size:1rem}.card p{margin:0;color:var(--muted);font-size:.85rem}.badge{display:inline-flex;margin-top:14px;padding:4px 8px;border:1px solid #34323a;border-radius:6px;color:#817c84;font:600 .64rem ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase}
      .details{overflow:hidden;border:1px solid var(--line);border-radius:16px}.row{display:grid;grid-template-columns:150px minmax(0,1fr);gap:18px;padding:15px 18px;background:var(--surface)}.row+.row{border-top:1px solid var(--line)}.row dt{color:#77717a;font-size:.78rem}.row dd{margin:0;font:500 .78rem/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}.row dd a{color:var(--yellow)}
      .prompt-list{display:grid;gap:10px}.prompt{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:#d7d1cd;font-size:.88rem}.prompt button{flex:none}.guardrails{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.guardrail{padding:18px;border-left:2px solid var(--orange);background:linear-gradient(90deg,rgba(255,107,53,.06),transparent)}.guardrail strong{display:block;margin-bottom:5px;font-size:.86rem}.guardrail span{color:var(--muted);font-size:.78rem}.footer{display:flex;justify-content:space-between;gap:24px;padding:28px 0 40px;border-top:1px solid var(--line);color:#6f6a70;font-size:.75rem}.footer a{color:#a39da4}
      @media(max-width:800px){.shell{width:min(100% - 28px,680px)}.top-links>a{display:none}.hero{padding:54px 0}.hero-copy{grid-template-columns:1fr;gap:24px}.layout{grid-template-columns:1fr;padding-top:20px}.toc{display:none}.grid,.guardrails{grid-template-columns:1fr}.section{padding-bottom:48px}.row{grid-template-columns:1fr;gap:4px}.prompt{align-items:flex-start}.footer{flex-direction:column}.endpoint-chip{white-space:normal;overflow-wrap:anywhere}}
      @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
    </style>
  </head>
  <body>
    <header class="shell topbar">
      <a class="brand" href="#top"><span class="brand-mark">A/OS</span><span>AgentOS</span></a>
      <nav class="top-links" aria-label="Page links"><a href="/crm">Open CRM</a><a href="#connect">Connect</a><a href="#tools">Tools</a><a href="#test">Test it</a><span class="status">Deployed</span></nav>
    </header>

    <main id="top">
      <section class="hero">
        <div class="shell">
          <p class="kicker">Hosted MCP · Pleasure Pizza</p>
          <h1>Connect once.<br><em>Ask anything.</em></h1>
          <div class="hero-copy">
            <p>The Pleasure Pizza MCP by AgentOS gives Codex, Qoder, and other MCP clients a safe interface to the complete indexed PDF knowledge base and a shared, persistent customer CRM.</p>
            <div class="endpoint-chip"><span>●</span>${mcpUrl}</div>
          </div>
        </div>
      </section>

      <div class="shell layout">
        <aside class="toc" aria-label="Documentation sections">
          <p>On this page</p>
          <a href="#connect">Connect Codex</a>
          <a href="#other-clients">Other MCP clients</a>
          <a href="#cli">Use the CLI</a>
          <a href="#tools">Available tools</a>
          <a href="#test">Test prompts</a>
          <a href="#safety">Safety boundaries</a>
          <a href="#reference">Endpoint reference</a>
        </aside>

        <article class="content">
          <section class="section" id="connect">
            <p class="section-label"><span>01</span>Quick start</p>
            <h2>Connect it to Codex</h2>
            <p>You need the MCP URL and your private bearer credential. The credential is distributed separately and is never shown on this public page.</p>
            <div class="notice"><span class="notice-icon">◆</span><div><strong>Keep the key private.</strong> Put it in an environment variable—never inside a prompt, screenshot, repository, or client configuration you plan to share.</div></div>
            <div class="steps">
              <div class="step">
                <div class="step-number">1</div>
                <div><h3>Load your credential</h3><p>Set the key in the same environment that launches Codex.</p>
                  <div class="codeblock"><div class="codebar"><span>Terminal</span><button class="copy" data-copy="export PLEASURE_PIZZA_API_KEY=&quot;YOUR_PRIVATE_KEY&quot;">Copy</button></div><pre>export PLEASURE_PIZZA_API_KEY=<span class="accent">"YOUR_PRIVATE_KEY"</span></pre></div>
                </div>
              </div>
              <div class="step">
                <div class="step-number">2</div>
                <div><h3>Register the MCP</h3><p>This stores the endpoint and the name of the environment variable—not the secret itself.</p>
                  <div class="codeblock"><div class="codebar"><span>Codex CLI</span><button class="copy" data-copy="codex mcp add pleasure-pizza-by-agentos --url ${mcpUrl} --bearer-token-env-var PLEASURE_PIZZA_API_KEY">Copy</button></div><pre>codex mcp add pleasure-pizza-by-agentos \\
  --url <span class="accent">${mcpUrl}</span> \\
  --bearer-token-env-var PLEASURE_PIZZA_API_KEY</pre></div>
                </div>
              </div>
              <div class="step">
                <div class="step-number">3</div>
                <div><h3>Verify and use it</h3><p>Start a fresh Codex task after registration, then ask it to use the Pleasure Pizza MCP.</p>
                  <div class="codeblock"><div class="codebar"><span>Verify</span><button class="copy" data-copy="codex mcp get pleasure-pizza-by-agentos">Copy</button></div><pre>codex mcp get pleasure-pizza-by-agentos</pre></div>
                </div>
              </div>
            </div>
          </section>

          <section class="section" id="other-clients">
            <p class="section-label"><span>02</span>Universal setup</p>
            <h2>Connect another MCP client</h2>
            <p>Use Streamable HTTP, point the client at the endpoint below, and send the credential as a bearer token.</p>
            <div class="codeblock"><div class="codebar"><span>Generic configuration</span><button class="copy" data-copy='{"mcpServers":{"pleasure-pizza-by-agentos":{"type":"http","url":"${mcpUrl}","headers":{"Authorization":"Bearer YOUR_PRIVATE_KEY"}}}}'>Copy</button></div><pre>{
  "mcpServers": {
    "pleasure-pizza-by-agentos": {
      "type": "http",
      "url": <span class="accent">"${mcpUrl}"</span>,
      "headers": {
        "Authorization": "Bearer YOUR_PRIVATE_KEY"
      }
    }
  }
}</pre></div>
          </section>

          <section class="section" id="cli">
            <p class="section-label"><span>03</span>AgentOS CLI</p>
            <h2>Run it from this workspace</h2>
            <p>The workspace CLI reads the locally saved credential and calls the same hosted AgentOS runtime as the MCP tools.</p>
            <div class="codeblock"><div class="codebar"><span>Examples</span><button class="copy" data-copy='source .agentos/credentials.env&#10;node bin/agent.mjs ask "Do you have gluten-free pizza?"&#10;node bin/agent.mjs voice-agent "Pleasure Pizza"&#10;node bin/agent.mjs sms-agent "Pleasure Pizza"&#10;node bin/agent.mjs menu vegetarian&#10;node bin/agent.mjs escalate "missing order" --location downtown'>Copy</button></div><pre>source .agentos/credentials.env

node bin/agent.mjs ask "Do you have gluten-free pizza?"
node bin/agent.mjs voice-agent "Pleasure Pizza"
node bin/agent.mjs sms-agent "Pleasure Pizza"
node bin/agent.mjs menu vegetarian
node bin/agent.mjs escalate "missing order" --location downtown</pre></div>
          </section>

          <section class="section" id="tools">
            <p class="section-label"><span>04</span>Tool registry</p>
            <h2>Knowledge + complete CRM control</h2>
            <p>Knowledge tools are read-only. CRM tools can search, create, update, assist, route, and delete synthetic demo records in the same SQLite database used by the web app.</p>
            <div class="grid">
              <div class="card"><div class="tool-name">pleasure_pizza_ask</div><h3>Customer answers</h3><p>Answers normal menu, service, dietary, location, and recommendation questions.</p><span class="badge">Read only</span></div>
              <div class="card"><div class="tool-name">pleasure_pizza_demo_create_voice_agent</div><h3>Demo voice-agent setup</h3><p>Shows four progress updates over 15–20 seconds and returns +1 (385) 406-9108. Clearly labeled as a simulation; no live Vapi resource is created.</p><span class="badge">Simulated</span></div>
              <div class="card"><div class="tool-name">pleasure_pizza_demo_create_sms_agent</div><h3>Demo SMS-agent setup</h3><p>Shows four progress updates over 15–20 seconds and returns +1 (347) 281-2048. Clearly labeled as a simulation; no carrier resource is created.</p><span class="badge">Simulated</span></div>
              <div class="card"><div class="tool-name">pleasure_pizza_locations</div><h3>Location routing</h3><p>Returns the correct address, phone number, baseline hours, and service model.</p><span class="badge">Read only</span></div>
              <div class="card"><div class="tool-name">pleasure_pizza_menu</div><h3>Menu search</h3><p>Finds published pizzas, ingredients, vegetarian options, and qualified baseline prices.</p><span class="badge">Read only</span></div>
              <div class="card"><div class="tool-name">pleasure_pizza_escalate</div><h3>Staff handoff</h3><p>Routes refunds, order problems, allergies, payments, and delivery issues to the correct phone.</p><span class="badge">Read only</span></div>
              <div class="card"><div class="tool-name">pleasure_pizza_knowledge_search</div><h3>Full PDF retrieval</h3><p>Searches all 78 indexed pages using hybrid FTS5 and sparse TF-IDF cosine vectors, then returns page-level passages.</p><span class="badge">Read only</span></div>
              <div class="card"><div class="tool-name">pleasure_pizza_crm_*</div><h3>Customer operations</h3><p>Reads, creates, updates, and removes customer profiles and support cases in the shared CRM.</p><span class="badge">Read + write</span></div>
              <div class="card"><div class="tool-name">pleasure_pizza_crm_assist_customer</div><h3>Grounded customer copilot</h3><p>Answers from the knowledge base, logs the conversation, and creates a case when staff action is required.</p><span class="badge">Read + write</span></div>
              <div class="card"><div class="tool-name">pleasure_pizza_crm_dashboard</div><h3>Operational summary</h3><p>Returns shared customer metrics, support workload, and the cross-channel activity trail.</p><span class="badge">Read only</span></div>
            </div>
          </section>

          <section class="section" id="test">
            <p class="section-label"><span>05</span>Demo prompts</p>
            <h2>Try the important cases</h2>
            <p>These prompts demonstrate grounded answers, location disambiguation, and safety escalation.</p>
            <div class="prompt-list">
              <div class="prompt"><span>“What vegetarian pizza would you recommend?”</span><button class="copy" data-copy="What vegetarian pizza would you recommend?">Copy</button></div>
              <div class="prompt"><span>“Create a Vapi voice agent for customer support.”</span><button class="copy" data-copy="Create a Vapi voice agent for customer support.">Copy</button></div>
              <div class="prompt"><span>“Create an SMS agent for customer support.”</span><button class="copy" data-copy="Create an SMS agent for customer support.">Copy</button></div>
              <div class="prompt"><span>“Is the gluten-free crust safe for celiac disease?”</span><button class="copy" data-copy="Is the gluten-free crust safe for celiac disease?">Copy</button></div>
              <div class="prompt"><span>“How late are you open tonight?”</span><button class="copy" data-copy="How late are you open tonight?">Copy</button></div>
              <div class="prompt"><span>“My Downtown order is missing. Who should I call?”</span><button class="copy" data-copy="My Downtown order is missing. Who should I call?">Copy</button></div>
            </div>
          </section>

          <section class="section" id="safety">
            <p class="section-label"><span>06</span>Truth boundaries</p>
            <h2>What it will not fake</h2>
            <p>The integration is intentionally deterministic for the demo, but the answers preserve the restaurant’s real knowledge boundaries.</p>
            <div class="guardrails">
              <div class="guardrail"><strong>No allergy guarantees</strong><span>Cross-contact is possible. Severe allergies and celiac questions go to staff.</span></div>
              <div class="guardrail"><strong>No live-data guesses</strong><span>Current hours, inventory, delivery coverage, wait times, and prices require verification.</span></div>
              <div class="guardrail"><strong>No order actions</strong><span>The MCP cannot inspect, change, refund, or promise the status of a real order.</span></div>
            </div>
          </section>

          <section class="section" id="reference">
            <p class="section-label"><span>07</span>Reference</p>
            <h2>Endpoint details</h2>
            <dl class="details">
              <div class="row"><dt>Service origin</dt><dd><a href="${safeOrigin}">${safeOrigin}</a></dd></div>
              <div class="row"><dt>MCP endpoint</dt><dd>${mcpUrl}</dd></div>
              <div class="row"><dt>Transport</dt><dd>Streamable HTTP</dd></div>
              <div class="row"><dt>Authentication</dt><dd>Authorization: Bearer &lt;PLEASURE_PIZZA_API_KEY&gt;</dd></div>
              <div class="row"><dt>Health check</dt><dd><a href="${safeOrigin}/health">${safeOrigin}/health</a></dd></div>
              <div class="row"><dt>CRM application</dt><dd><a href="${safeOrigin}/crm">${safeOrigin}/crm</a></dd></div>
              <div class="row"><dt>Database</dt><dd>Persistent SQLite + FTS5 + sparse TF-IDF vectors</dd></div>
              <div class="row"><dt>Knowledge version</dt><dd>September 12, 2026 · 78 indexed PDF pages</dd></div>
            </dl>
          </section>
        </article>
      </div>
    </main>

    <footer class="shell footer"><span>One company. One interface. Any agent.</span><span>Built by AgentOS · Deployed on Railway</span></footer>
    <script>
      document.querySelectorAll('[data-copy]').forEach(button => {
        button.addEventListener('click', async () => {
          const label = button.textContent;
          try {
            await navigator.clipboard.writeText(button.dataset.copy);
            button.textContent = 'Copied';
          } catch {
            button.textContent = 'Select text';
          }
          window.setTimeout(() => { button.textContent = label; }, 1400);
        });
      });
    </script>
  </body>
</html>`;
}
