# Tabeliao - Smart Legal Tech | Plano de Criacao

## Visao Geral

Cartorio digital inteligente que une **Blockchain + IA + Open Finance** para criar contratos que se escrevem, se fiscalizam e se pagam sozinhos.

---

## FASE 1 - Fundacao e Infraestrutura

### 1.1 Definicao de Stack

- **Backend**: Node.js (NestJS) ou Python (FastAPI)
- **Frontend**: React/Next.js com UI responsiva
- **Banco de Dados**: PostgreSQL + Redis (cache/filas)
- **Blockchain**: Polygon (baixo custo de gas) com fallback para Ethereum
- **IA**: API Claude/GPT para geracao e revisao de contratos
- **Mensageria**: RabbitMQ ou Bull (filas de jobs assincronos)
- **Storage**: IPFS para documentos imutaveis + S3 para arquivos temporarios

### 1.2 Arquitetura Base

- Definir arquitetura de microservicos:
  - `auth-service` — autenticacao e identidade
  - `contract-service` — criacao, revisao e ciclo de vida de contratos
  - `blockchain-service` — deploy e interacao com smart contracts
  - `payment-service` — escrow, cobrancas e integracoes financeiras
  - `notification-service` — WhatsApp, email, push
  - `dispute-service` — arbitragem e mediacao (ODR)
  - `ai-service` — geracao de texto, revisao juridica, analise de risco
- API Gateway (Kong ou AWS API Gateway)
- Docker + Docker Compose para dev local
- CI/CD com GitHub Actions

### 1.3 Ambiente e DevOps

- [ ] Criar repositorio monorepo ou multi-repo
- [ ] Configurar Docker para todos os servicos
- [ ] Configurar CI/CD (lint, testes, deploy)
- [ ] Configurar ambientes: dev, staging, production
- [ ] Configurar logging centralizado (ELK ou Datadog)
- [ ] Configurar monitoramento e alertas

---

## FASE 2 - Autenticacao e Identidade

### 2.1 Cadastro e Login

- [ ] Cadastro com email/senha + verificacao por email
- [ ] Login com 2FA (TOTP ou SMS)
- [ ] OAuth2 com Google/Apple (opcional)
- [ ] JWT com refresh tokens
- [ ] Rate limiting e protecao contra brute force

### 2.2 Integracao Gov.br

- [ ] Integrar com API do Gov.br (niveis Ouro/Prata)
- [ ] Validar identidade oficial via certificado digital ICP-Brasil
- [ ] Puxar dados do CPF/CNPJ oficiais
- [ ] Armazenar nivel de verificacao do usuario

### 2.3 KYC e Due Diligence Automatica

- [ ] Consulta automatica de CPF/CNPJ em bases publicas
- [ ] Integracao com Serasa/Boa Vista para score de credito
- [ ] Consulta de processos judiciais (API dos tribunais / Jusbrasil)
- [ ] Consulta de PEP (Pessoas Politicamente Expostas)
- [ ] Gerar "Score de Risco" do signatario antes da assinatura
- [ ] Tela de alerta: "A outra parte possui X processos por estelionato"

---

## FASE 3 - Motor de IA (Cerebro Juridico)

### 3.1 Prompt-to-Contract

- [ ] Endpoint de chat onde o usuario descreve o acordo em linguagem natural
- [ ] IA converte a descricao em contrato formal com clausulas juridicas
- [ ] Base de conhecimento com templates por categoria:
  - Aluguel de imovel
  - Prestacao de servico
  - Compra e venda
  - Emprestimo pessoal
  - Contrato de trabalho freelancer
  - Acordo de confidencialidade (NDA)
  - Contrato de parceria/sociedade
- [ ] Fluxo de perguntas guiadas (wizard) para preencher lacunas
- [ ] Geracao do contrato em PDF formatado com identidade visual

### 3.2 Revisor Anti-Abuso (Legal Checker)

- [ ] Upload de PDF/DOCX do usuario
- [ ] OCR para documentos escaneados (Tesseract)
- [ ] IA escaneia o texto e identifica clausulas abusivas
- [ ] Validacao contra legislacao brasileira:
  - Codigo Civil
  - Codigo de Defesa do Consumidor (CDC)
  - CLT (para contratos de trabalho)
  - Lei do Inquilinato
  - Marco Civil da Internet
- [ ] Relatorio de riscos com sugestoes de correcao
- [ ] Classificacao de gravidade: Informativo / Atencao / Critico

### 3.3 Treinamento e Base de Conhecimento

- [ ] Curar dataset de legislacao brasileira atualizada
- [ ] Curar jurisprudencia relevante (STF, STJ, TJs)
- [ ] RAG (Retrieval Augmented Generation) com embeddings da legislacao
- [ ] Atualizar base mensalmente com novas leis e sumulas

---

## FASE 4 - Blockchain e Smart Contracts

### 4.1 Infraestrutura Blockchain

