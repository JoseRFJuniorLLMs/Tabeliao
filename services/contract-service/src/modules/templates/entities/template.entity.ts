import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ContractType } from '../../contracts/entities/contract.entity';

export interface TemplateVariable {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'cpf' | 'cnpj' | 'address' | 'email';
  required: boolean;
  defaultValue?: string;
  description?: string;
}

@Entity('templates')
@Index(['category', 'isActive'])
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'enum', enum: ContractType })
  category!: ContractType;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'jsonb', default: [] })
  variables!: TemplateVariable[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
