import { Injectable, Logger } from '@nestjs/common';
import { ContractType } from '../../common/contract-type.enum';
import {
  LEGISLATION_DATABASE,
  CONTRACT_TYPE_LEGISLATION_MAP,
  CONTRACT_TYPE_KEY_ARTICLES,
  LegislationArticle,
  LegislationCategory,
} from '../../knowledge/legislation';

export interface LegislationChunk {
  /** ID do artigo */
  id: string;
  /** Nome da lei */
  lawName: string;
  /** Numero do artigo */
  articleNumber: string;
  /** Resumo */
  summary: string;
  /** Conteudo completo */
  content: string;
  /** Categoria */
  category: LegislationCategory;
  /** Score de relevancia (0-1) */
  relevanceScore: number;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  /**
   * Busca artigos legislativos relevantes para uma consulta usando
   * correspondencia por palavras-chave (keyword matching).
   *
   * Em versoes futuras, sera substituido por busca vetorial com embeddings
   * em banco de dados vetorial (ex: pgvector, Pinecone, Qdrant).
   *
   * @param query Texto da consulta
   * @param category Categoria legislativa opcional para filtrar
   * @returns Lista de artigos relevantes com score de relevancia
   */
  searchLegislation(
    query: string,
    category?: string,
  ): LegislationChunk[] {
    this.logger.debug(`Buscando legislacao para: "${query.substring(0, 100)}..."`);

    const normalizedQuery = this.normalizeText(query);
    const queryTokens = this.tokenize(normalizedQuery);

    let candidates = LEGISLATION_DATABASE;

    // Filtra por categoria se especificada
    if (category) {
      const cat = category as LegislationCategory;
      candidates = candidates.filter((article) => article.category === cat);
    }

    // Calcula score de relevancia para cada artigo
    const scored = candidates.map((article) => {
      const score = this.calculateRelevanceScore(queryTokens, article);
      return { article, score };
    });

    // Filtra artigos com score minimo e ordena por relevancia
    const results = scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15) // Limita a 15 resultados
      .map(
        (item): LegislationChunk => ({
          id: item.article.id,
          lawName: item.article.lawName,
          articleNumber: item.article.articleNumber,
          summary: item.article.summary,
          content: item.article.content,
          category: item.article.category,
          relevanceScore: Math.min(item.score, 1),
        }),
      );

