import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import * as mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { ContractType } from '../../common/contract-type.enum';
import { RagService } from '../rag/rag.service';
import {
  ReviewResult,
  ReviewIssue,
  RiskLevel,
  ReviewUploadResult,
} from './types';

@Injectable()
export class ReviewerService {
  private readonly logger = new Logger(ReviewerService.name);
  private readonly anthropic: Anthropic;
  private readonly model: string;

  /**
   * Cache simples em memoria para revisoes ja realizadas.
   * Em producao, substituir por Redis ou banco de dados.
   */
  private readonly reviewCache = new Map<string, ReviewResult>();

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
   * Prompt de sistema para revisao de contratos.
   * Focado em identificar clausulas abusivas e irregularidades.
   */
  private getReviewSystemPrompt(legislationContext: string): string {
    return `Voce e um advogado brasileiro especialista em direito do consumidor, direito contratual e protecao
contra clausulas abusivas. Voce tem mais de 20 anos de experiencia em revisao contratual e atua como
o "Revisor Juridico" do sistema Tabeliao, uma plataforma de cartorio digital inteligente.

## SUA MISSAO
Revisar contratos minuciosamente, identificando TODAS as clausulas potencialmente abusivas,
ilegais ou prejudiciais, classificando cada problema encontrado por severidade e sugerindo
correcoes especificas fundamentadas na legislacao brasileira.

## CRITERIOS DE ANALISE OBRIGATORIOS

### 1. CODIGO CIVIL (Lei 10.406/2002)
Verificar conformidade com:
- Art. 421: Funcao social do contrato respeitada?
- Art. 422: Principio da boa-fe objetiva observado?
- Art. 423: Clausulas ambiguas em contrato de adesao interpretadas favoravelmente ao aderente?
- Art. 424: Ha renuncia antecipada a direitos pelo aderente? (NULA)
- Art. 412: Clausula penal excede o valor da obrigacao principal? (VEDADO)
- Arts. 156-157: Ha indicios de estado de perigo ou lesao?
- Arts. 478-480: Onerosidade excessiva?
- Art. 473: Resiliacao unilateral adequada?
- Art. 474-475: Clausula resolutiva proporcional?

### 2. CODIGO DE DEFESA DO CONSUMIDOR (Lei 8.078/1990)
Se o contrato envolver relacao de consumo, verificar:
- Art. 39: Praticas abusivas (vantagem excessiva, fraqueza do consumidor)
- Art. 46: Consumidor teve oportunidade de conhecer o conteudo?
- Art. 47: Clausulas interpretadas em favor do consumidor?
- Art. 51, I: Clausulas que exonerem responsabilidade do fornecedor? (NULAS)
- Art. 51, II: Subtracao de opcao de reembolso? (NULA)
- Art. 51, IV: Obrigacoes inicas ou desvantagem exagerada? (NULAS)
- Art. 51, VI: Arbitragem compulsoria ao consumidor? (NULA)
- Art. 51, IX: Variacao unilateral de preco? (NULA)
- Art. 51, X: Rescisao unilateral sem reciprocidade? (NULA)
- Art. 51, XII: Cancelamento unilateral pelo fornecedor? (NULO)
- Art. 51, XIII: Multa desproporcional? (NULA se > 2%)
- Art. 51, XVI: Modificacao unilateral de conteudo/qualidade? (NULA)
- Art. 52, par. 1: Multa de mora superior a 2%? (VEDADA)
- Art. 53: Perda total das prestacoes pagas? (NULA)
- Art. 54: Contrato de adesao redigido com clareza?

### 3. LEI DO INQUILINATO (Lei 8.245/1991)
Se for contrato de locacao:
- Art. 4: Multa proporcional ao tempo de cumprimento?
- Art. 12: Sub-locacao com consentimento do locador?
- Art. 22-23: Obrigacoes de locador e locatario corretas?
- Art. 37: Apenas uma modalidade de garantia?
- Art. 45: Clausulas que elidam objetivos da lei? (NULAS)
- Art. 46: Prazo de 30+ meses para denuncia vazia?

### 4. CLT (Decreto-Lei 5.452/1943)
Se for contrato de trabalho:
- Art. 444: Estipulacao nao contraria protecao ao trabalho?
- Art. 445: Prazo determinado <= 2 anos, experiencia <= 90 dias?
- Art. 468: Alteracoes sem prejuizo ao empregado?

### 5. MARCO CIVIL DA INTERNET (Lei 12.965/2014)
Se for contrato digital:
- Art. 7: Direitos do usuario respeitados?
- Art. 8: Clausulas que violem privacidade/liberdade? (NULAS)
- Foro brasileiro oferecido como alternativa em contratos de adesao?

### 6. LGPD (Lei 13.709/2018)
Se envolver dados pessoais:
- Art. 7: Base legal para tratamento de dados indicada?
- Art. 8: Consentimento especifico e destacado?
- Art. 18: Direitos do titular garantidos?
- Art. 46: Medidas de seguranca previstas?

### 7. LEI DE ARBITRAGEM (Lei 9.307/1996)
- Art. 4: Clausula compromissoria por escrito?
- Art. 4, par. 2: Em contratos de adesao, aderente deve tomar iniciativa da arbitragem?

## CONTEXTO LEGISLATIVO ESPECIFICO (RAG)
${legislationContext}

## CLASSIFICACAO DE SEVERIDADE

- **INFORMATIVO**: Observacao que nao representa risco juridico imediato, mas merece atencao.
  Exemplos: ausencia de clausula recomendada, redacao que poderia ser mais clara.

- **ATENCAO**: Clausula que pode gerar problemas juridicos ou prejuizo a uma das partes.
  Exemplos: multa elevada (mas nao excessiva), prazo de aviso previo curto, falta de clareza
  em obrigacoes importantes.

- **CRITICO**: Clausula potencialmente nula, ilegal ou gravemente abusiva.
  Exemplos: multa superior ao permitido por lei, renuncia a direitos inalienaveise,
  arbitragem compulsoria em relacao de consumo, exoneracao de responsabilidade do fornecedor.

## FORMATO DE RESPOSTA

Voce DEVE responder EXCLUSIVAMENTE em formato JSON valido, sem texto adicional fora do JSON.
O JSON deve seguir esta estrutura:

{
  "issues": [
    {
      "clauseNumber": "CLAUSULA TERCEIRA" ou "3" ou "Nao identificada",
      "clauseText": "Trecho relevante da clausula problematica (ate 200 caracteres)",
      "issueType": "MULTA_EXCESSIVA" | "CLAUSULA_ABUSIVA" | "RENUNCIA_DIREITOS" |
                   "RESCISAO_DESEQUILIBRADA" | "FORO_INADEQUADO" | "ARBITRAGEM_COMPULSORIA" |
                   "EXONERACAO_RESPONSABILIDADE" | "MODIFICACAO_UNILATERAL" |
                   "TAXA_OCULTA" | "LIMITACAO_RESPONSABILIDADE_EXCESSIVA" |
                   "DADOS_PESSOAIS" | "PRAZO_IRREGULAR" | "GARANTIA_IRREGULAR" |
                   "REDACAO_AMBIGUA" | "AUSENCIA_CLAUSULA_ESSENCIAL" | "OUTRO",
      "severity": "INFORMATIVO" | "ATENCAO" | "CRITICO",
      "description": "Descricao detalhada do problema identificado, explicando por que e problematico",
      "legalBasis": "Art. XX da Lei YYYY - descricao do fundamento legal",
      "suggestion": "Sugestao especifica de correcao ou alternativa legal"
    }
  ],
  "summary": "Resumo geral da analise em linguagem acessivel ao leigo (2-4 frases)",
  "recommendations": [
    "Recomendacao geral 1",
    "Recomendacao geral 2"
  ],
  "totalClausesAnalyzed": 10
}

## INSTRUCOES ADICIONAIS
- Analise TODAS as clausulas do contrato, sem excecao
- Se nenhum problema for encontrado, retorne issues como array vazio e summary positivo
- Seja preciso nas referencias legais - cite artigos especificos
- As sugestoes devem ser praticas e implementaveis
- O resumo deve ser compreensivel para leigos (nao-advogados)
- Priorize problemas CRITICOS na lista (coloque-os primeiro)`;
  }

