import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import {
  Contract,
  ContractType,
  ContractStatus,
  ContractParty,
  ContractClause,
} from '../modules/contracts/entities/contract.entity';
import { Signature, SignatureType } from '../modules/contracts/entities/signature.entity';
import { ContractEvent, ContractEventType } from '../modules/contracts/entities/contract-event.entity';
import { Template, TemplateVariable } from '../modules/templates/entities/template.entity';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Import user IDs from auth seed for referential consistency
const USER_IDS = {
  admin: 'a0000000-0000-4000-8000-000000000001',
  maria: 'a0000000-0000-4000-8000-000000000002',
  joao: 'a0000000-0000-4000-8000-000000000003',
  ana: 'a0000000-0000-4000-8000-000000000004',
  carlos: 'a0000000-0000-4000-8000-000000000005',
  fernanda: 'a0000000-0000-4000-8000-000000000006',
  techCorp: 'a0000000-0000-4000-8000-000000000007',
};

// Fixed contract IDs for cross-service referencing
export const CONTRACT_IDS = {
  rentalMaria: 'c0000000-0000-4000-8000-000000000001',
  servicesTechCorp: 'c0000000-0000-4000-8000-000000000002',
  purchaseSale: 'c0000000-0000-4000-8000-000000000003',
  freelancerCarlos: 'c0000000-0000-4000-8000-000000000004',
  ndaMaria: 'c0000000-0000-4000-8000-000000000005',
  partnership: 'c0000000-0000-4000-8000-000000000006',
  rentalDraft: 'c0000000-0000-4000-8000-000000000007',
  pendingSignatures: 'c0000000-0000-4000-8000-000000000008',
  cancelledContract: 'c0000000-0000-4000-8000-000000000009',
  disputedContract: 'c0000000-0000-4000-8000-00000000000a',
};

// --- Templates ---

