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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BalancesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalancesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const time_off_balance_entity_1 = require("../database/entities/time-off-balance.entity");
const hcm_client_service_1 = require("../hcm-client/hcm-client.service");
let BalancesService = BalancesService_1 = class BalancesService {
    constructor(balanceRepo, hcmClient) {
        this.balanceRepo = balanceRepo;
        this.hcmClient = hcmClient;
        this.logger = new common_1.Logger(BalancesService_1.name);
    }
    async getByEmployee(employeeId) {
        return this.balanceRepo.find({ where: { employeeId } });
    }
    async getByEmployeeAndLocation(employeeId, locationId, refresh = false) {
        if (refresh) {
            try {
                const hcmBalance = await this.hcmClient.getBalance(employeeId, locationId);
                await this.upsertBalance(employeeId, locationId, hcmBalance.balanceDays, 'HCM_REALTIME');
            }
            catch (err) {
                this.logger.warn(`Failed to refresh balance from HCM for ${employeeId}/${locationId}: ${err.message}`);
            }
        }
        return this.balanceRepo.findOne({ where: { employeeId, locationId } });
    }
    async upsertBalance(employeeId, locationId, days, source, missingFromLatestBatch = false) {
        let balance = await this.balanceRepo.findOne({
            where: { employeeId, locationId },
        });
        if (balance) {
            balance.balanceDays = parseFloat(days.toFixed(2));
            balance.source = source;
            balance.lastSyncedAt = new Date();
            balance.missingFromLatestBatch = missingFromLatestBatch;
        }
        else {
            balance = this.balanceRepo.create({
                employeeId,
                locationId,
                balanceDays: parseFloat(days.toFixed(2)),
                source,
                lastSyncedAt: new Date(),
                missingFromLatestBatch,
            });
        }
        return this.balanceRepo.save(balance);
    }
    async deductBalance(employeeId, locationId, days) {
        const balance = await this.balanceRepo.findOne({
            where: { employeeId, locationId },
        });
        if (!balance) {
            throw new Error(`Balance not found for ${employeeId}/${locationId}`);
        }
        const newBalance = parseFloat((balance.balanceDays - days).toFixed(2));
        balance.balanceDays = newBalance;
        return this.balanceRepo.save(balance);
    }
};
exports.BalancesService = BalancesService;
exports.BalancesService = BalancesService = BalancesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(time_off_balance_entity_1.TimeOffBalance)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        hcm_client_service_1.HcmClientService])
], BalancesService);
//# sourceMappingURL=balances.service.js.map