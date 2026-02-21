"use client";

import Link from "next/link";
import {
  FileText,
  Activity,
  CreditCard,
  Gavel,
  Plus,
  Search,
  ArrowRight,
  Eye,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatsCard } from "@/components/dashboard/stats-card";
import { formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";

const pieData = [
  { name: "Ativos", value: 12, color: "#22c55e" },
  { name: "Rascunho", value: 5, color: "#94a3b8" },
  { name: "Aguardando", value: 3, color: "#f59e0b" },
  { name: "Expirados", value: 2, color: "#ef4444" },
  { name: "Concluidos", value: 8, color: "#3b82f6" },
];

const sparkData = [
  { month: "Set", value: 4 },
  { month: "Out", value: 7 },
  { month: "Nov", value: 5 },
  { month: "Dez", value: 9 },
  { month: "Jan", value: 12 },
  { month: "Fev", value: 15 },
];

const recentContracts = [
  {
    id: "1",
    title: "Contrato de Aluguel - Apto 302",
    status: "active",
    type: "Aluguel",
    value: 2500,
    date: "2025-02-15",
  },
  {
    id: "2",
    title: "Prestacao de Servicos - Design UI",
    status: "pending_signature",
    type: "Servico",
    value: 8000,
    date: "2025-02-14",
  },
  {
    id: "3",
    title: "NDA - Projeto Alpha",
    status: "active",
    type: "NDA",
    value: 0,
    date: "2025-02-12",
  },
  {
    id: "4",
    title: "Compra e Venda - Veiculo",
    status: "draft",
    type: "Compra/Venda",
    value: 45000,
    date: "2025-02-10",
  },
  {
    id: "5",
    title: "Contrato de Sociedade - Tech Co",
    status: "completed",
    type: "Sociedade",
    value: 150000,
    date: "2025-02-08",
  },
];

const upcomingPayments = [
  {
    id: "1",
    contractTitle: "Contrato de Aluguel - Apto 302",
    amount: 2500,
    dueDate: "2025-03-01",
    status: "pending",
  },
  {
    id: "2",
    contractTitle: "Prestacao de Servicos - Design UI",
    amount: 4000,
    dueDate: "2025-03-05",
    status: "pending",
  },
  {
    id: "3",
    contractTitle: "Consultoria Juridica",
    amount: 1200,
    dueDate: "2025-02-28",
    status: "overdue",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visao geral dos seus contratos e atividades
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/contracts">
            <Button variant="outline" size="sm" className="gap-2">
              <Search className="h-4 w-4" />
              Revisar Documento
            </Button>
          </Link>
          <Link href="/contracts/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Contrato
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Contratos"
          value={30}
          icon={FileText}
          trend={12}
          trendLabel="vs. mes anterior"
          iconColor="text-blue-600"
          iconBg="bg-blue-100 dark:bg-blue-950/50"
        />
        <StatsCard
          title="Contratos Ativos"
          value={12}
          icon={Activity}
          trend={8}
          trendLabel="vs. mes anterior"
          iconColor="text-green-600"
          iconBg="bg-green-100 dark:bg-green-950/50"
        />
        <StatsCard
          title="Pagamentos Pendentes"
          value={formatCurrency(7700)}
          icon={CreditCard}
          trend={-5}
          trendLabel="vs. mes anterior"
          iconColor="text-yellow-600"
          iconBg="bg-yellow-100 dark:bg-yellow-950/50"
        />
        <StatsCard
          title="Disputas Abertas"
          value={1}
          icon={Gavel}
          trend={0}
          trendLabel="sem mudanca"
          iconColor="text-red-600"
          iconBg="bg-red-100 dark:bg-red-950/50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contracts Growth */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Contratos ao Longo do Tempo</CardTitle>
            <CardDescription>Ultimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#1e3a5f"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status dos Contratos</CardTitle>
            <CardDescription>Distribuicao atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Contracts */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Contratos Recentes</CardTitle>
              <CardDescription>Ultimos 5 contratos</CardDescription>
            </div>
            <Link href="/contracts">
              <Button variant="ghost" size="sm" className="gap-1">
                Ver todos
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentContracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">
                      {contract.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contract.type}
                    </TableCell>
                    <TableCell>
                      {contract.value > 0
                        ? formatCurrency(contract.value)
                        : "--"}
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
                      <Link href={`/contracts/${contract.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Upcoming Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Proximos Pagamentos</CardTitle>
              <CardDescription>Pagamentos pendentes</CardDescription>
            </div>
            <Link href="/payments">
              <Button variant="ghost" size="sm" className="gap-1">
                Ver todos
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {payment.contractTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento: {new Date(payment.dueDate).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="ml-3 text-right">
                  <p className="text-sm font-semibold">
                    {formatCurrency(payment.amount)}
                  </p>
                  <Badge
                    className={getStatusColor(payment.status)}
                    variant="outline"
                  >
                    {getStatusLabel(payment.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acoes Rapidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/contracts/new">
              <Button
                variant="outline"
                className="h-auto w-full flex-col gap-2 p-6 hover:border-primary hover:bg-primary/5"
              >
                <Plus className="h-6 w-6 text-primary" />
                <span className="font-medium">Novo Contrato</span>
                <span className="text-xs text-muted-foreground">
                  Crie com IA ou template
                </span>
              </Button>
            </Link>
            <Link href="/contracts">
              <Button
                variant="outline"
                className="h-auto w-full flex-col gap-2 p-6 hover:border-secondary hover:bg-secondary/5"
              >
                <Search className="h-6 w-6 text-secondary" />
                <span className="font-medium">Revisar Documento</span>
                <span className="text-xs text-muted-foreground">
                  Analise com IA juridica
                </span>
              </Button>
            </Link>
            <Link href="/payments">
              <Button
                variant="outline"
                className="h-auto w-full flex-col gap-2 p-6 hover:border-accent hover:bg-accent/5"
              >
                <CreditCard className="h-6 w-6 text-accent" />
                <span className="font-medium">Ver Pagamentos</span>
                <span className="text-xs text-muted-foreground">
                  Gerencie seus recebimentos
                </span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
