import { registerAs } from '@nestjs/config';

export interface ServiceDefinition {
  name: string;
  url: string;
  healthPath: string;
  timeout: number;
}

export interface ServicesConfigType {
  auth: ServiceDefinition;
  contract: ServiceDefinition;
  ai: ServiceDefinition;
  blockchain: ServiceDefinition;
  payment: ServiceDefinition;
  notification: ServiceDefinition;
  dispute: ServiceDefinition;
}

export interface RouteMapping {
  prefix: string;
  serviceKey: keyof ServicesConfigType;
}

/**
 * Route-to-service mapping. Each prefix under /api/v1/ is forwarded
 * to the corresponding microservice.
 */
export const ROUTE_MAPPINGS: RouteMapping[] = [
  { prefix: '/api/v1/auth', serviceKey: 'auth' },
  { prefix: '/api/v1/users', serviceKey: 'auth' },
  { prefix: '/api/v1/kyc', serviceKey: 'auth' },
  { prefix: '/api/v1/contracts', serviceKey: 'contract' },
  { prefix: '/api/v1/templates', serviceKey: 'contract' },
  { prefix: '/api/v1/lifecycle', serviceKey: 'contract' },
  { prefix: '/api/v1/ai', serviceKey: 'ai' },
  { prefix: '/api/v1/blockchain', serviceKey: 'blockchain' },
  { prefix: '/api/v1/payments', serviceKey: 'payment' },
  { prefix: '/api/v1/notifications', serviceKey: 'notification' },
  { prefix: '/api/v1/disputes', serviceKey: 'dispute' },
  { prefix: '/api/v1/arbitration', serviceKey: 'dispute' },
  { prefix: '/api/v1/mediation', serviceKey: 'dispute' },
];

export default registerAs('services', (): ServicesConfigType => ({
  auth: {
    name: 'Auth Service',
    url: process.env['AUTH_SERVICE_URL'] || 'http://auth-service:3001',
    healthPath: '/health',
    timeout: 10000,
  },
  contract: {
    name: 'Contract Service',
    url: process.env['CONTRACT_SERVICE_URL'] || 'http://contract-service:3002',
    healthPath: '/health',
    timeout: 15000,
  },
  ai: {
    name: 'AI Service',
    url: process.env['AI_SERVICE_URL'] || 'http://ai-service:3003',
    healthPath: '/health',
    timeout: 30000, // AI operations can be slower
  },
  blockchain: {
    name: 'Blockchain Service',
    url: process.env['BLOCKCHAIN_SERVICE_URL'] || 'http://blockchain-service:3004',
    healthPath: '/health',
    timeout: 20000,
  },
  payment: {
    name: 'Payment Service',
    url: process.env['PAYMENT_SERVICE_URL'] || 'http://payment-service:3005',
    healthPath: '/health',
    timeout: 15000,
  },
  notification: {
    name: 'Notification Service',
    url: process.env['NOTIFICATION_SERVICE_URL'] || 'http://notification-service:3006',
    healthPath: '/health',
    timeout: 10000,
  },
  dispute: {
    name: 'Dispute Service',
    url: process.env['DISPUTE_SERVICE_URL'] || 'http://dispute-service:3007',
    healthPath: '/health',
    timeout: 15000,
  },
}));
