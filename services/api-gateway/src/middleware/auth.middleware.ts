import { Injectable, NestMiddleware, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

/**
 * Decoded JWT payload structure expected from the Auth Service.
 */
export interface JwtPayload {
  sub: string;          // User ID
  email: string;        // User email
  roles: string[];      // User roles (e.g., ['user', 'admin'])
  permissions?: string[]; // Optional fine-grained permissions
  iat: number;          // Issued at
  exp: number;          // Expiration
  iss?: string;         // Issuer
}

/**
 * Extended Express Request with user context attached after JWT verification.
 */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Public routes that skip JWT verification.
 * These patterns are matched against the request path.
 */
const PUBLIC_ROUTE_PATTERNS: RegExp[] = [
  /^\/api\/v1\/auth\/login$/,
  /^\/api\/v1\/auth\/register$/,
  /^\/api\/v1\/auth\/refresh$/,
  /^\/api\/v1\/auth\/forgot-password$/,
  /^\/api\/v1\/auth\/reset-password$/,
  /^\/api\/v1\/auth\/verify-email$/,
  /^\/api\/v1\/webhooks\/.*/,
  /^\/health(\/.*)?$/,
  /^\/docs(\/.*)?$/,
];

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);
  private readonly jwtSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET', 'tabeliao-jwt-secret-change-in-production');

    if (this.jwtSecret === 'tabeliao-jwt-secret-change-in-production') {
      this.logger.warn(
        'Using default JWT secret. Set JWT_SECRET environment variable for production!',
      );
    }
  }

  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    // Check if the route is public
    if (this.isPublicRoute(req.path)) {
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      this.logger.debug(`No Authorization header for ${req.method} ${req.path}`);
      throw new UnauthorizedException('Authorization header is required');
    }

    // Support both "Bearer <token>" and raw token
    const parts = authHeader.split(' ');
    let token: string;

    if (parts.length === 2 && parts[0]?.toLowerCase() === 'bearer') {
      token = parts[1] as string;
    } else if (parts.length === 1) {
      token = parts[0] as string;
    } else {
      throw new UnauthorizedException('Invalid Authorization header format. Use: Bearer <token>');
    }

    if (!token) {
      throw new UnauthorizedException('Token is required');
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256', 'HS384', 'HS512', 'RS256'],
        issuer: this.configService.get<string>('JWT_ISSUER', undefined),
      }) as JwtPayload;

      // Validate essential claims
      if (!decoded.sub) {
        throw new UnauthorizedException('Token missing required claim: sub');
      }

      if (!decoded.email) {
        throw new UnauthorizedException('Token missing required claim: email');
      }

      // Attach the decoded user to the request
      req.user = decoded;

      // Set user context headers for downstream services
      res.setHeader('X-User-ID', decoded.sub);

      this.logger.debug(
        `Authenticated user ${decoded.sub} (${decoded.email}) for ${req.method} ${req.path}`,
      );

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof jwt.TokenExpiredError) {
        this.logger.debug(`Expired token for ${req.method} ${req.path}`);
        throw new UnauthorizedException('Token has expired');
      }

      if (error instanceof jwt.JsonWebTokenError) {
        this.logger.debug(`Invalid token for ${req.method} ${req.path}: ${error.message}`);
        throw new UnauthorizedException('Invalid token');
      }

      if (error instanceof jwt.NotBeforeError) {
        this.logger.debug(`Token not yet active for ${req.method} ${req.path}`);
        throw new UnauthorizedException('Token is not yet active');
      }

      this.logger.error(`Unexpected auth error for ${req.method} ${req.path}`, (error as Error).stack);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Check if the current request path matches any public route pattern.
   */
  private isPublicRoute(path: string): boolean {
    return PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.test(path));
  }
}
