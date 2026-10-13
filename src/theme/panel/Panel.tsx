import type { HTMLAttributes } from "react";
import cn from "../../utils/classnames";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  className?: string;
}

export default function Panel({ className = "", children, ...props }: PanelProps) {
  return (
    <section
      className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}
      {...props}
    >
      {children}
    </section>
  );
}