function buildTemplates(): Partial<Template>[] {
  return [
    {
      id: uuidv4(),
      name: 'Contrato de Locacao Residencial',
      category: ContractType.RENTAL,
      description:
        'Modelo padrao de contrato de locacao residencial conforme Lei do Inquilinato (Lei 8.245/1991). Inclui clausulas sobre prazo, valor do aluguel, reajuste anual, caucao, obrigacoes do locador e locatario, rescisao e multa.',
      content: `CONTRATO DE LOCACAO RESIDENCIAL

Pelo presente instrumento particular, de um lado {{locador_nome}}, inscrito(a) no CPF sob n. {{locador_cpf}}, residente e domiciliado(a) em {{locador_endereco}}, doravante denominado(a) LOCADOR(A), e de outro lado {{locatario_nome}}, inscrito(a) no CPF sob n. {{locatario_cpf}}, residente e domiciliado(a) em {{locatario_endereco}}, doravante denominado(a) LOCATARIO(A), tem entre si, justo e contratado o seguinte:

CLAUSULA 1 - DO OBJETO
O LOCADOR(A) cede ao LOCATARIO(A), a titulo de locacao, o imovel situado em {{imovel_endereco}}, para fins exclusivamente residenciais.

CLAUSULA 2 - DO PRAZO
A presente locacao tera o prazo de {{prazo_meses}} meses, com inicio em {{data_inicio}} e termino em {{data_fim}}, podendo ser prorrogada mediante acordo entre as partes.

CLAUSULA 3 - DO VALOR DO ALUGUEL
O valor mensal do aluguel sera de R$ {{valor_aluguel}}, a ser pago ate o dia {{dia_vencimento}} de cada mes, mediante deposito na conta indicada pelo LOCADOR(A) ou via PIX.

CLAUSULA 4 - DO REAJUSTE
O valor do aluguel sera reajustado anualmente pelo indice {{indice_reajuste}}, acumulado nos ultimos 12 meses.

CLAUSULA 5 - DA CAUCAO
O LOCATARIO(A) deposita a titulo de caucao o valor de R$ {{valor_caucao}}, equivalente a {{meses_caucao}} meses de aluguel, que sera devolvido ao termino da locacao, descontados eventuais debitos.

CLAUSULA 6 - DAS OBRIGACOES DO LOCATARIO
6.1 Pagar pontualmente o aluguel e encargos;
6.2 Utilizar o imovel conforme sua destinacao;
6.3 Restituir o imovel nas mesmas condicoes em que o recebeu;
6.4 Nao sublocar ou ceder o imovel sem autorizacao expressa.

CLAUSULA 7 - DA RESCISAO
A rescisao antecipada por qualquer das partes acarretara multa de {{meses_multa}} alugueis vigentes, proporcional ao periodo restante.

CLAUSULA 8 - DO FORO
Fica eleito o foro da Comarca de {{comarca}} para dirimir quaisquer duvidas oriundas deste contrato.`,
      variables: [
        { name: 'locador_nome', label: 'Nome do Locador', type: 'string', required: true },
        { name: 'locador_cpf', label: 'CPF do Locador', type: 'cpf', required: true },
        { name: 'locador_endereco', label: 'Endereco do Locador', type: 'address', required: true },
        { name: 'locatario_nome', label: 'Nome do Locatario', type: 'string', required: true },
        { name: 'locatario_cpf', label: 'CPF do Locatario', type: 'cpf', required: true },
        { name: 'locatario_endereco', label: 'Endereco do Locatario', type: 'address', required: true },
        { name: 'imovel_endereco', label: 'Endereco do Imovel', type: 'address', required: true },
        { name: 'prazo_meses', label: 'Prazo (meses)', type: 'number', required: true, defaultValue: '30' },
        { name: 'data_inicio', label: 'Data de Inicio', type: 'date', required: true },
        { name: 'data_fim', label: 'Data de Termino', type: 'date', required: true },
        { name: 'valor_aluguel', label: 'Valor do Aluguel (R$)', type: 'currency', required: true },
        { name: 'dia_vencimento', label: 'Dia do Vencimento', type: 'number', required: true, defaultValue: '10' },
        { name: 'indice_reajuste', label: 'Indice de Reajuste', type: 'string', required: true, defaultValue: 'IGPM/FGV' },
        { name: 'valor_caucao', label: 'Valor da Caucao (R$)', type: 'currency', required: true },
        { name: 'meses_caucao', label: 'Meses de Caucao', type: 'number', required: true, defaultValue: '3' },
        { name: 'meses_multa', label: 'Meses de Multa Rescisoria', type: 'number', required: true, defaultValue: '3' },
        { name: 'comarca', label: 'Comarca (Foro)', type: 'string', required: true },
      ] as TemplateVariable[],
      isActive: true,
    },
    {
      id: uuidv4(),
      name: 'Contrato de Prestacao de Servicos',
      category: ContractType.SERVICE,
      description:
        'Modelo de contrato de prestacao de servicos entre pessoa juridica e pessoa fisica ou juridica, com clausulas de escopo, prazo, remuneracao, confidencialidade e propriedade intelectual.',
      content: `CONTRATO DE PRESTACAO DE SERVICOS

Pelo presente instrumento particular, as partes abaixo identificadas:

CONTRATANTE: {{contratante_nome}}, inscrito(a) no {{contratante_doc_tipo}} sob n. {{contratante_doc}}, com sede em {{contratante_endereco}}.

CONTRATADO(A): {{contratado_nome}}, inscrito(a) no {{contratado_doc_tipo}} sob n. {{contratado_doc}}, com sede/domicilio em {{contratado_endereco}}.

CLAUSULA 1 - DO OBJETO
O CONTRATADO(A) se compromete a prestar os seguintes servicos ao CONTRATANTE: {{descricao_servicos}}.

CLAUSULA 2 - DO PRAZO
O presente contrato vigorara pelo prazo de {{prazo_meses}} meses, com inicio em {{data_inicio}}.

CLAUSULA 3 - DA REMUNERACAO
3.1 O CONTRATANTE pagara ao CONTRATADO(A) o valor total de R$ {{valor_total}}, a ser pago em {{forma_pagamento}}.
3.2 Os pagamentos serao realizados mediante emissao de nota fiscal.

CLAUSULA 4 - DAS OBRIGACOES DO CONTRATADO
4.1 Executar os servicos com diligencia e qualidade;
4.2 Cumprir os prazos acordados;
4.3 Manter sigilo sobre informacoes do CONTRATANTE.

CLAUSULA 5 - DA PROPRIEDADE INTELECTUAL
Todo material produzido em decorrencia deste contrato sera de propriedade do CONTRATANTE.

CLAUSULA 6 - DA RESCISAO
Qualquer das partes podera rescindir o contrato mediante aviso previo de {{dias_aviso}} dias.

CLAUSULA 7 - DA MULTA
A parte que descumprir as obrigacoes deste contrato ficara sujeita ao pagamento de multa de {{percentual_multa}}% do valor total.`,
      variables: [
        { name: 'contratante_nome', label: 'Nome do Contratante', type: 'string', required: true },
        { name: 'contratante_doc_tipo', label: 'Tipo de Documento (CPF/CNPJ)', type: 'string', required: true },
        { name: 'contratante_doc', label: 'Numero do Documento', type: 'string', required: true },
        { name: 'contratante_endereco', label: 'Endereco do Contratante', type: 'address', required: true },
        { name: 'contratado_nome', label: 'Nome do Contratado', type: 'string', required: true },
        { name: 'contratado_doc_tipo', label: 'Tipo de Documento (CPF/CNPJ)', type: 'string', required: true },
        { name: 'contratado_doc', label: 'Numero do Documento', type: 'string', required: true },
        { name: 'contratado_endereco', label: 'Endereco do Contratado', type: 'address', required: true },
        { name: 'descricao_servicos', label: 'Descricao dos Servicos', type: 'string', required: true },
        { name: 'prazo_meses', label: 'Prazo (meses)', type: 'number', required: true },
        { name: 'data_inicio', label: 'Data de Inicio', type: 'date', required: true },
        { name: 'valor_total', label: 'Valor Total (R$)', type: 'currency', required: true },
        { name: 'forma_pagamento', label: 'Forma de Pagamento', type: 'string', required: true },
        { name: 'dias_aviso', label: 'Dias de Aviso Previo', type: 'number', required: true, defaultValue: '30' },
        { name: 'percentual_multa', label: 'Percentual de Multa (%)', type: 'number', required: true, defaultValue: '10' },
      ] as TemplateVariable[],
      isActive: true,
    },
    {
      id: uuidv4(),
      name: 'Contrato de Compra e Venda',
      category: ContractType.PURCHASE_SALE,
      description:
        'Contrato de compra e venda de bens moveis ou imoveis com clausulas de pagamento, entrega, garantia e condicoes suspensivas.',
      content: `CONTRATO DE COMPRA E VENDA

VENDEDOR(A): {{vendedor_nome}}, CPF/CNPJ {{vendedor_doc}}, com endereco em {{vendedor_endereco}}.
COMPRADOR(A): {{comprador_nome}}, CPF/CNPJ {{comprador_doc}}, com endereco em {{comprador_endereco}}.

CLAUSULA 1 - DO OBJETO
O VENDEDOR(A) vende ao COMPRADOR(A) o seguinte bem: {{descricao_bem}}, no estado em que se encontra.

CLAUSULA 2 - DO PRECO E FORMA DE PAGAMENTO
2.1 O preco total da venda e de R$ {{valor_total}}.
2.2 O pagamento sera realizado da seguinte forma: {{forma_pagamento}}.

CLAUSULA 3 - DA ENTREGA
O bem sera entregue no prazo de {{prazo_entrega_dias}} dias uteis apos a confirmacao do pagamento.

CLAUSULA 4 - DA GARANTIA
O VENDEDOR(A) garante que o bem esta livre de onus, dividas ou quaisquer impedimentos legais.

CLAUSULA 5 - DAS CONDICOES SUSPENSIVAS
O presente contrato fica condicionado a {{condicao_suspensiva}}.

CLAUSULA 6 - DA MULTA
O descumprimento de qualquer clausula deste contrato sujeitara a parte infratora ao pagamento de multa de R$ {{valor_multa}}.`,
      variables: [
        { name: 'vendedor_nome', label: 'Nome do Vendedor', type: 'string', required: true },
        { name: 'vendedor_doc', label: 'CPF/CNPJ do Vendedor', type: 'string', required: true },
        { name: 'vendedor_endereco', label: 'Endereco do Vendedor', type: 'address', required: true },
        { name: 'comprador_nome', label: 'Nome do Comprador', type: 'string', required: true },
        { name: 'comprador_doc', label: 'CPF/CNPJ do Comprador', type: 'string', required: true },
        { name: 'comprador_endereco', label: 'Endereco do Comprador', type: 'address', required: true },
        { name: 'descricao_bem', label: 'Descricao do Bem', type: 'string', required: true },
        { name: 'valor_total', label: 'Valor Total (R$)', type: 'currency', required: true },
        { name: 'forma_pagamento', label: 'Forma de Pagamento', type: 'string', required: true },
        { name: 'prazo_entrega_dias', label: 'Prazo de Entrega (dias)', type: 'number', required: true, defaultValue: '15' },
        { name: 'condicao_suspensiva', label: 'Condicao Suspensiva', type: 'string', required: false, defaultValue: 'aprovacao do financiamento bancario' },
        { name: 'valor_multa', label: 'Valor da Multa (R$)', type: 'currency', required: true },
      ] as TemplateVariable[],
      isActive: true,
    },
    {
      id: uuidv4(),
      name: 'Contrato de Freelancer',
      category: ContractType.FREELANCER,
      description:
        'Contrato simplificado para contratacao de profissional freelancer/autonomo, com escopo de trabalho, entregaveis, prazos e pagamento por milestone.',
      content: `CONTRATO DE PRESTACAO DE SERVICOS AUTONOMOS (FREELANCER)

CONTRATANTE: {{contratante_nome}}, {{contratante_doc_tipo}} {{contratante_doc}}.
FREELANCER: {{freelancer_nome}}, CPF {{freelancer_cpf}}, {{freelancer_especialidade}}.

CLAUSULA 1 - DO ESCOPO DO TRABALHO
O FREELANCER se compromete a executar: {{escopo_trabalho}}.

CLAUSULA 2 - DOS ENTREGAVEIS
Os entregaveis serao: {{entregaveis}}.

CLAUSULA 3 - DOS PRAZOS E MILESTONES
3.1 Milestone 1: {{milestone_1}} - Prazo: {{prazo_m1}} - Valor: R$ {{valor_m1}}
3.2 Milestone 2: {{milestone_2}} - Prazo: {{prazo_m2}} - Valor: R$ {{valor_m2}}
3.3 Milestone 3 (Final): {{milestone_3}} - Prazo: {{prazo_m3}} - Valor: R$ {{valor_m3}}

CLAUSULA 4 - DO VALOR TOTAL
O valor total do projeto e de R$ {{valor_total}}, a ser pago conforme conclusao dos milestones via escrow da plataforma Tabeliao.

CLAUSULA 5 - DA AUTONOMIA
O FREELANCER exercera suas atividades com autonomia, sem vinculo empregaticio com o CONTRATANTE, conforme art. 442-B da CLT.

CLAUSULA 6 - DA PROPRIEDADE INTELECTUAL
Todos os direitos sobre o trabalho produzido serao transferidos ao CONTRATANTE apos pagamento integral.`,
      variables: [
        { name: 'contratante_nome', label: 'Nome do Contratante', type: 'string', required: true },
        { name: 'contratante_doc_tipo', label: 'Tipo Documento', type: 'string', required: true },
        { name: 'contratante_doc', label: 'Numero Documento', type: 'string', required: true },
        { name: 'freelancer_nome', label: 'Nome do Freelancer', type: 'string', required: true },
        { name: 'freelancer_cpf', label: 'CPF do Freelancer', type: 'cpf', required: true },
        { name: 'freelancer_especialidade', label: 'Especialidade', type: 'string', required: true },
        { name: 'escopo_trabalho', label: 'Escopo do Trabalho', type: 'string', required: true },
        { name: 'entregaveis', label: 'Entregaveis', type: 'string', required: true },
        { name: 'milestone_1', label: 'Descricao Milestone 1', type: 'string', required: true },
        { name: 'prazo_m1', label: 'Prazo Milestone 1', type: 'date', required: true },
        { name: 'valor_m1', label: 'Valor Milestone 1', type: 'currency', required: true },
        { name: 'milestone_2', label: 'Descricao Milestone 2', type: 'string', required: true },
        { name: 'prazo_m2', label: 'Prazo Milestone 2', type: 'date', required: true },
        { name: 'valor_m2', label: 'Valor Milestone 2', type: 'currency', required: true },
        { name: 'milestone_3', label: 'Descricao Milestone 3', type: 'string', required: true },
        { name: 'prazo_m3', label: 'Prazo Milestone 3', type: 'date', required: true },
        { name: 'valor_m3', label: 'Valor Milestone 3', type: 'currency', required: true },
        { name: 'valor_total', label: 'Valor Total', type: 'currency', required: true },
      ] as TemplateVariable[],
      isActive: true,
    },
    {
      id: uuidv4(),
      name: 'Acordo de Confidencialidade (NDA)',
      category: ContractType.NDA,
      description:
        'Termo de Confidencialidade e Nao Divulgacao (NDA) bilateral para protecao de informacoes sigilosas em negociacoes, parcerias ou prestacao de servicos.',
      content: `TERMO DE CONFIDENCIALIDADE E NAO DIVULGACAO (NDA)

PARTE REVELADORA: {{reveladora_nome}}, {{reveladora_doc_tipo}} {{reveladora_doc}}.
PARTE RECEPTORA: {{receptora_nome}}, {{receptora_doc_tipo}} {{receptora_doc}}.

CLAUSULA 1 - DO OBJETO
O presente termo visa proteger as informacoes confidenciais compartilhadas entre as partes no ambito de: {{finalidade}}.

CLAUSULA 2 - DAS INFORMACOES CONFIDENCIAIS
Consideram-se confidenciais: dados tecnicos, comerciais, financeiros, estrategicos, codigo-fonte, bases de dados, planos de negocios, listas de clientes, e quaisquer outras informacoes assim classificadas pela PARTE REVELADORA.

CLAUSULA 3 - DAS OBRIGACOES
3.1 Nao divulgar informacoes confidenciais a terceiros;
3.2 Utilizar as informacoes exclusivamente para a finalidade descrita;
3.3 Adotar medidas de seguranca equivalentes as que utiliza para suas proprias informacoes;
3.4 Devolver ou destruir todas as informacoes ao termino do acordo.

CLAUSULA 4 - DAS EXCECOES
Nao serao consideradas confidenciais informacoes que:
a) Sejam de dominio publico;
b) Ja eram de conhecimento da PARTE RECEPTORA antes da revelacao;
c) Foram obtidas de terceiro de forma licita;
d) Foram divulgadas por determinacao judicial.

CLAUSULA 5 - DO PRAZO
Este acordo vigora por {{prazo_anos}} anos a partir de sua assinatura.

CLAUSULA 6 - DA PENALIDADE
A violacao deste termo sujeitara a parte infratora ao pagamento de indenizacao nao inferior a R$ {{valor_penalidade}}, sem prejuizo de demais acoes cabiveis.`,
      variables: [
        { name: 'reveladora_nome', label: 'Nome da Parte Reveladora', type: 'string', required: true },
        { name: 'reveladora_doc_tipo', label: 'Tipo Documento', type: 'string', required: true },
        { name: 'reveladora_doc', label: 'Numero Documento', type: 'string', required: true },
        { name: 'receptora_nome', label: 'Nome da Parte Receptora', type: 'string', required: true },
        { name: 'receptora_doc_tipo', label: 'Tipo Documento', type: 'string', required: true },
        { name: 'receptora_doc', label: 'Numero Documento', type: 'string', required: true },
        { name: 'finalidade', label: 'Finalidade/Projeto', type: 'string', required: true },
        { name: 'prazo_anos', label: 'Prazo (anos)', type: 'number', required: true, defaultValue: '5' },
        { name: 'valor_penalidade', label: 'Valor da Penalidade (R$)', type: 'currency', required: true },
      ] as TemplateVariable[],
      isActive: true,
    },
    {
      id: uuidv4(),
      name: 'Contrato de Sociedade',
      category: ContractType.PARTNERSHIP,
      description:
        'Contrato social simplificado para constituicao de sociedade limitada (LTDA), com clausulas sobre capital social, quotas, administracao, distribuicao de lucros e dissolucao.',
      content: `CONTRATO SOCIAL DE SOCIEDADE LIMITADA

Os abaixo qualificados constituem, por este instrumento, uma Sociedade Limitada, regida pelas seguintes clausulas:

SOCIO 1: {{socio1_nome}}, CPF {{socio1_cpf}}, residente em {{socio1_endereco}}.
SOCIO 2: {{socio2_nome}}, CPF {{socio2_cpf}}, residente em {{socio2_endereco}}.

CLAUSULA 1 - DA DENOMINACAO SOCIAL
A sociedade girara sob a denominacao: {{razao_social}} LTDA.

CLAUSULA 2 - DA SEDE
A sede da sociedade sera em {{endereco_sede}}, CEP {{cep_sede}}.

CLAUSULA 3 - DO OBJETO SOCIAL
A sociedade tera por objeto: {{objeto_social}}.

CLAUSULA 4 - DO CAPITAL SOCIAL
4.1 O capital social e de R$ {{capital_social}}, dividido em {{total_quotas}} quotas de R$ {{valor_quota}} cada.
4.2 SOCIO 1 detem {{quotas_socio1}} quotas ({{percentual_socio1}}%);
4.3 SOCIO 2 detem {{quotas_socio2}} quotas ({{percentual_socio2}}%).

CLAUSULA 5 - DA ADMINISTRACAO
A sociedade sera administrada por {{administrador_nome}}, com poderes para representar a sociedade ativa e passivamente.

CLAUSULA 6 - DA DISTRIBUICAO DE LUCROS
Os lucros e prejuizos serao distribuidos proporcionalmente as quotas de cada socio, apurados {{periodicidade_apuracao}}.

CLAUSULA 7 - DA DISSOLUCAO
A sociedade podera ser dissolvida por consenso unanime dos socios, por prazo determinado ou nas demais hipoteses previstas no Codigo Civil.`,
      variables: [
        { name: 'socio1_nome', label: 'Nome do Socio 1', type: 'string', required: true },
        { name: 'socio1_cpf', label: 'CPF do Socio 1', type: 'cpf', required: true },
        { name: 'socio1_endereco', label: 'Endereco do Socio 1', type: 'address', required: true },
        { name: 'socio2_nome', label: 'Nome do Socio 2', type: 'string', required: true },
        { name: 'socio2_cpf', label: 'CPF do Socio 2', type: 'cpf', required: true },
        { name: 'socio2_endereco', label: 'Endereco do Socio 2', type: 'address', required: true },
        { name: 'razao_social', label: 'Razao Social', type: 'string', required: true },
        { name: 'endereco_sede', label: 'Endereco da Sede', type: 'address', required: true },
        { name: 'cep_sede', label: 'CEP da Sede', type: 'string', required: true },
        { name: 'objeto_social', label: 'Objeto Social', type: 'string', required: true },
        { name: 'capital_social', label: 'Capital Social (R$)', type: 'currency', required: true },
        { name: 'total_quotas', label: 'Total de Quotas', type: 'number', required: true },
        { name: 'valor_quota', label: 'Valor por Quota (R$)', type: 'currency', required: true },
        { name: 'quotas_socio1', label: 'Quotas do Socio 1', type: 'number', required: true },
        { name: 'percentual_socio1', label: 'Percentual Socio 1 (%)', type: 'number', required: true },
        { name: 'quotas_socio2', label: 'Quotas do Socio 2', type: 'number', required: true },
        { name: 'percentual_socio2', label: 'Percentual Socio 2 (%)', type: 'number', required: true },
        { name: 'administrador_nome', label: 'Nome do Administrador', type: 'string', required: true },
        { name: 'periodicidade_apuracao', label: 'Periodicidade de Apuracao', type: 'string', required: true, defaultValue: 'trimestralmente' },
      ] as TemplateVariable[],
      isActive: true,
    },
  ];
}

