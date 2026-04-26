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
exports.Employee = void 0;
const typeorm_1 = require("typeorm");
const employee_location_entity_1 = require("./employee-location.entity");
const time_off_balance_entity_1 = require("./time-off-balance.entity");
const time_off_request_entity_1 = require("./time-off-request.entity");
let Employee = class Employee {
};
exports.Employee = Employee;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Employee.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Employee.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'ACTIVE' }),
    __metadata("design:type", String)
], Employee.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => employee_location_entity_1.EmployeeLocation, (el) => el.employee),
    __metadata("design:type", Array)
], Employee.prototype, "employeeLocations", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => time_off_balance_entity_1.TimeOffBalance, (b) => b.employee),
    __metadata("design:type", Array)
], Employee.prototype, "balances", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => time_off_request_entity_1.TimeOffRequest, (r) => r.employee),
    __metadata("design:type", Array)
], Employee.prototype, "requests", void 0);
exports.Employee = Employee = __decorate([
    (0, typeorm_1.Entity)()
], Employee);
//# sourceMappingURL=employee.entity.js.map