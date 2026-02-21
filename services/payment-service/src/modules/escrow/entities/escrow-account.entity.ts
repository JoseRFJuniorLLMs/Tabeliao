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
  PARTIALLY_FUNDED = 'PARTIALLY_FUNDED',
  FUNDED = 'FUNDED',
  PARTIALLY_RELEASED = 'PARTIALLY_RELEASED',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
  FROZEN = 'FROZEN',
}

export interface EscrowMilestone {
  /** Milestone identifier */
  id: string;
  /** Human-readable label */
  label: string;
  /** Amount allocated to this milestone */
  amount: number;
  /** Whether this milestone has been released */
  released: boolean;
  /** Release timestamp */
  releasedAt?: string;
  /** Who approved the release */
  approvedBy?: string[];
}

@Entity('escrow_accounts')
@Index(['contractId'])
@Index(['depositorId'])
@Index(['beneficiaryId'])
@Index(['status'])
export class EscrowAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  contractId!: string;

  @Column({ type: 'varchar', length: 255 })
  depositorId!: string;

  @Column({ type: 'varchar', length: 255 })
  beneficiaryId!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalAmount!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  depositedAmount!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  releasedAmount!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  frozenAmount!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  platformFee!: string;

  @Column({
    type: 'enum',
    enum: EscrowStatus,
    default: EscrowStatus.PENDING,
  })
  status!: EscrowStatus;

  @Column({ type: 'varchar', length: 3, default: 'BRL' })
  currency!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pspAccountId!: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  depositDeadline!: Date | null;

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  milestones!: EscrowMilestone[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  disputeId!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
