'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  PenTool,
  Download,
  XCircle,
  Copy,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  User,
  Mail,
  CreditCard,
  Calendar,
  Shield,
  Hash,
  DollarSign,
  Users,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils';

interface Clause {
  id: string;
  number: number;
  title: string;
  content: string;
}

interface Signatory {
  id: string;
  name: string;
  email: string;
  cpf: string;
  role: string;
  status: 'signed' | 'pending';
  signedAt?: string;
  ipAddress?: string;
}

interface TimelineEvent {
  id: string;
  type: 'created' | 'sent' | 'signed' | 'payment' | 'update' | 'review';
  title: string;
  description: string;
  createdAt: string;
  actor: string;
}

interface PaymentItem {
  id: string;
  installment: number;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  paidAt?: string;
}

const mockContract = {
  id: '1',
  contractNumber: 'TAB-2025-00001',
  title: 'Contrato de Aluguel - Apartamento 302, Ed. Solar',
  type: 'Aluguel',
  status: 'active',
  value: 2500,
  currency: 'BRL',
  createdAt: '2025-02-15T10:30:00',
  updatedAt: '2025-02-18T14:20:00',
  expiresAt: '2026-02-15',
  signedAt: '2025-02-16T09:00:00',
  blockchainHash: '0x7f3a...b2c4',
  blockchainNetwork: 'Polygon',
};

const mockClauses: Clause[] = [
  {
    id: '1',
    number: 1,
    title: 'DO OBJETO',
    content:
      'O presente contrato tem por objeto a locacao do imovel situado na Rua das Flores, 123, Apartamento 302, Edificio Solar, bairro Centro, cidade de Sao Paulo - SP, CEP 01010-001, de uso exclusivamente residencial.',
  },
  {
    id: '2',
    number: 2,
    title: 'DO PRAZO',
    content:
      'O prazo de locacao e de 12 (doze) meses, com inicio em 15 de fevereiro de 2025 e termino em 15 de fevereiro de 2026, podendo ser prorrogado por acordo entre as partes mediante aditivo contratual.',
  },
  {
    id: '3',
    number: 3,
    title: 'DO VALOR E FORMA DE PAGAMENTO',
    content:
      'O valor mensal do aluguel e de R$ 2.500,00 (dois mil e quinhentos reais), que devera ser pago ate o dia 10 (dez) de cada mes, mediante transferencia bancaria ou PIX para a conta indicada pelo LOCADOR.',
  },
  {
    id: '4',
    number: 4,
    title: 'DO REAJUSTE',
    content:
      'O valor do aluguel sera reajustado anualmente com base na variacao do IGPM/FGV acumulado nos ultimos 12 meses, ou pelo indice que vier a substitui-lo oficialmente.',
  },
  {
    id: '5',
    number: 5,
    title: 'DA CAUCAO',
    content:
      'A titulo de garantia, o LOCATARIO depositara o valor equivalente a 3 (tres) meses de aluguel, totalizando R$ 7.500,00 (sete mil e quinhentos reais), que sera devolvido ao final do contrato, corrigido monetariamente, descontados eventuais debitos.',
  },
  {
    id: '6',
    number: 6,
    title: 'DAS OBRIGACOES DO LOCATARIO',
    content:
      'O LOCATARIO obriga-se a: (a) pagar pontualmente o aluguel e encargos; (b) manter o imovel em bom estado de conservacao; (c) nao sublocar ou ceder o imovel sem autorizacao; (d) respeitar as normas do condominio; (e) permitir vistorias mediante agendamento previo.',
  },
  {
    id: '7',
    number: 7,
    title: 'DA RESCISAO',
    content:
      'O contrato podera ser rescindido antecipadamente por qualquer das partes, mediante aviso previo de 30 (trinta) dias. Em caso de rescisao antecipada pelo LOCATARIO antes do decimo segundo mes, incidira multa proporcional ao periodo restante.',
  },
  {
    id: '8',
    number: 8,
    title: 'DO FORO',
    content:
      'As partes elegem o foro da Comarca de Sao Paulo - SP para dirimir quaisquer controversias oriundas do presente contrato, com renuncia expressa a qualquer outro, por mais privilegiado que seja.',
  },
];

