import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-xl border bg-card p-6", className)} {...rest}>
      {children}
    </div>
  );
}

const toneMap = {
  safe: "bg-safe-soft text-safe border-safe/25",
  warn: "bg-warn-soft text-warn border-warn/30",
  danger: "bg-danger-soft text-danger border-danger/25",
  neutral: "bg-muted text-muted-foreground border-border",
  ink: "bg-primary text-primary-foreground border-primary",
};
export type Tone = keyof typeof toneMap;

export function Pill({ tone = "neutral", className, children, ...rest }: { tone?: Tone; className?: string; children: ReactNode } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", toneMap[tone], className)} {...rest}>
      {children}
    </span>
  );
}

export function Dot({ tone = "safe", pulse }: { tone?: "safe" | "warn" | "danger" | "neutral"; pulse?: boolean }) {
  const c = { safe: "bg-safe", warn: "bg-warn", danger: "bg-danger", neutral: "bg-muted-foreground/40" }[tone];
  return <span className={cn("inline-block size-2 rounded-full", c, pulse && "pulse-dot")} />;
}

export function Stat({ label, value, id, hint }: { label: string; value: ReactNode; id?: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div id={id} className="mt-2 font-mono text-2xl font-medium tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Modal({ id, open, onClose, children, className }: { id: string; open: boolean; onClose?: () => void; children: ReactNode; className?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div id={id} role="dialog" aria-modal="true" className={cn("fade-up max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-card p-8 shadow-xl", className)}>
        {children}
      </div>
    </div>
  );
}
