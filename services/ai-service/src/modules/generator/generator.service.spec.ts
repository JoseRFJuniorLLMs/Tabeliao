import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { GeneratorService } from './generator.service';
import { RagService } from '../rag/rag.service';
import { ContractType } from '../../common/contract-type.enum';

// ─── Mock Anthropic SDK ───────────────────────────────────────────────────────
const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  const APIError = class APIError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = 'APIError';
    }
  };

  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: mockCreate,
      },
    })),
    APIError,
  };
});

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

// ─── Sample AI response ──────────────────────────────────────────────────────
const validContractJson = JSON.stringify({
  title: 'Contrato de Prestacao de Servicos',
  content: 'CONTRATO DE PRESTACAO DE SERVICOS...',
  clauses: [
    {
      number: 1,
      title: 'CLAUSULA PRIMEIRA - DO OBJETO',
      content: 'O presente contrato tem por objeto...',
      legalBasis: 'Art. 594 do Codigo Civil',
    },
    {
      number: 2,
      title: 'CLAUSULA SEGUNDA - DO PRECO',
      content: 'Pelo servico prestado, o CONTRATANTE pagara...',
      legalBasis: 'Art. 421 do Codigo Civil',
    },
  ],
  parties: ['CONTRATANTE: [NOME]', 'CONTRATADO: [NOME]'],
  suggestedValue: 'R$ 5.000,00',
  warnings: ['Este contrato deve ser registrado em cartorio.'],
  contractType: 'PRESTACAO_SERVICOS',
  applicableLegislation: ['Lei 10.406/2002 (Codigo Civil)'],
  generatedAt: '2026-01-01T00:00:00.000Z',
});

const buildApiResponse = (text: string) => ({
  content: [{ type: 'text', text }],
});

