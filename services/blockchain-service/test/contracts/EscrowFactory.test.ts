import { expect } from 'chai';
import { ethers } from 'hardhat';
import { EscrowFactory, Escrow } from '../../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

describe('EscrowFactory', function () {
  let factory: EscrowFactory;
  let owner: HardhatEthersSigner;
  let depositor: HardhatEthersSigner;
  let beneficiary: HardhatEthersSigner;
  let nonOwner: HardhatEthersSigner;
  let newArbiter: HardhatEthersSigner;

  const contractId = ethers.keccak256(ethers.toUtf8Bytes('factory-contract-001'));
  const contractId2 = ethers.keccak256(ethers.toUtf8Bytes('factory-contract-002'));

  beforeEach(async function () {
    [owner, depositor, beneficiary, nonOwner, newArbiter] = await ethers.getSigners();

    const EscrowFactoryContract = await ethers.getContractFactory('EscrowFactory');
    factory = await EscrowFactoryContract.deploy();
    await factory.waitForDeployment();
  });

  describe('Deployment', function () {
    it('should set deployer as owner', async function () {
      expect(await factory.owner()).to.equal(owner.address);
    });

    it('should set deployer as default arbiter', async function () {
      expect(await factory.arbiter()).to.equal(owner.address);
    });

    it('should start with zero escrows', async function () {
      expect(await factory.getEscrowCount()).to.equal(0);
    });
  });

  describe('createEscrow', function () {
    it('should create a new escrow successfully', async function () {
      const tx = await factory.createEscrow(contractId, depositor.address, beneficiary.address);
      const receipt = await tx.wait();

      const escrowAddress = await factory.getEscrow(contractId);
      expect(escrowAddress).to.not.equal(ethers.ZeroAddress);
    });

    it('should emit EscrowCreated event with correct parameters', async function () {
      await expect(factory.createEscrow(contractId, depositor.address, beneficiary.address))
        .to.emit(factory, 'EscrowCreated')
        .withArgs(
          contractId,
          (value: string) => value !== ethers.ZeroAddress, // escrow address is non-zero
          depositor.address,
          beneficiary.address,
        );
    });

    it('should deploy a functional Escrow contract', async function () {
      await factory.createEscrow(contractId, depositor.address, beneficiary.address);
      const escrowAddress = await factory.getEscrow(contractId);

      const escrow = await ethers.getContractAt('Escrow', escrowAddress) as Escrow;
      expect(await escrow.depositor()).to.equal(depositor.address);
      expect(await escrow.beneficiary()).to.equal(beneficiary.address);
      expect(await escrow.arbiter()).to.equal(owner.address); // factory owner is default arbiter
      expect(await escrow.contractId()).to.equal(contractId);
      expect(await escrow.state()).to.equal(0n); // AWAITING_DEPOSIT
    });

    it('should increment escrow count', async function () {
      await factory.createEscrow(contractId, depositor.address, beneficiary.address);
      expect(await factory.getEscrowCount()).to.equal(1);

      await factory.createEscrow(contractId2, depositor.address, beneficiary.address);
      expect(await factory.getEscrowCount()).to.equal(2);
    });

    it('should store escrow IDs in array', async function () {
      await factory.createEscrow(contractId, depositor.address, beneficiary.address);
      await factory.createEscrow(contractId2, depositor.address, beneficiary.address);

      expect(await factory.escrowIds(0)).to.equal(contractId);
      expect(await factory.escrowIds(1)).to.equal(contractId2);
    });

    it('should reject duplicate contractId', async function () {
      await factory.createEscrow(contractId, depositor.address, beneficiary.address);

      await expect(
        factory.createEscrow(contractId, depositor.address, beneficiary.address),
      ).to.be.revertedWith('EscrowFactory: escrow already exists for this contract');
    });

    it('should reject zero address depositor', async function () {
      await expect(
        factory.createEscrow(contractId, ethers.ZeroAddress, beneficiary.address),
      ).to.be.revertedWith('EscrowFactory: depositor is the zero address');
    });

    it('should reject zero address beneficiary', async function () {
      await expect(
        factory.createEscrow(contractId, depositor.address, ethers.ZeroAddress),
      ).to.be.revertedWith('EscrowFactory: beneficiary is the zero address');
    });

    it('should reject calls from non-owner', async function () {
      await expect(
        factory.connect(nonOwner).createEscrow(contractId, depositor.address, beneficiary.address),
      ).to.be.revertedWith('EscrowFactory: caller is not the owner');
    });
  });

  describe('getEscrow', function () {
    it('should return the correct escrow address', async function () {
      await factory.createEscrow(contractId, depositor.address, beneficiary.address);
      const escrowAddress = await factory.getEscrow(contractId);
      expect(escrowAddress).to.not.equal(ethers.ZeroAddress);
    });

    it('should return zero address for non-existent contractId', async function () {
      const unknownId = ethers.keccak256(ethers.toUtf8Bytes('unknown'));
      expect(await factory.getEscrow(unknownId)).to.equal(ethers.ZeroAddress);
    });
  });

  describe('setArbiter', function () {
    it('should update the arbiter address', async function () {
      await expect(factory.setArbiter(newArbiter.address))
        .to.emit(factory, 'ArbiterUpdated')
        .withArgs(owner.address, newArbiter.address);

      expect(await factory.arbiter()).to.equal(newArbiter.address);
    });

    it('should use new arbiter for subsequent escrows', async function () {
      await factory.setArbiter(newArbiter.address);
      await factory.createEscrow(contractId, depositor.address, beneficiary.address);

      const escrowAddress = await factory.getEscrow(contractId);
      const escrow = await ethers.getContractAt('Escrow', escrowAddress) as Escrow;
      expect(await escrow.arbiter()).to.equal(newArbiter.address);
    });

    it('should reject zero address', async function () {
      await expect(
        factory.setArbiter(ethers.ZeroAddress),
      ).to.be.revertedWith('EscrowFactory: new arbiter is the zero address');
    });

    it('should reject calls from non-owner', async function () {
      await expect(
        factory.connect(nonOwner).setArbiter(newArbiter.address),
      ).to.be.revertedWith('EscrowFactory: caller is not the owner');
    });
  });

  describe('transferOwnership', function () {
    it('should transfer ownership', async function () {
      await expect(factory.transferOwnership(nonOwner.address))
        .to.emit(factory, 'OwnershipTransferred')
        .withArgs(owner.address, nonOwner.address);

      expect(await factory.owner()).to.equal(nonOwner.address);
    });

    it('should allow new owner to create escrows', async function () {
      await factory.transferOwnership(nonOwner.address);

      await expect(
        factory.connect(nonOwner).createEscrow(contractId, depositor.address, beneficiary.address),
      ).to.emit(factory, 'EscrowCreated');
    });

    it('should reject transfer to zero address', async function () {
      await expect(
        factory.transferOwnership(ethers.ZeroAddress),
      ).to.be.revertedWith('EscrowFactory: new owner is the zero address');
    });

    it('should reject transfer from non-owner', async function () {
      await expect(
        factory.connect(nonOwner).transferOwnership(nonOwner.address),
      ).to.be.revertedWith('EscrowFactory: caller is not the owner');
    });
  });
});
