import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import axios, { AxiosInstance } from 'axios';
import { Device } from './entities/device.entity';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly fcmClient: AxiosInstance;
  private readonly fcmProjectId: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {
    this.fcmProjectId = this.configService.get<string>('FCM_PROJECT_ID', '');
    const fcmServerKey = this.configService.get<string>('FCM_SERVER_KEY', '');

    this.fcmClient = axios.create({
      baseURL: 'https://fcm.googleapis.com',
      headers: {
        'Authorization': `key=${fcmServerKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    this.logger.log('PushService initialized');
  }

  /**
   * Send a push notification to a specific user on all their active devices.
   */
  async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const devices = await this.deviceRepository.find({
      where: { userId, isActive: true },
    });

    if (devices.length === 0) {
      this.logger.warn(`No active devices found for user ${userId}`);
      return;
    }

    const tokens = devices.map((d) => d.deviceToken);
    await this.sendToTokens(tokens, title, body, data);

    // Update lastUsedAt for all devices
    const deviceIds = devices.map((d) => d.id);
    await this.deviceRepository.update(deviceIds, { lastUsedAt: new Date() });

    this.logger.log(`Push sent to ${devices.length} device(s) for user ${userId}`);
  }

  /**
   * Register a device for push notifications.
   */
  async registerDevice(
    userId: string,
    deviceToken: string,
    platform: 'ios' | 'android' | 'web',
  ): Promise<Device> {
    // Check if device token already exists for this user
    let device = await this.deviceRepository.findOne({
      where: { userId, deviceToken },
    });

    if (device) {
      // Reactivate if it was deactivated
      device.isActive = true;
      device.platform = platform;
      device.lastUsedAt = new Date();
      device = await this.deviceRepository.save(device);
      this.logger.log(`Device re-registered for user ${userId} [${platform}]`);
    } else {
      device = this.deviceRepository.create({
        userId,
        deviceToken,
        platform,
        isActive: true,
      });
      device = await this.deviceRepository.save(device);
      this.logger.log(`New device registered for user ${userId} [${platform}]`);
    }

    return device;
  }

  /**
   * Unregister (deactivate) a device for push notifications.
   */
  async unregisterDevice(userId: string, deviceToken: string): Promise<void> {
    const result = await this.deviceRepository.update(
      { userId, deviceToken },
      { isActive: false },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Device unregistered for user ${userId}`);
    } else {
      this.logger.warn(`No device found to unregister for user ${userId}`);
    }
  }

  /**
   * Send a push notification to multiple users.
   */
  async sendBulkPush(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const devices = await this.deviceRepository.find({
      where: { userId: In(userIds), isActive: true },
    });

    if (devices.length === 0) {
      this.logger.warn(`No active devices found for bulk push to ${userIds.length} users`);
      return;
    }

    const tokens = devices.map((d) => d.deviceToken);

    // FCM supports up to 500 tokens per multicast request
    const batchSize = 500;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      await this.sendToTokens(batch, title, body, data);
    }

    this.logger.log(
      `Bulk push sent to ${devices.length} device(s) across ${userIds.length} user(s)`,
    );
  }

  /**
   * Send FCM message to an array of device tokens.
   */
  private async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      const payload = {
        registration_ids: tokens,
        notification: {
          title,
          body,
          icon: 'ic_tabeliao',
          sound: 'default',
          click_action: 'OPEN_APP',
        },
        data: {
          ...data,
          title,
          body,
        },
        priority: 'high',
        content_available: true,
      };

      const response = await this.fcmClient.post('/fcm/send', payload);
      const responseData = response.data as Record<string, unknown>;
      const failure = responseData['failure'] as number | undefined;

      if (failure && failure > 0) {
        this.logger.warn(`FCM reported ${failure} failure(s) out of ${tokens.length} tokens`);
        await this.handleFcmFailures(tokens, responseData);
      }
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send FCM push: ${errMessage}`);
      throw error;
    }
  }

  /**
   * Handle FCM response failures by deactivating invalid tokens.
   */
  private async handleFcmFailures(
    tokens: string[],
    responseData: Record<string, unknown>,
  ): Promise<void> {
    const results = responseData['results'] as Array<Record<string, unknown>> | undefined;
    if (!results) return;

    const invalidTokenErrors = new Set([
      'NotRegistered',
      'InvalidRegistration',
      'MismatchSenderId',
    ]);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (!result) continue;
      const error = result['error'] as string | undefined;
      const token = tokens[i];
      if (error && token && invalidTokenErrors.has(error)) {
        this.logger.log(`Deactivating invalid FCM token: ${token.substring(0, 20)}...`);
        await this.deviceRepository.update({ deviceToken: token }, { isActive: false });
      }
    }
  }
}
