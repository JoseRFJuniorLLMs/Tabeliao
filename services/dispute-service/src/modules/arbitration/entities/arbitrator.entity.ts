import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('arbitrators')
@Index(['oabNumber', 'oabState'], { unique: true })
@Index(['isAvailable'])
@Index(['rating'])
@Index(['userId'], { unique: true })
export class Arbitrator {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  oabNumber!: string;

  @Column({ type: 'varchar', length: 2 })
  oabState!: string;

  @Column({ type: 'jsonb', default: [] })
  specialties!: string[];

  @Column({ type: 'float', default: 5.0 })
  rating!: number;

  @Column({ type: 'int', default: 0 })
  totalCases!: number;

  @Column({ type: 'int', default: 0 })
  resolvedCases!: number;

  @Column({ type: 'float', default: 0 })
  averageResolutionDays!: number;

  @Column({ type: 'boolean', default: true })
  isAvailable!: boolean;

  @Column({ type: 'int', default: 5 })
  maxConcurrentCases!: number;

  @Column({ type: 'int', default: 0 })
  currentCases!: number;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
