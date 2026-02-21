'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Gavel,
  Scale,
  CheckCircle,
  AlertTriangle,
  Search,
  Plus,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquare,
  Clock,
  FileText,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StatsCard } from '@/components/dashboard/stats-card';
import { formatCurrency, getStatusLabel } from '@/lib/utils';

interface DisputeRow {
  id: string;
  disputeNumber: string;
  contractId: string;
  contractNumber: string;
  contractTitle: string;
  type: 'breach' | 'payment' | 'quality' | 'termination' | 'other';
  status: 'opened' | 'mediation' | 'arbitration' | 'resolved' | 'closed';
  value: number;
  openedAt: string;
  deadline: string;
  messagesCount: number;
  evidenceCount: number;
}

const mockDisputes: DisputeRow[] = [
  {
    id: '1',
    disputeNumber: 'DIS-2025-001',
    contractId: '10',
    contractNumber: 'TAB-2025-00010',
    contractTitle: 'Compra e Venda - Equipamentos',
    type: 'quality',
    status: 'mediation',
    value: 78000,
    openedAt: '2025-02-10',
    deadline: '2025-03-10',
    messagesCount: 12,
    evidenceCount: 5,
  },
  {
    id: '2',
    disputeNumber: 'DIS-2025-002',
    contractId: '8',
    contractNumber: 'TAB-2025-00008',
    contractTitle: 'Consultoria - Cancelamento Indevido',
    type: 'termination',
    status: 'arbitration',
    value: 15000,
    openedAt: '2025-02-05',
    deadline: '2025-03-05',
    messagesCount: 8,
    evidenceCount: 3,
  },
  {
    id: '3',
    disputeNumber: 'DIS-2025-003',
    contractId: '6',
    contractNumber: 'TAB-2025-00006',
    contractTitle: 'Freelancer - Atraso na Entrega',
    type: 'breach',
    status: 'mediation',
    value: 12000,
    openedAt: '2025-02-12',
    deadline: '2025-03-12',
    messagesCount: 6,
    evidenceCount: 2,
  },
  {
    id: '4',
    disputeNumber: 'DIS-2024-015',
    contractId: '20',
    contractNumber: 'TAB-2024-00045',
    contractTitle: 'Aluguel - Danos ao Imovel',
    type: 'breach',
    status: 'resolved',
    value: 5000,
    openedAt: '2024-12-01',
    deadline: '2025-01-01',
    messagesCount: 20,
    evidenceCount: 8,
  },
  {
    id: '5',
    disputeNumber: 'DIS-2024-016',
    contractId: '25',
    contractNumber: 'TAB-2024-00050',
    contractTitle: 'Servico - Pagamento Nao Efetuado',
    type: 'payment',
    status: 'resolved',
    value: 3200,
    openedAt: '2024-11-15',
    deadline: '2024-12-15',
    messagesCount: 15,
    evidenceCount: 4,
  },
  {
    id: '6',
    disputeNumber: 'DIS-2024-012',
    contractId: '18',
    contractNumber: 'TAB-2024-00038',
    contractTitle: 'Compra e Venda - Defeito no Produto',
    type: 'quality',
    status: 'closed',
    value: 2800,
    openedAt: '2024-10-20',
    deadline: '2024-11-20',
    messagesCount: 10,
    evidenceCount: 6,
  },
];

const typeLabels: Record<string, string> = {
  breach: 'Descumprimento',
  payment: 'Pagamento',
  quality: 'Qualidade',
  termination: 'Rescisao',
  other: 'Outro',
};

const disputeStatusColors: Record<string, string> = {
  opened: 'bg-blue-100 text-blue-700',
  mediation: 'bg-yellow-100 text-yellow-700',
  arbitration: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'opened', label: 'Aberta' },
  { value: 'mediation', label: 'Em Mediacao' },
  { value: 'arbitration', label: 'Em Arbitragem' },
  { value: 'resolved', label: 'Resolvida' },
  { value: 'closed', label: 'Fechada' },
];