describe('GeneratorService', () => {
  let service: GeneratorService;
  let ragService: jest.Mocked<Partial<RagService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(async () => {
    jest.clearAllMocks();

    ragService = {
      getLegislationContext: jest.fn().mockReturnValue('Relevant legislation context for testing...'),
    };

    configService = {
      get: jest.fn((key: string, defaultVal?: string) => {
        const map: Record<string, string> = {
          ANTHROPIC_API_KEY: 'test-api-key',
          ANTHROPIC_MODEL: 'claude-sonnet-4-20250514',
        };
        return map[key] ?? defaultVal;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeneratorService,
        { provide: ConfigService, useValue: configService },
        { provide: RagService, useValue: ragService },
      ],
    }).compile();

    service = module.get<GeneratorService>(GeneratorService);
  });

  // ─── generateContract ──────────────────────────────────────────────────────
  describe('generateContract', () => {
    it('should generate a contract successfully and cache it', async () => {
      mockCreate.mockResolvedValue(buildApiResponse(validContractJson));

      const result = await service.generateContract(
        'Preciso de um contrato de prestacao de servicos',
        ContractType.PRESTACAO_SERVICOS,
      );

      expect(result.success).toBe(true);
      expect(result.contract).toBeDefined();
      expect(result.contract!.title).toBe('Contrato de Prestacao de Servicos');
      expect(result.contract!.clauses).toHaveLength(2);
      expect(result.contract!.parties).toHaveLength(2);
      expect(result.contract!.warnings).toHaveLength(1);
      expect(result.contract!.generatedAt).toBeDefined();

      // Verify Anthropic was called correctly
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          system: expect.any(String),
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user' }),
          ]),
        }),
      );
    });

    it('should include additional context in the user message when provided', async () => {
      mockCreate.mockResolvedValue(buildApiResponse(validContractJson));

      await service.generateContract(
        'Contrato de locacao',
        ContractType.LOCACAO_RESIDENCIAL,
        { endereco: 'Rua A, 123', valor: 2000 },
      );

      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages[0].content;

      expect(userMessage).toContain('endereco');
      expect(userMessage).toContain('Rua A, 123');
    });

    it('should fetch legislation context from RAG service', async () => {
      mockCreate.mockResolvedValue(buildApiResponse(validContractJson));

      await service.generateContract(
        'Contrato de locacao residencial',
        ContractType.LOCACAO_RESIDENCIAL,
      );

      expect(ragService.getLegislationContext).toHaveBeenCalledWith(
        'Contrato de locacao residencial',
        ContractType.LOCACAO_RESIDENCIAL,
      );
    });

    it('should throw InternalServerErrorException on Anthropic API error', async () => {
      const Anthropic = require('@anthropic-ai/sdk');
      mockCreate.mockRejectedValue(
        new Anthropic.APIError(429, 'Rate limited'),
      );

      await expect(
        service.generateContract('test', ContractType.OUTRO),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException on generic error', async () => {
      mockCreate.mockRejectedValue(new Error('Network failure'));

      await expect(
        service.generateContract('test', ContractType.OUTRO),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle JSON response wrapped in markdown code blocks', async () => {
      const wrappedJson = '```json\n' + validContractJson + '\n```';
      mockCreate.mockResolvedValue(buildApiResponse(wrappedJson));

      const result = await service.generateContract(
        'Contrato NDA',
        ContractType.NDA,
      );

      expect(result.success).toBe(true);
      expect(result.contract!.title).toBe('Contrato de Prestacao de Servicos');
    });

    it('should handle JSON embedded in surrounding text', async () => {
      const embeddedJson = 'Here is the contract:\n' + validContractJson + '\n\nDone.';
      mockCreate.mockResolvedValue(buildApiResponse(embeddedJson));

      const result = await service.generateContract(
        'Contrato test',
        ContractType.OUTRO,
      );

      expect(result.success).toBe(true);
    });

    it('should provide default values when AI response has missing fields', async () => {
      const partialJson = JSON.stringify({
        title: 'Partial Contract',
        content: 'Some content',
      });
      mockCreate.mockResolvedValue(buildApiResponse(partialJson));

      const result = await service.generateContract(
        'test',
        ContractType.OUTRO,
      );

      expect(result.success).toBe(true);
      expect(result.contract!.clauses).toEqual([]);
      expect(result.contract!.parties).toEqual([]);
      expect(result.contract!.warnings).toEqual([]);
    });
  });

  // ─── askClarifyingQuestions ─────────────────────────────────────────────────
  describe('askClarifyingQuestions', () => {
    it('should return an array of clarifying questions', async () => {
      const questionsJson = JSON.stringify({
        questions: [
          'Qual o endereco completo do imovel?',
          'Qual o valor mensal do aluguel?',
          'Qual o prazo do contrato?',
        ],
      });
      mockCreate.mockResolvedValue(buildApiResponse(questionsJson));

      const questions = await service.askClarifyingQuestions(
        'Quero alugar meu apartamento',
        ContractType.LOCACAO_RESIDENCIAL,
      );

      expect(questions).toHaveLength(3);
      expect(questions[0]).toContain('endereco');
    });

    it('should return empty array when response has no questions', async () => {
      mockCreate.mockResolvedValue(buildApiResponse(JSON.stringify({})));

      const questions = await service.askClarifyingQuestions(
        'test',
        ContractType.OUTRO,
      );

      expect(questions).toEqual([]);
    });

    it('should throw InternalServerErrorException on API failure', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      await expect(
        service.askClarifyingQuestions('test', ContractType.OUTRO),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ─── refineContract ────────────────────────────────────────────────────────
  describe('refineContract', () => {
    it('should refine a previously generated contract from cache', async () => {
      // First, generate and cache a contract
      mockCreate.mockResolvedValue(buildApiResponse(validContractJson));
      await service.generateContract('test', ContractType.PRESTACAO_SERVICOS);

      // Now refine it
      const refinedJson = JSON.stringify({
        title: 'Contrato Refinado',
        content: 'Conteudo refinado...',
        clauses: [],
        parties: ['Parte A', 'Parte B'],
        warnings: ['Aviso atualizado'],
        applicableLegislation: ['Lei 10.406/2002'],
        changesApplied: ['Titulo atualizado', 'Conteudo simplificado'],
      });
      mockCreate.mockResolvedValue(buildApiResponse(refinedJson));

      const result = await service.refineContract(
        'mock-uuid',
        'Simplifique o contrato e mude o titulo',
      );

      expect(result.success).toBe(true);
      expect(result.contract!.title).toBe('Contrato Refinado');
      expect(result.changesApplied).toContain('Titulo atualizado');
    });

    it('should return error result when contract ID is not in cache', async () => {
      const result = await service.refineContract(
        'non-existent-id',
        'Change something',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('nao encontrado no cache');
    });

    it('should update cache with refined contract', async () => {
      // Generate
      mockCreate.mockResolvedValue(buildApiResponse(validContractJson));
      await service.generateContract('test', ContractType.PRESTACAO_SERVICOS);

      // Refine
      const refinedJson = JSON.stringify({
        title: 'V2 Contract',
        content: 'Updated content',
        changesApplied: ['Version updated'],
      });
      mockCreate.mockResolvedValue(buildApiResponse(refinedJson));
      await service.refineContract('mock-uuid', 'Update version');

      // Refine again -- should use the updated cache
      const refinedJson2 = JSON.stringify({
        title: 'V3 Contract',
        content: 'Third version',
        changesApplied: ['Another update'],
      });
      mockCreate.mockResolvedValue(buildApiResponse(refinedJson2));

      const result = await service.refineContract('mock-uuid', 'Update again');

      expect(result.success).toBe(true);
      // The user message should contain the V2 content (from updated cache)
      const callArgs = mockCreate.mock.calls[mockCreate.mock.calls.length - 1][0];
      expect(callArgs.messages[0].content).toContain('Updated content');
    });

    it('should throw InternalServerErrorException on API failure during refinement', async () => {
      // Generate first
      mockCreate.mockResolvedValue(buildApiResponse(validContractJson));
      await service.generateContract('test', ContractType.PRESTACAO_SERVICOS);

      // Fail refinement
      mockCreate.mockRejectedValue(new Error('API error'));

      await expect(
        service.refineContract('mock-uuid', 'fail'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should use default changesApplied when not provided by AI', async () => {
      mockCreate.mockResolvedValue(buildApiResponse(validContractJson));
      await service.generateContract('test', ContractType.PRESTACAO_SERVICOS);

      const refinedJson = JSON.stringify({
        title: 'Refined',
        content: 'Content',
        // no changesApplied field
      });
      mockCreate.mockResolvedValue(buildApiResponse(refinedJson));

      const result = await service.refineContract('mock-uuid', 'refine');

      expect(result.changesApplied).toEqual(['Contrato refinado conforme solicitado']);
    });
  });

  // ─── extractJson (indirectly) ──────────────────────────────────────────────
  describe('JSON extraction edge cases', () => {
    it('should throw InternalServerErrorException for completely invalid response', async () => {
      mockCreate.mockResolvedValue(buildApiResponse('This is not JSON at all'));

      await expect(
        service.generateContract('test', ContractType.OUTRO),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should extract JSON from code block with json tag', async () => {
      const json = JSON.stringify({ title: 'Test', content: 'Test content' });
      mockCreate.mockResolvedValue(
        buildApiResponse('```json\n' + json + '\n```'),
      );

      const result = await service.generateContract('test', ContractType.OUTRO);

      expect(result.success).toBe(true);
    });

    it('should extract JSON from code block without json tag', async () => {
      const json = JSON.stringify({ title: 'Test', content: 'Test content' });
      mockCreate.mockResolvedValue(
        buildApiResponse('```\n' + json + '\n```'),
      );

      const result = await service.generateContract('test', ContractType.OUTRO);

      expect(result.success).toBe(true);
    });
  });
});