- [ ] Configurar rede Polygon (Mumbai testnet -> Mainnet)
- [ ] Wallet do sistema (multisig para seguranca)
- [ ] Gas station para subsidiar gas dos usuarios (meta-transactions)
- [ ] Registro imutavel de hash dos contratos on-chain

### 4.2 Smart Contracts (Solidity)

- [ ] Contrato `EscrowFactory` — cria escrows individuais por acordo
- [ ] Contrato `Escrow` — deposito, liberacao, reembolso, disputa
  - Deposito pelo contratante
  - Liberacao por aprovacao mutua
  - Liberacao automatica por timeout (se nao houver disputa)
  - Reembolso em caso de cancelamento
  - Travamento em caso de disputa (aguarda arbitragem)
- [ ] Contrato `ContractRegistry` — registra hash + timestamp de todos os documentos
- [ ] Contrato `ArbitrationManager` — gerencia disputas e sentencas on-chain
- [ ] Auditar todos os smart contracts (OpenZeppelin como base)
- [ ] Testes extensivos com Hardhat/Foundry

### 4.3 Oraculos (Dados do Mundo Real)

- [ ] Integrar Chainlink ou API3 para oraculos
- [ ] Conectar APIs externas para triggers automaticos:
  - Inmet (clima) — para contratos agricolas/seguro
  - Banco Central (indices IGPM, IPCA, Selic) — para reajustes
  - APIs de rastreamento (Correios/transportadoras) — para contratos de entrega
- [ ] Logica de execucao automatica baseada em dados do oraculo

### 4.4 Integracao Drex (Real Digital)

- [ ] Acompanhar piloto do Drex do Banco Central
- [ ] Preparar integracao com tokenizacao de Real (ERC-20 compativel)
- [ ] Escrow em Drex quando disponivel
- [ ] Fallback para PIX/TED enquanto Drex nao estiver em producao

---

## FASE 5 - Sistema de Pagamentos e Escrow

### 5.1 Conta Escrow em Reais

- [ ] Integrar com PSP (Provedor de Servicos de Pagamento) regulado pelo BC
- [ ] Conta escrow real (nao apenas simulada) com parceiro bancario
- [ ] Deposito via PIX, boleto e cartao de credito
- [ ] Liberacao automatica por aprovacao mutua
- [ ] Liberacao parcial (milestones) para projetos em etapas
- [ ] Reembolso automatico em caso de cancelamento

### 5.2 Cobranca Automatica

- [ ] Geracao de boletos e PIX Copia-e-Cola para parcelas
- [ ] Cobranca recorrente (contratos mensais: aluguel, SaaS)
- [ ] Notificacao automatica de parcela proxima do vencimento
- [ ] Calculo automatico de multa e juros por atraso (dentro do limite legal)
- [ ] Split de pagamento (dividir valor entre multiplas partes)

### 5.3 Open Finance

- [ ] Integrar com APIs do Open Finance Brasil
- [ ] Verificar saldo/capacidade de pagamento do signatario (com consentimento)
- [ ] Oferecer credito ou parcelamento via parceiros financeiros

---

## FASE 6 - Gestor de Ciclo de Vida do Contrato

### 6.1 Dashboard do Contrato

- [ ] Tela com status do contrato: Rascunho / Aguardando Assinatura / Ativo / Em Disputa / Encerrado
- [ ] Timeline visual de eventos (assinatura, pagamentos, notificacoes)
- [ ] Indicadores: proxima parcela, dias para vencimento, valor acumulado

### 6.2 Automacoes de Ciclo de Vida

- [ ] Cron jobs para verificar vencimentos diariamente
- [ ] Notificacao 30/15/7/1 dia antes do vencimento do contrato
- [ ] Calculo automatico de reajuste (IGPM, IPCA, custom)
- [ ] Proposta automatica de renovacao com novo valor
- [ ] Renovacao com 1 clique (ambas as partes aprovam)

### 6.3 Notificacoes Multicanal

- [ ] Integracao WhatsApp Business API (mensagens automaticas)
- [ ] Email transacional (SendGrid/SES)
- [ ] Push notification (mobile)
- [ ] SMS para notificacoes criticas

### 6.4 Acoes Automaticas por Inadimplencia

- [ ] Notificacao extrajudicial automatica (com validade juridica)
- [ ] Bloqueio de acessos/servicos definidos no contrato
- [ ] Registro de inadimplencia (negativacao, se aplicavel)
- [ ] Escalonamento automatico: lembrete -> notificacao -> arbitragem

---

## FASE 7 - Tribunal Privado (ODR)

### 7.1 Camera Arbitral Digital

- [ ] Botao "Abrir Disputa" dentro do contrato
- [ ] Formulario de abertura de disputa com upload de provas
- [ ] Painel do mediador/arbitro com todas as evidencias
- [ ] Historico completo do contrato como prova (ja esta no blockchain)
- [ ] Chat seguro entre as partes e o arbitro
- [ ] Prazo maximo de 15 dias para sentenca

