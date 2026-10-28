import { useMemo, useState } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { MODE_LABEL, riskTone, useBio, type Decision } from "@/lib/bioauth";
import { Panel, Pill, Stat } from "./ui";

const decisionTone = (d: Decision) => (d === "ALLOW" ? "safe" : d === "STEP_UP" ? "warn" : "danger");

export function SocTab() {
  const bio = useBio();
  const [spin, setSpin] = useState(false);
  const logs = bio.logs;
  const m = useMemo(() => {
    const allowed = logs.filter((l) => l.decision === "ALLOW").length;
    const step = logs.filter((l) => l.decision === "STEP_UP").length;
    const denied = logs.filter((l) => l.decision === "DENY" || l.decision === "LOCKED").length;
    const avg = logs.length ? Math.round(logs.reduce((s, l) => s + l.risk, 0) / logs.length) : 0;
    return { allowed, step, denied, avg };
  }, [logs]);

  const chart = [
    { name: "Genuine", value: m.allowed, color: "var(--chart-1)" },
    { name: "Step-Up", value: m.step, color: "var(--chart-2)" },
    { name: "Imposter / Bot", value: m.denied, color: "var(--chart-3)" },
  ];

  return (
    <div className="mx-auto grid max-w-6xl gap-6 fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Security Operations Center (SOC)</h2>
          <p className="mt-1 text-sm text-muted-foreground">Every authentication and continuous-monitoring decision, as it happens.</p>
        </div>
        <div className="flex gap-2">
          <Button id="resetBaselineBtn" variant="outline" size="sm" className="border-danger/40 text-danger hover:bg-danger-soft hover:text-danger" onClick={bio.resetBaseline}>
            <RotateCcw /> Reset Baseline
          </Button>
          <Button id="refreshBtn" variant="outline" size="sm" onClick={() => { setSpin(true); setTimeout(() => setSpin(false), 600); }}>
            <RefreshCw className={spin ? "animate-spin" : ""} /> Refresh Stream
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Enrolled Profiles" id="metricUsers" value={bio.enrolledProfiles} />
        <Stat label="Total Events Evaluated" id="metricEvents" value={logs.length} />
        <Stat label="Low Risk Allowed" id="metricAllowed" value={m.allowed} />
        <Stat label="Step-Up Challenges" id="metricStepUp" value={m.step} />
        <Stat label="Anomalies / Locked" id="metricDenied" value={m.denied} />
        <Stat label="System Avg Risk" id="metricAvgRisk" value={`${m.avg}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="overflow-hidden p-0 lg:col-span-2">
          <div className="border-b px-6 py-4 text-sm font-medium">Live Telemetry & Access Audit Stream</div>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary text-left text-xs text-muted-foreground">
                <tr>
                  {["Time", "Identity", "Event", "Mode", "Risk Score", "Decision", "Biometric Diagnostic"].map((h) => (
                    <th key={h} className="px-4 py-2.5 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody id="logsTableBody" className="divide-y">
                {logs.map((l) => (
                  <tr key={l.id} className="fade-up">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{l.time}</td>
                    <td className="px-4 py-3 font-mono text-xs">{l.identity}</td>
                    <td className="px-4 py-3 text-xs">{l.event}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{MODE_LABEL[l.mode]}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs text-${riskTone(l.risk)}`}>{l.risk}%</span>
                    </td>
                    <td className="px-4 py-3"><Pill tone={decisionTone(l.decision)}>{l.decision}</Pill></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{l.diagnostic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <div className="text-sm font-medium">Risk Distribution</div>
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chart} dataKey="value" innerRadius={62} outerRadius={88} paddingAngle={2} stroke="none">
                  {chart.map((c) => <Cell key={c.name} fill={c.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-mono text-2xl">{logs.length}</div>
              <div className="text-xs text-muted-foreground">events</div>
            </div>
          </div>
          <ul className="mt-2 grid gap-2.5">
            {chart.map((c) => (
              <li key={c.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ background: c.color }} />{c.name}</span>
                <span className="font-mono text-muted-foreground">{c.value}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
