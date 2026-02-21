"use client";

import Link from "next/link";
import {
  Brain,
  FileText,
  Shield,
  Activity,
  Scale,
  ArrowRight,
  CheckCircle,
  Pen,
  Lock,
  Gavel,
  ChevronRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Brain,
    title: "IA Juridica",
    description:
      "Inteligencia artificial especializada em direito brasileiro. Gera, revisa e analisa contratos com precisao juridica.",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    icon: FileText,
    title: "Smart Contracts",
    description:
      "Contratos inteligentes com execucao automatica de clausulas, pagamentos e prazos registrados em blockchain.",
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    icon: Shield,
    title: "Identidade Segura",
    description:
      "Verificacao de identidade com KYC completo, integracao Gov.br e assinatura digital com validade juridica.",
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/30",
  },
  {
    icon: Activity,
    title: "Contrato Vivo",
    description:
      "Monitoramento em tempo real de obrigacoes, pagamentos e prazos. Alertas automaticos e relatorios de compliance.",
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/30",
  },
  {
    icon: Scale,
    title: "Tribunal Digital",
    description:
      "Resolucao de disputas online com mediacao automatizada, arbitragem digital e analise de risco por IA.",
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/30",
  },
];

const steps = [
  {
    number: "01",
    icon: Pen,
    title: "Descreva",
    description:
      "Diga o que precisa em linguagem simples. Nossa IA transforma sua necessidade em um contrato juridicamente valido.",
  },
  {
    number: "02",
    icon: CheckCircle,
    title: "Assine",
    description:
      "Todas as partes assinam digitalmente com validade juridica. Verificacao de identidade integrada.",
  },
  {
    number: "03",
    icon: Lock,
    title: "Garanta",
    description:
      "Pagamentos automaticos via escrow, monitoramento de clausulas e registro em blockchain imutavel.",
  },
  {
    number: "04",
    icon: Gavel,
    title: "Resolva",
    description:
      "Disputas resolvidas de forma rapida com mediacao automatizada e tribunal digital integrado.",
  },
];

const plans = [
  {
    name: "Gratis",
    price: 0,
    period: "para sempre",
    description: "Para conhecer a plataforma",
    features: [
      "Ate 3 contratos/mes",
      "Revisao basica por IA",
      "Assinatura digital",
      "Templates essenciais",
      "Suporte por email",
    ],
    highlighted: false,
    cta: "Comecar Gratis",
  },
  {
    name: "Pro",
    price: 49,
    period: "/mes",
    description: "Para profissionais e pequenas empresas",
    features: [
      "Contratos ilimitados",
      "IA avancada com revisao completa",
      "Smart contracts com automacao",
      "Pagamentos via escrow",
      "Registro em blockchain",
      "Resolucao de disputas",
      "Suporte prioritario",
      "Relatorios e analytics",
    ],
    highlighted: true,
    cta: "Assinar Pro",
  },
  {
    name: "Business",
    price: 199,
    period: "/mes",
    description: "Para empresas e escritorios",
    features: [
      "Tudo do Pro",
      "Ate 50 usuarios",
      "API completa",
      "White-label",
      "Integracao ERP/CRM",
      "SLA garantido 99.9%",
      "Gerente de conta dedicado",
      "Treinamento personalizado",
      "Customizacao de templates",
    ],
    highlighted: false,
    cta: "Falar com Vendas",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-primary">
              Tabeliao
            </span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Funcionalidades
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Como Funciona
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Precos
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Criar Conta</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-[0.03]" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
              Plataforma de Contratos com IA
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Contratos que se escrevem, se fiscalizam e se{" "}
              <span className="text-gradient">pagam sozinhos</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              O cartorio digital inteligente do Brasil. Crie contratos com IA,
              assine digitalmente, automatize pagamentos e resolva disputas
              -- tudo em uma unica plataforma.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="gap-2 px-8">
                  Comecar Gratis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg" className="px-8">
                  Ver Demonstracao
                </Button>
              </Link>
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Sem cartao de credito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Validade juridica</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Blockchain imutavel</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t bg-muted/30 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Tudo que voce precisa em um so lugar
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Uma plataforma completa para gerenciar todo o ciclo de vida
              dos seus contratos com seguranca e inteligencia.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group border-0 shadow-sm transition-all hover:shadow-lg"
              >
                <CardHeader>
                  <div
                    className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg}`}
                  >
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Como funciona
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Quatro passos simples para revolucionar a gestao dos seus
              contratos.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="relative text-center">
                {index < steps.length - 1 && (
                  <div className="absolute right-0 top-12 hidden w-full translate-x-1/2 lg:block">
                    <ChevronRight className="mx-auto h-6 w-6 text-muted-foreground/30" />
                  </div>
                )}
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-secondary">
                  Passo {step.number}
                </div>
                <h3 className="mb-3 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="border-t bg-muted/30 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Planos para todos os tamanhos
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Comece gratis e escale conforme sua necessidade. Sem surpresas.
            </p>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.highlighted
                    ? "border-2 border-secondary shadow-xl scale-105"
                    : "border shadow-sm"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-secondary text-secondary-foreground px-4 py-1 gap-1">
                      <Star className="h-3 w-3" />
                      Mais Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      {plan.price === 0
                        ? "R$0"
                        : `R$${plan.price}`}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-6 pt-0">
                  <Link href="/register">
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? "default" : "outline"}
                      size="lg"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Plano Business com preco customizado: de R$199 a R$999/mes
            dependendo do numero de usuarios e funcionalidades.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl gradient-hero px-8 py-16 text-center sm:px-16">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Pronto para digitalizar seus contratos?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-blue-100">
              Junte-se a milhares de empresas que ja usam o Tabeliao para
              gerenciar contratos de forma inteligente.
            </p>
            <div className="mt-8">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary-400 gap-2 px-8"
                >
                  Criar Conta Gratis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Scale className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold text-primary">
                  Tabeliao
                </span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                O cartorio digital inteligente do Brasil. Contratos com IA,
                assinatura digital e blockchain.
              </p>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#features" className="hover:text-foreground">
                    Funcionalidades
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-foreground">
                    Precos
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    API & Integracoes
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Templates
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground">
                    Sobre nos
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Carreiras
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Contato
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground">
                    Termos de Uso
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Politica de Privacidade
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    LGPD
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Seguranca
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>
              2024 Tabeliao. Todos os direitos reservados. CNPJ:
              00.000.000/0001-00
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
