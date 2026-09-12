"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods, GraphData, NodeObject, LinkObject } from "react-force-graph-2d";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import Vapi from "@vapi-ai/web";
import { ChevronRight, Mic, Phone, PhoneOff, Plus, Sparkles } from "lucide-react";
import { seedData, type ToolKey as SeedToolKey } from "@/lib/seed-data";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

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

const labelFor: Record<ToolKey, string> = { gmail: "Gmail", drive: "Drive", docs: "Docs", sheets: "Sheets", calendar: "Calendar" };
const VapiConstructor = ((Vapi as unknown as { default?: typeof Vapi }).default ?? Vapi) as unknown as new (publicKey: string) => Vapi;

// Per-service color tokens — match the existing radial layout in seed-data.ts.
const SERVICE_COLOR: Record<ToolKey, string> = {
  gmail: "#df5b57",
  drive: "#347bea",
  docs: "#8a4dd1",
  sheets: "#37aa85",
  calendar: "#e07a3a",
};

// Numerical masses used to derive node radii via the force-graph convention
// radius = nodeRelSize * sqrt(val / Math.PI). With nodeRelSize=4:
//   brain:   val=30  -> r ≈ 12
//   service: val=8   -> r ≈ 6
//   entity:  val=3   -> r ≈ 4
// Hidden nodes (not in revealedNodeIds) get val=0 → zero radius → invisible.
const NODE_VAL = { brain: 30, service: 8, entity: 3 };
const NODE_REL_SIZE = 4;

