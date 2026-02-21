/**
 * Base de conhecimento legislativo brasileira para o sistema RAG do Tabeliao.
 *
 * Contem artigos-chave da legislacao brasileira relevantes para contratos,
 * organizados por categoria com resumos, numeros de artigos e palavras-chave
 * para busca semantica simplificada.
 */

export interface LegislationArticle {
  /** Identificador unico do artigo */
  id: string;
  /** Categoria legislativa */
  category: LegislationCategory;
  /** Nome da lei ou codigo */
  lawName: string;
  /** Numero do artigo */
  articleNumber: string;
  /** Resumo do conteudo do artigo */
  summary: string;
  /** Texto resumido ou parafraseado do artigo */
  content: string;
  /** Palavras-chave para busca */
  keywords: string[];
}

export enum LegislationCategory {
  CODIGO_CIVIL = 'CODIGO_CIVIL',
  CDC = 'CDC',
  LEI_INQUILINATO = 'LEI_INQUILINATO',
  CLT = 'CLT',
  MARCO_CIVIL = 'MARCO_CIVIL',
  LEI_ARBITRAGEM = 'LEI_ARBITRAGEM',
  LGPD = 'LGPD',
}

export const LEGISLATION_DATABASE: LegislationArticle[] = [
  // ======================================================================
  // CODIGO CIVIL - Lei 10.406/2002 - Contratos
  // ======================================================================
  {
    id: 'cc-421',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 421',
    summary: 'Funcao social do contrato',
    content:
      'A liberdade contratual sera exercida nos limites da funcao social do contrato. ' +
      'Nas relacoes contratuais privadas, prevalecera o principio da intervencao minima ' +
      'e a excepcionalidade da revisao contratual.',
    keywords: [
      'funcao social', 'liberdade contratual', 'intervencao minima',
      'revisao contratual', 'principio', 'contrato',
    ],
  },
  {
    id: 'cc-421a',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 421-A',
    summary: 'Contratos civis e empresariais - alocacao de riscos',
    content:
      'Os contratos civis e empresariais presumem-se paritarios e simetricos ate a presenca ' +
      'de elementos concretos que justifiquem o afastamento dessa presuncao. As partes ' +
      'negociantes poderao estabelecer parametros objetivos para a interpretacao das ' +
      'clausulas negociais e de seus pressupostos de revisao ou de resolucao. A alocacao ' +
      'de riscos definida pelas partes deve ser respeitada e observada.',
    keywords: [
      'paritario', 'simetrico', 'alocacao de riscos', 'interpretacao',
      'clausula', 'revisao', 'resolucao', 'empresarial',
    ],
  },
  {
    id: 'cc-422',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 422',
    summary: 'Boa-fe objetiva nos contratos',
    content:
      'Os contratantes sao obrigados a guardar, assim na conclusao do contrato, como em ' +
      'sua execucao, os principios de probidade e boa-fe.',
    keywords: [
      'boa-fe', 'probidade', 'contratantes', 'execucao', 'conclusao',
      'principio', 'obrigacao',
    ],
  },
  {
    id: 'cc-423',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 423',
    summary: 'Contratos de adesao - interpretacao favoravel ao aderente',
    content:
      'Quando houver no contrato de adesao clausulas ambiguas ou contraditorias, ' +
      'dever-se-a adotar a interpretacao mais favoravel ao aderente.',
    keywords: [
      'adesao', 'clausula ambigua', 'contraditoria', 'interpretacao',
      'aderente', 'consumidor', 'favoravel',
    ],
  },
  {
    id: 'cc-424',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 424',
    summary: 'Nulidade de renuncia antecipada do aderente',
    content:
      'Nos contratos de adesao, sao nulas as clausulas que estipulem a renuncia ' +
      'antecipada do aderente a direito resultante da natureza do negocio.',
    keywords: [
      'adesao', 'nulidade', 'renuncia', 'antecipada', 'aderente',
      'direito', 'negocio',
    ],
  },
  {
    id: 'cc-425',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 425',
    summary: 'Liberdade de celebrar contratos atipicos',
    content:
      'E licito as partes estipular contratos atipicos, observadas as normas gerais ' +
      'fixadas neste Codigo.',
    keywords: [
      'atipico', 'liberdade', 'estipular', 'normas gerais', 'contrato',
    ],
  },
  {
    id: 'cc-427',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 427',
    summary: 'Obrigatoriedade da proposta',
    content:
      'A proposta de contrato obriga o proponente, se o contrario nao resultar dos ' +
      'termos dela, da natureza do negocio, ou das circunstancias do caso.',
    keywords: [
      'proposta', 'proponente', 'obrigatoriedade', 'oferta', 'vinculacao',
    ],
  },
  {
    id: 'cc-472',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 472',
    summary: 'Distrato - mesma forma do contrato',
    content:
      'O distrato faz-se pela mesma forma exigida para o contrato.',
    keywords: [
      'distrato', 'rescisao', 'forma', 'encerramento', 'desfazimento',
    ],
  },
  {
    id: 'cc-473',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 473',
    summary: 'Resiliacao unilateral - denuncia notificada',
    content:
      'A resiliacao unilateral, nos casos em que a lei expressa ou implicitamente o ' +
      'permita, opera mediante denuncia notificada a outra parte. A resiliacao produzira ' +
      'seus efeitos conforme prazo previsto ou apos notificacao.',
    keywords: [
      'resiliacao', 'unilateral', 'denuncia', 'notificacao', 'rescisao',
      'encerramento',
    ],
  },
  {
    id: 'cc-474',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 474',
    summary: 'Clausula resolutiva expressa',
    content:
      'A clausula resolutiva expressa opera de pleno direito; a tacita depende de ' +
      'interpelacao judicial.',
    keywords: [
      'clausula resolutiva', 'rescisao', 'pleno direito', 'interpelacao',
      'judicial', 'inadimplemento',
    ],
  },
  {
    id: 'cc-475',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 475',
    summary: 'Direito de resolucao por inadimplemento',
    content:
      'A parte lesada pelo inadimplemento pode pedir a resolucao do contrato, se nao ' +
      'preferir exigir-lhe o cumprimento, cabendo, em qualquer dos casos, indenizacao ' +
      'por perdas e danos.',
    keywords: [
      'inadimplemento', 'resolucao', 'cumprimento', 'indenizacao',
      'perdas e danos', 'descumprimento',
    ],
  },
  {
    id: 'cc-476',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 476',
    summary: 'Excecao de contrato nao cumprido',
    content:
      'Nos contratos bilaterais, nenhum dos contratantes, antes de cumprida a sua ' +
      'obrigacao, pode exigir o implemento da do outro.',
    keywords: [
      'excecao', 'bilateral', 'cumprimento', 'obrigacao', 'simultaneidade',
    ],
  },
  {
    id: 'cc-478',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 478',
    summary: 'Resolucao por onerosidade excessiva',
    content:
      'Nos contratos de execucao continuada ou diferida, se a prestacao de uma das ' +
      'partes se tornar excessivamente onerosa, com extrema vantagem para a outra, em ' +
      'virtude de acontecimentos extraordinarios e imprevisiveis, podera o devedor pedir ' +
      'a resolucao do contrato.',
    keywords: [
      'onerosidade excessiva', 'resolucao', 'imprevisiveis', 'extraordinario',
      'revisao', 'desequilibrio', 'teoria da imprevisao',
    ],
  },
  {
    id: 'cc-479',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 479',
    summary: 'Modificacao equitativa das condicoes contratuais',
    content:
      'A resolucao podera ser evitada, oferecendo-se o reu a modificar equitativamente ' +
      'as condicoes do contrato.',
    keywords: [
      'modificacao', 'equitativa', 'condicoes', 'revisao', 'equilibrio',
    ],
  },
  {
    id: 'cc-480',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 480',
    summary: 'Reducao da prestacao em contratos unilaterais',
    content:
      'Se no contrato as obrigacoes couberem a apenas uma das partes, podera ela ' +
      'pleitear que a sua prestacao seja reduzida, ou alterado o modo de executa-la, ' +
      'a fim de evitar a onerosidade excessiva.',
    keywords: [
      'unilateral', 'reducao', 'prestacao', 'onerosidade', 'execucao',
    ],
  },
  {
    id: 'cc-408',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 408',
    summary: 'Clausula penal - penalidade contratual',
    content:
      'Incorre de pleno direito o devedor na clausula penal, desde que, culposamente, ' +
      'deixe de cumprir a obrigacao ou se constitua em mora.',
    keywords: [
      'clausula penal', 'multa', 'penalidade', 'mora', 'inadimplemento',
      'culpa',
    ],
  },
  {
    id: 'cc-412',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 412',
    summary: 'Limite da clausula penal ao valor da obrigacao principal',
    content:
      'O valor da cominacao imposta na clausula penal nao pode exceder o da obrigacao ' +
      'principal.',
    keywords: [
      'clausula penal', 'limite', 'valor', 'obrigacao principal', 'multa',
      'penalidade', 'teto',
    ],
  },
  {
    id: 'cc-156',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 156',
    summary: 'Estado de perigo - vicio de consentimento',
    content:
      'Configura-se o estado de perigo quando alguem, premido da necessidade de salvar-se, ' +
      'ou a pessoa de sua familia, de grave dano conhecido pela outra parte, assume ' +
      'obrigacao excessivamente onerosa.',
    keywords: [
      'estado de perigo', 'vicio', 'consentimento', 'onerosa', 'necessidade',
      'nulidade',
    ],
  },
  {
    id: 'cc-157',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 157',
    summary: 'Lesao - desproporcao manifesta entre prestacoes',
    content:
      'Ocorre a lesao quando uma pessoa, sob premente necessidade, ou por inexperiencia, ' +
      'se obriga a prestacao manifestamente desproporcional ao valor da prestacao oposta.',
    keywords: [
      'lesao', 'desproporcao', 'necessidade', 'inexperiencia', 'nulidade',
      'vicio',
    ],
  },
  {
    id: 'cc-566',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 566',
    summary: 'Obrigacoes do locador',
    content:
      'O locador e obrigado a entregar ao locatario a coisa alugada, com suas pertencas, ' +
      'em estado de servir ao uso a que se destina, e a mante-la nesse estado, pelo tempo ' +
      'do contrato, salvo clausula expressa em contrario.',
    keywords: [
      'locador', 'locacao', 'obrigacao', 'entregar', 'manutencao', 'aluguel',
    ],
  },
  {
    id: 'cc-593',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 593',
    summary: 'Prestacao de servico - definicao',
    content:
      'A prestacao de servico, que nao estiver sujeita as leis trabalhistas ou a lei ' +
      'especial, reger-se-a pelas disposicoes deste Capitulo.',
    keywords: [
      'prestacao de servico', 'autonomo', 'servico', 'contrato',
    ],
  },
  {
    id: 'cc-481',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 481',
    summary: 'Contrato de compra e venda - definicao',
    content:
      'Pelo contrato de compra e venda, um dos contratantes se obriga a transferir o ' +
      'dominio de certa coisa, e o outro, a pagar-lhe certo preco em dinheiro.',
    keywords: [
      'compra', 'venda', 'transferencia', 'dominio', 'preco', 'dinheiro',
    ],
  },
  {
    id: 'cc-538',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 538',
    summary: 'Contrato de doacao - definicao',
    content:
      'Considera-se doacao o contrato em que uma pessoa, por liberalidade, transfere do ' +
      'seu patrimonio bens ou vantagens para o de outra.',
    keywords: [
      'doacao', 'liberalidade', 'transferencia', 'patrimonio', 'bens',
    ],
  },
  {
    id: 'cc-579',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 579',
    summary: 'Contrato de comodato - emprestimo gratuito',
    content:
      'O comodato e o emprestimo gratuito de coisas nao fungiveis. Perfaz-se com a ' +
      'tradicao do objeto.',
    keywords: [
      'comodato', 'emprestimo', 'gratuito', 'nao fungivel', 'tradicao',
    ],
  },
  {
    id: 'cc-586',
    category: LegislationCategory.CODIGO_CIVIL,
    lawName: 'Codigo Civil - Lei 10.406/2002',
    articleNumber: 'Art. 586',
    summary: 'Contrato de mutuo - emprestimo de coisa fungivel',
    content:
      'O mutuo e o emprestimo de coisas fungiveis. O mutuario e obrigado a restituir ' +
      'ao mutuante o que dele recebeu em coisa do mesmo genero, qualidade e quantidade.',
    keywords: [
      'mutuo', 'emprestimo', 'fungivel', 'restituicao', 'dinheiro',
    ],
  },

  // ======================================================================
  // CODIGO DE DEFESA DO CONSUMIDOR - Lei 8.078/1990
  // ======================================================================
  {
    id: 'cdc-6',
    category: LegislationCategory.CDC,
    lawName: 'Codigo de Defesa do Consumidor - Lei 8.078/1990',
    articleNumber: 'Art. 6',
    summary: 'Direitos basicos do consumidor',
    content:
      'Sao direitos basicos do consumidor: protecao da vida, saude e seguranca; ' +
      'educacao e divulgacao sobre consumo; informacao adequada sobre produtos e servicos; ' +
      'protecao contra publicidade enganosa; modificacao de clausulas contratuais que ' +
      'estabelecam prestacoes desproporcionais; prevencao e reparacao de danos; acesso ' +
      'a orgaos judiciarios e administrativos; facilitacao da defesa de seus direitos ' +
      'com inversao do onus da prova.',
    keywords: [
      'direitos basicos', 'consumidor', 'protecao', 'informacao', 'publicidade',
      'clausula desproporcional', 'inversao onus prova',
    ],
  },
  {
    id: 'cdc-39',
    category: LegislationCategory.CDC,
    lawName: 'Codigo de Defesa do Consumidor - Lei 8.078/1990',
    articleNumber: 'Art. 39',
    summary: 'Praticas abusivas vedadas ao fornecedor',
    content:
      'E vedado ao fornecedor de produtos ou servicos: condicionar fornecimento a limites ' +
      'quantitativos; recusar atendimento; enviar produto sem solicitacao; prevalecer-se ' +
      'da fraqueza ou ignorancia do consumidor; exigir vantagem manifestamente excessiva; ' +
      'executar servicos sem orcamento previo; repassar informacao depreciativa sobre ' +
      'consumidor; colocar no mercado produto em desacordo com normas; recusar venda ' +
      'direta; elevar sem justa causa preco de produtos ou servicos; aplicar formula ou ' +
      'indice de reajuste diverso do legal ou contratualmente estabelecido.',
    keywords: [
      'pratica abusiva', 'fornecedor', 'vantagem excessiva', 'fraqueza',
      'ignorancia', 'reajuste', 'orcamento', 'vedado', 'proibido',
    ],
  },
  {
    id: 'cdc-46',
    category: LegislationCategory.CDC,
    lawName: 'Codigo de Defesa do Consumidor - Lei 8.078/1990',
    articleNumber: 'Art. 46',
    summary: 'Conhecimento previo do conteudo contratual',
    content:
      'Os contratos que regulam as relacoes de consumo nao obrigarao os consumidores, ' +
      'se nao lhes for dada a oportunidade de tomar conhecimento previo de seu conteudo, ' +
      'ou se os respectivos instrumentos forem redigidos de modo a dificultar a ' +
      'compreensao de seu sentido e alcance.',
    keywords: [
      'conhecimento previo', 'compreensao', 'redacao', 'clareza',
      'transparencia', 'consumidor', 'obrigacao',
    ],
  },
  {
    id: 'cdc-47',
    category: LegislationCategory.CDC,
    lawName: 'Codigo de Defesa do Consumidor - Lei 8.078/1990',
    articleNumber: 'Art. 47',
    summary: 'Interpretacao mais favoravel ao consumidor',
    content:
      'As clausulas contratuais serao interpretadas de maneira mais favoravel ao ' +
      'consumidor.',
    keywords: [
      'interpretacao', 'favoravel', 'consumidor', 'clausula', 'contrato',
    ],
  },
  {
    id: 'cdc-51',
    category: LegislationCategory.CDC,
    lawName: 'Codigo de Defesa do Consumidor - Lei 8.078/1990',
    articleNumber: 'Art. 51',
    summary: 'Clausulas abusivas nulas de pleno direito',
    content:
      'Sao nulas de pleno direito as clausulas contratuais relativas ao fornecimento de ' +
      'produtos e servicos que: I - impossibilitem, exonerem ou atenuem a responsabilidade ' +
      'do fornecedor; II - subtraiam opcao de reembolso; III - transfiram responsabilidades ' +
      'a terceiros; IV - estabelecam obrigacoes inicas, abusivas ou coloquem o consumidor ' +
      'em desvantagem exagerada; V - estabelecam inversao do onus da prova em prejuizo ' +
      'do consumidor; VI - determinem a utilizacao compulsoria de arbitragem; VII - imponham ' +
      'representante para concluir ou realizar outro negocio; VIII - deixem ao fornecedor ' +
      'opcao de concluir ou nao o contrato; IX - permitam ao fornecedor variacao de preco ' +
      'unilateral; X - permitam rescisao unilateral pelo fornecedor sem igual direito ao ' +
      'consumidor; XI - obriguem o consumidor a ressarcir custos de cobranca; XII - autorizem ' +
      'fornecedor a cancelar contrato unilateralmente; XIII - obriguem consumidor a pagar ' +
      'desproporcional clausula penal (multa maxima 2%); XIV - violem normas ambientais; ' +
      'XV - estejam em desacordo com o sistema de protecao ao consumidor; XVI - autorizem ' +
      'fornecedor a modificar unilateralmente conteudo ou qualidade.',
    keywords: [
      'clausula abusiva', 'nula', 'pleno direito', 'responsabilidade',
      'fornecedor', 'consumidor', 'multa', 'rescisao', 'unilateral',
      'arbitragem compulsoria', 'preco', 'reembolso', 'desvantagem',
      'onus da prova', '2%',
    ],
  },
  {
    id: 'cdc-52',
    category: LegislationCategory.CDC,
    lawName: 'Codigo de Defesa do Consumidor - Lei 8.078/1990',
    articleNumber: 'Art. 52',
    summary: 'Informacoes em outorga de credito e multa de mora',
    content:
      'No fornecimento de produtos ou servicos que envolva outorga de credito, o ' +
      'fornecedor devera informar previamente: preco em moeda corrente nacional; ' +
      'montante dos juros de mora e taxa efetiva anual de juros; acrescimos legalmente ' +
      'previstos; numero e periodicidade das prestacoes; soma total a pagar. A multa ' +
      'de mora decorrente do inadimplemento nao podera ser superior a 2% do valor ' +
      'da prestacao.',
    keywords: [
      'credito', 'juros', 'mora', 'multa', '2%', 'prestacao', 'informacao',
      'transparencia', 'consumidor', 'limite',
    ],
  },
  {
    id: 'cdc-53',
    category: LegislationCategory.CDC,
    lawName: 'Codigo de Defesa do Consumidor - Lei 8.078/1990',
    articleNumber: 'Art. 53',
    summary: 'Nulidade da perda total das prestacoes pagas',
    content:
      'Nos contratos de compra e venda de moveis ou imoveis mediante pagamento em ' +
      'prestacoes, bem como nas alienacoes fiduciarias em garantia, consideram-se nulas ' +
      'de pleno direito as clausulas que estabelecam a perda total das prestacoes pagas ' +
      'em beneficio do credor que, em razao do inadimplemento, pleitear a resolucao ' +
      'do contrato e a retomada do produto alienado.',
    keywords: [
      'prestacoes', 'perda total', 'nulidade', 'inadimplemento', 'alienacao',
      'fiduciaria', 'retomada', 'produto',
    ],
  },
  {
    id: 'cdc-54',
    category: LegislationCategory.CDC,
    lawName: 'Codigo de Defesa do Consumidor - Lei 8.078/1990',
    articleNumber: 'Art. 54',
    summary: 'Contrato de adesao - definicao e regras',
    content:
      'Contrato de adesao e aquele cujas clausulas tenham sido aprovadas pela autoridade ' +
      'competente ou estabelecidas unilateralmente pelo fornecedor de produtos ou servicos, ' +
      'sem que o consumidor possa discutir ou modificar substancialmente seu conteudo. ' +
      'A insercao de clausula no formulario nao desfigura a natureza de adesao do contrato. ' +
      'Os contratos de adesao escritos serao redigidos em termos claros e com caracteres ' +
      'ostaveis e legiveis, cujo tamanho da fonte nao sera inferior ao corpo doze.',
    keywords: [
      'adesao', 'unilateral', 'fornecedor', 'consumidor', 'clausula',
      'formulario', 'legivel', 'fonte', 'corpo doze',
    ],
  },

  // ======================================================================
  // LEI DO INQUILINATO - Lei 8.245/1991
  // ======================================================================
  {
    id: 'inq-1',
    category: LegislationCategory.LEI_INQUILINATO,
    lawName: 'Lei do Inquilinato - Lei 8.245/1991',
    articleNumber: 'Art. 1',
    summary: 'Ambito de aplicacao da Lei do Inquilinato',
    content:
      'A locacao de imovel urbano regula-se pelo disposto nesta lei. Continuam regulados ' +
      'pelo Codigo Civil e pelas leis especiais: as locacoes de imoveis de propriedade ' +
      'da Uniao, dos Estados e dos Municipios; as vagas autonomas de garagem; os espacos ' +
      'destinados a publicidade; apart-hoteis; e arrendamento mercantil.',
    keywords: [
      'locacao', 'imovel urbano', 'inquilinato', 'aplicacao', 'abrangencia',
    ],
  },
  {
    id: 'inq-4',
    category: LegislationCategory.LEI_INQUILINATO,
    lawName: 'Lei do Inquilinato - Lei 8.245/1991',
    articleNumber: 'Art. 4',
    summary: 'Quebra antecipada pelo locatario - multa proporcional',
    content:
      'Durante o prazo estipulado para a duracao do contrato, nao podera o locador ' +
      'reaver o imovel alugado. Com excecao do que estipula o paragrafo 2 do art. 54-A, ' +
      'o locatario, todavia, podera devolver o imovel, pagando a multa pactuada, ' +
      'proporcional ao periodo de cumprimento do contrato, ou, na sua falta, a que ' +
      'for judicialmente estipulada.',
    keywords: [
      'quebra', 'antecipada', 'multa', 'proporcional', 'locatario', 'locador',
      'devolucao', 'imovel', 'prazo',
    ],
  },
  {
    id: 'inq-12',
    category: LegislationCategory.LEI_INQUILINATO,
    lawName: 'Lei do Inquilinato - Lei 8.245/1991',
    articleNumber: 'Art. 12',
    summary: 'Sub-locacao depende de consentimento escrito do locador',
    content:
      'Em casos de separacao de fato, separacao judicial, divorcio ou dissolucao da ' +
      'uniao estavel, a locacao residencial prosseguira automaticamente com o conjuge ' +
      'ou companheiro que permanecer no imovel. A sub-locacao total ou parcial depende ' +
      'de consentimento previo e escrito do locador.',
    keywords: [
      'sub-locacao', 'sublocacao', 'consentimento', 'locador', 'separacao',
      'divorcio',
    ],
  },
  {
    id: 'inq-22',
    category: LegislationCategory.LEI_INQUILINATO,
    lawName: 'Lei do Inquilinato - Lei 8.245/1991',
    articleNumber: 'Art. 22',
    summary: 'Obrigacoes do locador',
    content:
      'O locador e obrigado a: entregar o imovel em estado de servir ao uso; garantir ' +
      'durante o tempo da locacao o uso pacifico do imovel; manter a forma e destino do ' +
      'imovel; responder pelos vicios ou defeitos anteriores a locacao; fornecer recibo ' +
      'detalhado; pagar as taxas de administracao imobiliaria e de intermediacoes; ' +
      'pagar impostos e taxas incidentes sobre o imovel, salvo disposicao em contrario.',
    keywords: [
      'locador', 'obrigacao', 'entregar', 'vicios', 'defeitos', 'recibo',
      'impostos', 'taxas', 'administracao',
    ],
  },
  {
    id: 'inq-23',
    category: LegislationCategory.LEI_INQUILINATO,
    lawName: 'Lei do Inquilinato - Lei 8.245/1991',
    articleNumber: 'Art. 23',
    summary: 'Obrigacoes do locatario',
    content:
      'O locatario e obrigado a: pagar pontualmente o aluguel e encargos; servir-se ' +
      'do imovel para uso convencionado; restituir o imovel nas mesmas condicoes; ' +
      'levar ao conhecimento do locador qualquer dano ou defeito; realizar reparacoes ' +
      'dos danos verificados no imovel; nao modificar forma interna ou externa sem ' +
      'consentimento previo do locador; entregar documentos de cobranca de tributos.',
    keywords: [
      'locatario', 'obrigacao', 'aluguel', 'encargos', 'reparacao', 'dano',
      'restituicao', 'modificacao',
    ],
  },
  {
    id: 'inq-37',
    category: LegislationCategory.LEI_INQUILINATO,
    lawName: 'Lei do Inquilinato - Lei 8.245/1991',
    articleNumber: 'Art. 37',
    summary: 'Modalidades de garantia na locacao',
    content:
      'No contrato de locacao, pode o locador exigir do locatario as seguintes ' +
      'modalidades de garantia: caucao; fianca; seguro de fianca locaticia; cessao ' +
      'fiduciaria de quotas de fundo de investimento. E vedada mais de uma das ' +
      'modalidades de garantia num mesmo contrato de locacao.',
    keywords: [
      'garantia', 'caucao', 'fianca', 'seguro', 'fianca locaticia',
      'cessao fiduciaria', 'locacao', 'vedada',
    ],
  },
  {
    id: 'inq-45',
    category: LegislationCategory.LEI_INQUILINATO,
    lawName: 'Lei do Inquilinato - Lei 8.245/1991',
    articleNumber: 'Art. 45',
    summary: 'Nulidade de clausulas que violem a lei do inquilinato',
    content:
      'Sao nulas de pleno direito as clausulas do contrato de locacao que visem a ' +
      'elidir os objetivos da presente lei, notadamente as que proibam a prorrogacao ' +
      'prevista no art. 47, ou que afastem o direito a renovatoria na hipotese do ' +
      'art. 51.',
    keywords: [
      'nulidade', 'clausula', 'locacao', 'prorrogacao', 'renovatoria',
      'proibicao',
    ],
  },
  {
    id: 'inq-46',
    category: LegislationCategory.LEI_INQUILINATO,
    lawName: 'Lei do Inquilinato - Lei 8.245/1991',
    articleNumber: 'Art. 46',
    summary: 'Locacao por prazo igual ou superior a 30 meses - denuncia vazia',
    content:
      'Nas locacoes ajustadas por escrito e por prazo igual ou superior a trinta meses, ' +
      'a resolucao do contrato ocorrera findo o prazo estipulado, independentemente de ' +
      'notificacao ou aviso. Findo o prazo, se o locatario permanecer no imovel sem ' +
      'oposicao do locador, a locacao sera prorrogada por prazo indeterminado.',
    keywords: [
      'prazo', '30 meses', 'denuncia vazia', 'resolucao', 'prorrogacao',
      'indeterminado', 'locacao',
    ],
  },

  // ======================================================================
  // CONSOLIDACAO DAS LEIS DO TRABALHO - CLT
  // ======================================================================
  {
    id: 'clt-442',
    category: LegislationCategory.CLT,
    lawName: 'Consolidacao das Leis do Trabalho - CLT',
    articleNumber: 'Art. 442',
    summary: 'Definicao do contrato individual de trabalho',
    content:
      'Contrato individual de trabalho e o acordo tacito ou expresso, correspondente ' +
      'a relacao de emprego. Qualquer que seja o ramo de atividade da sociedade ' +
      'cooperativa, nao existe vinculo empregaticio entre ela e seus associados, nem ' +
      'entre estes e os tomadores de servicos daquela.',
    keywords: [
      'contrato de trabalho', 'emprego', 'vinculo empregaticio', 'acordo',
      'cooperativa',
    ],
  },
  {
    id: 'clt-443',
    category: LegislationCategory.CLT,
    lawName: 'Consolidacao das Leis do Trabalho - CLT',
    articleNumber: 'Art. 443',
    summary: 'Forma e prazo do contrato de trabalho',
    content:
      'O contrato individual de trabalho podera ser acordado tacita ou expressamente, ' +
      'verbalmente ou por escrito, por prazo determinado ou indeterminado, ou para ' +
      'prestacao de trabalho intermitente.',
    keywords: [
      'contrato de trabalho', 'prazo', 'determinado', 'indeterminado',
      'intermitente', 'verbal', 'escrito',
    ],
  },
  {
    id: 'clt-444',
    category: LegislationCategory.CLT,
    lawName: 'Consolidacao das Leis do Trabalho - CLT',
    articleNumber: 'Art. 444',
    summary: 'Livre estipulacao das relacoes contratuais trabalhistas',
    content:
      'As relacoes contratuais de trabalho podem ser objeto de livre estipulacao das ' +
      'partes interessadas em tudo quanto nao contravenha as disposicoes de protecao ' +
      'ao trabalho, aos contratos coletivos que lhes sejam aplicaveis e as decisoes ' +
      'das autoridades competentes.',
    keywords: [
      'livre estipulacao', 'protecao', 'trabalho', 'contrato coletivo',
      'autoridade',
    ],
  },
  {
    id: 'clt-445',
    category: LegislationCategory.CLT,
    lawName: 'Consolidacao das Leis do Trabalho - CLT',
    articleNumber: 'Art. 445',
    summary: 'Prazo maximo do contrato por tempo determinado',
    content:
      'O contrato de trabalho por prazo determinado nao podera ser estipulado por mais ' +
      'de 2 (dois) anos. O contrato de experiencia nao podera exceder de 90 (noventa) ' +
      'dias.',
    keywords: [
      'prazo determinado', 'dois anos', 'experiencia', 'noventa dias',
      'limite', 'duracao',
    ],
  },
  {
    id: 'clt-451',
    category: LegislationCategory.CLT,
    lawName: 'Consolidacao das Leis do Trabalho - CLT',
    articleNumber: 'Art. 451',
    summary: 'Prorrogacao do contrato por tempo determinado',
    content:
      'O contrato de trabalho por prazo determinado que, tacita ou expressamente, for ' +
      'prorrogado mais de uma vez passara a vigorar sem determinacao de prazo.',
    keywords: [
      'prorrogacao', 'prazo determinado', 'indeterminado', 'contrato trabalho',
    ],
  },
  {
    id: 'clt-457',
    category: LegislationCategory.CLT,
    lawName: 'Consolidacao das Leis do Trabalho - CLT',
    articleNumber: 'Art. 457',
    summary: 'Composicao da remuneracao do empregado',
    content:
      'Compreendem-se na remuneracao do empregado, para todos os efeitos legais, alem ' +
      'do salario devido e pago diretamente pelo empregador, como contraprestacao do ' +
      'servico, as gorjetas que receber. Integram o salario a importancia fixa ' +
      'estipulada, as gratificacoes legais e as comissoes pagas pelo empregador.',
    keywords: [
      'remuneracao', 'salario', 'gorjeta', 'gratificacao', 'comissao',
      'empregado',
    ],
  },
  {
    id: 'clt-468',
    category: LegislationCategory.CLT,
    lawName: 'Consolidacao das Leis do Trabalho - CLT',
    articleNumber: 'Art. 468',
    summary: 'Alteracao do contrato de trabalho - mutuo consentimento',
    content:
      'Nos contratos individuais de trabalho so e licita a alteracao das respectivas ' +
      'condicoes por mutuo consentimento, e ainda assim desde que nao resultem, direta ' +
      'ou indiretamente, prejuizos ao empregado, sob pena de nulidade da clausula ' +
      'infringente desta garantia.',
    keywords: [
      'alteracao', 'mutuo consentimento', 'prejuizo', 'empregado',
      'nulidade', 'garantia', 'contrato trabalho',
    ],
  },
  {
    id: 'clt-477',
    category: LegislationCategory.CLT,
    lawName: 'Consolidacao das Leis do Trabalho - CLT',
    articleNumber: 'Art. 477',
    summary: 'Rescisao do contrato de trabalho - verbas rescisorias',
    content:
      'Na extincao do contrato de trabalho, o empregador devera proceder a anotacao na ' +
      'Carteira de Trabalho e Previdencia Social, comunicar a dispensa aos orgaos ' +
      'competentes e realizar o pagamento das verbas rescisorias no prazo de ate dez ' +
      'dias contados a partir do termino do contrato.',
    keywords: [
      'rescisao', 'extincao', 'verbas rescisorias', 'prazo', 'dez dias',
      'carteira trabalho', 'dispensa',
    ],
  },

  // ======================================================================
  // MARCO CIVIL DA INTERNET - Lei 12.965/2014
  // ======================================================================
  {
    id: 'mci-3',
    category: LegislationCategory.MARCO_CIVIL,
    lawName: 'Marco Civil da Internet - Lei 12.965/2014',
    articleNumber: 'Art. 3',
    summary: 'Principios do uso da internet no Brasil',
    content:
      'A disciplina do uso da internet no Brasil tem os seguintes principios: ' +
      'garantia da liberdade de expressao; protecao da privacidade; protecao dos dados ' +
      'pessoais; preservacao e garantia da neutralidade de rede; preservacao da ' +
      'estabilidade, seguranca e funcionalidade da rede; responsabilizacao dos agentes ' +
      'de acordo com suas atividades; preservacao da natureza participativa da rede; ' +
      'liberdade dos modelos de negocios promovidos na internet.',
    keywords: [
      'internet', 'principios', 'liberdade expressao', 'privacidade',
      'dados pessoais', 'neutralidade', 'rede',
    ],
  },
  {
    id: 'mci-7',
    category: LegislationCategory.MARCO_CIVIL,
    lawName: 'Marco Civil da Internet - Lei 12.965/2014',
    articleNumber: 'Art. 7',
    summary: 'Direitos dos usuarios de internet',
    content:
      'O acesso a internet e essencial ao exercicio da cidadania, e ao usuario sao ' +
      'assegurados os seguintes direitos: inviolabilidade da intimidade e da vida ' +
      'privada; inviolabilidade e sigilo do fluxo de comunicacoes; inviolabilidade e ' +
      'sigilo de comunicacoes privadas armazenadas; nao suspensao da conexao a internet; ' +
      'manutencao da qualidade contratada; informacoes claras e completas constantes dos ' +
      'contratos de prestacao de servicos; nao fornecimento a terceiros de dados pessoais; ' +
      'informacoes claras sobre coleta de dados; consentimento expresso para coleta de dados.',
    keywords: [
      'direitos usuario', 'internet', 'privacidade', 'sigilo', 'dados pessoais',
      'consentimento', 'conexao', 'qualidade',
    ],
  },
  {
    id: 'mci-8',
    category: LegislationCategory.MARCO_CIVIL,
    lawName: 'Marco Civil da Internet - Lei 12.965/2014',
    articleNumber: 'Art. 8',
    summary: 'Nulidade de clausulas contratuais que violem direitos dos usuarios',
    content:
      'A garantia do direito a privacidade e a liberdade de expressao nas comunicacoes ' +
      'e condicao para o pleno exercicio do direito de acesso a internet. Sao nulas de ' +
      'pleno direito as clausulas contratuais que violem o disposto no caput, tais como ' +
      'as que: impliquem ofensa a inviolabilidade e ao sigilo das comunicacoes privadas; ' +
      'em contrato de adesao, nao oferecam como alternativa ao contratante a adocao do ' +
      'foro brasileiro para solucao de controversias.',
    keywords: [
      'nulidade', 'clausula', 'privacidade', 'liberdade expressao', 'sigilo',
      'comunicacao', 'foro brasileiro', 'adesao',
    ],
  },
  {
    id: 'mci-11',
    category: LegislationCategory.MARCO_CIVIL,
    lawName: 'Marco Civil da Internet - Lei 12.965/2014',
    articleNumber: 'Art. 11',
    summary: 'Legislacao brasileira aplicavel a coleta de dados no Brasil',
    content:
      'Em qualquer operacao de coleta, armazenamento, guarda e tratamento de registros, ' +
      'de dados pessoais ou de comunicacoes por provedores de conexao e de aplicacoes de ' +
      'internet em que pelo menos um desses atos ocorra em territorio nacional, deverao ' +
      'ser obrigatoriamente respeitados a legislacao brasileira e os direitos a privacidade, ' +
      'a protecao dos dados pessoais e ao sigilo das comunicacoes privadas e dos registros.',
    keywords: [
      'coleta dados', 'armazenamento', 'territorio nacional', 'legislacao brasileira',
      'privacidade', 'sigilo', 'provedor',
    ],
  },

  // ======================================================================
  // LEI DE ARBITRAGEM - Lei 9.307/1996
  // ======================================================================
  {
    id: 'arb-1',
    category: LegislationCategory.LEI_ARBITRAGEM,
    lawName: 'Lei de Arbitragem - Lei 9.307/1996',
    articleNumber: 'Art. 1',
    summary: 'Pessoas capazes podem submeter-se a arbitragem',
    content:
      'As pessoas capazes de contratar poderao valer-se da arbitragem para dirimir ' +
      'litigios relativos a direitos patrimoniais disponiveis. A administracao publica ' +
      'direta e indireta podera utilizar-se da arbitragem para dirimir conflitos ' +
      'relativos a direitos patrimoniais disponiveis.',
    keywords: [
      'arbitragem', 'capacidade', 'contratar', 'direito patrimonial',
      'disponivel', 'litigio',
    ],
  },
  {
    id: 'arb-2',
    category: LegislationCategory.LEI_ARBITRAGEM,
    lawName: 'Lei de Arbitragem - Lei 9.307/1996',
    articleNumber: 'Art. 2',
    summary: 'Arbitragem de direito ou equidade - escolha das partes',
    content:
      'A arbitragem podera ser de direito ou de equidade, a criterio das partes. ' +
      'Poderao as partes escolher, livremente, as regras de direito que serao aplicadas ' +
      'na arbitragem, desde que nao haja violacao aos bons costumes e a ordem publica.',
    keywords: [
      'arbitragem', 'direito', 'equidade', 'regras', 'bons costumes',
      'ordem publica',
    ],
  },
  {
    id: 'arb-3',
    category: LegislationCategory.LEI_ARBITRAGEM,
    lawName: 'Lei de Arbitragem - Lei 9.307/1996',
    articleNumber: 'Art. 3',
    summary: 'Convencao de arbitragem - clausula compromissoria e compromisso',
    content:
      'As partes interessadas podem submeter a solucao de seus litigios ao juizo ' +
      'arbitral, mediante convencao de arbitragem, assim entendida a clausula ' +
      'compromissoria e o compromisso arbitral.',
    keywords: [
      'convencao', 'clausula compromissoria', 'compromisso arbitral',
      'litigio', 'juizo arbitral',
    ],
  },
  {
    id: 'arb-4',
    category: LegislationCategory.LEI_ARBITRAGEM,
    lawName: 'Lei de Arbitragem - Lei 9.307/1996',
    articleNumber: 'Art. 4',
    summary: 'Clausula compromissoria - definicao e requisitos',
    content:
      'A clausula compromissoria e a convencao atraves da qual as partes em um contrato ' +
      'comprometem-se a submeter a arbitragem os litigios que possam vir a surgir, ' +
      'relativamente a tal contrato. A clausula compromissoria deve ser estipulada por ' +
      'escrito, podendo estar inserta no proprio contrato ou em documento apartado que ' +
      'a ele se refira. Nos contratos de adesao, a clausula compromissoria so tera ' +
      'eficacia se o aderente tomar a iniciativa de instituir a arbitragem ou concordar ' +
      'expressamente com a sua instituicao.',
    keywords: [
      'clausula compromissoria', 'arbitragem', 'escrito', 'contrato',
      'adesao', 'aderente', 'eficacia',
    ],
  },
  {
    id: 'arb-31',
    category: LegislationCategory.LEI_ARBITRAGEM,
    lawName: 'Lei de Arbitragem - Lei 9.307/1996',
    articleNumber: 'Art. 31',
    summary: 'Sentenca arbitral como titulo executivo judicial',
    content:
      'A sentenca arbitral produz, entre as partes e seus sucessores, os mesmos efeitos ' +
      'da sentenca proferida pelos orgaos do Poder Judiciario e, sendo condenatoria, ' +
      'constitui titulo executivo.',
    keywords: [
      'sentenca arbitral', 'titulo executivo', 'efeitos', 'judiciario',
      'condenatoria',
    ],
  },

  // ======================================================================
  // LGPD - Lei Geral de Protecao de Dados - Lei 13.709/2018
  // ======================================================================
  {
    id: 'lgpd-1',
    category: LegislationCategory.LGPD,
    lawName: 'LGPD - Lei 13.709/2018',
    articleNumber: 'Art. 1',
    summary: 'Objetivo da LGPD - protecao de dados pessoais',
    content:
      'Esta Lei dispoe sobre o tratamento de dados pessoais, inclusive nos meios digitais, ' +
      'por pessoa natural ou por pessoa juridica de direito publico ou privado, com o ' +
      'objetivo de proteger os direitos fundamentais de liberdade e de privacidade e o ' +
      'livre desenvolvimento da personalidade da pessoa natural.',
    keywords: [
      'dados pessoais', 'tratamento', 'protecao', 'privacidade', 'liberdade',
      'personalidade', 'digital',
    ],
  },
  {
    id: 'lgpd-6',
    category: LegislationCategory.LGPD,
    lawName: 'LGPD - Lei 13.709/2018',
    articleNumber: 'Art. 6',
    summary: 'Principios do tratamento de dados pessoais',
    content:
      'As atividades de tratamento de dados pessoais deverao observar a boa-fe e os ' +
      'seguintes principios: finalidade; adequacao; necessidade; livre acesso; qualidade ' +
      'dos dados; transparencia; seguranca; prevencao; nao discriminacao; ' +
      'responsabilizacao e prestacao de contas.',
    keywords: [
      'principios', 'dados pessoais', 'finalidade', 'adequacao', 'necessidade',
      'transparencia', 'seguranca', 'prevencao', 'nao discriminacao',
    ],
  },
  {
    id: 'lgpd-7',
    category: LegislationCategory.LGPD,
    lawName: 'LGPD - Lei 13.709/2018',
    articleNumber: 'Art. 7',
    summary: 'Bases legais para tratamento de dados pessoais',
    content:
      'O tratamento de dados pessoais somente podera ser realizado nas seguintes hipoteses: ' +
      'consentimento pelo titular; cumprimento de obrigacao legal; execucao de politicas ' +
      'publicas; realizacao de estudos por orgao de pesquisa; execucao de contrato ou ' +
      'procedimentos preliminares; exercicio regular de direitos; protecao da vida; ' +
      'tutela da saude; interesse legitimo do controlador; protecao do credito.',
    keywords: [
      'base legal', 'consentimento', 'obrigacao legal', 'contrato',
      'interesse legitimo', 'protecao credito', 'tratamento dados',
    ],
  },
  {
    id: 'lgpd-8',
    category: LegislationCategory.LGPD,
    lawName: 'LGPD - Lei 13.709/2018',
    articleNumber: 'Art. 8',
    summary: 'Consentimento para tratamento de dados - requisitos',
    content:
      'O consentimento devera ser fornecido por escrito ou por outro meio que demonstre ' +
      'a manifestacao de vontade do titular. O consentimento devera referir-se a ' +
      'finalidades determinadas, e as autorizacoes genericas para o tratamento de dados ' +
      'pessoais serao nulas. O consentimento pode ser revogado a qualquer momento.',
    keywords: [
      'consentimento', 'escrito', 'finalidade', 'autorizacao generica',
      'nulidade', 'revogacao', 'titular',
    ],
  },
  {
    id: 'lgpd-11',
    category: LegislationCategory.LGPD,
    lawName: 'LGPD - Lei 13.709/2018',
    articleNumber: 'Art. 11',
    summary: 'Tratamento de dados pessoais sensiveis',
    content:
      'O tratamento de dados pessoais sensiveis somente podera ocorrer quando o titular ' +
      'ou seu responsavel legal consentir, de forma especifica e destacada, para ' +
      'finalidades especificas; ou sem fornecimento de consentimento, nas hipoteses em ' +
      'que for indispensavel para: cumprimento de obrigacao legal; tratamento compartilhado ' +
      'de dados necessarios a execucao de politicas publicas; realizacao de estudos por ' +
      'orgao de pesquisa; exercicio regular de direitos; protecao da vida; tutela da saude; ' +
      'garantia da prevencao a fraude e a seguranca do titular.',
    keywords: [
      'dados sensiveis', 'consentimento especifico', 'destacado', 'saude',
      'biometria', 'religiao', 'etnia', 'opiniao politica', 'genetico',
    ],
  },
  {
    id: 'lgpd-18',
    category: LegislationCategory.LGPD,
    lawName: 'LGPD - Lei 13.709/2018',
    articleNumber: 'Art. 18',
    summary: 'Direitos do titular dos dados pessoais',
    content:
      'O titular dos dados pessoais tem direito a obter do controlador, em relacao aos ' +
      'dados do titular por ele tratados: confirmacao da existencia de tratamento; acesso ' +
      'aos dados; correcao de dados incompletos; anonimizacao, bloqueio ou eliminacao de ' +
      'dados desnecessarios; portabilidade dos dados; eliminacao dos dados pessoais ' +
      'tratados com o consentimento; informacao sobre compartilhamento; informacao sobre ' +
      'possibilidade de nao fornecer consentimento; revogacao do consentimento.',
    keywords: [
      'direitos titular', 'acesso', 'correcao', 'eliminacao', 'portabilidade',
      'anonimizacao', 'bloqueio', 'revogacao', 'consentimento',
    ],
  },
  {
    id: 'lgpd-42',
    category: LegislationCategory.LGPD,
    lawName: 'LGPD - Lei 13.709/2018',
    articleNumber: 'Art. 42',
    summary: 'Responsabilidade e ressarcimento de danos',
    content:
      'O controlador ou o operador que, em razao do exercicio de atividade de tratamento ' +
      'de dados pessoais, causar a outrem dano patrimonial, moral, individual ou coletivo, ' +
      'em violacao a legislacao de protecao de dados pessoais, e obrigado a repara-lo. ' +
      'O operador responde solidariamente pelos danos causados pelo tratamento quando ' +
      'descumprir as obrigacoes da legislacao ou quando nao tiver seguido as instrucoes ' +
      'licitas do controlador.',
    keywords: [
      'responsabilidade', 'dano', 'patrimonial', 'moral', 'controlador',
      'operador', 'solidario', 'reparacao',
    ],
  },
  {
    id: 'lgpd-46',
    category: LegislationCategory.LGPD,
    lawName: 'LGPD - Lei 13.709/2018',
    articleNumber: 'Art. 46',
    summary: 'Medidas de seguranca para protecao de dados pessoais',
    content:
      'Os agentes de tratamento devem adotar medidas de seguranca, tecnicas e ' +
      'administrativas aptas a proteger os dados pessoais de acessos nao autorizados e ' +
      'de situacoes acidentais ou ilicitas de destruicao, perda, alteracao, comunicacao ' +
      'ou qualquer forma de tratamento inadequado ou ilicito.',
    keywords: [
      'seguranca', 'medidas tecnicas', 'protecao', 'acesso nao autorizado',
      'destruicao', 'perda', 'alteracao', 'tratamento ilicito',
    ],
  },
];

