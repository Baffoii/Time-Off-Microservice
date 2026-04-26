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
exports.TimeOffBalance = void 0;
const typeorm_1 = require("typeorm");
const employee_entity_1 = require("./employee.entity");
const location_entity_1 = require("./location.entity");
let TimeOffBalance = class TimeOffBalance {
};
exports.TimeOffBalance = TimeOffBalance;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TimeOffBalance.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TimeOffBalance.prototype, "employeeId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TimeOffBalance.prototype, "locationId", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], TimeOffBalance.prototype, "balanceDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], TimeOffBalance.prototype, "lastSyncedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], TimeOffBalance.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], TimeOffBalance.prototype, "missingFromLatestBatch", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => employee_entity_1.Employee, (e) => e.balances),
    __metadata("design:type", employee_entity_1.Employee)
], TimeOffBalance.prototype, "employee", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => location_entity_1.Location, (l) => l.balances),
    __metadata("design:type", location_entity_1.Location)
], TimeOffBalance.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TimeOffBalance.prototype, "updatedAt", void 0);
exports.TimeOffBalance = TimeOffBalance = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Unique)(['employeeId', 'locationId'])
], TimeOffBalance);
//# sourceMappingURL=time-off-balance.entity.js.map