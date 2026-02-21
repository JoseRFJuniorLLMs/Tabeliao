import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import {
  Dispute,
  DisputeStatus,
  DisputeType,
  EvidenceItem,
} from '../modules/disputes/entities/dispute.entity';
import {
  DisputeMessage,
  SenderRole,
} from '../modules/disputes/entities/dispute-message.entity';
import { Arbitrator } from '../modules/arbitration/entities/arbitrator.entity';
import { ArbitratorRating } from '../modules/arbitration/entities/arbitrator-rating.entity';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Cross-service reference IDs
const USER_IDS = {
  admin: 'a0000000-0000-4000-8000-000000000001',
  maria: 'a0000000-0000-4000-8000-000000000002',
  joao: 'a0000000-0000-4000-8000-000000000003',
  ana: 'a0000000-0000-4000-8000-000000000004',
  carlos: 'a0000000-0000-4000-8000-000000000005',
  fernanda: 'a0000000-0000-4000-8000-000000000006',
  techCorp: 'a0000000-0000-4000-8000-000000000007',
  arbitratorDrPaulo: 'a0000000-0000-4000-8000-000000000008',
  arbitratorDraLucia: 'a0000000-0000-4000-8000-000000000009',
  arbitratorDrRoberto: 'a0000000-0000-4000-8000-00000000000a',
};

const CONTRACT_IDS = {
  rentalMaria: 'c0000000-0000-4000-8000-000000000001',
  servicesTechCorp: 'c0000000-0000-4000-8000-000000000002',
  purchaseSale: 'c0000000-0000-4000-8000-000000000003',
  freelancerCarlos: 'c0000000-0000-4000-8000-000000000004',
  disputedContract: 'c0000000-0000-4000-8000-00000000000a',
};

// Fixed IDs
const ARBITRATOR_IDS = {
  drPaulo: 'b0000000-0000-4000-8000-000000000001',
  draLucia: 'b0000000-0000-4000-8000-000000000002',
  drRoberto: 'b0000000-0000-4000-8000-000000000003',
};

const DISPUTE_IDS = {
  renovationDispute: 'd0000000-0000-4000-8000-000000000001',
  paymentDispute: 'd0000000-0000-4000-8000-000000000002',
  qualityDispute: 'd0000000-0000-4000-8000-000000000003',
  deliveryDispute: 'd0000000-0000-4000-8000-000000000004',
  resolvedDispute: 'd0000000-0000-4000-8000-000000000005',
};

// --- Arbitrators ---

function buildArbitrators(): Partial<Arbitrator>[] {
  return [
    {
      id: ARBITRATOR_IDS.drPaulo,
      userId: USER_IDS.arbitratorDrPaulo,
      oabNumber: '123456',
      oabState: 'SP',
      specialties: [
        'Direito Imobiliario',
        'Direito Contratual',
        'Locacao Residencial e Comercial',
        'Mediacao de Conflitos',
      ],
      rating: 4.8,
      totalCases: 47,
      resolvedCases: 42,
      averageResolutionDays: 12.5,
      isAvailable: true,
      maxConcurrentCases: 5,
      currentCases: 2,
      bio: 'Advogado especialista em Direito Imobiliario com 15 anos de experiencia. Mestre em Direito Civil pela USP. Arbitro certificado pela Camara de Arbitragem de Sao Paulo. Atuou em mais de 200 processos de locacao e compra/venda de imoveis. Mediador certificado pelo CNJ.',
    },
    {
      id: ARBITRATOR_IDS.draLucia,
      userId: USER_IDS.arbitratorDraLucia,
      oabNumber: '789012',
      oabState: 'RJ',
      specialties: [
        'Direito Digital',
        'Propriedade Intelectual',
        'Contratos de Tecnologia',
        'LGPD',
      ],
      rating: 4.9,
      totalCases: 38,
      resolvedCases: 36,
      averageResolutionDays: 10.2,
      isAvailable: true,
      maxConcurrentCases: 5,
      currentCases: 1,
      bio: 'Doutora em Direito Digital pela UERJ. Especialista em contratos de tecnologia e propriedade intelectual. Certificada em LGPD e proteção de dados. Arbitradora do Tribunal Arbitral Digital do Rio de Janeiro. Autora do livro "Contratos Inteligentes e o Direito Brasileiro".',
    },
    {
      id: ARBITRATOR_IDS.drRoberto,
      userId: USER_IDS.arbitratorDrRoberto,
      oabNumber: '345678',
      oabState: 'MG',
      specialties: [
        'Direito Empresarial',
        'Direito Societario',
        'Recuperacao Judicial',
        'Contratos Comerciais',
      ],
      rating: 4.6,
      totalCases: 55,
      resolvedCases: 51,
      averageResolutionDays: 15.8,
      isAvailable: true,
      maxConcurrentCases: 7,
      currentCases: 3,
      bio: 'Advogado empresarialista com 20 anos de experiencia. Mestre em Direito Comercial pela UFMG. Especialista em resolucao alternativa de disputas. Membro da Associacao Brasileira de Arbitragem. Atuou como arbitro em disputas envolvendo mais de R$ 500 milhoes em valor agregado.',
    },
  ];
}

