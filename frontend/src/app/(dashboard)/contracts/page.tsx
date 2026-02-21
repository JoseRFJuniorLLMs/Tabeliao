'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Filter,
  Eye,
  MoreHorizontal,
  FileText,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  Download,
  Trash2,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils';

interface ContractRow {
  id: string;
  contractNumber: string;
  title: string;
  type: string;
  status: string;
  parties: string[];
  value: number;
  createdAt: string;
}

const mockContracts: ContractRow[] = [
  {
    id: '1',
    contractNumber: 'TAB-2025-00001',
    title: 'Contrato de Aluguel - Apto 302',
    type: 'Aluguel',
    status: 'active',
    parties: ['Maria Silva', 'Joao Santos'],
    value: 2500,
    createdAt: '2025-02-15',
  },
  {
    id: '2',
    contractNumber: 'TAB-2025-00002',
    title: 'Prestacao de Servicos - Design UI',
    type: 'Servico',
    status: 'pending_signature',
    parties: ['Carlos Oliveira', 'Tech Solutions Ltda'],
    value: 8000,
    createdAt: '2025-02-14',
  },
  {
    id: '3',
    contractNumber: 'TAB-2025-00003',
    title: 'NDA - Projeto Alpha',
    type: 'NDA',
    status: 'active',
    parties: ['Ana Costa', 'Beta Corp'],
    value: 0,
    createdAt: '2025-02-12',
  },
  {
    id: '4',
    contractNumber: 'TAB-2025-00004',
    title: 'Compra e Venda - Veiculo Honda Civic',
    type: 'Compra/Venda',
    status: 'draft',
    parties: ['Pedro Almeida', 'Roberto Lima'],
    value: 45000,
    createdAt: '2025-02-10',
  },
  {
    id: '5',
    contractNumber: 'TAB-2025-00005',
    title: 'Contrato de Sociedade - Tech Co',
    type: 'Sociedade',
    status: 'completed',
    parties: ['Fernanda Souza', 'Lucas Pereira', 'Marina Costa'],
    value: 150000,
    createdAt: '2025-02-08',
  },
  {
    id: '6',
    contractNumber: 'TAB-2025-00006',
    title: 'Freelancer - Desenvolvimento Web',
    type: 'Servico',
    status: 'active',
    parties: ['Ricardo Mendes', 'Digital Agency'],
    value: 12000,
    createdAt: '2025-02-05',
  },
  {
    id: '7',
    contractNumber: 'TAB-2025-00007',
    title: 'Contrato de Aluguel - Sala Comercial',
    type: 'Aluguel',
    status: 'expired',
    parties: ['Empresa ABC', 'Imoveis Central'],
    value: 3500,
    createdAt: '2025-01-28',
  },
  {
    id: '8',
    contractNumber: 'TAB-2025-00008',
    title: 'Prestacao de Servicos - Consultoria',
    type: 'Servico',
    status: 'cancelled',
    parties: ['Paulo Costa', 'Consultoria XYZ'],
    value: 15000,
    createdAt: '2025-01-25',
  },
  {
    id: '9',
    contractNumber: 'TAB-2025-00009',
    title: 'NDA - Parceria Estrategica',
    type: 'NDA',
    status: 'pending_signature',
    parties: ['Startup Labs', 'Venture Capital Inc'],
    value: 0,
    createdAt: '2025-01-20',
  },
  {
    id: '10',
    contractNumber: 'TAB-2025-00010',
    title: 'Compra e Venda - Equipamentos',
    type: 'Compra/Venda',
    status: 'disputed',
    parties: ['Industria Forte', 'Fornecedor Global'],
    value: 78000,
    createdAt: '2025-01-18',
  },
  {
    id: '11',
    contractNumber: 'TAB-2025-00011',
    title: 'Contrato de Trabalho - Desenvolvedor Sr',
    type: 'Trabalho',
    status: 'active',
    parties: ['Tech Solutions Ltda', 'Bruno Martins'],
    value: 96000,
    createdAt: '2025-01-15',
  },
  {
    id: '12',
    contractNumber: 'TAB-2025-00012',
    title: 'Emprestimo Pessoal - Acordo',
    type: 'Emprestimo',
    status: 'active',
    parties: ['Marcos Ribeiro', 'Patricia Ferreira'],
    value: 25000,
    createdAt: '2025-01-10',
  },
];

const statusOptions = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'pending_signature', label: 'Aguardando Assinatura' },
  { value: 'active', label: 'Ativo' },
  { value: 'completed', label: 'Concluido' },
  { value: 'expired', label: 'Expirado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'disputed', label: 'Em Disputa' },
];

const typeOptions = [
  { value: 'all', label: 'Todos os Tipos' },
  { value: 'Aluguel', label: 'Aluguel' },
  { value: 'Servico', label: 'Servico' },
  { value: 'Compra/Venda', label: 'Compra/Venda' },
  { value: 'NDA', label: 'NDA' },
  { value: 'Sociedade', label: 'Sociedade' },
  { value: 'Trabalho', label: 'Trabalho' },
  { value: 'Emprestimo', label: 'Emprestimo' },
];

const ITEMS_PER_PAGE = 8;

export default function ContractsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const filteredContracts = useMemo(() => {
    return mockContracts.filter((contract) => {
      const matchesSearch =
        searchQuery === '' ||
        contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.parties.some((p) =>
          p.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesStatus =
        statusFilter === 'all' || contract.status === statusFilter;

      const matchesType =
        typeFilter === 'all' || contract.type === typeFilter;

      const matchesDateFrom =
        !dateFrom || contract.createdAt >= dateFrom;

      const matchesDateTo =
        !dateTo || contract.createdAt <= dateTo;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  }, [searchQuery, statusFilter, typeFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredContracts.length / ITEMS_PER_PAGE);
  const paginatedContracts = filteredContracts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meus Contratos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os seus contratos em um so lugar
          </p>
        </div>
        <Link href="/contracts/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Contrato
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search Bar Row */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por titulo, numero ou partes..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Button
                variant={showFilters ? 'default' : 'outline'}
                className="gap-2"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
                Filtros
                {hasActiveFilters && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-xs font-bold text-primary">
                    !
                  </span>
                )}
              </Button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-4">
                <div className="min-w-[180px] flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Status
                  </label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                <div className="min-w-[180px] flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Tipo
                  </label>
                  <Select
                    value={typeFilter}
                    onValueChange={(value) => {
                      setTypeFilter(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[150px]">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Data Inicio
                  </label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
                <div className="min-w-[150px]">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Data Fim
                  </label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                    onClick={clearFilters}
                  >
                    <X className="h-3.5 w-3.5" />
                    Limpar
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filteredContracts.length} contrato{filteredContracts.length !== 1 ? 's' : ''} encontrado{filteredContracts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Partes</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-[80px]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        Nenhum contrato encontrado
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={clearFilters}
                        >
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedContracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{contract.contractNumber}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {contract.title}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{contract.type}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getStatusColor(contract.status)}
                        variant="outline"
                      >
                        {getStatusLabel(contract.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {contract.parties.slice(0, 2).map((party, index) => (
                          <span
                            key={index}
                            className="text-sm truncate max-w-[150px]"
                          >
                            {party}
                          </span>
                        ))}
                        {contract.parties.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{contract.parties.length - 2} mais
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {contract.value > 0
                          ? formatCurrency(contract.value)
                          : '--'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(contract.createdAt).toLocaleDateString(
                          'pt-BR'
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/contracts/${contract.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
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
