import { useCallback, useState } from "react";
import { X, Check, ShieldAlert, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { classifyCadence, useBio, useKeystrokes, type Baseline } from "@/lib/bioauth";
import { Modal, Pill } from "./ui";

const PHRASE = "behavioral biometrics provide adaptive continuous security";
const STEP_NAMES = ["Natural Baseline", "Rhythm Consistency", "Threshold Calibration"];

export function EnrollmentModal() {
  const bio = useBio();
  const open = bio.modal === "enroll";
  const [step, setStep] = useState(0);
  const [text, setText] = useState("");
  const [liveS, setLiveS] = useState({ dwell: 0, flight: 0, cps: 0 });
  const [samples, setSamples] = useState<Baseline[]>([]);
  const [done, setDone] = useState<Baseline | null>(null);
  const onSample = useCallback((s: Baseline) => setLiveS(s), []);
  const ks = useKeystrokes(onSample);

  const close = () => {
    bio.setModal(null);
    setStep(0); setText(""); setSamples([]); setDone(null); setLiveS({ dwell: 0, flight: 0, cps: 0 }); ks.reset();
  };

  const record = () => {
    const s = ks.summary();
    const next = [...samples, s];
    setSamples(next);
    ks.reset(); setText(""); setLiveS({ dwell: 0, flight: 0, cps: 0 });
    if (next.length >= 3) {
      const avg = (k: keyof Baseline) => +(next.reduce((a, b) => a + b[k], 0) / next.length).toFixed(k === "cps" ? 1 : 0);
      const b = { dwell: avg("dwell"), flight: avg("flight"), cps: avg("cps") };
      setDone(b);
      bio.setCustomBaseline(b);
      bio.addLog({ identity: "student", event: "ENROLL", mode: "normal", risk: 0, decision: "ALLOW", diagnostic: `Baseline ${b.dwell}ms / ${b.flight}ms` });
    } else setStep(next.length);
  };

  const ready = text.trim().length >= PHRASE.length - 3;
  const pct = Math.round(((step + 1) / 3) * 100);
  const cad = classifyCadence(liveS.cps);
  const result = done ? classifyCadence(done.cps) : null;

  return (
    <Modal id="enrollmentModal" open={open} onClose={close} className="max-w-2xl">
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-semibold tracking-tight">🎯 Guided Biometric Calibration Wizard</h2>
        <button id="closeEnrollBtnIcon" onClick={close} aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="size-4" /></button>
      </div>

      {!done ? (
        <div className="mt-6 grid gap-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Type Naturally", "Use your regular rhythm — don't rush."],
              ["Capture 3 Samples", "We learn your dwell and flight intervals."],
              ["Zero False Alarms", "Your personal threshold is calibrated."],
            ].map(([t, d], i) => (
              <div key={t} className={cn("rounded-xl border p-4", i === step && "border-primary/40 bg-secondary")}>
                <div className="font-mono text-xs text-muted-foreground">0{i + 1}</div>
                <div className="mt-1 text-sm font-medium">{t}</div>
                <div className="mt-1 text-xs text-muted-foreground">{d}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span id="enrollStepIndicator" className="font-medium">Sample {step + 1} of 3: {STEP_NAMES[step]}</span>
              <span id="enrollProgressPct" className="font-mono text-muted-foreground">Step {step + 1} ({pct}%)</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div id="wizardProgressBar" className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div id="targetPhraseDisplay" className="rounded-xl border bg-canvas p-5 font-mono text-sm leading-relaxed">
            {PHRASE.split("").map((c, i) => (
              <span key={i} className={i < text.length ? (text[i] === c ? "text-safe" : "text-danger") : "text-muted-foreground"}>{c}</span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Pill id="wizardCadenceBadge" tone={liveS.cps ? "ink" : "neutral"}>{liveS.cps ? `${cad.title} Detected` : "Awaiting input"}</Pill>
            <span className="text-muted-foreground">Speed <span id="wizardLiveCps" className="font-mono text-foreground">{liveS.cps || "--"} CPS</span></span>
            <span className="text-muted-foreground">Dwell <span id="wizardLiveDwell" className="font-mono text-foreground">{liveS.dwell || "--"} ms</span></span>
            <span id="wizardCharCount" className="ml-auto font-mono text-muted-foreground">{text.length} / {PHRASE.length} chars</span>
          </div>

          <Input
            id="enrollInput"
            autoFocus
            value={text}
            maxLength={PHRASE.length + 5}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && ready) record(); else ks.handlers.onKeyDown(e); }}
            onKeyUp={ks.handlers.onKeyUp}
            onPaste={(e) => e.preventDefault()}
            placeholder="Start typing the sentence above here..."
            className="font-mono"
          />

          <div className="flex justify-end gap-2">
            <Button id="closeEnrollBtn" variant="ghost" onClick={close}>Cancel</Button>
            <Button id="enrollSubmitBtn" disabled={!ready} onClick={record}>Record Sample & Continue →</Button>
          </div>
        </div>
      ) : (
        <div id="wizardSuccessView" className="mt-6 grid gap-6 text-center fade-up">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-safe-soft">
            <Check className="size-8 text-safe" strokeWidth={2.5} />
          </div>
          <h3 className="text-xl font-semibold tracking-tight">Biometric Baseline Calibrated!</h3>
          <div className="grid grid-cols-3 gap-3">
            {[["Average Dwell", `${done.dwell} ms`], ["Average Flight", `${done.flight} ms`], ["Typing Velocity", `${done.cps} CPS`]].map(([k, v]) => (
              <div key={k} className="rounded-xl border p-4">
                <div className="text-xs text-muted-foreground">{k}</div>
                <div className="mt-1 font-mono text-lg">{v}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-secondary p-5 text-left">
            <div className="text-xs text-muted-foreground">Enrolled signature</div>
            <div id="calibResultStyleTitle" className="mt-1 font-medium">{result!.title}</div>
            <p id="calibResultStyleDesc" className="mt-1 text-sm text-muted-foreground">{result!.desc}</p>
          </div>
          <Button id="btnFinishCalibration" size="lg" onClick={() => { close(); bio.setTab("portal"); }}>Return to Login & Test Now</Button>
        </div>
      )}
    </Modal>
  );
}

export function StepUpModal() {
  const bio = useBio();
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const close = () => { bio.setModal(null); setOtp(""); setMsg(null); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === "123456") {
      setMsg({ ok: true, text: "Identity verified. Opening portal…" });
      bio.addLog({ identity: "student", event: "STEP_UP_OTP", mode: bio.mode, risk: bio.lastRisk ?? 50, decision: "ALLOW", diagnostic: "Second factor passed" });
      setTimeout(() => { close(); bio.setSession("student"); }, 600);
    } else {
      setMsg({ ok: false, text: "Incorrect passcode. Please try again." });
      bio.addLog({ identity: "student", event: "STEP_UP_OTP", mode: bio.mode, risk: 80, decision: "DENY", diagnostic: "Invalid OTP" });
    }
  };
  return (
    <Modal id="stepUpModal" open={bio.modal === "stepup"} onClose={close} className="max-w-md">
      <div className="flex items-start justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><TriangleAlert className="size-5 text-warn" /> Step-Up Verification Required</h2>
        <button onClick={close} aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Typing cadence varied from baseline (Risk: 40-70%). Enter second-factor passcode.</p>
      <p className="mt-2 font-mono text-xs text-warn">[Demo Code: Enter 123456]</p>
      <form id="stepUpForm" onSubmit={submit} className="mt-6 grid gap-4">
        <Input
          id="otpInput"
          inputMode="numeric"
          autoFocus
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••"
          className="h-14 text-center font-mono text-2xl tracking-[0.6em]"
        />
        <Button type="submit" size="lg" disabled={otp.length !== 6}>Verify Identity</Button>
        <div id="stepUpMsg" className={cn("min-h-5 text-center text-sm", msg?.ok ? "text-safe" : "text-danger")}>{msg?.text}</div>
      </form>
    </Modal>
  );
}

export function LockoutModal() {
  const bio = useBio();
  return (
    <Modal id="lockoutModal" open={bio.modal === "lockout"} className="max-w-md border-danger/30 p-0">
      <div className="rounded-t-2xl border-b border-danger/20 bg-danger-soft px-8 py-6">
        <h2 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-danger">
          <ShieldAlert className="size-5" /> CRITICAL: Session Hijack Intercepted!
        </h2>
      </div>
      <div className="grid gap-5 p-8">
        <p className="text-sm text-muted-foreground">Continuous biometric monitoring detected an acute behavioral anomaly. Terminal access has been securely revoked.</p>
        <ul id="lockoutReasons" className="grid gap-2 rounded-xl border bg-canvas p-4 text-sm">
          {bio.lockoutReasons.map((r) => <li key={r} className="flex gap-2"><span className="text-danger">•</span>{r.replace("Flagged: ", "")}</li>)}
        </ul>
        <Button id="reloginBtn" size="lg" onClick={() => { bio.setModal(null); bio.setMode("normal"); bio.setTab("portal"); }}>
          Acknowledge & Return to Login
        </Button>
      </div>
    </Modal>
  );
}
