import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from './auth.middleware';

/**
 * Structured log entry for each HTTP request/response cycle.
 */
interface RequestLog {
  timestamp: string;
  requestId: string;
  correlationId: string;
  method: string;
  url: string;
  path: string;
  query: Record<string, unknown>;
  statusCode: number;
  responseTimeMs: number;
  contentLength: string | undefined;
  userAgent: string | undefined;
  ip: string;
  userId: string | undefined;
  userEmail: string | undefined;
  referer: string | undefined;
}

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Generate or propagate request ID
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Generate or propagate correlation ID for distributed tracing
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);

    // Capture the original end method to hook into response completion
    const originalEnd = res.end.bind(res);

    res.end = (...args: Parameters<typeof res.end>): Response => {
      const responseTimeMs = Date.now() - startTime;
      const authenticatedReq = req as AuthenticatedRequest;

      const logEntry: RequestLog = {
        timestamp: new Date().toISOString(),
        requestId,
        correlationId,
        method: req.method,
        url: req.originalUrl || req.url,
        path: req.path,
        query: req.query as Record<string, unknown>,
        statusCode: res.statusCode,
        responseTimeMs,
        contentLength: res.getHeader('content-length') as string | undefined,
        userAgent: req.headers['user-agent'],
        ip: this.getClientIp(req),
        userId: authenticatedReq.user?.sub,
        userEmail: authenticatedReq.user?.email,
        referer: req.headers.referer || req.headers.referrer as string | undefined,
      };

      // Log with appropriate level based on status code
      if (res.statusCode >= 500) {
        this.logger.error(JSON.stringify(logEntry));
      } else if (res.statusCode >= 400) {
        this.logger.warn(JSON.stringify(logEntry));
      } else {
        this.logger.log(JSON.stringify(logEntry));
      }

      // Log slow requests
      if (responseTimeMs > 5000) {
        this.logger.warn(
          `Slow request detected: ${req.method} ${req.originalUrl} took ${responseTimeMs}ms`,
        );
      }

      return originalEnd(...args);
    };

    next();
  }

  /**
   * Extract the real client IP, considering proxies and load balancers.
   */
  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = (typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0] || '').split(',');
      return (ips[0] || '').trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return typeof realIp === 'string' ? realIp : (realIp[0] || '');
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}
