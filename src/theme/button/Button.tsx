import type { ButtonHTMLAttributes } from "react";
import cn from "../../utils/classnames";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 disabled:cursor-not-allowed disabled:opacity-45",
        {
          "bg-lime-300 text-slate-950 hover:bg-lime-200 shadow-lg shadow-lime-300/10":
            variant === "primary",
          "border border-slate-600 bg-slate-800 text-white hover:bg-slate-700":
            variant === "secondary",
          "text-slate-400 hover:bg-slate-800 hover:text-white": variant === "ghost",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
