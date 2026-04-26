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
var HcmClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HcmClientService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
const axios_2 = require("axios");
const exceptions_1 = require("../common/exceptions");
let HcmClientService = HcmClientService_1 = class HcmClientService {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.logger = new common_1.Logger(HcmClientService_1.name);
        this.baseUrl = this.configService.get('HCM_BASE_URL', 'http://localhost:3001');
        this.timeoutMs = this.configService.get('HCM_TIMEOUT_MS', 5000);
    }
    async getBalance(employeeId, locationId) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/hcm/balances/${employeeId}/${locationId}`, { timeout: this.timeoutMs }));
            return { balanceDays: response.data.balanceDays };
        }
        catch (err) {
            this.handleAxiosError(err, `getBalance(${employeeId}, ${locationId})`);
        }
    }
    async submitTimeOff(employeeId, locationId, days) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseUrl}/hcm/time-off`, { employeeId, locationId, days }, { timeout: this.timeoutMs }));
            return {
                transactionId: response.data.transactionId ?? null,
                success: response.data.success ?? true,
            };
        }
        catch (err) {
            this.handleAxiosError(err, `submitTimeOff(${employeeId}, ${locationId}, ${days})`);
        }
    }
    async getBatchBalances() {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/hcm/balances/batch`, {
                timeout: this.timeoutMs,
            }));
            return response.data;
        }
        catch (err) {
            this.handleAxiosError(err, 'getBatchBalances()');
        }
    }
    handleAxiosError(err, operation) {
        if (err instanceof axios_2.AxiosError) {
            const code = err.code;
            if (code === 'ECONNABORTED' ||
                code === 'ETIMEDOUT' ||
                err.message?.includes('timeout')) {
                this.logger.warn(`HCM timeout during ${operation}`);
                throw new exceptions_1.HcmTimeoutError(operation);
            }
            const status = err.response?.status;
            if (status === 404) {
                throw new exceptions_1.HcmNotFoundError(operation);
            }
            if (status && status >= 500) {
                throw new exceptions_1.HcmServerError(status, err.response?.data?.message || err.message);
            }
            throw new exceptions_1.HcmServerError(status || 0, err.message);
        }
        throw err;
    }
};
exports.HcmClientService = HcmClientService;
exports.HcmClientService = HcmClientService = HcmClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], HcmClientService);
//# sourceMappingURL=hcm-client.service.js.map