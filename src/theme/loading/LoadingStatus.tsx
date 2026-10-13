import type { HTMLAttributes } from "react";
import cn from "../../utils/classnames";
import { Spinner } from "../index";

interface LoadingStatusProps extends HTMLAttributes<HTMLParagraphElement> {
  iconSize?: number;
}

export default function LoadingStatus({
  iconSize = 15,
  className = "",
  children,
  ...props
}: LoadingStatusProps) {
  return (
    <p
      role="status"
      className={cn("flex items-center gap-2 text-sm text-violet-300", className)}
      {...props}
    >
      <Spinner size={iconSize} />
      {children}
    </p>
  );
}