/**
 * Mapeamento de tipos de contrato para categorias legislativas relevantes.
 */
export const CONTRACT_TYPE_LEGISLATION_MAP: Record<string, LegislationCategory[]> = {
  COMPRA_VENDA: [LegislationCategory.CODIGO_CIVIL, LegislationCategory.CDC],
  LOCACAO_RESIDENCIAL: [LegislationCategory.LEI_INQUILINATO, LegislationCategory.CODIGO_CIVIL],
  LOCACAO_COMERCIAL: [LegislationCategory.LEI_INQUILINATO, LegislationCategory.CODIGO_CIVIL],
  PRESTACAO_SERVICOS: [LegislationCategory.CODIGO_CIVIL, LegislationCategory.CDC],
  COMODATO: [LegislationCategory.CODIGO_CIVIL],
  DOACAO: [LegislationCategory.CODIGO_CIVIL],
  PERMUTA: [LegislationCategory.CODIGO_CIVIL],
  EMPREITADA: [LegislationCategory.CODIGO_CIVIL],
  MANDATO: [LegislationCategory.CODIGO_CIVIL],
  FIANCA: [LegislationCategory.CODIGO_CIVIL, LegislationCategory.LEI_INQUILINATO],
  MUTUO: [LegislationCategory.CODIGO_CIVIL, LegislationCategory.CDC],
  SOCIEDADE: [LegislationCategory.CODIGO_CIVIL],
  FRANQUIA: [LegislationCategory.CODIGO_CIVIL, LegislationCategory.CDC],
  DISTRIBUICAO: [LegislationCategory.CODIGO_CIVIL],
  REPRESENTACAO_COMERCIAL: [LegislationCategory.CODIGO_CIVIL],
  JOINT_VENTURE: [LegislationCategory.CODIGO_CIVIL],
  CONSORCIO: [LegislationCategory.CODIGO_CIVIL, LegislationCategory.CDC],
  TRABALHO_CLT: [LegislationCategory.CLT, LegislationCategory.CODIGO_CIVIL],
  TRABALHO_TEMPORARIO: [LegislationCategory.CLT, LegislationCategory.CODIGO_CIVIL],
  ESTAGIO: [LegislationCategory.CLT],
  LICENCA_SOFTWARE: [LegislationCategory.CODIGO_CIVIL, LegislationCategory.MARCO_CIVIL, LegislationCategory.LGPD],
  SAAS: [LegislationCategory.CODIGO_CIVIL, LegislationCategory.CDC, LegislationCategory.MARCO_CIVIL, LegislationCategory.LGPD],
  NDA: [LegislationCategory.CODIGO_CIVIL, LegislationCategory.LGPD],
  TERMOS_USO: [LegislationCategory.MARCO_CIVIL, LegislationCategory.CDC, LegislationCategory.LGPD],
  POLITICA_PRIVACIDADE: [LegislationCategory.LGPD, LegislationCategory.MARCO_CIVIL],
  COMPRA_VENDA_IMOVEL: [LegislationCategory.CODIGO_CIVIL, LegislationCategory.CDC],
  PROMESSA_COMPRA_VENDA: [LegislationCategory.CODIGO_CIVIL, LegislationCategory.CDC],
  CESSAO_DIREITOS: [LegislationCategory.CODIGO_CIVIL],
  PARCERIA: [LegislationCategory.CODIGO_CIVIL],
  CONFIDENCIALIDADE: [LegislationCategory.CODIGO_CIVIL, LegislationCategory.LGPD],
  OUTRO: [LegislationCategory.CODIGO_CIVIL],
};

