import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Signature } from './signature.entity';
import { ContractEvent } from './contract-event.entity';

export enum ContractType {
  RENTAL = 'RENTAL',
  SERVICE = 'SERVICE',
  FREELANCER = 'FREELANCER',
  NDA = 'NDA',
  LOAN = 'LOAN',
  PURCHASE_SALE = 'PURCHASE_SALE',
  EMPLOYMENT = 'EMPLOYMENT',
  PARTNERSHIP = 'PARTNERSHIP',
  OTHER = 'OTHER',
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING_SIGNATURES = 'PENDING_SIGNATURES',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  TERMINATED = 'TERMINATED',
  DISPUTED = 'DISPUTED',
  RENEWAL_PROPOSED = 'RENEWAL_PROPOSED',
  RENEWED = 'RENEWED',
}

export interface ContractParty {
  userId: string;
  name: string;
  document: string;
  email: string;
  role: string;
  signed: boolean;
  signedAt?: string;
}

export interface ContractClause {
  number: number;
  title: string;
  content: string;
  isOptional: boolean;
}

@Entity('contracts')
@Index(['createdBy', 'status'])
@Index(['contractNumber'], { unique: true })
@Index(['status'])
@Index(['type'])
@Index(['expiresAt'])
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  contractNumber!: string;

  @Column({ type: 'varchar', length: 500 })
  title!: string;

  @Column({ type: 'enum', enum: ContractType, default: ContractType.OTHER })
  type!: ContractType;

  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.DRAFT })
  status!: ContractStatus;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ type: 'text', nullable: true })
  rawPrompt!: string | null;

  @Column({ type: 'jsonb', default: [] })
  parties!: ContractParty[];

  @Column({ type: 'jsonb', default: [] })
  clauses!: ContractClause[];

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 128, nullable: true })
  blockchainHash!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  blockchainTxId!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  escrowId!: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  totalValue!: string | null;

  @Column({ type: 'varchar', length: 3, default: 'BRL' })
  currency!: string;

  @Column({ type: 'timestamp', nullable: true })
  renewalDate!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  @OneToMany(() => Signature, (signature) => signature.contract, {
    cascade: true,
    eager: false,
  })
  signatures!: Signature[];

  @OneToMany(() => ContractEvent, (event) => event.contract, {
    cascade: true,
    eager: false,
  })
  events!: ContractEvent[];
}
