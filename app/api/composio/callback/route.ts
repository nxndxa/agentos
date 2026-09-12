import { NextRequest } from "next/server";

export const runtime = "nodejs";

const STATUS_TEXT: Record<string, string> = {
  success: "Connection complete",
  failed: "Connection failed",
};

// Popup callback page. After the OAuth dance, Composio redirects the
// browser here with ?status=success|failed. We post a message back to
// the opener (the AgentOS window) so the polling loop can stop, then
// self-close.
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? "unknown";
  const label = STATUS_TEXT[status] ?? status;
  const safeStatus = JSON.stringify(status);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${label} · AgentOS</title>
<style>
  :root { color-scheme: dark; }
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#041114;color:#e9fffb;display:grid;place-items:center;min-height:100vh;margin:0;padding:32px;text-align:center}
  h1{color:#72f5df;font-weight:500;font-size:22px;margin:0 0 12px;letter-spacing:-.02em}
  p{color:#8aa5a7;font:11px/1.6 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;margin:0}
  .dot{display:inline-block;width:6px;height:6px;background:#72f5df;border-radius:50%;box-shadow:0 0 10px #72f5df;margin-right:8px;vertical-align:middle}
</style>
</head>
<body>
  <h1>${label}</h1>
  <p><span class="dot"></span>Returning to AgentOS…</p>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({ type: 'composio-callback', status: ${safeStatus} }, '*');
      }
    } catch (e) {}
    setTimeout(function () {
      try { window.close(); } catch (e) {}
    }, 1400);
  </script>
</body>
</html>`;
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
