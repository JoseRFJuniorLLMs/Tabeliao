import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Arbitrator } from './arbitrator.entity';

@Entity('arbitrator_ratings')
@Index(['arbitratorId', 'disputeId'], { unique: true })
@Index(['userId'])
export class ArbitratorRating {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  arbitratorId!: string;

  @Column({ type: 'uuid' })
  disputeId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'float' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  feedback!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne(() => Arbitrator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'arbitratorId' })
  arbitrator!: Arbitrator;
}