  /**
   * Revisa um contrato e identifica clausulas abusivas ou irregulares.
   */
  async reviewContract(
    content: string,
    type?: ContractType,
  ): Promise<ReviewResult> {
    this.logger.log(`Revisando contrato${type ? ` do tipo ${type}` : ''}`);

    try {
      const legislationContext = this.ragService.getLegislationContext(
        content.substring(0, 500),
        type || ContractType.OUTRO,
      );
      const systemPrompt = this.getReviewSystemPrompt(legislationContext);

      let userMessage = `Revise o seguinte contrato e identifique TODOS os problemas juridicos, clausulas abusivas e irregularidades:\n\n---\n\n${content}\n\n---`;

      if (type) {
        userMessage += `\n\nTipo de contrato informado: ${type}`;
      }

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

      const parsed = this.extractJson<{
        issues: ReviewIssue[];
        summary: string;
        recommendations: string[];
        totalClausesAnalyzed: number;
      }>(responseText);

      const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
      const overallRisk = this.generateRiskScore({ issues } as ReviewResult);

      const reviewResult: ReviewResult = {
        reviewId: uuidv4(),
        overallRisk,
        riskLevel: this.getRiskLevel(overallRisk),
        issues,
        summary: parsed.summary || 'Analise concluida.',
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : [],
        totalClausesAnalyzed: parsed.totalClausesAnalyzed || 0,
        reviewedAt: new Date().toISOString(),
      };

      // Salva no cache
      this.reviewCache.set(reviewResult.reviewId, reviewResult);

      this.logger.log(
        `Revisao concluida: ${reviewResult.reviewId} - Risco: ${reviewResult.riskLevel} (${reviewResult.overallRisk}/100)`,
      );

      return reviewResult;
    } catch (error) {
      this.logger.error(
        `Erro ao revisar contrato: ${(error as Error).message}`,
        (error as Error).stack,
      );

      if (error instanceof Anthropic.APIError) {
        throw new InternalServerErrorException(
          `Erro na API de IA: ${error.message}. Tente novamente em alguns instantes.`,
        );
      }

      throw new InternalServerErrorException(
        'Erro interno ao revisar o contrato. Tente novamente.',
      );
    }
  }

