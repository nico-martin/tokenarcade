import { useEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import cn from "../../utils/classnames";

interface ModalProps {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "lg";
  dismissOnBackdrop?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  backdrop?: ReactNode;
  className?: string;
  overlayClassName?: string;
}

export default function Modal({
  titleId,
  onClose,
  children,
  size = "md",
  dismissOnBackdrop = true,
  initialFocusRef,
  backdrop,
  className = "",
  overlayClassName = "",
}: ModalProps) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (initialFocusRef?.current ?? dialog.current)?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, [initialFocusRef]);

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = Array.from(
      dialog.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex]:not([tabindex='-1'])"
      ) ?? []
    ).filter((element) => element.getClientRects().length > 0);
    if (!controls.length) {
      event.preventDefault();
      dialog.current?.focus();
      return;
    }
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        !controls.includes(document.activeElement as HTMLElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || !controls.includes(document.activeElement as HTMLElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/90 p-4",
        overlayClassName
      )}
      onClick={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      {backdrop}
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKey}
        className={cn(
          "screen-enter relative max-h-full w-full overflow-y-auto rounded-3xl border bg-slate-900 p-5 shadow-2xl outline-none sm:p-7",
          { "max-w-xl": size === "md", "max-w-2xl": size === "lg" },
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
