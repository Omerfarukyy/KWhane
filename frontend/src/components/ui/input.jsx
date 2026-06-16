import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border px-2.5 py-1 text-base transition-colors outline-none",
        "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-subtle)]",
        "focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20",
        "disabled:pointer-events-none disabled:opacity-50",
        "md:text-sm",
        className
      )}
      {...props}
    />
  );
}

export { Input }
