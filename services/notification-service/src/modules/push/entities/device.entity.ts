import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('devices')
@Index(['userId', 'deviceToken'], { unique: true })
@Index(['userId', 'isActive'])
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'varchar', length: 512 })
  deviceToken!: string;

  @Column({ type: 'varchar', length: 10 })
  platform!: 'ios' | 'android' | 'web';

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  registeredAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastUsedAt!: Date;
}
