import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum EscrowStatus {
  PENDING = 'PENDING',
  FUNDED = 'FUNDED',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
  FROZEN = 'FROZEN',
  PARTIALLY_RELEASED = 'PARTIALLY_RELEASED',
}

export interface EscrowMilestone {
  id: string;
  description: string;
  amount: number;
  status: 'PENDING' | 'RELEASED';
  releasedAt?: string;
  transactionHash?: string;
}

@Entity('escrows')
export class EscrowEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'contract_id', type: 'varchar', length: 255 })
  @Index('idx_escrow_contract_id', { unique: true })
  contractId!: string;

  @Column({ name: 'blockchain_address', type: 'varchar', length: 42, nullable: true })
  @Index('idx_escrow_blockchain_address')
  blockchainAddress!: string | null;

  @Column({ type: 'decimal', precision: 36, scale: 18, default: 0 })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'MATIC' })
  currency!: string;

  @Column({ name: 'depositor_address', type: 'varchar', length: 42 })
  depositorAddress!: string;

  @Column({ name: 'beneficiary_address', type: 'varchar', length: 42 })
  beneficiaryAddress!: string;

  @Column({
    type: 'enum',
    enum: EscrowStatus,
    default: EscrowStatus.PENDING,
  })
  @Index('idx_escrow_status')
  status!: EscrowStatus;

  @Column({ name: 'deposit_tx_hash', type: 'varchar', length: 66, nullable: true })
  depositTxHash!: string | null;

  @Column({ name: 'release_tx_hash', type: 'varchar', length: 66, nullable: true })
  releaseTxHash!: string | null;

  @Column({ name: 'refund_tx_hash', type: 'varchar', length: 66, nullable: true })
  refundTxHash!: string | null;

  @Column({ name: 'freeze_reason', type: 'text', nullable: true })
  freezeReason!: string | null;

  @Column({ name: 'milestones', type: 'jsonb', nullable: true })
  milestones!: EscrowMilestone[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
