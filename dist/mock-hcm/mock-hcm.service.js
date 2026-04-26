"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockHcmService = void 0;
const common_1 = require("@nestjs/common");
const mock_hcm_store_1 = require("./mock-hcm-store");
const TIMEOUT_DELAY_MS = 500;
let MockHcmService = class MockHcmService {
    constructor(store) {
        this.store = store;
    }
    async applyModeDelay() {
        const mode = this.store.getMode();
        if (mode === 'timeout') {
            await new Promise((resolve) => setTimeout(resolve, TIMEOUT_DELAY_MS));
        }
    }
    checkServerError() {
        if (this.store.getMode() === 'serverError') {
            throw { status: 500, message: 'Mock HCM server error' };
        }
    }
    async getBalance(employeeId, locationId) {
        await this.applyModeDelay();
        this.checkServerError();
        const balance = this.store.getBalance(employeeId, locationId);
        if (balance === undefined) {
            throw new common_1.NotFoundException(`Balance not found for employee ${employeeId} at location ${locationId}`);
        }
        if (this.store.getMode() === 'staleResponse') {
            return { balanceDays: balance };
        }
        return { balanceDays: balance };
    }
    async submitTimeOff(employeeId, locationId, days) {
        await this.applyModeDelay();
        this.checkServerError();
        const result = this.store.deductBalance(employeeId, locationId, days);
        return result;
    }
    getBatchBalances() {
        return this.store.getAllBalances();
    }
    setBalance(employeeId, locationId, balanceDays) {
        this.store.setBalance(employeeId, locationId, balanceDays);
        return { success: true };
    }
    setMode(mode) {
        this.store.setMode(mode);
        return { mode };
    }
    reset() {
        this.store.reset();
        return { success: true };
    }
};
exports.MockHcmService = MockHcmService;
exports.MockHcmService = MockHcmService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mock_hcm_store_1.MockHcmStore])
], MockHcmService);
//# sourceMappingURL=mock-hcm.service.js.map