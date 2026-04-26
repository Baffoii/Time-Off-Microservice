export interface HcmBalanceResponse {
  balanceDays: number;
}

export interface HcmSubmitTimeOffResponse {
  transactionId: string | null;
  success: boolean;
}

export interface HcmBatchBalanceItem {
  employeeId: string;
  locationId: string;
  balanceDays: number;
}

export interface IHcmClientService {
  getBalance(
    employeeId: string,
    locationId: string,
  ): Promise<HcmBalanceResponse>;

  submitTimeOff(
    employeeId: string,
    locationId: string,
    days: number,
  ): Promise<HcmSubmitTimeOffResponse>;

  getBatchBalances(): Promise<HcmBatchBalanceItem[]>;
}

export const HCM_CLIENT_SERVICE = 'HCM_CLIENT_SERVICE';
