import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ContractRegistry } from '../../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

describe('ContractRegistry', function () {
  let registry: ContractRegistry;
  let owner: HardhatEthersSigner;
  let nonOwner: HardhatEthersSigner;

  const sampleContractId = ethers.keccak256(ethers.toUtf8Bytes('contract-001'));
  const sampleDocumentHash = ethers.keccak256(ethers.toUtf8Bytes('document-content'));
  const anotherDocumentHash = ethers.keccak256(ethers.toUtf8Bytes('another-document'));

  beforeEach(async function () {
    [owner, nonOwner] = await ethers.getSigners();
    const ContractRegistry = await ethers.getContractFactory('ContractRegistry');
    registry = await ContractRegistry.deploy();
    await registry.waitForDeployment();
  });

  describe('Deployment', function () {
    it('should set the deployer as owner', async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it('should emit OwnershipTransferred on deployment', async function () {
      const ContractRegistry = await ethers.getContractFactory('ContractRegistry');
      const newRegistry = await ContractRegistry.deploy();
      await newRegistry.waitForDeployment();

      const filter = newRegistry.filters.OwnershipTransferred();
      const events = await newRegistry.queryFilter(filter);
      expect(events.length).to.equal(1);
      expect(events[0].args.previousOwner).to.equal(ethers.ZeroAddress);
      expect(events[0].args.newOwner).to.equal(owner.address);
    });
  });

  describe('registerDocument', function () {
    it('should register a document successfully', async function () {
      await expect(registry.registerDocument(sampleContractId, sampleDocumentHash))
        .to.emit(registry, 'DocumentRegistered')
        .withArgs(sampleContractId, sampleDocumentHash, await getBlockTimestamp(), owner.address);

      const reg = await registry.getRegistration(sampleContractId);
      expect(reg.documentHash).to.equal(sampleDocumentHash);
      expect(reg.registeredBy).to.equal(owner.address);
      expect(reg.exists).to.be.true;
    });

    it('should reject duplicate registration for the same contractId', async function () {
      await registry.registerDocument(sampleContractId, sampleDocumentHash);

      await expect(
        registry.registerDocument(sampleContractId, anotherDocumentHash),
      ).to.be.revertedWith('ContractRegistry: contract already registered');
    });

    it('should reject zero document hash', async function () {
      await expect(
        registry.registerDocument(sampleContractId, ethers.ZeroHash),
      ).to.be.revertedWith('ContractRegistry: document hash cannot be zero');
    });

    it('should reject calls from non-owner', async function () {
      await expect(
        registry.connect(nonOwner).registerDocument(sampleContractId, sampleDocumentHash),
      ).to.be.revertedWith('ContractRegistry: caller is not the owner');
    });

    it('should allow registering different contractIds', async function () {
      const contractId2 = ethers.keccak256(ethers.toUtf8Bytes('contract-002'));

      await registry.registerDocument(sampleContractId, sampleDocumentHash);
      await registry.registerDocument(contractId2, anotherDocumentHash);

      const reg1 = await registry.getRegistration(sampleContractId);
      const reg2 = await registry.getRegistration(contractId2);

      expect(reg1.documentHash).to.equal(sampleDocumentHash);
      expect(reg2.documentHash).to.equal(anotherDocumentHash);
    });
  });

  describe('verifyDocument', function () {
    beforeEach(async function () {
      await registry.registerDocument(sampleContractId, sampleDocumentHash);
    });

    it('should return true for a valid document hash', async function () {
      const [isValid, timestamp] = await registry.verifyDocument(sampleContractId, sampleDocumentHash);
      expect(isValid).to.be.true;
      expect(timestamp).to.be.greaterThan(0);
    });

    it('should return false for an incorrect document hash', async function () {
      const [isValid, timestamp] = await registry.verifyDocument(sampleContractId, anotherDocumentHash);
      expect(isValid).to.be.false;
      expect(timestamp).to.be.greaterThan(0);
    });

    it('should return false for a non-existent contractId', async function () {
      const unknownId = ethers.keccak256(ethers.toUtf8Bytes('unknown'));
      const [isValid, timestamp] = await registry.verifyDocument(unknownId, sampleDocumentHash);
      expect(isValid).to.be.false;
      expect(timestamp).to.equal(0);
    });
  });

  describe('getRegistration', function () {
    it('should return registration details for a registered document', async function () {
      await registry.registerDocument(sampleContractId, sampleDocumentHash);

      const reg = await registry.getRegistration(sampleContractId);
      expect(reg.documentHash).to.equal(sampleDocumentHash);
      expect(reg.registeredBy).to.equal(owner.address);
      expect(reg.exists).to.be.true;
      expect(reg.timestamp).to.be.greaterThan(0);
    });

    it('should return empty registration for unregistered contractId', async function () {
      const unknownId = ethers.keccak256(ethers.toUtf8Bytes('unknown'));
      const reg = await registry.getRegistration(unknownId);
      expect(reg.documentHash).to.equal(ethers.ZeroHash);
      expect(reg.registeredBy).to.equal(ethers.ZeroAddress);
      expect(reg.exists).to.be.false;
      expect(reg.timestamp).to.equal(0);
    });
  });

  describe('Access Control', function () {
    it('should allow owner to transfer ownership', async function () {
      await expect(registry.transferOwnership(nonOwner.address))
        .to.emit(registry, 'OwnershipTransferred')
        .withArgs(owner.address, nonOwner.address);

      expect(await registry.owner()).to.equal(nonOwner.address);
    });

    it('should reject transferOwnership from non-owner', async function () {
      await expect(
        registry.connect(nonOwner).transferOwnership(nonOwner.address),
      ).to.be.revertedWith('ContractRegistry: caller is not the owner');
    });

    it('should reject transferOwnership to zero address', async function () {
      await expect(
        registry.transferOwnership(ethers.ZeroAddress),
      ).to.be.revertedWith('ContractRegistry: new owner is the zero address');
    });

    it('should allow new owner to register documents after transfer', async function () {
      await registry.transferOwnership(nonOwner.address);

      await expect(
        registry.connect(nonOwner).registerDocument(sampleContractId, sampleDocumentHash),
      ).to.emit(registry, 'DocumentRegistered');
    });

    it('should prevent old owner from registering after transfer', async function () {
      await registry.transferOwnership(nonOwner.address);

      await expect(
        registry.registerDocument(sampleContractId, sampleDocumentHash),
      ).to.be.revertedWith('ContractRegistry: caller is not the owner');
    });
  });
});

async function getBlockTimestamp(): Promise<number> {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return block!.timestamp;
}
