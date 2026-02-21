import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: "line" | "circle" | "rectangle";
  width?: string | number;
  height?: string | number;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, shape = "line", width, height, style, ...props }, ref) => {
    const shapeClasses = {
      line: "h-4 w-full rounded-md",
      circle: "h-10 w-10 rounded-full",
      rectangle: "h-24 w-full rounded-lg",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse-soft bg-muted",
          shapeClasses[shape],
          className
        )}
        style={{
          ...(width ? { width: typeof width === "number" ? `${width}px` : width } : {}),
          ...(height ? { height: typeof height === "number" ? `${height}px` : height } : {}),
          ...style,
        }}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

function SkeletonLine({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton shape="line" className={className} {...props} />;
}
SkeletonLine.displayName = "SkeletonLine";

function SkeletonCircle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton shape="circle" className={className} {...props} />;
}
SkeletonCircle.displayName = "SkeletonCircle";

function SkeletonRectangle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton shape="rectangle" className={className} {...props} />;
}
SkeletonRectangle.displayName = "SkeletonRectangle";

function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border p-6 space-y-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <Skeleton shape="circle" className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton shape="line" className="h-4 w-3/4" />
          <Skeleton shape="line" className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton shape="line" className="h-4 w-full" />
      <Skeleton shape="line" className="h-4 w-5/6" />
      <Skeleton shape="line" className="h-4 w-2/3" />
    </div>
  );
}
SkeletonCard.displayName = "SkeletonCard";

function SkeletonTableRow({ columns = 4, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { columns?: number }) {
  return (
    <div
      className={cn("flex items-center gap-4 py-3", className)}
      {...props}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          shape="line"
          className={cn(
            "h-4",
            i === 0 ? "w-1/4" : i === columns - 1 ? "w-20" : "flex-1"
          )}
        />
      ))}
    </div>
  );
}
SkeletonTableRow.displayName = "SkeletonTableRow";

export {
  Skeleton,
  SkeletonLine,
  SkeletonCircle,
  SkeletonRectangle,
  SkeletonCard,
  SkeletonTableRow,
};
