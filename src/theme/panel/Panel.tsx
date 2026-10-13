import type { HTMLAttributes } from "react";
import cn from "../../utils/classnames";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  tone?: "neutral" | "success" | "danger" | "accent" | "warning";
}

export default function Panel({
  tone = "neutral",
  className = "",
  children,
  ...props
}: PanelProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border",
        {
          "border-slate-700 bg-slate-900": tone === "neutral",
          "border-lime-300/30 bg-lime-300/10": tone === "success",
          "border-rose-400/40 bg-rose-400/10": tone === "danger",
          "border-violet-400/20 bg-violet-400/5": tone === "accent",
          "border-amber-300/20 bg-amber-300/5": tone === "warning",
        },
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
