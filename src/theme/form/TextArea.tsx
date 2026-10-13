import type { TextareaHTMLAttributes } from "react";
import cn from "../../utils/classnames";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  code?: boolean;
}

export default function TextArea({ code = false, className = "", ...props }: TextAreaProps) {
  return (
    <textarea
      className={cn(
        "field resize-none",
        { "font-mono text-sm leading-6": code, "text-base leading-7": !code },
        className
      )}
      {...props}
    />
  );
}
