"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const progressVariants = {
  default: "bg-primary",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  danger: "bg-destructive",
} as const;

export type ProgressVariant = keyof typeof progressVariants;

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  variant?: ProgressVariant;
  label?: string;
  showValue?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      variant = "default",
      label,
      showValue = false,
      ...props
    },
    ref
  ) => {
    const clampedValue = Math.max(0, Math.min(100, value));

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {(label || showValue) && (
          <div className="mb-1.5 flex items-center justify-between text-sm">
            {label && (
              <span className="font-medium text-foreground">{label}</span>
            )}
            {showValue && (
              <span className="text-muted-foreground">{clampedValue}%</span>
            )}
          </div>
        )}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              progressVariants[variant]
            )}
            style={{ width: `${clampedValue}%` }}
            role="progressbar"
            aria-valuenow={clampedValue}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
