import { ethers, network, run } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

interface DeploymentAddresses {
  network: string;
  chainId: number;
  deployer: string;
  contracts: {
    ContractRegistry: string;
    EscrowFactory: string;
    ArbitrationManager: string;
  };
  timestamp: string;
  blockNumber: number;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  const chainId = (await ethers.provider.getNetwork()).chainId;

  console.log('='.repeat(60));
  console.log('Tabeliao - Contract Deployment');
  console.log('='.repeat(60));
  console.log(`Network:  ${networkName} (chainId: ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} MATIC`);
  console.log('='.repeat(60));

  // 1. Deploy ContractRegistry
  console.log('\n[1/3] Deploying ContractRegistry...');
  const ContractRegistry = await ethers.getContractFactory('ContractRegistry');
  const registry = await ContractRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`  ContractRegistry deployed at: ${registryAddress}`);

  // 2. Deploy EscrowFactory
  console.log('\n[2/3] Deploying EscrowFactory...');
  const EscrowFactory = await ethers.getContractFactory('EscrowFactory');
  const factory = await EscrowFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`  EscrowFactory deployed at: ${factoryAddress}`);

  // 3. Deploy ArbitrationManager
  console.log('\n[3/3] Deploying ArbitrationManager...');
  const ArbitrationManager = await ethers.getContractFactory('ArbitrationManager');
  const arbitration = await ArbitrationManager.deploy();
  await arbitration.waitForDeployment();
  const arbitrationAddress = await arbitration.getAddress();
  console.log(`  ArbitrationManager deployed at: ${arbitrationAddress}`);

  // Log summary
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log('\n' + '='.repeat(60));
  console.log('Deployment Summary');
  console.log('='.repeat(60));
  console.log(`  ContractRegistry:   ${registryAddress}`);
  console.log(`  EscrowFactory:      ${factoryAddress}`);
  console.log(`  ArbitrationManager: ${arbitrationAddress}`);
  console.log(`  Block Number:       ${blockNumber}`);
  console.log('='.repeat(60));

  // Save deployment addresses to JSON file
  const deployment: DeploymentAddresses = {
    network: networkName,
    chainId: Number(chainId),
    deployer: deployer.address,
    contracts: {
      ContractRegistry: registryAddress,
      EscrowFactory: factoryAddress,
      ArbitrationManager: arbitrationAddress,
    },
    timestamp: new Date().toISOString(),
    blockNumber,
  };

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filePath = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deployment, null, 2));
  console.log(`\nDeployment addresses saved to: ${filePath}`);

  // Verify contracts on Polygonscan (skip for local networks)
  if (networkName !== 'hardhat' && networkName !== 'localhost') {
    console.log('\nVerifying contracts on Polygonscan...');
    console.log('(Waiting 30 seconds for block confirmations...)');
    await new Promise((resolve) => setTimeout(resolve, 30_000));

    try {
      await run('verify:verify', {
        address: registryAddress,
        constructorArguments: [],
      });
      console.log('  ContractRegistry verified.');
    } catch (err: any) {
      console.log(`  ContractRegistry verification failed: ${err.message}`);
    }

    try {
      await run('verify:verify', {
        address: factoryAddress,
        constructorArguments: [],
      });
      console.log('  EscrowFactory verified.');
    } catch (err: any) {
      console.log(`  EscrowFactory verification failed: ${err.message}`);
    }

    try {
      await run('verify:verify', {
        address: arbitrationAddress,
        constructorArguments: [],
      });
      console.log('  ArbitrationManager verified.');
    } catch (err: any) {
      console.log(`  ArbitrationManager verification failed: ${err.message}`);
    }
  }

  console.log('\nDeployment complete.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