export default function DisputesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const ITEMS_PER_PAGE = 6;

  const filteredDisputes = useMemo(() => {
    return mockDisputes.filter((dispute) => {
      const matchesSearch =
        searchQuery === '' ||
        dispute.contractTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dispute.disputeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dispute.contractNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || dispute.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredDisputes.length / ITEMS_PER_PAGE);
  const paginatedDisputes = filteredDisputes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const totalDisputes = mockDisputes.length;
  const inMediation = mockDisputes.filter((d) => d.status === 'mediation').length;
  const inArbitration = mockDisputes.filter(
    (d) => d.status === 'arbitration'
  ).length;
  const resolvedCount = mockDisputes.filter(
    (d) => d.status === 'resolved' || d.status === 'closed'
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Disputas</h1>
          <p className="text-muted-foreground">
            Gerencie mediacao e arbitragem dos seus contratos
          </p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Abrir Disputa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Abrir Nova Disputa</DialogTitle>
              <DialogDescription>
                Selecione o contrato e descreva o motivo da disputa. Nossa equipe
                de mediadores sera notificada.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Contrato
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      TAB-2025-00001 - Aluguel Apto 302
                    </SelectItem>
                    <SelectItem value="2">
                      TAB-2025-00002 - Design UI
                    </SelectItem>
                    <SelectItem value="6">
                      TAB-2025-00006 - Freelancer Dev Web
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Tipo da Disputa
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breach">Descumprimento Contratual</SelectItem>
                    <SelectItem value="payment">
                      Problema com Pagamento
                    </SelectItem>
                    <SelectItem value="quality">
                      Qualidade do Servico/Produto
                    </SelectItem>
                    <SelectItem value="termination">
                      Rescisao Indevida
                    </SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Valor em Disputa
                </label>
                <Input type="number" placeholder="R$ 0,00" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Descricao
                </label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Descreva detalhadamente o motivo da disputa..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowNewDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={() => setShowNewDialog(false)}>
                Abrir Disputa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Disputas"
          value={totalDisputes}
          icon={Gavel}
          iconColor="text-blue-600"
          iconBg="bg-blue-100 dark:bg-blue-950/50"
        />
        <StatsCard
          title="Em Mediacao"
          value={inMediation}
          icon={MessageSquare}
          iconColor="text-yellow-600"
          iconBg="bg-yellow-100 dark:bg-yellow-950/50"
        />
        <StatsCard
          title="Em Arbitragem"
          value={inArbitration}
          icon={Scale}
          iconColor="text-orange-600"
          iconBg="bg-orange-100 dark:bg-orange-950/50"
        />
        <StatsCard
          title="Resolvidas"
          value={resolvedCount}
          icon={CheckCircle}
          trend={25}
          trendLabel="taxa de resolucao"
          iconColor="text-green-600"
          iconBg="bg-green-100 dark:bg-green-950/50"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[250px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID ou contrato..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            <div className="min-w-[180px]">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(statusFilter !== 'all' || searchQuery !== '') && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 self-center text-muted-foreground"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Abertura</TableHead>
                <TableHead className="w-[80px]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDisputes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Gavel className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        Nenhuma disputa encontrada
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDisputes.map((dispute) => (
                  <TableRow key={dispute.id}>
                    <TableCell>
                      <span className="font-mono text-sm font-medium">
                        {dispute.disputeNumber}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{dispute.contractTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {dispute.contractNumber}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {typeLabels[dispute.type] || dispute.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          disputeStatusColors[dispute.status] ||
                          'bg-gray-100 text-gray-700'
                        }
                        variant="outline"
                      >
                        {getStatusLabel(dispute.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">
                        {formatCurrency(dispute.value)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(dispute.openedAt).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          {dispute.messagesCount}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          {dispute.evidenceCount}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/disputes/${dispute.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {currentPage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              )
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="gap-1"
            >
              Proximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
