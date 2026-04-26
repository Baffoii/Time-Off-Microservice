import { Injectable } from '@nestjs/common';

export type MockHcmMode =
  | 'normal'
  | 'unreliableValidation'
  | 'timeout'
  | 'staleResponse'
  | 'serverError';

export interface DeductResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

@Injectable()
export class MockHcmStore {
  private balances: Map<string, number> = new Map();
  private mode: MockHcmMode = 'normal';
  private txCounter = 0;

  private key(employeeId: string, locationId: string): string {
    return `${employeeId}:${locationId}`;
  }

  getBalance(employeeId: string, locationId: string): number | undefined {
    return this.balances.get(this.key(employeeId, locationId));
  }

  setBalance(employeeId: string, locationId: string, days: number): void {
    this.balances.set(this.key(employeeId, locationId), days);
  }

  deductBalance(
    employeeId: string,
    locationId: string,
    days: number,
  ): DeductResult {
    const k = this.key(employeeId, locationId);
    const current = this.balances.get(k);

    if (current === undefined) {
      return { success: false, error: 'Balance not found' };
    }

    if (this.mode === 'unreliableValidation') {
      // Accept even if balance goes negative
      this.balances.set(k, current - days);
      this.txCounter++;
      return { success: true, transactionId: `TX-${this.txCounter}` };
    }

    if (current < days - 0.001) {
      return { success: false, error: 'Insufficient balance' };
    }

    this.balances.set(k, parseFloat((current - days).toFixed(2)));
    this.txCounter++;
    return { success: true, transactionId: `TX-${this.txCounter}` };
  }

  getAllBalances(): Array<{
    employeeId: string;
    locationId: string;
    balanceDays: number;
  }> {
    const result: Array<{
      employeeId: string;
      locationId: string;
      balanceDays: number;
    }> = [];
    for (const [k, v] of this.balances.entries()) {
      const [employeeId, locationId] = k.split(':');
      result.push({ employeeId, locationId, balanceDays: v });
    }
    return result;
  }

  setMode(mode: MockHcmMode): void {
    this.mode = mode;
  }

  getMode(): MockHcmMode {
    return this.mode;
  }

  reset(): void {
    this.balances.clear();
    this.mode = 'normal';
    this.txCounter = 0;
  }
}
