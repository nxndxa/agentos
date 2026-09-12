"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import Vapi from "@vapi-ai/web";
import { Check, ChevronRight, Mic, Phone, Plus, Sparkles } from "lucide-react";

type Mode = "idle" | "listening" | "thinking" | "speaking";
type TranscriptEntry = { id: string; role: "agent" | "user"; text: string };
type ToolKey = "drive" | "gmail" | "slack" | "calendar" | "notion" | "github";
const VapiConstructor = ((Vapi as unknown as { default?: typeof Vapi }).default ?? Vapi) as unknown as new (publicKey: string) => Vapi;
const brainNode: Node = { id: "brain", type: "brain", position: { x: 430, y: 260 }, data: { label: "AgentOS", detail: "Business brain" } };
const toolCatalog: Record<ToolKey, Node> = {
  drive: { id: "drive", type: "service", position: { x: 70, y: 70 }, data: { label: "Google Drive", icon: "◆", color: "blue" } },
  gmail: { id: "gmail", type: "service", position: { x: 88, y: 430 }, data: { label: "Gmail", icon: "M", color: "red" } },
  slack: { id: "slack", type: "service", position: { x: 760, y: 70 }, data: { label: "Slack", icon: "S", color: "violet" } },
  calendar: { id: "calendar", type: "service", position: { x: 770, y: 430 }, data: { label: "Calendar", icon: "▣", color: "green" } },
  notion: { id: "notion", type: "service", position: { x: 390, y: 600 }, data: { label: "Notion", icon: "N", color: "black" } },
  github: { id: "github", type: "service", position: { x: 670, y: 600 }, data: { label: "GitHub", icon: "G", color: "black" } },
};
const detectTools = (text: string): ToolKey[] => {
  const lower = text.toLowerCase();
  return (Object.keys(toolCatalog) as ToolKey[]).filter((tool) => {
    const terms: Record<ToolKey, string[]> = { drive: ["drive", "google docs"], gmail: ["gmail", "email"], slack: ["slack"], calendar: ["calendar"], notion: ["notion"], github: ["github"] };
    return terms[tool].some((term) => lower.includes(term));
  });
};

function ServiceNode({ data }: { data: { label: string; icon: string; color: string } }) { return <div className="graph-node service-node"><Handle type="source" position={Position.Right} /><span className={`service-icon ${data.color}`}>{data.icon}</span><span>{data.label}</span><Handle type="target" position={Position.Bottom} /></div>; }
function EntityNode({ data }: { data: { label: string; kind: string } }) { return <div className="graph-node entity-node"><Handle type="target" position={Position.Top} /><span className="entity-kind">{data.kind}</span><strong>{data.label}</strong><Handle type="source" position={Position.Left} /></div>; }
function BrainNode({ data }: { data: { label: string; detail: string } }) { return <div className="brain-node"><Handle type="target" position={Position.Left} /><div className="brain-core"><span className="brain-spark">✦</span></div><strong>{data.label}</strong><span>{data.detail}</span><Handle type="source" position={Position.Right} /></div>; }
const nodeTypes = { service: ServiceNode, entity: EntityNode, brain: BrainNode };

