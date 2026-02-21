import * as React from "react";
import { cn } from "@/lib/utils";
import { getStatusLabel } from "@/lib/utils";

const statusConfig: Record<
  string,
  { color: string; dotColor: string; label: string }
> = {
  // Contract statuses
  draft: {
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    dotColor: "bg-gray-500",
    label: "Rascunho",
  },
  pending_signature: {
    color:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    dotColor: "bg-yellow-500",
    label: "Aguardando Assinatura",
  },
  active: {
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    dotColor: "bg-blue-500",
    label: "Ativo",
  },
  completed: {
    color:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    dotColor: "bg-green-500",
    label: "Concluido",
  },
  expired: {
    color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    dotColor: "bg-red-500",
    label: "Expirado",
  },
  cancelled: {
    color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    dotColor: "bg-red-500",
    label: "Cancelado",
  },
  disputed: {
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    dotColor: "bg-orange-500",
    label: "Em Disputa",
  },

  // Payment statuses
  pending: {
    color:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    dotColor: "bg-yellow-500",
    label: "Pendente",
  },
  paid: {
    color:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    dotColor: "bg-green-500",
    label: "Pago",
  },
  overdue: {
    color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    dotColor: "bg-red-500",
    label: "Atrasado",
  },
  in_escrow: {
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    dotColor: "bg-blue-500",
    label: "Em Escrow",
  },
  released: {
    color:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    dotColor: "bg-green-500",
    label: "Liberado",
  },
  refunded: {
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    dotColor: "bg-purple-500",
    label: "Reembolsado",
  },

  // Dispute statuses
  opened: {
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    dotColor: "bg-orange-500",
    label: "Aberta",
  },
  mediation: {
    color:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    dotColor: "bg-yellow-500",
    label: "Mediacao",
  },
  arbitration: {
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    dotColor: "bg-orange-500",
    label: "Arbitragem",
  },
  resolved: {
    color:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    dotColor: "bg-green-500",
    label: "Resolvida",
  },
  closed: {
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    dotColor: "bg-gray-500",
    label: "Encerrada",
  },

  // KYC statuses
  verified: {
    color:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    dotColor: "bg-green-500",
    label: "Verificado",
  },
  rejected: {
    color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    dotColor: "bg-red-500",
    label: "Rejeitado",
  },
};

const defaultConfig = {
  color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  dotColor: "bg-gray-500",
  label: "",
};

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  showDot?: boolean;
  size?: "sm" | "md";
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status, showDot = true, size = "md", ...props }, ref) => {
    const config = statusConfig[status] || defaultConfig;
    const label = config.label || getStatusLabel(status) || status;

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-medium",
          size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs",
          config.color,
          className
        )}
        {...props}
      >
        {showDot && (
          <span
            className={cn(
              "shrink-0 rounded-full",
              size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
              config.dotColor
            )}
          />
        )}
        {label}
      </span>
    );
  }
);
StatusBadge.displayName = "StatusBadge";

export { StatusBadge, statusConfig };