// --- Contracts ---

function buildContracts(): Partial<Contract>[] {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const sixMonthsFromNow = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const twoYearsFromNow = new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000);

  return [
    // 1. ACTIVE rental contract (Maria as landlord, Joao as tenant)
    {
      id: CONTRACT_IDS.rentalMaria,
      contractNumber: 'TAB-2026-000001',
      title: 'Locacao Residencial - Apartamento Pinheiros',
      type: ContractType.RENTAL,
      status: ContractStatus.ACTIVE,
      content: 'Contrato de locacao residencial do apartamento localizado na Rua dos Pinheiros, 450, Apt 72, Pinheiros, Sao Paulo/SP, CEP 05422-000.',
      rawPrompt: 'Crie um contrato de locacao residencial para um apartamento em Pinheiros, SP, aluguel de R$ 3.500,00 por 30 meses.',
      parties: [
        { userId: USER_IDS.maria, name: 'Maria Aparecida da Silva', document: '529.982.247-25', email: 'maria.silva@email.com', role: 'LOCADOR', signed: true, signedAt: '2026-01-15T10:30:00Z' },
        { userId: USER_IDS.joao, name: 'Joao Pedro dos Santos', document: '714.287.938-60', email: 'joao.santos@email.com', role: 'LOCATARIO', signed: true, signedAt: '2026-01-15T14:00:00Z' },
      ] as ContractParty[],
      clauses: [
        { number: 1, title: 'Do Objeto', content: 'Locacao do imovel situado na Rua dos Pinheiros, 450, Apt 72, Pinheiros, SP, para fins exclusivamente residenciais.', isOptional: false },
        { number: 2, title: 'Do Prazo', content: 'A locacao tera prazo de 30 meses, com inicio em 01/02/2026 e termino em 31/07/2028.', isOptional: false },
        { number: 3, title: 'Do Valor', content: 'O aluguel mensal sera de R$ 3.500,00, com vencimento no dia 10 de cada mes.', isOptional: false },
        { number: 4, title: 'Do Reajuste', content: 'Reajuste anual pelo IGPM/FGV acumulado nos ultimos 12 meses.', isOptional: false },
        { number: 5, title: 'Da Caucao', content: 'Caucao de R$ 10.500,00 (3 meses de aluguel), depositada em conta poupanca.', isOptional: false },
        { number: 6, title: 'Das Obrigacoes do Locatario', content: 'Pagar pontualmente, utilizar conforme destinacao, manter conservacao, nao sublocar.', isOptional: false },
        { number: 7, title: 'Da Rescisao', content: 'Multa de 3 alugueis vigentes, proporcional ao periodo restante, em caso de rescisao antecipada.', isOptional: false },
        { number: 8, title: 'Do Foro', content: 'Foro da Comarca de Sao Paulo/SP.', isOptional: false },
      ] as ContractClause[],
      metadata: { templateUsed: true, generatedByAI: false },
      blockchainHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      blockchainTxId: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
      escrowId: 'e0000000-0000-4000-8000-000000000001',
      totalValue: '105000.00',
      currency: 'BRL',
      renewalDate: null,
      expiresAt: twoYearsFromNow,
      createdBy: USER_IDS.maria,
    },
    // 2. ACTIVE service contract (TechCorp hiring Carlos)
    {
      id: CONTRACT_IDS.servicesTechCorp,
      contractNumber: 'TAB-2026-000002',
      title: 'Prestacao de Servicos - Desenvolvimento de Sistema ERP',
      type: ContractType.SERVICE,
      status: ContractStatus.ACTIVE,
      content: 'Contrato de prestacao de servicos para desenvolvimento de modulo financeiro do sistema ERP da TechCorp Solucoes Digitais.',
      rawPrompt: null,
      parties: [
        { userId: USER_IDS.techCorp, name: 'TechCorp Solucoes Digitais Ltda', document: '12.345.678/0001-95', email: 'contato@techcorp.com.br', role: 'CONTRATANTE', signed: true, signedAt: '2026-01-20T09:00:00Z' },
        { userId: USER_IDS.carlos, name: 'Carlos Eduardo Ferreira', document: '642.091.387-45', email: 'carlos.ferreira@email.com', role: 'CONTRATADO', signed: true, signedAt: '2026-01-20T11:30:00Z' },
      ] as ContractParty[],
      clauses: [
        { number: 1, title: 'Do Objeto', content: 'Desenvolvimento do modulo financeiro do sistema ERP, incluindo contas a pagar, contas a receber, fluxo de caixa e DRE.', isOptional: false },
        { number: 2, title: 'Do Prazo', content: 'Prazo de 6 meses, com inicio em 01/02/2026 e entrega final prevista para 31/07/2026.', isOptional: false },
        { number: 3, title: 'Da Remuneracao', content: 'Valor total de R$ 48.000,00, pago em 3 milestones conforme entregas.', isOptional: false },
        { number: 4, title: 'Dos Milestones', content: 'M1: Modulo Contas a Pagar (R$ 16.000); M2: Modulo Contas a Receber + Fluxo de Caixa (R$ 16.000); M3: DRE + Integracao (R$ 16.000).', isOptional: false },
        { number: 5, title: 'Da Propriedade Intelectual', content: 'Todo codigo-fonte e documentacao sera de propriedade exclusiva da TechCorp.', isOptional: false },
        { number: 6, title: 'Da Confidencialidade', content: 'O CONTRATADO se obriga a manter sigilo sobre informacoes da TechCorp por 5 anos apos o encerramento.', isOptional: false },
      ] as ContractClause[],
      metadata: { templateUsed: true, generatedByAI: true, aiModel: 'claude-sonnet' },
      blockchainHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
      blockchainTxId: '0x2222222222222222222222222222222222222222222222222222222222222222',
      escrowId: 'e0000000-0000-4000-8000-000000000002',
      totalValue: '48000.00',
      currency: 'BRL',
      renewalDate: null,
      expiresAt: sixMonthsFromNow,
      createdBy: USER_IDS.techCorp,
    },
    // 3. COMPLETED purchase/sale contract
    {
      id: CONTRACT_IDS.purchaseSale,
      contractNumber: 'TAB-2026-000003',
      title: 'Compra e Venda - Veiculo Honda Civic 2024',
      type: ContractType.PURCHASE_SALE,
      status: ContractStatus.ACTIVE,
      content: 'Contrato de compra e venda de veiculo Honda Civic EXL 2024, placa ABC-1D23, RENAVAM 12345678901.',
      rawPrompt: null,
      parties: [
        { userId: USER_IDS.ana, name: 'Ana Carolina Oliveira', document: '830.564.715-20', email: 'ana.oliveira@email.com', role: 'VENDEDOR', signed: true, signedAt: '2026-02-01T15:00:00Z' },
        { userId: USER_IDS.fernanda, name: 'Fernanda Beatriz Costa', document: '951.372.846-01', email: 'fernanda.costa@email.com', role: 'COMPRADOR', signed: true, signedAt: '2026-02-01T16:30:00Z' },
      ] as ContractParty[],
      clauses: [
        { number: 1, title: 'Do Objeto', content: 'Venda do veiculo Honda Civic EXL 2024, cor prata, placa ABC-1D23, Renavam 12345678901, chassi 9BWZZZ377VT004251.', isOptional: false },
        { number: 2, title: 'Do Preco', content: 'Preco total de R$ 135.000,00 (cento e trinta e cinco mil reais).', isOptional: false },
        { number: 3, title: 'Do Pagamento', content: 'Pagamento integral via PIX no ato da transferencia do veiculo, com uso de escrow na plataforma Tabeliao.', isOptional: false },
        { number: 4, title: 'Da Garantia', content: 'O VENDEDOR garante que o veiculo esta livre de onus, multas e restricoes.', isOptional: false },
      ] as ContractClause[],
      metadata: { vehiclePlate: 'ABC-1D23', vehicleRenavam: '12345678901' },
      blockchainHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
      blockchainTxId: '0x4444444444444444444444444444444444444444444444444444444444444444',
      escrowId: 'e0000000-0000-4000-8000-000000000003',
      totalValue: '135000.00',
      currency: 'BRL',
      renewalDate: null,
      expiresAt: null,
      createdBy: USER_IDS.ana,
    },
    // 4. ACTIVE freelancer contract (TechCorp hiring Maria as designer)
    {
      id: CONTRACT_IDS.freelancerCarlos,
      contractNumber: 'TAB-2026-000004',
      title: 'Freelancer - Design de Interface para App Mobile',
      type: ContractType.FREELANCER,
      status: ContractStatus.ACTIVE,
      content: 'Contrato freelancer para design UI/UX do aplicativo mobile da TechCorp, incluindo wireframes, prototipos e design system.',
      rawPrompt: 'Preciso de um contrato freelancer para design de aplicativo mobile, 3 milestones, valor total R$ 18.000',
      parties: [
        { userId: USER_IDS.techCorp, name: 'TechCorp Solucoes Digitais Ltda', document: '12.345.678/0001-95', email: 'contato@techcorp.com.br', role: 'CONTRATANTE', signed: true, signedAt: '2026-02-05T10:00:00Z' },
        { userId: USER_IDS.maria, name: 'Maria Aparecida da Silva', document: '529.982.247-25', email: 'maria.silva@email.com', role: 'FREELANCER', signed: true, signedAt: '2026-02-05T11:00:00Z' },
      ] as ContractParty[],
      clauses: [
        { number: 1, title: 'Do Escopo', content: 'Design completo do app mobile: wireframes, prototipos interativos no Figma e design system.', isOptional: false },
        { number: 2, title: 'Dos Milestones', content: 'M1: Wireframes (R$ 6.000); M2: Prototipos Interativos (R$ 6.000); M3: Design System (R$ 6.000).', isOptional: false },
        { number: 3, title: 'Do Valor e Pagamento', content: 'Valor total de R$ 18.000,00 via escrow Tabeliao, liberado por milestone.', isOptional: false },
        { number: 4, title: 'Da Autonomia', content: 'Sem vinculo empregaticio, conforme art. 442-B CLT.', isOptional: false },
        { number: 5, title: 'Da Propriedade Intelectual', content: 'Direitos transferidos a TechCorp apos pagamento integral.', isOptional: false },
      ] as ContractClause[],
      metadata: { generatedByAI: true, escrowMilestones: 3 },
      blockchainHash: null,
      blockchainTxId: null,
      escrowId: null,
      totalValue: '18000.00',
      currency: 'BRL',
      renewalDate: null,
      expiresAt: new Date('2026-05-05T23:59:59Z'),
      createdBy: USER_IDS.techCorp,
    },
    // 5. COMPLETED NDA (Maria and TechCorp)
    {
      id: CONTRACT_IDS.ndaMaria,
      contractNumber: 'TAB-2026-000005',
      title: 'NDA - Projeto de Redesign TechCorp',
      type: ContractType.NDA,
      status: ContractStatus.ACTIVE,
      content: 'Acordo de confidencialidade bilateral para o projeto de redesign do aplicativo mobile da TechCorp.',
      rawPrompt: null,
      parties: [
        { userId: USER_IDS.techCorp, name: 'TechCorp Solucoes Digitais Ltda', document: '12.345.678/0001-95', email: 'contato@techcorp.com.br', role: 'PARTE_REVELADORA', signed: true, signedAt: '2026-02-04T09:00:00Z' },
        { userId: USER_IDS.maria, name: 'Maria Aparecida da Silva', document: '529.982.247-25', email: 'maria.silva@email.com', role: 'PARTE_RECEPTORA', signed: true, signedAt: '2026-02-04T09:30:00Z' },
      ] as ContractParty[],
      clauses: [
        { number: 1, title: 'Do Objeto', content: 'Protecao de informacoes compartilhadas no ambito do projeto de redesign do app mobile TechCorp.', isOptional: false },
        { number: 2, title: 'Das Informacoes Confidenciais', content: 'Incluem dados tecnicos, wireframes, roadmap de produto, estrategia comercial e dados de usuarios.', isOptional: false },
        { number: 3, title: 'Do Prazo', content: 'Vigencia de 5 anos a partir da assinatura.', isOptional: false },
        { number: 4, title: 'Da Penalidade', content: 'Indenizacao minima de R$ 100.000,00 por violacao.', isOptional: false },
      ] as ContractClause[],
      metadata: { associatedProject: 'redesign-mobile-techcorp' },
      blockchainHash: '0x5555555555555555555555555555555555555555555555555555555555555555',
      blockchainTxId: '0x6666666666666666666666666666666666666666666666666666666666666666',
      escrowId: null,
      totalValue: null,
      currency: 'BRL',
      renewalDate: null,
      expiresAt: new Date('2031-02-04T23:59:59Z'),
      createdBy: USER_IDS.techCorp,
    },
    // 6. ACTIVE partnership contract (Maria and Joao start a business)
    {
      id: CONTRACT_IDS.partnership,
      contractNumber: 'TAB-2026-000006',
      title: 'Contrato Social - MJ Consultoria Digital Ltda',
      type: ContractType.PARTNERSHIP,
      status: ContractStatus.ACTIVE,
      content: 'Contrato social para constituicao da MJ Consultoria Digital Ltda, sociedade entre Maria Silva e Joao Santos.',
      rawPrompt: null,
      parties: [
        { userId: USER_IDS.maria, name: 'Maria Aparecida da Silva', document: '529.982.247-25', email: 'maria.silva@email.com', role: 'SOCIO', signed: true, signedAt: '2026-01-10T10:00:00Z' },
        { userId: USER_IDS.joao, name: 'Joao Pedro dos Santos', document: '714.287.938-60', email: 'joao.santos@email.com', role: 'SOCIO', signed: true, signedAt: '2026-01-10T10:30:00Z' },
      ] as ContractParty[],
      clauses: [
        { number: 1, title: 'Da Denominacao', content: 'MJ Consultoria Digital Ltda.', isOptional: false },
        { number: 2, title: 'Do Capital Social', content: 'Capital social de R$ 100.000,00 dividido em 1.000 quotas. Maria: 600 quotas (60%). Joao: 400 quotas (40%).', isOptional: false },
        { number: 3, title: 'Do Objeto Social', content: 'Consultoria em tecnologia da informacao, desenvolvimento de software e marketing digital.', isOptional: false },
        { number: 4, title: 'Da Administracao', content: 'Ambos os socios serao administradores com poderes iguais.', isOptional: false },
        { number: 5, title: 'Da Distribuicao de Lucros', content: 'Apuracao trimestral, distribuicao proporcional as quotas.', isOptional: false },
      ] as ContractClause[],
      metadata: { cnpjRegistration: 'pending' },
      blockchainHash: '0x7777777777777777777777777777777777777777777777777777777777777777',
      blockchainTxId: '0x8888888888888888888888888888888888888888888888888888888888888888',
      escrowId: null,
      totalValue: '100000.00',
      currency: 'BRL',
      renewalDate: null,
      expiresAt: null,
      createdBy: USER_IDS.maria,
    },
    // 7. DRAFT rental contract (not yet sent for signing)
    {
      id: CONTRACT_IDS.rentalDraft,
      contractNumber: 'TAB-2026-000007',
      title: 'Locacao Comercial - Sala Bela Vista (RASCUNHO)',
      type: ContractType.RENTAL,
      status: ContractStatus.DRAFT,
      content: 'Contrato de locacao de sala comercial no edificio Bela Vista, Av. Paulista, 1000, sala 1201, Sao Paulo/SP.',
      rawPrompt: 'Faca um contrato de locacao comercial para uma sala na Av. Paulista',
      parties: [
        { userId: USER_IDS.carlos, name: 'Carlos Eduardo Ferreira', document: '642.091.387-45', email: 'carlos.ferreira@email.com', role: 'LOCADOR', signed: false },
        { userId: USER_IDS.techCorp, name: 'TechCorp Solucoes Digitais Ltda', document: '12.345.678/0001-95', email: 'contato@techcorp.com.br', role: 'LOCATARIO', signed: false },
      ] as ContractParty[],
      clauses: [
        { number: 1, title: 'Do Objeto', content: 'Locacao da sala comercial 1201, Av. Paulista, 1000, Bela Vista, SP.', isOptional: false },
        { number: 2, title: 'Do Prazo', content: 'Prazo de 36 meses.', isOptional: false },
        { number: 3, title: 'Do Valor', content: 'Aluguel mensal de R$ 8.500,00.', isOptional: false },
      ] as ContractClause[],
      metadata: { draft: true, templateUsed: true },
      blockchainHash: null,
      blockchainTxId: null,
      escrowId: null,
      totalValue: '306000.00',
      currency: 'BRL',
      renewalDate: null,
      expiresAt: null,
      createdBy: USER_IDS.carlos,
    },
    // 8. PENDING_SIGNATURES (one party signed, waiting for the other)
    {
      id: CONTRACT_IDS.pendingSignatures,
      contractNumber: 'TAB-2026-000008',
      title: 'Prestacao de Servicos - Consultoria em Marketing Digital',
      type: ContractType.SERVICE,
      status: ContractStatus.PENDING_SIGNATURES,
      content: 'Contrato de consultoria em marketing digital e gestao de redes sociais para a TechCorp.',
      rawPrompt: null,
      parties: [
        { userId: USER_IDS.techCorp, name: 'TechCorp Solucoes Digitais Ltda', document: '12.345.678/0001-95', email: 'contato@techcorp.com.br', role: 'CONTRATANTE', signed: true, signedAt: '2026-02-18T14:00:00Z' },
        { userId: USER_IDS.ana, name: 'Ana Carolina Oliveira', document: '830.564.715-20', email: 'ana.oliveira@email.com', role: 'CONTRATADO', signed: false },
      ] as ContractParty[],
      clauses: [
        { number: 1, title: 'Do Objeto', content: 'Consultoria em marketing digital, incluindo gestao de redes sociais, producao de conteudo e analise de metricas.', isOptional: false },
        { number: 2, title: 'Do Prazo', content: 'Prazo de 12 meses a partir da assinatura.', isOptional: false },
        { number: 3, title: 'Da Remuneracao', content: 'Valor mensal de R$ 5.000,00, totalizando R$ 60.000,00.', isOptional: false },
        { number: 4, title: 'Da Confidencialidade', content: 'Obrigacao de sigilo sobre dados e estrategias do contratante.', isOptional: true },
      ] as ContractClause[],
      metadata: { awaitingSignatureFrom: USER_IDS.ana },
      blockchainHash: null,
      blockchainTxId: null,
      escrowId: null,
      totalValue: '60000.00',
      currency: 'BRL',
      renewalDate: null,
      expiresAt: oneYearFromNow,
      createdBy: USER_IDS.techCorp,
    },
    // 9. CANCELLED contract
    {
      id: CONTRACT_IDS.cancelledContract,
      contractNumber: 'TAB-2026-000009',
      title: 'Locacao Residencial - Casa em Campinas (CANCELADO)',
      type: ContractType.RENTAL,
      status: ContractStatus.CANCELLED,
      content: 'Contrato de locacao residencial cancelado antes da assinatura devido a desistencia do locatario.',
      rawPrompt: null,
      parties: [
        { userId: USER_IDS.fernanda, name: 'Fernanda Beatriz Costa', document: '951.372.846-01', email: 'fernanda.costa@email.com', role: 'LOCADOR', signed: false },
        { userId: USER_IDS.joao, name: 'Joao Pedro dos Santos', document: '714.287.938-60', email: 'joao.santos@email.com', role: 'LOCATARIO', signed: false },
      ] as ContractParty[],
      clauses: [
        { number: 1, title: 'Do Objeto', content: 'Locacao da casa na Rua das Flores, 200, Campinas/SP.', isOptional: false },
        { number: 2, title: 'Do Valor', content: 'Aluguel mensal de R$ 2.800,00.', isOptional: false },
      ] as ContractClause[],
      metadata: { cancellationReason: 'Desistencia do locatario', cancelledBy: USER_IDS.joao },
      blockchainHash: null,
      blockchainTxId: null,
      escrowId: null,
      totalValue: '100800.00',
      currency: 'BRL',
      renewalDate: null,
      expiresAt: null,
      createdBy: USER_IDS.fernanda,
    },
    // 10. DISPUTED contract (linked to dispute service)
    {
      id: CONTRACT_IDS.disputedContract,
      contractNumber: 'TAB-2026-000010',
      title: 'Prestacao de Servicos - Reforma Residencial (EM DISPUTA)',
      type: ContractType.SERVICE,
      status: ContractStatus.DISPUTED,
      content: 'Contrato de prestacao de servicos para reforma residencial. Disputa aberta por atraso na entrega e qualidade do servico.',
      rawPrompt: null,
      parties: [
        { userId: USER_IDS.joao, name: 'Joao Pedro dos Santos', document: '714.287.938-60', email: 'joao.santos@email.com', role: 'CONTRATANTE', signed: true, signedAt: '2025-11-01T09:00:00Z' },
        { userId: USER_IDS.carlos, name: 'Carlos Eduardo Ferreira', document: '642.091.387-45', email: 'carlos.ferreira@email.com', role: 'CONTRATADO', signed: true, signedAt: '2025-11-01T10:00:00Z' },
      ] as ContractParty[],
      clauses: [
        { number: 1, title: 'Do Objeto', content: 'Reforma completa do banheiro e cozinha do apartamento na Rua Consolacao, 350, AP 101, SP.', isOptional: false },
        { number: 2, title: 'Do Prazo', content: 'Prazo de 45 dias uteis, com inicio em 04/11/2025 e termino previsto para 06/01/2026.', isOptional: false },
        { number: 3, title: 'Do Valor', content: 'Valor total de R$ 35.000,00, dividido em 3 parcelas conforme andamento da obra.', isOptional: false },
        { number: 4, title: 'Da Garantia', content: 'Garantia de 1 ano para mao de obra e 5 anos para material, conforme art. 618 do Codigo Civil.', isOptional: false },
      ] as ContractClause[],
      metadata: { hasActiveDispute: true, disputeOpenedAt: '2026-01-20T10:00:00Z' },
      blockchainHash: '0x9999999999999999999999999999999999999999999999999999999999999999',
      blockchainTxId: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      escrowId: null,
      totalValue: '35000.00',
      currency: 'BRL',
      renewalDate: null,
      expiresAt: null,
      createdBy: USER_IDS.joao,
    },
  ];
}

