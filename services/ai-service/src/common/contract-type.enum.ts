export enum ContractType {
  // Contratos Civis
  COMPRA_VENDA = 'COMPRA_VENDA',
  LOCACAO_RESIDENCIAL = 'LOCACAO_RESIDENCIAL',
  LOCACAO_COMERCIAL = 'LOCACAO_COMERCIAL',
  PRESTACAO_SERVICOS = 'PRESTACAO_SERVICOS',
  COMODATO = 'COMODATO',
  DOACAO = 'DOACAO',
  PERMUTA = 'PERMUTA',
  EMPREITADA = 'EMPREITADA',
  MANDATO = 'MANDATO',
  FIANCA = 'FIANCA',
  MUTUO = 'MUTUO',

  // Contratos Empresariais
  SOCIEDADE = 'SOCIEDADE',
  FRANQUIA = 'FRANQUIA',
  DISTRIBUICAO = 'DISTRIBUICAO',
  REPRESENTACAO_COMERCIAL = 'REPRESENTACAO_COMERCIAL',
  JOINT_VENTURE = 'JOINT_VENTURE',
  CONSORCIO = 'CONSORCIO',

  // Contratos Trabalhistas
  TRABALHO_CLT = 'TRABALHO_CLT',
  TRABALHO_TEMPORARIO = 'TRABALHO_TEMPORARIO',
  ESTAGIO = 'ESTAGIO',

  // Contratos Digitais / Tecnologia
  LICENCA_SOFTWARE = 'LICENCA_SOFTWARE',
  SAAS = 'SAAS',
  NDA = 'NDA',
  TERMOS_USO = 'TERMOS_USO',
  POLITICA_PRIVACIDADE = 'POLITICA_PRIVACIDADE',

  // Contratos Imobiliarios
  COMPRA_VENDA_IMOVEL = 'COMPRA_VENDA_IMOVEL',
  PROMESSA_COMPRA_VENDA = 'PROMESSA_COMPRA_VENDA',
  CESSAO_DIREITOS = 'CESSAO_DIREITOS',

  // Outros
  PARCERIA = 'PARCERIA',
  CONFIDENCIALIDADE = 'CONFIDENCIALIDADE',
  OUTRO = 'OUTRO',
}

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  [ContractType.COMPRA_VENDA]: 'Contrato de Compra e Venda',
  [ContractType.LOCACAO_RESIDENCIAL]: 'Contrato de Locacao Residencial',
  [ContractType.LOCACAO_COMERCIAL]: 'Contrato de Locacao Comercial',
  [ContractType.PRESTACAO_SERVICOS]: 'Contrato de Prestacao de Servicos',
  [ContractType.COMODATO]: 'Contrato de Comodato',
  [ContractType.DOACAO]: 'Contrato de Doacao',
  [ContractType.PERMUTA]: 'Contrato de Permuta',
  [ContractType.EMPREITADA]: 'Contrato de Empreitada',
  [ContractType.MANDATO]: 'Contrato de Mandato',
  [ContractType.FIANCA]: 'Contrato de Fianca',
  [ContractType.MUTUO]: 'Contrato de Mutuo',
  [ContractType.SOCIEDADE]: 'Contrato Social / Sociedade',
  [ContractType.FRANQUIA]: 'Contrato de Franquia',
  [ContractType.DISTRIBUICAO]: 'Contrato de Distribuicao',
  [ContractType.REPRESENTACAO_COMERCIAL]: 'Contrato de Representacao Comercial',
  [ContractType.JOINT_VENTURE]: 'Contrato de Joint Venture',
  [ContractType.CONSORCIO]: 'Contrato de Consorcio',
  [ContractType.TRABALHO_CLT]: 'Contrato de Trabalho (CLT)',
  [ContractType.TRABALHO_TEMPORARIO]: 'Contrato de Trabalho Temporario',
  [ContractType.ESTAGIO]: 'Contrato de Estagio',
  [ContractType.LICENCA_SOFTWARE]: 'Contrato de Licenca de Software',
  [ContractType.SAAS]: 'Contrato SaaS',
  [ContractType.NDA]: 'Acordo de Nao Divulgacao (NDA)',
  [ContractType.TERMOS_USO]: 'Termos de Uso',
  [ContractType.POLITICA_PRIVACIDADE]: 'Politica de Privacidade',
  [ContractType.COMPRA_VENDA_IMOVEL]: 'Contrato de Compra e Venda de Imovel',
  [ContractType.PROMESSA_COMPRA_VENDA]: 'Promessa de Compra e Venda',
  [ContractType.CESSAO_DIREITOS]: 'Contrato de Cessao de Direitos',
  [ContractType.PARCERIA]: 'Contrato de Parceria',
  [ContractType.CONFIDENCIALIDADE]: 'Acordo de Confidencialidade',
  [ContractType.OUTRO]: 'Outro Tipo de Contrato',
};