// Mix a hex color with white by `amount` (0 = original, 1 = pure white).
// Used to give each node a softer highlight at the top-left of its gradient.
const lightenHex = (hex: string, amount: number): string => {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const lerp = (c: number) => Math.round(c + (255 - c) * amount);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(lerp(r))}${toHex(lerp(g))}${toHex(lerp(b))}`;
};
const BRAIN_ID = "brain";
const AQUA = "#72f5df";
const LINK_COLOR_HIDDEN = "rgba(0,0,0,0)";
const LINK_COLOR = "rgba(49,152,255,0.55)";
const DIMMED_COLOR = "rgba(150,165,170,0.18)";

type GraphNode = {
  id: string;
  kind: "brain" | "service" | "entity";
  label: string;
  tool?: ToolKey;
  meta?: string;
  icon?: string;
  color: string;
  val: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
};

type GraphLink = {
  source: string;
  target: string;
  revealed: boolean;
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

export default function Home() {
  const [mode, setMode] = useState<Mode>("idle");
  const [callActive, setCallActive] = useState(false);
  const [connected, setConnected] = useState(false);
  const [onboardingTools, setOnboardingTools] = useState<ToolKey[]>([]);
  const [revealedNodeIds, setRevealedNodeIds] = useState<Set<string>>(new Set([BRAIN_ID]));
  const [transcript, setTranscript] = useState("Hi! How can I connect your business with our platform?");
  const [transcriptLog, setTranscriptLog] = useState<TranscriptEntry[]>([
    { id: "welcome", role: "agent", text: "Hi! How can I connect your business with our platform?" },
  ]);
  const [status, setStatus] = useState("Waiting for your first connection");
  const [accounts, setAccounts] = useState<AccountState[]>([]);
  const [oauthComplete, setOauthComplete] = useState(false);
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<{ id: string; x: number; y: number } | null>(null);
  const greetedRef = useRef(false);
  const vapiRef = useRef<Vapi | null>(null);
  const transcriptLogRef = useRef<HTMLDivElement | null>(null);
  const revealTimeoutsRef = useRef<number[]>([]);
  const onboardingToolsRef = useRef<ToolKey[]>([]);
  const oauthCompleteRef = useRef(false);
  const oauthInProgressRef = useRef(false);
  const populateEntitiesRef = useRef(false);
  const accountsRef = useRef<AccountState[]>([]);
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const [graphSize, setGraphSize] = useState<{ width: number; height: number }>({ width: 800, height: 600 });
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);
  useEffect(() => {
    onboardingToolsRef.current = onboardingTools;
  }, [onboardingTools]);
  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);
  useEffect(() => () => {
    revealTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
  }, []);
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (event.message?.includes("ResizeObserver loop completed with undelivered notifications")) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    };
    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
  }, []);

  // Track the canvas size so ForceGraph2D knows how big to render.
  useEffect(() => {
    const node = graphContainerRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      setGraphSize({ width, height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [connected]);

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

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string } | null;
      if (!data || typeof data !== "object") return;
      if (data.type !== "composio-callback") return;
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
      setTranscript(`I connected ${tools.map((t) => labelFor[t]).join(", ")}. Pulled recent activity from each — your business brain is ready to grow.`);
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
      const pendingTools = onboardingToolsRef.current.filter((tool) => {
        const existing = accountsRef.current.find((a) => a.tool === tool);
        return existing?.status !== "ACTIVE";
      });
      for (const tool of pendingTools) {
        await attemptOAuth(tool);
      }

      const allActive = pendingTools.every(
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
      const id = tool;
      const timeoutId = window.setTimeout(() => {
        revealNode(id);
        setStatus(`${labelFor[tool]} connected · mapping capability`);
      }, serviceStart + i * serviceStep);
      revealTimeoutsRef.current.push(timeoutId);
    });

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
      setTranscript(
        `I mapped ${merged.map((t) => labelFor[t]).join(", ")}. Pleasure Pizza's brain has ${totalEntities} known touchpoints and is ready to grow.`,
      );
      setStatus("Business graph ready");
    }, finalDelay);
    revealTimeoutsRef.current.push(finalId);
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
  const allConnected = activeAccountIds.size >= onboardingTools.length && onboardingTools.length > 0;
  const totalPossible = useMemo(
    () => 1 + onboardingTools.length + onboardingTools.reduce((sum, t) => sum + seedData[t].length, 0),
    [onboardingTools],
  );

  // Progress text — replaces the visual brain-ring progress indicator.
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

  // ---- Build the graph data --------------------------------------------------
  const graphData = useMemo<{ nodes: GraphNode[]; links: GraphLink[] }>(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    nodes.push({
      id: BRAIN_ID,
      kind: "brain",
      label: "AgentOS",
      meta: "Business brain",
      color: AQUA,
      val: NODE_VAL.brain,
      // Pin the brain to the canvas center so it always reads as the focal point.
      fx: 0,
      fy: 0,
    });

    for (const tool of onboardingTools) {
      const serviceRevealed = revealedNodeIds.has(tool);
      nodes.push({
        id: tool,
        kind: "service",
        label: labelFor[tool],
        tool,
        color: SERVICE_COLOR[tool],
        val: serviceRevealed ? NODE_VAL.service : 0,
      });
      links.push({
        source: tool,
        target: BRAIN_ID,
        revealed: serviceRevealed,
      });

      for (const seed of seedData[tool]) {
        const entityId = `${tool}-${seed.id}`;
        const entityRevealed = revealedNodeIds.has(entityId);
        nodes.push({
          id: entityId,
          kind: "entity",
          label: seed.label,
          tool,
          meta: seed.meta,
          color: SERVICE_COLOR[tool],
          val: entityRevealed ? NODE_VAL.entity : 0,
        });
        links.push({
          source: entityId,
          target: tool,
          revealed: serviceRevealed && entityRevealed,
        });
      }
    }
    return { nodes, links };
    // Re-build on every reveal so force-graph diffs and re-heats the sim.
  }, [onboardingTools, revealedNodeIds]);

  // 1-hop neighbor set for the hovered node.
  const hoverNeighbors = useMemo(() => {
    if (!hoveredNodeId) return null;
    const set = new Set<string>([hoveredNodeId]);
    for (const link of graphData.links) {
      const sourceId = typeof link.source === "string" ? link.source : (link.source as { id?: string })?.id ?? "";
      const targetId = typeof link.target === "string" ? link.target : (link.target as { id?: string })?.id ?? "";
      if (sourceId === hoveredNodeId) set.add(targetId);
      if (targetId === hoveredNodeId) set.add(sourceId);
    }
    return set;
  }, [hoveredNodeId, graphData.links]);

  const nodeById = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const n of graphData.nodes) map.set(n.id, n);
    return map;
  }, [graphData.nodes]);

  const selectedNodeData = selectedNode ? nodeById.get(selectedNode.id) ?? null : null;

  // ---- Force-graph prop callbacks -------------------------------------------
  const nodeColor = useCallback(
    (raw: NodeObject<GraphNode>) => {
      const node = raw as GraphNode;
      if (node.val === 0) return "rgba(0,0,0,0)";
      if (!hoverNeighbors) return node.color;
      return hoverNeighbors.has(node.id) ? node.color : DIMMED_COLOR;
    },
    [hoverNeighbors],
  );

  const nodeRelSize = NODE_REL_SIZE;

  // Service icon glyphs that get rendered inside service nodes.
  const serviceIconFor: Record<ToolKey, string> = {
    gmail: "M",
    drive: "◆",
    docs: "D",
    sheets: "#",
    calendar: "▣",
  };

  // Custom node drawing — gradient-filled circles, glow halo on the brain,
  // service-icon glyphs inside service nodes, smooth scale-up on hover.
  const nodeCanvasObject = useCallback(
    (raw: NodeObject<GraphNode>, ctx: CanvasRenderingContext2D) => {
      const node = raw as GraphNode;
      if (node.val === 0 || node.x === undefined || node.y === undefined) return;
      const baseRadius = nodeRelSize * Math.sqrt(node.val / Math.PI);
      const isHovered = hoveredNodeId === node.id;
      const dimmed = !!hoverNeighbors && !hoverNeighbors.has(node.id);
      const r = baseRadius * (isHovered ? 1.18 : 1);
      ctx.save();

      if (dimmed) ctx.globalAlpha = 0.22;

      // Brain gets an extra soft halo so it reads as the focal point.
      if (node.kind === "brain") {
        const halo = ctx.createRadialGradient(node.x, node.y, r * 0.6, node.x, node.y, r * 2.1);
        halo.addColorStop(0, "rgba(114,245,223,0.55)");
        halo.addColorStop(0.6, "rgba(114,245,223,0.18)");
        halo.addColorStop(1, "rgba(114,245,223,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 2.1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Radial gradient body — brighter at the top-left, deeper at the bottom-right.
      const grad = ctx.createRadialGradient(
        node.x - r * 0.35,
        node.y - r * 0.35,
        r * 0.15,
        node.x,
        node.y,
        r,
      );
      grad.addColorStop(0, lightenHex(node.color, 0.35));
      grad.addColorStop(1, node.color);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Soft outer ring on services + brain for a "premium" feel.
      if (node.kind !== "entity") {
        ctx.strokeStyle = isHovered ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.32)";
        ctx.lineWidth = isHovered ? 1.6 : 1;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 1.2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Glyph inside the node — service icon or brain spark.
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (node.kind === "brain") {
        ctx.font = `600 ${Math.round(r * 0.85)}px ui-sans-serif, system-ui`;
        ctx.fillText("✦", node.x, node.y + 1);
      } else if (node.kind === "service" && node.tool) {
        ctx.font = `800 ${Math.round(r * 0.7)}px ui-monospace, monospace`;
        ctx.fillText(serviceIconFor[node.tool], node.x, node.y + 1);
      }

      ctx.restore();
    },
    [hoveredNodeId, hoverNeighbors, nodeRelSize],
  );

  // We replace the default rendering, so we also have to provide a
  // pointer-area paint function so click + hover detection still works.
  const nodePointerAreaPaint = useCallback(
    (raw: NodeObject<GraphNode>, color: string, ctx: CanvasRenderingContext2D) => {
      const node = raw as GraphNode;
      if (node.val === 0 || node.x === undefined || node.y === undefined) return;
      const r = nodeRelSize * Math.sqrt(node.val / Math.PI);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 2, 0, Math.PI * 2);
      ctx.fill();
    },
    [nodeRelSize],
  );

  const linkColor = useCallback(
    (raw: LinkObject<GraphNode, GraphLink>) => {
      const link = raw as GraphLink;
      if (!link.revealed) return LINK_COLOR_HIDDEN;
      if (!hoverNeighbors) return LINK_COLOR;
      const sourceId = typeof link.source === "string" ? link.source : (link.source as { id?: string })?.id ?? "";
      const targetId = typeof link.target === "string" ? link.target : (link.target as { id?: string })?.id ?? "";
      const inSet = hoverNeighbors.has(sourceId) || hoverNeighbors.has(targetId);
      return inSet ? LINK_COLOR : "rgba(49,152,255,0.12)";
    },
    [hoverNeighbors],
  );

  const linkWidth = useCallback(
    (raw: LinkObject<GraphNode, GraphLink>) => {
      const link = raw as GraphLink;
      if (!link.revealed) return 0;
      if (!hoverNeighbors) return 1;
      const sourceId = typeof link.source === "string" ? link.source : (link.source as { id?: string })?.id ?? "";
      const targetId = typeof link.target === "string" ? link.target : (link.target as { id?: string })?.id ?? "";
      const inSet = hoverNeighbors.has(sourceId) || hoverNeighbors.has(targetId);
      return inSet ? 1.2 : 0.5;
    },
    [hoverNeighbors],
  );

  const linkDirectionalParticles = useCallback(
    (raw: LinkObject<GraphNode, GraphLink>) => {
      const link = raw as GraphLink;
      if (!link.revealed) return 0;
      // Slightly more particles on brain↔service links to highlight them.
      return link.target === BRAIN_ID || link.source === BRAIN_ID ? 2 : 1;
    },
    [],
  );

  const linkDirectionalParticleSpeed = useCallback(() => 0.006, []);
  const linkDirectionalParticleWidth = useCallback(() => 1.6, []);
  const linkDirectionalParticleColor = useCallback(() => AQUA, []);

  const handleNodeClick = useCallback(
    (node: NodeObject<GraphNode>, event: MouseEvent) => {
      const typed = node as GraphNode;
      if (typed.val === 0) return;
      // Translate viewport coordinates into the graph-stage coordinate space
      // (the overlay lives inside graph-stage, which is positioned 245px in
      // from the left of the workspace).
      const rect = graphContainerRef.current?.getBoundingClientRect();
      const x = rect ? (event.clientX ?? 0) - rect.left : (event.offsetX ?? 0);
      const y = rect ? (event.clientY ?? 0) - rect.top : (event.offsetY ?? 0);
      setSelectedNode((current) =>
        current && current.id === typed.id ? null : { id: typed.id, x, y },
      );
    },
    [],
  );

  const handleNodeHover = useCallback((node: NodeObject<GraphNode> | null) => {
    setHoveredNodeId(node ? (node as GraphNode).id : null);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return <ParticlesProvider init={loadSlim}><main className={`app-shell ${connected ? "is-connected" : ""}`}>
    <Particles id="ambient-network" className="ambient-network" options={particleOptions} />
    {connected && <header className="topbar"><div className="brand"><span className="brand-mark"><Sparkles size={15} /></span><span>agent<span>OS</span></span></div><div className="system-live"><i /> Business graph <span>·</span> assembling</div><button className="ghost-button" onClick={() => setConnected(false)}><Plus size={15} /> Add connection</button></header>}
    {connected && <aside className="connection-rail"><p>PLEASURE PIZZA STACK</p><button className="rail-app"><span className="mini-icon mail">M</span>Gmail</button><button className="rail-app"><span className="mini-icon drive">◆</span>Drive</button><button className="rail-app"><span className="mini-icon docs">D</span>Docs</button><button className="rail-app"><span className="mini-icon sheets">#</span>Sheets</button><button className="rail-app"><span className="mini-icon calendar">▣</span>Calendar</button><div className="rail-divider" /><div className="mcp-card"><span>MCP</span><strong>Ready for Qoder</strong><p>One secure business interface.</p><button>Copy endpoint <ChevronRight size={13} /></button></div></aside>}
    <section className="workspace">
      {connected ? <div className="graph-stage">
        <div className="graph-heading"><div><p>LIVE ORGANIZATION MAP</p><h1>Your business brain</h1></div><div className="graph-count"><strong>{nonBrainRevealed} / {Math.max(totalPossible - 1, 0)}</strong><span>nodes mapped · {revealedServicesCount} of {onboardingTools.length} services</span></div></div><button className="sync-pill" onClick={() => { void startConnect(); }} disabled={connectBusy}>{connectBusy ? "Syncing…" : "Sync live data"}</button>
        <div ref={graphContainerRef} className="graph-canvas">
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData as unknown as GraphData<GraphNode, GraphLink>}
            width={graphSize.width}
            height={graphSize.height}
            backgroundColor="rgba(0,0,0,0)"
            nodeRelSize={nodeRelSize}
            nodeVal={(n) => (n as GraphNode).val}
            nodeColor={nodeColor}
            nodeCanvasObject={nodeCanvasObject}
            nodeCanvasObjectMode={() => "replace"}
            nodePointerAreaPaint={nodePointerAreaPaint}
            nodeLabel={(n) => {
              const node = n as GraphNode;
              if (node.val === 0) return "";
              return `${node.label}${node.meta ? ` — ${node.meta}` : ""}`;
            }}
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkDirectionalParticles={linkDirectionalParticles}
            linkDirectionalParticleSpeed={linkDirectionalParticleSpeed}
            linkDirectionalParticleWidth={linkDirectionalParticleWidth}
            linkDirectionalParticleColor={linkDirectionalParticleColor}
            d3AlphaDecay={0.025}
            d3VelocityDecay={0.4}
            cooldownTicks={100}
            warmupTicks={30}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            onBackgroundClick={handleBackgroundClick}
          />
        </div>
        {selectedNode && selectedNodeData && (
          <div
            className="graph-node-overlay"
            style={{ left: Math.min(selectedNode.x + 14, graphSize.width - 240), top: Math.min(selectedNode.y + 14, graphSize.height - 130) }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className={`graph-node-overlay-kind kind-${selectedNodeData.kind}`}>{selectedNodeData.kind}</span>
            <strong>{selectedNodeData.label}</strong>
            {selectedNodeData.tool && <span className="graph-node-overlay-source">{labelFor[selectedNodeData.tool]}</span>}
            {selectedNodeData.meta && <span className="graph-node-overlay-meta">{selectedNodeData.meta}</span>}
          </div>
        )}
        <div className="graph-event"><span className="event-pulse" />{status}</div></div> : <div className="hero-stage"><button className={`launch-blue-orb ${mode}`} onClick={startListening} aria-label="Begin voice setup"><span /><span /></button><button className={`launch-mic ${callActive ? "is-live" : ""}`} onClick={startListening}><Mic size={20} /><span>{callActive ? "End conversation" : "Talk to AgentOS"}</span></button><div className="conversation-panel" ref={transcriptLogRef} role="log" aria-label="Conversation transcript">{transcriptLog.map((entry) => <p className={`conversation-line ${entry.role}`} key={entry.id}><span>{entry.role === "agent" ? "AgentOS" : "You"}</span>{entry.text}</p>)}{transcript !== transcriptLog.at(-1)?.text && <p className={`conversation-line live ${mode === "listening" ? "is-live" : ""}`}><span>{mode === "listening" ? "You" : "AgentOS"}</span>{transcript}</p>}</div></div>}
    </section>
    {connected && <section className="voice-console"><div className={`orb-wrap ${mode}`}><div className="orb-ring r1" /><div className="orb-ring r2" /><button className="voice-orb" onClick={startListening} aria-label="Start voice interaction"><span /><span /><span /></button></div><div className="voice-copy"><div className="voice-state">{mode === "listening" ? "Listening" : mode === "thinking" ? "Building context" : mode === "speaking" ? "AgentOS" : "Voice interface"}</div><p>{transcript}</p><div className="voice-actions"><button onClick={startListening}><Mic size={15} /> Ask about Acme</button><button onClick={() => { setMode("speaking"); setTranscript("Your AgentOS voice line is ready for the demo."); }}><Phone size={15} /> Test Vapi line</button>{callActive && <button className="end-call" onClick={endCall}><PhoneOff size={15} /> End conversation</button>}</div></div></section>}
  </main></ParticlesProvider>;
}