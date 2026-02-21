import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { Dispute, DisputeStatus } from '../disputes/entities/dispute.entity';
import { DisputeMessage, SenderRole } from '../disputes/entities/dispute-message.entity';
import { AiAnalysisResult, MediationProposal } from './types';

const AI_MEDIATOR_SYSTEM_PROMPT = `Voce e um mediador de conflitos digital imparcial, especializado em direito contratual brasileiro.
Voce atua no sistema de Resolucao Online de Disputas (ODR) da plataforma Tabeliao - Tribunal Privado Digital.

=== PAPEL E RESPONSABILIDADES ===

Voce deve atuar como mediador neutro e imparcial, sem favorecer nenhuma das partes.
Sua funcao e analisar os fatos, as evidencias e o contexto juridico para propor uma resolucao justa.
Voce nao e um juiz, mas sim um mediador que busca o consenso entre as partes.
Suas recomendacoes devem ser fundamentadas em legislacao brasileira vigente.

=== LEGISLACAO APLICAVEL ===

Considere obrigatoriamente as seguintes fontes legais em sua analise:
- Codigo Civil Brasileiro (Lei 10.406/2002): obrigacoes, contratos, responsabilidade civil
- Codigo de Defesa do Consumidor (Lei 8.078/1990): quando aplicavel a relacoes de consumo
- Lei de Arbitragem (Lei 9.307/1996): procedimentos e validade da arbitragem
- Marco Civil da Internet (Lei 12.965/2014): contratos e transacoes digitais
- Lei Geral de Protecao de Dados (Lei 13.709/2018): tratamento de dados pessoais
- Codigo de Processo Civil (Lei 13.105/2015): principios de mediacao e conciliacao
- Lei de Mediacao (Lei 13.140/2015): procedimentos de mediacao

=== PRINCIPIOS FUNDAMENTAIS ===

1. IMPARCIALIDADE: Trate ambas as partes com igualdade absoluta. Nao presuma culpa.
2. PROPORCIONALIDADE: A resolucao proposta deve ser proporcional ao dano e ao valor em disputa.
3. BOA-FE: Presuma a boa-fe das partes ate que as evidencias indiquem o contrario.
4. RAZOABILIDADE: Proponha solucoes praticas e executaveis dentro do contexto da disputa.
5. CELERIDADE: Busque a resolucao mais rapida possivel sem sacrificar a justica.
6. FUNDAMENTACAO: Toda decisao deve ser fundamentada em fatos e legislacao.
7. EQUIDADE: Considere circunstancias especiais que possam afetar o equilibrio entre as partes.

=== METODOLOGIA DE ANALISE ===

Para cada disputa, siga esta metodologia rigorosa:

1. ANALISE FATUAL:
   - Identifique os fatos incontroversos (aceitos por ambas as partes)
   - Identifique os fatos controversos (divergencia entre as partes)
   - Avalie a credibilidade e relevancia de cada evidencia apresentada
   - Construa uma linha do tempo dos eventos relevantes

2. ANALISE JURIDICA:
   - Identifique a natureza juridica da relacao (consumo, civil, comercial)
   - Determine quais leis e artigos sao aplicaveis ao caso
   - Avalie se houve descumprimento contratual e por qual parte
   - Considere excludentes de responsabilidade (forca maior, caso fortuito)
   - Verifique se ha clausulas abusivas no contrato

3. ANALISE DE DANOS:
   - Quantifique os danos materiais alegados e comprovados
   - Considere danos morais quando aplicavel (relacoes de consumo)
   - Avalie a proporcionalidade entre o pedido e os danos efetivos
   - Considere lucros cessantes quando comprovados

4. PROPOSTA DE RESOLUCAO:
   - Proponha uma resolucao concreta com valores especificos
   - Defina prazos claros para cumprimento
   - Estabeleca condicoes objetivas e verificaveis
   - Considere a possibilidade de resolucao parcial
   - Inclua medidas para prevenir reincidencia

=== FORMATO DA RESPOSTA ===

Responda EXCLUSIVAMENTE em formato JSON valido com a seguinte estrutura:

{
  "summary": "Resumo executivo da analise em 2-3 paragrafos",
  "legalAssessment": "Avaliacao juridica detalhada com citacao de artigos de lei",
  "factualFindings": ["Achado fatual 1", "Achado fatual 2", ...],
  "recommendedResolution": "Descricao detalhada da resolucao proposta",
  "confidenceScore": 0.85,
  "reasoning": "Raciocinio completo que fundamenta a recomendacao",
  "applicableLaws": [
    {
      "law": "Nome da lei",
      "article": "Artigo especifico",
      "description": "O que o artigo dispoe",
      "relevance": "Como se aplica a este caso"
    }
  ]
}

=== REGRAS DE CONFIANCA ===

O campo confidenceScore deve ser um numero entre 0 e 1:
- 0.9-1.0: Caso claro com evidencias robustas e legislacao inequivoca
- 0.7-0.89: Caso com boa fundamentacao mas alguma ambiguidade
- 0.5-0.69: Caso complexo com evidencias conflitantes
- 0.3-0.49: Caso de dificil determinacao, recomenda-se arbitragem humana
- 0.0-0.29: Evidencias insuficientes para qualquer determinacao

=== LIMITACOES ===

- Nao tome decisoes sobre questoes penais ou administrativas
- Nao proponha valores que excedam o valor total em disputa
- Se o caso for muito complexo (confidenceScore < 0.4), recomende explicitamente escalacao para arbitragem humana
- Nao acesse informacoes externas; baseie-se apenas nos dados fornecidos
- Nao emita juizo de valor moral sobre as partes
- Limite-se a disputas de ate R$ 5.000,00 (limite da mediacao por IA)`;

