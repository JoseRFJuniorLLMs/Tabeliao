import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Handlebars from 'handlebars';
import { Template, TemplateVariable } from './entities/template.entity';
import { ContractType } from '../contracts/entities/contract.entity';

@Injectable()
export class TemplatesService implements OnModuleInit {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultTemplates();
  }

  async findAll(category?: ContractType): Promise<Template[]> {
    const where: Record<string, unknown> = { isActive: true };
    if (category) {
      where.category = category;
    }

    return this.templateRepository.find({
      where,
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Template> {
    const template = await this.templateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template com ID ${id} nao encontrado`);
    }

    return template;
  }

  async renderTemplate(
    id: string,
    variables: Record<string, unknown>,
  ): Promise<string> {
    const template = await this.findOne(id);

    const missingRequired = template.variables
      .filter((v) => v.required && !(v.name in variables))
      .map((v) => v.name);

    if (missingRequired.length > 0) {
      throw new BadRequestException(
        `Variaveis obrigatorias ausentes: ${missingRequired.join(', ')}`,
      );
    }

    const enrichedVariables: Record<string, unknown> = {};

    for (const varDef of template.variables) {
      const value = variables[varDef.name] ?? varDef.defaultValue ?? '';
      enrichedVariables[varDef.name] = this.formatVariable(value, varDef.type);
    }

    for (const [key, value] of Object.entries(variables)) {
      if (!(key in enrichedVariables)) {
        enrichedVariables[key] = value;
      }
    }

    enrichedVariables['dataAtual'] = new Date().toLocaleDateString('pt-BR');
    enrichedVariables['dataAtualExtenso'] = this.dateToExtended(new Date());

    try {
      const compiled = Handlebars.compile(template.content);
      return compiled(enrichedVariables);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new BadRequestException(
        `Erro ao renderizar template: ${message}`,
      );
    }
  }

  async getCategories(): Promise<{ category: ContractType; count: number }[]> {
    const result = await this.templateRepository
      .createQueryBuilder('template')
      .select('template.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('template.isActive = :isActive', { isActive: true })
      .groupBy('template.category')
      .getRawMany<{ category: ContractType; count: string }>();

    return result.map((r) => ({
      category: r.category,
      count: parseInt(r.count, 10),
    }));
  }

  private formatVariable(
    value: unknown,
    type: TemplateVariable['type'],
  ): string {
    const strValue = String(value);

    switch (type) {
      case 'currency':
        return parseFloat(strValue).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });

      case 'date':
        return new Date(strValue).toLocaleDateString('pt-BR');

      case 'cpf':
        return strValue.replace(
          /(\d{3})(\d{3})(\d{3})(\d{2})/,
          '$1.$2.$3-$4',
        );

      case 'cnpj':
        return strValue.replace(
          /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
          '$1.$2.$3/$4-$5',
        );

      default:
        return strValue;
    }
  }

  private dateToExtended(date: Date): string {
    const months = [
      'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} de ${month} de ${year}`;
  }

  private async seedDefaultTemplates(): Promise<void> {
    const count = await this.templateRepository.count();
    if (count > 0) {
      this.logger.log('Templates already seeded, skipping');
      return;
    }

    this.logger.log('Seeding default contract templates...');

    const defaults = this.getDefaultTemplates();
    for (const tpl of defaults) {
      await this.templateRepository.save(this.templateRepository.create(tpl));
    }

    this.logger.log(`Seeded ${defaults.length} default templates`);
  }

  private getDefaultTemplates(): Partial<Template>[] {
    return [
      {
        name: 'Contrato de Locacao Residencial',
        category: ContractType.RENTAL,
        description:
          'Modelo padrao de contrato de locacao residencial conforme Lei do Inquilinato (Lei 8.245/91)',
        variables: [
          { name: 'locadorNome', label: 'Nome do Locador', type: 'string', required: true },
          { name: 'locadorCpf', label: 'CPF do Locador', type: 'cpf', required: true },
          { name: 'locadorEndereco', label: 'Endereco do Locador', type: 'address', required: true },
          { name: 'locatarioNome', label: 'Nome do Locatario', type: 'string', required: true },
          { name: 'locatarioCpf', label: 'CPF do Locatario', type: 'cpf', required: true },
          { name: 'locatarioEndereco', label: 'Endereco do Locatario', type: 'address', required: true },
          { name: 'enderecoImovel', label: 'Endereco do Imovel', type: 'address', required: true },
          { name: 'valorAluguel', label: 'Valor do Aluguel (R$)', type: 'currency', required: true },
          { name: 'diaVencimento', label: 'Dia do Vencimento', type: 'number', required: true },
          { name: 'prazoMeses', label: 'Prazo em Meses', type: 'number', required: true },
          { name: 'dataInicio', label: 'Data de Inicio', type: 'date', required: true },
          { name: 'dataFim', label: 'Data de Termino', type: 'date', required: true },
          { name: 'valorCaucao', label: 'Valor da Caucao (R$)', type: 'currency', required: false, defaultValue: '0' },
          { name: 'indiceReajuste', label: 'Indice de Reajuste', type: 'string', required: false, defaultValue: 'IGPM' },
          { name: 'finalidadeUso', label: 'Finalidade de Uso', type: 'string', required: false, defaultValue: 'residencial' },
        ],
        content: `CONTRATO DE LOCACAO RESIDENCIAL

Pelo presente instrumento particular de contrato de locacao residencial, as partes abaixo qualificadas:

LOCADOR(A): {{locadorNome}}, inscrito(a) no CPF sob o numero {{locadorCpf}}, residente e domiciliado(a) em {{locadorEndereco}}, doravante denominado(a) simplesmente LOCADOR(A);

LOCATARIO(A): {{locatarioNome}}, inscrito(a) no CPF sob o numero {{locatarioCpf}}, residente e domiciliado(a) em {{locatarioEndereco}}, doravante denominado(a) simplesmente LOCATARIO(A);

Tem entre si justo e contratado o seguinte:

CLAUSULA 1 - DO OBJETO
O LOCADOR(A) cede ao LOCATARIO(A), para fins de uso {{finalidadeUso}}, o imovel situado em {{enderecoImovel}}.

CLAUSULA 2 - DO PRAZO
O prazo da locacao e de {{prazoMeses}} meses, com inicio em {{dataInicio}} e termino em {{dataFim}}.

CLAUSULA 3 - DO ALUGUEL
O valor mensal do aluguel e de {{valorAluguel}}, que devera ser pago ate o dia {{diaVencimento}} de cada mes, mediante deposito bancario ou transferencia na conta indicada pelo LOCADOR(A).

CLAUSULA 4 - DO REAJUSTE
O valor do aluguel sera reajustado anualmente com base no indice {{indiceReajuste}}, acumulado no periodo de 12 (doze) meses.

CLAUSULA 5 - DA MULTA POR ATRASO
Em caso de atraso no pagamento do aluguel, incidira multa de 10% (dez por cento) sobre o valor devido, acrescido de juros de mora de 1% (um por cento) ao mes.

CLAUSULA 6 - DA CAUCAO
A titulo de garantia, o LOCATARIO(A) deposita a quantia de {{valorCaucao}}, que sera devolvida ao final do contrato, descontados eventuais danos ao imovel.

CLAUSULA 7 - DAS OBRIGACOES DO LOCATARIO
a) Pagar pontualmente o aluguel e demais encargos;
b) Manter o imovel em boas condicoes de conservacao;
c) Nao sublocar ou ceder o imovel sem autorizacao por escrito do LOCADOR(A);
d) Restituir o imovel, finda a locacao, no estado em que o recebeu, salvo deterioracoes decorrentes do uso normal;
e) Pagar as despesas de consumo (agua, luz, gas, internet) durante o periodo da locacao.

CLAUSULA 8 - DAS OBRIGACOES DO LOCADOR
a) Entregar o imovel em estado de servir ao uso a que se destina;
b) Garantir o uso pacifico do imovel durante a locacao;
c) Manter a forma e o destino do imovel;
d) Responsabilizar-se por vicios ou defeitos anteriores a locacao.

CLAUSULA 9 - DA RESCISAO
Em caso de rescisao antecipada pelo LOCATARIO(A), sera devida multa proporcional ao periodo restante, equivalente a 3 (tres) alugueis, proporcionalmente reduzida com base no prazo ja cumprido.

CLAUSULA 10 - DO FORO
Fica eleito o foro da comarca do imovel para dirimir quaisquer duvidas ou questoes decorrentes do presente contrato.

E, por estarem assim justos e contratados, firmam o presente instrumento em 2 (duas) vias de igual teor e forma, juntamente com 2 (duas) testemunhas.

Local e data: {{dataAtualExtenso}}

_________________________________
{{locadorNome}} - LOCADOR(A)

_________________________________
{{locatarioNome}} - LOCATARIO(A)`,
        isActive: true,
      },
      {
        name: 'Contrato de Prestacao de Servico',
        category: ContractType.SERVICE,
        description:
          'Modelo padrao de contrato de prestacao de servicos conforme Codigo Civil Brasileiro',
        variables: [
          { name: 'contratanteNome', label: 'Nome do Contratante', type: 'string', required: true },
          { name: 'contratanteCpfCnpj', label: 'CPF/CNPJ do Contratante', type: 'string', required: true },
          { name: 'contratanteEndereco', label: 'Endereco do Contratante', type: 'address', required: true },
          { name: 'prestadorNome', label: 'Nome do Prestador', type: 'string', required: true },
          { name: 'prestadorCpfCnpj', label: 'CPF/CNPJ do Prestador', type: 'string', required: true },
          { name: 'prestadorEndereco', label: 'Endereco do Prestador', type: 'address', required: true },
          { name: 'descricaoServico', label: 'Descricao do Servico', type: 'string', required: true },
          { name: 'valorServico', label: 'Valor do Servico (R$)', type: 'currency', required: true },
          { name: 'formaPagamento', label: 'Forma de Pagamento', type: 'string', required: true },
          { name: 'prazoExecucao', label: 'Prazo de Execucao', type: 'string', required: true },
          { name: 'dataInicio', label: 'Data de Inicio', type: 'date', required: true },
        ],
        content: `CONTRATO DE PRESTACAO DE SERVICOS

Pelo presente instrumento particular, as partes:

CONTRATANTE: {{contratanteNome}}, inscrito(a) no CPF/CNPJ sob o numero {{contratanteCpfCnpj}}, com endereco em {{contratanteEndereco}}, doravante denominado(a) CONTRATANTE;

PRESTADOR(A): {{prestadorNome}}, inscrito(a) no CPF/CNPJ sob o numero {{prestadorCpfCnpj}}, com endereco em {{prestadorEndereco}}, doravante denominado(a) PRESTADOR(A);

Resolvem celebrar o presente contrato de prestacao de servicos, que se regera pelas clausulas e condicoes seguintes:

CLAUSULA 1 - DO OBJETO
O PRESTADOR(A) se obriga a executar para o CONTRATANTE os seguintes servicos: {{descricaoServico}}.

CLAUSULA 2 - DO PRECO E FORMA DE PAGAMENTO
O valor total dos servicos e de {{valorServico}}, a ser pago da seguinte forma: {{formaPagamento}}.

CLAUSULA 3 - DO PRAZO
O prazo para execucao dos servicos e de {{prazoExecucao}}, com inicio em {{dataInicio}}.

CLAUSULA 4 - DAS OBRIGACOES DO PRESTADOR
a) Executar os servicos conforme especificado neste contrato;
b) Manter sigilo sobre informacoes confidenciais do CONTRATANTE;
c) Responsabilizar-se pela qualidade dos servicos prestados;
d) Arcar com todos os tributos e encargos decorrentes da prestacao de servicos;
e) Comunicar ao CONTRATANTE qualquer impedimento na execucao dos servicos.

CLAUSULA 5 - DAS OBRIGACOES DO CONTRATANTE
a) Efetuar os pagamentos nos prazos estabelecidos;
b) Fornecer as informacoes necessarias para a execucao dos servicos;
c) Facilitar o acesso do PRESTADOR(A) aos recursos necessarios.

CLAUSULA 6 - DA RESCISAO
O presente contrato podera ser rescindido por qualquer das partes, mediante aviso previo de 30 (trinta) dias, ficando a parte que der causa a rescisao obrigada ao pagamento de multa de 20% (vinte por cento) sobre o valor total do contrato.

CLAUSULA 7 - DA INEXISTENCIA DE VINCULO TRABALHISTA
O presente contrato nao gera vinculo empregaticio entre as partes, sendo o PRESTADOR(A) responsavel por todos os seus encargos trabalhistas, previdenciarios e tributarios.

CLAUSULA 8 - DO FORO
Fica eleito o foro da comarca do domicilio do CONTRATANTE para dirimir quaisquer controversias.

Local e data: {{dataAtualExtenso}}

_________________________________
{{contratanteNome}} - CONTRATANTE

_________________________________
{{prestadorNome}} - PRESTADOR(A)`,
        isActive: true,
      },
      {
        name: 'Contrato Freelancer',
        category: ContractType.FREELANCER,
        description:
          'Modelo de contrato para servicos de freelancer com escopo definido e entregaveis',
        variables: [
          { name: 'clienteNome', label: 'Nome do Cliente', type: 'string', required: true },
          { name: 'clienteCpfCnpj', label: 'CPF/CNPJ do Cliente', type: 'string', required: true },
          { name: 'clienteEmail', label: 'Email do Cliente', type: 'email', required: true },
          { name: 'freelancerNome', label: 'Nome do Freelancer', type: 'string', required: true },
          { name: 'freelancerCpf', label: 'CPF do Freelancer', type: 'cpf', required: true },
          { name: 'freelancerEmail', label: 'Email do Freelancer', type: 'email', required: true },
          { name: 'descricaoProjeto', label: 'Descricao do Projeto', type: 'string', required: true },
          { name: 'entregaveis', label: 'Lista de Entregaveis', type: 'string', required: true },
          { name: 'valorTotal', label: 'Valor Total (R$)', type: 'currency', required: true },
          { name: 'percentualAdiantamento', label: 'Percentual de Adiantamento (%)', type: 'number', required: false, defaultValue: '50' },
          { name: 'prazoEntrega', label: 'Prazo de Entrega', type: 'string', required: true },
          { name: 'numeroRevisoes', label: 'Numero de Revisoes Incluidas', type: 'number', required: false, defaultValue: '3' },
        ],
        content: `CONTRATO DE PRESTACAO DE SERVICOS FREELANCER

Entre as partes:

CLIENTE: {{clienteNome}}, CPF/CNPJ {{clienteCpfCnpj}}, email {{clienteEmail}}, doravante denominado CLIENTE;

FREELANCER: {{freelancerNome}}, CPF {{freelancerCpf}}, email {{freelancerEmail}}, doravante denominado FREELANCER;

Acordam o seguinte:

1. ESCOPO DO PROJETO
O FREELANCER se compromete a realizar o seguinte projeto: {{descricaoProjeto}}.

2. ENTREGAVEIS
Os entregaveis deste projeto sao: {{entregaveis}}.

3. VALOR E PAGAMENTO
Valor total: {{valorTotal}}
- {{percentualAdiantamento}}% como adiantamento no inicio do projeto;
- Restante na entrega e aprovacao final.

4. PRAZO
O prazo de entrega e: {{prazoEntrega}}, contados a partir do recebimento do adiantamento.

5. REVISOES
Estao incluidas {{numeroRevisoes}} rodadas de revisao. Revisoes adicionais serao cobradas a parte mediante acordo previo.

6. PROPRIEDADE INTELECTUAL
Apos o pagamento integral, todos os direitos de propriedade intelectual dos entregaveis serao transferidos ao CLIENTE.

7. CONFIDENCIALIDADE
Ambas as partes concordam em manter sigilo sobre informacoes confidenciais compartilhadas durante o projeto.

8. CANCELAMENTO
Em caso de cancelamento pelo CLIENTE, o adiantamento nao sera devolvido e sera paga a parcela correspondente ao trabalho ja realizado. Em caso de cancelamento pelo FREELANCER, o adiantamento sera devolvido integralmente.

9. FORO
Fica eleito o foro da comarca do domicilio do CLIENTE.

Data: {{dataAtualExtenso}}

_________________________________
{{clienteNome}} - CLIENTE

_________________________________
{{freelancerNome}} - FREELANCER`,
        isActive: true,
      },
      {
        name: 'Acordo de Confidencialidade (NDA)',
        category: ContractType.NDA,
        description:
          'Acordo de confidencialidade e nao divulgacao bilateral',
        variables: [
          { name: 'parteANome', label: 'Nome da Parte A', type: 'string', required: true },
          { name: 'parteACpfCnpj', label: 'CPF/CNPJ da Parte A', type: 'string', required: true },
          { name: 'parteAEndereco', label: 'Endereco da Parte A', type: 'address', required: true },
          { name: 'parteBNome', label: 'Nome da Parte B', type: 'string', required: true },
          { name: 'parteBCpfCnpj', label: 'CPF/CNPJ da Parte B', type: 'string', required: true },
          { name: 'parteBEndereco', label: 'Endereco da Parte B', type: 'address', required: true },
          { name: 'objetoConfidencialidade', label: 'Objeto da Confidencialidade', type: 'string', required: true },
          { name: 'prazoConfidencialidade', label: 'Prazo de Confidencialidade (anos)', type: 'number', required: true },
          { name: 'penalidade', label: 'Valor da Penalidade (R$)', type: 'currency', required: true },
        ],
        content: `ACORDO DE CONFIDENCIALIDADE E NAO DIVULGACAO (NDA)

As partes abaixo qualificadas:

PARTE A: {{parteANome}}, inscrito(a) no CPF/CNPJ sob o numero {{parteACpfCnpj}}, com endereco em {{parteAEndereco}};

PARTE B: {{parteBNome}}, inscrito(a) no CPF/CNPJ sob o numero {{parteBCpfCnpj}}, com endereco em {{parteBEndereco}};

Celebram o presente Acordo de Confidencialidade e Nao Divulgacao:

1. OBJETO
O presente acordo tem por objeto a protecao das informacoes confidenciais trocadas entre as partes no ambito de: {{objetoConfidencialidade}}.

2. DEFINICAO DE INFORMACAO CONFIDENCIAL
Consideram-se informacoes confidenciais todos os dados, documentos, informacoes tecnicas, comerciais, financeiras, know-how, segredos de negocio, e quaisquer outras informacoes reveladas por uma parte a outra, seja de forma oral, escrita, eletronica ou por qualquer outro meio.

3. OBRIGACOES
As partes se comprometem a:
a) Nao divulgar as informacoes confidenciais a terceiros sem autorizacao previa por escrito;
b) Utilizar as informacoes apenas para a finalidade acordada;
c) Proteger as informacoes com o mesmo cuidado que dispensam as suas proprias informacoes confidenciais;
d) Restringir o acesso somente a empregados e consultores que necessitem conhece-las.

4. EXCECOES
Nao serao consideradas confidenciais as informacoes que:
a) Ja eram de dominio publico na data da divulgacao;
b) Tornaram-se publicas sem violacao deste acordo;
c) Foram recebidas legalmente de terceiros sem restricao;
d) Foram desenvolvidas independentemente sem uso de informacao confidencial.

5. PRAZO
Este acordo vigora por {{prazoConfidencialidade}} ano(s) a partir da data de assinatura, permanecendo as obrigacoes de confidencialidade por igual periodo apos o termino.

6. PENALIDADES
O descumprimento deste acordo sujeitara a parte infratora ao pagamento de multa no valor de {{penalidade}}, sem prejuizo de indenizacao por perdas e danos.

7. FORO
Fica eleito o foro da comarca do domicilio da PARTE A.

Data: {{dataAtualExtenso}}

_________________________________
{{parteANome}} - PARTE A

_________________________________
{{parteBNome}} - PARTE B`,
        isActive: true,
      },
      {
        name: 'Contrato de Emprestimo',
        category: ContractType.LOAN,
        description:
          'Modelo de contrato de emprestimo pessoal (mutuo) com juros e garantias',
        variables: [
          { name: 'credorNome', label: 'Nome do Credor', type: 'string', required: true },
          { name: 'credorCpf', label: 'CPF do Credor', type: 'cpf', required: true },
          { name: 'credorEndereco', label: 'Endereco do Credor', type: 'address', required: true },
          { name: 'devedorNome', label: 'Nome do Devedor', type: 'string', required: true },
          { name: 'devedorCpf', label: 'CPF do Devedor', type: 'cpf', required: true },
          { name: 'devedorEndereco', label: 'Endereco do Devedor', type: 'address', required: true },
          { name: 'valorEmprestimo', label: 'Valor do Emprestimo (R$)', type: 'currency', required: true },
          { name: 'taxaJuros', label: 'Taxa de Juros Mensal (%)', type: 'number', required: true },
          { name: 'numeroParcelas', label: 'Numero de Parcelas', type: 'number', required: true },
          { name: 'valorParcela', label: 'Valor da Parcela (R$)', type: 'currency', required: true },
          { name: 'diaVencimento', label: 'Dia do Vencimento', type: 'number', required: true },
          { name: 'dataPrimeiroVencimento', label: 'Data do Primeiro Vencimento', type: 'date', required: true },
        ],
        content: `CONTRATO DE EMPRESTIMO PESSOAL (MUTUO)

Pelo presente instrumento particular:

CREDOR(A): {{credorNome}}, inscrito(a) no CPF sob o numero {{credorCpf}}, residente em {{credorEndereco}}, doravante denominado(a) CREDOR(A);

DEVEDOR(A): {{devedorNome}}, inscrito(a) no CPF sob o numero {{devedorCpf}}, residente em {{devedorEndereco}}, doravante denominado(a) DEVEDOR(A);

Celebram o presente contrato de emprestimo pessoal (mutuo feneraticio):

CLAUSULA 1 - DO VALOR
O CREDOR(A) empresta ao DEVEDOR(A) a quantia de {{valorEmprestimo}}, recebida neste ato.

CLAUSULA 2 - DOS JUROS
O emprestimo sera acrescido de juros de {{taxaJuros}}% ao mes, capitalizados mensalmente.

CLAUSULA 3 - DO PAGAMENTO
O valor total sera pago em {{numeroParcelas}} parcelas mensais e consecutivas de {{valorParcela}}, com vencimento no dia {{diaVencimento}} de cada mes, sendo o primeiro vencimento em {{dataPrimeiroVencimento}}.

CLAUSULA 4 - DO ATRASO
Em caso de atraso no pagamento de qualquer parcela, incidira:
a) Multa de 2% (dois por cento) sobre o valor da parcela;
b) Juros de mora de 1% (um por cento) ao mes, pro rata die;
c) Correcao monetaria pelo IGPM/FGV.

CLAUSULA 5 - DO VENCIMENTO ANTECIPADO
O emprestimo vencera antecipadamente em caso de:
a) Atraso superior a 30 (trinta) dias em qualquer parcela;
b) Falencia, insolvencia ou recuperacao judicial do DEVEDOR(A);
c) Prestacao de informacoes falsas pelo DEVEDOR(A).

CLAUSULA 6 - DA QUITACAO ANTECIPADA
O DEVEDOR(A) podera efetuar a quitacao antecipada, total ou parcial, com reducao proporcional dos juros.

CLAUSULA 7 - DO FORO
Fica eleito o foro da comarca do domicilio do CREDOR(A).

Data: {{dataAtualExtenso}}

_________________________________
{{credorNome}} - CREDOR(A)

_________________________________
{{devedorNome}} - DEVEDOR(A)`,
        isActive: true,
      },
      {
        name: 'Contrato de Compra e Venda',
        category: ContractType.PURCHASE_SALE,
        description:
          'Modelo padrao de contrato de compra e venda de bens moveis ou imoveis',
        variables: [
          { name: 'vendedorNome', label: 'Nome do Vendedor', type: 'string', required: true },
          { name: 'vendedorCpfCnpj', label: 'CPF/CNPJ do Vendedor', type: 'string', required: true },
          { name: 'vendedorEndereco', label: 'Endereco do Vendedor', type: 'address', required: true },
          { name: 'compradorNome', label: 'Nome do Comprador', type: 'string', required: true },
          { name: 'compradorCpfCnpj', label: 'CPF/CNPJ do Comprador', type: 'string', required: true },
          { name: 'compradorEndereco', label: 'Endereco do Comprador', type: 'address', required: true },
          { name: 'descricaoBem', label: 'Descricao do Bem', type: 'string', required: true },
          { name: 'valorVenda', label: 'Valor de Venda (R$)', type: 'currency', required: true },
          { name: 'formaPagamento', label: 'Forma de Pagamento', type: 'string', required: true },
          { name: 'prazoEntrega', label: 'Prazo de Entrega', type: 'string', required: true },
          { name: 'localEntrega', label: 'Local de Entrega', type: 'address', required: false, defaultValue: 'A combinar' },
        ],
        content: `CONTRATO DE COMPRA E VENDA

Pelo presente instrumento particular:

VENDEDOR(A): {{vendedorNome}}, inscrito(a) no CPF/CNPJ sob o numero {{vendedorCpfCnpj}}, com endereco em {{vendedorEndereco}}, doravante denominado(a) VENDEDOR(A);

COMPRADOR(A): {{compradorNome}}, inscrito(a) no CPF/CNPJ sob o numero {{compradorCpfCnpj}}, com endereco em {{compradorEndereco}}, doravante denominado(a) COMPRADOR(A);

Celebram o presente contrato de compra e venda:

CLAUSULA 1 - DO OBJETO
O VENDEDOR(A) vende ao COMPRADOR(A) o seguinte bem: {{descricaoBem}}.

CLAUSULA 2 - DO PRECO
O preco de venda e de {{valorVenda}}, a ser pago da seguinte forma: {{formaPagamento}}.

CLAUSULA 3 - DA ENTREGA
O bem sera entregue no prazo de {{prazoEntrega}}, no local: {{localEntrega}}.

CLAUSULA 4 - DA PROPRIEDADE
A propriedade do bem sera transferida ao COMPRADOR(A) apos o pagamento integral do preco.

CLAUSULA 5 - DAS GARANTIAS DO VENDEDOR
O VENDEDOR(A) declara e garante que:
a) E o legitimo proprietario do bem;
b) O bem esta livre de onus, gravames ou restricoes;
c) Nao ha impedimento legal para a venda;
d) O bem se encontra em perfeitas condicoes de uso.

CLAUSULA 6 - DOS VICIOS
O VENDEDOR(A) se responsabiliza pelos vicios ocultos do bem pelo prazo de 90 (noventa) dias a partir da entrega, conforme Codigo Civil.

CLAUSULA 7 - DA RESCISAO
Em caso de inadimplemento por parte do COMPRADOR(A), o VENDEDOR(A) podera rescindir o contrato, retomando a posse do bem e retendo 20% (vinte por cento) do valor pago a titulo de penalidade.

CLAUSULA 8 - DO FORO
Fica eleito o foro da comarca do domicilio do VENDEDOR(A).

Data: {{dataAtualExtenso}}

_________________________________
{{vendedorNome}} - VENDEDOR(A)

_________________________________
{{compradorNome}} - COMPRADOR(A)`,
        isActive: true,
      },
    ];
  }
}
