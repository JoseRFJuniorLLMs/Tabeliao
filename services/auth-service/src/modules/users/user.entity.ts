import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  NOTARY = 'notary',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum KycLevel {
  NONE = 'none',
  BASIC = 'basic',
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  FULL = 'full',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index('idx_users_email')
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 14, unique: true })
  @Index('idx_users_cpf')
  cpf!: string;

  @Column({ type: 'varchar', length: 18, nullable: true })
  @Index('idx_users_cnpj')
  cnpj!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({
    type: 'enum',
    enum: KycLevel,
    default: KycLevel.NONE,
  })
  kycLevel!: KycLevel;

  @Column({ type: 'float', default: 0 })
  riskScore!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index('idx_users_govbr_id')
  govbrId!: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role!: UserRole;

  @Column({ type: 'varchar', length: 255, nullable: true })
  twoFactorSecret!: string | null;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled!: boolean;

  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emailVerificationToken!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpires!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetToken!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpires!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail(): void {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }
}
