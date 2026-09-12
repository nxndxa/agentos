"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import Vapi from "@vapi-ai/web";
import { Check, ChevronRight, Mic, Phone, PhoneOff, Plus, Sparkles } from "lucide-react";
import { seedData, type SeedEntity, type ToolKey as SeedToolKey } from "@/lib/seed-data";

type Mode = "idle" | "listening" | "thinking" | "speaking";
type TranscriptEntry = { id: string; role: "agent" | "user"; text: string };
type ToolKey = "gmail" | "drive" | "docs" | "sheets" | "calendar";
type AccountStatus = "PENDING" | "ACTIVE" | "FAILED";
type AccountState = { tool: ToolKey; accountId: string; status: AccountStatus };
const TOOL_KEYS = ["gmail", "drive", "docs", "sheets", "calendar"] as const satisfies readonly SeedToolKey[];

// Maps the slug returned by the Composio status endpoint back to our ToolKey.
const TOOLKIT_SLUG_TO_KEY: Record<string, ToolKey> = {
  gmail: "gmail",
  googledrive: "drive",
  googledocs: "docs",
  googlesheets: "sheets",
  googlecalendar: "calendar",
};

const iconFor: Record<ToolKey, string> = { gmail: "M", drive: "◆", docs: "D", sheets: "#", calendar: "▣" };
const iconClassFor: Record<ToolKey, string> = { gmail: "mail", drive: "drive", docs: "docs", sheets: "sheets", calendar: "calendar" };
const labelFor: Record<ToolKey, string> = { gmail: "Gmail", drive: "Drive", docs: "Docs", sheets: "Sheets", calendar: "Calendar" };
const VapiConstructor = ((Vapi as unknown as { default?: typeof Vapi }).default ?? Vapi) as unknown as new (publicKey: string) => Vapi;
const brainNode: Node = { id: "brain", type: "brain", position: { x: 450, y: 330 }, data: { label: "AgentOS", detail: "Business brain" } };
const toolCatalog: Record<ToolKey, Node> = {
  gmail: { id: "gmail", type: "service", position: { x: 70, y: 70 }, data: { label: "Gmail", icon: "M", color: "red" } },
  drive: { id: "drive", type: "service", position: { x: 760, y: 70 }, data: { label: "Drive", icon: "◆", color: "blue" } },
  docs: { id: "docs", type: "service", position: { x: 70, y: 430 }, data: { label: "Docs", icon: "D", color: "violet" } },
  sheets: { id: "sheets", type: "service", position: { x: 760, y: 430 }, data: { label: "Sheets", icon: "#", color: "green" } },
  calendar: { id: "calendar", type: "service", position: { x: 430, y: 620 }, data: { label: "Calendar", icon: "▣", color: "orange" } },
};
const detectTools = (text: string): ToolKey[] => {
  const lower = text.toLowerCase();
  return (TOOL_KEYS as readonly ToolKey[]).filter((tool) => {
    const terms: Record<ToolKey, string[]> = {
      gmail: ["gmail", "email", "inbox"],
      drive: ["drive", "google drive", "files"],
      docs: ["docs", "documents", "google docs"],
      sheets: ["sheets", "spreadsheet", "spreadsheets"],
      calendar: ["calendar", "schedule", "events"],
    };
    return terms[tool].some((term) => lower.includes(term));
  });
};

const buildEntityNodes = (tool: ToolKey): Node[] => {
  const service = toolCatalog[tool];
  const brain = brainNode.position;
  const seeds = seedData[tool];
  const dx = service.position.x - brain.x;
  const dy = service.position.y - brain.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  return seeds.map((entity: SeedEntity, i: number) => {
    const tier = Math.floor(i / 2);
    const side = i % 2 === 0 ? -1 : 1;
    const distance = 115 + tier * 78;
    const lateral = side * (45 + tier * 22);
    return {
      id: `${tool}-${entity.id}`,
      type: "entity",
      position: {
        x: Math.round(service.position.x + ux * distance + px * lateral),
        y: Math.round(service.position.y + uy * distance + py * lateral),
      },
      data: {
        label: entity.label,
        kind: entity.kind,
        source: tool,
        meta: entity.meta,
        color: service.data.color,
      },
    } as Node;
  });
};

