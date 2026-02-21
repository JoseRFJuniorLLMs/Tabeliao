import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ethers, Contract, Wallet, JsonRpcProvider, TransactionReceipt } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { EscrowEntity, EscrowStatus } from './entities/escrow.entity';
import { BlockchainConfig } from '../../config/blockchain.config';
import {
  EscrowResult,
  EscrowStatusResult,
  ReleaseResult,
  RefundResult,
  ReleaseConditions,
} from './interfaces/escrow.interfaces';

const ESCROW_FACTORY_ABI = [
  'function createEscrow(bytes32 contractId, address depositor, address beneficiary) external returns (address)',
  'function getEscrow(bytes32 contractId) external view returns (address)',
  'event EscrowCreated(bytes32 indexed contractId, address escrowAddress, address depositor, address beneficiary)',
];

const ESCROW_ABI = [
  'function deposit() external payable',
  'function release() external',
  'function refund() external',
  'function freeze() external',
  'function releasePartial(uint256 _amount) external',
  'function state() external view returns (uint8)',
  'function depositor() external view returns (address)',
  'function beneficiary() external view returns (address)',
  'function amount() external view returns (uint256)',
  'event Deposited(address indexed depositor, uint256 amount)',
  'event Released(address indexed beneficiary, uint256 amount)',
  'event Refunded(address indexed depositor, uint256 amount)',
  'event Frozen(address indexed arbiter)',
  'event PartialRelease(address indexed beneficiary, uint256 amount)',
];

@Injectable()
export class EscrowService implements OnModuleInit {
  private readonly logger = new Logger(EscrowService.name);
  private provider!: JsonRpcProvider;
  private wallet!: Wallet;
  private escrowFactory!: Contract;
  private blockchainConfig!: BlockchainConfig;

  constructor(
    @InjectRepository(EscrowEntity)
    private readonly escrowRepository: Repository<EscrowEntity>,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.blockchainConfig = this.configService.get<BlockchainConfig>('blockchain')!;
    const { network, deployerPrivateKey, contracts } = this.blockchainConfig;

    this.provider = new JsonRpcProvider(network.rpcUrl, {
      name: network.networkName,
      chainId: network.chainId,
    });

    if (!deployerPrivateKey) {
      this.logger.warn('DEPLOYER_PRIVATE_KEY not set - read-only mode');
      this.wallet = Wallet.createRandom().connect(this.provider);
    } else {
      this.wallet = new Wallet(deployerPrivateKey, this.provider);
    }

    if (contracts.escrowFactoryAddress) {
      this.escrowFactory = new Contract(
        contracts.escrowFactoryAddress,
        ESCROW_FACTORY_ABI,
        this.wallet,
      );
      this.logger.log(`EscrowFactory connected at ${contracts.escrowFactoryAddress}`);
    } else {
      this.logger.warn('ESCROW_FACTORY_ADDRESS not set - escrow creation will fail');
    }

    this.logger.log(`Escrow service initialized on ${network.networkName}`);
  }

