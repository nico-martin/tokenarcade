import type { HTMLAttributes } from "react";
import cn from "../../utils/classnames";

interface CodeBlockProps extends HTMLAttributes<HTMLPreElement> {
  tone?: "neutral" | "danger";
  size?: "xs" | "sm" | "lg";
  bare?: boolean;
}

export default function CodeBlock({
  tone = "neutral",
  size = "sm",
  bare = false,
  className = "",
  children,
  ...props
}: CodeBlockProps) {
  return (
    <pre
      className={cn(
        "overflow-auto whitespace-pre-wrap break-all text-left font-mono",
        {
          "rounded-xl border bg-slate-950 p-3": !bare,
          "border-slate-700 text-slate-300": tone === "neutral",
          "border-rose-400/20 text-rose-200": tone === "danger",
          "text-xs leading-6": size === "xs",
          "text-sm leading-6": size === "sm",
          "text-lg leading-8": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </pre>
  );
}
