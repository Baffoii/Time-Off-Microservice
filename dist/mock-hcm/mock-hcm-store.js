"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockHcmStore = void 0;
const common_1 = require("@nestjs/common");
let MockHcmStore = class MockHcmStore {
    constructor() {
        this.balances = new Map();
        this.mode = 'normal';
        this.txCounter = 0;
    }
    key(employeeId, locationId) {
        return `${employeeId}:${locationId}`;
    }
    getBalance(employeeId, locationId) {
        return this.balances.get(this.key(employeeId, locationId));
    }
    setBalance(employeeId, locationId, days) {
        this.balances.set(this.key(employeeId, locationId), days);
    }
    deductBalance(employeeId, locationId, days) {
        const k = this.key(employeeId, locationId);
        const current = this.balances.get(k);
        if (current === undefined) {
            return { success: false, error: 'Balance not found' };
        }
        if (this.mode === 'unreliableValidation') {
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
    getAllBalances() {
        const result = [];
        for (const [k, v] of this.balances.entries()) {
            const [employeeId, locationId] = k.split(':');
            result.push({ employeeId, locationId, balanceDays: v });
        }
        return result;
    }
    setMode(mode) {
        this.mode = mode;
    }
    getMode() {
        return this.mode;
    }
    reset() {
        this.balances.clear();
        this.mode = 'normal';
        this.txCounter = 0;
    }
};
exports.MockHcmStore = MockHcmStore;
exports.MockHcmStore = MockHcmStore = __decorate([
    (0, common_1.Injectable)()
], MockHcmStore);
//# sourceMappingURL=mock-hcm-store.js.map