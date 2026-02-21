import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  InflationIndexType,
  InflationIndexResult,
  WeatherData,
  TrackingData,
  TrackingStatus,
  OracleConditionCheck,
} from './interfaces/oracle.interfaces';

const BCB_SERIES_MAP: Record<InflationIndexType, number> = {
  IGPM: 189,
  IPCA: 433,
  SELIC: 432,
};

@Injectable()
export class OracleService {
  private readonly logger = new Logger(OracleService.name);
  private readonly bcbClient: AxiosInstance;
  private readonly weatherClient: AxiosInstance;
  private readonly trackingClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.bcbClient = axios.create({
      baseURL: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs',
      timeout: 15000,
      headers: { Accept: 'application/json' },
    });

    this.weatherClient = axios.create({
      baseURL: this.configService.get<string>(
        'WEATHER_API_URL',
        'https://apitempo.inmet.gov.br',
      ),
      timeout: 15000,
      headers: { Accept: 'application/json' },
    });

    this.trackingClient = axios.create({
      baseURL: this.configService.get<string>(
        'TRACKING_API_URL',
        'https://api.correios.com.br',
      ),
      timeout: 15000,
      headers: { Accept: 'application/json' },
    });
  }

  async getInflationIndex(indexType: InflationIndexType): Promise<InflationIndexResult> {
    const seriesId = BCB_SERIES_MAP[indexType];
    if (!seriesId) {
      throw new Error(`Unknown inflation index type: ${indexType}`);
    }

    this.logger.log(`Fetching ${indexType} from Banco Central (series ${seriesId})`);

    try {
      const today = new Date();
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const startDate = this.formatDateBR(threeMonthsAgo);
      const endDate = this.formatDateBR(today);

      const response = await this.bcbClient.get<Array<{ data: string; valor: string }>>(
        `/${seriesId}/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`,
      );

      const data = response.data;
      if (!data || data.length === 0) {
        throw new Error(`No data returned for ${indexType} from Banco Central`);
      }

      const latest = data[data.length - 1]!;
      const value = parseFloat(latest.valor);

      return {
        indexType,
        value,
        date: this.convertBRDateToISO(latest.data),
        source: `Banco Central do Brasil - SGS Series ${seriesId}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch ${indexType}: ${errorMessage}`);
      throw new Error(`Failed to fetch ${indexType} from Banco Central: ${errorMessage}`);
    }
  }

  async getWeatherData(latitude: number, longitude: number): Promise<WeatherData> {
    this.logger.log(`Fetching weather data for lat=${latitude}, lng=${longitude}`);

    try {
      const today = this.formatDateISO(new Date());

      const response = await this.weatherClient.get<Record<string, unknown>>(
        `/estacao/dados/${today}`,
        {
          params: { latitude, longitude },
        },
      );

      const data = response.data;

      const rawData = Array.isArray(data) && data.length > 0 ? data[data.length - 1] : data;
      const record = rawData as Record<string, unknown>;

      return {
        latitude,
        longitude,
        temperature: this.parseNumericField(record['TEM_INS'] ?? record['temperatura'], 0),
        humidity: this.parseNumericField(record['UMD_INS'] ?? record['umidade'], 0),
        precipitation: this.parseNumericField(record['CHUVA'] ?? record['precipitacao'], 0),
        windSpeed: this.parseNumericField(record['VEN_VEL'] ?? record['vento_velocidade'], 0),
        description: String(record['DC_NOME'] ?? record['descricao'] ?? 'N/A'),
        timestamp: new Date().toISOString(),
        source: 'INMET - Instituto Nacional de Meteorologia',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch weather data: ${errorMessage}`);
      throw new Error(`Failed to fetch weather data from INMET: ${errorMessage}`);
    }
  }

  async getTrackingStatus(trackingCode: string, carrier: string): Promise<TrackingData> {
    this.logger.log(`Fetching tracking status: code=${trackingCode}, carrier=${carrier}`);

    try {
      const trackingApiToken = this.configService.get<string>('TRACKING_API_TOKEN', '');

      const response = await this.trackingClient.get<Record<string, unknown>>(
        `/rastreamento/v1/objetos/${trackingCode}`,
        {
          headers: {
            Authorization: trackingApiToken ? `Bearer ${trackingApiToken}` : undefined,
          },
        },
      );

      const data = response.data;
      const eventos = (data['eventos'] ?? data['events'] ?? []) as Array<Record<string, unknown>>;

      const events = eventos.map((evento) => ({
        date: String(evento['dtHrCriado'] ?? evento['date'] ?? ''),
        location: String(evento['unidade']?.toString() ?? evento['location'] ?? ''),
        description: String(evento['descricao'] ?? evento['description'] ?? ''),
        status: String(evento['tipo'] ?? evento['status'] ?? ''),
      }));

      const lastEvent = events[0];
      const trackingStatus = this.resolveTrackingStatus(lastEvent?.status ?? '');

      return {
        trackingCode,
        carrier: carrier || 'correios',
        status: trackingStatus,
        lastUpdate: lastEvent?.date ?? new Date().toISOString(),
        events,
        estimatedDelivery: data['previsaoEntrega'] as string | null ?? null,
        delivered: trackingStatus === TrackingStatus.DELIVERED,
        source: `${carrier || 'Correios'} Tracking API`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch tracking status: ${errorMessage}`);
      throw new Error(`Failed to fetch tracking status: ${errorMessage}`);
    }
  }

  async checkOracleCondition(
    escrowId: string,
    conditionType: string,
    params: Record<string, unknown>,
  ): Promise<OracleConditionCheck> {
    this.logger.log(`Checking oracle condition: escrow=${escrowId}, type=${conditionType}`);

    const checkedAt = new Date().toISOString();

    try {
      switch (conditionType) {
        case 'RAIN_THRESHOLD': {
          const lat = Number(params['latitude'] ?? 0);
          const lng = Number(params['longitude'] ?? 0);
          const threshold = Number(params['threshold'] ?? 50);

          const weather = await this.getWeatherData(lat, lng);
          const conditionMet = weather.precipitation >= threshold;

          return {
            escrowId,
            conditionType,
            params,
            conditionMet,
            currentValue: weather.precipitation,
            threshold,
            message: conditionMet
              ? `Precipitation ${weather.precipitation}mm exceeds threshold ${threshold}mm`
              : `Precipitation ${weather.precipitation}mm is below threshold ${threshold}mm`,
            checkedAt,
          };
        }

        case 'TEMPERATURE_THRESHOLD': {
          const lat = Number(params['latitude'] ?? 0);
          const lng = Number(params['longitude'] ?? 0);
          const threshold = Number(params['threshold'] ?? 35);
          const direction = String(params['direction'] ?? 'above');

          const weather = await this.getWeatherData(lat, lng);
          const conditionMet =
            direction === 'above'
              ? weather.temperature >= threshold
              : weather.temperature <= threshold;

          return {
            escrowId,
            conditionType,
            params,
            conditionMet,
            currentValue: weather.temperature,
            threshold,
            message: conditionMet
              ? `Temperature ${weather.temperature}C ${direction} threshold ${threshold}C - condition met`
              : `Temperature ${weather.temperature}C does not meet ${direction} threshold ${threshold}C`,
            checkedAt,
          };
        }

        case 'DELIVERY_CONFIRMED': {
          const trackingCode = String(params['trackingCode'] ?? '');
          const carrier = String(params['carrier'] ?? 'correios');

          const tracking = await this.getTrackingStatus(trackingCode, carrier);
          const conditionMet = tracking.delivered;

          return {
            escrowId,
            conditionType,
            params,
            conditionMet,
            currentValue: tracking.status,
            threshold: TrackingStatus.DELIVERED,
            message: conditionMet
              ? `Package ${trackingCode} has been delivered`
              : `Package ${trackingCode} not yet delivered (status: ${tracking.status})`,
            checkedAt,
          };
        }

        case 'INFLATION_ABOVE':
        case 'INFLATION_BELOW': {
          const indexType = String(params['indexType'] ?? 'IPCA') as InflationIndexType;
          const threshold = Number(params['threshold'] ?? 0);

          const inflationData = await this.getInflationIndex(indexType);
          const conditionMet =
            conditionType === 'INFLATION_ABOVE'
              ? inflationData.value >= threshold
              : inflationData.value <= threshold;

          return {
            escrowId,
            conditionType,
            params,
            conditionMet,
            currentValue: inflationData.value,
            threshold,
            message: conditionMet
              ? `${indexType} value ${inflationData.value} meets ${conditionType} condition (threshold: ${threshold})`
              : `${indexType} value ${inflationData.value} does not meet ${conditionType} condition (threshold: ${threshold})`,
            checkedAt,
          };
        }

        case 'SELIC_ABOVE':
        case 'SELIC_BELOW': {
          const threshold = Number(params['threshold'] ?? 0);

          const selicData = await this.getInflationIndex('SELIC');
          const conditionMet =
            conditionType === 'SELIC_ABOVE'
              ? selicData.value >= threshold
              : selicData.value <= threshold;

          return {
            escrowId,
            conditionType,
            params,
            conditionMet,
            currentValue: selicData.value,
            threshold,
            message: conditionMet
              ? `SELIC rate ${selicData.value} meets ${conditionType} condition (threshold: ${threshold})`
              : `SELIC rate ${selicData.value} does not meet ${conditionType} condition (threshold: ${threshold})`,
            checkedAt,
          };
        }

        default:
          throw new Error(`Unknown oracle condition type: ${conditionType}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Oracle condition check failed: escrow=${escrowId}, type=${conditionType}: ${errorMessage}`,
      );
      throw new Error(`Oracle condition check failed: ${errorMessage}`);
    }
  }

  private formatDateBR(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private formatDateISO(date: Date): string {
    return date.toISOString().split('T')[0]!;
  }

  private convertBRDateToISO(brDate: string): string {
    const parts = brDate.split('/');
    if (parts.length !== 3) return brDate;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  private parseNumericField(value: unknown, fallback: number): number {
    if (value === null || value === undefined) return fallback;
    const parsed = parseFloat(String(value));
    return isNaN(parsed) ? fallback : parsed;
  }

  private resolveTrackingStatus(statusCode: string): TrackingStatus {
    const normalized = statusCode.toUpperCase();

    if (normalized.includes('ENTREGUE') || normalized.includes('DELIVERED') || normalized === 'BDE') {
      return TrackingStatus.DELIVERED;
    }
    if (normalized.includes('POSTADO') || normalized.includes('POSTED') || normalized === 'PO') {
      return TrackingStatus.POSTED;
    }
    if (normalized.includes('SAIU PARA') || normalized.includes('OUT_FOR') || normalized === 'OEC') {
      return TrackingStatus.OUT_FOR_DELIVERY;
    }
    if (normalized.includes('DEVOLVIDO') || normalized.includes('RETURN') || normalized === 'BDR') {
      return TrackingStatus.RETURNED;
    }
    if (normalized.includes('TRANSIT') || normalized.includes('RO') || normalized === 'DO') {
      return TrackingStatus.IN_TRANSIT;
    }

    return TrackingStatus.UNKNOWN;
  }
}