function ServiceNode({ data }: { data: { label: string; icon: string; color: string } }) {
  return (
    <div className={`graph-node service-node service-${data.color}`}>
      <Handle type="target" position={Position.Top} id="t-top" />
      <Handle type="target" position={Position.Left} id="t-left" />
      <Handle type="target" position={Position.Right} id="t-right" />
      <Handle type="target" position={Position.Bottom} id="t-bot" />
      <span className={`service-icon ${data.color}`}>{data.icon}</span>
      <span>{data.label}</span>
      <Handle type="source" position={Position.Top} id="s-top" />
      <Handle type="source" position={Position.Left} id="s-left" />
      <Handle type="source" position={Position.Right} id="s-right" />
      <Handle type="source" position={Position.Bottom} id="s-bot" />
    </div>
  );
}
function EntityNode({ data }: { data: { label: string; kind: string; source: string; meta?: string; color: string } }) {
  return (
    <div className={`graph-node entity-node entity-${data.color}`}>
      <Handle type="source" position={Position.Top} id="e-top" />
      <Handle type="source" position={Position.Left} id="e-left" />
      <Handle type="source" position={Position.Right} id="e-right" />
      <Handle type="source" position={Position.Bottom} id="e-bot" />
      <span className="entity-kind">{data.kind}</span>
      <strong>{data.label}</strong>
      {data.meta && <span className="entity-meta">{data.meta}</span>}
    </div>
  );
}
function BrainNode({ data }: { data: { label: string; detail: string } }) {
  return (
    <div className="brain-node">
      <Handle type="target" position={Position.Top} id="b-top" />
      <Handle type="target" position={Position.Left} id="b-left" />
      <Handle type="target" position={Position.Right} id="b-right" />
      <Handle type="target" position={Position.Bottom} id="b-bot" />
      <div className="brain-core"><span className="brain-spark">✦</span></div>
      <strong>{data.label}</strong>
      <span>{data.detail}</span>
      <Handle type="source" position={Position.Top} id="bs-top" />
      <Handle type="source" position={Position.Left} id="bs-left" />
      <Handle type="source" position={Position.Right} id="bs-right" />
      <Handle type="source" position={Position.Bottom} id="bs-bot" />
    </div>
  );
}
function BrainRingNode({ data }: { data: { circumference: number; dashoffset: number; isPulsing: boolean } }) {
  return (
    <div className={`brain-ring ${data.isPulsing ? "is-pulsing" : ""}`}>
      <svg viewBox="0 0 160 160" width="160" height="160" aria-hidden>
        <circle className="ring-track" cx="80" cy="80" r="70" />
        <circle
          className="ring-progress"
          cx="80"
          cy="80"
          r="70"
          strokeDasharray={data.circumference}
          strokeDashoffset={data.dashoffset}
        />
      </svg>
    </div>
  );
}
function CheckIcon({ filled, pending }: { filled: boolean; pending: boolean }) {
  return (
    <span className={`check-icon ${filled ? "is-filled" : ""} ${pending ? "is-pending" : ""}`} aria-hidden>
      <Check size={14} strokeWidth={filled ? 3 : 1.5} />
    </span>
  );
}
const nodeTypes = { service: ServiceNode, entity: EntityNode, brain: BrainNode, brainRing: BrainRingNode };

function PublicLanding() {
  return (
    <main className="public-landing">
      <div className="public-brand"><span><Sparkles size={16} /></span>agentOS</div>
      <a className="public-signin" href="/auth">Sign in</a>
      <section className="public-center">
        <p className="public-kicker">ONE COMPANY · ONE CLI · ANY AGENT</p>
        <div className="public-orb" aria-hidden="true"><i /><i /><i /></div>
        <h1>Your business,<br /><em>understood.</em></h1>
        <p>AgentOS connects the systems your company already runs on, giving every person and AI agent shared business context.</p>
        <a className="public-cta" href="/auth">Create your workspace <ChevronRight size={17} /></a>
      </section>
      <p className="public-footnote">Secure connections · Shared context · Agent-ready</p>
    </main>
  );
}

