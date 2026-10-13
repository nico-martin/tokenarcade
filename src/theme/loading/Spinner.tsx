import { LoaderCircle } from "lucide-react";
import type { SVGProps } from "react";
import cn from "../../utils/classnames";

interface SpinnerProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export default function Spinner({ size = 16, className = "", ...props }: SpinnerProps) {
  return (
    <LoaderCircle
      size={size}
      aria-hidden="true"
      className={cn("shrink-0 animate-spin", className)}
      {...props}
    />
  );
}