@Injectable()
export class MediationService {
  private readonly logger = new Logger(MediationService.name);
  private readonly anthropicClient: Anthropic;
  private readonly aiModel: string;

  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepository: Repository<Dispute>,
    @InjectRepository(DisputeMessage)
    private readonly messageRepository: Repository<DisputeMessage>,
    private readonly configService: ConfigService,
  ) {
    this.anthropicClient = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY', ''),
    });
    this.aiModel = this.configService.get<string>(
      'AI_MEDIATION_MODEL',
      'claude-sonnet-4-20250514',
    );
  }

  async requestAiAnalysis(disputeId: string): Promise<AiAnalysisResult> {
    const dispute = await this.getDisputeWithValidation(disputeId);

    if (!this.isEligibleForAiMediation(parseFloat(dispute.disputeValue))) {
      throw new BadRequestException(
        `Valor da disputa (R$ ${parseFloat(dispute.disputeValue).toFixed(2)}) excede o limite de R$ 5.000,00 para mediacao por IA. Utilize arbitragem humana.`,
      );
    }

    dispute.status = DisputeStatus.AI_REVIEW;
    await this.disputeRepository.save(dispute);

    const messages = await this.messageRepository.find({
      where: { disputeId },
      order: { createdAt: 'ASC' },
    });

    const userPrompt = this.buildAnalysisPrompt(dispute, messages);

    try {
      const response = await this.anthropicClient.messages.create({
        model: this.aiModel,
        max_tokens: 4096,
        system: AI_MEDIATOR_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const textContent = response.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('Resposta da IA nao contem texto');
      }

      const analysisResult = this.parseAiResponse(textContent.text);

      dispute.aiAnalysis = JSON.stringify(analysisResult);
      await this.disputeRepository.save(dispute);

      const systemMessage = this.messageRepository.create({
        disputeId,
        senderId: 'system',
        senderRole: SenderRole.SYSTEM,
        content: `Analise por IA concluida. Confianca: ${(analysisResult.confidenceScore * 100).toFixed(0)}%. Resumo: ${analysisResult.summary}`,
        isPrivate: false,
        attachments: [],
      });

      await this.messageRepository.save(systemMessage);

      this.logger.log(
        `AI analysis completed for dispute ${disputeId} with confidence ${analysisResult.confidenceScore}`,
      );

      return analysisResult;
    } catch (error) {
      dispute.status = DisputeStatus.OPENED;
      await this.disputeRepository.save(dispute);

      this.logger.error(
        `AI analysis failed for dispute ${disputeId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      throw new BadRequestException(
        `Falha na analise por IA: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Tente novamente ou escale para arbitragem humana.`,
      );
    }
  }

  async generateMediationProposal(disputeId: string): Promise<MediationProposal> {
    const dispute = await this.getDisputeWithValidation(disputeId);

    if (!dispute.aiAnalysis) {
      throw new BadRequestException(
        'E necessario solicitar a analise por IA antes de gerar uma proposta de mediacao',
      );
    }

    const analysisResult: AiAnalysisResult = JSON.parse(dispute.aiAnalysis);

    if (analysisResult.confidenceScore < 0.4) {
      throw new BadRequestException(
        `Confianca da analise muito baixa (${(analysisResult.confidenceScore * 100).toFixed(0)}%). Recomenda-se escalacao para arbitragem humana.`,
      );
    }

    const disputeValue = parseFloat(dispute.disputeValue);

    const proposal = this.buildProposalFromAnalysis(analysisResult, disputeValue);

    dispute.resolution = proposal.proposalText;
    dispute.status = DisputeStatus.AWAITING_ACCEPTANCE;
    await this.disputeRepository.save(dispute);

    const systemMessage = this.messageRepository.create({
      disputeId,
      senderId: 'system',
      senderRole: SenderRole.SYSTEM,
      content: `PROPOSTA DE MEDIACAO POR IA:\n\n${proposal.proposalText}\n\nValor proposto: ${proposal.amount !== null ? `R$ ${proposal.amount.toFixed(2)}` : 'N/A'}\nPrazo: ${proposal.deadline ?? 'A definir'}\nCondicoes: ${proposal.conditions.join('; ')}`,
      isPrivate: false,
      attachments: [],
    });

    await this.messageRepository.save(systemMessage);

    this.logger.log(`Mediation proposal generated for dispute ${disputeId}`);

    return proposal;
  }

  async acceptAiProposal(disputeId: string, userId: string): Promise<Dispute> {
    const dispute = await this.getDisputeWithValidation(disputeId);

    if (dispute.status !== DisputeStatus.AWAITING_ACCEPTANCE) {
      throw new BadRequestException(
        'Nao ha proposta de mediacao aguardando aceitacao para esta disputa',
      );
    }

    if (userId === dispute.openedBy) {
      if (dispute.resolutionAcceptedByPlaintiff) {
        throw new BadRequestException('Voce ja aceitou esta proposta');
      }
      dispute.resolutionAcceptedByPlaintiff = true;
    } else if (userId === dispute.respondentId) {
      if (dispute.resolutionAcceptedByDefendant) {
        throw new BadRequestException('Voce ja aceitou esta proposta');
      }
      dispute.resolutionAcceptedByDefendant = true;
    } else {
      throw new ForbiddenException(
        'Apenas as partes da disputa podem aceitar a proposta',
      );
    }

    if (dispute.resolutionAcceptedByPlaintiff && dispute.resolutionAcceptedByDefendant) {
      dispute.status = DisputeStatus.RESOLVED;
      dispute.resolvedAt = new Date();

      const systemMessage = this.messageRepository.create({
        disputeId,
        senderId: 'system',
        senderRole: SenderRole.SYSTEM,
        content:
          'Ambas as partes aceitaram a proposta de mediacao por IA. Disputa resolvida com sucesso por acordo mutuo.',
        isPrivate: false,
        attachments: [],
      });

      await this.messageRepository.save(systemMessage);

      this.logger.log(`Dispute ${disputeId} resolved via AI mediation`);
    } else {
      const partyLabel = userId === dispute.openedBy ? 'reclamante' : 'reclamado';

      const systemMessage = this.messageRepository.create({
        disputeId,
        senderId: 'system',
        senderRole: SenderRole.SYSTEM,
        content: `A parte ${partyLabel} aceitou a proposta de mediacao. Aguardando aceitacao da outra parte.`,
        isPrivate: false,
        attachments: [],
      });

      await this.messageRepository.save(systemMessage);
    }

    return this.disputeRepository.save(dispute);
  }

  async rejectAiProposal(
    disputeId: string,
    userId: string,
    reason: string,
  ): Promise<Dispute> {
    const dispute = await this.getDisputeWithValidation(disputeId);

    if (dispute.status !== DisputeStatus.AWAITING_ACCEPTANCE) {
      throw new BadRequestException(
        'Nao ha proposta de mediacao aguardando aceitacao para esta disputa',
      );
    }

    if (userId !== dispute.openedBy && userId !== dispute.respondentId) {
      throw new ForbiddenException(
        'Apenas as partes da disputa podem rejeitar a proposta',
      );
    }

    const partyLabel = userId === dispute.openedBy ? 'reclamante' : 'reclamado';

    dispute.status = DisputeStatus.ESCALATED;
    dispute.resolutionAcceptedByPlaintiff = false;
    dispute.resolutionAcceptedByDefendant = false;

    const systemMessage = this.messageRepository.create({
      disputeId,
      senderId: 'system',
      senderRole: SenderRole.SYSTEM,
      content: `A parte ${partyLabel} rejeitou a proposta de mediacao por IA. Motivo: ${reason}. A disputa sera escalada para arbitragem humana.`,
      isPrivate: false,
      attachments: [],
    });

    await this.messageRepository.save(systemMessage);

    const savedDispute = await this.disputeRepository.save(dispute);

    this.logger.log(
      `AI mediation proposal rejected for dispute ${disputeId} by ${partyLabel}. Escalating to human arbitration.`,
    );

    return savedDispute;
  }

  isEligibleForAiMediation(disputeValue: number): boolean {
    return disputeValue <= 5000;
  }

  private async getDisputeWithValidation(disputeId: string): Promise<Dispute> {
    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException(`Disputa com ID ${disputeId} nao encontrada`);
    }

    if (
      dispute.status === DisputeStatus.RESOLVED ||
      dispute.status === DisputeStatus.CLOSED
    ) {
      throw new BadRequestException('Esta disputa ja foi resolvida ou fechada');
    }

    return dispute;
  }

  private buildAnalysisPrompt(
    dispute: Dispute,
    messages: DisputeMessage[],
  ): string {
    const evidenceSection =
      dispute.evidence.length > 0
        ? dispute.evidence
            .map(
              (ev, i) =>
                `  ${i + 1}. [${ev.type}] ${ev.description} (apresentada por: ${ev.uploadedBy === dispute.openedBy ? 'Reclamante' : 'Reclamado'}, data: ${ev.uploadedAt})`,
            )
            .join('\n')
        : '  Nenhuma evidencia apresentada ate o momento.';

    const messagesSection =
      messages
        .filter((m) => !m.isPrivate)
        .map(
          (m) =>
            `  [${m.senderRole}] (${m.createdAt.toISOString()}): ${m.content}`,
        )
        .join('\n') || '  Nenhuma mensagem no historico.';

    return `Analise a seguinte disputa e forneca sua avaliacao completa em formato JSON:

=== DADOS DA DISPUTA ===

ID da Disputa: ${dispute.id}
ID do Contrato: ${dispute.contractId}
Tipo da Disputa: ${dispute.type}
Valor em Disputa: R$ ${parseFloat(dispute.disputeValue).toFixed(2)}
Data de Abertura: ${dispute.filedAt?.toISOString() ?? dispute.createdAt.toISOString()}
Prazo Limite: ${dispute.deadline instanceof Date ? dispute.deadline.toISOString() : String(dispute.deadline)}

=== DESCRICAO DA DISPUTA (pelo Reclamante) ===

${dispute.description}

=== EVIDENCIAS APRESENTADAS ===

${evidenceSection}

=== HISTORICO DE MENSAGENS ===

${messagesSection}

=== INSTRUCOES ADICIONAIS ===

1. Analise todos os fatos e evidencias de forma imparcial.
2. Identifique a legislacao aplicavel ao caso.
3. Proponha uma resolucao justa e proporcional ao valor em disputa.
4. Atribua uma pontuacao de confianca (confidenceScore) a sua analise.
5. Responda SOMENTE em formato JSON conforme a estrutura definida no prompt de sistema.
6. Todos os textos devem estar em portugues brasileiro.`;
  }

  private parseAiResponse(responseText: string): AiAnalysisResult {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta da IA nao contem JSON valido');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

      const result: AiAnalysisResult = {
        summary: String(parsed['summary'] ?? ''),
        legalAssessment: String(parsed['legalAssessment'] ?? ''),
        factualFindings: Array.isArray(parsed['factualFindings'])
          ? (parsed['factualFindings'] as unknown[]).map(String)
          : [],
        recommendedResolution: String(parsed['recommendedResolution'] ?? ''),
        confidenceScore: typeof parsed['confidenceScore'] === 'number'
          ? parsed['confidenceScore']
          : 0.5,
        reasoning: String(parsed['reasoning'] ?? ''),
        applicableLaws: Array.isArray(parsed['applicableLaws'])
          ? (parsed['applicableLaws'] as Record<string, unknown>[]).map((law) => ({
              law: String(law['law'] ?? ''),
              article: String(law['article'] ?? ''),
              description: String(law['description'] ?? ''),
              relevance: String(law['relevance'] ?? ''),
            }))
          : [],
      };

      if (!result.summary || !result.recommendedResolution) {
        throw new Error('Campos obrigatorios ausentes na resposta da IA');
      }

      result.confidenceScore = Math.max(0, Math.min(1, result.confidenceScore));

      return result;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`JSON invalido na resposta da IA: ${error.message}`);
      }
      throw error;
    }
  }

  private buildProposalFromAnalysis(
    analysis: AiAnalysisResult,
    disputeValue: number,
  ): MediationProposal {
    const proposalAmount = this.extractProposalAmount(
      analysis.recommendedResolution,
      disputeValue,
    );

    const deadlineDays = analysis.confidenceScore >= 0.7 ? 10 : 15;
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + deadlineDays);
    const deadline = deadlineDate.toISOString().split('T')[0]!;

    const conditions: string[] = [
      `Pagamento deve ser realizado ate ${deadline}`,
    ];

    if (proposalAmount !== null && proposalAmount < disputeValue) {
      conditions.push(
        'Quitacao integral da obrigacao apos cumprimento dos termos',
      );
      conditions.push(
        'Ambas as partes renunciam a quaisquer reclamacoes adicionais sobre esta disputa',
      );
    }

    if (analysis.applicableLaws.length > 0) {
      conditions.push(
        `Resolucao fundamentada em: ${analysis.applicableLaws.map((l) => `${l.law} - ${l.article}`).join(', ')}`,
      );
    }

    conditions.push(
      'Em caso de descumprimento, a parte prejudicada podera solicitar execucao do acordo ou nova arbitragem',
    );

    const proposalText = [
      'PROPOSTA DE RESOLUCAO POR MEDIACAO ASSISTIDA POR IA',
      '',
      `Data: ${new Date().toLocaleDateString('pt-BR')}`,
      `Valor em Disputa: R$ ${disputeValue.toFixed(2)}`,
      `Confianca da Analise: ${(analysis.confidenceScore * 100).toFixed(0)}%`,
      '',
      '--- FUNDAMENTACAO ---',
      analysis.reasoning,
      '',
      '--- RESOLUCAO PROPOSTA ---',
      analysis.recommendedResolution,
      '',
      proposalAmount !== null
        ? `Valor determinado: R$ ${proposalAmount.toFixed(2)}`
        : '',
      `Prazo para cumprimento: ${deadline}`,
      '',
      '--- CONDICOES ---',
      ...conditions.map((c, i) => `${i + 1}. ${c}`),
      '',
      '--- LEGISLACAO APLICAVEL ---',
      ...analysis.applicableLaws.map(
        (l) => `- ${l.law}, ${l.article}: ${l.relevance}`,
      ),
      '',
      'Esta proposta nao tem carater vinculante e depende da aceitacao de ambas as partes.',
      'Em caso de rejeicao, a disputa sera automaticamente escalada para arbitragem humana.',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      proposalText,
      amount: proposalAmount,
      deadline,
      conditions,
      acceptedByPlaintiff: false,
      acceptedByDefendant: false,
    };
  }

  private extractProposalAmount(
    recommendation: string,
    disputeValue: number,
  ): number | null {
    const percentMatch = recommendation.match(/(\d{1,3})%/);
    if (percentMatch) {
      const percentage = parseInt(percentMatch[1]!, 10);
      if (percentage >= 0 && percentage <= 100) {
        return parseFloat((disputeValue * (percentage / 100)).toFixed(2));
      }
    }

    const valueMatch = recommendation.match(
      /R\$\s*([\d.,]+)|(\d[\d.,]*)\s*reais/i,
    );
    if (valueMatch) {
      const rawValue = (valueMatch[1] ?? valueMatch[2] ?? '').replace(/\./g, '').replace(',', '.');
      const parsedValue = parseFloat(rawValue);
      if (!isNaN(parsedValue) && parsedValue > 0 && parsedValue <= disputeValue) {
        return parsedValue;
      }
    }

    return parseFloat((disputeValue * 0.6).toFixed(2));
  }
}
