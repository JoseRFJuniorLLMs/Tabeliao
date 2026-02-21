import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Dispute } from './dispute.entity';

export enum SenderRole {
  PLAINTIFF = 'PLAINTIFF',
  DEFENDANT = 'DEFENDANT',
  ARBITRATOR = 'ARBITRATOR',
  MEDIATOR = 'MEDIATOR',
  SYSTEM = 'SYSTEM',
}

export interface MessageAttachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

@Entity('dispute_messages')
@Index(['disputeId', 'createdAt'])
@Index(['senderId'])
export class DisputeMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  disputeId!: string;

  @Column({ type: 'uuid' })
  senderId!: string;

  @Column({
    type: 'enum',
    enum: SenderRole,
  })
  senderRole!: SenderRole;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'jsonb', default: [] })
  attachments!: MessageAttachment[];

  @Column({ type: 'boolean', default: false })
  isPrivate!: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne(() => Dispute, (dispute) => dispute.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'disputeId' })
  dispute!: Dispute;
}
