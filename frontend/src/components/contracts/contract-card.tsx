"use client";

import Link from "next/link";
import {
  FileText,
  Home,
  Briefcase,
  ShoppingCart,
  Shield,
  Users,
  Banknote,
  File,
  Calendar,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import type { ContractType } from "@/types";

interface ContractCardProps {
  id: string;
  title: string;
  type: ContractType;
  status: string;
  parties: { name: string; avatar?: string }[];
  value: number;
  expiresAt?: string;
  paidInstallments?: number;
  totalInstallments?: number;
}

const typeIcons: Record<ContractType, typeof FileText> = {
  rental: Home,
  service: Briefcase,
  purchase: ShoppingCart,
  employment: Users,
  nda: Shield,
  partnership: Users,
  loan: Banknote,
  custom: File,
};

const typeLabels: Record<ContractType, string> = {
  rental: "Aluguel",
  service: "Servico",
  purchase: "Compra/Venda",
  employment: "Trabalho",
  nda: "NDA",
  partnership: "Sociedade",
  loan: "Emprestimo",
  custom: "Personalizado",
};

export function ContractCard({
  id,
  title,
  type,
  status,
  parties,
  value,
  expiresAt,
  paidInstallments = 0,
  totalInstallments = 0,
}: ContractCardProps) {
  const Icon = typeIcons[type] || FileText;
  const paymentProgress =
    totalInstallments > 0
      ? Math.round((paidInstallments / totalInstallments) * 100)
      : 0;

  return (
    <div className="contract-card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold leading-tight">{title}</h3>
            <p className="text-xs text-muted-foreground">
              {typeLabels[type] || type}
            </p>
          </div>
        </div>
        <Badge className={getStatusColor(status)} variant="outline">
          {getStatusLabel(status)}
        </Badge>
      </div>

      {/* Parties */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex -space-x-2">
          {parties.slice(0, 3).map((party, index) => (
            <Avatar key={index} className="h-7 w-7 border-2 border-card">
              <AvatarFallback className="bg-muted text-[10px]">
                {party.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          ))}
          {parties.length > 3 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium">
              +{parties.length - 3}
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {parties.length} parte{parties.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Value and Date */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Valor</p>
          <p className="font-semibold">
            {value > 0 ? formatCurrency(value) : "--"}
          </p>
        </div>
        {expiresAt && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Vencimento</p>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <p className="text-sm">
                {new Date(expiresAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Payment Progress */}
      {totalInstallments > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Pagamentos</span>
            <span className="font-medium">
              {paidInstallments}/{totalInstallments}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${paymentProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <Link href={`/contracts/${id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <Eye className="h-3.5 w-3.5" />
            Ver Detalhes
          </Button>
        </Link>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
