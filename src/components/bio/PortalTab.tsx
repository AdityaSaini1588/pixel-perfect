import { useCallback, useState } from "react";
import { FileText, GraduationCap, KeyRound, Info, LogOut, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { PRESETS, riskTone, useBio, useKeystrokes } from "@/lib/bioauth";
import { Dot, Panel, Pill } from "./ui";

export function PortalTab() {
  const { session } = useBio();
  return session ? <Dashboard /> : <AuthView />;
}

function AuthView() {
  const bio = useBio();
  const [username, setUsername] = useState("student");
  const [password, setPassword] = useState("SecurePass123!");
  const [msg, setMsg] = useState<{ tone: "safe" | "warn" | "danger" | "neutral"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const onSample = useCallback((s: { dwell: number; flight: number }) => bio.setLive({ dwell: s.dwell, flight: s.flight }), [bio.setLive]);
  const ks = useKeystrokes(onSample);

  const badge =
    bio.preset === "enrolling" ? "⏳ Enrolling (1/5 Samples)" : bio.preset === "custom" ? "🎯 Calibrated Personal Baseline" : PRESETS[bio.preset].label;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    if (username !== "student" || password !== "SecurePass123!") {
      setMsg({ tone: "danger", text: "Invalid credentials. Try student / SecurePass123!" });
      return;
    }
    setBusy(true);
    setMsg({ tone: "neutral", text: "Analyzing behavioral signature…" });
    setTimeout(() => {
      setBusy(false);
      if (!bio.consent) {
        bio.addLog({ identity: username, event: "LOGIN", mode: bio.mode, risk: 45, decision: "STEP_UP", diagnostic: "Biometrics opted out" });
        setMsg({ tone: "warn", text: "Behavioral analysis disabled — a passcode is required." });
        bio.setModal("stepup");
        return;
      }
      const { risk, factors } = bio.evaluate("LOGIN", username);
      if (risk < 35) {
        bio.addLog({ identity: username, event: "LOGIN", mode: bio.mode, risk, decision: "ALLOW", diagnostic: "Baseline match" });
        setMsg({ tone: "safe", text: `Identity verified · Risk ${risk}%` });
        setTimeout(() => bio.setSession(username), 450);
      } else if (risk <= 70) {
        bio.addLog({ identity: username, event: "LOGIN", mode: bio.mode, risk, decision: "STEP_UP", diagnostic: (factors[0] ?? "").replace("Flagged: ", "") });
        setMsg({ tone: "warn", text: `Cadence varied from baseline · Risk ${risk}%` });
        bio.setModal("stepup");
      } else {
        bio.addLog({ identity: username, event: "LOGIN", mode: bio.mode, risk, decision: "DENY", diagnostic: (factors[0] ?? "").replace("Flagged: ", "") });
        setMsg({ tone: "danger", text: `Access denied — automated behavior detected · Risk ${risk}%` });
      }
    }, 700);
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 fade-up">
      <Panel className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">Privacy & behavioral analysis</div>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              We analyze typing rhythm and mouse movement to prevent fraud. Only timing statistics are kept — your actual keystrokes are never stored.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="consentToggle" className="text-sm text-muted-foreground">{bio.consent ? "Consent granted" : "Opted out"}</Label>
          <Switch id="consentToggle" checked={bio.consent} onCheckedChange={bio.setConsent} />
        </div>
      </Panel>

      <Panel className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Current Typing Baseline</span>
          <Pill id="activeProfileBadge" tone={bio.preset === "enrolling" ? "warn" : "ink"}>{badge}</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([
            ["presetFast", "fast", "⚡ Fast Typist"],
            ["presetBalanced", "balanced", "⚖️ Standard / Balanced"],
            ["presetRelaxed", "relaxed", "👵 Senior / Relaxed"],
          ] as const).map(([id, p, label]) => (
            <button
              key={id}
              id={id}
              onClick={() => bio.applyPreset(p)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                bio.preset === p ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
              )}
            >
              {label}
            </button>
          ))}
          <Button id="btnOpenCalibration" variant="outline" size="sm" onClick={() => bio.setModal("enroll")}>
            🎯 Calibrate My Biometrics
          </Button>
        </div>
      </Panel>

      <div className="mx-auto w-full max-w-md py-4">
        <Panel className="p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl border bg-secondary">
              <Lock className="size-5" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Secure Portal Login</h2>
            <p className="mt-1 text-sm text-muted-foreground">Protected by Multi-Factor Behavioral Biometrics</p>
          </div>
          <form onSubmit={submit} className="grid gap-5">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="username">Username</Label>
                <span className="key-activity-indicator flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={cn("size-1.5 rounded-full transition-colors", ks.active ? "bg-safe" : "bg-muted-foreground/30")} />
                  {ks.active ? "capturing" : "idle"}
                </span>
              </div>
              <Input id="username" required value={username} onChange={(e) => setUsername(e.target.value)} {...ks.handlers} autoComplete="username" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} {...ks.handlers} autoComplete="current-password" />
            </div>
            <Button id="loginBtn" type="submit" size="lg" disabled={busy} className="mt-1">
              {busy ? "Analyzing…" : "Log In with Biometrics"}
            </Button>
            <div
              id="loginStatusMsg"
              aria-live="polite"
              className={cn(
                "min-h-5 text-center text-sm",
                msg?.tone === "safe" && "text-safe",
                msg?.tone === "warn" && "text-warn",
                msg?.tone === "danger" && "text-danger",
                msg?.tone === "neutral" && "text-muted-foreground",
              )}
            >
              {msg?.text}
            </div>
          </form>
          <div className="mt-2 border-t pt-5 text-center">
            <button id="openEnrollBtn" onClick={() => bio.setModal("enroll")} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              New rhythm or user? Calibrate baseline
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