// --- Disputes ---

function buildDisputes(): Partial<Dispute>[] {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fifteenDaysFromNow = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  return [
    // 1. UNDER_ARBITRATION - Renovation dispute (main disputed contract)
    {
      id: DISPUTE_IDS.renovationDispute,
      contractId: CONTRACT_IDS.disputedContract,
      openedBy: USER_IDS.joao,
      respondentId: USER_IDS.carlos,
      status: DisputeStatus.UNDER_ARBITRATION,
      type: DisputeType.QUALITY_DISPUTE,
      description:
        'Disputa aberta por Joao Pedro dos Santos contra Carlos Eduardo Ferreira referente ao contrato de reforma residencial TAB-2026-000010. O contratante alega: (1) Atraso de 45 dias alem do prazo contratual; (2) Acabamento de baixa qualidade no banheiro, com azulejos desalinhados e rejunte irregular; (3) Vazamento na cozinha identificado 2 semanas apos a conclusao parcial; (4) Materiais utilizados de qualidade inferior ao especificado no contrato. O contratante solicita abatimento de R$ 15.000,00 no valor total e conclusao dos reparos necessarios.',
      disputeValue: '15000.00',
      evidence: [
        {
          id: uuidv4(),
          type: 'PHOTO',
          url: 'https://storage.tabeliao.com.br/evidence/disp-001/azulejos-desalinhados.jpg',
          description: 'Fotos dos azulejos desalinhados no banheiro',
          uploadedBy: USER_IDS.joao,
          uploadedAt: '2026-01-20T10:30:00Z',
        },
        {
          id: uuidv4(),
          type: 'PHOTO',
          url: 'https://storage.tabeliao.com.br/evidence/disp-001/vazamento-cozinha.jpg',
          description: 'Registro fotografico do vazamento na cozinha',
          uploadedBy: USER_IDS.joao,
          uploadedAt: '2026-01-20T10:35:00Z',
        },
        {
          id: uuidv4(),
          type: 'DOCUMENT',
          url: 'https://storage.tabeliao.com.br/evidence/disp-001/orcamento-reparo.pdf',
          description: 'Orcamento de reparo por terceiro avaliado em R$ 12.000,00',
          uploadedBy: USER_IDS.joao,
          uploadedAt: '2026-01-22T14:00:00Z',
        },
        {
          id: uuidv4(),
          type: 'DOCUMENT',
          url: 'https://storage.tabeliao.com.br/evidence/disp-001/cronograma-original.pdf',
          description: 'Cronograma original da obra mostrando atraso',
          uploadedBy: USER_IDS.joao,
          uploadedAt: '2026-01-22T14:05:00Z',
        },
        {
          id: uuidv4(),
          type: 'DOCUMENT',
          url: 'https://storage.tabeliao.com.br/evidence/disp-001/notas-fiscais-material.pdf',
          description: 'Notas fiscais dos materiais comprados pelo contratado (qualidade inferior)',
          uploadedBy: USER_IDS.carlos,
          uploadedAt: '2026-01-25T09:00:00Z',
        },
      ] as EvidenceItem[],
      arbitratorId: ARBITRATOR_IDS.drPaulo,
      mediatorId: null,
      aiAnalysis:
        'Analise preliminar da IA: Com base nas evidencias apresentadas, ha indicios consistentes de: (1) Atraso contratual comprovado pelo cronograma original vs. data de conclusao; (2) Defeitos visiveis nas fotos do acabamento; (3) Materiais de qualidade potencialmente inferior conforme notas fiscais. Recomendacao: mediacao com proposta de abatimento parcial entre R$ 8.000 e R$ 12.000, considerando o orcamento de reparo apresentado e a conclusao parcial dos servicos.',
      resolution: null,
      resolutionAcceptedByPlaintiff: false,
      resolutionAcceptedByDefendant: false,
      deadline: thirtyDaysFromNow,
      filedAt: new Date('2026-01-20T10:00:00Z'),
      resolvedAt: null,
    },

    // 2. UNDER_MEDIATION - Payment dispute on freelancer contract
    {
      id: DISPUTE_IDS.paymentDispute,
      contractId: CONTRACT_IDS.freelancerCarlos,
      openedBy: USER_IDS.maria,
      respondentId: USER_IDS.techCorp,
      status: DisputeStatus.UNDER_MEDIATION,
      type: DisputeType.PAYMENT_DISPUTE,
      description:
        'Maria Aparecida da Silva (freelancer) alega que o Milestone 1 (Wireframes) foi entregue e aprovado informalmente pela TechCorp em 15/02/2026, mas a liberacao do pagamento de R$ 6.000,00 do escrow esta sendo retida sem justificativa. A TechCorp alega que os wireframes precisam de ajustes adicionais nao previstos no escopo original. Maria solicita liberacao imediata do pagamento conforme aprovacao informal registrada em mensagens.',
      disputeValue: '6000.00',
      evidence: [
        {
          id: uuidv4(),
          type: 'DOCUMENT',
          url: 'https://storage.tabeliao.com.br/evidence/disp-002/wireframes-entregues.pdf',
          description: 'Wireframes entregues conforme escopo contratual',
          uploadedBy: USER_IDS.maria,
          uploadedAt: '2026-02-16T10:00:00Z',
        },
        {
          id: uuidv4(),
          type: 'SCREENSHOT',
          url: 'https://storage.tabeliao.com.br/evidence/disp-002/aprovacao-informal.png',
          description: 'Print de mensagem do representante da TechCorp aprovando os wireframes',
          uploadedBy: USER_IDS.maria,
          uploadedAt: '2026-02-16T10:05:00Z',
        },
      ] as EvidenceItem[],
      arbitratorId: null,
      mediatorId: ARBITRATOR_IDS.draLucia,
      aiAnalysis:
        'Analise da IA: A aprovacao informal por mensagem pode constituir prova de aceite do milestone. Recomenda-se mediacao para definir se os ajustes solicitados configurariam mudanca de escopo (novo custo) ou correcoes dentro do escopo original.',
      resolution: null,
      resolutionAcceptedByPlaintiff: false,
      resolutionAcceptedByDefendant: false,
      deadline: fifteenDaysFromNow,
      filedAt: new Date('2026-02-16T09:00:00Z'),
      resolvedAt: null,
    },

    // 3. OPENED - Quality dispute on purchase/sale (vehicle condition)
    {
      id: DISPUTE_IDS.qualityDispute,
      contractId: CONTRACT_IDS.purchaseSale,
      openedBy: USER_IDS.fernanda,
      respondentId: USER_IDS.ana,
      status: DisputeStatus.OPENED,
      type: DisputeType.QUALITY_DISPUTE,
      description:
        'Fernanda Beatriz Costa (compradora) alega que o veiculo Honda Civic EXL 2024 adquirido de Ana Carolina Oliveira apresenta vicio oculto: problemas na transmissao automatica nao informados previamente, identificados em vistoria mecanica realizada 5 dias apos a compra. Laudo tecnico indica custo de reparo de R$ 8.500,00. O pagamento de R$ 135.000,00 esta retido em escrow. Fernanda solicita abatimento do valor do reparo ou devolucao do veiculo.',
      disputeValue: '8500.00',
      evidence: [
        {
          id: uuidv4(),
          type: 'DOCUMENT',
          url: 'https://storage.tabeliao.com.br/evidence/disp-003/laudo-mecanico.pdf',
          description: 'Laudo tecnico da oficina autorizada Honda atestando problema na transmissao',
          uploadedBy: USER_IDS.fernanda,
          uploadedAt: '2026-02-10T11:00:00Z',
        },
      ] as EvidenceItem[],
      arbitratorId: null,
      mediatorId: null,
      aiAnalysis: null,
      resolution: null,
      resolutionAcceptedByPlaintiff: false,
      resolutionAcceptedByDefendant: false,
      deadline: sixtyDaysFromNow,
      filedAt: new Date('2026-02-10T10:00:00Z'),
      resolvedAt: null,
    },

    // 4. OPENED - Delivery dispute on services contract
    {
      id: DISPUTE_IDS.deliveryDispute,
      contractId: CONTRACT_IDS.servicesTechCorp,
      openedBy: USER_IDS.techCorp,
      respondentId: USER_IDS.carlos,
      status: DisputeStatus.OPENED,
      type: DisputeType.DELIVERY_DISPUTE,
      description:
        'TechCorp Solucoes Digitais alega que o Milestone 2 (Modulo Contas a Receber + Fluxo de Caixa) do contrato de desenvolvimento ERP esta com 15 dias de atraso e sem previsao de entrega. Carlos Eduardo Ferreira nao respondeu as ultimas 3 comunicacoes (email e plataforma). TechCorp solicita prorrogacao do prazo com penalidade contratual ou designacao de desenvolvedor substituto.',
      disputeValue: '16000.00',
      evidence: [
        {
          id: uuidv4(),
          type: 'SCREENSHOT',
          url: 'https://storage.tabeliao.com.br/evidence/disp-004/emails-sem-resposta.png',
          description: 'Prints dos 3 emails enviados sem resposta',
          uploadedBy: USER_IDS.techCorp,
          uploadedAt: '2026-02-20T09:00:00Z',
        },
        {
          id: uuidv4(),
          type: 'DOCUMENT',
          url: 'https://storage.tabeliao.com.br/evidence/disp-004/cronograma-milestone2.pdf',
          description: 'Cronograma do Milestone 2 mostrando atraso',
          uploadedBy: USER_IDS.techCorp,
          uploadedAt: '2026-02-20T09:05:00Z',
        },
      ] as EvidenceItem[],
      arbitratorId: null,
      mediatorId: null,
      aiAnalysis: null,
      resolution: null,
      resolutionAcceptedByPlaintiff: false,
      resolutionAcceptedByDefendant: false,
      deadline: thirtyDaysFromNow,
      filedAt: new Date('2026-02-20T08:30:00Z'),
      resolvedAt: null,
    },

    // 5. RESOLVED/CLOSED - Past dispute that was resolved
    {
      id: DISPUTE_IDS.resolvedDispute,
      contractId: CONTRACT_IDS.rentalMaria,
      openedBy: USER_IDS.joao,
      respondentId: USER_IDS.maria,
      status: DisputeStatus.CLOSED,
      type: DisputeType.BREACH_OF_CONTRACT,
      description:
        'Joao Pedro dos Santos (locatario) alegou infiltracao no teto da sala nao reparada pela locadora (Maria) no prazo de 15 dias conforme contrato. Pedido de abatimento proporcional do aluguel durante o periodo afetado e reparo imediato.',
      disputeValue: '1750.00',
      evidence: [
        {
          id: uuidv4(),
          type: 'PHOTO',
          url: 'https://storage.tabeliao.com.br/evidence/disp-005/infiltracao-teto.jpg',
          description: 'Foto da infiltracao no teto da sala',
          uploadedBy: USER_IDS.joao,
          uploadedAt: '2025-12-10T08:00:00Z',
        },
        {
          id: uuidv4(),
          type: 'DOCUMENT',
          url: 'https://storage.tabeliao.com.br/evidence/disp-005/notificacao-extrajudicial.pdf',
          description: 'Notificacao extrajudicial enviada a locadora',
          uploadedBy: USER_IDS.joao,
          uploadedAt: '2025-12-15T10:00:00Z',
        },
        {
          id: uuidv4(),
          type: 'DOCUMENT',
          url: 'https://storage.tabeliao.com.br/evidence/disp-005/orcamento-reparo.pdf',
          description: 'Orcamento de reparo da infiltracao - R$ 2.800,00',
          uploadedBy: USER_IDS.joao,
          uploadedAt: '2025-12-16T14:00:00Z',
        },
      ] as EvidenceItem[],
      arbitratorId: ARBITRATOR_IDS.drRoberto,
      mediatorId: ARBITRATOR_IDS.drPaulo,
      aiAnalysis:
        'Analise da IA: A infiltracao configura descumprimento da obrigacao de manutencao prevista no art. 22, inciso I da Lei 8.245/91 (Lei do Inquilinato). O locador e obrigado a manter o imovel em condicoes de uso. Recomendacao: abatimento de 50% do aluguel do periodo afetado (15 dias = R$ 1.750) e reparo pela locadora em ate 10 dias uteis.',
      resolution:
        'DECISAO ARBITRAL: Considerando as provas apresentadas e o laudo tecnico, o arbitro Dr. Roberto de Almeida Neto decide: 1) A locadora Maria Aparecida da Silva devera providenciar o reparo da infiltracao em ate 10 dias uteis; 2) Abatimento de R$ 1.750,00 (50% do aluguel de dezembro/2025) a favor do locatario; 3) A locadora arcara com os custos do reparo, estimados em R$ 2.800,00; 4) Custas da arbitragem divididas igualmente entre as partes. Decisao proferida em 08/01/2026.',
      resolutionAcceptedByPlaintiff: true,
      resolutionAcceptedByDefendant: true,
      deadline: new Date('2026-01-15'),
      filedAt: new Date('2025-12-10T08:00:00Z'),
      resolvedAt: new Date('2026-01-08T16:00:00Z'),
    },
  ];
}