    this.logger.debug(`Encontrados ${results.length} artigos relevantes`);
    return results;
  }

  /**
   * Retorna artigos pre-mapeados como relevantes para um tipo de contrato.
   * Esses artigos sao sempre incluidos no contexto do RAG, independente da query.
   */
  getRelevantArticles(contractType: ContractType): LegislationChunk[] {
    const keyArticleIds = CONTRACT_TYPE_KEY_ARTICLES[contractType] || [];
    const relevantCategories = CONTRACT_TYPE_LEGISLATION_MAP[contractType] || [
      LegislationCategory.CODIGO_CIVIL,
    ];

    // Busca artigos-chave mapeados diretamente
    const keyArticles = LEGISLATION_DATABASE.filter((article) =>
      keyArticleIds.includes(article.id),
    );

    // Busca artigos adicionais das categorias relevantes que nao estao nos key articles
    const additionalArticles = LEGISLATION_DATABASE.filter(
      (article) =>
        relevantCategories.includes(article.category) &&
        !keyArticleIds.includes(article.id),
    ).slice(0, 5); // Adiciona ate 5 artigos extras

    const allArticles = [...keyArticles, ...additionalArticles];

    return allArticles.map(
      (article, index): LegislationChunk => ({
        id: article.id,
        lawName: article.lawName,
        articleNumber: article.articleNumber,
        summary: article.summary,
        content: article.content,
        category: article.category,
        // Artigos-chave tem score mais alto
        relevanceScore: index < keyArticles.length ? 1 : 0.7,
      }),
    );
  }

  /**
   * Combina resultados de busca por query e artigos pre-mapeados em uma
   * string de contexto formatada para inclusao no prompt do LLM.
   *
   * @param query Texto da consulta / prompt do usuario
   * @param contractType Tipo do contrato
   * @returns String formatada com a legislacao relevante
   */
  getLegislationContext(query: string, contractType: ContractType): string {
    // Busca por query (keyword matching)
    const searchResults = this.searchLegislation(query);

    // Artigos pre-mapeados para o tipo de contrato
    const mappedArticles = this.getRelevantArticles(contractType);

    // Combina e de-duplica
    const allArticlesMap = new Map<string, LegislationChunk>();

    // Artigos mapeados tem prioridade
    for (const article of mappedArticles) {
      allArticlesMap.set(article.id, article);
    }

    // Adiciona resultados da busca que nao estejam duplicados
    for (const article of searchResults) {
      if (!allArticlesMap.has(article.id)) {
        allArticlesMap.set(article.id, article);
      }
    }

    const allArticles = Array.from(allArticlesMap.values());

    if (allArticles.length === 0) {
      return 'Nenhuma legislacao especifica encontrada para o contexto atual. Utilize seus conhecimentos gerais de direito brasileiro.';
    }

    // Agrupa por categoria para melhor organizacao
    const grouped = new Map<LegislationCategory, LegislationChunk[]>();
    for (const article of allArticles) {
      const existing = grouped.get(article.category) || [];
      existing.push(article);
      grouped.set(article.category, existing);
    }

    // Formata o contexto
    const sections: string[] = [];

    const categoryLabels: Record<LegislationCategory, string> = {
      [LegislationCategory.CODIGO_CIVIL]: 'CODIGO CIVIL (Lei 10.406/2002)',
      [LegislationCategory.CDC]: 'CODIGO DE DEFESA DO CONSUMIDOR (Lei 8.078/1990)',
      [LegislationCategory.LEI_INQUILINATO]: 'LEI DO INQUILINATO (Lei 8.245/1991)',
      [LegislationCategory.CLT]: 'CLT (Decreto-Lei 5.452/1943)',
      [LegislationCategory.MARCO_CIVIL]: 'MARCO CIVIL DA INTERNET (Lei 12.965/2014)',
      [LegislationCategory.LEI_ARBITRAGEM]: 'LEI DE ARBITRAGEM (Lei 9.307/1996)',
      [LegislationCategory.LGPD]: 'LGPD (Lei 13.709/2018)',
    };

    for (const [category, articles] of grouped) {
      const label = categoryLabels[category] || category;
      const articleTexts = articles
        .map(
          (a) =>
            `  - ${a.articleNumber}: ${a.summary}\n    ${a.content}`,
        )
        .join('\n');

      sections.push(`### ${label}\n${articleTexts}`);
    }

    return (
      'A seguir estao os artigos de legislacao brasileira mais relevantes para este contrato:\n\n' +
      sections.join('\n\n')
    );
  }

  /**
   * Normaliza texto removendo acentos e convertendo para minusculas.
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Tokeniza texto em palavras individuais, removendo stopwords.
   */
  private tokenize(text: string): string[] {
    const stopwords = new Set([
      'a', 'o', 'e', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na',
      'nos', 'nas', 'um', 'uma', 'uns', 'umas', 'por', 'para', 'com',
      'sem', 'que', 'se', 'ou', 'ao', 'aos', 'as', 'os', 'sua', 'seu',
      'suas', 'seus', 'este', 'esta', 'esse', 'essa', 'isso', 'isto',
      'aquele', 'aquela', 'ser', 'ter', 'haver', 'estar', 'ir', 'vir',
      'fazer', 'poder', 'dever', 'querer', 'saber', 'como', 'mais',
      'muito', 'tambem', 'ja', 'ainda', 'so', 'nao', 'sim', 'entre',
      'sobre', 'ate', 'apos', 'quando', 'onde', 'qual', 'quais',
    ]);

    return text
      .split(/\s+/)
      .filter((token) => token.length > 2 && !stopwords.has(token));
  }

  /**
   * Calcula score de relevancia entre tokens da query e um artigo.
   * Usa TF (term frequency) simplificado com boost para matches em keywords.
   */
  private calculateRelevanceScore(
    queryTokens: string[],
    article: LegislationArticle,
  ): number {
    if (queryTokens.length === 0) return 0;

    const normalizedKeywords = article.keywords.map((kw) =>
      this.normalizeText(kw),
    );
    const normalizedSummary = this.normalizeText(article.summary);
    const normalizedContent = this.normalizeText(article.content);

    let score = 0;
    let matchCount = 0;

    for (const token of queryTokens) {
      // Match exato em keyword (boost 3x)
      if (normalizedKeywords.some((kw) => kw.includes(token))) {
        score += 3;
        matchCount++;
        continue;
      }

      // Match em summary (boost 2x)
      if (normalizedSummary.includes(token)) {
        score += 2;
        matchCount++;
        continue;
      }

      // Match em content (boost 1x)
      if (normalizedContent.includes(token)) {
        score += 1;
        matchCount++;
      }
    }

    // Bonus para matches em frases compostas de keywords
    for (const keyword of normalizedKeywords) {
      const kwTokens = keyword.split(/\s+/);
      if (kwTokens.length > 1) {
        const matchingKwTokens = kwTokens.filter((kwt) =>
          queryTokens.some((qt) => kwt.includes(qt) || qt.includes(kwt)),
        );
        if (matchingKwTokens.length === kwTokens.length) {
          score += 5; // Bonus para match completo de keyword composta
        }
      }
    }

    // Normaliza pelo numero de tokens na query
    const normalizedScore = score / queryTokens.length;

    // Aplica coverage factor (penaliza queries com muitos tokens sem match)
    const coverage = matchCount / queryTokens.length;
    const finalScore = normalizedScore * (0.5 + 0.5 * coverage);

    return Math.min(finalScore, 1);
  }
}
