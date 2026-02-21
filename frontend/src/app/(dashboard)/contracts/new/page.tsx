'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  MessageSquare,
  LayoutGrid,
  Home,
  Briefcase,
  ShoppingCart,
  Code,
  Users,
  Shield,
  FileText,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContractChat } from '@/components/contracts/contract-chat';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  popular?: boolean;
  fields: string[];
}

const templates: Template[] = [
  {
    id: 'rental',
    name: 'Locacao',
    description:
      'Contrato de locacao de imoveis residenciais ou comerciais. Inclui clausulas de reajuste, caucao, vistoria e regras de uso.',
    icon: Home,
    category: 'Imoveis',
    popular: true,
    fields: [
      'Dados do locador',
      'Dados do locatario',
      'Endereco do imovel',
      'Valor do aluguel',
      'Periodo de vigencia',
      'Indice de reajuste',
      'Valor da caucao',
    ],
  },
  {
    id: 'service',
    name: 'Prestacao de Servicos',
    description:
      'Contrato para prestacao de servicos profissionais. Define escopo, prazos, entregas, pagamento e responsabilidades.',
    icon: Briefcase,
    category: 'Servicos',
    popular: true,
    fields: [
      'Dados do contratante',
      'Dados do prestador',
      'Descricao do servico',
      'Valor total',
      'Forma de pagamento',
      'Prazo de execucao',
      'Criterios de aceite',
    ],
  },
  {
    id: 'purchase',
    name: 'Compra e Venda',
    description:
      'Contrato de compra e venda de bens moveis ou imoveis. Estabelece condicoes, garantias e forma de transferencia.',
    icon: ShoppingCart,
    category: 'Comercial',
    fields: [
      'Dados do vendedor',
      'Dados do comprador',
      'Descricao do bem',
      'Valor de venda',
      'Forma de pagamento',
      'Prazo de entrega',
      'Condicoes de garantia',
    ],
  },
  {
    id: 'freelancer',
    name: 'Freelancer',
    description:
      'Contrato adaptado para profissionais freelancers. Inclui escopo do projeto, milestones, propriedade intelectual e pagamento.',
    icon: Code,
    category: 'Servicos',
    popular: true,
    fields: [
      'Dados do cliente',
      'Dados do freelancer',
      'Escopo do projeto',
      'Milestones',
      'Valor por milestone',
      'Prazo total',
      'Propriedade intelectual',
    ],
  },
  {
    id: 'partnership',
    name: 'Sociedade',
    description:
      'Contrato social ou acordo de socios. Define participacao, responsabilidades, distribuicao de lucros e governance.',
    icon: Users,
    category: 'Empresarial',
    fields: [
      'Dados dos socios',
      'Objeto social',
      'Capital social',
      'Participacao de cada socio',
      'Distribuicao de lucros',
      'Regras de governance',
      'Clausulas de saida',
    ],
  },
  {
    id: 'nda',
    name: 'NDA',
    description:
      'Acordo de confidencialidade e nao divulgacao. Protege informacoes sensiveis entre partes em negociacoes ou parcerias.',
    icon: Shield,
    category: 'Legal',
    fields: [
      'Parte reveladora',
      'Parte receptora',
      'Definicao de informacao confidencial',
      'Periodo de vigencia',
      'Excecoes',
      'Penalidades por violacao',
    ],
  },
];

export default function NewContractPage() {
  const [activeTab, setActiveTab] = useState('chat');
  const [generatedContract, setGeneratedContract] = useState<string | null>(null);

  const handleContractGenerated = (content: string) => {
    setGeneratedContract(content);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/contracts">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Novo Contrato</h1>
          <p className="text-muted-foreground">
            Crie um contrato usando IA ou escolha um template
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat com IA
          </TabsTrigger>
          <TabsTrigger value="template" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Template
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-0">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Assistente Juridico IA</CardTitle>
                    <CardDescription>
                      Descreva o contrato que precisa e a IA ira gera-lo
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <div className="h-[500px]">
                <ContractChat onContractGenerated={handleContractGenerated} />
              </div>
            </Card>

            {/* Sidebar Tips */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dicas para o Chat</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <p className="text-sm text-muted-foreground">
                      Seja especifico sobre o tipo de contrato que precisa
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <p className="text-sm text-muted-foreground">
                      Inclua os dados das partes envolvidas
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <p className="text-sm text-muted-foreground">
                      Mencione valores, prazos e condicoes especiais
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <p className="text-sm text-muted-foreground">
                      Voce pode pedir ajustes no contrato gerado
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Exemplos de Pedidos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    'Preciso de um contrato de aluguel para um apartamento de R$ 2.500/mes',
                    'Quero um NDA para proteger informacoes de um projeto',
                    'Crie um contrato de prestacao de servicos de consultoria',
                  ].map((example, index) => (
                    <button
                      key={index}
                      className="w-full rounded-lg border p-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                      &quot;{example}&quot;
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Template Tab */}
        <TabsContent value="template" className="mt-0">
          <div className="space-y-6">
            {/* Template Info */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Escolha um template pre-configurado
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Templates foram revisados por advogados e seguem as normas do Codigo Civil Brasileiro
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Template Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => {
                const Icon = template.icon;
                return (
                  <Card
                    key={template.id}
                    className="group relative transition-all hover:shadow-md hover:-translate-y-0.5"
                  >
                    {template.popular && (
                      <Badge className="absolute -top-2 right-4 bg-secondary text-secondary-foreground">
                        Popular
                      </Badge>
                    )}
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <span className="text-xs text-muted-foreground">
                            {template.category}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {template.description}
                      </p>

                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          Campos incluidos:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {template.fields.slice(0, 4).map((field, index) => (
                            <span
                              key={index}
                              className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                            >
                              {field}
                            </span>
                          ))}
                          {template.fields.length > 4 && (
                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              +{template.fields.length - 4} mais
                            </span>
                          )}
                        </div>
                      </div>

                      <Button className="w-full gap-2" variant="outline">
                        Usar Template
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
