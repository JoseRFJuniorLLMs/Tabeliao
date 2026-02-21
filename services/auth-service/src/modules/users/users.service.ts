import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, KycLevel } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_SALT_ROUNDS = 12;

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  cpf: string;
  cnpj?: string;
  phone?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const existingByEmail = await this.usersRepository.findOne({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (existingByEmail) {
      throw new ConflictException('A user with this email already exists');
    }

    const existingByCpf = await this.usersRepository.findOne({
      where: { cpf: input.cpf },
    });

    if (existingByCpf) {
      throw new ConflictException('A user with this CPF already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

    const user = this.usersRepository.create({
      email: input.email.toLowerCase().trim(),
      password: hashedPassword,
      name: input.name,
      cpf: input.cpf,
      cnpj: input.cnpj || null,
      phone: input.phone || null,
    });

    const savedUser = await this.usersRepository.save(user);
    this.logger.log(`User created: ${savedUser.id} (${savedUser.email})`);

    return savedUser;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByCpf(cpf: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { cpf } });
  }

  async findByGovbrId(govbrId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { govbrId } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.email && dto.email !== user.email) {
      const existingByEmail = await this.usersRepository.findOne({
        where: { email: dto.email.toLowerCase().trim() },
      });

      if (existingByEmail) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    Object.assign(user, dto);
    const updatedUser = await this.usersRepository.save(user);
    this.logger.log(`User updated: ${updatedUser.id}`);

    return updatedUser;
  }

  async updateKycLevel(id: string, kycLevel: KycLevel): Promise<User> {
    const user = await this.findById(id);
    user.kycLevel = kycLevel;
    const updatedUser = await this.usersRepository.save(user);
    this.logger.log(`KYC level updated for user ${id}: ${kycLevel}`);

    return updatedUser;
  }

  async updateRiskScore(id: string, riskScore: number): Promise<User> {
    const user = await this.findById(id);
    user.riskScore = riskScore;
    const updatedUser = await this.usersRepository.save(user);
    this.logger.log(`Risk score updated for user ${id}: ${riskScore}`);

    return updatedUser;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.usersRepository.update(id, { lastLoginAt: new Date() });
  }

  async setEmailVerificationToken(id: string, token: string, expires: Date): Promise<void> {
    await this.usersRepository.update(id, {
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    });
  }

  async verifyEmail(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });
  }

  async setPasswordResetToken(id: string, token: string, expires: Date): Promise<void> {
    await this.usersRepository.update(id, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.usersRepository.update(id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });
  }

  async setTwoFactorSecret(id: string, secret: string): Promise<void> {
    await this.usersRepository.update(id, { twoFactorSecret: secret });
  }

  async enableTwoFactor(id: string): Promise<void> {
    await this.usersRepository.update(id, { twoFactorEnabled: true });
  }

  async disableTwoFactor(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });
  }

  async updateGovbrId(id: string, govbrId: string): Promise<void> {
    await this.usersRepository.update(id, { govbrId });
  }

  sanitizeUser(user: User): Omit<User, 'password' | 'twoFactorSecret' | 'emailVerificationToken' | 'passwordResetToken'> {
    const { password: _p, twoFactorSecret: _t, emailVerificationToken: _e, passwordResetToken: _r, ...sanitized } = user;
    return sanitized;
  }
}
