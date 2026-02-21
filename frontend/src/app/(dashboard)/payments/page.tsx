'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Clock,
  Shield,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  QrCode,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Banknote,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { StatsCard } from '@/components/dashboard/stats-card';
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils';

interface PaymentRow {
  id: string;
  contractId: string;
  contractNumber: string;
  contractTitle: string;
  type: 'aluguel' | 'servico' | 'parcela' | 'caucao' | 'escrow';
  amount: number;
  status: string;
  dueDate: string;
  paidAt?: string;
  method?: string;
}

const mockPayments: PaymentRow[] = [
  {
    id: '1',
    contractId: '1',
    contractNumber: 'TAB-2025-00001',
    contractTitle: 'Aluguel - Apto 302',
    type: 'aluguel',
    amount: 2500,
    status: 'paid',
    dueDate: '2025-03-10',
    paidAt: '2025-02-18',
    method: 'PIX',
  },
  {
    id: '2',
    contractId: '1',
    contractNumber: 'TAB-2025-00001',
    contractTitle: 'Aluguel - Apto 302',
    type: 'aluguel',
    amount: 2500,
    status: 'pending',
    dueDate: '2025-04-10',
  },
  {
    id: '3',
    contractId: '2',
    contractNumber: 'TAB-2025-00002',
    contractTitle: 'Design UI - Milestone 1',
    type: 'servico',
    amount: 4000,
    status: 'pending',
    dueDate: '2025-03-05',
  },
  {
    id: '4',
    contractId: '2',
    contractNumber: 'TAB-2025-00002',
    contractTitle: 'Design UI - Milestone 2',
    type: 'servico',
    amount: 4000,
    status: 'in_escrow',
    dueDate: '2025-03-20',
  },
  {
    id: '5',
    contractId: '3',
    contractNumber: 'TAB-2025-00006',
    contractTitle: 'Freelancer - Dev Web',
    type: 'parcela',
    amount: 3000,
    status: 'paid',
    dueDate: '2025-02-28',
    paidAt: '2025-02-25',
    method: 'PIX',
  },
  {
    id: '6',
    contractId: '3',
    contractNumber: 'TAB-2025-00006',
    contractTitle: 'Freelancer - Dev Web',
    type: 'parcela',
    amount: 3000,
    status: 'overdue',
    dueDate: '2025-02-15',
  },
  {
    id: '7',
    contractId: '4',
    contractNumber: 'TAB-2025-00004',
    contractTitle: 'Compra Veiculo - Parcela 1',
    type: 'parcela',
    amount: 15000,
    status: 'paid',
    dueDate: '2025-02-01',
    paidAt: '2025-01-30',
    method: 'Boleto',
  },
  {
    id: '8',
    contractId: '4',
    contractNumber: 'TAB-2025-00004',
    contractTitle: 'Compra Veiculo - Parcela 2',
    type: 'parcela',
    amount: 15000,
    status: 'pending',
    dueDate: '2025-03-01',
  },
  {
    id: '9',
    contractId: '4',
    contractNumber: 'TAB-2025-00004',
    contractTitle: 'Compra Veiculo - Parcela 3',
    type: 'parcela',
    amount: 15000,
    status: 'pending',
    dueDate: '2025-04-01',
  },
  {
    id: '10',
    contractId: '1',
    contractNumber: 'TAB-2025-00001',
    contractTitle: 'Aluguel - Apto 302 (Caucao)',
    type: 'caucao',
    amount: 7500,
    status: 'in_escrow',
    dueDate: '2026-02-15',
  },
  {
    id: '11',
    contractId: '5',
    contractNumber: 'TAB-2025-00012',
    contractTitle: 'Emprestimo - Parcela 1',
    type: 'parcela',
    amount: 5000,
    status: 'paid',
    dueDate: '2025-02-10',
    paidAt: '2025-02-08',
    method: 'PIX',
  },
  {
    id: '12',
    contractId: '5',
    contractNumber: 'TAB-2025-00012',
    contractTitle: 'Emprestimo - Parcela 2',
    type: 'parcela',
    amount: 5000,
    status: 'overdue',
    dueDate: '2025-02-20',
  },
];

const typeLabels: Record<string, string> = {
  aluguel: 'Aluguel',
  servico: 'Servico',
  parcela: 'Parcela',
  caucao: 'Caucao',
  escrow: 'Escrow',
};

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Pago' },
  { value: 'overdue', label: 'Atrasado' },
  { value: 'in_escrow', label: 'Em Escrow' },
];

const ITEMS_PER_PAGE = 8;

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPayments = useMemo(() => {
    return mockPayments.filter((payment) => {
      const matchesSearch =
        searchQuery === '' ||
        payment.contractTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.contractNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || payment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats calculations
  const totalReceived = mockPayments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPending = mockPayments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalEscrow = mockPayments
    .filter((p) => p.status === 'in_escrow')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = mockPayments
    .filter((p) => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pagamentos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os pagamentos dos seus contratos
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Recebido"
          value={formatCurrency(totalReceived)}
          icon={DollarSign}
          trend={15}
          trendLabel="vs. mes anterior"
          iconColor="text-green-600"
          iconBg="bg-green-100 dark:bg-green-950/50"
        />
        <StatsCard
          title="Pendente"
          value={formatCurrency(totalPending)}
          icon={Clock}
          trend={-3}
          trendLabel="vs. mes anterior"
          iconColor="text-yellow-600"
          iconBg="bg-yellow-100 dark:bg-yellow-950/50"
        />
        <StatsCard
          title="Em Escrow"
          value={formatCurrency(totalEscrow)}
          icon={Shield}
          trend={10}
          trendLabel="vs. mes anterior"
          iconColor="text-blue-600"
          iconBg="bg-blue-100 dark:bg-blue-950/50"
        />
        <StatsCard
          title="Atrasado"
          value={formatCurrency(totalOverdue)}
          icon={AlertTriangle}
          trend={-20}
          trendLabel="vs. mes anterior"
          iconColor="text-red-600"
          iconBg="bg-red-100 dark:bg-red-950/50"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[250px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por contrato..."
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
                <TableHead>Contrato</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="w-[120px]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Banknote className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        Nenhum pagamento encontrado
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.contractTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.contractNumber}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {typeLabels[payment.type] || payment.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">
                        {formatCurrency(payment.amount)}
                      </span>
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
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(payment.dueDate).toLocaleDateString('pt-BR')}
                      </div>
                      {payment.paidAt && (
                        <p className="text-xs text-green-600">
                          Pago em{' '}
                          {new Date(payment.paidAt).toLocaleDateString('pt-BR')}
                          {payment.method && ` via ${payment.method}`}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(payment.status === 'pending' ||
                          payment.status === 'overdue') && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              title="Gerar PIX"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                              PIX
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              title="Ver Boleto"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Boleto
                            </Button>
                          </>
                        )}
                        {payment.status === 'paid' && (
                          <Link href={`/contracts/${payment.contractId}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Ver contrato"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        {payment.status === 'in_escrow' && (
                          <Badge variant="secondary" className="text-xs">
                            Escrow
                          </Badge>
                        )}
                      </div>
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
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