export default function Home() {
  const [mode, setMode] = useState<Mode>("idle");
  const [callActive, setCallActive] = useState(false);
  const [connected, setConnected] = useState(false);
  const [onboardingTools, setOnboardingTools] = useState<ToolKey[]>([]);
  const [visibleNodeCount, setVisibleNodeCount] = useState(0);
  const [transcript, setTranscript] = useState("Hey, what can I do for you?");
  const [transcriptLog, setTranscriptLog] = useState<TranscriptEntry[]>([
    { id: "welcome", role: "agent", text: "Hey, what can I do for you?" },
  ]);
  const [status, setStatus] = useState("Waiting for your first connection");
  const greetedRef = useRef(false);
  const vapiRef = useRef<Vapi | null>(null);
  const transcriptLogRef = useRef<HTMLDivElement | null>(null);
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
    const greeting = "Hey, what can I do for you?";
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
  const particleOptions = useMemo(() => ({ fullScreen: { enable: false }, fpsLimit: 60, detectRetina: true, particles: { number: { value: 48, density: { enable: true } }, color: { value: ["#2797ff","#8cdbff","#ffffff"] }, links: { enable: true, distance: 150, opacity: .16, color: "#68bfff" }, move: { enable: true, speed: .55, direction: "none", outModes: { default: "out" } }, opacity: { value: { min: .1, max: .55 } }, size: { value: { min: 1, max: 2.2 } } } }), []);
  const buildBusinessBrain = useCallback((tools: ToolKey[]) => {
    const uniqueTools = [...new Set(tools)];
    if (!uniqueTools.length) return;
    setOnboardingTools(uniqueTools);
    setConnected(true);
    setMode("thinking");
    setVisibleNodeCount(1);
    setStatus("Creating your AgentOS business brain");
    uniqueTools.forEach((tool, index) => {
      window.setTimeout(() => {
        setVisibleNodeCount(index + 2);
        setStatus(String(toolCatalog[tool].data.label) + " connected · mapping capability");
      }, 550 + index * 620);
    });
    window.setTimeout(() => {
      setMode("speaking");
      setTranscript("I connected " + uniqueTools.map((tool) => toolCatalog[tool].data.label).join(", ") + ". Your business brain is ready to grow.");
      setStatus("Business graph ready");
    }, 850 + uniqueTools.length * 620);
  }, []);
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
      setTranscript("Hey, what can I do for you?");
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
  const startListening = useCallback(() => {
    if (connected) return askAcme();
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    if (vapiRef.current && assistantId && callActive) {
      vapiRef.current?.stop();
      setMode("idle");
      setTranscript("Hey, what can I do for you?");
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
  const activeGraphNodes = [brainNode, ...onboardingTools.map((tool) => toolCatalog[tool])];
  const visibleNodes = activeGraphNodes.slice(0, visibleNodeCount);
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges: Edge[] = visibleNodes.filter((node) => node.id !== "brain").map((node, index) => ({ id: "edge-" + index, source: node.id, target: "brain", animated: true, style: { stroke: "#3198ff", strokeWidth: 1.2, opacity: .72 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#3198ff", width: 12, height: 12 } })).filter((edge) => visibleNodeIds.has(edge.source));
  return <ParticlesProvider init={loadSlim}><main className={`app-shell ${connected ? "is-connected" : ""}`}>
    <Particles id="ambient-network" className="ambient-network" options={particleOptions} />
    {connected && <header className="topbar"><div className="brand"><span className="brand-mark"><Sparkles size={15} /></span><span>agent<span>OS</span></span></div><div className="system-live"><i /> Business graph <span>·</span> assembling</div><button className="ghost-button" onClick={() => setConnected(false)}><Plus size={15} /> Add connection</button></header>}
    {connected && <aside className="connection-rail"><p>CONNECTED SYSTEMS</p><button className="rail-app active"><span className="mini-icon drive">◆</span>Google Drive<Check size={14} /></button><button className="rail-app active"><span className="mini-icon mail">M</span>Gmail<Check size={14} /></button><button className="rail-app"><span className="mini-icon calendar">▣</span>Calendar<span className="soon">soon</span></button><div className="rail-divider" /><button className="rail-app add"><Plus size={14} /> Connect another tool</button><div className="mcp-card"><span>MCP</span><strong>Ready for Qoder</strong><p>One secure business interface.</p><button>Copy endpoint <ChevronRight size={13} /></button></div></aside>}
    <section className="workspace">
      {connected ? <div className="graph-stage"><div className="graph-heading"><div><p>LIVE ORGANIZATION MAP</p><h1>Your business brain</h1></div><div className="graph-count"><strong>{Math.max(0, visibleNodeCount - 1)}</strong><span>tools connected</span></div></div><ReactFlow nodes={visibleNodes} edges={visibleEdges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: .26 }} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} proOptions={{ hideAttribution: true }}><Background color="#d8f3ff" gap={28} size={1} /><Controls showInteractive={false} /></ReactFlow><div className="graph-event"><span className="event-pulse" />{status}</div></div> : <div className="hero-stage"><button className={`launch-blue-orb ${mode}`} onClick={startListening} aria-label="Begin voice setup"><span /><span /></button><button className={`launch-mic ${callActive ? "is-live" : ""}`} onClick={startListening}><Mic size={20} /><span>{callActive ? "End conversation" : "Talk to AgentOS"}</span></button><div className="conversation-panel" ref={transcriptLogRef} role="log" aria-label="Conversation transcript">{transcriptLog.map((entry) => <p className={`conversation-line ${entry.role}`} key={entry.id}><span>{entry.role === "agent" ? "AgentOS" : "You"}</span>{entry.text}</p>)}{transcript !== transcriptLog.at(-1)?.text && <p className={`conversation-line live ${mode === "listening" ? "is-live" : ""}`}><span>{mode === "listening" ? "You" : "AgentOS"}</span>{transcript}</p>}</div></div>}
    </section>
    {connected && <section className="voice-console"><div className={`orb-wrap ${mode}`}><div className="orb-ring r1" /><div className="orb-ring r2" /><button className="voice-orb" onClick={startListening} aria-label="Start voice interaction"><span /><span /><span /></button></div><div className="voice-copy"><div className="voice-state">{mode === "listening" ? "Listening" : mode === "thinking" ? "Building context" : mode === "speaking" ? "AgentOS" : "Voice interface"}</div><p>{transcript}</p><div className="voice-actions"><button onClick={startListening}><Mic size={15} /> Ask about Acme</button><button onClick={() => { setMode("speaking"); setTranscript("Your AgentOS voice line is ready for the demo."); }}><Phone size={15} /> Test Vapi line</button></div></div></section>}
  </main></ParticlesProvider>;
}
