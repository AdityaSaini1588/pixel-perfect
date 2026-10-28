import { useCallback, useEffect, useRef } from "react";
import { Bot, User, UserX, CircleCheck, CircleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { decisionLabel, riskTone, useBio, useKeystrokes, type SimMode } from "@/lib/bioauth";
import { Panel, Pill, Stat } from "./ui";

const MODES: { id: string; mode: SimMode; label: string; icon: typeof User; desc: string }[] = [
  { id: "simNormal", mode: "normal", label: "Legitimate Typist", icon: User, desc: "Natural human cadence: variable dwell times, organic curved mouse paths. Expected risk below 25%." },
  { id: "simBot", mode: "bot", label: "Bot / Credential Stuffer", icon: Bot, desc: "Scripted replay: 0 ms flight time and a perfectly linear mouse trajectory. Expected risk ~95% — access denied." },
  { id: "simErratic", mode: "erratic", label: "Erratic Imposter", icon: UserX, desc: "Unfamiliar hands: long hesitation pauses and jittery kinetics. Expected risk ~55% — step-up challenge, or session revoked if already signed in." },
];

export function LabTab() {
  const bio = useBio();
  const risk = bio.lastRisk;
  const tone = risk === null ? "neutral" : riskTone(risk);
  const active = MODES.find((m) => m.mode === bio.mode)!;
  const onSample = useCallback((s: { dwell: number; flight: number }) => bio.setLive({ dwell: s.dwell, flight: s.flight }), [bio.setLive]);
  const ks = useKeystrokes(onSample);

  const dwell = bio.mode === "bot" ? 3 : bio.mode === "erratic" ? Math.round((bio.live.dwell || 90) * 2.1) : bio.live.dwell;
  const flight = bio.mode === "bot" ? 0 : bio.mode === "erratic" ? Math.round((bio.live.flight || 150) * 3.4) : bio.live.flight;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 fade-up">
      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm font-medium">Simulation Mode (Viva / Lab Demonstration):</div>
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                id={m.id}
                onClick={() => bio.setMode(m.mode)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
                  bio.mode === m.mode ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
                )}
              >
                <m.icon className="size-4" /> {m.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{active.desc}</p>
      </Panel>

      <Panel className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold tracking-tight">Live Biometrics Telemetry</h3>
          <Pill id="liveDecisionBadge" tone={tone}>{decisionLabel(risk)}</Pill>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Average Dwell Time" id="hudDwell" value={`${dwell || "--"} ms`} hint="Key held down" />
          <Stat label="Average Flight Interval" id="hudFlight" value={`${bio.mode === "bot" ? 0 : flight || "--"} ms`} hint="Between keys" />
          <Stat label="Mouse Velocity" id="hudMouse" value={`${bio.live.mouse || "--"} px/s`} hint="Rolling average" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Kinetic trajectory — move your mouse over the canvas</span>
              <span className="font-mono">{bio.mode === "normal" ? "live" : "simulated"}</span>
            </div>
            <MouseCanvas />
            <Input
              className="mt-4"
              placeholder="Type here to feed the keystroke stream…"
              {...ks.handlers}
              onKeyUp={(e) => {
                ks.handlers.onKeyUp(e);
                bio.evaluate("PROBE", "lab");
              }}
            />
          </div>
          <div className="grid content-start gap-6">
            <RiskGauge risk={risk} />
            <div>
              <div className="mb-3 text-xs font-medium text-muted-foreground">Biometric factor diagnostics</div>
              <ul id="factorList" className="grid gap-2.5">
                {bio.factors.map((f) => {
                  const flagged = f.startsWith("Flagged");
                  return (
                    <li key={f} className="flex gap-2 text-sm">
                      {flagged ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" /> : <CircleCheck className="mt-0.5 size-4 shrink-0 text-safe" />}
                      <span className={flagged ? "text-foreground" : "text-muted-foreground"}>{f}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function RiskGauge({ risk }: { risk: number | null }) {
  const v = risk ?? 0;
  const tone = risk === null ? "neutral" : riskTone(v);
  const color = { safe: "stroke-safe", warn: "stroke-warn", danger: "stroke-danger", neutral: "stroke-muted-foreground/30" }[tone];
  const C = 2 * Math.PI * 52;
  return (
    <div className="flex flex-col items-center rounded-xl border p-5">
      <svg viewBox="0 0 120 120" className="size-36 -rotate-90">
        <circle cx="60" cy="60" r="52" className="fill-none stroke-muted" strokeWidth="9" />
        <circle cx="60" cy="60" r="52" className={cn("fill-none transition-all duration-700", color)} strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - v / 100)} />
      </svg>
      <div className="-mt-[92px] mb-12 text-center">
        <div id="riskGaugeScore" className="font-mono text-3xl font-medium">{risk === null ? "--" : `${v}%`}</div>
        <div className="text-xs text-muted-foreground">risk score</div>
      </div>
    </div>
  );
}

function MouseCanvas() {
  const bio = useBio();
  const ref = useRef<HTMLCanvasElement>(null);
  const pts = useRef<{ x: number; y: number; t: number }[]>([]);
  const modeRef = useRef(bio.mode);
  modeRef.current = bio.mode;
  const setLive = bio.setLive;

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const style = getComputedStyle(document.documentElement);
    let raf = 0;
    let simT = 0;
    let lastVel = 0;
    const resize = () => {
      const r = cv.getBoundingClientRect();
      cv.width = r.width * devicePixelRatio;
      cv.height = r.height * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      if (modeRef.current !== "normal") return;
      const r = cv.getBoundingClientRect();
      pts.current.push({ x: (e.clientX - r.left) * devicePixelRatio, y: (e.clientY - r.top) * devicePixelRatio, t: performance.now() });
    };
    cv.addEventListener("mousemove", onMove);

    const velTimer = setInterval(() => {
      const p = pts.current;
      const now = performance.now();
      const recent = p.filter((q) => now - q.t < 500);
      let d = 0;
      for (let i = 1; i < recent.length; i++) d += Math.hypot(recent[i].x - recent[i - 1].x, recent[i].y - recent[i - 1].y);
      const v = Math.round(d / devicePixelRatio / 0.5);
      if (v !== lastVel) { lastVel = v; setLive({ mouse: v }); }
    }, 300);

    const draw = () => {
      const w = cv.width, h = cv.height, now = performance.now();
      // synthetic paths
      if (modeRef.current === "bot") {
        simT += 0.012;
        const k = simT % 1;
        pts.current.push({ x: w * 0.1 + w * 0.8 * k, y: h * 0.8 - h * 0.6 * k, t: now });
      } else if (modeRef.current === "erratic") {
        simT += 0.03;
        const last = pts.current[pts.current.length - 1] ?? { x: w / 2, y: h / 2 };
        const stall = Math.sin(simT * 1.7) > 0.6;
        if (!stall) {
          pts.current.push({
            x: Math.max(10, Math.min(w - 10, last.x + (Math.random() - 0.5) * 60 * devicePixelRatio)),
            y: Math.max(10, Math.min(h - 10, last.y + (Math.random() - 0.5) * 60 * devicePixelRatio)),
            t: now,
          });
        }
      }
      pts.current = pts.current.filter((p) => now - p.t < 1600);

      ctx.clearRect(0, 0, w, h);
      // grid
      ctx.strokeStyle = style.getPropertyValue("--border").trim();
      ctx.lineWidth = 1;
      const step = 32 * devicePixelRatio;
      for (let x = step; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = step; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      const p = pts.current;
      const color = style.getPropertyValue(modeRef.current === "normal" ? "--primary" : modeRef.current === "bot" ? "--danger" : "--warn").trim();
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 2; i < p.length; i++) {
        const a = 1 - (now - p[i].t) / 1600;
        ctx.globalAlpha = Math.max(0, a);
        ctx.lineWidth = 2.5 * devicePixelRatio;
        const m1 = { x: (p[i - 2].x + p[i - 1].x) / 2, y: (p[i - 2].y + p[i - 1].y) / 2 };
        const m2 = { x: (p[i - 1].x + p[i].x) / 2, y: (p[i - 1].y + p[i].y) / 2 };
        ctx.beginPath();
        ctx.moveTo(m1.x, m1.y);
        ctx.quadraticCurveTo(p[i - 1].x, p[i - 1].y, m2.x, m2.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (p.length) {
        const l = p[p.length - 1];
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(l.x, l.y, 4 * devicePixelRatio, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(velTimer);
      window.removeEventListener("resize", resize);
      cv.removeEventListener("mousemove", onMove);
    };
  }, [setLive]);

  return <canvas id="mouseCanvas" ref={ref} className="h-72 w-full cursor-crosshair rounded-xl border bg-canvas" />;
}
