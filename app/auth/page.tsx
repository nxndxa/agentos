"use client";

import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isSignup = mode === "signup";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem("agentos-demo-session", "true");
    setSubmitted(true);
    window.setTimeout(() => window.location.assign("/"), 350);
  }
  function switchMode(next: "signin" | "signup") { setMode(next); setSubmitted(false); }

  return <main className={`auth-blue-shell ${isSignup ? "is-signup" : "is-signin"}`}>
    <a className="auth-back" href="/" aria-label="Back to AgentOS voice onboarding"><ArrowLeft size={16} /> Back to AgentOS</a>
    <section className="auth-intro" aria-label="AgentOS introduction">
      <div className="auth-brand"><span><Sparkles size={17} /></span>agentOS</div>
      <div className="auth-blue-orb" aria-hidden="true"><i /><i /><i /></div>
      <p className="auth-overline">ONE COMPANY · ONE CLI · ANY AGENT</p>
      <h1>Everything your agent needs, connected in one place.</h1>
    </section>
    <section className="auth-blue-card" aria-labelledby="auth-title">
      <div className="auth-tabs" role="tablist" aria-label="Account action"><button className={!isSignup ? "active" : ""} onClick={() => switchMode("signin")} role="tab" aria-selected={!isSignup}>Sign in</button><button className={isSignup ? "active" : ""} onClick={() => switchMode("signup")} role="tab" aria-selected={isSignup}>Create account</button></div>
      <div className="auth-card-heading"><h2 id="auth-title">{isSignup ? "Create account" : "Sign in"}</h2></div>
      <form onSubmit={submit}>
        {isSignup && <><label className="sr-only" htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" placeholder="Full name" required /></>}
        <label className="sr-only" htmlFor="email">Email address</label><div className="auth-input"><Mail size={16} /><input id="email" name="email" type="email" autoComplete="email" placeholder="Email address" required /></div>
        <label className="sr-only" htmlFor="password">Password</label><div className="auth-input"><LockKeyhole size={16} /><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} placeholder="Password" minLength={8} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
        <button className="auth-blue-submit" type="submit">{isSignup ? "Create workspace" : "Sign in"} <ArrowRight size={17} /></button>
        {submitted && <p className="auth-demo-message">You&apos;re signed in. Opening your workspace…</p>}
      </form>
    </section>
  </main>;
}
