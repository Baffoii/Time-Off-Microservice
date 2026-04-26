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
var SyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const time_off_balance_entity_1 = require("../database/entities/time-off-balance.entity");
const hcm_client_service_1 = require("../hcm-client/hcm-client.service");
let SyncService = SyncService_1 = class SyncService {
    constructor(balanceRepo, hcmClient, dataSource) {
        this.balanceRepo = balanceRepo;
        this.hcmClient = hcmClient;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(SyncService_1.name);
    }
    async batchSync(payload) {
        let updated = 0;
        let inserted = 0;
        let skipped = 0;
        let quarantined = 0;
        await this.dataSource.transaction(async (manager) => {
            const balanceRepoTx = manager.getRepository(time_off_balance_entity_1.TimeOffBalance);
            await manager
                .createQueryBuilder()
                .update(time_off_balance_entity_1.TimeOffBalance)
                .set({ missingFromLatestBatch: true })
                .execute();
            const seen = new Map();
            const conflicts = [];
            for (const item of payload) {
                const key = `${item.employeeId}:${item.locationId}`;
                if (seen.has(key)) {
                    conflicts.push(key);
                    this.logger.warn(`Duplicate record in batch for ${key}, using last occurrence`);
                }
                seen.set(key, item);
            }
            if (conflicts.length > 0) {
                skipped += conflicts.length;
            }
            for (const [, item] of seen.entries()) {
                if (item.balanceDays < 0) {
                    this.logger.warn(`Quarantining negative balance for ${item.employeeId}/${item.locationId}: ${item.balanceDays}`);
                    quarantined++;
                    continue;
                }
                const existing = await balanceRepoTx.findOne({
                    where: {
                        employeeId: item.employeeId,
                        locationId: item.locationId,
                    },
                });
                if (existing) {
                    existing.balanceDays = parseFloat(item.balanceDays.toFixed(2));
                    existing.source = 'HCM_BATCH';
                    existing.lastSyncedAt = new Date();
                    existing.missingFromLatestBatch = false;
                    await balanceRepoTx.save(existing);
                    updated++;
                }
                else {
                    const newBalance = balanceRepoTx.create({
                        employeeId: item.employeeId,
                        locationId: item.locationId,
                        balanceDays: parseFloat(item.balanceDays.toFixed(2)),
                        source: 'HCM_BATCH',
                        lastSyncedAt: new Date(),
                        missingFromLatestBatch: false,
                    });
                    await balanceRepoTx.save(newBalance);
                    inserted++;
                }
            }
        });
        const stillMissing = await this.balanceRepo.count({
            where: { missingFromLatestBatch: true },
        });
        this.logger.log(`Batch sync complete: updated=${updated}, inserted=${inserted}, skipped=${skipped}, quarantined=${quarantined}, stillMissing=${stillMissing}`);
        return { updated, inserted, skipped, quarantined, stillMissing };
    }
    async reconcile(employeeId, locationId) {
        const hcmBalance = await this.hcmClient.getBalance(employeeId, locationId);
        let balance = await this.balanceRepo.findOne({
            where: { employeeId, locationId },
        });
        if (balance) {
            balance.balanceDays = parseFloat(hcmBalance.balanceDays.toFixed(2));
            balance.source = 'HCM_REALTIME';
            balance.lastSyncedAt = new Date();
            balance.missingFromLatestBatch = false;
        }
        else {
            balance = this.balanceRepo.create({
                employeeId,
                locationId,
                balanceDays: parseFloat(hcmBalance.balanceDays.toFixed(2)),
                source: 'HCM_REALTIME',
                lastSyncedAt: new Date(),
                missingFromLatestBatch: false,
            });
        }
        return this.balanceRepo.save(balance);
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = SyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(time_off_balance_entity_1.TimeOffBalance)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        hcm_client_service_1.HcmClientService,
        typeorm_2.DataSource])
], SyncService);
//# sourceMappingURL=sync.service.js.map