// --- Dispute Messages ---

function buildDisputeMessages(): Partial<DisputeMessage>[] {
  return [
    // === Renovation Dispute (UNDER_ARBITRATION) ===
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.renovationDispute,
      senderId: USER_IDS.joao,
      senderRole: SenderRole.PLAINTIFF,
      content:
        'Abro esta disputa formalmente. A reforma do banheiro e cozinha deveria ter sido concluida em 06/01/2026, mas ate hoje (20/01/2026) o servico continua incompleto. Os azulejos do banheiro estao desalinhados e ha um vazamento na cozinha que ja causou danos ao piso. Anexo fotos e orcamento de reparo.',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.renovationDispute,
      senderId: USER_IDS.carlos,
      senderRole: SenderRole.DEFENDANT,
      content:
        'Contesto parcialmente as alegacoes. O atraso ocorreu por conta de problemas na entrega dos materiais pelo fornecedor, conforme comunicado previamente. Quanto aos azulejos, seguimos o padrao solicitado. O vazamento e um problema pre-existente da tubulacao antiga do apartamento, nao relacionado a nossa obra. Apresento as notas fiscais dos materiais utilizados como prova de qualidade.',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.renovationDispute,
      senderId: USER_IDS.admin,
      senderRole: SenderRole.SYSTEM,
      content:
        'Disputa escalada para arbitragem. Arbitro designado: Dr. Paulo Ricardo Mendes (OAB/SP 123456). Prazo para resolucao: 30 dias.',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.renovationDispute,
      senderId: USER_IDS.arbitratorDrPaulo,
      senderRole: SenderRole.ARBITRATOR,
      content:
        'Recebi a designacao e analisei as provas apresentadas por ambas as partes. Solicito ao Sr. Carlos Eduardo que apresente, em ate 5 dias uteis: (1) Comunicacoes previas sobre atraso na entrega de materiais; (2) Fotos do estado da tubulacao antes do inicio da obra; (3) Especificacao tecnica dos materiais contratados vs. utilizados. Ao Sr. Joao Pedro, solicito laudo pericial independente sobre o vazamento.',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.renovationDispute,
      senderId: USER_IDS.arbitratorDrPaulo,
      senderRole: SenderRole.ARBITRATOR,
      content:
        '[NOTA RESERVADA] Analise preliminar: A posicao do reclamante parece mais fundamentada. As fotos dos azulejos mostram claro desalinhamento. O argumento sobre tubulacao pre-existente precisa de comprovacao. Prover oportunidade de conciliacao antes da decisao final.',
      attachments: [],
      isPrivate: true,
    },

    // === Payment Dispute (UNDER_MEDIATION) ===
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.paymentDispute,
      senderId: USER_IDS.maria,
      senderRole: SenderRole.PLAINTIFF,
      content:
        'Entreguei todos os wireframes conforme escopo definido no contrato. O representante da TechCorp aprovou informalmente por mensagem no dia 15/02. Agora estao retendo o pagamento alegando necessidade de ajustes que nao estavam no escopo. Anexo os wireframes entregues e o print da aprovacao.',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.paymentDispute,
      senderId: USER_IDS.techCorp,
      senderRole: SenderRole.DEFENDANT,
      content:
        'A aprovacao informal mencionada foi um feedback preliminar, nao um aceite formal do milestone. Os wireframes nao contemplam a tela de configuracoes e o fluxo de onboarding, que estao no escopo contratual. Solicitamos a conclusao antes da liberacao do pagamento.',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.paymentDispute,
      senderId: USER_IDS.arbitratorDraLucia,
      senderRole: SenderRole.MEDIATOR,
      content:
        'Boa tarde. Sou a Dra. Lucia Helena Barbosa, mediadora designada para este caso. Apos analise inicial, identifiquei os seguintes pontos: (1) O escopo contratual lista os entregaveis do M1 - precisamos verificar se "tela de configuracoes" e "fluxo de onboarding" constam; (2) A mensagem de aprovacao informal pode ter gerado expectativa legitima. Proponho uma sessao de mediacao para 25/02/2026 as 14h. Ambas as partes concordam?',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.paymentDispute,
      senderId: USER_IDS.maria,
      senderRole: SenderRole.PLAINTIFF,
      content: 'Concordo com a data proposta. Estarei disponivel.',
      attachments: [],
      isPrivate: false,
    },

    // === Quality Dispute (OPENED) ===
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.qualityDispute,
      senderId: USER_IDS.fernanda,
      senderRole: SenderRole.PLAINTIFF,
      content:
        'Adquiri o Honda Civic EXL 2024 da Sra. Ana Carolina Oliveira pelo valor de R$ 135.000,00 em 01/02/2026. Apos 5 dias de uso, identifiquei problemas graves na transmissao automatica. Levei a uma oficina autorizada Honda que constatou defeito no conversor de torque. O reparo esta orcado em R$ 8.500,00. A vendedora nao informou este problema, configurando vicio oculto conforme Art. 441 do Codigo Civil. O pagamento esta retido em escrow e solicito abatimento.',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.qualityDispute,
      senderId: USER_IDS.admin,
      senderRole: SenderRole.SYSTEM,
      content:
        'Disputa registrada. Notificacao enviada a Sra. Ana Carolina Oliveira. Prazo de resposta: 10 dias uteis. O escrow de R$ 135.000,00 permanece congelado ate resolucao.',
      attachments: [],
      isPrivate: false,
    },

    // === Delivery Dispute (OPENED) ===
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.deliveryDispute,
      senderId: USER_IDS.techCorp,
      senderRole: SenderRole.PLAINTIFF,
      content:
        'Registramos formalmente a disputa por atraso na entrega do Milestone 2 do contrato de desenvolvimento ERP (TAB-2026-000002). O prazo original era 15/04/2026, mas ja nao recebemos atualizacoes de progresso desde 01/02. Enviamos 3 emails e 2 mensagens na plataforma sem resposta do Sr. Carlos Eduardo Ferreira. Solicitamos posicionamento imediato ou designacao de substituto.',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.deliveryDispute,
      senderId: USER_IDS.admin,
      senderRole: SenderRole.SYSTEM,
      content:
        'Disputa registrada. Notificacao enviada ao Sr. Carlos Eduardo Ferreira por email e WhatsApp. Prazo para resposta: 5 dias uteis.',
      attachments: [],
      isPrivate: false,
    },

    // === Resolved Dispute (CLOSED) ===
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.resolvedDispute,
      senderId: USER_IDS.joao,
      senderRole: SenderRole.PLAINTIFF,
      content:
        'Informo infiltracao no teto da sala do apartamento locado. Notifiquei a Sra. Maria em 25/11/2025, mas ate 10/12 nenhuma providencia foi tomada. O contrato preve reparo em ate 15 dias. Solicito abatimento proporcional do aluguel e reparo imediato.',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.resolvedDispute,
      senderId: USER_IDS.maria,
      senderRole: SenderRole.DEFENDANT,
      content:
        'Reconheco o atraso no reparo e peco desculpas. Tive dificuldades em encontrar profissional disponivel no periodo. Ja agendei o reparo para a proxima semana. Discordo do abatimento de 50%, proponho 25% (R$ 875).',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.resolvedDispute,
      senderId: USER_IDS.arbitratorDrPaulo,
      senderRole: SenderRole.MEDIATOR,
      content:
        'Apos analise das posicoes de ambas as partes, proponho mediacao. A locadora reconhece a falha. O locatario tem direito ao abatimento conforme Lei do Inquilinato. Sugiro: (1) Abatimento de 40% do aluguel do periodo afetado (R$ 1.400); (2) Reparo em ate 10 dias uteis; (3) Locadora paga custos do reparo. Partes aceitam?',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.resolvedDispute,
      senderId: USER_IDS.joao,
      senderRole: SenderRole.PLAINTIFF,
      content: 'Nao aceito 40%. Mantenho pedido de 50% conforme recomendacao da analise de IA da plataforma.',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.resolvedDispute,
      senderId: USER_IDS.admin,
      senderRole: SenderRole.SYSTEM,
      content: 'Mediacao nao resultou em acordo. Disputa escalada para arbitragem. Arbitro designado: Dr. Roberto de Almeida Neto (OAB/MG 345678).',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.resolvedDispute,
      senderId: USER_IDS.arbitratorDrRoberto,
      senderRole: SenderRole.ARBITRATOR,
      content:
        'DECISAO ARBITRAL: Apos analise das provas, laudo pericial e manifestacoes das partes, decido: 1) Abatimento de 50% do aluguel de dezembro/2025 (R$ 1.750,00) a favor do locatario, considerando o impacto na habitabilidade; 2) Reparo pela locadora em 10 dias uteis; 3) Custas divididas igualmente. Fundamentacao: Art. 22, I, Lei 8.245/91 - obrigacao de manutencao pelo locador. A inacao por mais de 15 dias apos notificacao configura descumprimento contratual.',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.resolvedDispute,
      senderId: USER_IDS.joao,
      senderRole: SenderRole.PLAINTIFF,
      content: 'Aceito a decisao arbitral.',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.resolvedDispute,
      senderId: USER_IDS.maria,
      senderRole: SenderRole.DEFENDANT,
      content: 'Aceito a decisao arbitral. Providenciarei o reparo e o abatimento sera descontado do proximo aluguel.',
      attachments: [],
      isPrivate: false,
    },
    {
      id: uuidv4(),
      disputeId: DISPUTE_IDS.resolvedDispute,
      senderId: USER_IDS.admin,
      senderRole: SenderRole.SYSTEM,
      content: 'Ambas as partes aceitaram a decisao arbitral. Disputa encerrada em 08/01/2026. Abatimento de R$ 1.750,00 aplicado ao aluguel de janeiro/2026.',
      attachments: [],
      isPrivate: false,
    },
  ];
}

