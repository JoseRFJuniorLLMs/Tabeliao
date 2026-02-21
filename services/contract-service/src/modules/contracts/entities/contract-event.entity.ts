import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Contract } from './contract.entity';

export enum ContractEventType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  SIGNED = 'SIGNED',
  ALL_SIGNED = 'ALL_SIGNED',
  ACTIVATED = 'ACTIVATED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
  RENEWED = 'RENEWED',
  RENEWAL_PROPOSED = 'RENEWAL_PROPOSED',
  RENEWAL_APPROVED = 'RENEWAL_APPROVED',
  DISPUTED = 'DISPUTED',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  BLOCKCHAIN_REGISTERED = 'BLOCKCHAIN_REGISTERED',
  PDF_GENERATED = 'PDF_GENERATED',
  ADJUSTMENT_APPLIED = 'ADJUSTMENT_APPLIED',
  NOTIFICATION_SENT = 'NOTIFICATION_SENT',
  FINE_APPLIED = 'FINE_APPLIED',
}

@Entity('contract_events')
@Index(['contractId', 'createdAt'])
@Index(['contractId'])
@Index(['eventType'])
export class ContractEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  contractId!: string;

  @Column({ type: 'varchar', length: 50 })
  eventType!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @Column({ type: 'uuid', nullable: true })
  performedBy!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne(() => Contract, (contract) => contract.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contractId' })
  contract!: Contract;
}
