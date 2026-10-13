import type { ButtonHTMLAttributes, Ref } from "react";
import cn from "../../utils/classnames";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm" | "icon";
  ref?: Ref<HTMLButtonElement>;
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 disabled:cursor-not-allowed disabled:opacity-45",
        {
          "px-4 py-2.5 text-sm": size === "md",
          "px-3 py-1.5 text-xs": size === "sm",
          "p-2": size === "icon",
          "bg-lime-300 text-slate-950 hover:bg-lime-200 shadow-lg shadow-lime-300/10":
            variant === "primary",
          "border border-slate-600 bg-slate-800 text-white hover:bg-slate-700":
            variant === "secondary",
          "text-slate-400 hover:bg-slate-800 hover:text-white": variant === "ghost",
          "border border-rose-300/40 bg-rose-900 text-rose-100 hover:bg-rose-800":
            variant === "danger",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
