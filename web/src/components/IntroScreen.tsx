import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { SOURCE_DEFS } from "../data/demo";
import type { SourceKind } from "../data/demo";
import { Brain } from "./Brain";
import { MicIcon, SendIcon, SourceIcon } from "./Icons";
import { Button } from "./ui";

interface SpeechResult {
  0: { transcript: string };
  isFinal: boolean;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechCtor = new () => SpeechRecognitionLike;

function speechCtor(): SpeechCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function parseSources(text: string): SourceKind[] {
  const lower = text.toLowerCase();
  return SOURCE_DEFS.filter(
    (s) => lower.includes(s.label.toLowerCase()) || lower.includes(s.kind),
  ).map((s) => s.kind);
}

interface IntroScreenProps {
  onStart: (kinds: SourceKind[]) => void;
}

export function IntroScreen({ onStart }: IntroScreenProps) {
  const [value, setValue] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const submit = (text: string) => {
    const kinds = parseSources(text);
    if (kinds.length === 0) {
      setNotice("This demo can connect Google Drive, Gmail or Google Calendar.");
      return;
    }
    onStart(kinds);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(value);
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = speechCtor();
    if (!Ctor) {
      setNotice("Voice input is not available in this browser — type your request instead.");
      inputRef.current?.focus();
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0].transcript ?? "";
      setValue(transcript);
      setListening(false);
      submit(transcript);
    };
    recognition.onerror = () => {
      setListening(false);
      setNotice("Microphone unavailable — type your request instead.");
      inputRef.current?.focus();
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setNotice(null);
    setListening(true);
    recognition.start();
  };

  return (
    <main className="intro">
      <div className="intro__inner">
        <div className="intro__brain">
          <Brain size={168} state={listening ? "listening" : "idle"} />
        </div>

        <h1 className="intro__title">Connect your business once.</h1>
        <p className="intro__sub">
          AgentOS links your tools and knowledge into a semantic business graph, then exposes the
          whole company through one command layer — for people, scripts and AI agents.
        </p>

        <form className="intro__prompt" onSubmit={onSubmit}>
          <span className="intro__prompt-label" id="connect-prompt">
            What would you like to connect?
          </span>
          <div className="intro__field">
            <input
              ref={inputRef}
              className="intro__input"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setNotice(null);
              }}
              placeholder='Try “Connect Google Drive and Gmail”'
              aria-labelledby="connect-prompt"
              autoComplete="off"
            />
            <button
              type="button"
              className={`voice-btn${listening ? " voice-btn--live" : ""}`}
              onClick={toggleVoice}
              aria-pressed={listening}
              aria-label={listening ? "Stop listening" : "Connect by voice"}
            >
              <MicIcon size={18} />
            </button>
            <Button type="submit" variant="primary" icon={<SendIcon size={16} />}>
              Connect
            </Button>
          </div>
          <p className="intro__notice" role="status">
            {notice ?? ""}
          </p>
        </form>

        <div className="intro__chips" aria-label="Quick connect">
          {SOURCE_DEFS.map((s) => (
            <button key={s.kind} type="button" className="chip" onClick={() => onStart([s.kind])}>
              <SourceIcon kind={s.kind} size={16} />
              {s.label}
            </button>
          ))}
        </div>

        <p className="intro__footer">
          B.E.L.L.E × Qoder × Neo4j AI Hackathon ·{" "}
          <a href="https://github.com/nxndxa/agentos" target="_blank" rel="noreferrer">
            source on GitHub
          </a>
        </p>
      </div>
    </main>
  );
}
