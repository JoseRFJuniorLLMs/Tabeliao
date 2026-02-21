import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { ContractType, CONTRACT_TYPE_LABELS } from '../../common/contract-type.enum';
import { RagService } from '../rag/rag.service';
import {
  GeneratedContract,
  GenerateContractResult,
  RefineContractResult,
} from './types';

@Injectable()
export class GeneratorService {
  private readonly logger = new Logger(GeneratorService.name);
  private readonly anthropic: Anthropic;
  private readonly model: string;

  /**
   * Cache simples em memoria para contratos gerados (para refinamento).
   * Em producao, substituir por Redis ou banco de dados.
   */
  private readonly contractCache = new Map<
    string,
    { contract: GeneratedContract; prompt: string; type: ContractType }
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly ragService: RagService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
    this.model = this.configService.get<string>('ANTHROPIC_MODEL') || 'claude-sonnet-4-20250514';
  }

  /**
   * Prompt de sistema principal para geracao de contratos.
   * Altamente detalhado para garantir contratos juridicamente validos no Brasil.
   */
  private getSystemPrompt(legislationContext: string): string {
    return `Voce e um advogado brasileiro especialista em direito contratual, com mais de 20 anos de experiencia
na elaboracao de contratos civis, empresariais, trabalhistas e digitais. Voce atua como o "Cerebro Juridico"
do sistema Tabeliao, uma plataforma de cartorio digital inteligente.

## SUA MISSAO
Gerar contratos formais, completos e juridicamente validos em portugues brasileiro (pt-BR), seguindo
rigorosamente a legislacao vigente e as melhores praticas do direito contratual brasileiro.

## REGRAS OBRIGATORIAS DE FORMATACAO E ESTRUTURA

1. IDENTIFICACAO DAS PARTES: Sempre iniciar com a qualificacao completa das partes (nome, nacionalidade,
   estado civil, profissao, CPF/CNPJ, endereco). Se os dados nao forem fornecidos, usar placeholders
   claros como [NOME COMPLETO DO LOCADOR], [CPF DO LOCADOR], etc.

2. OBJETO DO CONTRATO: Clausula clara e especifica descrevendo o objeto contratual, seu proposito
   e abrangencia. Deve ser detalhada o suficiente para evitar ambiguidades.

3. OBRIGACOES DAS PARTES: Clausulas separadas para obrigacoes de cada parte, com subitens quando
   necessario. Cada obrigacao deve ser clara, mensuravel e executavel.

4. PRECO E CONDICOES DE PAGAMENTO: Valor em reais (R$), forma de pagamento, data de vencimento,
   indice de reajuste (IGPM/FGV, IPCA/IBGE ou outro), periodicidade do reajuste, consequencias
   do atraso (juros de mora de 1% a.m. + multa conforme legislacao aplicavel).

5. PRAZO E VIGENCIA: Data de inicio, duracao, condicoes de renovacao (automatica ou nao),
   prazo de aviso previo para nao renovacao.

6. MULTAS E PENALIDADES: Clausula penal para inadimplemento (respeitando o limite do Art. 412 CC
   - nao pode exceder o valor da obrigacao principal). Para relacoes de consumo, multa de mora
   limitada a 2% (Art. 52, par. 1, CDC). Juros de mora, correcao monetaria, honorarios advocaticios.

7. RESCISAO: Hipoteses de rescisao por justa causa e sem justa causa, procedimentos, prazos de
   aviso previo, penalidades, obrigacoes pos-rescisao, devolucao de bens/valores.

8. CONFIDENCIALIDADE: Quando aplicavel, incluir clausula de confidencialidade com definicao clara
   do que constitui informacao confidencial, prazo de vigencia da obrigacao e penalidades.

9. PROPRIEDADE INTELECTUAL: Quando aplicavel (contratos de servicos, tecnologia), definir
   claramente a quem pertencem os direitos de propriedade intelectual.

10. FORO: Eleger o foro competente. Para relacoes de consumo, o foro e o do domicilio do consumidor
    (Art. 101, I, CDC). Para contratos entre empresas, pode ser eleito pelas partes.

11. CLAUSULA DE ARBITRAGEM: Incluir opcao de arbitragem (Lei 9.307/96) quando adequado, especialmente
    em contratos empresariais. NUNCA incluir arbitragem compulsoria em contratos de consumo
    (Art. 51, VII, CDC - clausula nula).

12. DISPOSICOES GERAIS: Tolerancia (nao implica novacao), comunicacoes (forma escrita),
    integralidade (este contrato substitui acordos anteriores), cessao (restricoes),
    caso fortuito e forca maior, legislacao aplicavel.

## LEGISLACAO DE REFERENCIA OBRIGATORIA

Utilizar e referenciar a legislacao aplicavel conforme o tipo de contrato:
- Codigo Civil (Lei 10.406/2002): Arts. 421-480 (contratos em geral), contratos tipicos
- Codigo de Defesa do Consumidor (Lei 8.078/1990): Arts. 39 (praticas abusivas), 46-54 (contratos)
- Lei do Inquilinato (Lei 8.245/1991): Locacoes urbanas
- CLT (Decreto-Lei 5.452/1943): Contratos de trabalho
- Marco Civil da Internet (Lei 12.965/2014): Contratos digitais
- LGPD (Lei 13.709/2018): Protecao de dados pessoais
- Lei de Arbitragem (Lei 9.307/1996): Clausula compromissoria

## CONTEXTO LEGISLATIVO ESPECIFICO (RAG)

${legislationContext}

## REGRAS DE PROTECAO AO CONSUMIDOR (ATENCAO MAXIMA)

- Multa de mora NUNCA superior a 2% em relacoes de consumo (Art. 52, par. 1, CDC)
- NUNCA incluir clausulas que exonerem o fornecedor de responsabilidade (Art. 51, I, CDC)
- NUNCA permitir variacao unilateral de preco pelo fornecedor (Art. 51, X, CDC)
- NUNCA impor arbitragem compulsoria ao consumidor (Art. 51, VII, CDC)
- NUNCA estabelecer perda total de prestacoes pagas (Art. 53, CDC)
- Foro sempre no domicilio do consumidor em relacoes de consumo
- Redacao clara, legivel, sem jargao juridico excessivo em contratos de adesao

## REGRAS TRABALHISTAS (ATENCAO MAXIMA)

- Contrato de experiencia maximo 90 dias (Art. 445, CLT)
- Contrato por prazo determinado maximo 2 anos (Art. 445, CLT)
- NUNCA incluir clausulas que restrinjam direitos inderrogaveis do trabalhador
- Alteracoes contratuais apenas por mutuo consentimento e sem prejuizo ao empregado (Art. 468, CLT)
- Observar piso salarial da categoria quando aplicavel
- Incluir todas as verbas obrigatorias (13o, ferias + 1/3, FGTS, INSS)

## FORMATO DE RESPOSTA

Voce DEVE responder EXCLUSIVAMENTE em formato JSON valido, sem texto adicional fora do JSON.
O JSON deve seguir esta estrutura:

{
  "title": "Titulo completo do contrato",
  "content": "Texto completo e formatado do contrato, com todas as clausulas",
  "clauses": [
    {
      "number": 1,
      "title": "CLAUSULA PRIMEIRA - DO OBJETO",
      "content": "Texto completo da clausula...",
      "legalBasis": "Art. 481 do Codigo Civil"
    }
  ],
  "parties": ["Parte 1 - Qualificacao", "Parte 2 - Qualificacao"],
  "suggestedValue": "R$ X.XXX,XX (quando aplicavel)",
  "warnings": [
    "Aviso 1: Este contrato deve ser registrado em cartorio para ter eficacia contra terceiros.",
    "Aviso 2: Recomenda-se reconhecimento de firma das assinaturas."
  ],
  "contractType": "TIPO_DO_CONTRATO",
  "applicableLegislation": ["Lei 10.406/2002 (Codigo Civil)", "Lei 8.245/1991 (Lei do Inquilinato)"],
  "generatedAt": "2025-01-01T00:00:00.000Z"
}

## OBSERVACOES FINAIS

- Use linguagem formal juridica, mas acessivel
- Numere todas as clausulas sequencialmente (CLAUSULA PRIMEIRA, CLAUSULA SEGUNDA, etc.)
- Use paragrafos e alineas quando necessario (Paragrafo unico, Par. 1o, Par. 2o, alineas a, b, c)
- Inclua local e data ao final do contrato
- Inclua espaco para assinaturas das partes e testemunhas (2 testemunhas com nome e CPF)
- Se informacoes estiverem faltando, use placeholders claros entre colchetes
- SEMPRE inclua avisos relevantes no campo "warnings"`;
  }

  /**
   * Gera um contrato completo a partir de um prompt em linguagem natural.
   */
  async generateContract(
    prompt: string,
    type: ContractType,
    context?: Record<string, unknown>,
  ): Promise<GenerateContractResult> {
    this.logger.log(`Gerando contrato do tipo ${type} a partir de prompt`);

    try {
      const legislationContext = this.ragService.getLegislationContext(prompt, type);
      const systemPrompt = this.getSystemPrompt(legislationContext);
      const typeLabel = CONTRACT_TYPE_LABELS[type] || type;

      let userMessage = `Gere um ${typeLabel} completo com base na seguinte descricao:\n\n"${prompt}"`;

      if (context && Object.keys(context).length > 0) {
        userMessage += `\n\nInformacoes adicionais fornecidas:\n${JSON.stringify(context, null, 2)}`;
      }

      userMessage += `\n\nTipo de contrato: ${type}\nData atual: ${new Date().toISOString().split('T')[0]}`;

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      });

      const responseText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const contract = this.parseContractResponse(responseText, type);
      const contractId = uuidv4();

      this.contractCache.set(contractId, { contract, prompt, type });

      this.logger.log(`Contrato gerado com sucesso: ${contractId}`);

      return {
        success: true,
        contract: { ...contract, generatedAt: new Date().toISOString() },
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar contrato: ${(error as Error).message}`, (error as Error).stack);

      if (error instanceof Anthropic.APIError) {
        throw new InternalServerErrorException(
          `Erro na API de IA: ${error.message}. Tente novamente em alguns instantes.`,
        );
      }

      throw new InternalServerErrorException(
        'Erro interno ao gerar o contrato. Tente novamente.',
      );
    }
  }

  /**
   * Analisa o prompt do usuario e retorna perguntas de esclarecimento
   * para tornar o contrato mais completo.
   */
  async askClarifyingQuestions(
    prompt: string,
    type: ContractType,
  ): Promise<string[]> {
    this.logger.log(`Gerando perguntas de esclarecimento para contrato tipo ${type}`);

    try {
      const typeLabel = CONTRACT_TYPE_LABELS[type] || type;

      const systemPrompt = `Voce e um advogado brasileiro especialista em direito contratual. Seu papel e analisar
a descricao fornecida pelo usuario para a elaboracao de um contrato e identificar informacoes
faltantes ou ambiguas que sao necessarias para gerar um contrato completo e juridicamente valido.

Analise a descricao considerando que o contrato sera do tipo: ${typeLabel}

Para cada tipo de contrato, considere os elementos essenciais:
- Qualificacao completa das partes (nome, CPF/CNPJ, endereco, nacionalidade, estado civil)
- Objeto contratual detalhado
- Valores, prazos, condicoes de pagamento
- Garantias exigidas
- Condicoes especificas do tipo de contrato
- Jurisdicao e foro

Responda EXCLUSIVAMENTE em formato JSON valido com a seguinte estrutura:
{
  "questions": [
    "Pergunta 1?",
    "Pergunta 2?",
    "Pergunta 3?"
  ]
}

Gere entre 3 e 8 perguntas, priorizando as informacoes mais criticas.
As perguntas devem ser claras, objetivas e em portugues brasileiro.
NAO faca perguntas sobre informacoes que ja foram fornecidas no prompt.`;

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Descricao do contrato desejado:\n\n"${prompt}"\n\nTipo: ${type}`,
          },
        ],
      });

      const responseText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const parsed = this.extractJson<{ questions: string[] }>(responseText);
      return parsed.questions || [];
    } catch (error) {
      this.logger.error(
        `Erro ao gerar perguntas: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Erro ao gerar perguntas de esclarecimento.',
      );
    }
  }

  /**
   * Refina um contrato ja gerado com base no feedback do usuario.
   */
  async refineContract(
    contractId: string,
    feedback: string,
  ): Promise<RefineContractResult> {
    this.logger.log(`Refinando contrato ${contractId}`);

    const cached = this.contractCache.get(contractId);
    if (!cached) {
      return {
        success: false,
        changesApplied: [],
        error: `Contrato ${contractId} nao encontrado no cache. Gere um novo contrato.`,
      };
    }

    try {
      const legislationContext = this.ragService.getLegislationContext(
        feedback,
        cached.type,
      );

      const systemPrompt = `Voce e um advogado brasileiro especialista em direito contratual. Voce recebera um contrato
ja gerado anteriormente e instrucoes de refinamento do usuario. Sua tarefa e modificar o contrato
conforme solicitado, mantendo a validade juridica e a conformidade com a legislacao brasileira.

## REGRAS DE REFINAMENTO
1. Aplique APENAS as alteracoes solicitadas pelo usuario
2. Mantenha a estrutura e formatacao do contrato original
3. Verifique se as alteracoes solicitadas nao criam clausulas abusivas ou ilegais
4. Se o usuario solicitar algo ilegal ou abusivo, AVISE no campo "warnings" e sugira alternativa legal
5. Mantenha todas as referencias legais atualizadas
6. Renumere clausulas se necessario

## CONTEXTO LEGISLATIVO
${legislationContext}

## FORMATO DE RESPOSTA
Responda EXCLUSIVAMENTE em formato JSON valido:
{
  "title": "Titulo do contrato (pode ser o mesmo ou atualizado)",
  "content": "Texto completo e formatado do contrato refinado",
  "clauses": [...],
  "parties": [...],
  "suggestedValue": "...",
  "warnings": [...],
  "contractType": "${cached.type}",
  "applicableLegislation": [...],
  "generatedAt": "${new Date().toISOString()}",
  "changesApplied": ["Descricao da alteracao 1", "Descricao da alteracao 2"]
}`;

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content:
              `Contrato original:\n\n${cached.contract.content}\n\n` +
              `---\n\nSolicitacao de refinamento:\n\n"${feedback}"`,
          },
        ],
      });

      const responseText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const parsed = this.extractJson<
        GeneratedContract & { changesApplied?: string[] }
      >(responseText);

      const contract: GeneratedContract = {
        title: parsed.title || cached.contract.title,
        content: parsed.content || cached.contract.content,
        clauses: parsed.clauses || cached.contract.clauses,
        parties: parsed.parties || cached.contract.parties,
        suggestedValue: parsed.suggestedValue,
        warnings: parsed.warnings || [],
        contractType: cached.type,
        applicableLegislation: parsed.applicableLegislation || cached.contract.applicableLegislation,
        generatedAt: new Date().toISOString(),
      };

      // Atualiza o cache com o contrato refinado
      this.contractCache.set(contractId, {
        contract,
        prompt: cached.prompt,
        type: cached.type,
      });

      return {
        success: true,
        contract,
        changesApplied: parsed.changesApplied || ['Contrato refinado conforme solicitado'],
      };
    } catch (error) {
      this.logger.error(
        `Erro ao refinar contrato: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Erro ao refinar o contrato. Tente novamente.',
      );
    }
  }

  /**
   * Extrai e valida JSON da resposta do modelo de IA.
   * Tenta encontrar JSON valido mesmo se houver texto adicional.
   */
  private extractJson<T>(text: string): T {
    // Tenta parsear diretamente
    try {
      return JSON.parse(text) as T;
    } catch {
      // Tenta encontrar JSON dentro do texto
    }

    // Procura por blocos JSON no texto
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        // Se falhar, tenta limpar o texto
      }
    }

    // Tenta remover markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch?.[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim()) as T;
      } catch {
        // Ultima tentativa falhou
      }
    }

    this.logger.error(`Falha ao extrair JSON da resposta: ${text.substring(0, 500)}`);
    throw new InternalServerErrorException(
      'A IA retornou uma resposta em formato invalido. Tente novamente.',
    );
  }

  /**
   * Converte a resposta JSON do modelo em um GeneratedContract tipado.
   */
  private parseContractResponse(
    responseText: string,
    type: ContractType,
  ): GeneratedContract {
    const parsed = this.extractJson<Partial<GeneratedContract>>(responseText);

    return {
      title: parsed.title || `${CONTRACT_TYPE_LABELS[type]}`,
      content: parsed.content || '',
      clauses: Array.isArray(parsed.clauses)
        ? parsed.clauses.map((c, i) => ({
            number: c.number ?? i + 1,
            title: c.title || `CLAUSULA ${i + 1}`,
            content: c.content || '',
            legalBasis: c.legalBasis,
          }))
        : [],
      parties: Array.isArray(parsed.parties) ? parsed.parties : [],
      suggestedValue: parsed.suggestedValue,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      contractType: type,
      applicableLegislation: Array.isArray(parsed.applicableLegislation)
        ? parsed.applicableLegislation
        : [],
      generatedAt: new Date().toISOString(),
    };
  }
}
