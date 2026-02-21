import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { DisputeMessage } from './dispute-message.entity';

export enum DisputeStatus {
  OPENED = 'OPENED',
  UNDER_MEDIATION = 'UNDER_MEDIATION',
  UNDER_ARBITRATION = 'UNDER_ARBITRATION',
  AI_REVIEW = 'AI_REVIEW',
  AWAITING_ACCEPTANCE = 'AWAITING_ACCEPTANCE',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum DisputeType {
  BREACH_OF_CONTRACT = 'BREACH_OF_CONTRACT',
  PAYMENT_DISPUTE = 'PAYMENT_DISPUTE',
  QUALITY_DISPUTE = 'QUALITY_DISPUTE',
  DELIVERY_DISPUTE = 'DELIVERY_DISPUTE',
  OTHER = 'OTHER',
}

export interface EvidenceItem {
  id: string;
  type: string;
  url: string;
  description: string;
  uploadedBy: string;
  uploadedAt: string;
}

@Entity('disputes')
@Index(['openedBy', 'status'])
@Index(['respondentId', 'status'])
@Index(['contractId'])
@Index(['status'])
@Index(['arbitratorId'])
@Index(['mediatorId'])
@Index(['deadline'])
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  contractId!: string;

  @Column({ type: 'uuid' })
  openedBy!: string;

  @Column({ type: 'uuid' })
  respondentId!: string;

  @Column({
    type: 'enum',
    enum: DisputeStatus,
    default: DisputeStatus.OPENED,
  })
  status!: DisputeStatus;

  @Column({
    type: 'enum',
    enum: DisputeType,
  })
  type!: DisputeType;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  disputeValue!: string;

  @Column({ type: 'jsonb', default: [] })
  evidence!: EvidenceItem[];

  @Column({ type: 'uuid', nullable: true })
  arbitratorId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  mediatorId!: string | null;

  @Column({ type: 'text', nullable: true })
  aiAnalysis!: string | null;

  @Column({ type: 'text', nullable: true })
  resolution!: string | null;

  @Column({ type: 'boolean', default: false })
  resolutionAcceptedByPlaintiff!: boolean;

  @Column({ type: 'boolean', default: false })
  resolutionAcceptedByDefendant!: boolean;

  @Column({ type: 'date' })
  deadline!: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  filedAt!: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  @OneToMany(() => DisputeMessage, (message) => message.dispute, {
    cascade: true,
    eager: false,
  })
  messages!: DisputeMessage[];
}
