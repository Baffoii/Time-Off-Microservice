import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import {
  IHcmClientService,
  HcmBalanceResponse,
  HcmSubmitTimeOffResponse,
  HcmBatchBalanceItem,
} from './hcm-client.interface';
import {
  HcmTimeoutError,
  HcmServerError,
  HcmNotFoundError,
} from '../common/exceptions';

@Injectable()
export class HcmClientService implements IHcmClientService {
  private readonly logger = new Logger(HcmClientService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'HCM_BASE_URL',
      'http://localhost:3001',
    );
    this.timeoutMs = this.configService.get<number>('HCM_TIMEOUT_MS', 5000);
  }

  async getBalance(
    employeeId: string,
    locationId: string,
  ): Promise<HcmBalanceResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/hcm/balances/${employeeId}/${locationId}`,
          { timeout: this.timeoutMs },
        ),
      );
      return { balanceDays: response.data.balanceDays };
    } catch (err) {
      this.handleAxiosError(err, `getBalance(${employeeId}, ${locationId})`);
    }
  }

  async submitTimeOff(
    employeeId: string,
    locationId: string,
    days: number,
  ): Promise<HcmSubmitTimeOffResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/hcm/time-off`,
          { employeeId, locationId, days },
          { timeout: this.timeoutMs },
        ),
      );
      return {
        transactionId: response.data.transactionId ?? null,
        success: response.data.success ?? true,
      };
    } catch (err) {
      this.handleAxiosError(
        err,
        `submitTimeOff(${employeeId}, ${locationId}, ${days})`,
      );
    }
  }

  async getBatchBalances(): Promise<HcmBatchBalanceItem[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/hcm/balances/batch`, {
          timeout: this.timeoutMs,
        }),
      );
      return response.data;
    } catch (err) {
      this.handleAxiosError(err, 'getBatchBalances()');
    }
  }

  private handleAxiosError(err: unknown, operation: string): never {
    if (err instanceof AxiosError) {
      const code = err.code;
      if (
        code === 'ECONNABORTED' ||
        code === 'ETIMEDOUT' ||
        err.message?.includes('timeout')
      ) {
        this.logger.warn(`HCM timeout during ${operation}`);
        throw new HcmTimeoutError(operation);
      }
      const status = err.response?.status;
      if (status === 404) {
        throw new HcmNotFoundError(operation);
      }
      if (status && status >= 500) {
        throw new HcmServerError(status, err.response?.data?.message || err.message);
      }
      throw new HcmServerError(status || 0, err.message);
    }
    throw err;
  }
}
