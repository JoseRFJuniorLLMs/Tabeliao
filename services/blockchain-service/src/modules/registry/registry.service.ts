import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, Contract, Wallet, JsonRpcProvider, TransactionReceipt } from 'ethers';
import { BlockchainConfig } from '../../config/blockchain.config';
import { RegistrationResult, VerificationResult } from './interfaces/registry.interfaces';

const CONTRACT_REGISTRY_ABI = [
  'function registerDocument(bytes32 contractId, bytes32 documentHash) external',
  'function verifyDocument(bytes32 contractId, bytes32 documentHash) external view returns (bool, uint256)',
  'function getRegistration(bytes32 contractId) external view returns (tuple(bytes32 documentHash, uint256 timestamp, address registeredBy, bool exists))',
  'event DocumentRegistered(bytes32 indexed contractId, bytes32 documentHash, uint256 timestamp, address registeredBy)',
];

@Injectable()
export class RegistryService implements OnModuleInit {
  private readonly logger = new Logger(RegistryService.name);
  private provider!: JsonRpcProvider;
  private wallet!: Wallet;
  private registryContract!: Contract;
  private blockchainConfig!: BlockchainConfig;

  constructor(private readonly configService: ConfigService) {}

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

    if (contracts.registryAddress) {
      this.registryContract = new Contract(
        contracts.registryAddress,
        CONTRACT_REGISTRY_ABI,
        this.wallet,
      );
      this.logger.log(`ContractRegistry connected at ${contracts.registryAddress}`);
    } else {
      this.logger.warn('CONTRACT_REGISTRY_ADDRESS not set - registry operations will fail');
    }

    this.logger.log(
      `Blockchain provider initialized: ${network.networkName} (chainId: ${network.chainId})`,
    );
  }

  async registerDocument(
    contractId: string,
    contentHash: string,
    _metadata: Record<string, unknown>,
  ): Promise<RegistrationResult> {
    this.ensureContractReady();

    const contractIdBytes32 = ethers.id(contractId);
    const documentHashBytes32 = '0x' + contentHash;

    this.logger.log(`Registering document: contractId=${contractId}, hash=${contentHash}`);

    const { gasSettings, network } = this.blockchainConfig;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= gasSettings.maxRetries; attempt++) {
      try {
        const feeData = await this.provider.getFeeData();
        const maxFeePerGas = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * BigInt(Math.floor(gasSettings.gasPriceMultiplier * 100))) / 100n
          : network.maxFeePerGas;

        const tx = await this.registryContract.registerDocument(
          contractIdBytes32,
          documentHashBytes32,
          {
            gasLimit: gasSettings.defaultGasLimit,
            maxFeePerGas,
            maxPriorityFeePerGas: network.maxPriorityFeePerGas,
          },
        );

        this.logger.log(`Transaction sent: ${tx.hash} (attempt ${attempt})`);

        const receipt: TransactionReceipt = await tx.wait(network.confirmationBlocks);

        if (!receipt || receipt.status === 0) {
          throw new Error(`Transaction reverted: ${tx.hash}`);
        }

        const block = await this.provider.getBlock(receipt.blockNumber);
        const timestamp = block?.timestamp ?? Math.floor(Date.now() / 1000);

        const result: RegistrationResult = {
          contractId,
          contentHash,
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          timestamp,
          registeredBy: this.wallet.address,
          explorerUrl: `${network.explorerUrl}/tx/${receipt.hash}`,
          status: 'CONFIRMED',
        };

        this.logger.log(
          `Document registered successfully: tx=${receipt.hash}, block=${receipt.blockNumber}`,
        );

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Registration attempt ${attempt}/${gasSettings.maxRetries} failed: ${lastError.message}`,
        );

        if (attempt < gasSettings.maxRetries) {
          await this.sleep(gasSettings.retryDelayMs * attempt);
        }
      }
    }

    throw new Error(
      `Failed to register document after ${this.blockchainConfig.gasSettings.maxRetries} attempts: ${lastError?.message}`,
    );
  }

  async verifyDocument(contractId: string, contentHash: string): Promise<VerificationResult> {
    this.ensureContractReady();

    const contractIdBytes32 = ethers.id(contractId);
    const documentHashBytes32 = '0x' + contentHash;

    try {
      const [isValid, timestamp]: [boolean, bigint] =
        await this.registryContract.verifyDocument(contractIdBytes32, documentHashBytes32);

      if (isValid) {
        const registration = await this.registryContract.getRegistration(contractIdBytes32);

        return {
          contractId,
          contentHash,
          isVerified: true,
          registeredAt: Number(timestamp),
          blockNumber: null,
          registeredBy: registration.registeredBy,
          message: 'Document hash matches the on-chain registration',
        };
      }

      return {
        contractId,
        contentHash,
        isVerified: false,
        registeredAt: null,
        blockNumber: null,
        registeredBy: null,
        message: 'Document hash does not match any on-chain registration for this contract',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Verification failed for ${contractId}: ${errorMessage}`);
      throw new Error(`Verification failed: ${errorMessage}`);
    }
  }

  async getRegistration(contractId: string): Promise<RegistrationResult> {
    this.ensureContractReady();

    const contractIdBytes32 = ethers.id(contractId);

    try {
      const registration = await this.registryContract.getRegistration(contractIdBytes32);

      if (!registration.exists) {
        throw new Error(`No registration found for contract: ${contractId}`);
      }

      const { network } = this.blockchainConfig;

      return {
        contractId,
        contentHash: registration.documentHash.slice(2),
        transactionHash: '',
        blockNumber: 0,
        timestamp: Number(registration.timestamp),
        registeredBy: registration.registeredBy,
        explorerUrl: `${network.explorerUrl}/address/${this.blockchainConfig.contracts.registryAddress}`,
        status: 'CONFIRMED',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Get registration failed for ${contractId}: ${errorMessage}`);
      throw new Error(`Failed to get registration: ${errorMessage}`);
    }
  }

  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        this.logger.warn(`No receipt found for transaction: ${txHash}`);
        return null;
      }

      return receipt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get receipt for ${txHash}: ${errorMessage}`);
      throw new Error(`Failed to get transaction receipt: ${errorMessage}`);
    }
  }

  private ensureContractReady(): void {
    if (!this.registryContract) {
      throw new Error(
        'ContractRegistry not initialized. Set CONTRACT_REGISTRY_ADDRESS environment variable.',
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