const mockSignatories: Signatory[] = [
  {
    id: '1',
    name: 'Maria Helena Silva',
    email: 'maria.silva@email.com',
    cpf: '123.456.789-00',
    role: 'Locador(a)',
    status: 'signed',
    signedAt: '2025-02-16T09:15:00',
    ipAddress: '189.45.xx.xx',
  },
  {
    id: '2',
    name: 'Joao Carlos Santos',
    email: 'joao.santos@email.com',
    cpf: '987.654.321-00',
    role: 'Locatario(a)',
    status: 'signed',
    signedAt: '2025-02-16T10:30:00',
    ipAddress: '201.12.xx.xx',
  },
  {
    id: '3',
    name: 'Ana Paula Costa',
    email: 'ana.costa@email.com',
    cpf: '456.789.123-00',
    role: 'Testemunha',
    status: 'pending',
  },
];

const mockTimeline: TimelineEvent[] = [
  {
    id: '1',
    type: 'created',
    title: 'Contrato criado',
    description: 'Contrato gerado via assistente IA',
    createdAt: '2025-02-15T10:30:00',
    actor: 'Maria Helena Silva',
  },
  {
    id: '2',
    type: 'review',
    title: 'Revisao da IA concluida',
    description: 'Analise de risco: Baixo (Score 25/100). 0 problemas criticos encontrados.',
    createdAt: '2025-02-15T10:32:00',
    actor: 'Sistema',
  },
  {
    id: '3',
    type: 'sent',
    title: 'Enviado para assinatura',
    description: 'Contrato enviado para Joao Carlos Santos e Ana Paula Costa',
    createdAt: '2025-02-15T11:00:00',
    actor: 'Maria Helena Silva',
  },
  {
    id: '4',
    type: 'signed',
    title: 'Assinatura - Locador(a)',
    description: 'Maria Helena Silva assinou o contrato digitalmente',
    createdAt: '2025-02-16T09:15:00',
    actor: 'Maria Helena Silva',
  },
  {
    id: '5',
    type: 'signed',
    title: 'Assinatura - Locatario(a)',
    description: 'Joao Carlos Santos assinou o contrato digitalmente',
    createdAt: '2025-02-16T10:30:00',
    actor: 'Joao Carlos Santos',
  },
  {
    id: '6',
    type: 'update',
    title: 'Contrato ativado',
    description: 'Contrato registrado na blockchain (Polygon). Hash: 0x7f3a...b2c4',
    createdAt: '2025-02-16T10:31:00',
    actor: 'Sistema',
  },
  {
    id: '7',
    type: 'payment',
    title: 'Pagamento recebido',
    description: 'Primeira parcela de R$ 2.500,00 recebida via PIX',
    createdAt: '2025-02-18T14:20:00',
    actor: 'Joao Carlos Santos',
  },
];

const mockPayments: PaymentItem[] = [
  {
    id: '1',
    installment: 1,
    amount: 2500,
    dueDate: '2025-03-10',
    status: 'paid',
    paidAt: '2025-02-18T14:20:00',
  },
  {
    id: '2',
    installment: 2,
    amount: 2500,
    dueDate: '2025-04-10',
    status: 'pending',
  },
  {
    id: '3',
    installment: 3,
    amount: 2500,
    dueDate: '2025-05-10',
    status: 'pending',
  },
  {
    id: '4',
    installment: 4,
    amount: 2500,
    dueDate: '2025-06-10',
    status: 'pending',
  },
  {
    id: '5',
    installment: 5,
    amount: 2500,
    dueDate: '2025-07-10',
    status: 'pending',
  },
  {
    id: '6',
    installment: 6,
    amount: 2500,
    dueDate: '2025-08-10',
    status: 'pending',
  },
];

const timelineIconMap: Record<string, React.ElementType> = {
  created: FileText,
  sent: Mail,
  signed: PenTool,
  payment: DollarSign,
  update: Shield,
  review: Shield,
};