// --- Signatures ---

function buildSignatures(): Partial<Signature>[] {
  return [
    // Rental contract - both signed
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.rentalMaria,
      userId: USER_IDS.maria,
      signatureHash: 'sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      signatureType: SignatureType.GOVBR,
      ipAddress: '187.45.123.45',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      govbrValidated: true,
      certificateId: null,
    },
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.rentalMaria,
      userId: USER_IDS.joao,
      signatureHash: 'sha256:b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
      signatureType: SignatureType.ADVANCED,
      ipAddress: '201.17.89.201',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      govbrValidated: false,
      certificateId: null,
    },
    // Services contract - both signed
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.servicesTechCorp,
      userId: USER_IDS.techCorp,
      signatureHash: 'sha256:c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      signatureType: SignatureType.ICP_BRASIL,
      ipAddress: '177.220.54.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      govbrValidated: false,
      certificateId: 'ICP-BR-CERT-TECHCORP-2026-001',
    },
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.servicesTechCorp,
      userId: USER_IDS.carlos,
      signatureHash: 'sha256:d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
      signatureType: SignatureType.SIMPLE,
      ipAddress: '189.73.112.88',
      userAgent: 'Mozilla/5.0 (Linux; Android 14)',
      govbrValidated: false,
      certificateId: null,
    },
    // Purchase/sale - both signed
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.purchaseSale,
      userId: USER_IDS.ana,
      signatureHash: 'sha256:e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
      signatureType: SignatureType.GOVBR,
      ipAddress: '179.108.211.33',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2)',
      govbrValidated: true,
      certificateId: null,
    },
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.purchaseSale,
      userId: USER_IDS.fernanda,
      signatureHash: 'sha256:f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1',
      signatureType: SignatureType.SIMPLE,
      ipAddress: '200.145.67.90',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      govbrValidated: false,
      certificateId: null,
    },
    // Pending signatures - only TechCorp signed
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.pendingSignatures,
      userId: USER_IDS.techCorp,
      signatureHash: 'sha256:a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8',
      signatureType: SignatureType.ICP_BRASIL,
      ipAddress: '177.220.54.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      govbrValidated: false,
      certificateId: 'ICP-BR-CERT-TECHCORP-2026-002',
    },
    // Disputed contract - both signed (signed before dispute)
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.disputedContract,
      userId: USER_IDS.joao,
      signatureHash: 'sha256:1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b',
      signatureType: SignatureType.ADVANCED,
      ipAddress: '201.17.89.201',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      govbrValidated: false,
      certificateId: null,
    },
    {
      id: uuidv4(),
      contractId: CONTRACT_IDS.disputedContract,
      userId: USER_IDS.carlos,
      signatureHash: 'sha256:2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c',
      signatureType: SignatureType.SIMPLE,
      ipAddress: '189.73.112.88',
      userAgent: 'Mozilla/5.0 (Linux; Android 14)',
      govbrValidated: false,
      certificateId: null,
    },
  ];
}

