import { run, network } from 'hardhat';
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
  const networkName = network.name;

  if (networkName === 'hardhat' || networkName === 'localhost') {
    console.log('Verification is not needed for local networks.');
    process.exit(0);
  }

  // Read deployment addresses
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const filePath = path.join(deploymentsDir, `${networkName}.json`);

  if (!fs.existsSync(filePath)) {
    console.error(`No deployment file found at: ${filePath}`);
    console.error(`Run the deploy script first: npx hardhat run scripts/deploy.ts --network ${networkName}`);
    process.exit(1);
  }

  const deployment: DeploymentAddresses = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  console.log('='.repeat(60));
  console.log('Tabeliao - Contract Verification on Polygonscan');
  console.log('='.repeat(60));
  console.log(`Network:    ${deployment.network} (chainId: ${deployment.chainId})`);
  console.log(`Deployed:   ${deployment.timestamp}`);
  console.log(`Deployer:   ${deployment.deployer}`);
  console.log('='.repeat(60));

  const contracts = [
    {
      name: 'ContractRegistry',
      address: deployment.contracts.ContractRegistry,
      constructorArguments: [],
    },
    {
      name: 'EscrowFactory',
      address: deployment.contracts.EscrowFactory,
      constructorArguments: [],
    },
    {
      name: 'ArbitrationManager',
      address: deployment.contracts.ArbitrationManager,
      constructorArguments: [],
    },
  ];

  let verified = 0;
  let failed = 0;

  for (const contract of contracts) {
    console.log(`\nVerifying ${contract.name} at ${contract.address}...`);
    try {
      await run('verify:verify', {
        address: contract.address,
        constructorArguments: contract.constructorArguments,
      });
      console.log(`  ${contract.name}: VERIFIED`);
      verified++;
    } catch (err: any) {
      if (err.message.toLowerCase().includes('already verified')) {
        console.log(`  ${contract.name}: Already verified`);
        verified++;
      } else {
        console.log(`  ${contract.name}: FAILED - ${err.message}`);
        failed++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Verification Results: ${verified} verified, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
