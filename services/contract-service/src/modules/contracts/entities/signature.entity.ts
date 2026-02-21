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

export enum SignatureType {
  SIMPLE = 'SIMPLE',
  ADVANCED = 'ADVANCED',
  QUALIFIED = 'QUALIFIED',
  GOVBR = 'GOVBR',
  ICP_BRASIL = 'ICP_BRASIL',
}

@Entity('signatures')
@Index(['contractId', 'userId'], { unique: true })
@Index(['contractId'])
@Index(['userId'])
export class Signature {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  contractId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 128 })
  signatureHash!: string;

  @Column({
    type: 'enum',
    enum: SignatureType,
    default: SignatureType.SIMPLE,
  })
  signatureType!: SignatureType;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  signedAt!: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'boolean', default: false })
  govbrValidated!: boolean;

  @Column({ type: 'varchar', length: 256, nullable: true })
  certificateId!: string | null;

  @ManyToOne(() => Contract, (contract) => contract.signatures, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contractId' })
  contract!: Contract;
}
