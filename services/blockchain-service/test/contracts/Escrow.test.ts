import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Escrow } from '../../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

describe('Escrow', function () {
  let escrow: Escrow;
  let depositor: HardhatEthersSigner;
  let beneficiary: HardhatEthersSigner;
  let arbiter: HardhatEthersSigner;
  let outsider: HardhatEthersSigner;

  const contractId = ethers.keccak256(ethers.toUtf8Bytes('escrow-contract-001'));
  const depositAmount = ethers.parseEther('10');

  // Enum values matching the Solidity State enum
  const State = {
    AWAITING_DEPOSIT: 0n,
    FUNDED: 1n,
    RELEASED: 2n,
    REFUNDED: 3n,
    FROZEN: 4n,
    DISPUTED: 5n,
  };

  beforeEach(async function () {
    [arbiter, depositor, beneficiary, outsider] = await ethers.getSigners();

    const EscrowFactory = await ethers.getContractFactory('Escrow');
    escrow = await EscrowFactory.deploy(
      contractId,
      depositor.address,
      beneficiary.address,
      arbiter.address,
    );
    await escrow.waitForDeployment();
  });

  describe('Deployment', function () {
    it('should set correct roles', async function () {
      expect(await escrow.depositor()).to.equal(depositor.address);
      expect(await escrow.beneficiary()).to.equal(beneficiary.address);
      expect(await escrow.arbiter()).to.equal(arbiter.address);
    });

    it('should set contractId', async function () {
      expect(await escrow.contractId()).to.equal(contractId);
    });

    it('should start in AWAITING_DEPOSIT state', async function () {
      expect(await escrow.state()).to.equal(State.AWAITING_DEPOSIT);
    });

    it('should reject zero address for depositor', async function () {
      const Escrow = await ethers.getContractFactory('Escrow');
      await expect(
        Escrow.deploy(contractId, ethers.ZeroAddress, beneficiary.address, arbiter.address),
      ).to.be.revertedWith('Escrow: depositor is the zero address');
    });

    it('should reject zero address for beneficiary', async function () {
      const Escrow = await ethers.getContractFactory('Escrow');
      await expect(
        Escrow.deploy(contractId, depositor.address, ethers.ZeroAddress, arbiter.address),
      ).to.be.revertedWith('Escrow: beneficiary is the zero address');
    });

    it('should reject zero address for arbiter', async function () {
      const Escrow = await ethers.getContractFactory('Escrow');
      await expect(
        Escrow.deploy(contractId, depositor.address, beneficiary.address, ethers.ZeroAddress),
      ).to.be.revertedWith('Escrow: arbiter is the zero address');
    });

    it('should reject same depositor and beneficiary', async function () {
      const Escrow = await ethers.getContractFactory('Escrow');
      await expect(
        Escrow.deploy(contractId, depositor.address, depositor.address, arbiter.address),
      ).to.be.revertedWith('Escrow: depositor and beneficiary must differ');
    });
  });

  describe('deposit', function () {
    it('should accept deposit from depositor', async function () {
      await expect(escrow.connect(depositor).deposit({ value: depositAmount }))
        .to.emit(escrow, 'Deposited')
        .withArgs(depositor.address, depositAmount);

      expect(await escrow.state()).to.equal(State.FUNDED);
      expect(await escrow.amount()).to.equal(depositAmount);
      expect(await escrow.getBalance()).to.equal(depositAmount);
    });

    it('should reject deposit from non-depositor', async function () {
      await expect(
        escrow.connect(beneficiary).deposit({ value: depositAmount }),
      ).to.be.revertedWith('Escrow: caller is not the depositor');
    });

    it('should reject zero-value deposit', async function () {
      await expect(
        escrow.connect(depositor).deposit({ value: 0 }),
      ).to.be.revertedWith('Escrow: deposit amount must be greater than zero');
    });

    it('should reject deposit when not in AWAITING_DEPOSIT state', async function () {
      await escrow.connect(depositor).deposit({ value: depositAmount });

      await expect(
        escrow.connect(depositor).deposit({ value: depositAmount }),
      ).to.be.revertedWith('Escrow: invalid state for this operation');
    });

    it('should reject direct ETH transfers', async function () {
      await expect(
        depositor.sendTransaction({
          to: await escrow.getAddress(),
          value: depositAmount,
        }),
      ).to.be.revertedWith('Escrow: use deposit() to send funds');
    });
  });

  describe('release', function () {
    beforeEach(async function () {
      await escrow.connect(depositor).deposit({ value: depositAmount });
    });

    it('should release funds when arbiter calls release', async function () {
      const beneficiaryBalanceBefore = await ethers.provider.getBalance(beneficiary.address);

      await expect(escrow.connect(arbiter).release())
        .to.emit(escrow, 'Released')
        .withArgs(beneficiary.address, depositAmount);

      expect(await escrow.state()).to.equal(State.RELEASED);

      const beneficiaryBalanceAfter = await ethers.provider.getBalance(beneficiary.address);
      expect(beneficiaryBalanceAfter - beneficiaryBalanceBefore).to.equal(depositAmount);
    });

    it('should release funds when both parties approve', async function () {
      await expect(escrow.connect(depositor).release())
        .to.emit(escrow, 'ApprovalGiven')
        .withArgs(depositor.address);

      expect(await escrow.depositorApproval()).to.be.true;
      expect(await escrow.state()).to.equal(State.FUNDED); // Still funded, waiting for beneficiary

      const beneficiaryBalanceBefore = await ethers.provider.getBalance(beneficiary.address);

      const tx = await escrow.connect(beneficiary).release();
      const receipt = await tx.wait();

      expect(await escrow.state()).to.equal(State.RELEASED);

      const beneficiaryBalanceAfter = await ethers.provider.getBalance(beneficiary.address);
      // Account for gas spent by beneficiary calling release
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      expect(beneficiaryBalanceAfter + gasCost - beneficiaryBalanceBefore).to.equal(depositAmount);
    });

    it('should not release when only depositor approves', async function () {
      await escrow.connect(depositor).release();
      expect(await escrow.state()).to.equal(State.FUNDED);
    });

    it('should not release when only beneficiary approves', async function () {
      await escrow.connect(beneficiary).release();
      expect(await escrow.state()).to.equal(State.FUNDED);
    });

    it('should reject release from outsider', async function () {
      await expect(
        escrow.connect(outsider).release(),
      ).to.be.revertedWith('Escrow: caller is not a party or arbiter');
    });

    it('should reject release when not funded', async function () {
      // Release first via arbiter
      await escrow.connect(arbiter).release();
      expect(await escrow.state()).to.equal(State.RELEASED);

      // Try to release again
      await expect(
        escrow.connect(arbiter).release(),
      ).to.be.revertedWith('Escrow: invalid state for this operation');
    });
  });

  describe('refund', function () {
    beforeEach(async function () {
      await escrow.connect(depositor).deposit({ value: depositAmount });
    });

    it('should refund when arbiter calls refund', async function () {
      const depositorBalanceBefore = await ethers.provider.getBalance(depositor.address);

      await expect(escrow.connect(arbiter).refund())
        .to.emit(escrow, 'Refunded')
        .withArgs(depositor.address, depositAmount);

      expect(await escrow.state()).to.equal(State.REFUNDED);
      expect(await escrow.amount()).to.equal(0);

      const depositorBalanceAfter = await ethers.provider.getBalance(depositor.address);
      expect(depositorBalanceAfter - depositorBalanceBefore).to.equal(depositAmount);
    });

    it('should reject refund from non-arbiter without both approvals', async function () {
      await expect(
        escrow.connect(depositor).refund(),
      ).to.be.revertedWith('Escrow: both parties must approve refund');
    });

    it('should reject refund from outsider', async function () {
      await expect(
        escrow.connect(outsider).refund(),
      ).to.be.revertedWith('Escrow: caller is not a party or arbiter');
    });

    it('should allow refund from frozen state by arbiter', async function () {
      await escrow.connect(arbiter).freeze();
      expect(await escrow.state()).to.equal(State.FROZEN);

      await expect(escrow.connect(arbiter).refund())
        .to.emit(escrow, 'Refunded')
        .withArgs(depositor.address, depositAmount);

      expect(await escrow.state()).to.equal(State.REFUNDED);
    });

    it('should reject refund in RELEASED state', async function () {
      await escrow.connect(arbiter).release();

      await expect(
        escrow.connect(arbiter).refund(),
      ).to.be.revertedWith('Escrow: can only refund when funded or frozen');
    });
  });

  describe('freeze', function () {
    beforeEach(async function () {
      await escrow.connect(depositor).deposit({ value: depositAmount });
    });

    it('should freeze the escrow when called by arbiter', async function () {
      await expect(escrow.connect(arbiter).freeze())
        .to.emit(escrow, 'Frozen')
        .withArgs(arbiter.address);

      expect(await escrow.state()).to.equal(State.FROZEN);
    });

    it('should reject freeze from non-arbiter', async function () {
      await expect(
        escrow.connect(depositor).freeze(),
      ).to.be.revertedWith('Escrow: caller is not the arbiter');
    });

    it('should reject freeze when not in FUNDED state', async function () {
      await escrow.connect(arbiter).freeze();

      await expect(
        escrow.connect(arbiter).freeze(),
      ).to.be.revertedWith('Escrow: invalid state for this operation');
    });
  });

  describe('releasePartial', function () {
    beforeEach(async function () {
      await escrow.connect(depositor).deposit({ value: depositAmount });
    });

    it('should release a partial amount to beneficiary', async function () {
      const partialAmount = ethers.parseEther('3');
      const beneficiaryBalanceBefore = await ethers.provider.getBalance(beneficiary.address);

      await expect(escrow.connect(arbiter).releasePartial(partialAmount))
        .to.emit(escrow, 'PartialRelease')
        .withArgs(beneficiary.address, partialAmount);

      expect(await escrow.amount()).to.equal(depositAmount - partialAmount);
      expect(await escrow.state()).to.equal(State.FUNDED);

      const beneficiaryBalanceAfter = await ethers.provider.getBalance(beneficiary.address);
      expect(beneficiaryBalanceAfter - beneficiaryBalanceBefore).to.equal(partialAmount);
    });

    it('should set state to RELEASED when full amount is partially released', async function () {
      await escrow.connect(arbiter).releasePartial(depositAmount);
      expect(await escrow.state()).to.equal(State.RELEASED);
      expect(await escrow.amount()).to.equal(0);
    });

    it('should allow multiple partial releases', async function () {
      const firstRelease = ethers.parseEther('3');
      const secondRelease = ethers.parseEther('4');

      await escrow.connect(arbiter).releasePartial(firstRelease);
      expect(await escrow.amount()).to.equal(depositAmount - firstRelease);

      await escrow.connect(arbiter).releasePartial(secondRelease);
      expect(await escrow.amount()).to.equal(depositAmount - firstRelease - secondRelease);
    });

    it('should reject partial release from non-arbiter', async function () {
      await expect(
        escrow.connect(depositor).releasePartial(ethers.parseEther('1')),
      ).to.be.revertedWith('Escrow: caller is not the arbiter');
    });

    it('should reject partial release exceeding balance', async function () {
      const tooMuch = ethers.parseEther('11');
      await expect(
        escrow.connect(arbiter).releasePartial(tooMuch),
      ).to.be.revertedWith('Escrow: amount exceeds escrow balance');
    });

    it('should reject zero partial release', async function () {
      await expect(
        escrow.connect(arbiter).releasePartial(0),
      ).to.be.revertedWith('Escrow: amount must be greater than zero');
    });

    it('should allow partial release from FROZEN state', async function () {
      await escrow.connect(arbiter).freeze();

      const partialAmount = ethers.parseEther('5');
      await expect(escrow.connect(arbiter).releasePartial(partialAmount))
        .to.emit(escrow, 'PartialRelease')
        .withArgs(beneficiary.address, partialAmount);
    });

    it('should reject partial release in RELEASED state', async function () {
      await escrow.connect(arbiter).release();

      await expect(
        escrow.connect(arbiter).releasePartial(ethers.parseEther('1')),
      ).to.be.revertedWith('Escrow: invalid state for partial release');
    });
  });

  describe('State Transitions', function () {
    it('AWAITING_DEPOSIT -> FUNDED (via deposit)', async function () {
      expect(await escrow.state()).to.equal(State.AWAITING_DEPOSIT);
      await escrow.connect(depositor).deposit({ value: depositAmount });
      expect(await escrow.state()).to.equal(State.FUNDED);
    });

    it('FUNDED -> RELEASED (via arbiter release)', async function () {
      await escrow.connect(depositor).deposit({ value: depositAmount });
      await escrow.connect(arbiter).release();
      expect(await escrow.state()).to.equal(State.RELEASED);
    });

    it('FUNDED -> REFUNDED (via arbiter refund)', async function () {
      await escrow.connect(depositor).deposit({ value: depositAmount });
      await escrow.connect(arbiter).refund();
      expect(await escrow.state()).to.equal(State.REFUNDED);
    });

    it('FUNDED -> FROZEN (via arbiter freeze)', async function () {
      await escrow.connect(depositor).deposit({ value: depositAmount });
      await escrow.connect(arbiter).freeze();
      expect(await escrow.state()).to.equal(State.FROZEN);
    });

    it('FROZEN -> REFUNDED (via arbiter refund)', async function () {
      await escrow.connect(depositor).deposit({ value: depositAmount });
      await escrow.connect(arbiter).freeze();
      await escrow.connect(arbiter).refund();
      expect(await escrow.state()).to.equal(State.REFUNDED);
    });

    it('FROZEN -> RELEASED (via full partial release)', async function () {
      await escrow.connect(depositor).deposit({ value: depositAmount });
      await escrow.connect(arbiter).freeze();
      await escrow.connect(arbiter).releasePartial(depositAmount);
      expect(await escrow.state()).to.equal(State.RELEASED);
    });
  });

  describe('Unauthorized Access', function () {
    beforeEach(async function () {
      await escrow.connect(depositor).deposit({ value: depositAmount });
    });

    it('outsider cannot deposit', async function () {
      // Create a new escrow that is still awaiting deposit
      const Escrow = await ethers.getContractFactory('Escrow');
      const newEscrow = await Escrow.deploy(
        ethers.keccak256(ethers.toUtf8Bytes('new-contract')),
        depositor.address,
        beneficiary.address,
        arbiter.address,
      );
      await newEscrow.waitForDeployment();

      await expect(
        newEscrow.connect(outsider).deposit({ value: depositAmount }),
      ).to.be.revertedWith('Escrow: caller is not the depositor');
    });

    it('outsider cannot release', async function () {
      await expect(
        escrow.connect(outsider).release(),
      ).to.be.revertedWith('Escrow: caller is not a party or arbiter');
    });

    it('outsider cannot refund', async function () {
      await expect(
        escrow.connect(outsider).refund(),
      ).to.be.revertedWith('Escrow: caller is not a party or arbiter');
    });

    it('outsider cannot freeze', async function () {
      await expect(
        escrow.connect(outsider).freeze(),
      ).to.be.revertedWith('Escrow: caller is not the arbiter');
    });

    it('outsider cannot partial release', async function () {
      await expect(
        escrow.connect(outsider).releasePartial(ethers.parseEther('1')),
      ).to.be.revertedWith('Escrow: caller is not the arbiter');
    });

    it('depositor cannot freeze', async function () {
      await expect(
        escrow.connect(depositor).freeze(),
      ).to.be.revertedWith('Escrow: caller is not the arbiter');
    });

    it('beneficiary cannot freeze', async function () {
      await expect(
        escrow.connect(beneficiary).freeze(),
      ).to.be.revertedWith('Escrow: caller is not the arbiter');
    });

    it('depositor cannot partial release', async function () {
      await expect(
        escrow.connect(depositor).releasePartial(ethers.parseEther('1')),
      ).to.be.revertedWith('Escrow: caller is not the arbiter');
    });
  });
});