// --- Contract Events ---

function buildContractEvents(): Partial<ContractEvent>[] {
  return [
    // Rental contract events (full lifecycle)
    { id: uuidv4(), contractId: CONTRACT_IDS.rentalMaria, eventType: ContractEventType.CREATED, description: 'Contrato de locacao residencial criado por Maria Aparecida da Silva.', metadata: {}, performedBy: USER_IDS.maria },
    { id: uuidv4(), contractId: CONTRACT_IDS.rentalMaria, eventType: ContractEventType.SIGNED, description: 'Maria Aparecida da Silva assinou o contrato via Gov.br.', metadata: { signatureType: 'GOVBR' }, performedBy: USER_IDS.maria },
    { id: uuidv4(), contractId: CONTRACT_IDS.rentalMaria, eventType: ContractEventType.SIGNED, description: 'Joao Pedro dos Santos assinou o contrato com assinatura avancada.', metadata: { signatureType: 'ADVANCED' }, performedBy: USER_IDS.joao },
    { id: uuidv4(), contractId: CONTRACT_IDS.rentalMaria, eventType: ContractEventType.ALL_SIGNED, description: 'Todas as partes assinaram o contrato.', metadata: {}, performedBy: null },
    { id: uuidv4(), contractId: CONTRACT_IDS.rentalMaria, eventType: ContractEventType.ACTIVATED, description: 'Contrato ativado e vigente.', metadata: {}, performedBy: null },
    { id: uuidv4(), contractId: CONTRACT_IDS.rentalMaria, eventType: ContractEventType.BLOCKCHAIN_REGISTERED, description: 'Contrato registrado na blockchain Polygon.', metadata: { txId: '0x9876543210fedcba' }, performedBy: null },
    { id: uuidv4(), contractId: CONTRACT_IDS.rentalMaria, eventType: ContractEventType.PDF_GENERATED, description: 'PDF do contrato gerado e armazenado no S3.', metadata: { s3Key: 'contracts/TAB-2026-000001.pdf' }, performedBy: null },
    { id: uuidv4(), contractId: CONTRACT_IDS.rentalMaria, eventType: ContractEventType.PAYMENT_RECEIVED, description: 'Pagamento do aluguel de fevereiro/2026 recebido via PIX.', metadata: { amount: 3500, month: '02/2026' }, performedBy: USER_IDS.joao },

    // Services contract events
    { id: uuidv4(), contractId: CONTRACT_IDS.servicesTechCorp, eventType: ContractEventType.CREATED, description: 'Contrato de servicos criado pela TechCorp.', metadata: {}, performedBy: USER_IDS.techCorp },
    { id: uuidv4(), contractId: CONTRACT_IDS.servicesTechCorp, eventType: ContractEventType.SIGNED, description: 'TechCorp assinou com certificado ICP-Brasil.', metadata: { signatureType: 'ICP_BRASIL' }, performedBy: USER_IDS.techCorp },
    { id: uuidv4(), contractId: CONTRACT_IDS.servicesTechCorp, eventType: ContractEventType.SIGNED, description: 'Carlos Eduardo Ferreira assinou com assinatura simples.', metadata: { signatureType: 'SIMPLE' }, performedBy: USER_IDS.carlos },
    { id: uuidv4(), contractId: CONTRACT_IDS.servicesTechCorp, eventType: ContractEventType.ALL_SIGNED, description: 'Todas as partes assinaram.', metadata: {}, performedBy: null },
    { id: uuidv4(), contractId: CONTRACT_IDS.servicesTechCorp, eventType: ContractEventType.ACTIVATED, description: 'Contrato ativado.', metadata: {}, performedBy: null },
    { id: uuidv4(), contractId: CONTRACT_IDS.servicesTechCorp, eventType: ContractEventType.PAYMENT_RECEIVED, description: 'Milestone 1 - Modulo Contas a Pagar aprovado e pagamento de R$ 16.000 liberado do escrow.', metadata: { milestone: 1, amount: 16000 }, performedBy: USER_IDS.techCorp },

    // Purchase/sale events
    { id: uuidv4(), contractId: CONTRACT_IDS.purchaseSale, eventType: ContractEventType.CREATED, description: 'Contrato de compra e venda criado.', metadata: {}, performedBy: USER_IDS.ana },
    { id: uuidv4(), contractId: CONTRACT_IDS.purchaseSale, eventType: ContractEventType.ALL_SIGNED, description: 'Ambas as partes assinaram.', metadata: {}, performedBy: null },
    { id: uuidv4(), contractId: CONTRACT_IDS.purchaseSale, eventType: ContractEventType.ACTIVATED, description: 'Contrato ativado.', metadata: {}, performedBy: null },

    // Draft contract event
    { id: uuidv4(), contractId: CONTRACT_IDS.rentalDraft, eventType: ContractEventType.CREATED, description: 'Rascunho de contrato comercial criado.', metadata: { isDraft: true }, performedBy: USER_IDS.carlos },

    // Pending signatures events
    { id: uuidv4(), contractId: CONTRACT_IDS.pendingSignatures, eventType: ContractEventType.CREATED, description: 'Contrato de consultoria criado pela TechCorp.', metadata: {}, performedBy: USER_IDS.techCorp },
    { id: uuidv4(), contractId: CONTRACT_IDS.pendingSignatures, eventType: ContractEventType.SIGNED, description: 'TechCorp assinou. Aguardando assinatura de Ana Carolina Oliveira.', metadata: {}, performedBy: USER_IDS.techCorp },
    { id: uuidv4(), contractId: CONTRACT_IDS.pendingSignatures, eventType: ContractEventType.NOTIFICATION_SENT, description: 'Notificacao enviada para Ana Carolina Oliveira solicitar assinatura.', metadata: { channel: 'email', recipient: 'ana.oliveira@email.com' }, performedBy: null },

    // Cancelled contract events
    { id: uuidv4(), contractId: CONTRACT_IDS.cancelledContract, eventType: ContractEventType.CREATED, description: 'Contrato de locacao residencial criado.', metadata: {}, performedBy: USER_IDS.fernanda },
    { id: uuidv4(), contractId: CONTRACT_IDS.cancelledContract, eventType: ContractEventType.CANCELLED, description: 'Contrato cancelado por desistencia do locatario (Joao Pedro dos Santos).', metadata: { reason: 'Desistencia do locatario' }, performedBy: USER_IDS.joao },

    // Disputed contract events
    { id: uuidv4(), contractId: CONTRACT_IDS.disputedContract, eventType: ContractEventType.CREATED, description: 'Contrato de reforma residencial criado.', metadata: {}, performedBy: USER_IDS.joao },
    { id: uuidv4(), contractId: CONTRACT_IDS.disputedContract, eventType: ContractEventType.ALL_SIGNED, description: 'Todas as partes assinaram.', metadata: {}, performedBy: null },
    { id: uuidv4(), contractId: CONTRACT_IDS.disputedContract, eventType: ContractEventType.ACTIVATED, description: 'Contrato ativado.', metadata: {}, performedBy: null },
    { id: uuidv4(), contractId: CONTRACT_IDS.disputedContract, eventType: ContractEventType.PAYMENT_RECEIVED, description: 'Primeira parcela de R$ 15.000 recebida.', metadata: { amount: 15000, installment: 1 }, performedBy: USER_IDS.joao },
    { id: uuidv4(), contractId: CONTRACT_IDS.disputedContract, eventType: ContractEventType.PAYMENT_OVERDUE, description: 'Segunda parcela de R$ 10.000 vencida. Aguardando pagamento.', metadata: { amount: 10000, installment: 2 }, performedBy: null },
    { id: uuidv4(), contractId: CONTRACT_IDS.disputedContract, eventType: ContractEventType.DISPUTED, description: 'Disputa aberta pelo contratante por atraso na entrega e qualidade insatisfatoria.', metadata: { disputeType: 'QUALITY_DISPUTE' }, performedBy: USER_IDS.joao },
  ];
}