const timelineColorMap: Record<string, string> = {
  created: 'bg-blue-100 text-blue-600',
  sent: 'bg-purple-100 text-purple-600',
  signed: 'bg-green-100 text-green-600',
  payment: 'bg-emerald-100 text-emerald-600',
  update: 'bg-orange-100 text-orange-600',
  review: 'bg-cyan-100 text-cyan-600',
};

export function generateStaticParams() {
  return [];
}

export default function ContractDetailPage() {
  const [activeTab, setActiveTab] = useState('details');
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(
    new Set(['1'])
  );

  const toggleClause = (id: string) => {
    setExpandedClauses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAllClauses = () => {
    setExpandedClauses(new Set(mockClauses.map((c) => c.id)));
  };

  const collapseAllClauses = () => {
    setExpandedClauses(new Set());
  };

  const signedCount = mockSignatories.filter((s) => s.status === 'signed').length;
  const paidPayments = mockPayments.filter((p) => p.status === 'paid');
  const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/contracts">
            <Button variant="ghost" size="icon" className="mt-1 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{mockContract.contractNumber}</h1>
              <Badge
                className={getStatusColor(mockContract.status)}
                variant="outline"
              >
                {getStatusLabel(mockContract.status)}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">{mockContract.title}</p>
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {mockContract.type}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Criado em{' '}
                {new Date(mockContract.createdAt).toLocaleDateString('pt-BR')}
              </span>
              {mockContract.blockchainHash && (
                <span className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  Blockchain: {mockContract.blockchainNetwork}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
          <Button className="gap-2">
            <PenTool className="h-4 w-4" />
            Assinar
          </Button>
          <Button variant="destructive" className="gap-2">
            <XCircle className="h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="clauses">Clausulas</TabsTrigger>
          <TabsTrigger value="signatures">Assinaturas</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Contract Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informacoes do Contrato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Numero
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {mockContract.contractNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Tipo
                    </p>
                    <p className="mt-1 text-sm font-medium">{mockContract.type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Valor
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {formatCurrency(mockContract.value)}/mes
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Status
                    </p>
                    <Badge
                      className={`mt-1 ${getStatusColor(mockContract.status)}`}
                      variant="outline"
                    >
                      {getStatusLabel(mockContract.status)}
                    </Badge>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Data de Criacao
                      </p>
                      <p className="mt-1 text-sm">
                        {new Date(mockContract.createdAt).toLocaleDateString(
                          'pt-BR'
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Assinado em
                      </p>
                      <p className="mt-1 text-sm">
                        {mockContract.signedAt
                          ? new Date(mockContract.signedAt).toLocaleDateString(
                              'pt-BR'
                            )
                          : '--'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Vigencia ate
                      </p>
                      <p className="mt-1 text-sm">
                        {mockContract.expiresAt
                          ? new Date(mockContract.expiresAt).toLocaleDateString(
                              'pt-BR'
                            )
                          : '--'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Ultima Atualizacao
                      </p>
                      <p className="mt-1 text-sm">
                        {new Date(mockContract.updatedAt).toLocaleDateString(
                          'pt-BR'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                {mockContract.blockchainHash && (
                  <div className="border-t pt-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Registro Blockchain
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 text-xs">
                        {mockContract.blockchainHash}
                      </code>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Rede: {mockContract.blockchainNetwork}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Parties */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Partes Envolvidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockSignatories.map((signatory) => (
                  <div
                    key={signatory.id}
                    className="flex items-start justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{signatory.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {signatory.role}
                        </p>
                        <div className="mt-2 space-y-1">
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {signatory.email}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CreditCard className="h-3 w-3" />
                            CPF: {signatory.cpf}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        signatory.status === 'signed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }
                    >
                      {signatory.status === 'signed' ? 'Assinado' : 'Pendente'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Clauses Tab */}
        <TabsContent value="clauses" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Clausulas do Contrato ({mockClauses.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={expandAllClauses}>
                  Expandir Todas
                </Button>
                <Button variant="ghost" size="sm" onClick={collapseAllClauses}>
                  Recolher Todas
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {mockClauses.map((clause) => {
                const isExpanded = expandedClauses.has(clause.id);
                return (
                  <div
                    key={clause.id}
                    className="rounded-lg border transition-colors"
                  >
                    <button
                      className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
                      onClick={() => toggleClause(clause.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {clause.number}
                        </span>
                        <span className="font-medium">{clause.title}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="border-t px-4 pb-4 pt-3">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {clause.content}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signatures Tab */}
        <TabsContent value="signatures" className="space-y-6">
          {/* Progress */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Progresso de Assinaturas</p>
                  <p className="text-xs text-muted-foreground">
                    {signedCount} de {mockSignatories.length} assinaturas
                    coletadas
                  </p>
                </div>
                <span className="text-2xl font-bold">
                  {Math.round(
                    (signedCount / mockSignatories.length) * 100
                  )}
                  %
                </span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{
                    width: `${(signedCount / mockSignatories.length) * 100}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Signatories List */}
          <div className="space-y-3">
            {mockSignatories.map((signatory) => (
              <Card key={signatory.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${
                          signatory.status === 'signed'
                            ? 'bg-green-100'
                            : 'bg-yellow-100'
                        }`}
                      >
                        {signatory.status === 'signed' ? (
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        ) : (
                          <Clock className="h-6 w-6 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{signatory.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {signatory.role}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {signatory.email}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Hash className="h-3 w-3" />
                            CPF: {signatory.cpf}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          signatory.status === 'signed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }
                      >
                        {signatory.status === 'signed'
                          ? 'Assinado'
                          : 'Pendente'}
                      </Badge>
                      {signatory.signedAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(signatory.signedAt).toLocaleString('pt-BR')}
                        </p>
                      )}
                      {signatory.ipAddress && (
                        <p className="text-xs text-muted-foreground">
                          IP: {signatory.ipAddress}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historico de Eventos</CardTitle>
              <CardDescription>
                Todas as acoes e eventos deste contrato
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-0">
                {mockTimeline.map((event, index) => {
                  const Icon = timelineIconMap[event.type] || FileText;
                  const colorClass =
                    timelineColorMap[event.type] || 'bg-gray-100 text-gray-600';
                  const isLast = index === mockTimeline.length - 1;

                  return (
                    <div key={event.id} className="relative flex gap-4 pb-8">
                      {/* Line */}
                      {!isLast && (
                        <div className="absolute left-5 top-10 h-full w-px bg-border" />
                      )}
                      {/* Icon */}
                      <div
                        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colorClass}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {/* Content */}
                      <div className="flex-1 pt-0.5">
                        <p className="font-medium">{event.title}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {event.description}
                        </p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(event.createdAt).toLocaleString('pt-BR')}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {event.actor}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground">
                  Total Pago
                </p>
                <p className="mt-1 text-2xl font-bold text-green-600">
                  {formatCurrency(totalPaid)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {paidPayments.length} de {mockPayments.length} parcelas
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground">
                  Pendente
                </p>
                <p className="mt-1 text-2xl font-bold text-yellow-600">
                  {formatCurrency(
                    mockPayments
                      .filter((p) => p.status === 'pending')
                      .reduce((sum, p) => sum + p.amount, 0)
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mockPayments.filter((p) => p.status === 'pending').length}{' '}
                  parcelas restantes
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground">
                  Valor Total do Contrato
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {formatCurrency(
                    mockPayments.reduce((sum, p) => sum + p.amount, 0)
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mockPayments.length} parcelas de{' '}
                  {formatCurrency(mockContract.value)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payments Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.installment}/{mockPayments.length}
                      </TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        {new Date(payment.dueDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getStatusColor(payment.status)}
                          variant="outline"
                        >
                          {getStatusLabel(payment.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment.paidAt
                          ? new Date(payment.paidAt).toLocaleDateString('pt-BR')
                          : '--'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
