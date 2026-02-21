'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Gavel,
  Send,
  Upload,
  FileText,
  Image,
  File,
  Calendar,
  Clock,
  User,
  Bot,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Download,
  Paperclip,
  Scale,
  MessageSquare,
  FolderOpen,
  Award,
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
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, getStatusLabel } from '@/lib/utils';

interface DisputeMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'party' | 'arbitrator' | 'system';
  content: string;
  createdAt: string;
  avatar?: string;
}

interface Evidence {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

const mockDispute = {
  id: '1',
  disputeNumber: 'DIS-2025-001',
  contractId: '10',
  contractNumber: 'TAB-2025-00010',
  contractTitle: 'Compra e Venda - Equipamentos Industriais',
  type: 'quality',
  typeLabel: 'Qualidade do Produto',
  status: 'mediation' as const,
  value: 78000,
  openedAt: '2025-02-10T14:30:00',
  deadline: '2025-03-10',
  description:
    'Equipamentos adquiridos apresentaram defeitos de fabricacao. Tres das cinco maquinas entregues nao funcionam conforme as especificacoes tecnicas acordadas no contrato. O fornecedor foi notificado mas nao tomou providencias em 15 dias.',
  parties: [
    { name: 'Industria Forte Ltda', role: 'Reclamante', cpf: '12.345.678/0001-90' },
    { name: 'Fornecedor Global SA', role: 'Reclamado', cpf: '98.765.432/0001-10' },
  ],
  arbitrator: {
    name: 'Dr. Roberto Campos',
    oab: 'OAB/SP 123.456',
    specialty: 'Direito Comercial',
  },
  aiAnalysis: {
    riskLevel: 'medium' as const,
    summary:
      'Analise indica que a reclamacao possui fundamento, com evidencias de descumprimento das especificacoes tecnicas. Recomenda-se negociacao de substituicao dos equipamentos ou abatimento proporcional do valor.',
    recommendation:
      'Mediacao com proposta de substituicao dos 3 equipamentos defeituosos dentro de 30 dias, ou abatimento de 60% do valor total.',
    estimatedOutcome: 'Favoravel ao reclamante com probabilidade de 75%',
  },
};

const mockMessages: DisputeMessage[] = [
  {
    id: '1',
    senderId: 'system',
    senderName: 'Sistema',
    senderRole: 'system',
    content:
      'Disputa DIS-2025-001 aberta por Industria Forte Ltda. Motivo: Qualidade do Produto. Valor em disputa: R$ 78.000,00. Prazo para resolucao: 30 dias.',
    createdAt: '2025-02-10T14:30:00',
  },
  {
    id: '2',
    senderId: 'user1',
    senderName: 'Industria Forte Ltda',
    senderRole: 'party',
    content:
      'Conforme documentado, tres das cinco maquinas CNC adquiridas apresentaram defeitos graves. Ja enviamos o relatorio tecnico independente comprovando os problemas. Solicitamos a substituicao imediata dos equipamentos ou reembolso integral.',
    createdAt: '2025-02-10T15:00:00',
  },
  {
    id: '3',
    senderId: 'user2',
    senderName: 'Fornecedor Global SA',
    senderRole: 'party',
    content:
      'Tomamos conhecimento da reclamacao. Gostaríamos de ressaltar que as maquinas passaram por controle de qualidade antes do envio. Solicitamos acesso ao relatorio tecnico mencionado para nossa analise interna.',
    createdAt: '2025-02-11T10:20:00',
  },
  {
    id: '4',
    senderId: 'arbitrator',
    senderName: 'Dr. Roberto Campos',
    senderRole: 'arbitrator',
    content:
      'Prezados, assumi a mediacao desta disputa. Solicito que ambas as partes apresentem suas evidencias ate 20/02/2025. Apos analise, marcaremos uma sessao de mediacao virtual. Dr. Roberto Campos - Mediador',
    createdAt: '2025-02-12T09:00:00',
  },
  {
    id: '5',
    senderId: 'user1',
    senderName: 'Industria Forte Ltda',
    senderRole: 'party',
    content:
      'Dr. Roberto, encaminhamos o relatorio tecnico completo, fotos dos defeitos e o laudo do engenheiro independente. Todos os documentos foram anexados como evidencias nesta disputa.',
    createdAt: '2025-02-13T11:30:00',
  },
  {
    id: '6',
    senderId: 'system',
    senderName: 'IA Juridica',
    senderRole: 'system',
    content:
      'Analise automatica concluida. Risco: Medio. Recomendacao: Mediacao com proposta de substituicao dos 3 equipamentos defeituosos dentro de 30 dias, ou abatimento de 60% do valor total. Probabilidade de resultado favoravel ao reclamante: 75%.',
    createdAt: '2025-02-14T08:00:00',
  },
  {
    id: '7',
    senderId: 'user2',
    senderName: 'Fornecedor Global SA',
    senderRole: 'party',
    content:
      'Apos analise interna, reconhecemos que houve um problema no lote de fabricacao. Estamos dispostos a negociar a substituicao dos equipamentos defeituosos. Propomos envio de novos equipamentos em 45 dias uteis.',
    createdAt: '2025-02-15T16:45:00',
  },
];

const mockEvidence: Evidence[] = [
  {
    id: '1',
    name: 'Relatorio_Tecnico_Independente.pdf',
    type: 'application/pdf',
    size: 2456000,
    uploadedBy: 'Industria Forte Ltda',
    uploadedAt: '2025-02-13T11:25:00',
  },
  {
    id: '2',
    name: 'Fotos_Defeitos_Maquina1.zip',
    type: 'application/zip',
    size: 15200000,
    uploadedBy: 'Industria Forte Ltda',
    uploadedAt: '2025-02-13T11:26:00',
  },
  {
    id: '3',
    name: 'Laudo_Engenheiro.pdf',
    type: 'application/pdf',
    size: 1890000,
    uploadedBy: 'Industria Forte Ltda',
    uploadedAt: '2025-02-13T11:28:00',
  },
  {
    id: '4',
    name: 'Contrato_Original_Assinado.pdf',
    type: 'application/pdf',
    size: 890000,
    uploadedBy: 'Sistema',
    uploadedAt: '2025-02-10T14:30:00',
  },
  {
    id: '5',
    name: 'Certificado_Qualidade_Lote.pdf',
    type: 'application/pdf',
    size: 445000,
    uploadedBy: 'Fornecedor Global SA',
    uploadedAt: '2025-02-14T14:00:00',
  },
];

const disputeStatusColors: Record<string, string> = {
  opened: 'bg-blue-100 text-blue-700',
  mediation: 'bg-yellow-100 text-yellow-700',
  arbitration: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

const riskColors: Record<string, string> = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
};

const riskLabels: Record<string, string> = {
  low: 'Baixo',
  medium: 'Medio',
  high: 'Alto',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(type: string) {
  if (type.includes('pdf')) return FileText;
  if (type.includes('image')) return Image;
  return File;
}

export function generateStaticParams() {
  return [];
}

export default function DisputeDetailPage() {
  const [activeTab, setActiveTab] = useState('details');
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState(mockMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    const newMessage: DisputeMessage = {
      id: Date.now().toString(),
      senderId: 'user1',
      senderName: 'Industria Forte Ltda',
      senderRole: 'party',
      content: messageInput,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageInput('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/disputes">
            <Button variant="ghost" size="icon" className="mt-1 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {mockDispute.disputeNumber}
              </h1>
              <Badge
                className={
                  disputeStatusColors[mockDispute.status] ||
                  'bg-gray-100 text-gray-700'
                }
                variant="outline"
              >
                {getStatusLabel(mockDispute.status)}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {mockDispute.contractTitle}
            </p>
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Gavel className="h-3.5 w-3.5" />
                {mockDispute.typeLabel}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Aberta em{' '}
                {new Date(mockDispute.openedAt).toLocaleDateString('pt-BR')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Prazo:{' '}
                {new Date(mockDispute.deadline).toLocaleDateString('pt-BR')}
              </span>
              <span className="font-semibold text-foreground">
                {formatCurrency(mockDispute.value)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Detalhes
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="evidence" className="gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            Evidencias
          </TabsTrigger>
          <TabsTrigger value="decision" className="gap-1.5">
            <Award className="h-3.5 w-3.5" />
            Decisao
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Dispute Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Informacoes da Disputa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Numero
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {mockDispute.disputeNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Contrato
                    </p>
                    <Link
                      href={`/contracts/${mockDispute.contractId}`}
                      className="mt-1 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      {mockDispute.contractNumber}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Tipo
                    </p>
                    <p className="mt-1 text-sm">{mockDispute.typeLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Valor em Disputa
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {formatCurrency(mockDispute.value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Data de Abertura
                    </p>
                    <p className="mt-1 text-sm">
                      {new Date(mockDispute.openedAt).toLocaleDateString(
                        'pt-BR'
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Prazo
                    </p>
                    <p className="mt-1 text-sm">
                      {new Date(mockDispute.deadline).toLocaleDateString(
                        'pt-BR'
                      )}
                    </p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Descricao
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {mockDispute.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Parties and Arbitrator */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Partes Envolvidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockDispute.parties.map((party, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{party.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {party.cpf}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {party.role}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Scale className="h-4 w-4" />
                    Mediador
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100">
                      <Scale className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {mockDispute.arbitrator.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {mockDispute.arbitrator.oab}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {mockDispute.arbitrator.specialty}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Analysis */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4 text-primary" />
                    Analise da IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Nivel de Risco:
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        riskColors[mockDispute.aiAnalysis.riskLevel]
                      }`}
                    >
                      {riskLabels[mockDispute.aiAnalysis.riskLevel]}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Resumo
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">
                      {mockDispute.aiAnalysis.summary}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Recomendacao
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">
                      {mockDispute.aiAnalysis.recommendation}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Resultado Estimado
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {mockDispute.aiAnalysis.estimatedOutcome}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card className="flex h-[600px] flex-col">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">
                Discussao da Disputa
              </CardTitle>
              <CardDescription>
                {messages.length} mensagens trocadas
              </CardDescription>
            </CardHeader>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isSystem = message.senderRole === 'system';
                  const isArbitrator = message.senderRole === 'arbitrator';
                  const isCurrentUser = message.senderId === 'user1';

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        isCurrentUser ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          isSystem
                            ? 'bg-blue-100 text-blue-600'
                            : isArbitrator
                            ? 'bg-orange-100 text-orange-600'
                            : isCurrentUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isSystem ? (
                          <Bot className="h-4 w-4" />
                        ) : isArbitrator ? (
                          <Scale className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>

                      {/* Message Content */}
                      <div
                        className={`max-w-[70%] ${
                          isCurrentUser ? 'text-right' : ''
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          {!isCurrentUser && (
                            <span className="text-xs font-semibold">
                              {message.senderName}
                            </span>
                          )}
                          {isArbitrator && (
                            <Badge
                              variant="outline"
                              className="h-4 bg-orange-100 text-orange-700 text-[10px] px-1.5"
                            >
                              Mediador
                            </Badge>
                          )}
                          {isSystem && (
                            <Badge
                              variant="outline"
                              className="h-4 bg-blue-100 text-blue-700 text-[10px] px-1.5"
                            >
                              Sistema
                            </Badge>
                          )}
                        </div>
                        <div
                          className={`inline-block rounded-2xl px-4 py-2.5 text-sm ${
                            isSystem
                              ? 'bg-blue-50 dark:bg-blue-950/30 rounded-tl-sm text-blue-900 dark:text-blue-200'
                              : isArbitrator
                              ? 'bg-orange-50 dark:bg-orange-950/30 rounded-tl-sm text-orange-900 dark:text-orange-200'
                              : isCurrentUser
                              ? 'bg-primary text-primary-foreground rounded-tr-sm'
                              : 'bg-muted rounded-tl-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(message.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="shrink-0" title="Anexar arquivo">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && !e.shiftKey && handleSendMessage()
                  }
                  placeholder="Digite sua mensagem..."
                  className="flex-1 rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  size="icon"
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Evidence Tab */}
        <TabsContent value="evidence" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Evidencias ({mockEvidence.length})
              </h2>
              <p className="text-sm text-muted-foreground">
                Documentos e arquivos anexados a esta disputa
              </p>
            </div>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Enviar Evidencia
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {mockEvidence.map((evidence) => {
              const FileIcon = getFileIcon(evidence.type);
              return (
                <Card key={evidence.id}>
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {evidence.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(evidence.size)}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {evidence.uploadedBy}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(evidence.uploadedAt).toLocaleDateString(
                            'pt-BR'
                          )}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0" title="Baixar">
                      <Download className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Decision Tab */}
        <TabsContent value="decision" className="space-y-6">
          {mockDispute.status === 'resolved' || mockDispute.status === 'closed' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Decisao Final
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed">
                  A disputa foi resolvida por acordo entre as partes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                Aguardando Decisao
              </h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Esta disputa ainda esta em fase de{' '}
                {mockDispute.status === 'mediation'
                  ? 'mediacao'
                  : mockDispute.status === 'arbitration'
                  ? 'arbitragem'
                  : 'analise'}
                . A decisao sera publicada aqui quando o processo for concluido.
              </p>
              <div className="mt-6 rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Prazo para resolucao
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {new Date(mockDispute.deadline).toLocaleDateString('pt-BR')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {Math.max(
                    0,
                    Math.ceil(
                      (new Date(mockDispute.deadline).getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  )}{' '}
                  dias restantes
                </p>
              </div>

              {/* AI Preliminary Analysis */}
              <Card className="mt-6 w-full max-w-lg border-primary/20 text-left">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4 text-primary" />
                    Analise Preliminar da IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Recomendacao
                    </p>
                    <p className="mt-1 text-sm">
                      {mockDispute.aiAnalysis.recommendation}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Prognostico
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {mockDispute.aiAnalysis.estimatedOutcome}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Esta analise e gerada automaticamente e nao constitui
                    parecer juridico. Consulte um advogado para orientacao legal.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
