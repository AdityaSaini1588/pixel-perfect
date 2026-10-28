import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type SimMode = "normal" | "bot" | "erratic";
export type Decision = "ALLOW" | "STEP_UP" | "DENY" | "LOCKED";
export type Preset = "fast" | "balanced" | "relaxed" | "custom" | "enrolling";

export interface LogEntry {
  id: number;
  time: string;
  identity: string;
  event: string;
  mode: SimMode;
  risk: number;
  decision: Decision;
  diagnostic: string;
}

export interface Baseline {
  dwell: number;
  flight: number;
  cps: number;
}

export const PRESETS: Record<"fast" | "balanced" | "relaxed", Baseline & { label: string }> = {
  fast: { label: "⚡ Fast Typist (65+ WPM)", dwell: 72, flight: 95, cps: 6.2 },
  balanced: { label: "⚖️ Standard / Balanced (40 WPM)", dwell: 98, flight: 160, cps: 3.8 },
  relaxed: { label: "👵 Senior / Relaxed (20 WPM)", dwell: 140, flight: 290, cps: 1.9 },
};

export const MODE_LABEL: Record<SimMode, string> = {
  normal: "Legitimate",
  bot: "Bot",
  erratic: "Erratic",
};

export function riskTone(r: number) {
  return r < 35 ? "safe" : r <= 70 ? "warn" : "danger";
}

export function decisionLabel(r: number | null) {
  if (r === null) return "READY";
  if (r < 35) return "LOW RISK (GENUINE)";
  if (r <= 70) return "MEDIUM RISK (STEP-UP)";
  return "HIGH RISK (ANOMALY)";
}

/** Mock scoring engine. Returns risk 0-100 and human-readable factors. */
export function scoreRisk(mode: SimMode, live: { dwell: number; flight: number }, base: Baseline) {
  const jitter = (n: number) => Math.round((Math.random() - 0.5) * n);
  if (mode === "bot") {
    return {
      risk: 95,
      factors: [
        "Flagged: Flight interval ≈ 0 ms — no human motor latency",
        "Flagged: Mouse trajectory perfectly linear (curvature 0.00)",
        "Flagged: Dwell variance below physiological floor (σ < 1 ms)",
      ],
    };
  }
  if (mode === "erratic") {
    return {
      risk: 55,
      factors: [
        `Flagged: Dwell time standard deviation deviated by ${(2.6 + Math.random()).toFixed(1)}σ`,
        "Flagged: Hesitation pauses > 600 ms between digraphs",
        "Mouse kinetics partially consistent with enrolled profile",
      ],
    };
  }
  const dDev = live.dwell ? Math.abs(live.dwell - base.dwell) / base.dwell : 0;
  const fDev = live.flight ? Math.abs(live.flight - base.flight) / base.flight : 0;
  const risk = Math.max(4, Math.min(24, Math.round(8 + (dDev + fDev) * 6 + jitter(6))));
  return {
    risk,
    factors: [
      "Keystroke dynamics match enrolled baseline within acceptable variance",
      "Mouse curvature and acceleration consistent with human motor control",
      "Device and session fingerprint unchanged",
    ],
  };
}

const now = () => new Date().toLocaleTimeString([], { hour12: false });

const SEED: LogEntry[] = [
  { id: 1, time: "09:12:04", identity: "student", event: "LOGIN", mode: "normal", risk: 11, decision: "ALLOW", diagnostic: "Baseline match" },
  { id: 2, time: "09:31:47", identity: "r.mehta", event: "LOGIN", mode: "erratic", risk: 58, decision: "STEP_UP", diagnostic: "Dwell σ +2.9" },
  { id: 3, time: "10:02:19", identity: "admin", event: "LOGIN", mode: "bot", risk: 96, decision: "DENY", diagnostic: "0 ms flight interval" },
  { id: 4, time: "10:05:33", identity: "student", event: "MONITOR", mode: "normal", risk: 9, decision: "ALLOW", diagnostic: "Continuous check OK" },
];

interface Ctx {
  tab: string;
  setTab: (t: string) => void;
  mode: SimMode;
  setMode: (m: SimMode) => void;
  consent: boolean;
  setConsent: (b: boolean) => void;
  preset: Preset;
  baseline: Baseline;
  applyPreset: (p: "fast" | "balanced" | "relaxed") => void;
  setCustomBaseline: (b: Baseline) => void;
  enrolledProfiles: number;
  live: { dwell: number; flight: number; mouse: number };
  setLive: (l: Partial<{ dwell: number; flight: number; mouse: number }>) => void;
  lastRisk: number | null;
  factors: string[];
  logs: LogEntry[];
  addLog: (e: Omit<LogEntry, "id" | "time">) => void;
  resetBaseline: () => void;
  evaluate: (event: string, identity: string) => { risk: number; factors: string[] };
  session: string | null;
  setSession: (u: string | null) => void;
  modal: null | "enroll" | "stepup" | "lockout";
  setModal: (m: Ctx["modal"]) => void;
  lockoutReasons: string[];
  setLockoutReasons: (r: string[]) => void;
}

const BioCtx = createContext<Ctx | null>(null);