/**
 * Artigos especificos mapeados por tipo de contrato para inclusao direta no RAG.
 */
export const CONTRACT_TYPE_KEY_ARTICLES: Record<string, string[]> = {
  COMPRA_VENDA: ['cc-481', 'cc-421', 'cc-422', 'cc-412', 'cdc-51', 'cdc-52'],
  LOCACAO_RESIDENCIAL: ['inq-4', 'inq-22', 'inq-23', 'inq-37', 'inq-45', 'inq-46', 'cc-566'],
  LOCACAO_COMERCIAL: ['inq-4', 'inq-22', 'inq-23', 'inq-37', 'inq-46', 'cc-566'],
  PRESTACAO_SERVICOS: ['cc-593', 'cc-421', 'cc-422', 'cc-475', 'cdc-39', 'cdc-51'],
  COMODATO: ['cc-579', 'cc-421', 'cc-422'],
  DOACAO: ['cc-538', 'cc-421'],
  MUTUO: ['cc-586', 'cc-421', 'cc-422', 'cdc-52'],
  TRABALHO_CLT: ['clt-442', 'clt-443', 'clt-444', 'clt-445', 'clt-451', 'clt-457', 'clt-468', 'clt-477'],
  TRABALHO_TEMPORARIO: ['clt-443', 'clt-445', 'clt-477'],
  ESTAGIO: ['clt-443'],
  LICENCA_SOFTWARE: ['cc-421', 'cc-422', 'mci-7', 'mci-8', 'lgpd-7', 'lgpd-18'],
  SAAS: ['cc-421', 'cc-422', 'cdc-51', 'mci-7', 'mci-8', 'lgpd-6', 'lgpd-7', 'lgpd-18', 'lgpd-46'],
  NDA: ['cc-421', 'cc-422', 'lgpd-6', 'lgpd-46'],
  TERMOS_USO: ['mci-3', 'mci-7', 'mci-8', 'cdc-46', 'cdc-51', 'cdc-54', 'lgpd-6', 'lgpd-7', 'lgpd-8', 'lgpd-18'],
  POLITICA_PRIVACIDADE: ['lgpd-1', 'lgpd-6', 'lgpd-7', 'lgpd-8', 'lgpd-11', 'lgpd-18', 'lgpd-42', 'lgpd-46', 'mci-7', 'mci-11'],
  COMPRA_VENDA_IMOVEL: ['cc-481', 'cc-421', 'cc-422', 'cdc-51', 'cdc-53'],
  PROMESSA_COMPRA_VENDA: ['cc-481', 'cc-421', 'cc-422', 'cdc-51', 'cdc-53'],
  CONFIDENCIALIDADE: ['cc-421', 'cc-422', 'lgpd-6', 'lgpd-46'],
  PARCERIA: ['cc-421', 'cc-422', 'cc-425'],
};
