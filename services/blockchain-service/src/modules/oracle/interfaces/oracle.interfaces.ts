export type InflationIndexType = 'IGPM' | 'IPCA' | 'SELIC';

export interface InflationIndexResult {
  indexType: InflationIndexType;
  value: number;
  date: string;
  source: string;
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  description: string;
  timestamp: string;
  source: string;
}

export interface TrackingData {
  trackingCode: string;
  carrier: string;
  status: TrackingStatus;
  lastUpdate: string;
  events: TrackingEvent[];
  estimatedDelivery: string | null;
  delivered: boolean;
  source: string;
}

export enum TrackingStatus {
  POSTED = 'POSTED',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  FAILED = 'FAILED',
  UNKNOWN = 'UNKNOWN',
}

export interface TrackingEvent {
  date: string;
  location: string;
  description: string;
  status: string;
}

export interface OracleConditionCheck {
  escrowId: string;
  conditionType: string;
  params: Record<string, unknown>;
  conditionMet: boolean;
  currentValue: unknown;
  threshold: unknown;
  message: string;
  checkedAt: string;
}
