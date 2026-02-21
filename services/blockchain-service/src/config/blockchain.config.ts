import { registerAs } from '@nestjs/config';

export interface BlockchainNetworkConfig {
  rpcUrl: string;
  chainId: number;
  networkName: string;
  explorerUrl: string;
  gasLimit: number;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  confirmationBlocks: number;
}

export interface BlockchainConfig {
  network: BlockchainNetworkConfig;
  deployerPrivateKey: string;
  contracts: {
    registryAddress: string;
    escrowFactoryAddress: string;
    arbitrationManagerAddress: string;
  };
  gasSettings: {
    defaultGasLimit: number;
    maxRetries: number;
    retryDelayMs: number;
    gasPriceMultiplier: number;
  };
}

export default registerAs('blockchain', (): BlockchainConfig => {
  const isMainnet = process.env.BLOCKCHAIN_NETWORK === 'mainnet';

  return {
    network: {
      rpcUrl: process.env.POLYGON_RPC_URL || (isMainnet
        ? 'https://polygon-rpc.com'
        : 'https://rpc-mumbai.maticvigil.com'),
      chainId: isMainnet ? 137 : 80001,
      networkName: isMainnet ? 'Polygon Mainnet' : 'Polygon Mumbai Testnet',
      explorerUrl: isMainnet
        ? 'https://polygonscan.com'
        : 'https://mumbai.polygonscan.com',
      gasLimit: parseInt(process.env.GAS_LIMIT || '3000000', 10),
      maxFeePerGas: BigInt(process.env.MAX_FEE_PER_GAS || (isMainnet ? '50000000000' : '35000000000')),
      maxPriorityFeePerGas: BigInt(process.env.MAX_PRIORITY_FEE || (isMainnet ? '30000000000' : '25000000000')),
      confirmationBlocks: parseInt(process.env.CONFIRMATION_BLOCKS || (isMainnet ? '5' : '2'), 10),
    },
    deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY || '',
    contracts: {
      registryAddress: process.env.CONTRACT_REGISTRY_ADDRESS || '',
      escrowFactoryAddress: process.env.ESCROW_FACTORY_ADDRESS || '',
      arbitrationManagerAddress: process.env.ARBITRATION_MANAGER_ADDRESS || '',
    },
    gasSettings: {
      defaultGasLimit: parseInt(process.env.DEFAULT_GAS_LIMIT || '500000', 10),
      maxRetries: parseInt(process.env.TX_MAX_RETRIES || '3', 10),
      retryDelayMs: parseInt(process.env.TX_RETRY_DELAY_MS || '5000', 10),
      gasPriceMultiplier: parseFloat(process.env.GAS_PRICE_MULTIPLIER || '1.2'),
    },
  };
});
