import { Injectable, NestMiddleware, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { AuthenticatedRequest } from './auth.middleware';

/**
 * Rate limit configuration for a route group.
 */
interface RateLimitConfig {
  windowMs: number;   // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the window
}

/**
 * Route group patterns and their rate limit configurations.
 * More restrictive limits for sensitive or expensive operations.
 */
const ROUTE_LIMITS: Array<{ pattern: RegExp; config: RateLimitConfig; name: string }> = [
  {
    name: 'auth',
    pattern: /^\/api\/v1\/auth\//,
    config: { windowMs: 60_000, maxRequests: 10 }, // 10 req/min - prevent brute force
  },
  {
    name: 'ai',
    pattern: /^\/api\/v1\/ai\//,
    config: { windowMs: 60_000, maxRequests: 20 }, // 20 req/min - expensive operations
  },
  {
    name: 'webhooks',
    pattern: /^\/api\/v1\/webhooks\//,
    config: { windowMs: 60_000, maxRequests: 500 }, // 500 req/min - high-throughput webhooks
  },
  {
    name: 'general',
    pattern: /^\/api\//,
    config: { windowMs: 60_000, maxRequests: 100 }, // 100 req/min - default
  },
];

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private redis: Redis | null = null;
  private readonly useRedis: boolean;

  // In-memory fallback store when Redis is unavailable
  private readonly memoryStore = new Map<string, { count: number; resetAt: number }>();
  private memoryCleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.useRedis = !!redisUrl;

    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            if (times > 3) {
              this.logger.warn('Redis connection failed. Falling back to in-memory rate limiting.');
              return null; // Stop retrying
            }
            return Math.min(times * 200, 2000);
          },
          lazyConnect: true,
        });

        this.redis.on('error', (err) => {
          this.logger.warn(`Redis error: ${err.message}. Using in-memory fallback.`);
        });

        this.redis.connect().catch(() => {
          this.logger.warn('Could not connect to Redis. Using in-memory rate limiting.');
          this.redis = null;
        });
      } catch {
        this.logger.warn('Redis initialization failed. Using in-memory rate limiting.');
        this.redis = null;
      }
    } else {
      this.logger.log('No REDIS_URL configured. Using in-memory rate limiting.');
    }

    // Periodic cleanup of expired in-memory entries
    this.memoryCleanupInterval = setInterval(() => {
      this.cleanupMemoryStore();
    }, 60_000);
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authenticatedReq = req as AuthenticatedRequest;
    const identifier = this.getIdentifier(authenticatedReq);
    const limitConfig = this.getLimitConfig(req.path);

    try {
      const result = this.redis
        ? await this.checkRedisLimit(identifier, limitConfig.config)
        : this.checkMemoryLimit(identifier, limitConfig.config);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limitConfig.config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
      res.setHeader('X-RateLimit-Reset', result.resetAt);
      res.setHeader('X-RateLimit-Policy', limitConfig.name);

      if (result.remaining < 0) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
        res.setHeader('Retry-After', Math.max(1, retryAfter));

        this.logger.warn(
          `Rate limit exceeded for ${identifier} on ${req.method} ${req.path} ` +
          `(policy: ${limitConfig.name}, limit: ${limitConfig.config.maxRequests}/min)`,
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Maximum ${limitConfig.config.maxRequests} requests per minute for this endpoint.`,
            retryAfter: Math.max(1, retryAfter),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // On rate limit check failure, allow the request through (fail-open)
      this.logger.error(`Rate limit check failed: ${(error as Error).message}. Allowing request.`);
      next();
    }
  }

  /**
   * Get a unique identifier for rate limiting.
   * Uses user ID if authenticated, otherwise falls back to IP address.
   */
  private getIdentifier(req: AuthenticatedRequest): string {
    if (req.user?.sub) {
      return `user:${req.user.sub}`;
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ip = (typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0] || '').split(',')[0]?.trim();
      return `ip:${ip}`;
    }

    return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
  }

  /**
   * Match the request path against route patterns and return the appropriate rate limit.
   * Returns the first matching pattern (patterns are ordered by specificity).
   */
  private getLimitConfig(path: string): { name: string; config: RateLimitConfig } {
    for (const route of ROUTE_LIMITS) {
      if (route.pattern.test(path)) {
        return { name: route.name, config: route.config };
      }
    }
    // Fallback to general limit
    return { name: 'general', config: { windowMs: 60_000, maxRequests: 100 } };
  }

  /**
   * Redis-based sliding window rate limiting using sorted sets.
   */
  private async checkRedisLimit(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<{ remaining: number; resetAt: number }> {
    if (!this.redis) {
      return this.checkMemoryLimit(identifier, config);
    }

    const now = Date.now();
    const windowStart = now - config.windowMs;
    const key = `ratelimit:${identifier}`;

    const pipeline = this.redis.pipeline();
    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    // Add current request
    pipeline.zadd(key, now.toString(), `${now}:${Math.random().toString(36).slice(2, 8)}`);
    // Count requests in window
    pipeline.zcard(key);
    // Set key expiration
    pipeline.pexpire(key, config.windowMs);

    const results = await pipeline.exec();
    if (!results) {
      return this.checkMemoryLimit(identifier, config);
    }

    const count = (results[2]?.[1] as number) || 0;
    const remaining = config.maxRequests - count;
    const resetAt = now + config.windowMs;

    return { remaining, resetAt };
  }

  /**
   * In-memory fixed window rate limiting (fallback when Redis is unavailable).
   */
  private checkMemoryLimit(
    identifier: string,
    config: RateLimitConfig,
  ): { remaining: number; resetAt: number } {
    const now = Date.now();
    const existing = this.memoryStore.get(identifier);

    if (!existing || existing.resetAt <= now) {
      // New window
      this.memoryStore.set(identifier, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      return {
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
      };
    }

    // Increment existing window
    existing.count++;
    const remaining = config.maxRequests - existing.count;

    return {
      remaining,
      resetAt: existing.resetAt,
    };
  }

  /**
   * Periodically remove expired entries from the in-memory store.
   */
  private cleanupMemoryStore(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, value] of this.memoryStore.entries()) {
      if (value.resetAt <= now) {
        this.memoryStore.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired rate limit entries from memory store.`);
    }
  }

  /**
   * Cleanup on module destroy.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
    }
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