  /**
   * Extrai texto de um documento PDF ou DOCX enviado por upload e realiza a revisao.
   */
  async reviewUploadedDocument(
    file: Buffer,
    mimeType: string,
    type?: ContractType,
  ): Promise<ReviewUploadResult> {
    this.logger.log(`Processando upload para revisao: ${mimeType}`);

    let extractedText: string;

    try {
      if (
        mimeType === 'application/pdf' ||
        mimeType === 'application/x-pdf'
      ) {
        extractedText = await this.extractTextFromPdf(file);
      } else if (
        mimeType ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        extractedText = await this.extractTextFromDocx(file);
      } else {
        return {
          success: false,
          error: `Formato de arquivo nao suportado: ${mimeType}. Envie um PDF ou DOCX.`,
        };
      }
    } catch (error) {
      this.logger.error(
        `Erro ao extrair texto do documento: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: 'Nao foi possivel extrair o texto do documento enviado.',
      };
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return {
        success: false,
        error:
          'O documento enviado contem muito pouco texto para uma revisao adequada. ' +
          'Verifique se o arquivo nao esta corrompido ou protegido.',
      };
    }

    try {
      const review = await this.reviewContract(extractedText, type);
      return {
        success: true,
        review,
        extractedText,
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao revisar o documento: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Recupera uma revisao previamente realizada pelo ID.
   */
  getReviewById(reviewId: string): ReviewResult | null {
    return this.reviewCache.get(reviewId) || null;
  }

  /**
   * Calcula o score de risco geral (0-100) com base nos problemas encontrados.
   *
   * Algoritmo:
   * - Cada issue CRITICO = 25 pontos
   * - Cada issue ATENCAO = 10 pontos
   * - Cada issue INFORMATIVO = 3 pontos
   * - Maximo: 100
   */
  generateRiskScore(review: ReviewResult): number {
    if (!review.issues || review.issues.length === 0) {
      return 0;
    }

    let score = 0;

    for (const issue of review.issues) {
      switch (issue.severity) {
        case 'CRITICO':
          score += 25;
          break;
        case 'ATENCAO':
          score += 10;
          break;
        case 'INFORMATIVO':
          score += 3;
          break;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Converte score numerico em nivel de risco categorizado.
   */
  private getRiskLevel(score: number): RiskLevel {
    if (score <= 10) return 'BAIXO';
    if (score <= 35) return 'MODERADO';
    if (score <= 65) return 'ALTO';
    return 'CRITICO';
  }

  /**
   * Extrai texto de um arquivo PDF.
   */
  private async extractTextFromPdf(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer);
    return data.text;
  }

  /**
   * Extrai texto de um arquivo DOCX.
   */
  private async extractTextFromDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  /**
   * Extrai e valida JSON da resposta do modelo de IA.
   */
  private extractJson<T>(text: string): T {
    try {
      return JSON.parse(text) as T;
    } catch {
      // Tenta encontrar JSON dentro do texto
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        // Continua tentando
      }
    }

    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch?.[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim()) as T;
      } catch {
        // Ultima tentativa falhou
      }
    }

    this.logger.error(
      `Falha ao extrair JSON da resposta de revisao: ${text.substring(0, 500)}`,
    );
    throw new InternalServerErrorException(
      'A IA retornou uma resposta em formato invalido durante a revisao. Tente novamente.',
    );
  }
}
