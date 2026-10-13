import type { DetailsHTMLAttributes, ReactNode } from "react";
import cn from "../../utils/classnames";

interface DisclosureProps extends DetailsHTMLAttributes<HTMLDetailsElement> {
  title: string;
  icon?: ReactNode;
  hint?: ReactNode;
  bare?: boolean;
  summaryClassName?: string;
}

export default function Disclosure({
  title,
  icon,
  hint,
  bare = false,
  className = "",
  summaryClassName = "",
  children,
  ...props
}: DisclosureProps) {
  return (
    <details
      className={cn("min-w-0", { "rounded-xl border border-slate-700 p-3": !bare }, className)}
      {...props}
    >
      <summary
        className={cn(
          "cursor-pointer text-xs font-semibold text-lime-300",
          { "flex items-center gap-2": !!icon || !!hint },
          summaryClassName
        )}
      >
        {icon}
        {title}
        {hint && (
          <span className="ml-auto text-xs font-normal tracking-normal text-slate-500">{hint}</span>
        )}
      </summary>
      {children}
    </details>
  );
}
