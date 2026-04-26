import { Injectable, NotFoundException } from '@nestjs/common';
import { MockHcmStore, MockHcmMode } from './mock-hcm-store';

const TIMEOUT_DELAY_MS = 500; // Short delay for tests

@Injectable()
export class MockHcmService {
  constructor(private readonly store: MockHcmStore) {}

  private async applyModeDelay(): Promise<void> {
    const mode = this.store.getMode();
    if (mode === 'timeout') {
      await new Promise((resolve) => setTimeout(resolve, TIMEOUT_DELAY_MS));
    }
  }

  private checkServerError(): void {
    if (this.store.getMode() === 'serverError') {
      throw { status: 500, message: 'Mock HCM server error' };
    }
  }

  async getBalance(
    employeeId: string,
    locationId: string,
  ): Promise<{ balanceDays: number }> {
    await this.applyModeDelay();
    this.checkServerError();

    const balance = this.store.getBalance(employeeId, locationId);
    if (balance === undefined) {
      throw new NotFoundException(
        `Balance not found for employee ${employeeId} at location ${locationId}`,
      );
    }

    if (this.store.getMode() === 'staleResponse') {
      // Return the current balance without processing (stale)
      return { balanceDays: balance };
    }

    return { balanceDays: balance };
  }

  async submitTimeOff(
    employeeId: string,
    locationId: string,
    days: number,
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    await this.applyModeDelay();
    this.checkServerError();

    const result = this.store.deductBalance(employeeId, locationId, days);
    return result;
  }

  getBatchBalances(): Array<{
    employeeId: string;
    locationId: string;
    balanceDays: number;
  }> {
    return this.store.getAllBalances();
  }

  setBalance(
    employeeId: string,
    locationId: string,
    balanceDays: number,
  ): { success: boolean } {
    this.store.setBalance(employeeId, locationId, balanceDays);
    return { success: true };
  }

  setMode(mode: MockHcmMode): { mode: string } {
    this.store.setMode(mode);
    return { mode };
  }

  reset(): { success: boolean } {
    this.store.reset();
    return { success: true };
  }
}
