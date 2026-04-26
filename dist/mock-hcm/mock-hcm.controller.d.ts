import { MockHcmService } from './mock-hcm.service';
export declare class MockHcmController {
    private readonly mockHcmService;
    constructor(mockHcmService: MockHcmService);
    getBatchBalances(): {
        employeeId: string;
        locationId: string;
        balanceDays: number;
    }[];
    getBalance(employeeId: string, locationId: string): Promise<{
        balanceDays: number;
    }>;
    submitTimeOff(body: {
        employeeId: string;
        locationId: string;
        days: number;
    }): Promise<{
        success: boolean;
        transactionId?: string;
        error?: string;
    }>;
    setBalance(body: {
        employeeId: string;
        locationId: string;
        balanceDays: number;
    }): {
        success: boolean;
    };
    setMode(body: {
        mode: string;
    }): {
        mode: string;
    };
    reset(): {
        success: boolean;
    };
}
