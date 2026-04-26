import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { IHcmClientService, HcmBalanceResponse, HcmSubmitTimeOffResponse, HcmBatchBalanceItem } from './hcm-client.interface';
export declare class HcmClientService implements IHcmClientService {
    private readonly httpService;
    private readonly configService;
    private readonly logger;
    private readonly baseUrl;
    private readonly timeoutMs;
    constructor(httpService: HttpService, configService: ConfigService);
    getBalance(employeeId: string, locationId: string): Promise<HcmBalanceResponse>;
    submitTimeOff(employeeId: string, locationId: string, days: number): Promise<HcmSubmitTimeOffResponse>;
    getBatchBalances(): Promise<HcmBatchBalanceItem[]>;
    private handleAxiosError;
}