const DOCS = [
  { icon: FileText, name: "Final Year Project Report - Behavioral Biometrics.pdf", meta: "Draft • Authorized", tone: "neutral" as const },
  { icon: GraduationCap, name: "Capstone Semester Examination Scores & Grade Ledger", meta: "Encrypted Record • Authorized", tone: "safe" as const },
  { icon: KeyRound, name: "Institutional Cloud Infrastructure API Keys", meta: "High Privilege • Authorized", tone: "warn" as const },
];

function Dashboard() {
  const bio = useBio();
  const risk = bio.lastRisk ?? 12;
  const tone = riskTone(risk);
  return (
    <div className="mx-auto grid max-w-5xl gap-6 fade-up">
      <Panel className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Confidential Student & Research Portal</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as <span id="dashUsername" className="font-mono text-foreground">{bio.session}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Pill tone="safe"><Dot pulse /> Continuous Biometric Guard: ACTIVE</Pill>
          <Pill id="dashRiskValue" tone={tone} className="font-mono">Current Risk: {risk}%</Pill>
          <Button id="logoutBtn" variant="outline" size="sm" onClick={() => bio.setSession(null)}>
            <LogOut /> Log out
          </Button>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <h3 className="text-sm font-medium">Confidential records</h3>
          <ul className="mt-4 divide-y">
            {DOCS.map((d) => (
              <li key={d.name} className="flex items-center gap-4 py-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-secondary">
                  <d.icon className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.meta}</div>
                </div>
                <Button variant="ghost" size="sm">Open</Button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h3 className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-4 text-safe" /> Security health</h3>
          <dl className="mt-4 grid gap-4 text-sm">
            {[
              ["Security Tier", "Level 3 (Continuous Telemetry)"],
              ["Inspection Cadence", "Every 5.0 seconds"],
              ["Feature Extraction", "Keystroke + Kinetic Stream"],
              ["Privacy", "Zero Raw Key Storage"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <Panel className="flex gap-3 bg-secondary">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          To demonstrate session takeover detection to evaluators, switch to the{" "}
          <button className="font-medium text-foreground underline underline-offset-4" onClick={() => bio.setTab("lab")}>Security Lab</button>{" "}
          tab and select <span className="font-medium text-foreground">'Erratic Imposter'</span>. Within 5 seconds, the continuous monitoring engine will revoke access.
        </p>
      </Panel>
    </div>
  );
}
