import { ethers } from 'hardhat';

async function main() {
  const signers = await ethers.getSigners();
  const [deployer, depositor, beneficiary] = signers;

  console.log('='.repeat(60));
  console.log('Tabeliao - Local Development Deployment');
  console.log('='.repeat(60));
  console.log(`Deployer:    ${deployer.address}`);
  console.log(`Depositor:   ${depositor.address}`);
  console.log(`Beneficiary: ${beneficiary.address}`);
  console.log('='.repeat(60));

  // 1. Deploy ContractRegistry
  console.log('\n[1/3] Deploying ContractRegistry...');
  const ContractRegistry = await ethers.getContractFactory('ContractRegistry');
  const registry = await ContractRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`  ContractRegistry: ${registryAddress}`);

  // 2. Deploy EscrowFactory
  console.log('\n[2/3] Deploying EscrowFactory...');
  const EscrowFactory = await ethers.getContractFactory('EscrowFactory');
  const factory = await EscrowFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`  EscrowFactory: ${factoryAddress}`);

  // 3. Deploy ArbitrationManager
  console.log('\n[3/3] Deploying ArbitrationManager...');
  const ArbitrationManager = await ethers.getContractFactory('ArbitrationManager');
  const arbitration = await ArbitrationManager.deploy();
  await arbitration.waitForDeployment();
  const arbitrationAddress = await arbitration.getAddress();
  console.log(`  ArbitrationManager: ${arbitrationAddress}`);

  // Fund test accounts (Hardhat local accounts already have 10000 ETH each,
  // but we log balances for confirmation)
  console.log('\n--- Test Account Balances ---');
  for (let i = 0; i < 5 && i < signers.length; i++) {
    const balance = await ethers.provider.getBalance(signers[i].address);
    console.log(`  Account ${i} (${signers[i].address}): ${ethers.formatEther(balance)} ETH`);
  }

  // Register a sample document
  console.log('\n--- Registering Sample Document ---');
  const sampleContractId = ethers.keccak256(ethers.toUtf8Bytes('sample-contract-001'));
  const sampleDocumentHash = ethers.keccak256(ethers.toUtf8Bytes('sample-document-content-hash'));

  const registerTx = await registry.registerDocument(sampleContractId, sampleDocumentHash);
  await registerTx.wait();
  console.log(`  Contract ID:   ${sampleContractId}`);
  console.log(`  Document Hash: ${sampleDocumentHash}`);

  // Verify the registered document
  const [isValid, timestamp] = await registry.verifyDocument(sampleContractId, sampleDocumentHash);
  console.log(`  Verification:  ${isValid ? 'VALID' : 'INVALID'} (timestamp: ${timestamp})`);

  // Create a sample escrow
  console.log('\n--- Creating Sample Escrow ---');
  const escrowContractId = ethers.keccak256(ethers.toUtf8Bytes('escrow-contract-001'));

  const createEscrowTx = await factory.createEscrow(
    escrowContractId,
    depositor.address,
    beneficiary.address,
  );
  const createEscrowReceipt = await createEscrowTx.wait();
  const escrowAddress = await factory.getEscrow(escrowContractId);
  console.log(`  Escrow Address: ${escrowAddress}`);
  console.log(`  Depositor:      ${depositor.address}`);
  console.log(`  Beneficiary:    ${beneficiary.address}`);
  console.log(`  Arbiter:        ${deployer.address}`);

  // Fund the escrow with a test deposit
  console.log('\n--- Funding Sample Escrow ---');
  const depositAmount = ethers.parseEther('1.0');
  const escrowContract = await ethers.getContractAt('Escrow', escrowAddress, depositor);
  const depositTx = await escrowContract.deposit({ value: depositAmount });
  await depositTx.wait();

  const escrowBalance = await escrowContract.getBalance();
  const escrowState = await escrowContract.state();
  console.log(`  Deposit:  ${ethers.formatEther(depositAmount)} ETH`);
  console.log(`  Balance:  ${ethers.formatEther(escrowBalance)} ETH`);
  console.log(`  State:    ${escrowState} (1 = FUNDED)`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Local Deployment Complete');
  console.log('='.repeat(60));
  console.log(`  ContractRegistry:   ${registryAddress}`);
  console.log(`  EscrowFactory:      ${factoryAddress}`);
  console.log(`  ArbitrationManager: ${arbitrationAddress}`);
  console.log(`  Sample Escrow:      ${escrowAddress}`);
  console.log('='.repeat(60));
  console.log('\nTest accounts available for Hardhat local network:');
  console.log(`  Deployer/Arbiter: ${deployer.address}`);
  console.log(`  Depositor:        ${depositor.address}`);
  console.log(`  Beneficiary:      ${beneficiary.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Local deployment failed:', error);
    process.exit(1);
  });