function HomeInner() {
  const [signedIn, setSignedIn] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [callActive, setCallActive] = useState(false);
  const [connected, setConnected] = useState(false);
  const [onboardingTools, setOnboardingTools] = useState<ToolKey[]>([]);
  const [revealedNodeIds, setRevealedNodeIds] = useState<Set<string>>(new Set(["brain", "brain-ring"]));
  const [burstingServices, setBurstingServices] = useState<Set<string>>(new Set());
  const [transcript, setTranscript] = useState("Hi! How can I connect your business with our platform?");
  const [transcriptLog, setTranscriptLog] = useState<TranscriptEntry[]>([
    { id: "welcome", role: "agent", text: "Hi! How can I connect your business with our platform?" },
  ]);
  const [status, setStatus] = useState("Waiting for your first connection");
  const [accounts, setAccounts] = useState<AccountState[]>([]);
  const [oauthComplete, setOauthComplete] = useState(false);
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const greetedRef = useRef(false);
  const vapiRef = useRef<Vapi | null>(null);
  const transcriptLogRef = useRef<HTMLDivElement | null>(null);
  const revealTimeoutsRef = useRef<number[]>([]);
  const onboardingToolsRef = useRef<ToolKey[]>([]);
  const fitViewCalledRef = useRef(false);
  const oauthCompleteRef = useRef(false);
  const oauthInProgressRef = useRef(false);
  const populateEntitiesRef = useRef(false);
  const accountsRef = useRef<AccountState[]>([]);
  const reactFlow = useReactFlow();
  useEffect(() => {
    setSignedIn(window.localStorage.getItem("agentos-demo-session") === "true");
  }, []);
  useEffect(() => {
    onboardingToolsRef.current = onboardingTools;
  }, [onboardingTools]);
  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);
  useEffect(() => () => {
    revealTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
  }, []);
  const addTranscript = useCallback((role: TranscriptEntry["role"], text: string) => {
    if (!text.trim()) return;
    setTranscriptLog((entries) => {
      const previous = entries.at(-1);
      if (previous?.role === role && (previous.text === text || text.startsWith(previous.text) || previous.text.startsWith(text))) {
        return [...entries.slice(0, -1), { ...previous, text }];
      }
      return [...entries, { id: Date.now().toString() + Math.random().toString(), role, text }];
    });
  }, []);
  useEffect(() => {
    const panel = transcriptLogRef.current;
    if (panel) panel.scrollTop = panel.scrollHeight;
  }, [transcriptLog]);
  useEffect(() => {
    if (!connected) {
      fitViewCalledRef.current = false;
      return;
    }
    if (fitViewCalledRef.current) return;
    fitViewCalledRef.current = true;
    const id = window.requestAnimationFrame(() => {
      reactFlow.fitView({ padding: 0.22, maxZoom: 1, minZoom: 0.4 });
    });
    return () => window.cancelAnimationFrame(id);
  }, [connected, reactFlow]);
  useEffect(() => {
    if (greetedRef.current) return;
    if (process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY && process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID) return;
    greetedRef.current = true;
    setMode("speaking");
    const greeting = "Hi! How can I connect your business with our platform?";
    const timer = window.setTimeout(() => {
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(greeting);
        utterance.rate = 1.04;
        utterance.pitch = 1.06;
        utterance.onend = () => setMode("idle");
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } else {
        setMode("idle");
      }
    }, 350);
    return () => { window.clearTimeout(timer); window.speechSynthesis?.cancel(); };
  }, []);

  // Optional signal from the OAuth callback page. The polling loop in
  // startConnect is the source of truth, so we don't act on it — we just
  // short-circuit the next status poll so the UI feels snappier.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string } | null;
      if (!data || typeof data !== "object") return;
      if (data.type !== "composio-callback") return;
      // No-op: the popup.closed poll will trigger the status check.
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
  const particleOptions = useMemo(() => ({ fullScreen: { enable: false }, fpsLimit: 60, detectRetina: true, particles: { number: { value: 48, density: { enable: true } }, color: { value: ["#2797ff","#8cdbff","#ffffff"] }, links: { enable: true, distance: 150, opacity: .16, color: "#68bfff" }, move: { enable: true, speed: .55, direction: "none", outModes: { default: "out" } }, opacity: { value: { min: .1, max: .55 } }, size: { value: { min: 1, max: 2.2 } } } }), []);
  const revealNode = useCallback((id: string) => {
    setRevealedNodeIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);
  const populateEntities = useCallback(() => {
    if (populateEntitiesRef.current) return;
    populateEntitiesRef.current = true;
    oauthCompleteRef.current = true;
    setOauthComplete(true);
    setStatus("Pulling recent activity from your stack…");

    const tools = onboardingToolsRef.current;
    if (!tools.length) return;

    revealTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
    revealTimeoutsRef.current = [];

    const entityStart = 250;
    tools.forEach((tool, serviceIndex) => {
      const seeds = seedData[tool];
      seeds.forEach((seed, entityIndex) => {
        const id = `${tool}-${seed.id}`;
        const timeoutId = window.setTimeout(() => {
          revealNode(id);
        }, entityStart + serviceIndex * 160 + entityIndex * 170);
        revealTimeoutsRef.current.push(timeoutId);
      });
    });

    const totalEntities = tools.reduce((sum, t) => sum + seedData[t].length, 0);
    const pullStatusId = window.setTimeout(() => {
      setStatus("Pulling recent activity from your services");
    }, entityStart + 100);
    revealTimeoutsRef.current.push(pullStatusId);

    const finalDelay = entityStart + tools.length * 160 + totalEntities * 170 + 350;
    const finalId = window.setTimeout(() => {
      setMode("speaking");
      setTranscript(`I connected ${tools.map((t) => toolCatalog[t].data.label).join(", ")}. Pulled recent activity from each — your business brain is ready to grow.`);
      setStatus("Business graph ready");
    }, finalDelay);
    revealTimeoutsRef.current.push(finalId);
  }, [revealNode]);

  const startConnect = useCallback(async () => {
    if (oauthInProgressRef.current) return;
    if (oauthCompleteRef.current) return;

    oauthInProgressRef.current = true;
    setConnectBusy(true);
    setConnectError(null);

    const attemptOAuth = async (tool: ToolKey): Promise<boolean> => {
      let popup: Window | null = null;
      let pollInterval: number | null = null;
      let timeoutId: number | null = null;
      let cancelled = false;

      try {
        const res = await fetch("/api/composio/connect-link", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tool }),
        });
        if (!res.ok) {
          const message = await res.text().catch(() => "");
          throw new Error(message || `Failed to create connect link (${res.status})`);
        }
        const linkData = (await res.json()) as { redirectUrl: string; connectedAccountId: string; tool: ToolKey };

        const accountId = linkData.connectedAccountId;
        setAccounts((prev) => {
          const without = prev.filter((a) => a.tool !== tool);
          const next = [...without, { tool, accountId, status: "PENDING" as AccountStatus }];
          accountsRef.current = next;
          return next;
        });

        popup = window.open(linkData.redirectUrl, "_blank", "width=520,height=720");
        if (!popup) {
          throw new Error("Popup blocked. Allow popups and try again.");
        }

        const closed = await new Promise<boolean>((resolve) => {
          timeoutId = window.setTimeout(() => {
            cancelled = true;
            try {
              if (popup && !popup.closed) popup.close();
            } catch {
              // ignore
            }
          }, 60_000);
          pollInterval = window.setInterval(() => {
            if (cancelled) {
              resolve(false);
              return;
            }
            if (!popup || popup.closed) {
              resolve(true);
            }
          }, 500);
        });
        if (pollInterval !== null) window.clearInterval(pollInterval);
        if (timeoutId !== null) window.clearTimeout(timeoutId);

        const statusRes = await fetch(`/api/composio/status?accountId=${encodeURIComponent(accountId)}`);
        if (!statusRes.ok) {
          throw new Error(`Status check failed (${statusRes.status})`);
        }
        const statusData = (await statusRes.json()) as { id: string; status: string; toolkit: string | null };
        const resolvedTool: ToolKey = (statusData.toolkit && TOOLKIT_SLUG_TO_KEY[statusData.toolkit]) || tool;

        if (statusData.status === "ACTIVE") {
          setAccounts((prev) => {
            const without = prev.filter((a) => a.tool !== resolvedTool);
            const next = [...without, { tool: resolvedTool, accountId: statusData.id, status: "ACTIVE" as AccountStatus }];
            accountsRef.current = next;
            return next;
          });
          return true;
        }

        setAccounts((prev) => {
          const without = prev.filter((a) => a.tool !== resolvedTool);
          const next = [...without, { tool: resolvedTool, accountId: statusData.id, status: "FAILED" as AccountStatus }];
          accountsRef.current = next;
          return next;
        });
        const label = labelFor[resolvedTool];
        setConnectError(
          cancelled
            ? `${label} sign-in timed out.`
            : statusData.status === "FAILED"
            ? `${label} connection failed.`
            : `${label} didn't complete (${statusData.status}).`
        );
        return false;
      } catch (err) {
        if (!cancelled) {
          setConnectError(err instanceof Error ? err.message : "Connection failed");
        }
        return false;
      } finally {
        if (pollInterval !== null) window.clearInterval(pollInterval);
        if (timeoutId !== null) window.clearTimeout(timeoutId);
      }
    };

    try {
      for (const tool of TOOL_KEYS) {
        const existing = accountsRef.current.find((a) => a.tool === tool);
        if (existing?.status === "ACTIVE") continue;
        await attemptOAuth(tool);
      }

      const allActive = TOOL_KEYS.every(
        (k) => accountsRef.current.find((a) => a.tool === k)?.status === "ACTIVE",
      );
      if (allActive) {
        populateEntities();
      }
    } finally {
      oauthInProgressRef.current = false;
      setConnectBusy(false);
    }
  }, [populateEntities]);

  const buildBusinessBrain = useCallback((tools: ToolKey[]) => {
    const current = onboardingToolsRef.current;
    const merged = [...new Set([...current, ...tools])];
    const newlyAdded = merged.filter((t) => !current.includes(t));
    if (!newlyAdded.length) return;

    setOnboardingTools(merged);
    setConnected(true);
    setMode("thinking");
    setStatus("Creating your AgentOS business brain");

    revealTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
    revealTimeoutsRef.current = [];

    const serviceStart = 250;
    const serviceStep = 520;
    newlyAdded.forEach((tool, i) => {
      const id = toolCatalog[tool].id;
      const timeoutId = window.setTimeout(() => {
        revealNode(id);
        setBurstingServices((prev) => {
          if (prev.has(tool)) return prev;
          const next = new Set(prev);
          next.add(tool);
          return next;
        });
        const burstId = window.setTimeout(() => {
          setBurstingServices((prev) => {
            if (!prev.has(tool)) return prev;
            const next = new Set(prev);
            next.delete(tool);
            return next;
          });
        }, 600);
        revealTimeoutsRef.current.push(burstId);
        setStatus(`${toolCatalog[tool].data.label} connected · mapping capability`);
      }, serviceStart + i * serviceStep);
      revealTimeoutsRef.current.push(timeoutId);
    });

    if (oauthCompleteRef.current) {
      // OAuth already done for an earlier batch — reveal entities for the new services too.
      const entityStart = serviceStart + newlyAdded.length * serviceStep + 200;
      newlyAdded.forEach((tool, serviceIndex) => {
        const seeds = seedData[tool];
        seeds.forEach((seed, entityIndex) => {
          const id = `${tool}-${seed.id}`;
          const timeoutId = window.setTimeout(() => {
            revealNode(id);
          }, entityStart + serviceIndex * 160 + entityIndex * 170);
          revealTimeoutsRef.current.push(timeoutId);
        });
      });

      const totalEntities = newlyAdded.reduce((sum, t) => sum + seedData[t].length, 0);
      const finalDelay = entityStart + newlyAdded.length * 160 + totalEntities * 170 + 350;
      const finalId = window.setTimeout(() => {
        setMode("speaking");
        setTranscript(`I connected ${merged.map((t) => toolCatalog[t].data.label).join(", ")}. Pulled recent activity from each — your business brain is ready to grow.`);
        setStatus("Business graph ready");
      }, finalDelay);
      revealTimeoutsRef.current.push(finalId);
    }
  }, [revealNode]);
  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    if (!publicKey || !assistantId) return;
    const vapi = new VapiConstructor(publicKey);
    vapiRef.current = vapi;
    vapi.on("call-start", () => {
      setCallActive(true);
      setMode("listening");
      setTranscript("Connected. I’m listening.");
      addTranscript("agent", "Connected. I’m listening.");
    });
    vapi.on("call-end", () => {
      setCallActive(false);
      setMode("idle");
      setTranscript("Hi! How can I connect your business with our platform?");
    });
    vapi.on("speech-start", () => setMode("speaking"));
    vapi.on("speech-end", () => setMode("listening"));
    vapi.on("message", (message: { type?: string; transcript?: string; role?: string; transcriptType?: string }) => {
      if (message.type !== "transcript" || !message.transcript) return;
      setTranscript(message.transcript);
      const userSpoke = message.role === "user";
      if (message.transcriptType === "final") {
        addTranscript(userSpoke ? "user" : "agent", message.transcript);
        if (userSpoke) buildBusinessBrain(detectTools(message.transcript));
      }
    });
    return () => {
      vapi.stop();
      vapiRef.current = null;
    };
  }, [addTranscript, buildBusinessBrain]);
  const askAcme = useCallback(() => {
    if (!connected) return buildBusinessBrain(["drive", "gmail"]);
    setMode("listening"); setTranscript("What happened with Acme this week?"); setStatus("Resolving Acme across your business graph");
    window.setTimeout(() => { setMode("thinking"); setTranscript("I found 3 connected updates across Drive, Gmail, and Calendar."); }, 900);
    window.setTimeout(() => { setMode("speaking"); setTranscript("Sarah requested revised pricing, Pricing v3 was uploaded yesterday, and your onboarding call is Monday."); }, 1900);
    window.setTimeout(() => setMode("idle"), 4700);
  }, [buildBusinessBrain, connected]);
  const endCall = useCallback(() => {
    vapiRef.current?.stop();
    addTranscript("agent", "Conversation ended. Ready for the next request when you are.");
  }, [addTranscript]);
  const startListening = useCallback(() => {
    if (connected) return askAcme();
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    if (vapiRef.current && assistantId && callActive) {
      vapiRef.current?.stop();
      setMode("idle");
      setTranscript("Hi! How can I connect your business with our platform?");
      return;
    }
    if (vapiRef.current && assistantId) {
      setCallActive(true);
      setMode("listening");
      setTranscript("Connecting to AgentOS…");
      vapiRef.current.start(assistantId);
      return;
    }
    const voiceWindow = window as typeof window & {
      SpeechRecognition?: new () => { continuous: boolean; interimResults: boolean; lang: string; start: () => void; onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void };
      webkitSpeechRecognition?: new () => { continuous: boolean; interimResults: boolean; lang: string; start: () => void; onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void };
    };
    const Recognition = voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setMode("listening");
      setTranscript("Listening…");
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = false; recognition.interimResults = false; recognition.lang = "en-US";
    setMode("listening"); setTranscript("Listening for a connection…"); setStatus("Listening…");
    recognition.onresult = (event) => {
      const spoken = event.results[0]?.[0]?.transcript ?? "";
      setTranscript(spoken);
      addTranscript("user", spoken);
      buildBusinessBrain(detectTools(spoken));
    };
    recognition.onerror = () => {
      setMode("listening");
      setTranscript("Listening…");
    };
    recognition.onend = () => setMode((current) => current === "listening" ? "listening" : current);
    recognition.start();
  }, [addTranscript, askAcme, buildBusinessBrain, callActive, connected, mode]);
  const activeAccountIds = useMemo(() => {
    const set = new Set<ToolKey>();
    for (const a of accounts) if (a.status === "ACTIVE") set.add(a.tool);
    return set;
  }, [accounts]);
  const allConnected = activeAccountIds.size >= TOOL_KEYS.length;
  const totalPossible = useMemo(
    () => 1 + onboardingTools.length + onboardingTools.reduce((sum, t) => sum + seedData[t].length, 0),
    [onboardingTools],
  );
  let nonBrainRevealed = 0;
  let revealedServicesCount = 0;
  for (const tool of onboardingTools) {
    if (revealedNodeIds.has(tool)) {
      nonBrainRevealed++;
      revealedServicesCount++;
    }
    for (const seed of seedData[tool]) {
      if (revealedNodeIds.has(`${tool}-${seed.id}`)) nonBrainRevealed++;
    }
  }
  const ringProgress = totalPossible > 1 ? Math.min(1, Math.max(0, nonBrainRevealed / (totalPossible - 1))) : 0;
  const ringCircumference = 2 * Math.PI * 70;
  const ringDashoffset = ringCircumference * (1 - ringProgress);
  const ringIsPulsing = ringProgress > 0 && ringProgress < 1;
  const activeGraphNodes = useMemo(
    () => [
      brainNode,
      {
        id: "brain-ring",
        type: "brainRing",
        position: { x: brainNode.position.x - 34, y: brainNode.position.y - 34 },
        data: { circumference: ringCircumference, dashoffset: ringDashoffset, isPulsing: ringIsPulsing },
        style: { pointerEvents: "none", zIndex: -1, opacity: ringProgress > 0 ? 1 : 0, transition: "opacity .6s ease" },
      } as Node,
      ...onboardingTools.flatMap((tool) => [toolCatalog[tool], ...buildEntityNodes(tool)]),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onboardingTools, revealedNodeIds.size, ringProgress, ringDashoffset, ringIsPulsing],
  );
  const visibleNodes = activeGraphNodes.filter((node) => revealedNodeIds.has(node.id));
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges: Edge[] = [];
  onboardingTools.forEach((tool) => {
    if (!visibleNodeIds.has(tool)) return;
    const isBursting = burstingServices.has(tool);
    const stroke = isBursting ? "#ffffff" : "#3198ff";
    visibleEdges.push({
      id: `edge-${tool}-brain`,
      source: tool,
      target: "brain",
      animated: true,
      style: { stroke, strokeWidth: isBursting ? 1.9 : 1.2, opacity: isBursting ? 1 : 0.72, transition: "stroke .55s ease, stroke-width .55s ease, opacity .55s ease" },
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 12, height: 12 },
    });
  });
  onboardingTools.forEach((tool) => {
    const seeds = seedData[tool];
    seeds.forEach((seed) => {
      const entityId = `${tool}-${seed.id}`;
      if (!visibleNodeIds.has(entityId) || !visibleNodeIds.has(tool)) return;
      visibleEdges.push({
        id: `edge-${entityId}-${tool}`,
        source: entityId,
        target: tool,
        animated: true,
        style: { stroke: "#3198ff", strokeWidth: 0.9, opacity: 0.45 },
      });
    });
  });
  if (!signedIn) return <PublicLanding />;
  return <ParticlesProvider init={loadSlim}><main className={`app-shell ${connected ? "is-connected" : ""}`}>
    <Particles id="ambient-network" className="ambient-network" options={particleOptions} />
    {connected && <header className="topbar"><div className="brand"><span className="brand-mark"><Sparkles size={15} /></span><span>agent<span>OS</span></span></div><div className="system-live"><i /> Business graph <span>·</span> assembling</div><button className="ghost-button" onClick={() => setConnected(false)}><Plus size={15} /> Add connection</button></header>}
    {connected && <aside className="connection-rail"><p>PLEASURE PIZZA STACK</p><button className="rail-app"><span className="mini-icon mail">M</span>Gmail</button><button className="rail-app"><span className="mini-icon drive">◆</span>Drive</button><button className="rail-app"><span className="mini-icon docs">D</span>Docs</button><button className="rail-app"><span className="mini-icon sheets">#</span>Sheets</button><button className="rail-app"><span className="mini-icon calendar">▣</span>Calendar</button><div className="rail-divider" /><div className="mcp-card"><span>MCP</span><strong>Ready for Qoder</strong><p>One secure business interface.</p><button>Copy endpoint <ChevronRight size={13} /></button></div></aside>}
    <section className="workspace">
      {connected ? <div className="graph-stage">
        {!allConnected && (
          <div className="connect-panel">
            <p className="connect-eyebrow">PLEASURE PIZZA STACK</p>
            <h2>Connect your Google services</h2>
            <ul className="connect-list">
              {TOOL_KEYS.map((k) => {
                const account = accounts.find((a) => a.tool === k);
                const isActive = account?.status === "ACTIVE";
                const isPending = account?.status === "PENDING";
                const isFailed = account?.status === "FAILED";
                return (
                  <li key={k} className={`${isActive ? "is-on" : ""} ${isFailed ? "is-failed" : ""}`}>
                    <span className={`mini-icon ${iconClassFor[k]}`}>{iconFor[k]}</span>
                    <span className="connect-label">{labelFor[k]}</span>
                    <CheckIcon filled={isActive} pending={isPending} />
                  </li>
                );
              })}
            </ul>
            <button
              className="connect-primary"
              onClick={() => { void startConnect(); }}
              disabled={connectBusy}
            >
              {connectBusy ? (
                <>
                  <span className="connect-spinner" />
                  Connecting…
                </>
              ) : accounts.some((a) => a.status === "FAILED") ? (
                "Retry failed connections"
              ) : (
                "Connect Pleasure Pizza stack"
              )}
            </button>
            {connectError && <p className="connect-error">{connectError}</p>}
            <p className="connect-hint">One Google sign-in. We'll pull the latest activity from each.</p>
          </div>
        )}
        <div className="graph-heading"><div><p>LIVE ORGANIZATION MAP</p><h1>Your business brain</h1></div><div className="graph-count"><strong>{nonBrainRevealed} / {Math.max(totalPossible - 1, 0)}</strong><span>nodes mapped · {revealedServicesCount} of {onboardingTools.length} services</span></div></div><ReactFlow nodes={visibleNodes} edges={visibleEdges} nodeTypes={nodeTypes} minZoom={0.4} maxZoom={1.2} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} proOptions={{ hideAttribution: true }}><Background color="#d8f3ff" gap={28} size={1} /><Controls showInteractive={false} /></ReactFlow><div className="graph-event"><span className="event-pulse" />{status}</div></div> : <div className="hero-stage"><button className={`launch-blue-orb ${mode}`} onClick={startListening} aria-label="Begin voice setup"><span /><span /></button><button className={`launch-mic ${callActive ? "is-live" : ""}`} onClick={startListening}><Mic size={20} /><span>{callActive ? "End conversation" : "Talk to AgentOS"}</span></button><div className="conversation-panel" ref={transcriptLogRef} role="log" aria-label="Conversation transcript">{transcriptLog.map((entry) => <p className={`conversation-line ${entry.role}`} key={entry.id}><span>{entry.role === "agent" ? "AgentOS" : "You"}</span>{entry.text}</p>)}{transcript !== transcriptLog.at(-1)?.text && <p className={`conversation-line live ${mode === "listening" ? "is-live" : ""}`}><span>{mode === "listening" ? "You" : "AgentOS"}</span>{transcript}</p>}</div></div>}
    </section>
    {connected && <section className="voice-console"><div className={`orb-wrap ${mode}`}><div className="orb-ring r1" /><div className="orb-ring r2" /><button className="voice-orb" onClick={startListening} aria-label="Start voice interaction"><span /><span /><span /></button></div><div className="voice-copy"><div className="voice-state">{mode === "listening" ? "Listening" : mode === "thinking" ? "Building context" : mode === "speaking" ? "AgentOS" : "Voice interface"}</div><p>{transcript}</p><div className="voice-actions"><button onClick={startListening}><Mic size={15} /> Ask about Acme</button><button onClick={() => { setMode("speaking"); setTranscript("Your AgentOS voice line is ready for the demo."); }}><Phone size={15} /> Test Vapi line</button>{callActive && <button className="end-call" onClick={endCall}><PhoneOff size={15} /> End conversation</button>}</div></div></section>}
  </main></ParticlesProvider>;
}

export default function Home() {
  return (
    <ReactFlowProvider>
      <HomeInner />
    </ReactFlowProvider>
  );
}