### 7.2 Arbitragem por IA (Casos de Baixo Valor)

- [ ] Definir teto de valor para arbitragem por IA (ex: ate R$ 5.000)
- [ ] IA analisa provas, contrato e legislacao
- [ ] IA emite parecer preliminar
- [ ] Parte pode aceitar ou escalonar para arbitro humano
- [ ] Registro da sentenca on-chain

### 7.3 Rede de Arbitros

- [ ] Cadastro de arbitros credenciados (advogados com OAB ativa)
- [ ] Sistema de distribuicao automatica de casos
- [ ] Rating e avaliacao dos arbitros
- [ ] Pagamento automatico da taxa de arbitragem

### 7.4 Conformidade Legal

- [ ] Clausula compromissoria automatica em todo contrato (Lei 9.307/96)
- [ ] Garantir que sentenca arbitral tenha forca de titulo executivo
- [ ] Template de clausula revisado por advogado especialista
- [ ] Termo de adesao a arbitragem claro e destacado

---

## FASE 8 - App Mobile

### 8.1 Aplicativo

- [ ] React Native ou Flutter para iOS e Android
- [ ] Assinatura de contrato pelo celular (com biometria)
- [ ] Notificacoes push em tempo real
- [ ] Camera para foto de documentos (KYC)
- [ ] QR Code para assinar presencialmente

---

## FASE 9 - Monetizacao

### 9.1 Planos e Precificacao

- [ ] **Plano Gratis**: Ate 3 contratos/mes, assinatura simples (sem escrow)
- [ ] **Plano Pro (R$ 49/mes)**: Contratos ilimitados, revisao por IA, notificacoes
- [ ] **Plano Business (R$ 199-999/mes)**: API, white-label, escrow, arbitragem, integracao com ERP
- [ ] **Taxa de Escrow**: 1% a 2% do valor custodiado
- [ ] **Taxa de Arbitragem**: R$ 150 a R$ 2.000 conforme valor da causa

### 9.2 Implementacao de Billing

- [ ] Integracao com Stripe ou Pagar.me para assinaturas
- [ ] Dashboard de faturamento para o usuario
- [ ] Emissao automatica de NF-e
- [ ] Trial de 14 dias para planos pagos

---

## FASE 10 - Seguranca e Compliance

### 10.1 Seguranca

- [ ] Criptografia end-to-end para documentos sensiveis
- [ ] Criptografia em repouso (AES-256) para banco de dados
- [ ] WAF (Web Application Firewall)
- [ ] Pentest antes do lancamento
- [ ] Bug bounty program apos lancamento
- [ ] Backup automatico com retencao de 7 anos (exigencia legal)

### 10.2 LGPD e Compliance

- [ ] Politica de privacidade e termos de uso
- [ ] Consentimento explicito para coleta de dados
- [ ] Direito de exclusao de dados (com ressalva para documentos com valor legal)
- [ ] DPO (Data Protection Officer) nomeado
- [ ] Registro de atividades de tratamento de dados
- [ ] Anonimizacao de dados para analytics

### 10.3 Regulatorio

- [ ] Consulta juridica sobre atuacao como camera arbitral
- [ ] Registro no Ministerio da Justica (se aplicavel)
- [ ] Compliance com regulacao do Banco Central (se custodia de valores)
- [ ] Parecer juridico sobre validade dos contratos digitais (MP 2.200-2/2001)

---

## FASE 11 - Go-to-Market

### 11.1 MVP (Produto Minimo Viavel)

Lancar primeiro com:
1. Prompt-to-Contract (geracao por IA)
2. Assinatura digital com verificacao basica
3. Registro de hash na blockchain
4. Notificacoes de vencimento
5. Dashboard basico

### 11.2 Publico-Alvo Inicial

- Freelancers e prestadores de servico
- Pequenas imobiliarias
- Agencias de marketing
- Clinicas e consultorios

### 11.3 Canais de Aquisicao

- [ ] Landing page com SEO otimizado
- [ ] Marketing de conteudo (blog sobre direito digital)
- [ ] Parcerias com contadores e advogados
- [ ] Programa de indicacao (referral)
- [ ] Anuncios segmentados (Google Ads, Instagram)

---

## Ordem de Prioridade para Desenvolvimento

| Prioridade | Fase | Justificativa |
|------------|------|---------------|
| 1 | Fase 1 | Fundacao tecnica |
| 2 | Fase 2 | Sem identidade nao ha contrato |
| 3 | Fase 3 | Diferencial principal (IA) |
| 4 | Fase 6 | Ciclo de vida = retencao |
| 5 | Fase 5 | Escrow = monetizacao forte |
| 6 | Fase 4 | Blockchain = confianca |
| 7 | Fase 9 | Monetizar o quanto antes |
| 8 | Fase 7 | ODR = diferencial competitivo |
| 9 | Fase 8 | Mobile amplia alcance |
| 10 | Fase 10 | Seguranca continua, mas formalizar |
| 11 | Fase 11 | Lancar e iterar |
