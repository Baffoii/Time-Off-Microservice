import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { HcmClientService } from '../../src/hcm-client/hcm-client.service';
import {
  HcmTimeoutError,
  HcmServerError,
  HcmNotFoundError,
} from '../../src/common/exceptions';

function makeAxiosError(
  code?: string,
  status?: number,
  message = 'error',
): AxiosError {
  const err = new AxiosError(message);
  err.code = code;
  if (status) {
    err.response = { status, data: { message } } as any;
  }
  return err;
}

describe('HcmClientService', () => {
  let service: HcmClientService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, def?: any) => {
        const config: Record<string, any> = {
          HCM_BASE_URL: 'http://localhost:3001',
          HCM_TIMEOUT_MS: 100,
        };
        return config[key] ?? def;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HcmClientService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<HcmClientService>(HcmClientService);
    httpService = module.get(HttpService);
  });

  describe('getBalance', () => {
    it('returns balance from HCM', async () => {
      const axiosResponse: Partial<AxiosResponse> = {
        data: { balanceDays: 10 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      httpService.get.mockReturnValue(of(axiosResponse as AxiosResponse));

      const result = await service.getBalance('emp1', 'loc1');

      expect(result).toEqual({ balanceDays: 10 });
      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3001/hcm/balances/emp1/loc1',
        { timeout: 100 },
      );
    });

    it('throws HcmTimeoutError on ECONNABORTED', async () => {
      httpService.get.mockReturnValue(
        throwError(() => makeAxiosError('ECONNABORTED')),
      );

      await expect(service.getBalance('emp1', 'loc1')).rejects.toThrow(
        HcmTimeoutError,
      );
    });

    it('throws HcmTimeoutError on ETIMEDOUT', async () => {
      httpService.get.mockReturnValue(
        throwError(() => makeAxiosError('ETIMEDOUT')),
      );

      await expect(service.getBalance('emp1', 'loc1')).rejects.toThrow(
        HcmTimeoutError,
      );
    });

    it('throws HcmTimeoutError when message contains timeout', async () => {
      const err = new AxiosError('timeout of 100ms exceeded');
      httpService.get.mockReturnValue(throwError(() => err));

      await expect(service.getBalance('emp1', 'loc1')).rejects.toThrow(
        HcmTimeoutError,
      );
    });

    it('throws HcmServerError on 500', async () => {
      httpService.get.mockReturnValue(
        throwError(() => makeAxiosError(undefined, 500, 'Internal Server Error')),
      );

      await expect(service.getBalance('emp1', 'loc1')).rejects.toThrow(
        HcmServerError,
      );
    });

    it('throws HcmNotFoundError on 404', async () => {
      httpService.get.mockReturnValue(
        throwError(() => makeAxiosError(undefined, 404, 'Not Found')),
      );

      await expect(service.getBalance('emp1', 'loc1')).rejects.toThrow(
        HcmNotFoundError,
      );
    });
  });

  describe('submitTimeOff', () => {
    it('returns transactionId and success from HCM', async () => {
      const axiosResponse: Partial<AxiosResponse> = {
        data: { transactionId: 'TX-123', success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      httpService.post.mockReturnValue(of(axiosResponse as AxiosResponse));

      const result = await service.submitTimeOff('emp1', 'loc1', 3);

      expect(result).toEqual({ transactionId: 'TX-123', success: true });
    });

    it('throws HcmTimeoutError on timeout during submit', async () => {
      httpService.post.mockReturnValue(
        throwError(() => makeAxiosError('ECONNABORTED')),
      );

      await expect(service.submitTimeOff('emp1', 'loc1', 3)).rejects.toThrow(
        HcmTimeoutError,
      );
    });

    it('handles null transactionId gracefully', async () => {
      const axiosResponse: Partial<AxiosResponse> = {
        data: { transactionId: null, success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      httpService.post.mockReturnValue(of(axiosResponse as AxiosResponse));

      const result = await service.submitTimeOff('emp1', 'loc1', 3);

      expect(result).toEqual({ transactionId: null, success: true });
    });
  });

  describe('getBatchBalances', () => {
    it('returns array of batch balances', async () => {
      const data = [
        { employeeId: 'emp1', locationId: 'loc1', balanceDays: 10 },
        { employeeId: 'emp2', locationId: 'loc1', balanceDays: 5 },
      ];
      const axiosResponse: Partial<AxiosResponse> = {
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      httpService.get.mockReturnValue(of(axiosResponse as AxiosResponse));

      const result = await service.getBatchBalances();

      expect(result).toEqual(data);
    });

    it('throws HcmServerError on 500 during batch fetch', async () => {
      httpService.get.mockReturnValue(
        throwError(() => makeAxiosError(undefined, 500, 'Server Error')),
      );

      await expect(service.getBatchBalances()).rejects.toThrow(HcmServerError);
    });
  });

  describe('handleAxiosError edge cases', () => {
    it('re-throws non-AxiosError errors as-is', async () => {
      const nativeError = new TypeError('network failure');
      httpService.get.mockReturnValue(throwError(() => nativeError));

      await expect(service.getBalance('emp1', 'loc1')).rejects.toThrow(TypeError);
    });

    it('wraps AxiosError with no status as HcmServerError', async () => {
      const err = new AxiosError('connection refused');
      // no err.response, no timeout code
      httpService.get.mockReturnValue(throwError(() => err));

      await expect(service.getBalance('emp1', 'loc1')).rejects.toThrow(HcmServerError);
    });
  });
});