  async createEscrow(
    contractId: string,
    amount: number,
    parties: { depositor: string; beneficiary: string },
    releaseConditions: ReleaseConditions | Record<string, unknown>,
  ): Promise<EscrowResult> {
    this.ensureFactoryReady();

    const contractIdBytes32 = ethers.id(contractId);
    const { gasSettings, network } = this.blockchainConfig;

    this.logger.log(`Creating escrow for contract ${contractId}: ${amount} MATIC`);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= gasSettings.maxRetries; attempt++) {
      try {
        const feeData = await this.provider.getFeeData();
        const maxFeePerGas = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * BigInt(Math.floor(gasSettings.gasPriceMultiplier * 100))) / 100n
          : network.maxFeePerGas;

        const tx = await this.escrowFactory.createEscrow(
          contractIdBytes32,
          parties.depositor,
          parties.beneficiary,
          {
            gasLimit: gasSettings.defaultGasLimit,
            maxFeePerGas,
            maxPriorityFeePerGas: network.maxPriorityFeePerGas,
          },
        );

        this.logger.log(`EscrowFactory.createEscrow tx sent: ${tx.hash} (attempt ${attempt})`);

        const receipt: TransactionReceipt = await tx.wait(network.confirmationBlocks);

        if (!receipt || receipt.status === 0) {
          throw new Error(`Transaction reverted: ${tx.hash}`);
        }

        const escrowCreatedEvent = receipt.logs
          .map((log) => {
            try {
              return this.escrowFactory.interface.parseLog({
                topics: log.topics as string[],
                data: log.data,
              });
            } catch {
              return null;
            }
          })
          .find((parsed) => parsed?.name === 'EscrowCreated');

        const escrowAddress = escrowCreatedEvent
          ? escrowCreatedEvent.args[1]
          : await this.escrowFactory.getEscrow(contractIdBytes32);

        const milestones = this.buildMilestones(releaseConditions);

        const escrowEntity = this.escrowRepository.create({
          id: uuidv4(),
          contractId,
          blockchainAddress: escrowAddress,
          amount,
          currency: 'MATIC',
          depositorAddress: parties.depositor,
          beneficiaryAddress: parties.beneficiary,
          status: EscrowStatus.PENDING,
          milestones,
        });

        await this.escrowRepository.save(escrowEntity);

        const result: EscrowResult = {
          escrowId: escrowEntity.id,
          contractId,
          blockchainAddress: escrowAddress,
          depositorAddress: parties.depositor,
          beneficiaryAddress: parties.beneficiary,
          amount,
          currency: 'MATIC',
          status: EscrowStatus.PENDING,
          transactionHash: receipt.hash,
          explorerUrl: `${network.explorerUrl}/tx/${receipt.hash}`,
        };

        this.logger.log(
          `Escrow created: id=${escrowEntity.id}, address=${escrowAddress}, tx=${receipt.hash}`,
        );

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Escrow creation attempt ${attempt}/${gasSettings.maxRetries} failed: ${lastError.message}`,
        );

        if (attempt < gasSettings.maxRetries) {
          await this.sleep(gasSettings.retryDelayMs * attempt);
        }
      }
    }

    throw new Error(
      `Failed to create escrow after ${gasSettings.maxRetries} attempts: ${lastError?.message}`,
    );
  }

  async deposit(escrowId: string, amount: number, txHash: string): Promise<void> {
    const escrow = await this.findEscrowOrFail(escrowId);

    if (escrow.status !== EscrowStatus.PENDING) {
      throw new Error(`Cannot deposit to escrow in status ${escrow.status}`);
    }

    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (!receipt) {
      throw new Error(`Transaction ${txHash} not found on-chain`);
    }

    if (receipt.status === 0) {
      throw new Error(`Transaction ${txHash} was reverted`);
    }

    escrow.depositTxHash = txHash;
    escrow.amount = amount;
    escrow.status = EscrowStatus.FUNDED;

    await this.escrowRepository.save(escrow);
    this.logger.log(`Escrow ${escrowId} funded: ${amount} MATIC, tx=${txHash}`);
  }

  async release(escrowId: string, approvedBy: string): Promise<ReleaseResult> {
    const escrow = await this.findEscrowOrFail(escrowId);

    if (escrow.status !== EscrowStatus.FUNDED) {
      throw new Error(`Cannot release escrow in status ${escrow.status}. Must be FUNDED.`);
    }

    if (!escrow.blockchainAddress) {
      throw new Error('Escrow has no blockchain address');
    }

    const { gasSettings, network } = this.blockchainConfig;

    this.logger.log(`Releasing escrow ${escrowId}, approved by ${approvedBy}`);

    const escrowContract = new Contract(escrow.blockchainAddress, ESCROW_ABI, this.wallet);

    const feeData = await this.provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas
      ? (feeData.maxFeePerGas * BigInt(Math.floor(gasSettings.gasPriceMultiplier * 100))) / 100n
      : network.maxFeePerGas;

    const tx = await escrowContract.release({
      gasLimit: gasSettings.defaultGasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas: network.maxPriorityFeePerGas,
    });

    const receipt: TransactionReceipt = await tx.wait(network.confirmationBlocks);

    if (!receipt || receipt.status === 0) {
      throw new Error(`Release transaction reverted: ${tx.hash}`);
    }

    escrow.releaseTxHash = receipt.hash;
    escrow.status = EscrowStatus.RELEASED;
    await this.escrowRepository.save(escrow);

    const result: ReleaseResult = {
      escrowId,
      transactionHash: receipt.hash,
      amount: escrow.amount,
      releasedTo: escrow.beneficiaryAddress,
      explorerUrl: `${network.explorerUrl}/tx/${receipt.hash}`,
    };

    this.logger.log(
      `Escrow ${escrowId} released to ${escrow.beneficiaryAddress}, tx=${receipt.hash}`,
    );

    return result;
  }

  async refund(escrowId: string, reason: string): Promise<RefundResult> {
    const escrow = await this.findEscrowOrFail(escrowId);

    if (escrow.status !== EscrowStatus.FUNDED && escrow.status !== EscrowStatus.FROZEN) {
      throw new Error(
        `Cannot refund escrow in status ${escrow.status}. Must be FUNDED or FROZEN.`,
      );
    }

    if (!escrow.blockchainAddress) {
      throw new Error('Escrow has no blockchain address');
    }

    const { gasSettings, network } = this.blockchainConfig;

    this.logger.log(`Refunding escrow ${escrowId}, reason: ${reason}`);

    const escrowContract = new Contract(escrow.blockchainAddress, ESCROW_ABI, this.wallet);

    const feeData = await this.provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas
      ? (feeData.maxFeePerGas * BigInt(Math.floor(gasSettings.gasPriceMultiplier * 100))) / 100n
      : network.maxFeePerGas;

    const tx = await escrowContract.refund({
      gasLimit: gasSettings.defaultGasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas: network.maxPriorityFeePerGas,
    });

    const receipt: TransactionReceipt = await tx.wait(network.confirmationBlocks);

    if (!receipt || receipt.status === 0) {
      throw new Error(`Refund transaction reverted: ${tx.hash}`);
    }

    escrow.refundTxHash = receipt.hash;
    escrow.status = EscrowStatus.REFUNDED;
    escrow.freezeReason = reason;
    await this.escrowRepository.save(escrow);

    const result: RefundResult = {
      escrowId,
      transactionHash: receipt.hash,
      amount: escrow.amount,
      refundedTo: escrow.depositorAddress,
      reason,
      explorerUrl: `${network.explorerUrl}/tx/${receipt.hash}`,
    };

    this.logger.log(
      `Escrow ${escrowId} refunded to ${escrow.depositorAddress}, tx=${receipt.hash}`,
    );

    return result;
  }

  async freeze(escrowId: string, disputeId: string): Promise<void> {
    const escrow = await this.findEscrowOrFail(escrowId);

    if (escrow.status !== EscrowStatus.FUNDED) {
      throw new Error(`Cannot freeze escrow in status ${escrow.status}. Must be FUNDED.`);
    }

    if (!escrow.blockchainAddress) {
      throw new Error('Escrow has no blockchain address');
    }

    const { gasSettings, network } = this.blockchainConfig;

    this.logger.log(`Freezing escrow ${escrowId} for dispute ${disputeId}`);

    const escrowContract = new Contract(escrow.blockchainAddress, ESCROW_ABI, this.wallet);

    const feeData = await this.provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas
      ? (feeData.maxFeePerGas * BigInt(Math.floor(gasSettings.gasPriceMultiplier * 100))) / 100n
      : network.maxFeePerGas;

    const tx = await escrowContract.freeze({
      gasLimit: gasSettings.defaultGasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas: network.maxPriorityFeePerGas,
    });

    const receipt: TransactionReceipt = await tx.wait(network.confirmationBlocks);

    if (!receipt || receipt.status === 0) {
      throw new Error(`Freeze transaction reverted: ${tx.hash}`);
    }

    escrow.status = EscrowStatus.FROZEN;
    escrow.freezeReason = `Dispute: ${disputeId}`;
    await this.escrowRepository.save(escrow);

    this.logger.log(`Escrow ${escrowId} frozen for dispute ${disputeId}, tx=${receipt.hash}`);
  }

  async releasePartial(
    escrowId: string,
    amount: number,
    milestone: string,
  ): Promise<ReleaseResult> {
    const escrow = await this.findEscrowOrFail(escrowId);

    if (escrow.status !== EscrowStatus.FUNDED && escrow.status !== EscrowStatus.PARTIALLY_RELEASED) {
      throw new Error(
        `Cannot partially release escrow in status ${escrow.status}. Must be FUNDED or PARTIALLY_RELEASED.`,
      );
    }

    if (amount > escrow.amount) {
      throw new Error(
        `Release amount ${amount} exceeds remaining escrow balance ${escrow.amount}`,
      );
    }

    if (!escrow.blockchainAddress) {
      throw new Error('Escrow has no blockchain address');
    }

    const { gasSettings, network } = this.blockchainConfig;

    this.logger.log(
      `Partial release from escrow ${escrowId}: ${amount} MATIC for milestone "${milestone}"`,
    );

    const escrowContract = new Contract(escrow.blockchainAddress, ESCROW_ABI, this.wallet);

    const amountWei = ethers.parseEther(amount.toString());

    const feeData = await this.provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas
      ? (feeData.maxFeePerGas * BigInt(Math.floor(gasSettings.gasPriceMultiplier * 100))) / 100n
      : network.maxFeePerGas;

    const tx = await escrowContract.releasePartial(amountWei, {
      gasLimit: gasSettings.defaultGasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas: network.maxPriorityFeePerGas,
    });

    const receipt: TransactionReceipt = await tx.wait(network.confirmationBlocks);

    if (!receipt || receipt.status === 0) {
      throw new Error(`Partial release transaction reverted: ${tx.hash}`);
    }

    const milestones = escrow.milestones ?? [];
    const milestoneEntry = milestones.find((m) => m.id === milestone);
    if (milestoneEntry) {
      milestoneEntry.status = 'RELEASED';
      milestoneEntry.releasedAt = new Date().toISOString();
      milestoneEntry.transactionHash = receipt.hash;
    } else {
      milestones.push({
        id: milestone,
        description: milestone,
        amount,
        status: 'RELEASED',
        releasedAt: new Date().toISOString(),
        transactionHash: receipt.hash,
      });
    }

    const remainingAmount = escrow.amount - amount;
    escrow.amount = remainingAmount;
    escrow.milestones = milestones;
    escrow.status = remainingAmount > 0 ? EscrowStatus.PARTIALLY_RELEASED : EscrowStatus.RELEASED;
    escrow.releaseTxHash = receipt.hash;
    await this.escrowRepository.save(escrow);

    const result: ReleaseResult = {
      escrowId,
      transactionHash: receipt.hash,
      amount,
      releasedTo: escrow.beneficiaryAddress,
      explorerUrl: `${network.explorerUrl}/tx/${receipt.hash}`,
    };

    this.logger.log(
      `Partial release from escrow ${escrowId}: ${amount} MATIC for "${milestone}", tx=${receipt.hash}`,
    );

    return result;
  }

  async getEscrowStatus(escrowId: string): Promise<EscrowStatusResult> {
    const escrow = await this.findEscrowOrFail(escrowId);

    return {
      escrowId: escrow.id,
      contractId: escrow.contractId,
      blockchainAddress: escrow.blockchainAddress,
      amount: escrow.amount,
      currency: escrow.currency,
      depositorAddress: escrow.depositorAddress,
      beneficiaryAddress: escrow.beneficiaryAddress,
      status: escrow.status,
      depositTxHash: escrow.depositTxHash,
      releaseTxHash: escrow.releaseTxHash,
      refundTxHash: escrow.refundTxHash,
      freezeReason: escrow.freezeReason,
      milestones: escrow.milestones,
      createdAt: escrow.createdAt,
      updatedAt: escrow.updatedAt,
    };
  }

  private async findEscrowOrFail(escrowId: string): Promise<EscrowEntity> {
    const escrow = await this.escrowRepository.findOne({ where: { id: escrowId } });
    if (!escrow) {
      throw new NotFoundException(`Escrow not found: ${escrowId}`);
    }
    return escrow;
  }

  private buildMilestones(
    releaseConditions: ReleaseConditions | Record<string, unknown>,
  ): EscrowEntity['milestones'] {
    const conditions = releaseConditions as ReleaseConditions;
    if (conditions.type === 'MILESTONE' && conditions.milestones) {
      return conditions.milestones.map((m) => ({
        id: m.id,
        description: m.description,
        amount: m.amount,
        status: 'PENDING' as const,
      }));
    }
    return null;
  }

  private ensureFactoryReady(): void {
    if (!this.escrowFactory) {
      throw new Error(
        'EscrowFactory not initialized. Set ESCROW_FACTORY_ADDRESS environment variable.',
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
