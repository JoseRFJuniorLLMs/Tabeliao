import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum InvoiceStatus {
  PENDING = 'PENDING',
  OVERDUE = 'OVERDUE',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export interface InvoiceSplit {
  /** Receiving user ID */
  userId: string;
  /** Percentage of total (0-100) */
  percentage: number;
  /** Calculated amount in BRL */
  amount: number;
}

export interface InvoiceMetadata {
  [key: string]: unknown;
}

@Entity('invoices')
@Index(['contractId'])
@Index(['payerId'])
@Index(['payeeId'])
@Index(['status'])
@Index(['dueDate'])
@Index(['contractId', 'installmentNumber'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  contractId!: string;

  @Column({ type: 'varchar', length: 255 })
  payerId!: string;

  @Column({ type: 'varchar', length: 255 })
  payeeId!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  originalAmount!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: '0.00' })
  fineAmount!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: '0.00' })
  interestAmount!: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  totalAmount!: string;

  @Column({ type: 'varchar', length: 3, default: 'BRL' })
  currency!: string;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PENDING,
  })
  status!: InvoiceStatus;

  @Column({ type: 'date' })
  dueDate!: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod!: string | null;

  @Column({ type: 'int', nullable: true })
  installmentNumber!: number | null;

  @Column({ type: 'int', nullable: true })
  totalInstallments!: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true })
  pixCode!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  boletoCode!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  boletoUrl!: string | null;

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  splits!: InvoiceSplit[];

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  metadata!: InvoiceMetadata;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