// --- Arbitrator Ratings ---

function buildArbitratorRatings(): Partial<ArbitratorRating>[] {
  return [
    // Ratings for the resolved dispute
    {
      id: uuidv4(),
      arbitratorId: ARBITRATOR_IDS.drRoberto,
      disputeId: DISPUTE_IDS.resolvedDispute,
      userId: USER_IDS.joao,
      rating: 5.0,
      feedback: 'Excelente arbitro. Decisao justa e bem fundamentada. Resolveu rapidamente.',
    },
    {
      id: uuidv4(),
      arbitratorId: ARBITRATOR_IDS.drRoberto,
      disputeId: DISPUTE_IDS.resolvedDispute,
      userId: USER_IDS.maria,
      rating: 4.0,
      feedback: 'Arbitro competente. Decisao razoavel, embora eu esperasse um abatimento menor.',
    },
    // Rating for mediator on the resolved dispute
    {
      id: uuidv4(),
      arbitratorId: ARBITRATOR_IDS.drPaulo,
      disputeId: DISPUTE_IDS.resolvedDispute,
      userId: USER_IDS.joao,
      rating: 4.5,
      feedback: 'Bom mediador, tentou encontrar uma solucao conciliatoria. Pena que nao deu certo na mediacao.',
    },
  ];
}

