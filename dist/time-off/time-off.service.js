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
var TimeOffService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeOffService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const async_mutex_1 = require("async-mutex");
const time_off_request_entity_1 = require("../database/entities/time-off-request.entity");
const time_off_balance_entity_1 = require("../database/entities/time-off-balance.entity");
const employee_entity_1 = require("../database/entities/employee.entity");
const location_entity_1 = require("../database/entities/location.entity");
const employee_location_entity_1 = require("../database/entities/employee-location.entity");
const hcm_client_service_1 = require("../hcm-client/hcm-client.service");
const exceptions_1 = require("../common/exceptions");
let TimeOffService = TimeOffService_1 = class TimeOffService {
    constructor(requestRepo, balanceRepo, employeeRepo, locationRepo, employeeLocationRepo, hcmClient, dataSource) {
        this.requestRepo = requestRepo;
        this.balanceRepo = balanceRepo;
        this.employeeRepo = employeeRepo;
        this.locationRepo = locationRepo;
        this.employeeLocationRepo = employeeLocationRepo;
        this.hcmClient = hcmClient;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(TimeOffService_1.name);
        this.mutexMap = new Map();
    }
    getMutex(employeeId, locationId) {
        const key = `${employeeId}:${locationId}`;
        if (!this.mutexMap.has(key)) {
            this.mutexMap.set(key, new async_mutex_1.Mutex());
        }
        return this.mutexMap.get(key);
    }
    async createRequest(dto) {
        const { employeeId, locationId, requestedDays, idempotencyKey } = dto;
        if (requestedDays <= 0) {
            throw new common_1.BadRequestException('requestedDays must be greater than 0');
        }
        const employee = await this.employeeRepo.findOne({
            where: { id: employeeId },
        });
        if (!employee) {
            throw new exceptions_1.EmployeeNotFoundException(employeeId);
        }
        if (employee.status !== 'ACTIVE') {
            throw new exceptions_1.InactiveEmployeeException(employeeId);
        }
        const location = await this.locationRepo.findOne({
            where: { id: locationId },
        });
        if (!location) {
            throw new exceptions_1.LocationNotFoundException(locationId);
        }
        const el = await this.employeeLocationRepo.findOne({
            where: { employeeId, locationId },
        });
        if (!el || !el.active) {
            throw new exceptions_1.InactiveEmployeeLocationException(employeeId, locationId);
        }
        if (idempotencyKey) {
            const existing = await this.requestRepo.findOne({
                where: { idempotencyKey },
            });
            if (existing) {
                this.logger.log(`Idempotency key ${idempotencyKey} already exists, returning existing request`);
                return existing;
            }
        }
        const mutex = this.getMutex(employeeId, locationId);
        return mutex.runExclusive(async () => {
            return this.processRequest(employeeId, locationId, requestedDays, idempotencyKey);
        });
    }
    async processRequest(employeeId, locationId, requestedDays, idempotencyKey) {
        const localBalance = await this.balanceRepo.findOne({
            where: { employeeId, locationId },
        });
        const localDays = localBalance ? Number(localBalance.balanceDays) : 0;
        if (localDays < requestedDays - 0.001) {
            throw new exceptions_1.InsufficientBalanceException(localDays, requestedDays);
        }
        let hcmDays;
        try {
            const hcmBalance = await this.hcmClient.getBalance(employeeId, locationId);
            hcmDays = Number(hcmBalance.balanceDays);
        }
        catch (err) {
            if (err instanceof exceptions_1.HcmTimeoutError) {
                const failedRequest = this.requestRepo.create({
                    employeeId,
                    locationId,
                    requestedDays,
                    status: 'FAILED',
                    failureReason: `HCM timeout during balance check: ${err.message}`,
                    idempotencyKey: idempotencyKey || null,
                    hcmTransactionId: null,
                });
                return this.requestRepo.save(failedRequest);
            }
            throw err;
        }
        if (Math.abs(hcmDays - localDays) > 0.001) {
            this.logger.log(`Updating local balance for ${employeeId}/${locationId}: ${localDays} -> ${hcmDays}`);
            if (localBalance) {
                localBalance.balanceDays = hcmDays;
                localBalance.source = 'HCM_REALTIME';
                localBalance.lastSyncedAt = new Date();
                await this.balanceRepo.save(localBalance);
            }
            else {
                await this.balanceRepo.save(this.balanceRepo.create({
                    employeeId,
                    locationId,
                    balanceDays: hcmDays,
                    source: 'HCM_REALTIME',
                    lastSyncedAt: new Date(),
                }));
            }
        }
        const effectiveDays = hcmDays;
        if (effectiveDays < requestedDays - 0.001) {
            throw new exceptions_1.InsufficientBalanceException(effectiveDays, requestedDays);
        }
        return this.dataSource.transaction(async (manager) => {
            const balanceRepoTx = manager.getRepository(time_off_balance_entity_1.TimeOffBalance);
            const requestRepoTx = manager.getRepository(time_off_request_entity_1.TimeOffRequest);
            let hcmResult;
            try {
                hcmResult = await this.hcmClient.submitTimeOff(employeeId, locationId, requestedDays);
            }
            catch (err) {
                const failedRequest = requestRepoTx.create({
                    employeeId,
                    locationId,
                    requestedDays,
                    status: 'FAILED',
                    failureReason: `HCM error during submit: ${err.message}`,
                    idempotencyKey: idempotencyKey || null,
                    hcmTransactionId: null,
                });
                return requestRepoTx.save(failedRequest);
            }
            if (!hcmResult.success) {
                const failedRequest = requestRepoTx.create({
                    employeeId,
                    locationId,
                    requestedDays,
                    status: 'FAILED',
                    failureReason: `HCM rejected the request`,
                    idempotencyKey: idempotencyKey || null,
                    hcmTransactionId: null,
                });
                return requestRepoTx.save(failedRequest);
            }
            const balanceToDeduct = await balanceRepoTx.findOne({
                where: { employeeId, locationId },
            });
            if (balanceToDeduct) {
                balanceToDeduct.balanceDays = parseFloat((Number(balanceToDeduct.balanceDays) - requestedDays).toFixed(2));
                await balanceRepoTx.save(balanceToDeduct);
            }
            let status;
            if (!hcmResult.transactionId) {
                status = 'APPROVED_WITH_WARNING';
                this.logger.warn(`HCM returned no transaction ID for ${employeeId}/${locationId}, marking APPROVED_WITH_WARNING`);
            }
            else {
                status = 'APPROVED';
            }
            const approvedRequest = requestRepoTx.create({
                employeeId,
                locationId,
                requestedDays,
                status,
                failureReason: null,
                hcmTransactionId: hcmResult.transactionId || null,
                idempotencyKey: idempotencyKey || null,
            });
            return requestRepoTx.save(approvedRequest);
        });
    }
    async findById(id) {
        return this.requestRepo.findOne({ where: { id } });
    }
    async findAll(query) {
        const where = {};
        if (query.employeeId)
            where['employeeId'] = query.employeeId;
        if (query.locationId)
            where['locationId'] = query.locationId;
        if (query.status)
            where['status'] = query.status;
        return this.requestRepo.find({ where, order: { createdAt: 'DESC' } });
    }
};
exports.TimeOffService = TimeOffService;
exports.TimeOffService = TimeOffService = TimeOffService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(time_off_request_entity_1.TimeOffRequest)),
    __param(1, (0, typeorm_1.InjectRepository)(time_off_balance_entity_1.TimeOffBalance)),
    __param(2, (0, typeorm_1.InjectRepository)(employee_entity_1.Employee)),
    __param(3, (0, typeorm_1.InjectRepository)(location_entity_1.Location)),
    __param(4, (0, typeorm_1.InjectRepository)(employee_location_entity_1.EmployeeLocation)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        hcm_client_service_1.HcmClientService,
        typeorm_2.DataSource])
], TimeOffService);
//# sourceMappingURL=time-off.service.js.map