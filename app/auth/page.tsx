"use client";

import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isSignup = mode === "signup";

  function completeSignIn() {
    window.localStorage.setItem("agentos-demo-session", "true");
    setSubmitted(true);
    window.setTimeout(() => window.location.assign("/"), 350);
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); completeSignIn(); }
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
      <div className="auth-card-heading"><h2 id="auth-title">{isSignup ? "Create an account" : "Welcome back"}</h2><p>{isSignup ? "Start building your business brain." : "Sign in to your workspace."}</p></div>
      <div className="auth-tabs" role="tablist" aria-label="Account action"><button className={isSignup ? "active" : ""} onClick={() => switchMode("signup")} role="tab" aria-selected={isSignup}>Sign up</button><button className={!isSignup ? "active" : ""} onClick={() => switchMode("signin")} role="tab" aria-selected={!isSignup}>Log in</button></div>
      <form onSubmit={submit}>
        {isSignup && <label>Full name<input id="name" name="name" autoComplete="name" placeholder="Enter your name" required /></label>}
        <label>Email<input id="email" name="email" type="email" autoComplete="email" placeholder="Enter your email" required /></label>
        <label>Password<div className="auth-input"><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} placeholder={isSignup ? "Create a password" : "Enter your password"} minLength={8} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div></label>
        {isSignup && <div className="auth-requirements"><span><Check size={14} /> At least 8 characters</span><span><Check size={14} /> One special character</span></div>}
        <button className="auth-blue-submit" type="submit">{isSignup ? "Get started" : "Log in"} <ArrowRight size={17} /></button>
        <button className="auth-google" type="button" onClick={completeSignIn}><b>G</b>{isSignup ? "Sign up with Google" : "Continue with Google"}</button>
        {submitted && <p className="auth-demo-message">You&apos;re signed in. Opening your workspace…</p>}
      </form>
    </section>
  </main>;
}
