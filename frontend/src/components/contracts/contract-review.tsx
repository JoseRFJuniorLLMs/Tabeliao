"use client";

import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  BookOpen,
  Lightbulb,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContractReview, ReviewIssue, LegalReference } from "@/types";

interface ContractReviewDisplayProps {
  review: ContractReview;
}

function RiskGauge({ score }: { score: number }) {
  const angle = (score / 100) * 180;
  const color =
    score <= 30
      ? "#22c55e"
      : score <= 60
      ? "#f59e0b"
      : score <= 80
      ? "#f97316"
      : "#ef4444";
  const label =
    score <= 30
      ? "Baixo Risco"
      : score <= 60
      ? "Risco Moderado"
      : score <= 80
      ? "Risco Alto"
      : "Risco Critico";

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-48 overflow-hidden">
        <svg viewBox="0 0 200 100" className="h-full w-full">
          {/* Background arc */}
          <path
            d="M 10 95 A 90 90 0 0 1 190 95"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Colored arc */}
          <path
            d="M 10 95 A 90 90 0 0 1 190 95"
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${(angle / 180) * 283} 283`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-3xl font-bold" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <span className="mt-1 text-sm font-medium" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

function IssueCard({ issue }: { issue: ReviewIssue }) {
  const severityConfig = {
    info: {
      icon: Info,
      label: "INFORMATIVO",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      badge: "bg-blue-100 text-blue-700",
    },
    warning: {
      icon: AlertTriangle,
      label: "ATENCAO",
      color: "text-yellow-600",
      bg: "bg-yellow-50 dark:bg-yellow-950/30",
      badge: "bg-yellow-100 text-yellow-700",
    },
    critical: {
      icon: AlertCircle,
      label: "CRITICO",
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/30",
      badge: "bg-red-100 text-red-700",
    },
  };

  const config = severityConfig[issue.severity];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border p-4 ${config.bg}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.color}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">{issue.title}</h4>
            <Badge className={config.badge} variant="outline">
              {config.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {issue.description}
          </p>
          {issue.clause && (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium">Clausula:</span> {issue.clause}
            </p>
          )}
          {issue.suggestion && (
            <div className="mt-2 flex items-start gap-2 rounded-md bg-card p-2">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
              <p className="text-xs">{issue.suggestion}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LegalReferenceItem({ reference }: { reference: LegalReference }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="text-sm font-medium">
          {reference.code} - Art. {reference.article}
        </p>
        <p className="text-xs text-muted-foreground">
          {reference.description}
        </p>
      </div>
    </div>
  );
}

export function ContractReviewDisplay({
  review,
}: ContractReviewDisplayProps) {
  const criticalCount = review.issues.filter(
    (i) => i.severity === "critical"
  ).length;
  const warningCount = review.issues.filter(
    (i) => i.severity === "warning"
  ).length;
  const infoCount = review.issues.filter(
    (i) => i.severity === "info"
  ).length;

  return (
    <div className="space-y-6">
      {/* Risk Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            Analise de Risco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center sm:flex-row sm:items-start sm:gap-8">
            <RiskGauge score={review.riskScore} />
            <div className="mt-4 flex-1 sm:mt-0">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {criticalCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Criticos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">
                    {warningCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Atencao</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">
                    {infoCount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Informativos
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Revisao realizada em{" "}
                {new Date(review.reviewedAt).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Problemas Encontrados ({review.issues.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {review.issues.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg bg-green-50 dark:bg-green-950/30 p-4">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Nenhum problema critico encontrado!
              </p>
            </div>
          ) : (
            review.issues
              .sort((a, b) => {
                const order = { critical: 0, warning: 1, info: 2 };
                return order[a.severity] - order[b.severity];
              })
              .map((issue) => <IssueCard key={issue.id} issue={issue} />)
          )}
        </CardContent>
      </Card>

      {/* Suggestions */}
      {review.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-secondary" />
              Sugestoes de Melhoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {review.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Legal References */}
      {review.legalReferences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5 text-primary" />
              Referencias Legais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {review.legalReferences.map((ref, index) => (
              <LegalReferenceItem key={index} reference={ref} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