function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    username: process.env['DB_USERNAME'] ?? 'tabeliao',
    password: process.env['DB_PASSWORD'] ?? 'tabeliao',
    database: process.env['DB_DATABASE'] ?? 'tabeliao_disputes',
    entities: [Dispute, DisputeMessage, Arbitrator, ArbitratorRating],
    synchronize: true,
    logging: false,
  });
}

export async function seedDisputes(): Promise<void> {
  console.log('[dispute-service] Starting seed...');
  const dataSource = createDataSource();

  try {
    await dataSource.initialize();
    console.log('[dispute-service] Database connected.');

    const arbitratorRepo = dataSource.getRepository(Arbitrator);
    const disputeRepo = dataSource.getRepository(Dispute);
    const messageRepo = dataSource.getRepository(DisputeMessage);
    const ratingRepo = dataSource.getRepository(ArbitratorRating);

    // Clear existing data (in order due to FK constraints)
    console.log('[dispute-service] Clearing existing data...');
    await ratingRepo.delete({});
    await messageRepo.delete({});
    await disputeRepo.delete({});
    await arbitratorRepo.delete({});

    // Seed arbitrators
    const arbitrators = buildArbitrators();
    console.log(`[dispute-service] Inserting ${arbitrators.length} arbitrators...`);
    for (const arb of arbitrators) {
      await arbitratorRepo.save(arbitratorRepo.create(arb));
      console.log(`  - Arbitrator: OAB/${arb.oabState} ${arb.oabNumber} - ${arb.specialties?.[0]} [Rating: ${arb.rating}]`);
    }

    // Seed disputes
    const disputes = buildDisputes();
    console.log(`[dispute-service] Inserting ${disputes.length} disputes...`);
    for (const dispute of disputes) {
      await disputeRepo.save(disputeRepo.create(dispute));
      console.log(`  - Dispute: ${dispute.id} [${dispute.status}] - ${dispute.type} - R$ ${dispute.disputeValue}`);
    }

    // Seed messages
    const messages = buildDisputeMessages();
    console.log(`[dispute-service] Inserting ${messages.length} dispute messages...`);
    for (const msg of messages) {
      await messageRepo.save(messageRepo.create(msg));
    }
    console.log(`  - ${messages.length} messages inserted.`);

    // Seed ratings
    const ratings = buildArbitratorRatings();
    console.log(`[dispute-service] Inserting ${ratings.length} arbitrator ratings...`);
    for (const rating of ratings) {
      await ratingRepo.save(ratingRepo.create(rating));
    }
    console.log(`  - ${ratings.length} ratings inserted.`);

    // Summary
    const statusCounts: Record<string, number> = {};
    for (const d of disputes) {
      const status = d.status as string;
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }
    console.log('[dispute-service] Dispute status summary:');
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`  - ${status}: ${count}`);
    }

    console.log('[dispute-service] Seed completed successfully.');
  } catch (error) {
    console.error('[dispute-service] Seed failed:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// Allow running directly
if (require.main === module) {
  seedDisputes()
    .then(() => {
      console.log('[dispute-service] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[dispute-service] Fatal error:', err);
      process.exit(1);
    });
}
