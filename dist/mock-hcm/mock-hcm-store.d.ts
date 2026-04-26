export type MockHcmMode = 'normal' | 'unreliableValidation' | 'timeout' | 'staleResponse' | 'serverError';
export interface DeductResult {
    success: boolean;
    transactionId?: string;
    error?: string;
}
export declare class MockHcmStore {
    private balances;
    private mode;
    private txCounter;
    private key;
    getBalance(employeeId: string, locationId: string): number | undefined;
    setBalance(employeeId: string, locationId: string, days: number): void;
    deductBalance(employeeId: string, locationId: string, days: number): DeductResult;
    getAllBalances(): Array<{
        employeeId: string;
        locationId: string;
        balanceDays: number;
    }>;
    setMode(mode: MockHcmMode): void;
    getMode(): MockHcmMode;
    reset(): void;
}
