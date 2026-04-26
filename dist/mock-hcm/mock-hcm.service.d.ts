import { MockHcmStore, MockHcmMode } from './mock-hcm-store';
export declare class MockHcmService {
    private readonly store;
    constructor(store: MockHcmStore);
    private applyModeDelay;
    private checkServerError;
    getBalance(employeeId: string, locationId: string): Promise<{
        balanceDays: number;
    }>;
    submitTimeOff(employeeId: string, locationId: string, days: number): Promise<{
        success: boolean;
        transactionId?: string;
        error?: string;
    }>;
    getBatchBalances(): Array<{
        employeeId: string;
        locationId: string;
        balanceDays: number;
    }>;
    setBalance(employeeId: string, locationId: string, balanceDays: number): {
        success: boolean;
    };
    setMode(mode: MockHcmMode): {
        mode: string;
    };
    reset(): {
        success: boolean;
    };
}
