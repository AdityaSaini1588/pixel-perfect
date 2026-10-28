import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";
import { BioAuthProvider, useBio } from "@/lib/bioauth";
import { PortalTab } from "@/components/bio/PortalTab";
import { LabTab } from "@/components/bio/LabTab";
import { SocTab } from "@/components/bio/SocTab";
import { EnrollmentModal, LockoutModal, StepUpModal } from "@/components/bio/Modals";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BioAuth Guard — Adaptive Behavioral Authentication" },
      { name: "description", content: "Multi-factor behavioral authentication with continuous keystroke and mouse biometrics, live telemetry and SOC audit." },
      { property: "og:title", content: "BioAuth Guard — Adaptive Behavioral Authentication" },
      { property: "og:description", content: "Continuous biometric security: keystroke dynamics, mouse kinetics, step-up MFA and session hijack detection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <BioAuthProvider>
      <App />
    </BioAuthProvider>
  ),
});

const TABS = [
  { id: "portal", label: "User Portal" },
  { id: "lab", label: "Security Lab & Telemetry" },
  { id: "soc", label: "SOC Audit & Analytics" },
];

function useContinuousMonitor() {
  const bio = useBio();
  useEffect(() => {
    if (!bio.session) return;
    const t = setInterval(() => {
      const { risk, factors } = bio.evaluate("MONITOR", bio.session!);
      if (bio.mode === "normal") {
        bio.addLog({ identity: bio.session!, event: "MONITOR", mode: bio.mode, risk, decision: "ALLOW", diagnostic: "Continuous check OK" });
      } else {
        bio.addLog({ identity: bio.session!, event: "MONITOR", mode: bio.mode, risk, decision: "LOCKED", diagnostic: (factors[0] ?? "").replace("Flagged: ", "") });
        bio.setLockoutReasons(factors);
        bio.setSession(null);
        bio.setModal("lockout");
      }
    }, 5000);
    return () => clearInterval(t);
  }, [bio.session, bio.mode, bio.evaluate, bio.addLog]);
}

function App() {
  const bio = useBio();
  useContinuousMonitor();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 pt-5 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3 pb-4 md:pb-5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Fingerprint className="size-5" />
            </div>
            <div className="font-semibold tracking-tight">BioAuth Guard</div>
            <span className="hidden rounded-full border px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline">Adaptive Behavioral Security v1.0</span>
          </div>
          <nav className="-mb-px flex gap-6 overflow-x-auto" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={bio.tab === t.id}
                onClick={() => bio.setTab(t.id)}
                className={cn(
                  "border-b-2 pb-4 text-sm font-medium whitespace-nowrap transition-colors",
                  bio.tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="px-6 py-10">
        {bio.tab === "portal" && <PortalTab />}
        {bio.tab === "lab" && <LabTab />}
        {bio.tab === "soc" && <SocTab />}
      </main>
      <EnrollmentModal />
      <StepUpModal />
      <LockoutModal />
    </div>
  );
}
