import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ArbitrationManager, Escrow, EscrowFactory } from '../../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

describe('ArbitrationManager', function () {
  let arbitrationManager: ArbitrationManager;
  let escrowFactory: EscrowFactory;
  let escrow: Escrow;
  let owner: HardhatEthersSigner;
  let depositor: HardhatEthersSigner;
  let beneficiary: HardhatEthersSigner;
  let outsider: HardhatEthersSigner;
  let newArbiter: HardhatEthersSigner;

  const contractId = ethers.keccak256(ethers.toUtf8Bytes('arb-contract-001'));
  const disputeId = ethers.keccak256(ethers.toUtf8Bytes('dispute-001'));
  const disputeId2 = ethers.keccak256(ethers.toUtf8Bytes('dispute-002'));
  const depositAmount = ethers.parseEther('10');

  /**
   * Helper: deploy the full stack (EscrowFactory + Escrow + ArbitrationManager),
   * fund the escrow, and set the ArbitrationManager as the escrow arbiter
   * so it can freeze/release/refund.
   */
  async function deployFullStack() {
    // Deploy EscrowFactory (owner is the default arbiter in the factory)
    const EscrowFactoryContract = await ethers.getContractFactory('EscrowFactory');
    escrowFactory = await EscrowFactoryContract.deploy();
    await escrowFactory.waitForDeployment();

    // Deploy ArbitrationManager
    const ArbitrationManagerContract = await ethers.getContractFactory('ArbitrationManager');
    arbitrationManager = await ArbitrationManagerContract.deploy();
    await arbitrationManager.waitForDeployment();

    // Set the ArbitrationManager as the arbiter in the factory,
    // so new escrows use ArbitrationManager as their arbiter
    await escrowFactory.setArbiter(await arbitrationManager.getAddress());

    // Create an escrow via the factory
    await escrowFactory.createEscrow(contractId, depositor.address, beneficiary.address);
    const escrowAddress = await escrowFactory.getEscrow(contractId);
    escrow = await ethers.getContractAt('Escrow', escrowAddress) as Escrow;

    // Fund the escrow
    await escrow.connect(depositor).deposit({ value: depositAmount });
  }

  beforeEach(async function () {
    [owner, depositor, beneficiary, outsider, newArbiter] = await ethers.getSigners();
    await deployFullStack();
  });

  describe('Deployment', function () {
    it('should set deployer as owner', async function () {
      expect(await arbitrationManager.owner()).to.equal(owner.address);
    });

    it('should set deployer as authorizedArbiter', async function () {
      expect(await arbitrationManager.authorizedArbiter()).to.equal(owner.address);
    });

    it('should start with zero disputes', async function () {
      expect(await arbitrationManager.getDisputeCount()).to.equal(0);
    });
  });

  describe('fileDispute', function () {
    it('should file a dispute successfully as the plaintiff', async function () {
      const escrowAddress = await escrow.getAddress();

      await expect(
        arbitrationManager.connect(depositor).fileDispute(
          disputeId,
          contractId,
          escrowAddress,
          depositor.address,
          beneficiary.address,
        ),
      )
        .to.emit(arbitrationManager, 'DisputeFiled')
        .withArgs(
          disputeId,
          contractId,
          escrowAddress,
          depositor.address,
          beneficiary.address,
          (value: bigint) => value > 0n, // filedAt timestamp
        );

      expect(await arbitrationManager.getDisputeCount()).to.equal(1);
    });

    it('should file a dispute as owner', async function () {
      const escrowAddress = await escrow.getAddress();

      await expect(
        arbitrationManager.connect(owner).fileDispute(
          disputeId,
          contractId,
          escrowAddress,
          depositor.address,
          beneficiary.address,
        ),
      ).to.emit(arbitrationManager, 'DisputeFiled');
    });

    it('should store dispute details correctly', async function () {
      const escrowAddress = await escrow.getAddress();

      await arbitrationManager.connect(depositor).fileDispute(
        disputeId,
        contractId,
        escrowAddress,
        depositor.address,
        beneficiary.address,
      );

      const dispute = await arbitrationManager.getDispute(disputeId);
      expect(dispute.contractId).to.equal(contractId);
      expect(dispute.escrowAddress).to.equal(escrowAddress);
      expect(dispute.plaintiff).to.equal(depositor.address);
      expect(dispute.defendant).to.equal(beneficiary.address);
      expect(dispute.resolved).to.be.false;
      expect(dispute.filedAt).to.be.greaterThan(0);
      expect(dispute.resolvedAt).to.equal(0);
      expect(dispute.resolution).to.equal('');
    });

    it('should freeze the escrow when filing a dispute', async function () {
      const escrowAddress = await escrow.getAddress();

      await arbitrationManager.connect(depositor).fileDispute(
        disputeId,
        contractId,
        escrowAddress,
        depositor.address,
        beneficiary.address,
      );

      // ArbitrationManager is the arbiter of the escrow, so freeze should work
      expect(await escrow.state()).to.equal(4n); // FROZEN
    });

    it('should reject duplicate dispute IDs', async function () {
      const escrowAddress = await escrow.getAddress();

      await arbitrationManager.connect(depositor).fileDispute(
        disputeId,
        contractId,
        escrowAddress,
        depositor.address,
        beneficiary.address,
      );

      await expect(
        arbitrationManager.connect(depositor).fileDispute(
          disputeId,
          contractId,
          escrowAddress,
          depositor.address,
          beneficiary.address,
        ),
      ).to.be.revertedWith('ArbitrationManager: dispute already exists');
    });

    it('should reject zero address escrow', async function () {
      await expect(
        arbitrationManager.connect(depositor).fileDispute(
          disputeId,
          contractId,
          ethers.ZeroAddress,
          depositor.address,
          beneficiary.address,
        ),
      ).to.be.revertedWith('ArbitrationManager: escrow is the zero address');
    });

    it('should reject zero address plaintiff', async function () {
      const escrowAddress = await escrow.getAddress();

      await expect(
        arbitrationManager.connect(owner).fileDispute(
          disputeId,
          contractId,
          escrowAddress,
          ethers.ZeroAddress,
          beneficiary.address,
        ),
      ).to.be.revertedWith('ArbitrationManager: plaintiff is the zero address');
    });

    it('should reject zero address defendant', async function () {
      const escrowAddress = await escrow.getAddress();

      await expect(
        arbitrationManager.connect(depositor).fileDispute(
          disputeId,
          contractId,
          escrowAddress,
          depositor.address,
          ethers.ZeroAddress,
        ),
      ).to.be.revertedWith('ArbitrationManager: defendant is the zero address');
    });

    it('should reject filing by unauthorized caller (not plaintiff, owner, or arbiter)', async function () {
      const escrowAddress = await escrow.getAddress();

      await expect(
        arbitrationManager.connect(outsider).fileDispute(
          disputeId,
          contractId,
          escrowAddress,
          depositor.address,
          beneficiary.address,
        ),
      ).to.be.revertedWith('ArbitrationManager: caller must be plaintiff, owner, or arbiter');
    });
  });

  describe('resolveDispute', function () {
    beforeEach(async function () {
      const escrowAddress = await escrow.getAddress();

      // File a dispute (this freezes the escrow)
      await arbitrationManager.connect(depositor).fileDispute(
        disputeId,
        contractId,
        escrowAddress,
        depositor.address,
        beneficiary.address,
      );
    });

    it('should resolve dispute in favor of beneficiary (release)', async function () {
      const beneficiaryBalanceBefore = await ethers.provider.getBalance(beneficiary.address);

      await expect(
        arbitrationManager.connect(owner).resolveDispute(
          disputeId,
          'Beneficiary fulfilled obligations',
          true,
        ),
      )
        .to.emit(arbitrationManager, 'DisputeResolved')
        .withArgs(
          disputeId,
          contractId,
          'Beneficiary fulfilled obligations',
          true,
          (value: bigint) => value > 0n,
        );

      const dispute = await arbitrationManager.getDispute(disputeId);
      expect(dispute.resolved).to.be.true;
      expect(dispute.resolution).to.equal('Beneficiary fulfilled obligations');
      expect(dispute.resolvedAt).to.be.greaterThan(0);

      // Funds should have been released to beneficiary
      const beneficiaryBalanceAfter = await ethers.provider.getBalance(beneficiary.address);
      expect(beneficiaryBalanceAfter - beneficiaryBalanceBefore).to.equal(depositAmount);
    });

    it('should resolve dispute in favor of depositor (refund)', async function () {
      const depositorBalanceBefore = await ethers.provider.getBalance(depositor.address);

      await expect(
        arbitrationManager.connect(owner).resolveDispute(
          disputeId,
          'Beneficiary failed to deliver',
          false,
        ),
      )
        .to.emit(arbitrationManager, 'DisputeResolved')
        .withArgs(
          disputeId,
          contractId,
          'Beneficiary failed to deliver',
          false,
          (value: bigint) => value > 0n,
        );

      // Funds should have been refunded to depositor
      const depositorBalanceAfter = await ethers.provider.getBalance(depositor.address);
      expect(depositorBalanceAfter - depositorBalanceBefore).to.equal(depositAmount);
    });

    it('should reject resolving non-existent dispute', async function () {
      const unknownDisputeId = ethers.keccak256(ethers.toUtf8Bytes('unknown-dispute'));

      await expect(
        arbitrationManager.connect(owner).resolveDispute(
          unknownDisputeId,
          'Resolution',
          true,
        ),
      ).to.be.revertedWith('ArbitrationManager: dispute does not exist');
    });

    it('should reject resolving already resolved dispute', async function () {
      await arbitrationManager.connect(owner).resolveDispute(
        disputeId,
        'First resolution',
        true,
      );

      await expect(
        arbitrationManager.connect(owner).resolveDispute(
          disputeId,
          'Second resolution',
          false,
        ),
      ).to.be.revertedWith('ArbitrationManager: dispute already resolved');
    });

    it('should reject resolution from non-arbiter/non-owner', async function () {
      await expect(
        arbitrationManager.connect(outsider).resolveDispute(
          disputeId,
          'Outsider resolution',
          true,
        ),
      ).to.be.revertedWith('ArbitrationManager: caller is not authorized to arbitrate');
    });

    it('should reject resolution from depositor (not arbiter)', async function () {
      await expect(
        arbitrationManager.connect(depositor).resolveDispute(
          disputeId,
          'Depositor resolution',
          true,
        ),
      ).to.be.revertedWith('ArbitrationManager: caller is not authorized to arbitrate');
    });
  });

  describe('Access Control', function () {
    it('should allow owner to set a new arbiter', async function () {
      await expect(arbitrationManager.setArbiter(newArbiter.address))
        .to.emit(arbitrationManager, 'ArbiterUpdated')
        .withArgs(owner.address, newArbiter.address);

      expect(await arbitrationManager.authorizedArbiter()).to.equal(newArbiter.address);
    });

    it('should allow new arbiter to resolve disputes', async function () {
      await arbitrationManager.setArbiter(newArbiter.address);

      const escrowAddress = await escrow.getAddress();
      await arbitrationManager.connect(depositor).fileDispute(
        disputeId,
        contractId,
        escrowAddress,
        depositor.address,
        beneficiary.address,
      );

      // newArbiter should be able to resolve
      await expect(
        arbitrationManager.connect(newArbiter).resolveDispute(
          disputeId,
          'Resolved by new arbiter',
          true,
        ),
      ).to.emit(arbitrationManager, 'DisputeResolved');
    });

    it('should reject setArbiter from non-owner', async function () {
      await expect(
        arbitrationManager.connect(outsider).setArbiter(newArbiter.address),
      ).to.be.revertedWith('ArbitrationManager: caller is not the owner');
    });

    it('should reject setArbiter with zero address', async function () {
      await expect(
        arbitrationManager.setArbiter(ethers.ZeroAddress),
      ).to.be.revertedWith('ArbitrationManager: new arbiter is the zero address');
    });

    it('should allow owner to transfer ownership', async function () {
      await expect(arbitrationManager.transferOwnership(outsider.address))
        .to.emit(arbitrationManager, 'OwnershipTransferred')
        .withArgs(owner.address, outsider.address);

      expect(await arbitrationManager.owner()).to.equal(outsider.address);
    });

    it('should reject transferOwnership from non-owner', async function () {
      await expect(
        arbitrationManager.connect(outsider).transferOwnership(outsider.address),
      ).to.be.revertedWith('ArbitrationManager: caller is not the owner');
    });

    it('should reject transferOwnership to zero address', async function () {
      await expect(
        arbitrationManager.transferOwnership(ethers.ZeroAddress),
      ).to.be.revertedWith('ArbitrationManager: new owner is the zero address');
    });
  });

  describe('Integration with Escrow', function () {
    it('should freeze escrow when dispute is filed', async function () {
      const escrowAddress = await escrow.getAddress();

      // Confirm escrow is FUNDED before dispute
      expect(await escrow.state()).to.equal(1n); // FUNDED

      await arbitrationManager.connect(depositor).fileDispute(
        disputeId,
        contractId,
        escrowAddress,
        depositor.address,
        beneficiary.address,
      );

      // Escrow should now be FROZEN
      expect(await escrow.state()).to.equal(4n); // FROZEN
    });

    it('should release escrow funds when dispute resolved in favor of beneficiary', async function () {
      const escrowAddress = await escrow.getAddress();

      await arbitrationManager.connect(depositor).fileDispute(
        disputeId,
        contractId,
        escrowAddress,
        depositor.address,
        beneficiary.address,
      );

      const beneficiaryBefore = await ethers.provider.getBalance(beneficiary.address);

      await arbitrationManager.connect(owner).resolveDispute(
        disputeId,
        'Resolved for beneficiary',
        true,
      );

      const beneficiaryAfter = await ethers.provider.getBalance(beneficiary.address);
      expect(beneficiaryAfter - beneficiaryBefore).to.equal(depositAmount);
      expect(await escrow.state()).to.equal(2n); // RELEASED
    });

    it('should refund escrow funds when dispute resolved in favor of depositor', async function () {
      const escrowAddress = await escrow.getAddress();

      await arbitrationManager.connect(depositor).fileDispute(
        disputeId,
        contractId,
        escrowAddress,
        depositor.address,
        beneficiary.address,
      );

      const depositorBefore = await ethers.provider.getBalance(depositor.address);

      await arbitrationManager.connect(owner).resolveDispute(
        disputeId,
        'Resolved for depositor',
        false,
      );

      const depositorAfter = await ethers.provider.getBalance(depositor.address);
      expect(depositorAfter - depositorBefore).to.equal(depositAmount);
      expect(await escrow.state()).to.equal(3n); // REFUNDED
    });

    it('should handle filing dispute on already non-freezable escrow gracefully', async function () {
      // Release the escrow first so it cannot be frozen
      await escrow.connect(depositor).release();
      await escrow.connect(beneficiary).release(); // both approvals trigger release

      // Filing should still work (the freeze call in fileDispute has a try/catch)
      const escrowAddress = await escrow.getAddress();
      await expect(
        arbitrationManager.connect(owner).fileDispute(
          disputeId,
          contractId,
          escrowAddress,
          depositor.address,
          beneficiary.address,
        ),
      ).to.emit(arbitrationManager, 'DisputeFiled');

      // Dispute is filed even though freeze failed
      expect(await arbitrationManager.getDisputeCount()).to.equal(1);
    });

    it('should handle multiple disputes for different escrows', async function () {
      // Create a second escrow
      const contractId2 = ethers.keccak256(ethers.toUtf8Bytes('arb-contract-002'));
      await escrowFactory.createEscrow(contractId2, depositor.address, beneficiary.address);
      const escrowAddress2 = await escrowFactory.getEscrow(contractId2);
      const escrow2 = await ethers.getContractAt('Escrow', escrowAddress2) as Escrow;
      await escrow2.connect(depositor).deposit({ value: depositAmount });

      const escrowAddress = await escrow.getAddress();

      // File disputes for both
      await arbitrationManager.connect(depositor).fileDispute(
        disputeId,
        contractId,
        escrowAddress,
        depositor.address,
        beneficiary.address,
      );

      await arbitrationManager.connect(beneficiary).fileDispute(
        disputeId2,
        contractId2,
        escrowAddress2,
        beneficiary.address,
        depositor.address,
      );

      expect(await arbitrationManager.getDisputeCount()).to.equal(2);
      expect(await escrow.state()).to.equal(4n);  // FROZEN
      expect(await escrow2.state()).to.equal(4n); // FROZEN

      // Resolve first in favor of beneficiary, second in favor of depositor
      await arbitrationManager.connect(owner).resolveDispute(disputeId, 'Release', true);
      await arbitrationManager.connect(owner).resolveDispute(disputeId2, 'Refund', false);

      expect(await escrow.state()).to.equal(2n);  // RELEASED
      expect(await escrow2.state()).to.equal(3n); // REFUNDED
    });
  });
});