function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    username: process.env['DB_USERNAME'] ?? 'tabeliao',
    password: process.env['DB_PASSWORD'] ?? 'tabeliao',
    database: process.env['DB_DATABASE'] ?? 'tabeliao_contracts',
    entities: [Contract, Signature, ContractEvent, Template],
    synchronize: true,
    logging: false,
  });
}

export async function seedContracts(): Promise<void> {
  console.log('[contract-service] Starting seed...');
  const dataSource = createDataSource();

  try {
    await dataSource.initialize();
    console.log('[contract-service] Database connected.');

    const templateRepo = dataSource.getRepository(Template);
    const contractRepo = dataSource.getRepository(Contract);
    const signatureRepo = dataSource.getRepository(Signature);
    const eventRepo = dataSource.getRepository(ContractEvent);

    // Clear existing data (in order due to FK constraints)
    console.log('[contract-service] Clearing existing data...');
    await eventRepo.delete({});
    await signatureRepo.delete({});
    await contractRepo.delete({});
    await templateRepo.delete({});

    // Seed templates
    const templates = buildTemplates();
    console.log(`[contract-service] Inserting ${templates.length} templates...`);
    for (const tmpl of templates) {
      await templateRepo.save(templateRepo.create(tmpl));
      console.log(`  - Template: ${tmpl.name}`);
    }

    // Seed contracts
    const contracts = buildContracts();
    console.log(`[contract-service] Inserting ${contracts.length} contracts...`);
    for (const contract of contracts) {
      await contractRepo.save(contractRepo.create(contract));
      console.log(`  - Contract: ${contract.contractNumber} - ${contract.title} [${contract.status}]`);
    }

    // Seed signatures
    const signatures = buildSignatures();
    console.log(`[contract-service] Inserting ${signatures.length} signatures...`);
    for (const sig of signatures) {
      await signatureRepo.save(signatureRepo.create(sig));
    }
    console.log(`  - ${signatures.length} signatures inserted.`);

    // Seed events
    const events = buildContractEvents();
    console.log(`[contract-service] Inserting ${events.length} contract events...`);
    for (const event of events) {
      await eventRepo.save(eventRepo.create(event));
    }
    console.log(`  - ${events.length} events inserted.`);

    console.log('[contract-service] Seed completed successfully.');
  } catch (error) {
    console.error('[contract-service] Seed failed:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// Allow running directly
if (require.main === module) {
  seedContracts()
    .then(() => {
      console.log('[contract-service] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[contract-service] Fatal error:', err);
      process.exit(1);
    });
}