export function BioAuthProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState("portal");
  const [mode, setMode] = useState<SimMode>("normal");
  const [consent, setConsent] = useState(true);
  const [preset, setPreset] = useState<Preset>("fast");
  const [baseline, setBaseline] = useState<Baseline>(PRESETS.fast);
  const [enrolledProfiles, setEnrolled] = useState(3);
  const [live, setLiveState] = useState({ dwell: 0, flight: 0, mouse: 0 });
  const [lastRisk, setLastRisk] = useState<number | null>(null);
  const [factors, setFactors] = useState<string[]>(["Awaiting behavioral input…"]);
  const [logs, setLogs] = useState<LogEntry[]>(SEED);
  const [session, setSession] = useState<string | null>(null);
  const [modal, setModal] = useState<Ctx["modal"]>(null);
  const [lockoutReasons, setLockoutReasons] = useState<string[]>([]);
  const idRef = useRef(SEED.length);

  const setLive = useCallback((l: Partial<typeof live>) => setLiveState((p) => ({ ...p, ...l })), []);

  const addLog = useCallback((e: Omit<LogEntry, "id" | "time">) => {
    idRef.current += 1;
    const entry = { ...e, id: idRef.current, time: now() };
    setLogs((p) => [entry, ...p].slice(0, 200));
  }, []);

  const liveRef = useRef(live);
  liveRef.current = live;

  const evaluate = useCallback(
    (_event: string, _identity: string) => {
      const res = scoreRisk(mode, liveRef.current, baseline);
      setLastRisk(res.risk);
      setFactors(res.factors);
      return res;
    },
    [mode, baseline],
  );

  const applyPreset = (p: "fast" | "balanced" | "relaxed") => {
    setPreset(p);
    setBaseline(PRESETS[p]);
  };
  const setCustomBaseline = (b: Baseline) => {
    setPreset("custom");
    setBaseline(b);
    setEnrolled((n) => n + 1);
  };
  const resetBaseline = () => {
    setPreset("enrolling");
    setBaseline(PRESETS.balanced);
    setLastRisk(null);
    setFactors(["Baseline reset — awaiting new enrollment samples"]);
    addLog({ identity: "admin", event: "RESET", mode, risk: 0, decision: "ALLOW", diagnostic: "Baseline cleared" });
  };

  const value: Ctx = {
    tab, setTab, mode, setMode, consent, setConsent, preset, baseline, applyPreset, setCustomBaseline,
    enrolledProfiles, live, setLive, lastRisk, factors, logs, addLog, resetBaseline, evaluate,
    session, setSession, modal, setModal, lockoutReasons, setLockoutReasons,
  };
  return <BioCtx.Provider value={value}>{children}</BioCtx.Provider>;
}

export function useBio() {
  const c = useContext(BioCtx);
  if (!c) throw new Error("useBio outside provider");
  return c;
}

/** Captures dwell/flight timings for keyboard input on an element. */
export function useKeystrokes(onSample?: (s: { dwell: number; flight: number; cps: number }) => void) {
  const downs = useRef<Map<string, number>>(new Map());
  const lastUp = useRef<number | null>(null);
  const dwells = useRef<number[]>([]);
  const flights = useRef<number[]>([]);
  const first = useRef<number | null>(null);
  const count = useRef(0);
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

  const handlers = useMemo(
    () => ({
      onKeyDown: (e: React.KeyboardEvent) => {
        const t = performance.now();
        if (first.current === null) first.current = t;
        if (lastUp.current !== null) flights.current.push(Math.min(1500, t - lastUp.current));
        downs.current.set(e.code, t);
        setActive(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setActive(false), 220);
      },
      onKeyUp: (e: React.KeyboardEvent) => {
        const t = performance.now();
        const d = downs.current.get(e.code);
        if (d !== undefined) {
          dwells.current.push(t - d);
          downs.current.delete(e.code);
        }
        lastUp.current = t;
        count.current += 1;
        const elapsed = (t - (first.current ?? t)) / 1000;
        onSample?.({
          dwell: Math.round(avg(dwells.current.slice(-20))),
          flight: Math.round(avg(flights.current.slice(-20))),
          cps: elapsed > 0.2 ? +(count.current / elapsed).toFixed(1) : 0,
        });
      },
    }),
    [onSample],
  );

  const reset = useCallback(() => {
    downs.current.clear();
    lastUp.current = null;
    first.current = null;
    dwells.current = [];
    flights.current = [];
    count.current = 0;
  }, []);

  const summary = useCallback(() => {
    const elapsed = first.current && lastUp.current ? (lastUp.current - first.current) / 1000 : 0;
    return {
      dwell: Math.round(avg(dwells.current)),
      flight: Math.round(avg(flights.current)),
      cps: elapsed > 0 ? +(count.current / elapsed).toFixed(1) : 0,
    };
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { handlers, active, reset, summary };
}

export function classifyCadence(cps: number) {
  if (cps >= 5) return { title: "⚡ Fast Typist", desc: "Rapid, confident cadence with short dwell times. Thresholds tightened for precision." };
  if (cps >= 2.8) return { title: "⚖️ Standard / Balanced", desc: "Steady, consistent rhythm. Balanced thresholds for everyday use." };
  return { title: "👵 Senior / Relaxed", desc: "Deliberate, careful cadence. Wider tolerance so you're never falsely flagged." };
}
